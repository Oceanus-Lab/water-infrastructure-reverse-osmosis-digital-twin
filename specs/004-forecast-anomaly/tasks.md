# Tasks: Forecasting & Anomaly Detection

**Feature**: 004-forecast-anomaly | **Branch**: `feature/003-source-tracing`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

`[x]` done · `[ ]` remaining.

## Phase 1: Foundational
- [x] T001 Consume the 003 deviation bus (`common.add_deviation`), NOT raw readings (FR-007/SC-005)
- [x] T002 Cycle-aware modeling: per (unit, cycle), onset resets at CIP (FR-008–FR-010)

## Phase 2: Forecast (US1) & Anomaly (US2) Backend
- [x] T003 [US1] `forecast_anomaly.py` robust linear fouling trend → projected days-to-clean
- [x] T004 [US1] Prediction band from trend residual; NaN-safe (drop NaN before fit)
- [x] T004b [US1] Attach explicit confidence-interval bounds + named drivers per forecast (FR-002/FR-003/FR-017)
- [x] T005 [US1] `forecast_bq.sql` — BigQuery `AI.FORECAST` (TimesFM), verified on real data (production path)
- [x] T006 [US2] Rolling-median + MAD robust z-score anomaly flags (fast deviations vs slow trend)
- [x] T007 [US2] `forecast_bq.sql` — BigQuery `AI.DETECT_ANOMALIES` (last_n_points), verified on real data
- [x] T008 [US2] Anomaly output names WHICH signal + HOW MUCH vs baseline (FR-006)
- [x] T008b [US3] Compute per-unit Fouling-Onset Indicator with feature attribution (FR-008/FR-010)

## Phase 3: Honesty & Edge Cases
- [x] T009 Low-confidence when history thin (<5 pts → no forecast); propagate 003 out-of-range (FR-004/FR-013)
- [x] T010 No accuracy/lead-time claims emitted here (FR-016/SC-006) — framed as signal+band
- [x] T011 Publish to `ro_forecasts.fouling_forecast` (clustered), region-pinned
- [x] T011b Handle forecast horizon crossing cleaning events + incomplete evidence states (FR-014/FR-018)
- [x] T012 [P] pytest ≥80%: trend, days-to-clean, MAD anomaly, empty-frame guard

## Phase 4: Frontend Integration (FR-015)
- [x] T013 [API] Expose GET `/api/forecast/{unit_id}` and `/api/anomaly/{unit_id}` in `serving-api/main.py`
- [x] T014 [UI] Create `EarlyWarningPanel` component to display forecasts with bands and anomaly flags
- [x] T015 [UI] Display the Fouling-Onset Indicator with its feature attribution
- [x] T016 [UI] Integrate into `inspection-drawer.tsx` using real API data (no mocks)

## Dependencies
- Depends on 003 (deviation) + 001 (readings). Production compute = `forecast_bq.sql` (Principle I).
