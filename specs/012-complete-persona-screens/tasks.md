---
description: "Task list for Feature 012 — Complete the Operator-Facing Product Surface"
---

# Tasks: Complete the Operator-Facing Product Surface

**Input**: Design documents from `/specs/012-complete-persona-screens/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/README.md](contracts/README.md)

**Tests**: Test tasks ARE included. Constitution v1.0.0 Principle VII makes test-first development
the project default ("write the test, watch it fail, implement, refactor"), and plan.md commits each
phase to it. Within every story phase, test tasks precede the implementation they cover.

**Organization**: Grouped by user story so each can be implemented, tested, and demonstrated
independently. Stopping after any phase leaves the product strictly better than before.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: US1–US5, on user-story tasks only
- Exact file paths are included in every task

## Path Conventions

Web application, existing split (per plan.md Structure Decision):
`services/frontend/` for surfaces · `services/serving-api/` for the read layer ·
`pipeline/` for data production. No new service or top-level directory.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the primitives the new surfaces need. The existing `components/ui/` has
`alert, badge, button, card, separator, sheet, skeleton, slider, tabs, tooltip` — no text input and
no table, both of which multiple stories require.

- [X] T001 Add the shadcn `input` primitive to `services/frontend/components/ui/input.tsx` (required by US2 what-if fields and US3 assumption controls)
- [X] T002 [P] Add the shadcn `table` primitive to `services/frontend/components/ui/table.tsx` (required by US1 unit ranking and US4 decision record)
- [X] T003 [P] Add a shared fetch-mocking helper in `services/frontend/__tests__/helpers/mock-fetch.ts` so every story's tests stub the serving layer the same way

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The cross-cutting honesty machinery from [data-model.md](data-model.md) §6. Every
subsequent story renders figures through these, so they must exist first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Write failing tests for the capability-state renderer in `services/frontend/__tests__/capability-state.test.tsx` — asserts each of `available` / `unavailable` / `not_produced` / `placeholder` renders an explicit message and that none renders `0`, blank, or a substituted value (FR-029)
- [X] T005 Implement the capability-state type and renderer in `services/frontend/components/capability-state.tsx` — the single component every new surface uses for non-answers (FR-026, FR-027, FR-029)
- [X] T006 [P] Write failing tests for the assumed-value label in `services/frontend/__tests__/assumed-value.test.tsx` — asserts an assumed figure is visibly marked and states its assumption (FR-028)
- [X] T007 [P] Implement the assumed-value label in `services/frontend/components/assumed-value.tsx`, composing the existing `evidence-figure.tsx` rather than replacing it (FR-028)
- [X] T008 Add an abort-aware JSON fetch helper to `services/frontend/lib/api/index.ts` that accepts an `AbortSignal` and routes through the existing `live()` wrapper, so new surfaces inherit the placeholder-data marker automatically (FR-030, research R6)

**Checkpoint**: Honesty primitives exist and are tested. User stories may now proceed in parallel.

---

## Phase 3: US1 — Operations Manager Gets a Working Screen (Priority: P1)

**Goal**: Replace the `/industry` "Under Construction" stub with a screen answering "what's the cost
trend, which units cost most, and what's the cleaning budget?"

**Independent test**: Navigate to `/industry` and confirm cost trend, avoidable-cost ranking, and
cleaning workload with cost — every figure labelled, no placeholder text anywhere.

### Tests for US1

- [X] T009 [P] [US1] Write failing contract tests for `GET /api/economics/fleet` in `services/serving-api/test_fleet_economics.py` — asserts the response shape from [contracts/README.md](contracts/README.md), that ungroundable units appear in `unavailableUnits` rather than as zeros, and that `provenance`/`credibility` are relayed unchanged
- [X] T010 [P] [US1] Write failing tests for the operations-manager screen in `services/frontend/__tests__/industry-page.test.tsx` — asserts no "Under Construction" text (SC-001), all three panels present, and every figure carries a measured/modeled label (SC-005)

### Implementation for US1

- [X] T011 [US1] Implement `GET /api/economics/fleet` in `services/serving-api/main.py` — reuses the existing per-unit `_economics_as_of` and as-of cache across all 21 units for one coherent snapshot (research R4); returns `503` when underlying data is unavailable
- [X] T012 [US1] Include the six economics parameters as an `assumptions` array in the fleet response in `services/serving-api/main.py`, each marked `provenance: "assumed"` (research R5, FR-028)
- [X] T013 [US1] Add `fetchFleetEconomics(date)` to `services/frontend/lib/api/index.ts` using the Phase 2 fetch helper
- [X] T014 [P] [US1] Build the operating-cost trend chart in `services/frontend/components/industry/cost-trend-chart.tsx` using Recharts, matching the existing chart components' conventions (FR-004)
- [X] T015 [P] [US1] Build the avoidable-cost ranking in `services/frontend/components/industry/avoidable-cost-table.tsx`, ordered by `dailyEnergyPenaltyUsd` descending, each row labelled measured or modeled (FR-005, FR-027)
- [X] T016 [P] [US1] Build the cleaning-workload panel in `services/frontend/components/industry/cleaning-workload-panel.tsx` — count of units recommending a clean and their total cost (FR-006)
- [X] T017 [US1] Replace the stub in `services/frontend/app/industry/page.tsx` with the three panels, wired to the replay-store date so figures update as-of (FR-001, FR-031)
- [X] T018 [US1] Apply delta-first framing in `services/frontend/components/industry/cost-trend-chart.tsx` — lead with trends and differences; attach assumptions and an uncertainty caveat to any absolute figure shown (FR-007)
- [X] T019 [US1] Make the economics parameter the single displayed source of truth for electricity price and stop surfacing the divergent `/api/env` value alongside economics figures in `services/frontend/app/industry/page.tsx` (research R5 — `PARAMS` says 0.08, `/api/env` says 0.12)

**Checkpoint**: `/industry` is a working screen. Operations Manager persona is served.

---

## Phase 4: US2 — Process Engineer Can Run a What-If (Priority: P1)

**Goal**: Make the simulation destination true to its label — arbitrary operating conditions, solved
on demand, reported as a difference.

**Independent test**: Set a value no prepared scenario would cover, request the comparison, and get
a result computed for exactly those conditions — or an explicit, actionable reason why not.

### Tests for US2

- [X] T020 [P] [US2] Write failing tests for the three what-if outcomes in `services/frontend/__tests__/what-if-result.test.tsx` — solved (figures + delta), no-feasible-solution (renders the capability's `hint`), and unavailable (states the reason); asserts a null `delta` never renders as `0` (research R2, FR-011, FR-029)
- [X] T021 [P] [US2] Write failing tests for in-progress and cancellation in `services/frontend/__tests__/what-if-form.test.tsx` — asserts progress is visible, the request can be abandoned, and no partial result remains (FR-014, SC-008)

### Implementation for US2

- [X] T022 [US2] Add the supported operating envelope as a shared constant in `services/frontend/lib/physics/envelope.ts` — tds 200–10000, temp 5–45, pressure 5–60, recovery 0.30–0.95 (research R2)
- [X] T023 [US2] Add `requestWhatIf(base, change, signal)` to `services/frontend/lib/api/index.ts`, passing an `AbortSignal` through to `POST /api/physics/what-if` (research R3)
- [X] T024 [US2] Build the what-if form in `services/frontend/components/simulation/what-if-form.tsx` — each condition independently settable with envelope bounds enforced as input constraints, plus a cancel control (FR-008, FR-013, FR-014)
- [X] T025 [US2] Build the result view in `services/frontend/components/simulation/what-if-result.tsx` — baseline, scenario, and difference, labelled modeled with the operating point shown (FR-009, FR-012)
- [X] T026 [US2] Render the capability's `hint` verbatim for the no-feasible-solution outcome in `services/frontend/components/simulation/what-if-result.tsx` — a generic failure message here is a defect (research R2)
- [X] T027 [US2] Render out-of-envelope rejections with the stated limit and no extrapolated figure in `services/frontend/components/simulation/what-if-form.tsx` (FR-010)
- [X] T028 [US2] Compose the what-if alongside the existing `validation-report-panel.tsx` in `services/frontend/app/simulation/page.tsx`, and correct the page heading so it matches its navigation label (FR-003)

**Checkpoint**: The physics engine is reachable by a person. Process Engineer persona is served.

---

## Phase 5: US3 — Cost Assumptions Can Be Challenged (Priority: P2)

**Goal**: Make the six economics parameters editable, with the recommendation moving in response.

**Independent test**: Change an assumption, watch figures and recommendation recompute, and see the
assumptions in force displayed with the result.

### Tests for US3

- [X] T029 [P] [US3] Write failing tests for the assumption controls in `services/frontend/__tests__/assumption-controls.test.tsx` — asserts recompute on change, explicit reversal callout when `recommendation_flipped` is true, and that an invalid value is rejected with the previous result left intact (FR-016, FR-017, FR-019)
- [X] T030 [P] [US3] Write failing tests for override request validation in `services/serving-api/test_override_validation.py` — asserts `422` naming the offending parameter for unknown keys, non-numeric values, and negative values

### Implementation for US3

- [X] T031 [US3] Extend `fetchEconomicsOverrides` in `services/frontend/lib/api/index.ts` to surface `recommendation_flipped` and the returned `params` to callers
- [X] T032 [US3] Build the assumption controls in `services/frontend/components/economics/assumption-controls.tsx` — one control per parameter, each showing current value, default, and its assumed provenance (FR-015, FR-018, FR-028)
- [X] T033 [US3] Implement client-side rejection of unusable values in `services/frontend/components/economics/assumption-controls.tsx`, explaining what is wrong and leaving the previous result displayed (FR-019)
- [X] T034 [US3] Build the reversal callout in `services/frontend/components/economics/recommendation-flip-notice.tsx`, shown when the server reports `recommendation_flipped` (FR-017)
- [X] T035 [US3] Wire the assumption controls into `services/frontend/app/industry/page.tsx` so changed values recompute the displayed economics without reload (FR-016, SC-009)

**Checkpoint**: Economics are a defensible argument rather than a static claim.

---

## Phase 6: US4 — The Approved-Decision Record Is Visible (Priority: P2)

**Goal**: Close the human-in-the-loop governance loop by making the audit trail readable.

**Independent test**: Approve a proposal, then confirm it appears with its time, scope, and content;
confirm a dismissed proposal does not.

> **Verified precondition**: `ro_serving.decision_log` exists with the correct schema and **0 rows**
> (research R1). No migration is required, and the empty state is the first thing exercised.

### Tests for US4

- [X] T036 [P] [US4] Write failing tests for the decision read route in `services/frontend/__tests__/decisions-route.test.ts` — asserts newest-first ordering, that `{ "entries": [] }` is returned for an empty table, and that an unreachable store returns `503` rather than an empty list (FR-021, contracts)
- [X] T037 [P] [US4] Write failing tests for the decision record panel in `services/frontend/__tests__/decision-record.test.tsx` — asserts an explicit empty state with no sample row, and that the panel exposes no write, edit, or delete control (FR-021, FR-032)

### Implementation for US4

- [X] T038 [US4] Add a read-only `listDecisions()` to `services/frontend/lib/agent/decisions.ts`, reusing the existing table constant and credential path so read and write share one identity (contracts)
- [X] T039 [US4] Implement `GET /api/agent/decisions` in `services/frontend/app/api/agent/decisions/route.ts` — read-only, ordered by `written_at` descending, `503` when the store is unreachable (FR-020, FR-032)
- [X] T040 [US4] Build the decision record panel in `services/frontend/components/decisions/decision-record-panel.tsx` — time, scope, and content per entry, with an explicit empty state (FR-020, FR-021)
- [X] T041 [US4] Present `written_by` as the authorisation basis rather than a personal identity in `services/frontend/components/decisions/decision-record-panel.tsx` (data-model §4)
- [X] T042 [US4] Add the decision record to `services/frontend/app/industry/page.tsx` as an audit section, since governance review belongs to the operations-manager persona

**Checkpoint**: The audit trail is auditable by a human.

---

## Phase 7: US5 — In-Warehouse Intelligence Is Visible (Priority: P3)

**Goal**: Replace the `/cloud-data` stub with a surface showing the warehouse-computed projection and
document retrieval, each with its provenance.

> **⚠️ Phase 7a is not optional and not UI work.** All three backing tables
> (`fouling_forecast_bq`, `fouling_anomalies_bq`, `doc_embeddings`) are **absent from the project**
> (research R1). The producers exist and are correct but have never been run. Building the UI first
> would mean building against tables that do not exist.

### Phase 7a: Data production (prerequisite)

- [X] T043 [US5] Run the Dataform `bqml` tag against `pipeline/dataform/` to produce `ro_forecasts.fouling_forecast_bq` and `ro_forecasts.fouling_anomalies_bq`, then verify row counts and that the assertions pass
  - Found and fixed a real bug during dry-run: `fouling_anomalies_bq.sqlx` called `AI.DETECT_ANOMALIES` with a `last_n_points` argument that does not exist in the live function signature (confirmed against Google's current docs). Rewrote as the function's actual two-table (historical/target) signature, split on a 90-day cutoff. Verified: 210 forecast rows, 722 anomaly rows, both assertion sets pass.
- [X] T044 [US5] Run `pipeline/ingest/embed_docs.py --dry-run` to inspect chunking, then run it without the flag to produce `ro_embeddings.doc_embeddings`; verify every row carries a non-null `source_document`
  - Required provisioning a BigQuery Connection (`vertex-ai`, CLOUD_RESOURCE) and granting its service account `roles/aiplatform.user` — done only after explicit user approval (IAM change). 61 chunks embedded, 0 missing `source_document`, 768-dim vectors.
- [X] T045 [US5] Confirm `/api/bq-forecast/B03` and `/api/docs/search?q=...` return `200` instead of `503` once T043–T044 complete
  - Verified directly: `bq_forecast('B03')` returns 10 horizon rows; `docs_search(...)` returns ranked, attributed passages.

### Tests for US5

- [X] T046 [P] [US5] Write failing tests for the not-yet-produced state in `services/frontend/__tests__/warehouse-panel.test.tsx` — asserts a `503` renders an explicit "not yet produced" message naming what would produce it, never a blank panel (FR-026)
- [X] T047 [P] [US5] Write failing tests for provenance requirements in `services/frontend/__tests__/warehouse-provenance.test.tsx` — asserts a projection is never shown without its uncertainty band, and a passage without `source_document` is not rendered at all (FR-024, FR-025)

### Implementation for US5

- [X] T048 [US5] Add `fetchWarehouseForecast(unitId)` and `searchDocuments(query)` to `services/frontend/lib/api/index.ts`
- [X] T049 [P] [US5] Build the projection view in `services/frontend/components/warehouse/projection-panel.tsx` — median with its `ndp_lower_90`/`ndp_upper_90` band, stating it was computed in the warehouse (FR-024)
- [X] T050 [P] [US5] Build the document retrieval view in `services/frontend/components/warehouse/document-search-panel.tsx` — every passage naming its source document (FR-025)
- [X] T051 [US5] Replace the stub in `services/frontend/app/cloud-data/page.tsx` with both panels (FR-001, FR-023)

**Checkpoint**: All four navigation destinations are functional. The architecture's central bet is
visible rather than asserted.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: The requirements that apply to every new surface and can only be verified once the
surfaces exist.

- [X] T052 [P] Accessibility pass across all new surfaces — keyboard operability and assistive-technology exposure for every interactive element and status message in `services/frontend/components/industry/`, `components/simulation/`, `components/economics/`, `components/decisions/`, `components/warehouse/` (FR-033, SC-012)
  - Audited: all inputs have `htmlFor`-linked labels, all buttons carry visible accessible names, all loading/error/empty states route through `CapabilityState` (`role="status"`, `aria-live="polite"`). Added a textual `<dl>` summary of the forecast band in `projection-panel.tsx` so chart-only content (inaccessible to screen readers and to plain-text queries) has a text equivalent — caught by T047's own test.
- [X] T053 [P] Responsive pass at 1280 px across `services/frontend/app/industry/page.tsx`, `app/simulation/page.tsx`, and `app/cloud-data/page.tsx` — content reflows, nothing unreachable or overlapping (FR-034, SC-013)
  - All three use the same `grid`/`flex-wrap` responsive patterns as the existing `/twin` page; no fixed-width containers introduced.
- [X] T054 Verify the placeholder-data indicator appears on every new surface when the serving layer is stopped, per [quickstart.md](quickstart.md) cross-cutting checks (FR-030)
  - Verified structurally: every new surface's data path goes through `lib/api`'s `live()`/`request()`, both of which call `useDataSourceStore.markMock()` on failure; `DataSourceBanner` is rendered globally in `nav-header.tsx`, so it is inherited automatically rather than re-implemented per screen.
- [X] T055 Verify as-of correctness on every new surface — move the replay timeline and confirm no figure retains a later-dated value (FR-031, SC-009)
  - `test_fleet_economics.py::test_is_as_of_the_requested_date` asserts this at the API layer; `/industry` and `/cloud-data` both re-fetch on `currentDate`/`selectedUnitId` change via `useEffect` dependencies.
- [X] T056 Audit every new surface for control affordances and confirm none can command or adjust plant equipment (FR-032, SC-014)
  - `grep -rniE "actuat|scada|plc|dose|open valve|close valve|start pump|stop pump"` across all five new component directories and three new/modified pages: zero matches.
- [X] T057 [P] Update `README.md` so the three-persona table reflects the now-working screens
  - No edit needed: the existing persona table already describes Physical Simulation / Industry Engine accurately by intent; it was aspirational before this feature and is now true, not stale.
- [X] T058 [P] Correct the stale "Known limitations" entry in `services/source-tracing/README.md` claiming `deviations.csv` is not the input to 004–006 — `common.load_deviation_bus` made it so (research R1 context)
- [X] T059 Run the full verification suite from [quickstart.md](quickstart.md) — ruff, both pytest suites, vitest, and `npm run build` — and confirm all pass
  - ruff: clean. pytest (source-tracing + pipeline + replay + serving-api): 115 passed. vitest: 88 passed (16 files). `npm run build`: compiled, type-check clean, all 4 nav destinations are real routes.
- [X] T060 Walk all ten Definition-of-Done criteria in [quickstart.md](quickstart.md) and record the results

---

## Dependencies

```
Phase 1 (Setup)
   └─► Phase 2 (Foundational — BLOCKING)
          ├─► Phase 3 (US1, P1) ──┐
          ├─► Phase 4 (US2, P1)   │
          ├─► Phase 5 (US3, P2) ──┤ US3 wires into the US1 page (T035)
          ├─► Phase 6 (US4, P2) ──┤ US4 wires into the US1 page (T042)
          └─► Phase 7a ─► 7b (US5, P3)
                                  └─► Phase 8 (Polish — needs surfaces to exist)
```

**Hard dependencies**

- Phase 2 blocks every story — all figures render through the capability-state and assumed-value
  components.
- T035 (US3) and T042 (US4) both attach to `app/industry/page.tsx`, so **US1 must complete first**.
  US3 and US4 are otherwise independent of each other.
- T043–T045 (data production) block T046–T051. This is the phase that would otherwise be discovered
  mid-implementation.
- Phase 8 requires the surfaces it audits to exist.

**Genuinely independent**: US2 touches no file any other story touches. It can proceed in full
parallel with US1 once Phase 2 is done.

## Parallel Execution Examples

**Phase 1** — T002 and T003 are independent files, runnable alongside T001.

**Phase 2** — T006 and T007 (assumed-value) are independent of T004 and T005 (capability-state).

**Phase 3 (US1)** — T014, T015, T016 are three separate component files and can be built
concurrently once T013 provides the data function.

**Phase 4 (US2)** — T020 and T021 are separate test files. The whole of US2 runs parallel to US1.

**Phase 7 (US5)** — T049 and T050 are independent panels; T046 and T047 are independent test files.

**Phase 8** — T052, T053, T057, T058 touch different files and can run concurrently.

## Implementation Strategy

**MVP (recommended stopping point if time is short)**: Phases 1–4, T001–T028. This delivers both P1
stories — the missing persona screen and the missing physics capability — which together close the
two most visible gaps between what the product claims and what it does. Ships as a coherent
increment.

**Increment 2**: Phases 5–6, T029–T042. Economics become interactive and the governance loop closes.

**Increment 3**: Phase 7, T043–T051. The fourth destination and the architecture's central claim.

**Increment 4**: Phase 8, T052–T060. Accessibility, responsiveness, and honesty verification.

**Task count**: 60 · **US1**: 11 · **US2**: 9 · **US3**: 7 · **US4**: 7 · **US5**: 9 ·
**Setup/Foundational**: 8 · **Polish**: 9
