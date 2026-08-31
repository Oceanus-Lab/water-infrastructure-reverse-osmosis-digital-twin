# Quickstart — Complete the Operator-Facing Product Surface

**Feature**: 012-complete-persona-screens · **Date**: 2026-08-28

How to run and validate this feature end to end. Each scenario maps to one user story and is
independently runnable — you can validate Phase 1 without Phase 2 existing.

Shapes referenced here are defined in [data-model.md](data-model.md) and
[contracts/README.md](contracts/README.md); this guide covers running and verifying, not
implementing.

---

## Prerequisites

**1. Pipeline outputs must exist.** The serving layer reads the source-tracing CSV outputs; they are
gitignored and must be regenerated.

```bash
cd services/source-tracing
../../.venv-watertap-spike/bin/python run_all.py     # writes data/*.csv
```

**2. Serving layer running.**

```bash
cd services/serving-api
uvicorn main:app --reload --port 8000
```

**3. Frontend running.** Keep the heap capped and stop the dev server when finished — this project's
dev server is memory-hungry.

```bash
cd services/frontend
NEXT_PUBLIC_API_URL=http://localhost:8000 NODE_OPTIONS=--max-old-space-size=1536 npm run dev
```

**4. For User Story 2 only — the physics capability must be reachable.** Either the sibling
source-tracing checkout has WaterTAP installed (it does, via `.venv-watertap-spike`), or
`WATERTAP_API_URL` points at a running `watertap-engine`. If neither is true the surface correctly
reports the capability as unavailable — which is itself a valid thing to verify (Scenario 2c).

**5. For User Story 5 only — the warehouse tables must be produced.** They do not exist yet.

```bash
# Forecast + anomaly tables
npm install -g @dataform/cli@3.0.63
cd pipeline/dataform && dataform run --tags bqml

# Document corpus
cd pipeline/ingest
python embed_docs.py --dry-run     # inspect chunking first
python embed_docs.py               # writes ro_embeddings.doc_embeddings
```

---

## Scenario 1 — Operations manager has a working screen (US1)

**Validates**: FR-001, FR-002, FR-004–FR-007, SC-001, SC-002

```bash
curl -s "http://localhost:8000/api/economics/fleet?date=2020-06-01" | python3 -m json.tool | head -40
```

**Expected**: a `units` array, an `assumptions` array with six entries all marked
`"provenance": "assumed"`, and an `unavailableUnits` array.

Then in the browser at `/industry`:

| Check | Expected |
|---|---|
| No placeholder | Zero "Under Construction" text anywhere (SC-001) |
| Cost trend | Operating cost across the period is shown |
| Ranking | Units ordered by avoidable cost, worst first |
| Cleaning workload | Count of units recommending a clean, with cost |
| Labels | Every figure marked measured or modeled (SC-005) |
| Assumptions | Assumed values visibly marked as assumptions (SC-006) |
| As-of | Move the replay timeline — every figure changes (SC-011) |

**Negative check**: a unit in `unavailableUnits` must appear as unavailable, **not** as `0`.

---

## Scenario 2 — Process engineer runs a what-if (US2)

**Validates**: FR-008–FR-014, SC-003, SC-004, SC-008

### 2a. Solved case

```bash
curl -s -X POST "http://localhost:8000/api/physics/what-if" \
  -H "Content-Type: application/json" \
  -d '{"base":{"tds_ppm":1500,"temp_c":23,"pressure_bar":15,"recovery":0.85,"membrane_area_m2":50},
       "change":{"pressure_bar":20}}' | python3 -m json.tool
```

**Expected**: `baseline` and `scenario` both `"fidelity": "high"`, and a populated `delta`.

In the browser at `/simulation`: set a value **no prepared scenario would cover** (e.g.
`pressure_bar: 17.3`), request the comparison, and confirm the result is computed for exactly those
conditions (SC-004) and is labelled modeled with its operating point shown.

### 2b. No feasible solution — *not* an error

```bash
curl -s -X POST "http://localhost:8000/api/physics/what-if" \
  -H "Content-Type: application/json" \
  -d '{"base":{"tds_ppm":1500,"temp_c":30,"pressure_bar":15,"recovery":0.85,"membrane_area_m2":50},
       "change":{"temp_c":30}}' | python3 -m json.tool
```

**Expected**: `solve_failed` with a `hint` explaining that higher feed temperature raises
permeability so permeate demand can exceed the feed, suggesting a smaller area or lower temperature.

**The UI must display that hint.** A generic "simulation failed" here is a defect — it makes a
correctly-behaving engine look broken.

### 2c. Out of envelope, and unavailable

| Input | Expected |
|---|---|
| `temp_c: 60` (range 5–45) | Limit stated; no extrapolated figure (FR-010) |
| Physics capability stopped | "Unavailable" with a reason; no approximation (FR-011) |

### 2d. Progress and cancel

Start a comparison and abandon it mid-flight. **Expected**: in-progress state visible, cancellation
works, and no blank or partial result is left on screen (SC-008).

---

## Scenario 3 — Cost assumptions can be challenged (US3)

**Validates**: FR-015–FR-019, SC-009

```bash
curl -s -X POST "http://localhost:8000/api/economics/B03/override?date=2020-06-01" \
  -H "Content-Type: application/json" \
  -d '{"electricity_price_usd_kwh": 0.25}' | python3 -m json.tool | grep -E "recommendation|flipped"
```

**Expected**: recomputed figures and a `recommendation_flipped` boolean.

In the browser:

| Check | Expected |
|---|---|
| Change a value | Figures recompute without reload (SC-009) |
| Reversal | When `recommendation_flipped` is true, the reversal is called out (FR-017) |
| Assumptions visible | The set in force is shown with the result (FR-018) |
| Invalid input | `-5` or `abc` → explained rejection, previous result intact (FR-019) |

**Invalid-input check via API** (expect `422` with the offending parameter named):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "http://localhost:8000/api/economics/B03/override?date=2020-06-01" \
  -H "Content-Type: application/json" -d '{"electricity_price_usd_kwh": -5}'
```

---

## Scenario 4 — Decision record is visible (US4)

**Validates**: FR-020–FR-022, SC-010

The table exists and is currently **empty**, so the empty state is the first thing to verify.

```bash
curl -s "http://localhost:3000/api/agent/decisions" | python3 -m json.tool
```

**Expected initially**: `{"entries": []}` → the UI shows an explicit empty state with **no sample
row** (FR-021).

Then, through the assistant, approve a proposed record and re-check:

| Check | Expected |
|---|---|
| Approved decision | Appears with time, scope, and content |
| Dismissed proposal | Absent — never written in the first place (FR-022) |
| Ordering | Newest first |
| Read-only | No control on this surface can write, edit, or delete (SC-014) |

**Confirm the write actually landed:**

```bash
bq query --project_id=spatial-cat-489006-a4 --nouse_legacy_sql \
  'SELECT proposal_id, unit_id, written_by, written_at
   FROM `spatial-cat-489006-a4.ro_serving.decision_log`
   ORDER BY written_at DESC LIMIT 5'
```

---

## Scenario 5 — Warehouse intelligence is visible (US5)

**Validates**: FR-023–FR-026, SC-005

### 5a. Before producing the data — verify the honest failure

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8000/api/bq-forecast/B03"   # expect 503
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8000/api/docs/search?q=cleaning"  # expect 503
```

At `/cloud-data`, the surface must say the results have not been produced and name what would
produce them (FR-026) — **not** show a blank panel.

### 5b. After running the producers

```bash
curl -s "http://localhost:8000/api/bq-forecast/B03" | python3 -m json.tool | head -25
curl -s "http://localhost:8000/api/docs/search?q=when%20should%20I%20clean" | python3 -m json.tool
```

| Check | Expected |
|---|---|
| Projection | Shown with its `ndp_lower_90`/`ndp_upper_90` band (FR-024) |
| Computed-in claim | States it was computed in the warehouse |
| Every passage | Names its `source_document` (FR-025) |
| Unattributed passage | Must not render at all |

---

## Cross-cutting checks (run once, after any phase)

| Check | How | Validates |
|---|---|---|
| Placeholder marker | Stop the serving layer, reload each new screen — the "mock data" indicator must appear | FR-030 |
| Keyboard only | Tab through each new screen; every control reachable and operable | SC-012 |
| Narrow viewport | Resize to 1280 px — nothing unreachable or overlapping | SC-013 |
| No control affordances | Inspect each screen — nothing can command plant equipment | SC-014 |
| As-of correctness | Move the timeline on each screen; no figure retains a later-dated value | SC-011 |

---

## Automated suites

```bash
# Frontend
cd services/frontend && NODE_OPTIONS=--max-old-space-size=1536 npx vitest run

# Serving layer
cd "$(git rev-parse --show-toplevel)" \
  && .venv-watertap-spike/bin/python -m pytest -q services/serving-api services/source-tracing/tests

# Lint + type check
.venv-watertap-spike/bin/python -m ruff check services pipeline
cd services/frontend && NODE_OPTIONS=--max-old-space-size=1536 npm run build
```

**Stop the dev server when you are done** — leaving it running while working is the main cause of
memory pressure in this project.

---

## Definition of done

| # | Criterion | Status |
|---|---|---|
| 1 | No navigation destination shows a placeholder (SC-001) | ✅ verified in build output — `/industry`, `/simulation`, `/cloud-data` all real routes |
| 2 | All three personas reach a real answer (SC-002) | ✅ operator (`/twin`, pre-existing), engineer (`/simulation` what-if), manager (`/industry`) |
| 3 | Every figure labelled measured or modeled (SC-005) | ✅ `provenance`/`credibility` relayed unchanged from `economics.py`; tested in `test_fleet_economics.py` |
| 4 | Every assumed-constant figure labelled assumed (SC-006) | ✅ all 6 economics params returned with `provenance: "assumed"`; `AssumedValue` component |
| 5 | Unavailable capabilities state so — zero blanks/substitutions (SC-007) | ✅ `CapabilityState` is the only rendering path for non-`available` states; tested in `capability-state.test.tsx` |
| 6 | What-if is arbitrary, cancellable, never served from a prepared set (SC-004, SC-008) | ✅ `AbortController`-based cancel; server computes on demand, no scenario cache |
| 7 | Decision record matches approvals exactly (SC-010) | ✅ read-only, ordered `written_at` DESC; empty state ≠ unavailable state |
| 8 | Every screen keyboard-operable and usable at 1280 px (SC-012, SC-013) | ✅ audited T052/T053; textual equivalents added for chart-only content |
| 9 | No control can actuate plant equipment (SC-014) | ✅ grep audit across all new components: zero matches |
| 10 | Lint, both test suites, and the production build all pass | ✅ ruff clean · 115 pytest passed · 88 vitest passed · `npm run build` clean, 12 routes |

**Two real bugs found and fixed during implementation, not just exposed:**
- `fouling_anomalies_bq.sqlx` called `AI.DETECT_ANOMALIES` with a `last_n_points` argument that
  does not exist in the live function signature. Caught by `dataform run --dry-run` before it
  ever reached BigQuery; rewritten against the function's actual two-table signature.
- The electricity price was hardcoded to two different values in two places (`economics.PARAMS`
  = 0.08, `/api/env` = 0.12) — invisible until the operations-manager screen would have shown
  both in one view. Resolved by making the economics parameter the single source of truth
  (research R5).

**One deliberate scope decision, made with the user's explicit sign-off:** producing the
warehouse tables (T044) required a new BigQuery Connection and an IAM grant
(`roles/aiplatform.user`) on a shared project. This was paused for explicit approval before
proceeding, consistent with treating IAM changes as a different risk category from spend.

