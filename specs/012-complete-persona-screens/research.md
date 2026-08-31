# Phase 0 Research — Complete the Operator-Facing Product Surface

**Feature**: 012-complete-persona-screens · **Date**: 2026-08-28

The spec assumes every capability behind the new surfaces already exists and needs only exposing.
That assumption was tested against the live project rather than taken on trust. It holds for three
of the five user stories, partially for one, and **not at all for one** — which changes the shape of
the work.

---

## R1. Do the capabilities behind each user story actually exist?

**Method**: direct inspection of the live BigQuery project (`spatial-cat-489006-a4`) and of the
serving layer's endpoint surface.

| User story | Backing capability | Verified state |
|---|---|---|
| US1 operations manager | Per-unit economics (`/api/economics/{unit}`) | Exists — **but per-unit only**; no fleet-level aggregate |
| US2 what-if | `POST /api/physics/what-if` + `physics.what_if()` | Exists and complete |
| US3 cost overrides | `POST /api/economics/{unit}/override` | Exists, validated, unused by any UI |
| US4 decision record | `ro_serving.decision_log` | **Table exists, schema correct, 0 rows** |
| US5 in-warehouse surface | `doc_embeddings`, `fouling_forecast_bq`, `fouling_anomalies_bq` | **All three tables MISSING** |

### Decision — US4 is confirmed low-risk

The specification flagged the decision-record read path as the one place a capability might be
missing rather than merely unexposed. It is not missing: the table exists with the exact schema the
write path produces.

```
proposal_id  STRING   record_type STRING   unit_id STRING
content      JSON     written_at  TIMESTAMP   written_by STRING
```

**Rationale**: nothing needs to be created; a read path over an existing table is all that is
required. Zero rows is the expected state — no decision has been approved yet — and it makes the
empty-state requirement (FR-021) the *first* thing that will be exercised, not an afterthought.

**Alternative considered**: introducing a separate read-model or view. Rejected — the table is small,
append-only, and directly queryable; a view would add a migration for no benefit.

### Decision — US5 requires a data-production step before any UI work

All three tables the fourth destination reads are absent from the project. The endpoints that serve
them (`/api/bq-forecast/{unit}`, `/api/docs/search`) are written and correct, and both already
degrade to `503` with an actionable message rather than failing opaquely — but there is nothing for
them to return.

**Rationale**: the producers exist and have never been run:

- `pipeline/dataform/definitions/forecasts/*_bq.sqlx` — tagged `bqml`, produces the forecast and
  anomaly tables via `AI.FORECAST` (TimesFM). Verified against the current `AI.FORECAST` contract:
  the action uses `id_cols => ['unit_id']` to cover all 21 units in one call, `horizon => 10`,
  `confidence_level => 0.9`, and selects `prediction_interval_lower_bound` / `upper_bound` — all
  valid per the current function signature.
- `pipeline/ingest/embed_docs.py` — produces `doc_embeddings` via `ML.GENERATE_EMBEDDING`.

**Consequence for planning**: US5 gains a prerequisite phase that US1–US4 do not have. It is already
ranked P3, so this does not block the higher-priority stories — but the plan must not treat US5 as
"just another screen."

**Alternative considered**: dropping US5 back out of scope. Rejected — the user explicitly chose to
build it, and the producers are one command each. The honest treatment is to sequence the data
production first and let FR-026 (say so plainly when results have not been produced) cover the
interim state.

---

## R2. What is the real what-if contract, and what can go wrong?

**Method**: read `services/source-tracing/physics.py` (`LIMITS`, `simulate`, `what_if`).

**Decision**: the surface must distinguish **three** failure modes, not one.

| Condition | Signal from the capability | Required surface behaviour |
|---|---|---|
| A value outside its supported range | envelope check, `out_of_envelope` | State the limit (FR-010) |
| A *combination* with no feasible solution | `solve_failed` + a `hint` explaining why | Show the hint — it is actionable |
| Solver or service unavailable | `available: false` + reason | State unavailable (FR-011) |

**Rationale**: the second case is the subtle one and it is not an error. Every individual value can
be inside its range while the combination has no solution — the module's own comment records the
measured example: 23 °C solves at 50 m², 30 °C does not, and 30 °C at 30 m² solves again. The module
already returns a plain-language `hint` for exactly this case. Discarding that hint and rendering a
generic failure would make a working, well-behaved engine look broken.

Supported envelope, to be enforced in the UI as input bounds so most rejections never reach the
solver:

| Condition | Range |
|---|---|
| `tds_ppm` | 200 – 10,000 |
| `temp_c` | 5 – 45 |
| `pressure_bar` | 5 – 60 |
| `recovery` | 0.30 – 0.95 |

**Return shape**: `{ baseline, scenario, change, delta }`, where `delta` is populated **only** when
both solves reached high fidelity — so a null `delta` is a meaningful state the UI must render
honestly rather than as a zero.

**Alternative considered**: client-side validation only, letting the server be the sole authority.
Rejected — bounds in the UI give immediate feedback and avoid a multi-second round trip to learn a
value was out of range, while the server check remains authoritative (defence in depth).

---

## R3. How should an on-demand solve be requested and cancelled?

**Method**: current Next.js App Router documentation via Context7, plus the existing route-handler
patterns in this repo.

**Decision**: a plain request/response route handler, with cancellation driven by `AbortSignal` from
the client and observed server-side via the incoming request's signal. No streaming.

**Rationale**: Route Handlers are built on the Web `Request`/`Response` APIs, so the standard
`AbortController` → `fetch(..., { signal })` path applies with no framework-specific machinery. A
what-if returns one result, not a sequence, so the streaming primitives the assistant panel uses
(`ReadableStream` + SSE) would add moving parts for no user-visible gain. FR-014's requirements —
show progress, allow abandonment, never render a partial result — are all satisfiable with a single
in-flight request plus an abort.

**Alternative considered**: streaming intermediate solver state. Rejected — the solver does not
expose intermediate states, so there would be nothing truthful to stream.

---

## R4. What does the operations-manager screen need that does not yet exist?

**Method**: read `economics.unit_economics()` output and the serving layer's economics endpoints.

**Decision**: add one fleet-scoped read endpoint. Everything else is already computed per unit.

`unit_economics()` returns, per unit and cycle: `dp_rise_psi`, `extra_sec_kwh_m3`,
`daily_energy_penalty_usd`, `cum_energy_penalty_usd`, `cip_cost_usd`, `recommendation`,
`break_even_day`, `provenance`, `credibility`.

Those cover all three things US1 asks for — cost trend (`cum_energy_penalty_usd` over time), ranking
by avoidable cost (`daily_energy_penalty_usd` descending), and cleaning workload with its cost
(`recommendation` counts × `cip_cost_usd`). What is missing is only the **fleet-wide shape**: the
existing endpoint answers for one unit at a time, and the screen needs all 21 as of a date.

**Rationale**: fanning out 21 client-side requests would be slow, would multiply the as-of-date
recomputation, and would give the screen no single consistent as-of snapshot. One server-side
aggregate reuses the existing per-unit function and the existing as-of cache.

**Alternative considered**: computing the aggregate in the browser from 21 calls. Rejected for the
reasons above.

**Note — `provenance` and `credibility` already travel with every row**, so FR-027's
measured-versus-modeled labelling needs no new computation, only faithful display.

---

## R5. Which figures rest on assumed constants? (FR-028)

**Method**: traced every constant feeding a displayed cost figure.

**Decision**: three values must carry an "assumed" label, and one inconsistency must be resolved
before the operations-manager screen displays anything.

| Value | Source | State |
|---|---|---|
| `cip_cost_usd` = 3000, `cip_downtime_lost_usd` = 2000 | `economics.PARAMS` | Assumed — documented as parametric by design |
| `permeate_flow_m3_day` = 500, `pump_efficiency` = 0.75, `recovery_setpoint` = 0.85 | `economics.PARAMS` | Assumed |
| Grid carbon 0.35 kg/kWh | `/api/env` constant | Assumed — external ingest never run |
| **Electricity price** | **Two different values** | **Inconsistent — see below** |

**Finding**: the electricity price is hardcoded twice, with different values.
`economics.PARAMS["electricity_price_usd_kwh"]` is **0.08**, while `/api/env` reports
`electricityCostUsdPerKwh` as **0.12**. Every cost figure on the operations-manager screen would be
computed from 0.08 while the same screen could display 0.12 as the prevailing price — a 50%
discrepancy visible in a single view.

**Rationale for handling it here**: this feature does not own sourcing a real price (that is the
un-run external ingest, explicitly out of scope per the spec's assumptions). But it does own not
displaying two contradictory prices on one screen. The resolution is to make the economics
parameter the single source of truth for any displayed price, label it assumed per FR-028, and
record the `/api/env` divergence as a defect for the separate data-sourcing work.

**Alternative considered**: silently showing only one of the two. Rejected — that hides a real
inconsistency rather than resolving it, and FR-028 exists precisely to prevent assumed values from
passing as measured.

---

## R6. Which existing patterns must the new surfaces reuse?

**Method**: inspected the existing frontend for the conventions the spec requires be inherited
unchanged (FR-027, FR-030, FR-031).

**Decision**: reuse, do not re-create.

| Concern | Existing mechanism | How it is reused |
|---|---|---|
| Placeholder-value marking (FR-030) | `data-source-store` + `DataSourceBanner`, already rendered in the nav header | Automatic — it is global and fires on any failed fetch, so new screens inherit it by using the same fetch wrapper |
| As-of-date correctness (FR-031) | `replay-store` holds the selected instant; serving layer normalises any ISO form to a day | New screens read the same store and pass the date through |
| Measured/modeled labelling (FR-027) | `EvidenceFigure`, `SourceTraceBadge` | Reused directly |
| Charts | Recharts, as used by the existing trend and breakeven charts | Reused |
| Panels/empty states | Existing design language and `ValidationReportPanel` structure | Followed |

**Rationale**: the spec states consistency with the existing design language is the standard and no
new design system is introduced. Using the same fetch wrapper is load-bearing rather than
stylistic — it is what makes FR-030 true on the new screens without any additional work.

---

## Open risks carried into Phase 1

| Risk | Impact | Mitigation |
|---|---|---|
| US5's three tables must be produced before its screen shows anything | US5 blocked | Sequence data production first; FR-026 covers the interim honestly |
| Producing `doc_embeddings` and the forecast tables incurs model/query cost | Budget | Both are one-off, small (10-day horizon, ~10 documents); project has a $50 budget alert |
| An arbitrary what-if may take seconds per solve | UX | FR-014 progress + cancel; UI-side bounds prevent avoidable round trips |
| Two contradictory electricity prices | Visibly wrong figures | R5 decision — single source of truth, labelled assumed |
| Nothing is currently deployed | Cannot demo | Out of scope here; feature is complete against a locally running data service, per spec assumption |
