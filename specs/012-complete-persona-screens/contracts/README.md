# Interface Contracts — Complete the Operator-Facing Product Surface

**Feature**: 012-complete-persona-screens · **Date**: 2026-08-28

The contracts the new surfaces consume. Most already exist and are documented here so the plan is
explicit about what is reused versus what is added. Shapes are grounded in
[data-model.md](../data-model.md); availability findings in [research.md](../research.md).

**Legend** — `EXISTS` reused unchanged · `NEW` added by this feature · `BLOCKED` endpoint exists but
its data does not yet

---

## Serving layer (`ro-serving-api`)

### `GET /api/economics/fleet?date=<iso>` — NEW

Fleet-wide economics as of one replay date. The only genuinely new serving capability in this
feature; everything else is per-unit and already exists.

**Why it is needed**: the existing economics endpoint answers for one unit. US1 needs all 21 as a
single consistent as-of snapshot; fanning out 21 client requests would be slow, would repeat the
as-of recomputation, and would not guarantee one coherent point in time (research R4).

```jsonc
// 200
{
  "date": "2020-06-01",
  "units": [
    {
      "unitId": "B03", "bankId": "B", "cycleId": 4,
      "dpRisePsi": 6.31,
      "dailyEnergyPenaltyUsd": 12.44,
      "cumEnergyPenaltyUsd": 843.10,
      "cipCostUsd": 5000.0,
      "recommendation": "CLEAN NOW",
      "breakEvenDay": 141,
      "provenance": "modeled",
      "credibility": "medium"
    }
  ],
  "assumptions": [
    { "key": "electricity_price_usd_kwh", "label": "Electricity price",
      "unit": "USD/kWh", "value": 0.08, "defaultValue": 0.08,
      "provenance": "assumed", "min": 0 }
  ],
  "unavailableUnits": ["A02"]
}
```

**Rules**

- Reuses the existing per-unit economics function and as-of cache — no new analysis (spec assumption).
- A unit that cannot be grounded goes in `unavailableUnits`; it is never emitted with zeros (FR-029).
- `provenance` and `credibility` are relayed unchanged from the economics result (FR-027).
- All six assumptions are currently `"assumed"` (research R5).

**Errors**: `503` when the underlying data is unavailable — consistent with `/api/timeline`, which
fails loudly rather than returning a plausible-looking empty result.

---

### `POST /api/physics/what-if` — EXISTS

Two on-demand solves reported as a difference. Used unchanged.

```jsonc
// request
{ "base":   { "tds_ppm": 1500, "temp_c": 23, "pressure_bar": 15,
              "recovery": 0.85, "membrane_area_m2": 50 },
  "change": { "pressure_bar": 20 } }
```

```jsonc
// 200 — solved
{ "baseline": { "available": true, "fidelity": "high",
                "clean_water_flux_kg_m2_h": 8.42,
                "clean_salt_rejection_pct": 99.21,
                "operating_point": { }, "provenance": "modeled" },
  "scenario": { },
  "change":   { "pressure_bar": 20 },
  "delta":    { "flux_kg_m2_h": 2.15, "rejection_pct": 0.18 } }
```

**Three outcomes the surface MUST distinguish** (research R2):

| Outcome | Discriminator | Required rendering |
|---|---|---|
| Solved | `fidelity: "high"` on both | Figures + delta, labelled modeled, operating point shown (FR-012) |
| No feasible solution | `solve_failed` + `hint` | **Render the `hint`** — it is actionable guidance, not a fault |
| Unavailable | `available: false` + `reason` | State unavailable and why (FR-011) |

`delta` is `null` unless **both** solves are high-fidelity. **A null delta must never render as
`0`** (FR-029).

**Errors**: `422` on an unknown parameter, a non-numeric value, or an empty `change`.

**Client obligations** (FR-014): issue with an `AbortSignal`; show in-progress state; allow
abandonment; never render a partial result. Enforce the envelope as input bounds so most rejections
never reach the solver — the server check stays authoritative.

---

### `POST /api/economics/{unitId}/override?date=<iso>` — EXISTS

Recompute economics under changed assumptions. Validated already; currently called by nothing.

```jsonc
// request — any subset of the six parameters
{ "electricity_price_usd_kwh": 0.25 }
```

```jsonc
// 200
{ "current": { "recommendation": "CLEAN NOW",
               "recommendation_flipped": true,
               "params": { } },
  "history": [ ] }
```

`recommendation_flipped` directly satisfies FR-017 — the reversal is reported by the server, so the
surface states it rather than inferring it.

**Errors**: `422` with a message naming the offending parameter for an unknown key, a non-numeric
value, or a negative/non-finite value. On `422` the previous result stays displayed (FR-019).

---

### `GET /api/bq-forecast/{unitId}` — EXISTS · BLOCKED

Warehouse-computed projection. Correct and complete; its tables do not exist yet (research R1).

```jsonc
// 200
{ "unitId": "B03", "method": "AI.FORECAST (TimesFM)", "computedIn": "bigquery",
  "horizon": [ { "forecast_date": "2021-01-14", "ndp_forecast": 12.4,
                 "ndp_lower_90": 11.1, "ndp_upper_90": 13.8,
                 "provenance": "modeled" } ],
  "anomalies": [ ] }
```

**Errors**: `404` unknown unit · `503` when the warehouse tables are absent — the **current** state.
The surface renders `503` as "not yet produced" and names what would produce it (FR-026).

---

### `GET /api/docs/search?q=<text>&top_k=<n>` — EXISTS · BLOCKED

Retrieval over the plant-knowledge corpus.

```jsonc
// 200
{ "query": "when should I clean", "computedIn": "bigquery", "method": "VECTOR_SEARCH",
  "results": [ { "source_document": "Clean-Now-or-Wait Decision Guide",
                 "section": "Warning thresholds", "category": "procedure",
                 "chunk_text": "…", "distance": 0.14 } ] }
```

**Rule**: a result without `source_document` MUST NOT be displayed (FR-025).

**Errors**: `422` when `q` is shorter than 3 characters · `503` when the corpus is absent — the
**current** state.

---

## Application layer (Next.js route handlers)

### `GET /api/agent/decisions` — NEW

Reads the approved-decision record. Placed in the application layer, not the serving layer,
deliberately: the **write** path already lives here (`lib/agent/decisions.ts`), so read and write
share one credential path and one table constant. Splitting them would put a governance-critical
table behind two different identities.

```jsonc
// 200
{ "entries": [
    { "proposalId": "prop-1724800000",
      "recordType": "decision",
      "unitId": "B03",
      "content": { },
      "writtenAt": "2026-08-28T09:14:22.000Z",
      "writtenBy": "operator_approved_via_hitl_chip" } ] }
```

**Rules**

- **Read-only.** No write, update, or delete on this route (FR-032).
- Ordered by `writtenAt` descending.
- `{ "entries": [] }` is a valid, expected response → explicit empty state, never a sample row
  (FR-021). Zero rows is the current live state.
- Dismissed proposals were never written, so their absence needs no filtering (FR-022).
- `writtenBy` records **how** the write was authorised, not who the operator was — it is not a
  personal identifier and must not be presented as one.

**Errors**: `503` when the record store is unreachable — stated explicitly, never an empty list,
which would be indistinguishable from "no decisions yet" and would misrepresent the audit trail.

---

## Data-production prerequisites (US5 only)

Not request/response contracts — the commands that must run before the US5 endpoints return
anything but `503`.

| Produces | Command | Consumed by |
|---|---|---|
| `ro_forecasts.fouling_forecast_bq`, `fouling_anomalies_bq` | Dataform run, `bqml` tag | `/api/bq-forecast/{unitId}` |
| `ro_embeddings.doc_embeddings` | `pipeline/ingest/embed_docs.py` | `/api/docs/search` |

Both producers exist and are correct; neither has ever been run (research R1). US5's plan sequences
these before its UI work. US1–US4 have no such prerequisite.

---

## Contract summary

| Contract | Status | Story |
|---|---|---|
| `GET /api/economics/fleet` | **NEW** | US1 |
| `POST /api/physics/what-if` | EXISTS | US2 |
| `POST /api/economics/{unit}/override` | EXISTS | US3 |
| `GET /api/agent/decisions` | **NEW** | US4 |
| `GET /api/bq-forecast/{unit}` | EXISTS · BLOCKED | US5 |
| `GET /api/docs/search` | EXISTS · BLOCKED | US5 |

Two new endpoints; four reused. Consistent with the spec's framing that this feature is an exposure
layer, not new analysis.
