"""
services/agent/tools.py
T006 + T007 — Tool definitions for the RO Diagnostic AI Assistant.

All tools return dicts that the coordinator maps to CapabilityResult objects.
record_decision is HITL-gated: it raises GovernanceError unless the
RecordWritingProposal.status is already "approved" by the frontend chip.

Tool transport: BigQuery MCP server for BQ queries.
                WaterTAP Cloud Run for simulation.
                Code Execution sandbox for inline calculations.
"""
from __future__ import annotations

import ast
import json
import operator
import os
import re
import uuid
from typing import Any

import requests
from google.cloud import bigquery

# ── Governance errors ──────────────────────────────────────────────────────

class GovernanceError(Exception):
    """Raised when a governance gate blocks tool execution."""


class ActuationBlockedError(GovernanceError):
    """Raised when a tool call would actuate plant equipment (FR-013)."""


# ── Configuration ──────────────────────────────────────────────────────────

_PROJECT     = os.environ.get("GOOGLE_CLOUD_PROJECT", "spatial-cat-489006-a4")
_WATERTAP_URL = os.environ.get("WATERTAP_API_URL", "http://localhost:8000")
_BQ_CURATED   = os.environ.get("BQ_CURATED_DATASET", "ro_curated")
_BQ_SERVING   = os.environ.get("BQ_SERVING_DATASET", "ro_serving")
_BQ_EMBED     = os.environ.get("BQ_EMBEDDINGS_DATASET", "ro_embeddings")

# Actuation denylist — these operation patterns MUST NEVER be routed to plant
_ACTUATION_DENYLIST: frozenset[str] = frozenset({
    "set_flow", "adjust_pressure", "dose_chemical", "stop_pump",
    "open_valve", "close_valve", "set_recovery", "scada_command",
    "plc_write", "actuate",
})

# ── Unit ID allowlist ──────────────────────────────────────────────────────
_UNIT_RE = re.compile(r"^[A-G]0[1-3]$")

def _validate_unit_id(unit_id: str) -> str:
    """Normalise + validate a unit_id against the real ro_curated.unit_readings format.

    The table stores units as 'A01'..'G03' (no separator). Accept a hyphen/space/underscore
    variant ('A-01') for convenience, normalise to the canonical 'A01', and reject anything
    else — this is both an injection guard (T010) and a data-contract check.
    """
    clean = re.sub(r"[\s_-]", "", unit_id.strip().upper())
    if not _UNIT_RE.match(clean):
        raise ValueError(
            f"Invalid unit_id '{unit_id}' — must be one of A01..G03 (e.g. 'F03')."
        )
    return clean


# ── Tool: query_bigquery ───────────────────────────────────────────────────

def query_bigquery(sql: str, params: list | None = None) -> dict[str, Any]:
    """
    T006 — Execute a read-only BigQuery SQL query and return rows + schema.

    Only SELECT statements are permitted. Any DML (INSERT/UPDATE/DELETE/MERGE)
    is rejected at this layer — the only write path is record_decision (HITL-gated).

    Returns:
        {"rows": [...], "schema": [...], "capability": "bigquery", "row_count": int}
    """
    # Block DML — only SELECTs allowed (governance: read-only by default)
    normalized = sql.strip().upper()
    if any(normalized.startswith(kw) for kw in ("INSERT", "UPDATE", "DELETE", "MERGE", "DROP", "CREATE", "ALTER")):
        raise GovernanceError(
            "BigQuery tool is read-only — DML statements are not permitted. "
            "Use record_decision (HITL-gated) for approved writes."
        )

    bq = bigquery.Client(project=_PROJECT)
    job_config = bigquery.QueryJobConfig(query_parameters=params) if params else None
    job = bq.query(sql, job_config=job_config)
    rows = list(job.result())
    schema = [{"name": f.name, "type": f.field_type} for f in job.result().schema]

    return {
        "rows": [dict(row.items()) for row in rows],
        "schema": schema,
        "capability": "bigquery",
        "row_count": len(rows),
    }


# ── Tool: detect_anomaly ───────────────────────────────────────────────────

# Real numeric columns on ro_curated.unit_readings that anomaly detection may target.
_ANOMALY_SIGNALS: frozenset[str] = frozenset({
    "unit_n_delta_p", "unit_recovery", "percent_ec_removal",
    "unit_dp", "temp_c", "turb", "perm_ec", "ec",
})


def detect_anomaly(
    unit_id: str,
    signal: str,
    date_range: dict[str, str],  # {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
    sigma: float = 3.0,
) -> dict[str, Any]:
    """
    T006 — Flag readings that deviate abnormally from the unit's own distribution.

    Model-less by design: a per-unit ``mean ± sigma·std`` band computed in-SQL, mirroring
    the offline twin (forecast_anomaly.py) and consistent with the no-training / TimesFM
    BigQuery-AI approach used for forecasting. No trained ML model is required, so it works
    without a provisioned per-unit anomaly model.

    ``signal`` is validated against an allowlist of real columns; every value is passed as a
    query parameter (no string interpolation of caller input).

    Returns evidence for AnomalyEvidence: deviating_signal + magnitude_vs_baseline.
    """
    unit_id = _validate_unit_id(unit_id)
    if signal not in _ANOMALY_SIGNALS:
        raise ValueError(f"Unknown signal '{signal}'. Allowed: {sorted(_ANOMALY_SIGNALS)}.")
    start = date_range.get("start", "2019-01-01")
    end = date_range.get("end", "2021-01-13")

    # signal is allowlisted → safe to inline as an identifier; all values are @parameters.
    sql = f"""
    WITH s AS (
      SELECT reading_date AS date, CAST({signal} AS FLOAT64) AS value
      FROM `{_PROJECT}.{_BQ_CURATED}.unit_readings`
      WHERE unit_id = @unit_id AND reading_date BETWEEN @start AND @end
        AND {signal} IS NOT NULL
    ),
    b AS (
      SELECT date, value, AVG(value) OVER () AS mean, STDDEV_SAMP(value) OVER () AS sd
      FROM s
    )
    SELECT date, value,
      mean - @sigma * sd AS lower_bound,
      mean + @sigma * sd AS upper_bound,
      (value < mean - @sigma * sd OR value > mean + @sigma * sd) AS is_anomaly,
      SAFE_DIVIDE(ABS(value - mean), sd) AS magnitude_vs_baseline
    FROM b
    WHERE value < mean - @sigma * sd OR value > mean + @sigma * sd
    ORDER BY date DESC
    LIMIT 20
    """
    params = [
        bigquery.ScalarQueryParameter("unit_id", "STRING", unit_id),
        bigquery.ScalarQueryParameter("start", "DATE", start),
        bigquery.ScalarQueryParameter("end", "DATE", end),
        bigquery.ScalarQueryParameter("sigma", "FLOAT64", float(sigma)),
    ]
    result = query_bigquery(sql, params)
    return {
        **result,
        "capability": "anomaly",
        "unit_id": unit_id,
        "signal": signal,
        "method": f"mean+/-{sigma}sigma (model-less, no trained model required)",
        "evidence_type": "AnomalyEvidence",
    }


# ── Tool: simulate_watertap ────────────────────────────────────────────────

def simulate_watertap(
    unit_id: str,
    params: dict[str, Any],
) -> dict[str, Any]:
    """
    T006 — Call the WaterTAP Cloud Run endpoint for physics simulation.

    Returns CapabilityResult-compatible dict with ForecastEvidence fields.
    Used by the Simulation sub-agent for clean-now-vs-wait analysis.
    """
    unit_id = _validate_unit_id(unit_id)
    payload = {"unit_id": unit_id, **params}

    try:
        resp = requests.post(
            f"{_WATERTAP_URL}/predict",
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as exc:
        return {
            "capability": "simulation",
            "unit_id": unit_id,
            "error": str(exc),
            "value": None,
            "evidence": None,
        }

    return {
        "capability": "simulation",
        "unit_id": unit_id,
        "value": data.get("predicted_flux"),
        "confidence_interval": data.get("confidence_interval"),
        "drivers": data.get("drivers", []),
        "evidence_type": "ForecastEvidence",
        "raw": data,
    }


# ── Tool: search_docs ─────────────────────────────────────────────────────

def search_docs(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    """
    T006 — Semantic search over plant documents via BigQuery VECTOR_SEARCH.

    Returns ranked chunks with their source and relevance score.
    """
    # Embed the query using BigQuery AI.GENERATE_EMBEDDING
    embed_sql = f"""
    SELECT ml_generate_embedding_result
    FROM ML.GENERATE_EMBEDDING(
      MODEL `{_PROJECT}.{_BQ_EMBED}.embedding_model`,
      (SELECT '{query.replace("'", "''")}' AS content)
    )
    """
    embed_result = query_bigquery(embed_sql)
    if not embed_result["rows"]:
        return []

    embedding_json = json.dumps(embed_result["rows"][0]["ml_generate_embedding_result"])

    search_sql = f"""
    SELECT
      base.chunk_text,
      base.source_document,
      base.page_number,
      distance
    FROM
      VECTOR_SEARCH(
        TABLE `{_PROJECT}.{_BQ_EMBED}.doc_embeddings`,
        'embedding',
        (SELECT {embedding_json} AS embedding),
        top_k => {top_k}
      )
    ORDER BY distance ASC
    """

    result = query_bigquery(search_sql)
    return result["rows"]


# ── Tool: run_calculation ──────────────────────────────────────────────────

# ── Safe arithmetic evaluator (no eval) ─────────────────────────────────────
_SAFE_BINOPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
                ast.Div: operator.truediv, ast.Mod: operator.mod}
_SAFE_UNARY = {ast.UAdd: operator.pos, ast.USub: operator.neg}


def _safe_arith(expression: str) -> float:
    """Evaluate a pure arithmetic expression without eval().

    Allows numbers, + - * / %, parentheses and unary +/-. The power operator (**) is
    intentionally unsupported: it is a cheap CPU/memory DoS vector (e.g. 2**9**9**9) that
    was reachable through the old regex + eval() path.
    """
    def _ev(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return _ev(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in _SAFE_BINOPS:
            return _SAFE_BINOPS[type(node.op)](_ev(node.left), _ev(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in _SAFE_UNARY:
            return _SAFE_UNARY[type(node.op)](_ev(node.operand))
        raise ValueError(f"unsupported expression element: {type(node).__name__}")

    return float(_ev(ast.parse(expression, mode="eval")))


def run_calculation(expression: str) -> dict[str, Any]:
    """
    T006 — Evaluate a simple arithmetic expression safely (no eval, no power operator).

    Restricted to numeric arithmetic — no names, calls, imports, or exec. Used by the
    Economics sub-agent for delta-economics computations.
    """
    try:
        result = _safe_arith(expression)
        return {"expression": expression, "result": result, "capability": "calculation"}
    except (ValueError, SyntaxError, ZeroDivisionError, TypeError, RecursionError) as exc:
        return {"expression": expression, "error": str(exc), "result": None, "capability": "calculation"}


# ── Tool: record_decision (HITL-gated write) ──────────────────────────────

def record_decision(
    proposal_id: str,
    payload: dict[str, Any],
    approved: bool = False,          # set True only by the approval chip event handler
) -> dict[str, Any]:
    """
    T007 — Write an approved decision to BigQuery ro_serving.decision_log.

    HARD GATE: raises GovernanceError if approved=False.
    This tool MUST only be called after the operator has tapped the Approve chip
    in the frontend — the approval chip event handler sets approved=True.

    Constitution Principle III — HARD GATE: any write requires human approval.
    FR-014/FR-015: no record written without explicit approval.
    """
    if not approved:
        raise GovernanceError(
            "record_decision: write blocked — no human approval received. "
            "The operator must tap the Approve chip before this tool executes. "
            "(FR-014: propose-to-record requires explicit human approval.)"
        )

    # Validate payload keys (no actuation fields allowed in a decision record)
    for key in payload:
        if key.lower() in _ACTUATION_DENYLIST:
            raise ActuationBlockedError(
                f"record_decision: payload key '{key}' resembles an actuation command. "
                "The assistant NEVER writes actuation records. (FR-013)"
            )

    bq = bigquery.Client(project=_PROJECT)
    table_id = f"{_PROJECT}.{_BQ_SERVING}.decision_log"

    row = {
        "proposal_id": proposal_id,
        "record_type": payload.get("record_type", "decision"),
        "unit_id": payload.get("unit_id"),
        "content": json.dumps(payload),
        "written_at": _now_iso(),
        "written_by": "operator_approved_via_hitl_chip",
    }

    errors = bq.insert_rows_json(table_id, [row])
    if errors:
        return {"success": False, "errors": errors, "proposal_id": proposal_id}

    return {
        "success": True,
        "proposal_id": proposal_id,
        "table": table_id,
        "written_at": row["written_at"],
    }


# ── Tool: save_memory_fact (HITL-gated write) ─────────────────────────────

def save_memory_fact(
    fact_type: str,
    key: str,
    value: dict[str, Any],
    unit_id: str | None = None,
    approved: bool = False,
) -> dict[str, Any]:
    """
    T045 — Write a cross-session memory fact to BigQuery ro_serving.agent_memory.

    HARD GATE: raises GovernanceError if approved=False.
    """
    if not approved:
        raise GovernanceError(
            "save_memory_fact: write blocked — no human approval received. "
            "The operator must explicitly approve persisting this fact. "
        )

    if unit_id:
        unit_id = _validate_unit_id(unit_id)

    bq = bigquery.Client(project=_PROJECT)
    table_id = f"{_PROJECT}.{_BQ_SERVING}.agent_memory"

    row = {
        "fact_type": fact_type,
        "key": key,
        "value": json.dumps(value),
        "unit_id": unit_id,
        "written_at": _now_iso(),
        "written_by": "operator_approved",
    }

    errors = bq.insert_rows_json(table_id, [row])
    if errors:
        return {"success": False, "errors": errors}

    return {
        "success": True,
        "table": table_id,
        "fact_type": fact_type,
        "key": key,
        "written_at": row["written_at"],
    }


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(tz=timezone.utc).isoformat()
