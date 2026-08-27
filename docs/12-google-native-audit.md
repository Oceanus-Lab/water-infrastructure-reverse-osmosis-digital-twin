# Google-native audit

CLAUDE.md states a principle it calls non-negotiable:

> **BigQuery is both storage AND the primary AI compute layer** — forecasting/anomaly
> detection/embeddings/NL summarization happen in-SQL (`AI.FORECAST`, `AI.DETECT_ANOMALIES`,
> `AI.GENERATE`, `VECTOR_SEARCH`). Vertex AI / ADK Agent Runtime is for agent orchestration
> only.

This records where the implementation stands against it, so the gap is visible rather than
implied. Audited 2026-08-05.

## Honoured

| Capability | Where | Verified |
|---|---|---|
| Storage + transforms | BigQuery + Dataform, 31 actions, 18 assertions | All pass in a fresh project |
| Forecasting | `AI.FORECAST` (TimesFM) → `ro_forecasts.fouling_forecast_bq` | 210 rows / 21 units |
| Anomaly detection | `AI.DETECT_ANOMALIES` (TimesFM) → `ro_forecasts.fouling_anomalies_bq` | 616 rows / 18 units |
| Semantic cache | `VECTOR_SEARCH` over `ro_embeddings.qa_cache` | Wired in the agent stream route |
| Embeddings | `text-embedding-005` via the Gen AI SDK | Used to key the cache |
| Serving | Cloud Run (scale-to-zero), Artifact Registry, Cloud Build | Deployed |
| Agent model | Gemini 3 Flash via Vertex (enterprise) | Answers grounded in serving-api data |

Both AI tables are asserted (`uniqueKey`, `nonNull`) and checked by `scripts/qa.py`, so the
in-SQL path cannot quietly stop being exercised.

## Not honoured, and why

**The as-of-date path is Python, deliberately.** `forecast_anomaly.py` fits a trend over
readings truncated at a date, because the replay scrubber asks "what did we know on
2020-04-01". TimesFM projects forward from the end of a series and cannot answer that; doing
it in SQL would mean materialising a forecast per (unit, date) — 21 × 740 calls. So both
exist: `/api/bq-forecast` is the forward projection an operator acts on, `/api/forecast` is
the as-of backtest. The two answer different questions and their numbers should not be
expected to match.

**NL summarization does not use `AI.GENERATE`.** The assistant composes answers with Gemini
in the Next.js route (`lib/agent/harness.ts`), not in SQL. This was forced by the quota wall
in [11-agent-enterprise-quota.md](11-agent-enterprise-quota.md), not chosen. `AI.GENERATE`
would be the principle-aligned home for per-unit briefing text.

**The ADK multi-agent in `services/agent/` is not the runtime.** It is provisioned and its
governance gates are tested, but the deployed assistant runs the in-route harness that
bypasses the quota-blocked Agent Platform interactions endpoint. `docs/04-ai-agent.md`
describes the ADK topology; the harness preserves its shape (router → specialists →
composer) but not its runtime.

**Document RAG is empty.** `search_docs` issues a real `VECTOR_SEARCH`, but no document
corpus has been embedded, so the Document specialist contributes nothing. The table and the
query exist; the content does not.

**Memory Bank and decision log are empty.** `ro_serving.agent_memory` and
`ro_serving.decision_log` are 0 rows. The propose-to-record flow is implemented and
HITL-gated but has never been exercised.

**WaterTAP is not called at runtime.** `deviation.py:physics_baseline()` demonstrates the
physics path for one operating point and degrades gracefully when the solver is absent. The
Simulation specialist reads `/api/forecast`, not a physics engine. `fidelity="high"` never
appears in `deviations.csv`, so the high-fidelity baseline does not propagate — though
`common.load_deviation_bus` now carries per-row fidelity, so it will when it does.

**External data is a US national proxy.** `load_eia_bulk.py` writes `state_id = 'US'` because
the EIA Total Energy bulk file has no state-level series. OCWD is in California, whose
commercial tariff is higher, so LCOW from this is a floor. See that module's docstring.

## Ranked by what it would buy

1. **`AI.GENERATE` for briefings** — moves NL summarization in-SQL, removes a Gemini call per
   question from the request path, and is the one remaining "primary AI compute layer" gap
   that is not blocked by quota.
2. **Embed a document corpus** — makes the Document specialist real. Membrane datasheets and
   CIP procedures are the obvious first corpus; the query path already works.
3. **WaterTAP as a Cloud Run service** — lets `deviation.py` emit `fidelity="high"` and lets
   the Simulation specialist answer what-if questions instead of reading a trend.
4. **Exercise propose-to-record** — the gate is built and tested; it just needs a decision to
   flow through it end to end.
