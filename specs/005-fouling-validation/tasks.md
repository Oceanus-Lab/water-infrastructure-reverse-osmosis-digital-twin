# Tasks: Fouling Validation & Source Attribution

**Feature**: 005-fouling-validation | **Branch**: `feature/003-source-tracing`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

`[x]` done · `[ ]` remaining.

## Phase 1: Lead-time backtest (US1)
- [x] T001 [US1] Use the 71 real CIP events as ground truth (FR-001)
- [x] T002 [US1] Per CIP: first-warning lookback on the deviation signal → lead days; robust clean anchor (window 10th pct)
- [x] T003 [US1] Report catch-rate + lead-time central tendency + spread (median, P25/P75) (FR-003/FR-004)
- [x] T004 [US1] Pre-register threshold + sustained-warning min duration BEFORE the run (FR-005/FR-007)
- [x] T005 [US1] Report precision / false-alarm rate + recall against the CIP catalog (FR-006)
- [x] T006 [US1] Reconcile detected-cycle count vs CIP-label count (FR-017)
- [x] T006b [US2] Validate clean-membrane physics baseline error against genuine clean-state operation (FR-008/FR-009)
- [x] T006c [US3] Discover and rank most reliable leading indicator dynamically (FR-010/FR-011)
- [x] T007 [US1] Empty-frame guard (no usable window → safe zero-result, no crash)

## Phase 2: Source attribution (US2)
- [x] T008 [US2] `attribute.py` — feed-fingerprint + stage×ΔP×salt-passage symptom→cause logic
- [x] T009 [US2] Measured-vs-modeled labels; co-candidates where signals can't separate (FR-022 contract)
- [x] T010 [US2] Attribution never reweights the measured lead indicator (FR-022)
- [x] T011 [US2] Data-limit disclosures (no ion speciation / bio-vs-organic / SDI / free-Cl₂)
- [x] T012 [US2] Cited evidence base `EVIDENCE.md` (FilmTec/Hydranautics/ASTM/EPA PMF/Flemming)

## Phase 3: Honesty & Publish
- [x] T013 Exclude setpoint/temperature-confounded signals — use the normalized ΔP deviation (FR-012)
- [x] T014 Publish to `ro_simulation.fouling_attribution` (clustered), region-pinned
- [x] T015 [P] pytest ≥80%: backtest lead-time, attribution labels, co-candidate emission
- [x] T016 Consolidate 003 US5 source-tracing into 005 once placement confirmed (with Abdullah)

## Phase 4: Frontend Integration (FR-014/FR-015)
- [x] T017 [API] Expose GET `/api/validation` endpoint in `serving-api/main.py`
- [x] T018 [UI] Create `ValidationReportPanel` matching current design system to display benchmarks
- [x] T019 [UI] Display baseline errors, lead-time distribution, and precision/recall honesty metrics

## Dependencies
- Depends on 004 (forecast) + 003 (deviation) + 001 (CIP catalog). 005 is the evidence-first gate (FR-016).
