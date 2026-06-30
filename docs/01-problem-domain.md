# Problem Domain — RO Water Treatment
**Brief for:** Domain context, use case scoping, agent Q&A design  
**Feeds into:** Agent tool design, BigQuery schema (what KPIs to store), UI features

---

## Pain Point Analysis — Ranked by Impact × Frequency

> Source basis: DOE/NAWI benchmarks, EPA water utility reports, OCWD dataset, DesalData/GWI OPEX benchmarks, WaterTAP costing module docs.

### 🔴 P1 — Membrane Fouling (Most Painful, Most Recurring)

Biological, organic, inorganic, and colloidal fouling reduces permeate flux and forces premature CIP (Clean-In-Place) events or membrane replacement.

| Metric | Benchmark |
|---|---|
| Energy increase from fouling | +20–40% SEC |
| Cost per CIP event | $2,000–8,000 (chemicals + downtime) |
| CIP frequency | Every 1–6 months per train |
| Membrane replacement cost | $200–800/element; 77–150 elements/stage |
| Irreversible flux loss | 10–30% permanent per membrane life |

**What operators do today:** Scheduled CIP regardless of actual state; reactive replacement.  
**Digital twin solves:** Predict fouling onset from data trends → alert before urgency → reduce unnecessary CIPs 30–50%.

---

### 🔴 P2 — Energy Cost Optimization (Largest OPEX Item)

Energy is 30–50% of total RO OPEX. SEC is highly sensitive to feed pressure, recovery rate, and membrane condition.

| System | SEC Benchmark |
|---|---|
| BWRO (brackish) | 0.5–1.5 kWh/m³ |
| SWRO (seawater) | 2.5–4.0 kWh/m³ |
| Fouled membrane penalty | +15–40% above baseline |

**Digital twin solves:** WaterTAP optimization → recommend real-time pressure/recovery adjustments → 5–15% SEC reduction.

---

### 🟠 P3 — Unplanned Downtime & Production Loss

Unexpected membrane failures, scaling events, or integrity breaches halt production.

| Metric | Benchmark |
|---|---|
| Downtime cost (industrial) | $5,000–50,000/day |
| Common causes | CaCO₃/BaSO₄/SiO₂ scaling, integrity breach, pump failure |

**Digital twin solves:** Physics-deviation alerts (WaterTAP baseline vs. actual BQ data) → 3–7 days advance warning.

---

### 🟠 P4 — Recovery Rate & Water Loss

Low recovery = more feed consumed per m³ product + higher brine disposal costs. High recovery = higher scaling risk. Trade-off managed by rule-of-thumb today.

**Digital twin solves:** Dynamic recovery optimization balancing yield, scaling risk, and energy cost simultaneously.

---

### 🟡 P5 — Chemical Dosing Waste

Antiscalant, coagulant, acid — over-dosed by 10–20% for safety margin.

**Digital twin solves:** Feed quality monitoring + WaterTAP saturation index → precise dosing recommendations.

---

### 🟡 P6 — Compliance & Water Quality Risk

Permeate must meet TDS, hardness, microbial standards. Breaches trigger regulatory action.

**Digital twin solves:** Continuous permeate quality forecasting → early drift alert before non-compliance.

---

## Economics & Financial Intelligence

**Decision:** Economics is a **first-class layer** of the platform, not an afterthought.

### Financial KPIs — Parameterizable by Facility Type

| KPI | Unit | Source |
|---|---|---|
| Cost of water production (LCOW) | $/m³ | WaterTAP costing module |
| Specific Energy Consumption (SEC) | kWh/m³ | WaterTAP + operational data |
| Energy cost | $/day, $/month | SEC × electricity tariff (EIA API) |
| Chemical cost | $/m³ product | CIP events + antiscalant dosing |
| Membrane replacement CAPEX forecast | $/year | Fouling model + replacement curve |
| Production volume | m³/day | Operational data |
| Production capacity utilization | % | Actual vs. rated capacity |
| Revenue / cost-recovery forecast | $/month | Config param per facility type |
| Operational margin | % or $/m³ | Revenue − OPEX |
| Recovery rate efficiency | % | Feed / permeate ratio |
| Downtime cost | $/day | Outage × production rate |
| Yield loss | m³/day | Brine + CIP waste vs. production |
| Carbon intensity | kg CO₂/m³ | SEC × grid emission factor (derived from EIA generation mix) |

### Cost Model & Assumptions (Parametric)

**The dataset has no cost ledger** — no OPEX, chemical, labor, or tariff figures, and energy only on banks F–G. We close this gap the way techno-economic modeling is *designed* to: make costs a small set of **transparent, editable assumptions** rather than inventing data. Every $ figure the platform produces is derived from these declared parameters + WaterTAP's validated cost correlations.

| Parameter | Default | Basis | Overridable |
|---|---|---|---|
| Power tariff | $0.12 /kWh | EIA state average (CA) | ✅ per facility / in conversation |
| CIP cost | $3,500 /event | Chemicals + labor (NAWI/literature) | ✅ |
| Downtime cost | $2,000 /hr | Lost production × water value | ✅ |
| Membrane element cost | $600 /element | Manufacturer list (BWRO) | ✅ |
| Labor rate | $75 /hr | Loaded operator rate | ✅ |
| Discount rate | 8 % | Standard utility WACC | ✅ |

- **Anchor:** WaterTAP costing module supplies the CAPEX/OPEX/LCOW/SEC *structure* (DOE/NAWI-validated correlations) — the cost framework is industry-standard even where plant inputs are assumed.
- **Energy bridge:** WaterTAP SEC calibrated on measured F–G energy → imputed for A–E, so energy→cost is available fleet-wide.
- **Stored in Memory Bank** so per-facility overrides persist across sessions.

### Delta Economics Principle

**Lead with deltas and trade-offs, not absolute LCOW.** Absolute $/m³ carries ±20% uncertainty from the assumptions above — but the *relative* answers are robust because the assumptions stay constant and cancel out:

- ✅ "Unit A costs **14% more** to run than 6 months ago" — holds regardless of tariff
- ✅ "Cleaning now **saves $X** vs waiting two weeks" — a trade-off, not an absolute
- ✅ "Bank F is the **most expensive** of your 21 units" — a ranking
- ⚠️ "LCOW is exactly $0.43/m³" — quote with its assumptions, never bare

Decisions are about deltas — and deltas are exactly what this data supports well.

### Revenue Model — Config Parameter per Facility Type

| Facility Type | Revenue Model |
|---|---|
| Municipal utility | $/m³ regulated tariff (config parameter; AWWA benchmarks if available) |
| Industrial (food & bev, pharma) | Water cost as % of product COGS |
| Water reuse / reclamation | Avoided freshwater cost + ESG credit value |

### Economic Use Cases (Agent Should Answer These)

1. **Production Forecasting** — 30/90/180-day output based on membrane degradation + seasonal feed quality
2. **LCOW Trend** — Cost-per-m³ over time; detect cost creep from SEC or CIP frequency increase
3. **Maintenance ROI Calculator** — "CIP now ($4h downtime) vs. run 2 more weeks at degraded flux?" with $ figures
4. **Energy Price Integration** — Time-of-use tariffs → recommend shifting high-load runs to off-peak
5. **CapEx Planning** — Membrane replacement schedule + cost forecast for annual budgeting
6. **Capacity vs. Demand Gap** — Forecasted demand vs. production capacity given current membrane health
7. **Brine Disposal Optimization** — Recovery rate vs. scaling risk with full cost visibility
8. **Carbon & ESG Reporting** — SEC × grid carbon factor → CO₂/m³ metric

---

## Personas & UI Mapping

| Persona | Primary Screen | Key Question |
|---|---|---|
| Plant Operator | Digital Twin (2.5D) + Alerts | "What unit is degrading right now, what do I do?" |
| Process Engineer | Physical Simulation | "Run WaterTAP what-if, compare bank A vs G fouling" |
| Operations Manager | Industry Engine (Analytics + Financial) | "LCOW trend, production forecast, maintenance budget?" |

All three share the same BigQuery layer. The ADK agent can answer any question regardless of active screen.

---

## Demo Narrative — The Hero Moment

_One rehearsed, end-to-end beat that exercises the whole thesis in ~15 seconds (plan-review C2). Built on the **Bank F** vertical slice ([07-implementation-plan.md](07-implementation-plan.md)). Numbers below are illustrative placeholders — the real figures are computed live and must carry their measured-vs-modeled labels._

**Setup (on screen):** the 2.5D twin is running in **replay mode** — sim-clock visible (e.g. "Replay — historical OCWD, 2020-08-30"), Bank F's tile pulsing amber as its fouling score climbs across the current clean→CIP cycle.

**The exchange (the hero):**
> **Operator:** "Should we clean Bank F now, or wait two weeks?"
>
> **Agent:** "Bank F is holding its 85% recovery setpoint, but it's burning **~9% more energy** than a clean membrane would at today's feed temperature — that gap is fouling, not weather *(measured energy vs. WaterTAP-modeled clean baseline)*. At your tariff that's **~$Xk/week** and rising. Cleaning now costs **one CIP + ~4h downtime (≈ $Y)**. Break-even is in **~9 days**, so **waiting two weeks loses ~$Z** — I'd clean within the week. Confidence: medium; energy is measured, CIP cost is your configured parameter."

**Why it lands:** in one answer it chains insight + temperature-normalized anomaly + forecast + decision-support + natural language, on **honestly-labeled** economics — and it's grounded in the physics wedge (the energy gap is the WaterTAP-baseline Δ, the thing a pure dashboard cannot isolate because raw energy is temperature-confounded).

**Three-persona walkthrough (same data layer, three lenses):**

| Beat | Persona | Action | What it proves |
|---|---|---|---|
| 1 | **Plant Operator** | Sees the amber Bank F tile + alert; asks the hero question above | Live-feeling diagnosis → a decision, in plain language |
| 2 | **Process Engineer** | Opens WaterTAP what-if: "what if we ran Bank F at 80% recovery?" | Physics simulation + the clean baseline behind the Δ |
| 3 | **Operations Manager** | Asks "LCOW trend and what's this month's maintenance budget?" | Economics/forecast layer; the same Δ rolled up to $ |

**Demo hardening (so it survives the stage):** `min-instances=1` + pre-warmed WaterTAP and pre-computed baselines (plan-review M3); the replay clock can **seek** to the most legible Bank F cycle.

---

## OCWD Dataset — Primary Data Source Context

_Profiled from the actual files (see [02-data-pipeline.md](02-data-pipeline.md#dataset-reality-profiled) for full profile)._

- **21 RO units** across 7 banks (A–G) × 3 stages — **15,624 daily rows total**
- **Daily readings, 2019-01-01 → 2021-01-13** (~2 years, 744 rows/unit)
- **128 columns (banks A–E)** / **117 columns (banks F–G)** — two schemas to harmonize
- **Focus:** Stage 3 fouling vs. feed TDS, temperature, seasonality
- **Facility:** Brackish groundwater reclamation (TDS ~500–1,500 ppm) — perfect BWRO match
- **Format:** 21 CSV files (one per unit)
- **Labeled events:** `cip` flags **71 real Clean-In-Place events** — supervised maintenance labels
- **Key signals:** normalized ΔP (`unit_n_delta_p`), per-stage flux, `unit_recovery`, `temp_c`, TOC/EC removal, `dss` (days-since-cleaning, resets at CIP), `days_since_replacement` (membrane age)
- **Energy caveat:** `total_kw`/SEC populated **only on banks F–G** — A–E energy must be WaterTAP-modeled
