# Feature Specification: Forecasting & Anomaly Detection

**Feature Branch**: `004-forecast-anomaly`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Forecasting & Anomaly Detection — Turn the physics-adjusted health signals into forward-looking early warning. This feature forecasts where key performance signals (e.g. the clean-baseline deviations, specific energy, salt passage, differential pressure) are heading over a useful horizon, and flags anomalies and the onset of membrane fouling before it becomes severe. Every signal it emits must carry evidence, never a bare number: a forecast comes with a confidence interval and its main drivers; an anomaly names WHICH signal deviated and by HOW MUCH versus its expected baseline; a fouling-onset score comes with feature attribution explaining what drove it. Detection operates on the confound-free deviation from the Physics Deviation Engine and respects the cyclical nature of fouling (health is judged within each clean-to-cleaning cycle, resetting at each cleaning, not by absolute age). No accuracy or lead-time claim is published here — those are measured separately in the Validation feature — so this feature's job is to PRODUCE the signals and their evidence, honestly, and expose current forecasts, anomaly flags, and a per-unit fouling-onset indicator. The outcome: operators get an explainable early-warning layer that says not just 'something is wrong' but 'this specific signal is drifting, by this much, and here's why, and here's where it's headed.'"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Forward-looking forecasts of key health signals, each with a confidence interval and its drivers (Priority: P1)

Operators today can see where a unit's health signals *are*, but not where they are *heading*. This story projects each key performance signal — the clean-baseline deviations, specific energy, salt passage, and differential pressure — forward over a useful horizon so a drift can be seen before it becomes a problem. Crucially, no forecast is a bare line: every projection carries a confidence interval (how wide the uncertainty is) and the main drivers behind it (which signals or conditions are pushing the trend). An operator gets not just "this is trending up," but "this is trending up, this fast, within this uncertainty band, and here's what's pushing it."

**Why this priority**: This is the feature's core reason to exist — turning a present-tense health picture into a forward-looking early warning. Delivered alone, a forecast-with-evidence for the key signals already lets operators anticipate degradation rather than react to it, which is the whole point of the early-warning layer.

**Independent Test**: For a unit with a run of history, request forecasts for each supported signal and confirm every forecast returns (a) projected values over the horizon, (b) a confidence interval around them, and (c) the drivers behind the trend — with no forecast ever returned as a bare number.

**Acceptance Scenarios**:

1. **Given** a unit with sufficient history on a supported signal, **When** a forecast is requested, **Then** it returns projected values over the horizon together with a confidence interval and the main drivers of the trend.
2. **Given** two units where one is drifting and one is stable, **When** both are forecast, **Then** the drifting unit's projection shows the trend and a correspondingly informative uncertainty band, while the stable unit's projection stays near its recent level.
3. **Given** a signal with too little history to project responsibly, **When** a forecast is requested, **Then** the result is marked low-confidence or not-yet-forecastable rather than presenting a confident line the data cannot support.

---

### User Story 2 - Anomaly flags that name which signal deviated and by how much versus its baseline (Priority: P1)

A generic "something looks off" alert forces the operator to go hunting. This story makes every anomaly self-explaining: when a signal departs from its expected behavior, the flag names *which* signal deviated and *by how much* relative to its expected baseline — the confound-free clean-baseline expectation, not the raw reading. Because detection runs on the physics-adjusted deviation, an anomaly reflects genuine membrane condition rather than a cold-feed day or a pressure change. The operator receives a flag they can act on directly: "salt passage on this unit is X% above its expected baseline," not merely "anomaly."

**Why this priority**: An early-warning layer is only useful if its warnings are actionable. Naming the deviating signal and its magnitude versus baseline is what separates a useful flag from noise, and it is co-essential with the forecast — together they answer "where is it headed" and "what is off right now."

**Independent Test**: Feed a unit's physics-adjusted deviation history that contains a known departure and confirm the anomaly flag identifies the specific signal that deviated and reports its magnitude versus the expected baseline — never a bare "anomaly" with no attribution.

**Acceptance Scenarios**:

1. **Given** a unit whose physics-adjusted deviation for a signal departs from its expected behavior, **When** anomaly detection runs, **Then** it raises a flag that names the specific signal and states its magnitude versus the expected baseline.
2. **Given** a unit operating within expectation, **When** anomaly detection runs, **Then** no anomaly is flagged (the confound-free basis suppresses operating-condition false alarms).
3. **Given** a raw reading that swings only because of a feed-condition change while membrane health is steady, **When** detection runs on the physics-adjusted deviation, **Then** no anomaly is raised for that swing (the confound is already removed upstream).

---

### User Story 3 - A per-unit fouling-onset indicator that respects the cleaning cycle, with feature attribution (Priority: P1)

The single most valuable early warning for this plant is catching membrane fouling *as it begins*, not after it forces a shutdown. This story produces a per-unit fouling-onset indicator: a score that rises as the evidence of developing fouling accumulates within the unit's current clean-to-cleaning cycle, and — because fouling is cyclical — resets when the membrane is cleaned, so health is judged within each cycle rather than by absolute membrane age. And the score is never opaque: it comes with feature attribution explaining what drove it (e.g. which deviation is climbing, how the differential-pressure trend within this cycle contributed). The operator sees a fouling-onset signal that both respects how fouling actually behaves and shows its reasoning.

**Why this priority**: Fouling onset is the plant's headline pain point and the sharpest use of the forward-looking layer. Getting the cycle-aware framing right (reset at cleaning, judged within-cycle) and attaching feature attribution are what make this indicator trustworthy enough to act on — it is co-essential with Stories 1 and 2.

**Independent Test**: Take a unit's history spanning at least one full clean-to-cleaning cycle and confirm the fouling-onset score (a) rises as within-cycle fouling evidence accumulates, (b) resets at the recorded cleaning event rather than tracking absolute age, and (c) carries feature attribution naming what drove the score.

**Acceptance Scenarios**:

1. **Given** a unit accumulating fouling evidence within its current cleaning cycle, **When** the fouling-onset indicator is computed, **Then** the score rises and carries feature attribution explaining which signals drove it.
2. **Given** a recorded cleaning event on a unit, **When** the indicator is computed for readings after that event, **Then** the score resets and health is judged from the start of the new cycle, not from absolute membrane age.
3. **Given** two units at the same absolute membrane age but different positions in their cleaning cycles, **When** both are scored, **Then** the scores reflect within-cycle fouling evidence rather than shared age.

---

### User Story 4 - Every emitted signal carries evidence, and no accuracy claim is published here (Priority: P2)

This story makes the "evidence, never a bare number" contract a visible, enforceable property of everything the feature emits, and draws an honest boundary around what it does *not* claim. Every forecast travels with its confidence interval and drivers; every anomaly with its deviating signal and magnitude versus baseline; every fouling-onset score with its feature attribution. And critically, this feature publishes **no** accuracy, lead-time, or precision numbers about how good these signals are — those are measured separately by the downstream validation feature after its backtest actually runs. This feature's job is to produce the signals and their evidence honestly and expose current forecasts, anomaly flags, and the per-unit fouling-onset indicator — not to grade itself.

**Why this priority**: The evidence contract and the honest no-self-grading boundary are what make the whole layer defensible rather than merely plausible, but they are a property of how Stories 1–3 are shaped. The signals can be produced first and then held to the contract and scoped honestly before any stakeholder-facing use.

**Independent Test**: Inspect a sample of every output type and confirm each carries its required evidence (forecast → interval + drivers; anomaly → signal + magnitude vs baseline; fouling-onset → feature attribution); and confirm the feature surfaces no published accuracy/lead-time/precision figure about its own performance.

**Acceptance Scenarios**:

1. **Given** any forecast, anomaly, or fouling-onset output, **When** it is inspected, **Then** it carries its required evidence and never appears as a bare number.
2. **Given** a request for how accurate the forecasts or how early the fouling warnings are, **When** this feature is consulted, **Then** it does not publish an accuracy, lead-time, or precision claim — it defers that to the validation feature, whose backtest produces those figures.
3. **Given** the current state of a unit, **When** its early-warning outputs are exposed, **Then** operators can retrieve its current forecasts, its active anomaly flags, and its per-unit fouling-onset indicator, each with evidence attached.

---

### Edge Cases

- **Insufficient history to forecast**: When a signal lacks enough history to project responsibly, the forecast is marked low-confidence or not-yet-forecastable rather than presenting a confident line the data cannot support.
- **Immediately after a cleaning event**: The fouling-onset score resets and within-cycle judging restarts; a score that stays elevated right after a cleaning is itself a meaningful (labeled) signal, not an error.
- **A cleaning event mid-horizon**: A forecast horizon that would span a cleaning event is handled honestly — projections do not silently carry pre-cleaning fouling momentum across the reset.
- **Upstream deviation unavailable for a reading**: When the confound-free deviation this feature consumes is missing or marked unavailable upstream, no anomaly or fouling score is fabricated for that reading; the gap is represented explicitly.
- **Deviation input outside its trusted range**: When the upstream deviation is flagged out-of-range/low-confidence, that reduced confidence travels into the forecast/anomaly/fouling outputs rather than being silently upgraded to a confident signal.
- **A signal with no measured actual (e.g. energy on banks that do not meter it)**: Forecasts and scores are produced from the available (possibly modeled) signal and labeled accordingly; where no actual exists to detect a deviation against, that limitation is stated rather than hidden.
- **Anomaly and fouling disagree**: An isolated anomaly spike that is not part of accumulating within-cycle fouling is flagged as an anomaly without inflating the fouling-onset score, and vice versa — the two signals remain distinct.
- **A driver or attribution cannot be determined**: When the drivers behind a forecast or the attribution behind a score cannot be established, the output states that its evidence is incomplete rather than emitting the number alone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST forecast each supported forward-looking signal (the clean-baseline deviations, specific energy, salt passage, differential pressure) over a useful horizon, per unit.
- **FR-002**: Every forecast MUST carry a confidence interval quantifying the uncertainty of the projection.
- **FR-003**: Every forecast MUST carry the main drivers behind its trend, so the projection is explainable and never a bare line.
- **FR-004**: When a signal has insufficient history to project responsibly, the feature MUST mark the forecast as low-confidence or not-yet-forecastable rather than presenting a confident projection the data cannot support.
- **FR-005**: The feature MUST flag anomalies on a unit's health signals — a departure of a signal from its expected behavior.
- **FR-006**: Every anomaly flag MUST name WHICH signal deviated and state by HOW MUCH it deviated versus its expected baseline (not a bare "anomaly").
- **FR-007**: Anomaly and fouling detection MUST operate on the confound-free physics-adjusted deviation supplied by the Physics Deviation Engine, NOT on raw readings, so operating-condition confounds do not produce false alarms.
- **FR-008**: The feature MUST produce a per-unit fouling-onset indicator (a score reflecting accumulating evidence of developing fouling).
- **FR-009**: The fouling-onset indicator MUST judge health within each clean-to-cleaning cycle and reset at each recorded cleaning event — it MUST NOT be based on absolute membrane age.
- **FR-010**: Every fouling-onset score MUST carry feature attribution explaining what drove it (which signals/trends contributed).
- **FR-011**: Anomaly flags and fouling-onset scores MUST remain distinct: an isolated anomaly that is not part of accumulating within-cycle fouling MUST NOT inflate the fouling-onset score, and vice versa.
- **FR-012**: When the upstream confound-free deviation for a reading is missing or marked unavailable, the feature MUST NOT fabricate an anomaly or fouling score for that reading; the gap MUST be represented explicitly.
- **FR-013**: When the upstream deviation is flagged out-of-range or low-confidence, that reduced confidence MUST propagate into the forecast, anomaly, and fouling outputs rather than being silently upgraded.
- **FR-014**: A forecast horizon that spans a cleaning event MUST be handled honestly — pre-cleaning fouling momentum MUST NOT be silently carried across the cleaning reset.
- **FR-015**: The feature MUST expose, per unit, its current forecasts, its active anomaly flags, and its fouling-onset indicator, each with its evidence attached, for downstream consumers and operators to retrieve.
- **FR-016**: The feature MUST NOT publish any accuracy, lead-time, precision, or recall claim about its own signals; such claims are produced only by the downstream validation feature after its backtest actually runs.
- **FR-017**: No output MAY be emitted as a bare number: forecasts carry interval + drivers, anomalies carry deviating-signal + magnitude-vs-baseline, and fouling-onset scores carry feature attribution — always.
- **FR-018**: When the drivers of a forecast or the attribution of a fouling score cannot be established, the output MUST state that its evidence is incomplete rather than emitting the number alone.
- **FR-019**: The feature MUST be advise-only and read-only: it produces early-warning signals and MUST NOT actuate equipment or issue any control command.

### Key Entities *(include if feature involves data)*

- **Forward-Looking Signal**: A supported health signal that can be projected — a clean-baseline deviation, specific energy, salt passage, or differential pressure — for a given unit. The subject of a forecast.
- **Forecast**: A projection of a forward-looking signal over a horizon, carrying its confidence interval and the main drivers of its trend. Never a bare line.
- **Anomaly Flag**: A raised signal that a unit's health signal has departed from expectation, naming the deviating signal and its magnitude versus the expected (clean) baseline. Computed on the confound-free deviation.
- **Fouling-Onset Indicator**: A per-unit score reflecting accumulating evidence of developing fouling within the current clean-to-cleaning cycle, resetting at each cleaning event, and carrying feature attribution for what drove it.
- **Evidence Envelope**: The metadata that MUST travel with every emitted signal — confidence interval + drivers for forecasts, deviating signal + magnitude vs baseline for anomalies, feature attribution for fouling scores, plus propagated low-confidence/out-of-range/unavailable markers — ensuring no bare number circulates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every forecast the feature emits carries both a confidence interval and its drivers — 100% of forecasts, zero bare projections.
- **SC-002**: Every anomaly flag names the specific deviating signal and its magnitude versus the expected baseline — 100% of flags, zero unattributed "anomaly" alerts.
- **SC-003**: Every fouling-onset score carries feature attribution explaining what drove it — 100% of scores, zero opaque numbers.
- **SC-004**: Across the recorded cleaning cycles, the fouling-onset score resets at each cleaning event and is judged within-cycle — zero scores that track absolute membrane age instead of cycle position.
- **SC-005**: All detection is computed on the confound-free physics-adjusted deviation — zero anomaly or fouling outputs derived from raw, unadjusted readings.
- **SC-006**: The feature publishes zero accuracy, lead-time, precision, or recall claims about its own signals (those are owned by the downstream validation feature) — verifiable by inspection of everything it exposes.
- **SC-007**: For every unit, an operator can retrieve its current forecasts, active anomaly flags, and fouling-onset indicator, each with evidence attached, with zero silent gaps (missing upstream inputs are shown as explicit unavailable markers, not omissions).
- **SC-008**: On the recorded clean-to-cleaning cycles, the fouling-onset indicator rises ahead of the cleaning event relative to the clean start of the cycle, establishing it as a usable early-warning signal (the precise lead-time and precision figures are produced by the downstream validation feature, not claimed here).

## Assumptions

- **In-database AI compute is an implementation concern**: How the forecasting, anomaly detection, and scoring are computed (in the analytics store in-place, in a service, or a mix) and which specific models or functions are used are decisions for `/speckit.plan`, per Constitution Principle I. This spec states only the outcome contract (signals + evidence), not the mechanism.
- **Supported forward-looking signals**: The clean-baseline deviations from the Physics Deviation Engine, specific energy, salt passage/rejection, and differential pressure (normalized ΔP / transmembrane pressure). Additional derived signals may be added later without changing these requirements.
- **"Useful horizon" is tunable**: The forecast horizon is a parameter chosen at planning time to be operationally useful (e.g. enough lead time to plan a cleaning); its exact length does not change the requirements.
- **Detection basis is the confound-free deviation**: Anomaly and fouling detection consume the physics-adjusted expected-vs-actual delta from Feature 003, so temperature/pressure/flow/salinity confounds are already removed before this feature runs. This feature does not re-derive baselines.
- **Cyclical fouling framing**: "Health within a cycle" is defined by the unit's position in its clean-to-cleaning cycle (days-since-cleaning saw-tooth that resets at each recorded cleaning event), consistent with Constitution Principle V — never by absolute membrane age.
- **Anomaly vs fouling are complementary, not redundant**: An anomaly is a point/short-window departure; fouling-onset is accumulating within-cycle evidence. They are produced as distinct signals that may or may not co-occur.
- **Accuracy/lead-time claims are deferred (evidence before claim)**: This feature makes the early-warning signal *available* with its evidence (SC-001–SC-003, SC-007) and *directionally usable* (SC-008); published precision, recall, and fouling lead-time figures are produced by the downstream fouling-validation feature after its backtest actually runs, per Constitution Principle II (HARD GATE).
- **Energy provenance carries through**: Where a signal (e.g. energy) is modeled rather than measured on a bank, that provenance — set upstream — travels into this feature's forecasts and scores and is labeled accordingly.
- **Freshness/refresh cadence is out of scope here**: Whether early-warning signals are recomputed nightly, on new data, or on demand is an implementation decision for planning, not a requirement of this spec.

## Dependencies

- **Feature 003 — Physics Deviation Engine (required upstream)**: Provides the confound-free expected-vs-actual deviation — the physics-adjusted health signal, per unit and metric, with its provenance and confidence/fidelity flags — that this feature forecasts and runs detection on. Without the deviation contract, there is no confound-free basis to detect against and confounds would produce false alarms.
- **Feature 001 — Data Foundation (required upstream)**: Provides the harmonized time-series history and the clean-to-cleaning cycle markers (days-since-cleaning, cleaning events) across all 21 units that forecasting and the cycle-aware fouling-onset indicator require.
- **Provisioned GCP environment (required, user-provided)**: Computing and persisting forecasts, anomaly flags, and fouling-onset scores requires a provisioned cloud analytics/compute environment already in place. That provisioning is owned by the future Cloud Platform feature (Feature 009) and **must be set up by the user**; it is a prerequisite, not an open question for this spec.
- **Feature 005 — Fouling Validation (downstream owner of accuracy claims)**: This feature deliberately does NOT publish accuracy, lead-time, or precision numbers. The downstream validation feature backtests these signals against the recorded cleaning events and produces those measured figures. The signal-and-evidence contract defined here is that validation's input.
- **Downstream dependents**: The conversational diagnostics/assistant and the operator-facing visual twin consume the current forecasts, anomaly flags, and fouling-onset indicator (with their evidence) as their early-warning surface.
