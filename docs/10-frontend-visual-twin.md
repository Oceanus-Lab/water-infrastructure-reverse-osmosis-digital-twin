# Frontend & Visual Twin Spec
**Brief for:** the 2.5D isometric digital-twin UI — equipment components, hover-card data contracts, the visualization catalog, and the BigQuery→frontend path
**Feeds into:** GenAI image generation (equipment sprites), Next.js frontend build, serving API ([05](05-gcp-infrastructure.md)), implementation plan ([07](07-implementation-plan.md))
**Design references:** isometric scene + status badges + expandable chart cards (industrial-twin pattern); clickable objects open the agent

---

## Interaction Model

An **isometric 2.5D scene** of the plant laid out along the process flow. Three interactions:

1. **Status badge** on each key object — a number + color (e.g. fouling score), like map markers. Bank F pulses amber as its cycle degrades.
2. **Hover → info card** — live KPIs for that object (the data contracts below).
3. **Click → opens the agent**, pre-scoped to that object ("clean Bank F now or wait?").

Below the scene: a row of **expandable chart cards** (the visualization catalog) that slide up to full charts — driven by the same BigQuery serving views.

**Replay-aware:** the scene and cards animate off the replay clock ([08](08-validation-live-replay.md)); "now" = the current sim-date.

---

## Part 1 — Equipment Components

Ordered by process flow. **Tier 1** is built for the Bank F vertical slice + hero; **Tier 2** is set-dressing added once the slice works.

### Tier 1 — Core

| # | Component | What it is | Hover-card data | Source | Pain |
|---|---|---|---|---|---|
| 1 | **RO membrane bank (3 stages)** | The pressure-vessel racks; Bank F = stages 1/2/3 | Fouling score, `stage_3_flux` vs clean baseline, recovery (85% setpoint), `dss`, **"Clean now or wait?"** CTA | `fouling_scores`, `stage_3_flux`, `unit_recovery`, `dss` | P1 |
| 2 | **High-pressure feed pump** | Drives the membranes | `total_kw` vs clean baseline (**+9%**), SEC, $/day energy | `total_kw` (F–G), cost model | P2 |
| 3 | **CIP skid** | Clean-in-place system + chem tank | Last CIP date, recommended next clean, CIP cost + ~4h downtime | `cip` events, cost model | P3 |
| 4 | **Energy Recovery Device (ERD)** | Recovers brine pressure (F–G only) | `erd_k_w`, boost pressure, recovery efficiency | `erd_k_w`, `erd_boost_pressure` | P2 |

### Tier 2 — Context

| # | Component | What it is | Hover-card data | Source | Pain |
|---|---|---|---|---|---|
| 5 | **Antiscalant dosing skid** | Chemical injection pre-membrane | Dose rate, **modeled** scaling index (LSI) | feed chemistry (`ec`,`ph`,`temp_c`) — *modeled* | P5 |
| 6 | **Media / cartridge filters** | Pretreatment vessels | Feed turbidity in/out, pretreatment health | `turb` | upstream fouling |
| 7 | **Permeate (product) tank** | Treated-water storage | Production rate, 30/90-day forecast, TOC/EC removal % | flow, `percent_*_removal`, `AI.FORECAST` | quality |
| 8 | **Concentrate / brine outfall** | Reject stream to disposal | Recovery %, brine TDS, scaling-risk trade-off | `unit_recovery`, modeled LSI | P4 |

---

## Part 2 — Visualization Catalog

Tiered by how easily the data flows **BigQuery → serving API → frontend**.

### Tier 1 — Direct from data (build first)

| Visualization | Chart | Source columns | Persona · pain |
|---|---|---|---|
| **Fleet fouling grid** | Heatmap (7×3) | `fouling_scores` | Operator · P1 — *signature view* |
| **Stage-3 flux vs clean baseline** | Line + CIP markers + alert band | `stage_3_flux`, `dss`, `cip` | Engineer · P1 — proof chart |
| **Water-quality removal** | Dual gauge / bar | `percent_ec_removal`, `percent_toc_removal`, `turb` | Manager · P6 |
| **Maintenance / CIP timeline** | Timeline (Gantt) | `cip`, `dss` | Operator · P3 |
| **Active alerts feed** | List + severity | alerts table | Operator · all |
| **Per-stage flux balance** | Grouped bar | `stage_{1,2,3}_flux` | Engineer · redistribution |

### Tier 2 — Native BigQuery AI (in-SQL, no model management)

| Visualization | Chart | Behind it | Persona · pain |
|---|---|---|---|
| **Production forecast** | Line + confidence band | `AI.FORECAST` (TimesFM) | Manager · capacity |
| **Anomaly timeline** | Scatter/strip | `AI.DETECT_ANOMALIES` | Operator · P1 |
| **Energy / SEC trend** | Area | `total_kw`→SEC (F–G measured) | Manager · P2 |

### Tier 3 — Modeled (WaterTAP-Δ or cost model — **label measured vs modeled**)

| Visualization | Chart | Behind it | Persona · pain |
|---|---|---|---|
| **Energy gap vs clean baseline** | Area, shaded **+9% gap** | actual − WaterTAP clean baseline | Manager · P2 — hero evidence |
| **Clean-now-or-wait break-even** | Crossover / waterfall | cumulative energy penalty $ vs CIP cost | *hero viz* · P1+P2 |
| **LCOW cost breakdown** | Stacked bar / donut | parametric cost model | Manager · economics |
| **Recovery vs scaling risk** | Scatter / gauge | `unit_recovery` vs modeled LSI | Engineer · P4 |

---

## Part 3 — Data → Visual Contract

Severity color is **one rule everywhere** (scene badges, grid cells, alerts), driven by the fouling score (0–100, Δ vs clean baseline normalized):

| State | Color | Rule (tunable) | Meaning |
|---|---|---|---|
| Healthy | 🟢 green | score < 33 | near clean baseline |
| Degrading | 🟡 amber | 33 ≤ score < 66 | fouling onset detected |
| Action | 🔴 red | score ≥ 66 | clean-now candidate |

Badge value = fouling score (or stage-3 flux % below baseline). This closes the review's "data→visual contract" blindspot.

---

## Part 4 — Nav Sections (4 tabs)

| Tab | Persona | Holds |
|---|---|---|
| **Digital Twin** | Operator | The isometric scene + badges + alerts feed |
| **Physical Simulation** | Engineer | WaterTAP what-if; stage-3 flux-vs-baseline; per-stage balance |
| **Industry Engine** | Manager | Forecast, LCOW, energy, break-even, water quality |
| **Cloud Data** | all | Raw/curated table explorer; replay-clock control |

---

## Part 5 — GenAI Image Generation (equipment sprites)

Generate **8 isometric sprites** (Tier 1 first: items 1–4). Consistency rules so they compose into one scene:

- **Angle:** true isometric (~30°, 2:1), identical for every sprite.
- **Style:** industrial water-treatment equipment, steel / FRP, clean technical render, soft studio lighting.
- **Palette:** neutral greys/blues so the **status color overlays read clearly** on top.
- **Output:** transparent-background PNG, consistent scale and shadow direction.
- **Sprite list:** RO membrane rack (3-stage), HP feed pump, CIP skid, ERD, antiscalant dosing skid, media/cartridge filter vessels, permeate tank, brine outfall.

The four Tier-1 sprites are enough to shoot the hero demo.

---

## Lean Prototype Scope

- **Components:** Tier 1 only (RO bank, HP pump, CIP skid, ERD).
- **Charts:** three cards — **Fleet fouling grid** (wow) · **Stage-3 flux vs baseline** (proof) · **Clean-now-or-wait break-even** (decision).
- Everything else (Tier 2 components, Tier 2/3 charts) is breadth added after the Bank F slice works end-to-end.
