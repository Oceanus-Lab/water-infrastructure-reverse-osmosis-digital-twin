# Tasks: Physics Deviation Engine (+ Source-Tracing)

**Feature**: 003-physics-deviation | **Branch**: `feature/003-source-tracing`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Format: `[ID] [P?] [Story] Description` — `[P]` = parallelizable. `[x]` = done in the prototype;
`[ ]` = remaining (mostly the integration corrections surfaced by the full-repo recon).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create Python 3.11 venv `.venv-watertap-spike`; install `watertap==1.6.0` (idaes 2.12.0, pyomo 6.10.1, watertap-solvers 24.12.9)
- [x] T002 Obtain Ipopt solver via `idaes get-extensions` (pip install ships no binary — documented deviation vs docs/03)
- [x] T003 Verify environment with `spike_watertap.py` (all 4 gates pass, solve ~2–4s)
- [x] T004 [P] Extract `ro_curated.unit_readings` → `data/readings.csv` (feed signals + performance + cycle)

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T005 `common.py` — shared loader; derive `salt_passage` from `percent_ec_removal`
- [x] T006 Define the ONE shared clean-anchor helper in `common.py` and make 004/005/006 consume it (recon flag: baselines currently differ across modules — unify per plan Integration Decision #2)
- [x] T007 Confirm target dataset = **`ro_simulation`** (not `ro_serving`); create partition/cluster schema (`PARTITION BY DATE(reading_date)`, `CLUSTER BY bank_id,unit_id,stage`)

## Phase 3: User Story 1 — Confound-free expected-vs-actual delta (P1) 🎯 MVP

- [x] T008 [US1] `deviation.py::compute` — per (unit, cycle) deviation of `unit_n_delta_p`, `salt_passage`, `unit_recovery`
- [x] T009 [US1] Express deviation in absolute + normalized (%) terms (FR-005); orient so positive == worse health
- [x] T010 [US1] 100% coverage: every reading gets a deviation or explicit `unavailable` marker (FR-004, SC-001)

## Phase 4: User Story 2 — Trustworthy, measurable baseline (P1)

- [x] T011 [US2] Clean anchor = freshly-cleaned start of each cleaning cycle (cycle-position, resets at CIP — FR-006)
- [x] T012 [US2] Deterministic/reproducible expected values (FR-016, SC-007)
- [x] T013 [US2] Report clean-state error metric under known-clean conditions (FR-013, SC-002) — currently implicit; make explicit

## Phase 5: User Story 3 — Graceful degradation (P2)

- [x] T014 [US3] High-fidelity WaterTAP `ReverseOsmosis0D` + `NaClParameterBlock` BWRO baseline; add BWRO scaling factors (solves `optimal`)
- [x] T015 [US3] Fall back to analytical path with reduced-fidelity label when solver unavailable (FR-011, FR-019)

## Phase 6: User Story 4 — Provenance & honest resolution (P2)

- [x] T016 [US4] Every record carries metric, expected, deviation, fidelity, provenance, resolution=whole-unit (FR-009/010/012, SC-004)
- [x] T017 [US4] Out-of-range/low-confidence flag with NaN-safe std guard (FR-014)

## Phase 8: Polish & Cross-Cutting

- [x] T023 [P] Re-route `deploy_serving.sh`: write to `ro_simulation`/`ro_forecasts` (not `ro_serving`); add `--location=us-central1` + partition/cluster
- [x] T024 Drop the mis-placed `ro_serving.st_*` prototype tables (recon flag #1/#2; IAM: only `dataform@` should write ro_serving)
- [x] T025 [P] Fix docs (`docs/03`, AGENTS.md, constitution): "solver bundled via conda; pip needs `idaes get-extensions`"
- [x] T026 [P] Add pytest coverage ≥80% (constitution): reproducibility, coverage=100%, out-of-range, fallback-label

## Phase 9: Frontend Integration (P1)

- [x] T027 [US4] Add `PhysicsDeviation` interfaces to `lib/types/index.ts`
- [x] T028 [US4] Implement `fetchPhysicsDeviation` in `lib/api/index.ts`
- [x] T029 [US4] Add a `PhysicsDeviationPanel` component to `inspection-drawer.tsx` to visualize actual vs expected deltas using `design-taste-frontend` aesthetics.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Stories. US1/US2 are the MVP (co-essential). US3/US4 harden it. Phase 9 (Frontend) depends on backend APIs.
- **Blocking integration tasks**: T006 (shared bus) and T007/T023/T024 (routing) should land before 004/005/006 consume 003 in production.
- Parallel: T023/T025/T026 are independent once T007 is decided.
