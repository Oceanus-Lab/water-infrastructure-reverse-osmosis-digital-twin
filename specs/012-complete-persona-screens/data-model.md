# Data Model — Complete the Operator-Facing Product Surface

**Feature**: 012-complete-persona-screens · **Date**: 2026-08-28

This feature introduces **no new stored data**. Every entity below is either a read-shape assembled
from values the twin already computes, or an existing stored table this feature reads for the first
time. That is the point of the feature — exposure, not invention — so the model's job is to pin down
the shapes crossing the serving boundary and the rules that keep them honest.

Derived from the spec's Key Entities; field-level detail is grounded in
[research.md](research.md).

---

## 1. FleetEconomicsSnapshot *(new read-shape, US1)*

Fleet-wide economics as of one point on the replay timeline. Assembled server-side from the existing
per-unit economics function; no new computation.

| Field | Type | Notes |
|---|---|---|
| `date` | date | The as-of point. Every figure reflects only evidence up to it (FR-031) |
| `units` | UnitEconomicsRow[] | One row per unit that can be grounded at `date` |
| `assumptions` | CostAssumption[] | The parameter set in force (FR-018) |
| `unavailableUnits` | string[] | Units with no groundable economics — surfaced, never zero-filled (FR-029) |

### UnitEconomicsRow

| Field | Type | Notes |
|---|---|---|
| `unitId`, `bankId`, `cycleId` | string / string / int | Identity |
| `dpRisePsi` | number | Fouling state driving the cost |
| `dailyEnergyPenaltyUsd` | number | Ranking key for "avoidable cost" (FR-005) |
| `cumEnergyPenaltyUsd` | number | Trend series input (FR-004) |
| `cipCostUsd` | number | Cleaning workload cost (FR-006) |
| `recommendation` | `"CLEAN NOW"` \| `"WAIT"` | Cleaning workload count (FR-006) |
| `breakEvenDay` | int \| null | Null is a valid, displayable state |
| `provenance` | `"measured"` \| `"modeled"` | Drives FR-027 labelling |
| `credibility` | `"high"` \| `"medium"` | Relayed, never upgraded |

**Validation rules**

- A unit that cannot be grounded appears in `unavailableUnits`, never in `units` with zeros.
- `provenance` is relayed from the economics result unchanged — never inferred at the display layer.
- Any figure computed from an assumed parameter is labelled assumed (FR-028); see §3.

---

## 2. WhatIfComparison *(new read-shape, US2)*

One on-demand pair of physics solves. Computed for the conditions actually requested — never served
from a prepared set (FR-013).

| Field | Type | Notes |
|---|---|---|
| `baseline` | SolveResult | The as-is case |
| `scenario` | SolveResult | The changed case |
| `change` | OperatingPoint (partial) | Only the conditions the user altered |
| `delta` | SolveDelta \| null | **Null unless both solves reached high fidelity** |

### OperatingPoint — the supported envelope

| Condition | Range | Enforced |
|---|---|---|
| `tdsPpm` | 200 – 10,000 | UI bounds + server check |
| `tempC` | 5 – 45 | UI bounds + server check |
| `pressureBar` | 5 – 60 | UI bounds + server check |
| `recovery` | 0.30 – 0.95 | UI bounds + server check |
| `membraneAreaM2` | > 0 | Server check |

### SolveResult — three distinguishable outcomes

| Outcome | Discriminator | Surface behaviour |
|---|---|---|
| Solved | `fidelity: "high"` | Show figures, labelled modeled, with the operating point (FR-012) |
| No feasible solution | `solveFailed` present, `hint` present | **Show the hint** — actionable, not an error (research R2) |
| Capability unavailable | `available: false`, `reason` present | State unavailable and why (FR-011) |

**Validation rules**

- `delta` is null whenever either solve is not high-fidelity. A null delta MUST render as an explicit
  non-answer, never as `0` (FR-029).
- An out-of-range condition is rejected with its limit stated; no value is extrapolated (FR-010).
- Every returned result MUST correspond to the requested conditions — no nearest-match substitution
  (FR-013).

---

## 3. CostAssumption *(new read-shape, US3)*

An editable input the economics rest on. Provenance travels with it so any derived figure can be
labelled correctly.

| Field | Type | Notes |
|---|---|---|
| `key` | string | One of the six economics parameters |
| `label`, `unit` | string | For display |
| `value` | number | Currently in force |
| `defaultValue` | number | For reset and for showing divergence |
| `provenance` | `"sourced"` \| `"assumed"` | **All six are currently `assumed`** (research R5) |
| `min` | number | Lower bound for validation |

**The six parameters**: `electricity_price_usd_kwh`, `pump_efficiency`, `recovery_setpoint`,
`permeate_flow_m3_day`, `cip_cost_usd`, `cip_downtime_lost_usd`.

**Validation rules**

- A value must be finite and ≥ 0; a rejected value leaves the previous result displayed (FR-019).
- Overrides are per-request and never persisted — the stored defaults are unchanged by viewing.
- **Single source of truth for electricity price**: the economics parameter is authoritative. The
  divergent `/api/env` value (0.12 against the parameter's 0.08) MUST NOT be displayed as a price
  alongside economics figures (research R5).

---

## 4. DecisionRecordEntry *(existing stored table, US4 — first read)*

Read directly from `ro_serving.decision_log`. **Schema verified live; no migration required.**

| Stored column | Type | Exposed as | Notes |
|---|---|---|---|
| `proposal_id` | STRING | `proposalId` | Identity |
| `record_type` | STRING | `recordType` | What kind of decision |
| `unit_id` | STRING \| null | `unitId` | Null = fleet-scoped |
| `content` | JSON | `content` | The approved payload |
| `written_at` | TIMESTAMP | `writtenAt` | Ordering key, newest first |
| `written_by` | STRING | `writtenBy` | The authorisation basis, not a personal identity |

**Validation rules**

- The table is append-only and **write-gated by human approval**. This feature adds a read path only;
  it introduces no write and no delete (FR-032).
- Zero rows is the expected initial state → explicit empty state, never a sample row (FR-021).
- Dismissed proposals were never written, so absence is automatic rather than filtered (FR-022).

---

## 5. WarehouseProjection & DocumentPassage *(new read-shapes, US5)*

> **Precondition**: the three backing tables do not currently exist (research R1). They must be
> produced before these shapes carry data. Until then the surface reports "not yet produced"
> (FR-026) rather than rendering anything.

### WarehouseProjection — from `ro_forecasts.fouling_forecast_bq`

| Field | Type | Notes |
|---|---|---|
| `unitId` | string | |
| `forecastDate` | date | |
| `ndpForecast` | number | Median projection |
| `ndpLower90`, `ndpUpper90` | number | Uncertainty band — required by FR-024 |
| `method` | string | `"AI.FORECAST (TimesFM)"` |
| `computedIn` | string | `"bigquery"` — the claim FR-024 requires stating |
| `provenance` | `"measured"` \| `"modeled"` | |

### DocumentPassage — from `ro_embeddings.doc_embeddings`

| Field | Type | Notes |
|---|---|---|
| `sourceDocument` | string | **Required** — FR-025; proves it is a project document |
| `section`, `category` | string | Context |
| `chunkText` | string | The passage |
| `distance` | number | Similarity; lower is closer |

**Validation rules**

- A passage without `sourceDocument` MUST NOT be displayed — unattributed text is exactly the
  failure FR-025 prevents.
- A projection MUST always be shown with its band; the median alone is not displayable (FR-024).

---

## 6. CapabilityAvailability *(cross-cutting)*

The state that decides whether any surface shows a figure or an explicit non-answer.

| State | Meaning | Rendering |
|---|---|---|
| `available` | Capability answered | Show the figure with its labels |
| `unavailable` | Capability could not answer | State it and why (FR-029) |
| `not_produced` | Results have never been generated | State it; name what would produce them (FR-026) |
| `placeholder` | Data service unreachable; placeholder values shown | Global indicator stays visible (FR-030) |

**Validation rule (applies to every entity above)**: no state other than `available` may render a
zero, a blank, or a substituted value in place of a real figure.

---

## Relationships

```
replay date ──┬─► FleetEconomicsSnapshot ──► UnitEconomicsRow ──► CostAssumption
              │                                    │
              │                                    └─► provenance / credibility (relayed)
              ├─► WarehouseProjection
              └─► (what-if is date-independent — a clean-membrane solve at stated conditions)

DecisionRecordEntry  ── independent of the replay clock; ordered by written_at
DocumentPassage      ── independent of the replay clock; retrieved per query
CapabilityAvailability ── wraps every one of the above
```

**Note**: the what-if and the document search are deliberately *not* bound to the replay clock. A
clean-membrane solve is a property of the stated operating conditions, and a document passage is a
property of the corpus. Binding either to the timeline would imply a time-dependence that does not
exist.
