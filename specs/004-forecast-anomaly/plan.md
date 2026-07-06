# Implementation Plan: Forecasting & Anomaly Detection

**Branch**: `feature/003-source-tracing` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-forecast-anomaly/spec.md`

## Summary

Consume the 003 confound-free deviation (never raw readings — FR-007/SC-005) and, per unit's
current cleaning cycle, (a) forecast the fouling trajectory → projected days-to-clean with a
prediction band, and (b) flag anomalies that deviate abnormally fast (distinct from the slow
fouling trend). Fouling onset is cycle-aware and resets at CIP (FR-008–FR-010). Publishes to
`ro_forecasts` and exposes all early warning data to the UI (FR-015). Every forecast carries evidence (band + trend fit); **no accuracy/lead-time claims
here — 005 owns those** (FR-016/SC-006, Constitution HARD GATE II).

Two compute paths: the architecture-sanctioned **BigQuery `AI.FORECAST` (TimesFM) + `AI.DETECT_ANOMALIES`
in-SQL** (`services/source-tracing/forecast_bq.sql`, verified on real data) and an offline Python
twin (`forecast_anomaly.py`) for local prototyping. Production = the in-SQL path (Constitution Principle I).

## Technical Context

- **Language/deps**: Python 3.11, pandas/numpy (twin); BigQuery `AI.FORECAST`/`AI.DETECT_ANOMALIES` (production).
- **Input**: 003 deviation bus (`common.add_deviation` → `unit_n_delta_p_deviation`).
- **Storage**: `ro_forecasts` (`bigquery.tf` "AI.FORECAST outputs"), region us-central1, clustered `(bank_id, unit_id)`.
- **Frontend Integration**: Display forecasts, anomalies, and onset indicators inside `services/frontend/components/inspection/early-warning-panel.tsx`.
- **Scale**: 92 cleaning cycles across 21 units.

## Constitution Check

| Principle / Gate | Status |
|---|---|
| I — BigQuery primary AI compute (AI.FORECAST/DETECT_ANOMALIES in-SQL) | ✅ `forecast_bq.sql` is production path; Python is offline twin |
| II (HARD GATE) — no accuracy/lead-time claims before the validating run | ✅ 004 emits signal+band only; precision/lead-time deferred to 005 |
| V — detection on 003 clean-baseline deviation; onset resets at CIP | ✅ consumes deviation bus; cycle-scoped, not absolute age |
| IV — measured/modeled labels; evidence on every output (FR-002/003/006) | ⚠️ band present; explicit CI bounds + named drivers = task T004b |

## Project Structure

- `services/source-tracing/forecast_anomaly.py` — offline twin (trend → days-to-clean, MAD anomaly)
- `services/source-tracing/forecast_bq.sql` — production in-SQL AI.FORECAST + AI.DETECT_ANOMALIES
- `services/frontend/components/inspection/early-warning-panel.tsx` — UI layer for exposing signals (FR-015)
- `services/serving-api/main.py` — REST endpoints for frontend

## Complexity Tracking

| Deviation | Why | Mitigation |
|---|---|---|
| Two forecast paths (Python + SQL) | offline prototyping vs sanctioned compute | SQL is production; Python labeled twin |
| Band ≠ explicit confidence interval yet | prototype used trend residual | task to attach CI bounds + drivers (FR-002/003) |
| Missing Frontend Exposure | 004 Spec mandates UI availability | added API and React panel tasks (FR-015) |
