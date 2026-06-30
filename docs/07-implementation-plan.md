# Implementation Plan
**Status:** Active  
**Last updated:** 2026-06-30

This document outlines the phased implementation plan for the RO Digital Twin, based on the resolved architectural decisions.

---

## Vertical Slice First (Weeks 1–2) — prove the spine, land the hero

_Rationale: pull time-to-value forward (plan-review H1) and de-risk integration by running **one bank end-to-end** before widening. Everything below serves one rehearsed demo beat (plan-review C2)._

**Bank F** is the slice target — it is the only bank group with **measured energy** (`total_kw`, 714–719 non-null across all three stages; Bank G's G03 is gappy at 517), so the hero economics use *real* energy, not a modeled number. It has 3–4 clean fouling→CIP cycles per stage.

**The end-to-end thread (build in this order):**

1. **Replay one bank** — `replay-harness` streams Bank F history (`reading_date`-ordered) → Pub/Sub `ro-readings` → `ro_curated.unit_readings`. Sim-clock visible. (See [08-validation-live-replay.md](08-validation-live-replay.md) Part A.)
2. **Temperature-normalized fouling score** — `fouling_scores` = Δ between WaterTAP clean-baseline and actual, using `unit_n_delta_p` (NOT raw `unit_dp`/recovery — recovery is a fixed 0.850 setpoint; raw ΔP is temperature-confounded).
3. **Agent answers one real question** — "Should we clean Bank F now or wait?" with honestly-labeled economics (CIP cost + downtime vs. accumulating energy penalty to hold the recovery setpoint).
4. **One 2.5D tile lights up** — Bank F tile colors by fouling severity; clicking it opens the agent exchange.

**Slice acceptance:** the four steps run live, on the replay clock, with measured-vs-modeled labels intact. This is the demo; Phases 1–4 widen it.

---

## Phase 1: Foundation & Backend Services
- **GCP Project Setup**: Enable services (Cloud Run, BigQuery, Vertex AI, Dataform). Establish IAM roles.
- **Data Pipeline Integration**: Ingest the OCWD dataset (CSV) into Google Cloud Storage and load into BigQuery raw datasets.
- **Dataform Transforms**: Implement versioned SQL pipelines to clean data and produce curated tables (e.g., fouling scores, daily operations).
- **WaterTAP Cloud Run Service**: Dockerize the existing WaterTAP Python/FastAPI simulation and deploy it to Cloud Run. Ensure latency is ~2s for on-demand solves.

## Phase 2: Analytics & Agent Intelligence
- **BigQuery AI Layer**: Implement in-place AI functions for:
  - `AI.FORECAST` (TimesFM) for production and energy consumption forecasting.
  - `AI.DETECT_ANOMALIES` for scaling/fouling detection.
- **ADK 2.0 Agent Setup**: Configure the agent (Gemini Flash) with Sessions and Memory Bank on the Agent Runtime.
- **Agent Tools**: Implement connections allowing the agent to query BigQuery, trigger WaterTAP simulations, and perform VECTOR_SEARCH.

## Phase 3: Frontend & Real-time Serving
*(Note: Frontend development can begin concurrently with Phase 1)*
- **Serving API**: Build a Cloud Run serving layer (FastAPI) that reads strictly from BigQuery Materialized Views (no Firestore needed).
- **Next.js Application**: Scaffold the React/Next.js frontend. Implement the 2.5D isometric visual twin and the 4 navigation sections.
- **Integration**: Connect the Next.js UI to the Serving API and the ADK Agent websocket/API. Implement the "Municipal ($/m³ tariff)" economics context.

## Phase 4: Knowledge, Calibration & Evaluation
- **RAG Corpus Setup**: Embed documents (SOPs, WaterTAP manuals) into a `ro_embeddings` BigQuery dataset.
- **WaterTAP Calibration**: Tune the A/B coefficients against the OCWD actuals to ensure simulation accuracy.
- **Agent Evaluation**: Create a golden Q&A dataset (50 pairs minimum) and establish the ADK eval loop to verify Memory Bank recall and diagnostic accuracy.
