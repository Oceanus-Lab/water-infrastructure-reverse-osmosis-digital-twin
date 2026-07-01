# Feature Specification: Fouling Validation & Lead-Time Evidence

**Feature Branch**: `005-fouling-validation`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Fouling Validation & Lead-Time Evidence — Prove, with real historical ground truth, how good the early-warning system actually is, so that any accuracy claim the project makes is earned rather than asserted. The facility history contains real clean-in-place (CIP) events — the moments operators actually cleaned each unit because fouling had become significant. This feature treats those real cleaning events as ground-truth labels and backtests the detection system against them: for each cleaning cycle, it measures how early the system would have flagged fouling onset before the actual cleaning (the decision lead time / warning window), how often it warned correctly versus falsely (precision / false-alarm rate), and how accurately the clean-membrane physics baseline matches real clean-state operation (baseline error). It also discovers and reports WHICH signal is the most reliable leading indicator of fouling. The governing rule is honesty: no headline accuracy or lead-time number may be quoted anywhere in the product until this validation has actually been run and produced it — evidence first, claim second. The feature must present its findings honestly, including limitations (e.g. distinguishing fouling-onset detection from the later cleaning decision, and the size of the usable warning window). The outcome: a defensible, evidence-backed statement of the twin's diagnostic accuracy that turns 'we think it works' into 'here is the measured lead time and precision against N real cleaning events.'"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backtest the early-warning system against real cleaning events to measure lead time and false-alarm rate (Priority: P1)

The facility's history contains real clean-in-place (CIP) events — the moments operators actually cleaned each unit because fouling had become significant. This story treats every one of those real cleaning events as a ground-truth label and replays the fouling-detection system across the history, cleaning cycle by cleaning cycle. For each cycle it measures two things the project has so far only asserted: how early the system would have flagged fouling onset ahead of the actual cleaning — the **decision lead time / warning window** — and how often the system warned correctly versus falsely — its **precision / false-alarm rate** and how many real cleanings it caught at all (recall). The result is a measured, distributional answer (not a single hopeful number) to "how early, and how reliably, would this have warned us?"

**Why this priority**: This is the feature's central reason to exist and the project's headline credibility deliverable. Without it, every early-warning claim is an assertion; with it, the project can state a lead time and precision earned against real, human-validated cleaning decisions. Delivered alone, this backtest already converts "we think it works" into a defensible measured statement.

**Independent Test**: Run the backtest over the recorded cleaning cycles and confirm it produces, per cycle and in aggregate, (a) a measured lead time between the system's first sustained warning and the real cleaning event, (b) precision / false-alarm rate and recall against the real events, and (c) the distribution (not just a mean) of lead time — all computed from the actual history, none hard-coded.

**Acceptance Scenarios**:

1. **Given** the recorded cleaning cycles with their real CIP events as labels, **When** the backtest runs, **Then** it reports the lead time between the first sustained fouling-onset warning and the actual cleaning for each cycle, plus the aggregate distribution across all cycles.
2. **Given** the same cycles, **When** warnings are scored against the real cleaning events, **Then** the feature reports precision / false-alarm rate and recall — a true positive being a sustained warning within a defined window before a real cleaning, a false positive a sustained warning with no cleaning in that window.
3. **Given** a run of the backtest, **When** its warning-persistence and horizon parameters are examined, **Then** those parameters were fixed (pre-registered) before the run, not tuned afterward to flatter the result.

---

### User Story 2 - Validate the clean-membrane physics baseline against real clean-state operation (Priority: P1)

Every fouling signal in the twin is measured as a deviation from what a *clean* membrane would do — so the whole early-warning layer is only as trustworthy as that clean baseline. This story checks the baseline directly against reality: for readings taken when a unit was genuinely clean (just after a cleaning event, early in its cycle), it compares the physics-predicted clean-state behaviour to what the plant actually measured, and reports the **baseline error** per quantity. This is the anchor validation — it establishes that the reference point every deviation is measured from is itself faithful to the real clean state, and it doubles as the acceptance check for the physics baseline's calibration.

**Why this priority**: A validated warning system built on an unvalidated baseline is a house on sand. Quantifying clean-state baseline error is co-essential with the lead-time backtest: the lead-time number is only defensible if the baseline it deviates from is shown to match real clean operation. It can be run and reported independently of the lead-time analysis.

**Independent Test**: Select readings from genuine clean states (just after cleaning), compare the physics-predicted clean behaviour to the measured actuals, and confirm the feature reports a per-quantity baseline error and a clear measured-vs-modeled labeling of every figure.

**Acceptance Scenarios**:

1. **Given** readings from genuine clean states across the units, **When** the baseline is validated, **Then** the feature reports a per-quantity error between the physics-predicted clean behaviour and the measured actuals.
2. **Given** the baseline-error report, **When** any figure is read, **Then** each value is explicitly labeled as measured (the actual) or modeled (the physics prediction), and the deviation between them is identified as the diagnostic signal.
3. **Given** a per-quantity baseline error, **When** it is compared to a pre-declared acceptance threshold, **Then** the result states whether the baseline is fit to serve as the reference the fouling signals deviate from.

---

### User Story 3 - Discover and report which signal is the most reliable leading indicator of fouling (Priority: P1)

Not every measurement fouls equally, and some move for reasons that have nothing to do with membrane health. This story searches across the candidate health signals to discover, from the data, **which signal is the most reliable leading indicator of fouling** — the one whose movement most consistently and strongly precedes real cleaning events — and reports it with the evidence that earned the ranking (effect size, consistency across units and cycles). Critically, the answer is *measured here*, not assumed: even where prior exploration suggests a likely front-runner, this feature must derive the ranking from the actual history so the reported leading indicator is earned, not asserted.

**Why this priority**: Knowing which signal leads fouling is what makes the early-warning layer focus on the right thing and what lets operators trust a warning's basis. It is co-essential with Stories 1 and 2 — the lead-time backtest is most defensible when it also names, with evidence, the signal that carries the warning.

**Independent Test**: Run the signal-discovery analysis across the candidate signals and confirm it outputs a ranked, evidence-backed identification of the most reliable leading indicator (with effect size and cross-unit consistency), derived from the history rather than hard-coded.

**Acceptance Scenarios**:

1. **Given** the candidate health signals over the recorded cycles, **When** signal discovery runs, **Then** it reports a ranking of leading indicators with the evidence (effect size, consistency) that supports the top signal.
2. **Given** a signal that moves for operating-condition or control reasons rather than fouling (e.g. a signal held at a fixed setpoint, or one confounded by feed temperature), **When** the ranking is produced, **Then** that signal is not credited as a fouling indicator, and the reason is stated.
3. **Given** the identified leading indicator, **When** its result is reported, **Then** the report makes clear the ranking was measured from the data in this run, not carried over as an assumption.

---

### User Story 4 - Present findings honestly, with limitations, and gate every accuracy claim behind this run (Priority: P1)

An impressive number that isn't true is worse than a modest one that is. This story makes honesty an enforced property of the output. It requires the feature to present its findings with their limitations attached — most importantly the honest distinction between detecting fouling **onset** and the later **cleaning decision** (the system can mark that fouling has begun well before an operator chooses to clean, so the warning window is real but must not be mis-sold as predicting the exact cleaning date), the **size of the usable warning window**, and other confounders (some cleanings may be scheduled/preventive rather than fouling-driven; the count of detected cycles may not equal the count of cleaning-event labels; parameters were pre-registered). And it enforces the governing rule: **no headline accuracy, lead-time, or precision number may appear anywhere in the product until this validation has actually run and produced it** — this feature is that run. The outcome is a defensible, evidence-backed statement of the twin's diagnostic accuracy: "here is the measured lead time and precision against N real cleaning events," with its caveats in the same breath.

**Why this priority**: The whole point of this feature is credibility, and credibility dies the moment a number is over-sold or quoted before it was earned. The honest-limitations framing and the evidence-first gate are what turn a set of metrics into a defensible claim, so they are co-essential with the measurement stories, not an afterthought.

**Independent Test**: Inspect the feature's published findings and confirm (a) every headline figure is accompanied by its limitations and the honest onset-vs-cleaning framing, (b) the reported warning-window size is stated, and (c) no accuracy/lead-time/precision claim exists anywhere in the product that was not produced by an actual run of this validation.

**Acceptance Scenarios**:

1. **Given** a measured lead-time or precision figure, **When** it is published, **Then** it is accompanied by its limitations and the explicit distinction between detecting fouling onset and predicting the operator's cleaning decision.
2. **Given** the product before this validation has run, **When** it is inspected for any headline accuracy, lead-time, or precision claim, **Then** none is present — such claims appear only after this feature produces them.
3. **Given** the published findings, **When** the warning window is described, **Then** its measured size is stated honestly (e.g. the span between detected onset and the real cleaning), rather than implying the system predicts the exact cleaning date.

---

### Edge Cases

- **Detected cycles do not equal cleaning-event labels**: The number of detected clean-to-cleaning cycles may differ from the number of recorded cleaning-event labels. The feature reconciles the two to one agreed cycle definition and reports against it, rather than silently mixing counts.
- **Partial cycles at the start and end of history**: The history begins and ends mid-cycle. Cycles that are cut off at the edges of the record are dropped or flagged rather than counted as if complete.
- **Scheduled or preventive cleanings**: Some cleanings may be preventive rather than fouling-driven; these depress apparent lead time. Where such cleanings are identifiable, they are flagged and their effect on the metrics disclosed.
- **A confounded or setpoint-controlled signal masquerading as a fouling signal**: A signal held at a fixed control setpoint, or one confounded by feed temperature (which can even move opposite to fouling), MUST NOT be credited as a leading indicator; the confound is stated.
- **A cleaning with no preceding warning (a miss)**: A real cleaning event that the system never warned about is counted honestly against recall rather than excused.
- **A sustained warning with no cleaning (a false alarm)**: A sustained warning with no cleaning in its horizon is counted as a false positive, not quietly discarded.
- **Onset detected very early relative to the cleaning**: When onset is detected far ahead of the cleaning, the gap is reported as the decision-window size and framed as onset-to-cleaning economics — not as the system knowing the exact cleaning date in advance.
- **Baseline unavailable for a clean-state reading**: When the physics baseline cannot be produced for a clean-state reading, that reading is excluded from baseline-error scoring and the exclusion is represented explicitly, not silently.
- **Too few cleaning events for a unit**: When a unit has too few cleaning cycles to support a stable per-unit figure, results are reported in aggregate (or marked low-confidence) rather than as an over-confident per-unit number.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST treat the facility's real recorded cleaning (CIP) events as ground-truth labels and backtest the fouling-detection system against them.
- **FR-002**: The feature MUST segment each unit's history into clean-to-cleaning cycles defined by the recorded cleaning events (a within-cycle basis that resets at each cleaning), NOT by absolute membrane age.
- **FR-003**: For each cleaning cycle, the feature MUST measure the decision lead time / warning window — the time between the system's first sustained fouling-onset warning and the actual cleaning event.
- **FR-004**: The feature MUST report the lead time as a distribution (not a single point), including its central tendency and spread across all cycles, so honest variance is visible.
- **FR-005**: The feature MUST define a warning as sustained (persisting for a pre-registered minimum duration) so that single-reading noise does not count as a warning.
- **FR-006**: The feature MUST score warnings against the real cleaning events and report precision / false-alarm rate and recall — a true positive being a sustained warning within a defined horizon before a real cleaning, a false positive a sustained warning with no cleaning in that horizon.
- **FR-007**: The warning-persistence and horizon parameters MUST be fixed (pre-registered) before the backtest run and reported alongside the results — they MUST NOT be tuned after the fact to improve the numbers.
- **FR-008**: The feature MUST validate the clean-membrane physics baseline against genuine clean-state operation (readings taken just after a cleaning, early in the cycle) and report a per-quantity baseline error between the physics-predicted clean behaviour and the measured actuals.
- **FR-009**: The feature MUST compare each per-quantity baseline error against a pre-declared acceptance threshold and state whether the baseline is fit to serve as the reference the fouling signals deviate from.
- **FR-010**: The feature MUST discover, from the data, which health signal is the most reliable leading indicator of fouling, and report a ranking of candidate signals with the evidence (effect size and cross-unit/cross-cycle consistency) supporting the top signal.
- **FR-011**: The signal ranking MUST be measured in this run from the history, NOT hard-coded or carried over as an assumption, even where prior exploration suggests a likely front-runner.
- **FR-012**: The feature MUST exclude from the fouling-indicator ranking any signal that moves for control-setpoint or operating-condition reasons rather than membrane health (e.g. a fixed-setpoint control variable, or a temperature-confounded raw signal), and MUST state why it was excluded.
- **FR-013**: Every published figure MUST be explicitly labeled as measured (the plant actual) or modeled (the physics prediction), and the deviation between them identified as the diagnostic signal.
- **FR-014**: The feature MUST present its findings with their limitations attached — including the honest distinction between detecting fouling onset and predicting the operator's cleaning decision, the measured size of the usable warning window, and the confounders in FR-015.
- **FR-015**: The feature MUST disclose known confounders rather than hide them, including: cleanings that may be scheduled/preventive rather than fouling-driven; any mismatch between the count of detected cycles and the count of recorded cleaning-event labels (reconciled to one cycle definition); and the exclusion of partial cycles at the edges of the history.
- **FR-016**: The feature MUST enforce the evidence-first gate: no headline accuracy, lead-time, precision, or recall claim about the twin's diagnostic performance MAY appear anywhere in the product until this validation has actually run and produced it. This feature IS that validating run.
- **FR-017**: The feature MUST reconcile the count of detected clean-to-cleaning cycles with the count of recorded cleaning-event labels and report against one agreed cycle definition, rather than mixing counts.
- **FR-018**: The feature MUST handle cleaning events for which there was no preceding warning as honest misses (counted against recall) and sustained warnings with no cleaning in horizon as honest false positives (counted against precision) — neither may be silently discarded.
- **FR-019**: When a unit has too few cleaning cycles to support a stable per-unit figure, the feature MUST report aggregate or low-confidence results rather than an over-confident per-unit number.
- **FR-020**: The feature's output MUST be a defensible, evidence-backed statement of the twin's diagnostic accuracy expressed against the count of real cleaning events it was validated on (e.g. "measured lead time and precision against N real cleaning events"), with caveats attached.
- **FR-021**: The feature MUST be advise-only and read-only: it evaluates and reports on historical data and MUST NOT actuate equipment or issue any control command.

### Key Entities *(include if feature involves data)*

- **Cleaning Event (CIP) Label**: A real, human-validated cleaning event from the facility history — the moment an operator cleaned a unit because fouling had become significant. The ground-truth label the backtest is scored against, and the boundary that closes one clean-to-cleaning cycle.
- **Clean-to-Cleaning Cycle**: A segment of a unit's history from a clean start (just after a cleaning) up to the next recorded cleaning event; the unit of analysis for lead time, warnings, and within-cycle fouling — resets at each cleaning, never absolute age.
- **Fouling-Onset Warning**: A sustained detection (persisting past a pre-registered minimum) that fouling has begun within a cycle; scored against the cleaning-event labels to produce lead time, precision, and recall.
- **Lead Time / Warning Window**: The measured span between the first sustained fouling-onset warning and the actual cleaning event — reported as a distribution, and framed as the onset-to-cleaning decision window, not as prediction of the exact cleaning date.
- **Detection Quality Metrics**: The scored outcomes of the backtest — precision / false-alarm rate, recall, and the lead-time distribution — each tied to the pre-registered parameters used to compute them.
- **Clean-Baseline Error**: The per-quantity error between the physics-predicted clean-membrane behaviour and the measured actuals in genuine clean states; the anchor validation for every downstream deviation, compared to a pre-declared acceptance threshold.
- **Leading-Indicator Ranking**: The evidence-backed ordering of candidate health signals by how reliably each precedes real cleanings (effect size, cross-unit consistency), with confounded/setpoint signals excluded and the reason stated.
- **Validation Findings**: The published, honest statement of the twin's diagnostic accuracy — the metrics above with their limitations, the onset-vs-cleaning framing, and the count of real cleaning events validated against — the artifact that satisfies the evidence-first gate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The feature produces a measured lead-time distribution (central tendency and spread) between first sustained fouling-onset warning and the real cleaning event, computed over the recorded cleaning cycles — not a single hard-coded number.
- **SC-002**: The feature reports precision / false-alarm rate and recall of the fouling-detection system scored against the real cleaning events, with the pre-registered warning-persistence and horizon parameters stated alongside.
- **SC-003**: The feature reports a per-quantity clean-baseline error against genuine clean-state operation, each figure labeled measured vs. modeled, and each compared to a pre-declared acceptance threshold.
- **SC-004**: The feature outputs an evidence-backed ranking identifying the most reliable leading indicator of fouling, derived from the history in this run (with effect size and cross-unit consistency), with confounded/setpoint signals excluded and the reason stated — zero rankings asserted without supporting evidence.
- **SC-005**: 100% of published headline figures are accompanied by their limitations and the explicit onset-vs-cleaning-decision framing; zero figures are published bare.
- **SC-006**: Zero headline accuracy, lead-time, precision, or recall claims about the twin's diagnostic performance exist anywhere in the product that were not produced by an actual run of this validation (evidence-first gate holds — verifiable by inspection).
- **SC-007**: The count of clean-to-cleaning cycles used in scoring is reconciled to one agreed cycle definition and reported explicitly, with partial edge cycles excluded — zero silent mixing of cycle and label counts.
- **SC-008**: The measured warning-window size is stated honestly (the span between detected onset and the real cleaning), with zero claims that the system predicts the exact cleaning date.
- **SC-009**: The feature yields a single defensible summary statement of diagnostic accuracy expressed against the count of real cleaning events validated (N), with caveats attached — the artifact that unlocks any downstream accuracy claim.

## Assumptions

- **This feature is the validating run (evidence before claim)**: Per Constitution Principle II (HARD GATE), no headline accuracy/lead-time/precision number is quoted anywhere in the product until this validation produces it. This feature is that run; its results are a real experiment with an unknown outcome, and a modest true number is preferred over an impressive unverified one.
- **Findings are to be MEASURED here, not hard-coded**: Prior exploration (docs/08 Part B) suggests detection can mark fouling *onset* well before the operator's cleaning decision — yielding a multi-week-to-months warning window — and that the strongest leading signal is a late-stage flux/performance shift. These are treated as **expected outcomes to verify**, not values to embed; the feature must derive lead time, precision, baseline error, and the leading indicator from the actual history.
- **Ground truth is authoritative**: The facility history provides the real cleaning (CIP) events used as labels; treating them as ground truth is a given, not an open question. The exact cleaning-event count is reconciled and reported by the feature (FR-017).
- **Onset detection ≠ cleaning-decision prediction**: The honest framing is that the system detects when fouling has *begun*, not when the operator will choose to clean; the onset-to-cleaning gap is reported as the decision window, and the claim is phrased as decision-window economics rather than foresight of the exact cleaning date.
- **Pre-registration is a methodology commitment**: Warning-persistence and horizon parameters are fixed before the run and reported with the results, to prevent fitting the parameters to a flattering number.
- **Compute mechanism is an implementation concern**: How the backtest, baseline comparison, and signal discovery are computed (in the analytics store in-place, in a service, or a mix) and which specific functions or libraries are used are decisions for `/speckit.plan`, per Constitution Principle I. This spec states only the outcomes and honesty contract, not the mechanism.
- **Baseline validation is clean-state only**: Baseline error is measured where the membrane is genuinely clean (low days-since-cleaning, just after a cleaning), because that is the anchor every fouling deviation is measured from; degraded-state prediction is out of scope for this validation.
- **Measured-vs-modeled labeling carries through**: Where a quantity is modeled rather than metered on a given unit, that provenance (set upstream) is preserved in this feature's figures and labeled accordingly, per Constitution Principle IV.
- **Confounders are disclosed, not hidden**: Preventive/scheduled cleanings, temperature-confounded signals, fixed-setpoint control variables, and partial edge cycles are surfaced as limitations rather than excluded quietly to improve the numbers.

## Dependencies

- **Feature 004 — Forecasting & Anomaly Detection (required upstream — the system under test)**: Provides the fouling-onset warnings, anomaly flags, and early-warning signals (with their evidence) that this feature backtests against the real cleaning events. Feature 004 deliberately publishes no accuracy/lead-time claim; this feature produces those measured figures. Without 004's signals there is nothing to validate.
- **Feature 003 — Physics Deviation Engine (required upstream — the baseline under validation)**: Provides the clean-membrane physics baseline whose clean-state error this feature measures, and the confound-free deviation the fouling warnings are built on. The baseline-error validation here doubles as the acceptance check for that baseline's calibration.
- **Feature 001 — Data Foundation (required upstream)**: Provides the harmonized time-series history across all 21 units, the clean-to-cleaning cycle markers (days-since-cleaning), and the catalogued real cleaning (CIP) events used as ground-truth labels (history 2019-01-01 → 2021-01-13, ~71 recorded CIP events across the 21 units).
- **Provisioned GCP environment (required, user-provided)**: Running the backtest, baseline comparison, and signal discovery, and persisting their results, requires a provisioned cloud analytics/compute environment already in place. That provisioning is owned by the future Cloud Platform feature (Feature 009) and **must be set up by the user**; it is a prerequisite, not an open question for this spec.
- **Downstream consumers (the claims this run unlocks)**: The conversational diagnostics/assistant, the operator-facing visual twin, and any external-facing pitch or documentation consume this feature's validated figures — lead time, precision, baseline error, leading indicator, and the honest caveats — as the ONLY sanctioned source of the twin's diagnostic-accuracy claims.
