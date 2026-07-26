"""
services/agent/callbacks.py
T009 + T010 — Governance callbacks for the ADK multi-agent coordinator.

after_model:  Scans every LLM output token stream for bare numeric tokens not
              traceable to a tool result in the current session. Flags/blocks them.
              Also detects RecordWritingProposal JSON in the output and sets
              status="pending" before the message reaches the frontend.

before_tool:  Validates every tool call against the actuation denylist.
              Sanitises unit_id inputs via the allowlist regex.
              Blocks tool calls triggered by content from untrusted uploaded docs
              that attempt to bypass governance gates (FR-018 prompt-injection).

Constitution Principles II + III — HARD GATES.
"""
from __future__ import annotations

import json
import re
from typing import Any

from tools import _ACTUATION_DENYLIST, _validate_unit_id, ActuationBlockedError, GovernanceError

# ── Regex to catch bare numeric tokens in LLM output ──────────────────────
# Matches patterns like: 42.5, $1,234, 0.92, 15 kWh, 85%
# A "bare" number is one not inside a markdown source-trace tag or JSON evidence block.
_BARE_NUMBER_RE = re.compile(
    r"(?<!\[)"           # not preceded by [  (start of source-trace badge)
    r"(?<!\{)"           # not preceded by {  (start of JSON evidence)
    r"\b"
    r"(\$?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+\.\d+|\d{2,})"  # numeric forms
    r"(?!\s*[}\]])"      # not followed by } or ]  (end of evidence block)
    r"\b"
    r"(?!\s*(?:source|capability|evidence|from|via|per)\b)",  # not a source citation
    re.IGNORECASE,
)

# ── Proposal JSON detection ────────────────────────────────────────────────
_PROPOSAL_RE = re.compile(
    r'\{[^{}]*"record_type"\s*:\s*"(?:recommendation_log|decision|cip_plan)"[^{}]*\}',
    re.DOTALL,
)


def after_model_callback(
    tool_results_in_session: list[dict],
    model_output_text: str,
) -> dict[str, Any]:
    """
    T009 — Validate model output for bare numbers and detect proposals.

    Args:
        tool_results_in_session: All tool call results from this turn.
        model_output_text: The raw LLM text output to validate.

    Returns:
        {
            "passed": bool,
            "bare_numbers_found": list[str],
            "proposals": list[dict],   # RecordWritingProposal payloads, status="pending"
            "sanitized_output": str,
        }
    """
    issues: list[str] = []
    proposals: list[dict] = []

    # 1. Collect all numeric VALUES from tool results (the only surfaceable figures)
    allowed_values: list[float] = []
    for result in tool_results_in_session:
        # Enforce SC-003: if a capability result lacks evidence, its figures are NOT allowed
        if isinstance(result, dict) and "capability" in result and result.get("evidence") is None:
            continue
        _collect_numeric_values(result, allowed_values)

    # 2. Every bare number must be traceable (within rounding tolerance) to a tool value
    bare_numbers: list[str] = []
    for candidate in _BARE_NUMBER_RE.findall(model_output_text):
        cleaned = candidate.replace(",", "").replace("$", "").strip()
        try:
            value = float(cleaned)
        except ValueError:
            continue
        if not _is_traceable(value, allowed_values):
            bare_numbers.append(candidate)

    if bare_numbers:
        issues.append(
            f"GOVERNANCE VIOLATION — bare numbers not traceable to tool results: {bare_numbers}. "
            "Per Constitution Principle II (HARD GATE), every figure must originate from "
            "a CapabilityResult. The answer must be regenerated with sourced figures only."
        )

    # 3. Detect RecordWritingProposal JSON and set status="pending"
    for match in _PROPOSAL_RE.finditer(model_output_text):
        try:
            proposal_json = json.loads(match.group())
            proposal_json.setdefault("status", "pending")
            proposal_json.setdefault("proposal_id", _new_id())
            proposals.append(proposal_json)
        except json.JSONDecodeError:
            pass

    # 4. Capability Disagreement Detection (FR-016)
    # Simple heuristic for demonstration: if tools return conflicting recommendations
    tool_str = json.dumps(tool_results_in_session).lower()
    has_wait = "wait" in tool_str or "delay" in tool_str
    has_clean_now = "clean now" in tool_str or "breakeven" in tool_str
    
    if has_wait and has_clean_now and "tension" not in model_output_text.lower():
        tension_block = (
            "\n\n> [!WARNING]\n"
            "> **Capability Disagreement Detected:** Sub-agents returned conflicting signals. "
            "For example, the fouling trajectory may suggest waiting, while economics favor cleaning now. "
            "The assistant must surface both sides of the evidence explicitly.\n"
        )
        model_output_text += tension_block

    passed = len(issues) == 0
    return {
        "passed": passed,
        "issues": issues,
        "bare_numbers_found": bare_numbers,
        "proposals": proposals,
        # ENFORCE (Constitution Principle II): a governance violation WITHHOLDS the output —
        # the ungrounded text is never surfaced; the turn must be regenerated with sourced
        # figures only. Previously this returned the raw text (flag-only, no enforcement).
        "action": "accept" if passed else "regenerate",
        "blocked_reason": None if passed else "; ".join(issues),
        "sanitized_output": model_output_text if passed else None,
    }


def before_tool_callback(
    tool_name: str,
    tool_args: dict[str, Any],
    input_source: str = "operator",  # "operator" | "uploaded_doc"
) -> dict[str, Any]:
    """
    T010 — Validate a tool call before execution.

    Blocks:
    - Actuating tool names (actuation denylist)
    - Tool calls with invalid unit_id values (injection guard)
    - Any tool call whose intent originates from an untrusted uploaded document
      that bypasses governance gates (prompt-injection resistance FR-018)

    Returns:
        {"allowed": bool, "reason": str | None, "sanitized_args": dict}
    """
    # 1. Actuation denylist — tool name check
    if tool_name.lower() in _ACTUATION_DENYLIST:
        raise ActuationBlockedError(
            f"before_tool: tool '{tool_name}' is on the actuation denylist. "
            "The assistant NEVER actuates plant equipment. (FR-013 — HARD GATE)"
        )

    # 2. Prompt-injection guard — untrusted source check
    if input_source == "uploaded_doc":
        # Tool calls originating from uploaded document content are blocked
        # to prevent prompt injection via files (FR-018)
        if tool_name in ("record_decision",):
            raise GovernanceError(
                f"before_tool: tool '{tool_name}' cannot be invoked from uploaded document "
                "content — this is a prompt-injection resistance gate. (FR-018)"
            )

    # 3. Sanitise unit_id if present
    sanitized_args = dict(tool_args)
    if "unit_id" in sanitized_args:
        try:
            sanitized_args["unit_id"] = _validate_unit_id(str(sanitized_args["unit_id"]))
        except ValueError as exc:
            return {
                "allowed": False,
                "reason": str(exc),
                "sanitized_args": sanitized_args,
            }

    return {
        "allowed": True,
        "reason": None,
        "sanitized_args": sanitized_args,
    }


# ── Helpers ────────────────────────────────────────────────────────────────

def _collect_numeric_values(obj: Any, out: list[float]) -> None:
    """Recursively collect every numeric value from a tool result."""
    if isinstance(obj, bool):
        return  # bool is a subclass of int — never a figure
    if isinstance(obj, dict):
        for v in obj.values():
            _collect_numeric_values(v, out)
    elif isinstance(obj, list):
        for item in obj:
            _collect_numeric_values(item, out)
    elif isinstance(obj, (int, float)):
        out.append(float(obj))


def _is_traceable(value: float, allowed: list[float]) -> bool:
    """A figure is traceable if it matches a tool value within rounding tolerance
    (1% relative, or 0.01 absolute) — so an honest round of 14.234 -> 14.2 is allowed,
    but a fabricated 99.9 with no source is not."""
    for a in allowed:
        if abs(value - a) <= max(0.01, 0.01 * abs(a)):
            return True
    return False


def _new_id() -> str:
    import uuid
    return str(uuid.uuid4())[:8]
