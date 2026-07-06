# RO Digital Twin — Agent Instructions

Cloud-native digital twin for **Municipal/Industrial BWRO** (Brackish Water RO) facilities.
Unifies operational data, physics simulation, AI diagnostics, and economics on GCP.

**Current stage:** Spec-driven decomposition (9 features) complete; Feature 009 (cloud
platform) and Feature 001 (data foundation) implemented. GCP project `spatial-cat-489006-a4`
is bootstrapped (BigQuery datasets, Pub/Sub topic, least-privilege IAM, budget alert, deploy
path proven via [infra/](infra/), see [specs/009-cloud-platform/quickstart.md](specs/009-cloud-platform/quickstart.md)).
`ro_curated` now holds the harmonized 21-unit OCWD history (15,624 rows), re-derived
`dss`/cycle grouping, a 71-event CIP ground-truth catalog, and measured-vs-not-available
signal provenance — see [pipeline/](pipeline/) and
[specs/001-data-foundation/quickstart.md](specs/001-data-foundation/quickstart.md).
Runnable code: the WaterTAP validation spike, `infra/` (Terraform/scripts), and `pipeline/`
(loader + Dataform transforms). Remaining
features (001–008) still live as design briefs in [docs/](docs/) and specs in
[specs/](specs/). Treat the docs as the source of truth; do not duplicate their content.

## Start here

- [docs/00-overview.md](docs/00-overview.md) — architecture, decision summary, system diagram
- [docs/2026-06-30-decisions.md](docs/2026-06-30-decisions.md) — decisions log + document map
- [docs/07-implementation-plan.md](docs/07-implementation-plan.md) — phased build plan
- [docs/06-open-questions.md](docs/06-open-questions.md) — review before each planning session

Per-area briefs: [data pipeline](docs/02-data-pipeline.md) ·
[physics engine](docs/03-physics-engine.md) · [AI agent](docs/04-ai-agent.md) ·
[GCP infra](docs/05-gcp-infrastructure.md) · [problem domain](docs/01-problem-domain.md)

## Architecture principle (do not violate)

**BigQuery is both storage AND the primary AI compute layer.** Forecasting, anomaly
detection, embeddings, and NL summarization happen *in SQL, in-place* (`AI.FORECAST`,
`AI.DETECT_ANOMALIES`, `AI.GENERATE`, `VECTOR_SEARCH`). Vertex AI / Agent Runtime is for
**agent orchestration only**. Don't introduce custom ML pipelines where a BQ SQL function suffices.

## Environment

- **Python 3.11 only** (WaterTAP supports 3.9–3.12; not 3.13+).
- Use the existing venv for any physics/profiling work — it has WaterTAP + pandas:
  ```bash
  source .venv-watertap-spike/bin/activate   # or .venv-watertap-spike/bin/python
  python spike_watertap.py
  ```
- WaterTAP 1.6.0 bundles Ipopt via `watertap-solvers` when installed via **conda**. For a **pip** install (like the one used here), you MUST run `idaes get-extensions` to fetch the solver binary.
- GCP target: region `us-central1`, Cloud Run (serverless, scales to zero).

## Project-specific conventions & gotchas

- **WaterTAP imports changed in 1.6.0** — use the exact paths in
  [docs/03-physics-engine.md](docs/03-physics-engine.md) (e.g.
  `watertap.unit_models.reverse_osmosis_0D`, `NaCl_prop_pack`). Model = `ReverseOsmosis0D`
  + `NaClParameterBlock` (BWRO single-stage).
- **OCWD dataset is harmonization-heavy:** 21 units = 7 banks (A–G) × 3 stages (01–03),
  15,624 daily rows, range **2019-01-01 → 2021-01-13** (some older docs say Jan2019–Jan2020 — that is wrong).
  Banks A–E have 128 cols, F–G have 117 cols → a harmonized core schema is required.
  Energy columns (`total_kw`, etc.) exist **only on F–G**; A–E energy must be WaterTAP-modeled.
- **Fouling is cyclical, not monotonic.** Use the `dss` (Days Since Cleaning, saw-tooth, resets at
  `cip` events) cycle feature — not absolute membrane age — for fouling models.
- **Economics: lead with deltas, not absolute LCOW.** Cost model is parametric (6 editable params);
  absolutes are ±20%, deltas are robust. Label measured-vs-modeled values explicitly.
- **ADK 2.0 agent rules:** every ML tool must return evidence with its value (confidence intervals,
  feature attribution, which signal deviated). Agents are read-only / advise-only — they may
  propose-to-record but **never actuate plant equipment**. No-hallucinated-numbers guardrail is the
  top governance priority. See [docs/04-ai-agent.md](docs/04-ai-agent.md).
- **Model names:** new agents use `gemini-3-flash-preview` / `gemini-3-pro-preview`. Never rename an
  existing agent's model. A 404 is usually a `GOOGLE_CLOUD_LOCATION` issue (try `global`), not the model name.

## Working agreements

- Keep many small, focused files (200–400 lines typical); prefer immutable patterns.
- When a doc fact proves wrong during implementation, fix the doc rather than working around it.
- No secrets in source — use env vars / Secret Manager.
