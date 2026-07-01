# Feature Specification: Operating-Cost & Cleaning Economics

**Feature Branch**: `006-economics-model`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Operating-Cost & Cleaning Economics — Translate the plant's operational and health signals into dollars so operators can make defensible cost decisions, above all the recurring question: is it cheaper to clean a unit now, or to keep running and clean later? Fouling raises energy use (more pressure needed for the same output), so waiting has a rising energy cost; cleaning has its own cost and downtime. This feature provides a transparent, parametric operating-cost model (a small set of editable assumptions such as energy price, chemical/labor cost per cleaning, downtime, discount rate) that computes per-unit operating cost and the economic trade-off of cleaning-now versus waiting, expressed as the projected cost difference over a horizon. The governing rule is honesty about provenance and uncertainty: every figure is labeled as measured or modeled (for example, energy is metered on some banks and physics-modeled on others), assumptions are stated inline with each answer, conversational overrides to those assumptions are honored, and results LEAD WITH DELTAS and trade-offs (which are robust) rather than headline absolute cost-of-water figures (which carry large uncertainty). The outcome: operators get a trustworthy, assumption-transparent dollar view that frames cleaning and operating decisions as clear, defensible trade-offs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Answer "clean now vs. wait": the projected cost difference over a horizon (Priority: P1)

The recurring, high-stakes operator question is: *is it cheaper to clean this unit now, or keep running and clean later?* Fouling makes a membrane work harder for the same output, so the energy cost of running rises the longer cleaning is deferred; cleaning, meanwhile, has its own chemical/labor cost plus lost production during downtime. This story turns that trade-off into a single defensible dollar answer: for a chosen unit and a decision horizon, it computes the projected cost of cleaning-now versus the projected cost of waiting, and reports the **difference** between them (and, where it exists, the break-even point at which waiting stops paying off). The answer LEADS WITH THE DELTA — "cleaning now saves $X over the next two weeks" — not an absolute cost-of-water headline.

**Why this priority**: This is the feature's reason to exist and the economic half of the project's hero moment ("should we clean Bank F now, or wait two weeks?"). Delivered alone it already converts a gut-feel maintenance judgement into a defensible, numbers-backed trade-off, which is the whole point of an economics layer.

**Independent Test**: Pick a unit with a rising-cost (fouling) trajectory, run the clean-now-vs-wait analysis over a stated horizon, and confirm it returns (a) the projected cost of cleaning now, (b) the projected cost of waiting, (c) the delta between them presented first, and (d) the break-even timing where applicable — every figure carrying its measured/modeled label and its assumptions.

**Acceptance Scenarios**:

1. **Given** a unit whose running (energy) cost is rising as fouling accumulates, **When** the clean-now-vs-wait analysis runs over a decision horizon, **Then** it reports the projected cost difference between cleaning now and waiting, stated as the leading figure, with the underlying cleaning cost and rising-energy cost shown as the components.
2. **Given** a horizon over which waiting eventually costs more than cleaning now, **When** the trade-off is computed, **Then** the feature reports the break-even point (the time at which waiting stops being cheaper) rather than only a single-instant comparison.
3. **Given** the answer, **When** it is read, **Then** the delta/trade-off is presented ahead of any absolute cost-of-water figure, and any absolute quoted is accompanied by its assumptions and an uncertainty caveat.

---

### User Story 2 - Per-unit operating cost from a transparent, parametric model (Priority: P1)

Before any trade-off can be trusted, the platform needs a defensible per-unit operating cost. The dataset carries no cost ledger — no tariffs, chemical, labor, or downtime figures, and energy on only some banks — so this story closes that gap the honest way: a **parametric cost model** built on a small, editable set of declared assumptions (energy price, cost per cleaning, downtime cost, discount rate, and the like). From those parameters plus each unit's operational and energy signals, it computes a per-unit operating cost and its main components (energy, cleaning/chemical, downtime), so an operator can see not just *what* a unit costs to run but *why*.

**Why this priority**: The per-unit operating cost is the foundation every other economic answer stands on — the clean-now-vs-wait delta, rankings, and any absolute all derive from it. It is co-essential with Story 1: without a transparent per-unit cost there is nothing to take a delta of, and it is independently valuable as the "what does each unit cost to run" view.

**Independent Test**: With the default parameter set, compute per-unit operating cost for a set of units and confirm each result decomposes into its cost components, is reproducible from the declared parameters plus operational signals, and labels each component as measured or modeled.

**Acceptance Scenarios**:

1. **Given** the small set of editable cost assumptions at their defaults, **When** per-unit operating cost is computed, **Then** each unit returns an operating cost broken into its components (energy, cleaning/chemical, downtime), each traceable to the parameters and signals that produced it.
2. **Given** two units, **When** their operating costs are compared, **Then** the feature can rank them (e.g. "which unit is most expensive to run") as a robust relative answer independent of the absolute-tariff assumption.
3. **Given** a per-unit operating cost, **When** any component figure is read, **Then** it is labeled measured or modeled according to whether its underlying signal (notably energy) was metered or physics-modeled for that unit.

---

### User Story 3 - Every figure is honest about provenance and uncertainty (measured vs. modeled, assumptions inline) (Priority: P1)

A dollar figure is only as trustworthy as the operator's ability to see where it came from. This story makes honesty a property of every economic answer: each figure is explicitly labeled **measured** (from a metered signal or a configured parameter) or **modeled** (derived, e.g. energy imputed by physics for un-metered banks); the assumptions behind an answer are stated **inline** with that answer, not buried; and absolute cost-of-water figures — which carry large uncertainty from the assumptions — are never led with, and never quoted bare. The operator always knows which parts of a number are solid and which are assumed.

**Why this priority**: This is the constitutional heart of the feature (Measured-vs-Modeled Honesty; Evidence Over Assertion). An economics layer that hides its provenance is worse than none, because it lends false confidence to a decision. The honesty contract is co-essential with the numbers themselves — a figure without its provenance and assumptions is not a deliverable here.

**Independent Test**: Inspect any economic answer the feature produces and confirm (a) every figure is labeled measured or modeled, (b) the assumptions in force are stated alongside the answer, and (c) deltas/trade-offs lead while any absolute cost-of-water figure appears only with its assumptions and an uncertainty caveat attached.

**Acceptance Scenarios**:

1. **Given** an economic answer that mixes metered energy (some banks) and physics-modeled energy (other banks), **When** it is presented, **Then** each contributing figure is labeled measured or modeled so the provenance split is visible.
2. **Given** any dollar answer, **When** it is read, **Then** the assumptions that produced it (the parameters in force) are stated inline with the answer.
3. **Given** a request that would surface an absolute cost-of-water number, **When** it is answered, **Then** the delta/trade-off framing is led with, and the absolute — if quoted at all — carries its assumptions and an explicit uncertainty caveat, never presented bare as if precise.

---

### User Story 4 - Conversational assumption overrides that carry through the answer (Priority: P2)

The default parameters are reasonable, but they are the platform's assumptions, not the operator's. This story lets the operator override any assumption in conversation — "use $0.15/kWh," "our CIP runs about $5,000," "assume 6 hours downtime" — and have the economic answer recomputed under those values, with the overridden assumptions reflected in the inline disclosure so it is clear the answer used the operator's numbers, not the defaults. The trade-off answers (Stories 1–2) hold up because deltas are robust to the exact parameter values; the override simply lets the operator anchor the numbers to their own facility.

**Why this priority**: Overrides make the model *theirs* and therefore trusted — but the platform still delivers defensible answers on the defaults without them, so this rides one notch below the core compute and honesty stories. It is independently testable and independently valuable: an operator can change one assumption and immediately see how the trade-off responds.

**Independent Test**: Provide a conversational override for one or more parameters, re-ask an economic question, and confirm the answer is recomputed under the overridden values and that the inline assumption disclosure reflects the operator's numbers rather than the defaults.

**Acceptance Scenarios**:

1. **Given** the default cost assumptions, **When** the operator overrides a parameter in conversation (e.g. energy price or cost per cleaning), **Then** the subsequent economic answer is recomputed under the overridden value.
2. **Given** an answer produced under an override, **When** its inline assumption disclosure is read, **Then** it reflects the overridden value(s) and makes clear the answer used the operator's numbers, not the defaults.
3. **Given** a clean-now-vs-wait delta computed on the defaults, **When** the same delta is recomputed under a plausible override, **Then** the direction of the trade-off (which option is cheaper) remains stable across the parameter change, demonstrating the delta's robustness — or, where it flips, the flip and its cause are surfaced.

---

### Edge Cases

- **Energy is modeled, not metered, for a unit**: For banks without metered energy, the energy component is physics-modeled; the answer MUST label that component modeled and MUST NOT present it as if metered.
- **Operator asks only for the absolute cost of water**: Even when an absolute LCOW-style figure is explicitly requested, the feature leads with deltas/context and attaches the assumptions and uncertainty to the absolute rather than quoting it bare.
- **An override flips the trade-off**: When an overridden assumption changes which option (clean now vs. wait) is cheaper, the flip is surfaced honestly along with the parameter that caused it, not hidden behind the previous conclusion.
- **Horizon extends past available forecast/trajectory**: When the requested decision horizon runs beyond the range over which the fouling/cost trajectory is supported, the feature limits or flags the horizon rather than extrapolating silently into unsupported territory.
- **No rising-cost signal (unit is flat/clean)**: When a unit shows no meaningful rising-energy trend, "waiting" carries little penalty; the feature says so (a near-zero or negative delta for cleaning now) rather than manufacturing an urgency that the data does not support.
- **Missing or partial input signals**: When the operational/energy signals needed for a unit are incomplete, the affected figures are marked low-confidence or excluded with the reason stated, rather than silently substituting a guess.
- **Override value is implausible or out of range**: When a conversational override is implausible (e.g. a negative or absurd tariff), the feature surfaces the concern rather than computing on it unchallenged.
- **Downtime/production value interacts with cleaning cost**: The cost of cleaning includes lost production during downtime; when a unit's production value is itself modeled, that dependency is labeled so the cleaning-cost figure's provenance is transparent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST provide a parametric operating-cost model driven by a small, explicitly-declared set of editable assumptions (at minimum: energy price, cost per cleaning event covering chemicals/labor, downtime cost, and discount rate), rather than inventing cost data absent from the dataset.
- **FR-002**: The feature MUST compute a per-unit operating cost for each RO unit from the declared parameters plus that unit's operational and energy signals, and MUST decompose it into its main components (energy, cleaning/chemical, downtime).
- **FR-003**: The feature MUST answer the clean-now-vs-wait question for a unit over a stated decision horizon by computing the projected cost of cleaning now versus the projected cost of continuing to run and cleaning later, and reporting the **difference** between them.
- **FR-004**: The clean-now-vs-wait answer MUST account for the rising energy cost of deferring cleaning (fouling raises the pressure/energy needed for the same output) on the "wait" side and the cleaning cost plus downtime on the "clean now" side.
- **FR-005**: Where a break-even point exists within or near the horizon (the time at which waiting stops being cheaper than cleaning now), the feature MUST report it, not merely a single-instant comparison.
- **FR-006**: The feature MUST LEAD WITH DELTAS and trade-offs (cost differences, rankings, trends) and MUST NOT lead with absolute cost-of-water (LCOW-style) figures.
- **FR-007**: When an absolute cost-of-water figure is surfaced at all, the feature MUST attach the assumptions that produced it and an explicit uncertainty caveat, and MUST NOT present it bare as if precise.
- **FR-008**: Every economic figure the feature surfaces MUST be labeled as measured or modeled — in particular, energy metered on some banks MUST be labeled measured while physics-modeled energy on un-metered banks MUST be labeled modeled — so the provenance split within any answer is visible.
- **FR-009**: Every economic answer MUST disclose, inline with the answer, the assumptions (parameter values) in force that produced it.
- **FR-010**: The feature MUST honor conversational overrides of any cost assumption and recompute the affected answer under the overridden value(s), with the inline disclosure reflecting the operator's numbers rather than the defaults.
- **FR-011**: The feature MUST provide robust relative answers — at minimum, ranking units by operating cost (e.g. "which unit is most expensive to run") — that hold independent of the exact absolute-tariff assumption.
- **FR-012**: The feature MUST derive every dollar figure from a stated computation over declared parameters and operational signals — no figure may be a bare, unsupported number (evidence over assertion).
- **FR-013**: When an overridden assumption changes which option is cheaper (the trade-off flips), the feature MUST surface the flip and the parameter that caused it, rather than silently retaining the prior conclusion.
- **FR-014**: When the requested decision horizon extends beyond the range over which the fouling/cost trajectory is supported, the feature MUST limit or flag the horizon rather than extrapolate silently.
- **FR-015**: When a unit shows no meaningful rising-cost (fouling) trend, the feature MUST report the near-zero (or negative) benefit of cleaning now honestly, rather than manufacturing urgency the data does not support.
- **FR-016**: When the operational or energy signals required for a unit are missing or partial, the feature MUST mark the affected figures low-confidence or exclude them with the reason stated, rather than substituting an unstated guess.
- **FR-017**: When a conversational override value is implausible or out of a reasonable range, the feature MUST surface the concern rather than compute on it unchallenged.
- **FR-018**: The feature MUST be advise-only and read-only: it computes and reports cost figures and trade-offs to inform an operator's decision and MUST NOT actuate equipment, schedule a cleaning, or issue any control command.
- **FR-019**: The feature MAY incorporate scaling-mitigation actions (antiscalant dosing, feed-pH adjustment) and a sustainable-recovery consideration into the operating-cost and clean-now-vs-wait analysis, driven by a modeled scaling-propensity estimate; every such figure MUST be labeled modeled — computed on an assumed feed-chemistry profile, since the dataset carries no scaling-ion measurements — with its assumptions stated inline, and MUST remain delta-led rather than presented as a precise absolute.
- **FR-020**: Each economic figure SHOULD carry credibility metadata alongside its measured/modeled label — at minimum its decision grade (e.g. budgetary vs. design) and the validation basis of its inputs — so an operator can weigh a dollar figure's confidence, consistent with leading with deltas over uncertain absolutes (Constitution Principle IV).

### Key Entities *(include if feature involves data)*

- **Cost Assumption Parameter**: One editable input to the operating-cost model (e.g. energy price, cost per cleaning, downtime cost, discount rate) — carries a default value with its basis, a measured-vs-modeled/provenance note, and is overridable in conversation. The set of these parameters is deliberately small and fully declared.
- **Per-Unit Operating Cost**: The computed cost to run a single RO unit, decomposed into its components (energy, cleaning/chemical, downtime), each traceable to the parameters and operational/energy signals that produced it and labeled measured or modeled.
- **Clean-Now-vs-Wait Trade-off**: The economic comparison for a unit over a decision horizon — the projected cost of cleaning now against the projected cost of waiting, expressed primarily as the delta between them, with the rising-energy and cleaning/downtime components exposed and a break-even point where one exists.
- **Break-even Point**: The time within or near the horizon at which continuing to run (waiting) stops being cheaper than cleaning now — the pivot of the trade-off, reported when it exists.
- **Assumption Disclosure**: The inline statement, attached to each economic answer, of the parameter values in force (defaults or operator overrides) — the record that makes an answer's provenance and reproducibility transparent.
- **Cost Provenance Label**: The measured-or-modeled tag on each figure (and each component), reflecting whether its underlying signal was metered (e.g. energy on banks F–G) or derived (e.g. physics-modeled energy on banks A–E, or a configured cost parameter) — carrying, alongside the tag, credibility metadata (decision grade and validation basis) so a figure's confidence is visible, not just its provenance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a fouling (rising-cost) unit, the feature produces a clean-now-vs-wait answer over a stated horizon whose leading figure is the cost **delta** between the two options, with the cleaning-cost and rising-energy components exposed and a break-even point reported where one exists.
- **SC-002**: The feature computes a per-unit operating cost for every unit, decomposed into energy, cleaning/chemical, and downtime components, each traceable to the declared parameters and operational signals — zero cost figures are bare or unexplained.
- **SC-003**: 100% of economic figures surfaced are labeled measured or modeled, with metered-energy banks and physics-modeled-energy banks distinguished within any mixed answer.
- **SC-004**: 100% of economic answers state their in-force assumptions inline; zero answers are presented without their parameters disclosed.
- **SC-005**: Deltas, trade-offs, or rankings are led with in 100% of answers; zero answers lead with an absolute cost-of-water figure, and any absolute quoted carries its assumptions and an uncertainty caveat.
- **SC-006**: A conversational override of any cost assumption changes the corresponding answer under the new value(s) and is reflected in the inline disclosure — verifiable by re-asking the same question before and after an override.
- **SC-007**: The unit ranking by operating cost is stable under a plausible change of the absolute-tariff assumption (the relative ordering is robust to the parameter's exact value), demonstrating that the delta/ranking framing holds where absolutes do not.
- **SC-008**: When a trade-off flips under an override, the flip and its causing parameter are surfaced in 100% of such cases — zero silent retentions of a superseded conclusion.

## Assumptions

- **Costs are declared assumptions, not invented data (parametric model)**: The dataset has no cost ledger. Per Constitution Principle IV, the platform closes this the honest way — a small set of editable, defaulted parameters (energy price, cost per cleaning, downtime cost, discount rate, and related) — every dollar figure derives from these declared parameters plus operational signals, never from fabricated plant cost data. Concrete default values and their bases live in the domain brief (docs/01) and are set at planning time, not fixed by this spec.
- **Lead with deltas because absolutes carry ±20% uncertainty**: Absolute cost-of-water figures inherit large uncertainty from the assumptions; relative answers (deltas, trends, rankings) are robust because the assumptions stay constant and cancel. The feature therefore leads with deltas and only ever quotes an absolute with its assumptions and caveat attached (Constitution Principle IV).
- **Measured-vs-modeled provenance is inherited, not re-derived**: Which units have metered energy (banks F–G) versus physics-modeled energy (banks A–E) is established upstream (Feature 001 provenance, Feature 003 physics energy); this feature preserves and labels that provenance on every figure rather than re-deciding it.
- **Break-even/rising-cost is driven by the fouling trajectory, not absolute age**: The "wait" side's rising energy cost follows the within-cycle fouling trajectory (the clean→CIP saw-tooth), consistent with the constitution's fit-for-purpose fidelity principle — not absolute membrane age.
- **Compute mechanism is an implementation concern**: How the cost model, trade-off projection, and override handling are computed (in the analytics store in-place, in a service, or a mix), which specific functions/libraries supply the cost structure, and the exact break-even/discounting formulas are decisions for `/speckit.plan`, per Constitution Principle I. This spec states outcomes and the honesty contract, not the mechanism or the equations.
- **Advise-only economics**: The feature informs a decision with dollar figures; it never schedules a cleaning or actuates anything (Constitution Principle III, HARD GATE). "Propose-to-record" of a cost decision, if offered, is gated on human approval and owned by the assistant/decision-log feature, not here.
- **Conversational overrides persist per the assistant/memory layer**: The mechanism by which an override is captured and remembered across a session is provided by the conversational/assistant layer; this feature defines that overrides are honored and reflected, not how they are stored.
- **Scaling-mitigation economics are modeled on assumed feed chemistry**: Any antiscalant / feed-pH / sustainable-recovery cost figure (FR-019) derives from a modeled scaling-propensity estimate over an assumed literature feed-ion profile — the dataset carries no scaling-ion measurements — and is labeled modeled with inline assumptions per Constitution Principle IV; it is offered as a delta-led trade-off, never a precise absolute.
- **Default cost parameters may be calibrated offline (optional, labeled)**: The small default parameter set MAY be sanity-calibrated against an independent physics-costing reference (e.g. the vendored RO toolset's costing routines) offline; such calibration is a modeled cross-check that informs the defaults and does not change the honesty contract or make any absolute precise.

## Dependencies

- **Feature 003 — Physics Deviation Engine (required upstream)**: Supplies the physics-modeled energy for un-metered banks (A–E), so the energy→cost bridge is available fleet-wide, and the temperature-normalized fouling/energy gap that makes the "rising cost of waiting" a real, confound-free signal rather than weather noise.
- **Feature 004 — Forecasting & Anomaly Detection (required upstream)**: Supplies the fouling trajectory / forward projection used to estimate how a unit's running cost rises over the decision horizon — the basis for the "wait" side of the clean-now-vs-wait trade-off and the break-even point.
- **Feature 001 — Data Foundation (required upstream)**: Provides the harmonized time-series across all 21 units, the per-unit energy provenance (metered on banks F–G only; modeled elsewhere) that drives measured-vs-modeled labeling, and the operational signals (recovery, pressure/ΔP, days-since-cleaning cycles) the cost model reads.
- **Provisioned GCP environment (required, user-provided)**: Computing the cost model, trade-off projections, and overrides, and persisting parameter state, requires a provisioned cloud analytics/compute environment already in place. That provisioning is owned by the future Cloud Platform feature (Feature 009) and **must be set up by the user**; it is a prerequisite, not an open question for this spec.
- **Modeled scaling-propensity input (only if scaling-mitigation economics are used)**: The optional antiscalant/pH/sustainable-recovery economics (FR-019) consume a modeled scaling-propensity estimate computed on an assumed literature feed-chemistry profile — a modeled reference input, not part of the measured dataset — established at planning time and labeled modeled wherever it appears.
- **Downstream consumers**: The conversational diagnostics/assistant (which asks the clean-now-vs-wait question and applies overrides in dialogue) and the operator-facing visual twin (which surfaces per-unit cost and the trade-off) consume this feature's figures — always with their measured/modeled labels, inline assumptions, and delta-led framing intact.
