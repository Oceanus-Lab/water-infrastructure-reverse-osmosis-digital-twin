# Implementation Plan: Complete the Operator-Facing Product Surface

**Branch**: `012-complete-persona-screens` | **Date**: 2026-08-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-complete-persona-screens/spec.md`

## Summary

Make every capability the twin already computes reachable by the persona who needs it. Two of four
navigation destinations are "Under Construction" placeholders, the simulation destination offers no
simulation, and four working backend capabilities (physics what-if, cost overrides, decision record,
warehouse intelligence) have no user-facing consumer.

**Approach**: an exposure layer, not new analysis. Phase 0 verified the spec's central assumption
against the live project — it holds for four of five stories. Two new endpoints are required
(fleet economics aggregate, decision-record read); four existing endpoints are reused unchanged. One
story (US5) additionally requires a data-production step, because the three tables it reads do not
exist yet.

## Technical Context

**Language/Version**: TypeScript 5 / React 19 (frontend); Python 3.11 (serving layer)

**Primary Dependencies**: Next.js 16 App Router, Recharts, Zustand, shadcn/ui (frontend);
FastAPI, pandas (serving layer); `@google-cloud/bigquery` (decision-record read)

**Storage**: BigQuery `ro_serving.decision_log` (read-only, existing); source-tracing CSV outputs
via the existing serving layer. No new stored data.

**Testing**: Vitest + Testing Library (frontend); pytest (serving layer). Existing CI runs both.

**Target Platform**: Web, evergreen browsers; services on Cloud Run

**Project Type**: Web application — existing frontend + serving-layer split

**Performance Goals**: Screen interactive < 2 s against a running data service. An on-demand
what-if solve is expected in the seconds range and is therefore explicitly asynchronous with
progress and cancel (FR-014), not held to a fixed latency budget.

**Constraints**: No new figure types; every value already computed upstream. No new design system.
Advise-only — no control affordances. Every figure as-of the replay clock (FR-031).

**Scale/Scope**: 21 units · 4 navigation destinations (2 built from scratch, 1 substantially
extended, 1 existing) · 2 new endpoints · 5 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against constitution v1.0.0.

| Principle | Gate | Initial | Post-design | Evidence |
|---|---|---|---|---|
| **I — BigQuery-as-AI-Compute** | Strong default | ✅ | ✅ | No new ML. US5 *increases* compliance by giving the in-SQL `AI.FORECAST` / `VECTOR_SEARCH` path its first consumer |
| **II — Evidence over assertion** | **HARD GATE** | ✅ | ✅ | FR-027/028/029; no figure rendered without its labels; null delta and unavailable states render as explicit non-answers, never `0` |
| **II — No unvalidated claims** | **HARD GATE** | ✅ | ✅ | Feature surfaces existing validated results only; publishes no new accuracy claim |
| **III — Advise-only, never actuate** | **HARD GATE** | ✅ | ✅ | FR-032; decision-record route is read-only; no new write path |
| **IV — Measured vs. modeled** | Strong default | ✅ | ✅ | `provenance`/`credibility` relayed unchanged; FR-007 delta-first; research R5 resolves a real price inconsistency rather than hiding it |
| **V — Physics-grounded fidelity** | Strong default | ✅ | ✅ | Arbitrary what-if solves for requested conditions; envelope enforced; infeasible-combination hint surfaced rather than flattened into "error" |
| **VI — Honest twin maturity** | Strong default | ✅ | ✅ | FR-031 as-of correctness; FR-030 placeholder marker inherited; FR-026 states plainly when warehouse results were never produced |
| **VII — Test-first** | Strong default | ✅ | ✅ | Each phase writes failing tests first; existing CI gates both suites |
| **Security — no secrets in source** | **HARD GATE** | ✅ | ✅ | No new credentials; decision read reuses the existing write path's identity |

**Result**: PASS at both gates. No violations; Complexity Tracking is empty.

**Note on Principle I**: this feature is one of the few that strengthens the architecture's central
bet rather than merely respecting it — the in-SQL forecasting and retrieval have been
computed-but-unconsumed, and US5 makes them visible.

## Project Structure

### Documentation (this feature)

```text
specs/012-complete-persona-screens/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── README.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
services/frontend/
├── app/
│   ├── industry/page.tsx            # REPLACE stub — operations-manager surface (US1)
│   ├── simulation/page.tsx          # EXTEND — add what-if alongside validation (US2)
│   ├── cloud-data/page.tsx          # REPLACE stub — warehouse intelligence (US5)
│   └── api/agent/decisions/route.ts # NEW — decision-record read (US4)
├── components/
│   ├── industry/                    # NEW — cost trend, ranking, cleaning workload
│   ├── simulation/                  # EXTEND — what-if form, delta result, outcome states
│   ├── economics/                   # NEW — assumption controls (US3)
│   ├── decisions/                   # NEW — decision record list + empty state (US4)
│   └── warehouse/                   # NEW — projection + document retrieval (US5)
├── lib/
│   ├── api/index.ts                 # EXTEND — fleet economics, what-if, decisions
│   └── agent/decisions.ts           # EXTEND — add read alongside existing write
└── __tests__/                       # Vitest specs per story

services/serving-api/
├── main.py                          # EXTEND — GET /api/economics/fleet (US1)
└── test_*.py                        # pytest specs

pipeline/                            # US5 prerequisite — run existing producers
├── dataform/definitions/forecasts/  # existing, tagged bqml, never run
└── ingest/embed_docs.py             # existing, never run
```

**Structure Decision**: the existing web-application split is used unchanged — `services/frontend`
for surfaces, `services/serving-api` for the read layer, with the decision-record read placed in the
frontend's route handlers to sit alongside its existing write path (see contracts). No new service
and no new top-level directory is introduced; this feature adds screens over existing capabilities.

## Implementation Phases

Ordered by the spec's priorities. Each phase is independently shippable and independently
demonstrable — stopping after any phase leaves the product strictly better than before.

| Phase | Story | Priority | Delivers | Prerequisite |
|---|---|---|---|---|
| 1 | US1 | P1 | Operations-manager surface; `/industry` stub replaced | `GET /api/economics/fleet` |
| 2 | US2 | P1 | Arbitrary what-if with progress/cancel; simulation destination made true to its label | None — endpoint exists |
| 3 | US3 | P2 | Cost assumptions editable; recommendation reversal surfaced | None — endpoint exists |
| 4 | US4 | P2 | Decision record readable; audit trail visible | `GET /api/agent/decisions` |
| 5a | US5 | P3 | **Data production** — run the two existing producers | Neither has ever been run |
| 5b | US5 | P3 | Warehouse-intelligence surface; `/cloud-data` stub replaced | 5a complete |

**Sequencing rationale**: Phases 1–2 remove the two most visible product gaps and need no data
production. Phase 5a is called out as its own phase precisely because it is the finding that would
otherwise derail US5 mid-implementation — the UI cannot be built against tables that do not exist.

## Key Design Decisions

Full reasoning in [research.md](research.md); the decisions that shape implementation:

1. **One new aggregate endpoint, not 21 client calls** (R4) — a fleet screen needs a single coherent
   as-of snapshot; fanning out would be slow and would not guarantee one point in time.
2. **Three what-if outcomes, not two** (R2) — "no feasible solution at this combination" is not an
   error. The capability returns an actionable hint for it; the surface must show that hint rather
   than flatten it into a generic failure and make a working engine look broken.
3. **Cancellation via `AbortSignal`, no streaming** (R3) — a what-if returns one result, not a
   sequence; the solver exposes no intermediate state, so there would be nothing truthful to stream.
4. **Envelope bounds in the UI *and* on the server** — immediate feedback without a multi-second
   round trip, with the server remaining authoritative.
5. **Decision read lives beside the decision write** — one credential path and one table constant for
   a governance-critical table.
6. **Electricity price has one source of truth** (R5) — the economics parameter is authoritative and
   labelled assumed; the divergent `/api/env` value is not displayed alongside economics figures and
   is recorded as a defect for the separate data-sourcing work.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| US5's three tables do not exist | Would block US5 mid-build | Phase 5a produces them first; FR-026 covers the interim honestly |
| Arbitrary what-if takes seconds | Perceived unresponsiveness | FR-014 progress + cancel; UI bounds avoid pointless round trips |
| Two contradictory electricity prices | Visibly wrong figures on one screen | R5 — single source of truth, labelled assumed |
| Warehouse producers cost money to run | Budget | Both one-off and small; project has a $50 budget alert |
| Nothing currently deployed | Cannot demo externally | Out of scope per spec; feature completes against a running local data service |

## Complexity Tracking

> No constitutional violations. Table intentionally empty.
