# Feature Specification: Physics Deviation Engine

**Feature Branch**: `003-physics-deviation`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Physics Deviation Engine — Give every operating reading a physics-grounded interpretation by comparing it to what a clean, healthy membrane would be expected to produce under the same operating conditions. Raw readings alone are misleading: feed temperature, pressure, flow, and salinity all shift performance for reasons unrelated to membrane health, so a naive 'is this number high or low' view produces false alarms. This feature computes, for any unit and any operating condition, the expected clean-membrane performance (e.g. permeate flux, salt passage, pressure drop, specific energy), and then the deviation of the actual reading from that expectation. That deviation — not the raw value — becomes the honest health signal that downstream forecasting, anomaly detection, and diagnostics consume, because it removes operating-condition confounds. The engine must be fit-for-purpose and honest about its resolution: it models the unit at a lumped (whole-unit) level and must not claim element-by-element spatial diagnosis. It must produce a trustworthy baseline whose accuracy against real clean-state operation can be measured, and it must degrade gracefully to a simpler analytical estimate when the high-fidelity model is unavailable. The outcome: a confound-free 'expected vs actual' delta for every reading that makes early fouling detection possible and defensible."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A confound-free "expected vs actual" delta for every reading (Priority: P1)

Every raw reading a unit produces — permeate flux, salt passage, pressure drop, specific energy — is shaped as much by the day's feed temperature, pressure, flow, and salinity as by the membrane's actual health. An analyst looking at a raw number cannot tell whether a unit "looks worse today" because it is fouling or simply because the feed was colder. This feature answers, for any unit under its actual operating conditions, "what would a clean, healthy membrane have produced here?" — and reports the deviation of the actual reading from that expectation. That deviation, not the raw value, is the honest health signal: because it is measured against the same operating conditions, temperature/pressure/flow/salinity confounds cancel out, and what remains is attributable to membrane condition.

**Why this priority**: This is the feature's entire reason to exist and its minimum viable slice. Delivered alone — expected clean-membrane performance plus the actual-minus-expected delta for each reading — it already gives every downstream capability a confound-free signal to reason about, replacing the misleading raw view. Everything else (measurable accuracy, graceful degradation, provenance) hardens this core.

**Independent Test**: Take a set of readings for a unit spanning a range of feed temperatures and pressures, compute the expected clean-membrane value and the deviation for each, and confirm that (a) every reading receives an expected value and a delta for each supported metric, and (b) across readings where membrane health is comparable but feed conditions differ, the deviation stays materially stable while the raw values swing — demonstrating the confound is removed.

**Acceptance Scenarios**:

1. **Given** a unit reading with its operating conditions (feed temperature, pressure, flow, salinity, recovery), **When** the engine is asked to interpret it, **Then** it returns the expected clean-membrane performance for each supported metric (permeate flux, salt passage/rejection, pressure drop, specific energy) under those exact conditions, and the deviation of the actual reading from that expectation.
2. **Given** two readings of a comparably-healthy membrane taken at different feed temperatures, **When** each is interpreted, **Then** their raw values differ noticeably but their deviations are materially similar (the temperature confound is removed).
3. **Given** any of the 21 units on any recorded day, **When** downstream consumers request the health signal, **Then** they receive the expected-vs-actual deviation rather than the raw reading.

---

### User Story 2 - A trustworthy baseline whose accuracy can be measured (Priority: P1)

The delta is only as honest as the "expected clean-membrane" baseline behind it. This story makes the baseline trustworthy and, crucially, *measurable*: the expected values are anchored to how each membrane bank actually behaves when it is clean, and the baseline's accuracy against real clean-state operation can be quantified rather than asserted. Membrane condition is tracked over the clean→cleaning cycle (a saw-tooth that resets at each cleaning event), not as absolute membrane age, so "clean" is defined by where a unit sits in its current cycle. The result is an expected value a reviewer can defend, with a stated error against real clean operation.

**Why this priority**: A delta computed from an unvalidated baseline is a confident guess. Anchoring the baseline to each bank's real clean behavior, cycling it correctly, and reporting a measurable clean-state error are what let the whole downstream chain treat the deviation as evidence. It is co-essential with Story 1 — the delta and its trustworthiness ship together.

**Independent Test**: Restrict to readings taken when a unit is known to be operating clean (early in its clean→cleaning cycle), compute expected-vs-actual, and confirm the deviations cluster near zero within a reported error bound — and that the same baseline, given the same clean-state inputs, reproduces the same expected values.

**Acceptance Scenarios**:

1. **Given** readings from a unit operating in a known-clean part of its cycle, **When** expected-vs-actual is computed, **Then** the deviations are near zero and an error metric of expected-vs-real-clean operation is reported.
2. **Given** a unit's position in its clean→cleaning cycle, **When** the baseline is applied, **Then** membrane condition is represented by cycle position (resetting at each cleaning event), never by absolute membrane age.
3. **Given** the same unit, operating conditions, and clean-baseline parameters, **When** the expected value is computed twice, **Then** the two results are identical (reproducible baseline).

---

### User Story 3 - Graceful degradation when the high-fidelity model is unavailable (Priority: P2)

The engine must never leave a reading un-interpreted just because its most detailed model cannot run (unavailable, too slow, or a condition it cannot solve). When the high-fidelity baseline is unavailable, the engine falls back to a simpler analytical estimate of expected clean-membrane performance and still returns a deviation — clearly labeled as the lower-fidelity path so consumers know the estimate is coarser. Availability of *a* trustworthy-enough signal beats an occasional gap.

**Why this priority**: Robustness makes the confound-free signal dependable enough for always-on downstream use, but it layers on the working delta (Stories 1–2). The core value exists without it; this guarantees the value is always present and honestly labeled when the best model is out of reach.

**Independent Test**: Force the high-fidelity path to be unavailable for a set of readings and confirm the engine still returns an expected value and a deviation for each, each marked as the analytical-fallback (reduced-fidelity) result rather than failing or returning nothing.

**Acceptance Scenarios**:

1. **Given** a reading the high-fidelity model cannot produce, **When** the engine interprets it, **Then** it returns an analytical-estimate expected value and deviation, labeled as reduced fidelity, instead of failing.
2. **Given** a mix of readings where some resolve at high fidelity and others fall back, **When** results are returned, **Then** each result states which fidelity level produced it.
3. **Given** the fallback is in use, **When** a downstream consumer reads the deviation, **Then** the reduced-fidelity label travels with the value so the coarser confidence is visible, not hidden.

---

### User Story 4 - Honest resolution and full provenance on every delta (Priority: P2)

Every deviation the engine emits declares what it is and what it is not. It carries provenance — which metric deviated, the magnitude relative to the clean baseline, the operating conditions used to compute the expectation, whether the inputs were measured or modeled, and the fidelity level — so no bare number ever circulates. And it is honest about resolution: the engine models each unit at a lumped, whole-unit level and makes **no** element-by-element spatial-diagnosis claim. A reviewer can always see the basis of a delta and can never be misled into thinking it localizes a fault to a specific element.

**Why this priority**: Provenance and an honest resolution boundary are what make the signal defensible rather than merely plausible, but they are a property of how Stories 1–3 are shaped. The delta can be produced first and then dressed with its evidence and scope limits before any stakeholder-facing use.

**Independent Test**: Inspect a sample of deviation outputs and confirm each includes the metric, magnitude vs baseline, operating conditions used, measured/modeled flags, and fidelity level — and that no output asserts or implies element-level localization (all are whole-unit).

**Acceptance Scenarios**:

1. **Given** any deviation output, **When** it is inspected, **Then** it carries the metric, its magnitude versus the clean baseline, the operating conditions used, measured-vs-modeled provenance for its inputs, and the fidelity level.
2. **Given** a deviation for a fouling-sensitive metric, **When** it is surfaced to a consumer, **Then** it is described at whole-unit resolution and never as an element-by-element diagnosis.
3. **Given** a required input was itself modeled rather than measured, **When** the deviation is produced, **Then** that modeled provenance is stated on the output.



### Edge Cases

- **High-fidelity model unavailable**: The engine degrades to the analytical estimate and still returns a labeled, reduced-fidelity deviation — it never returns nothing (supports User Story 3).
- **Operating conditions outside the validated range**: When a reading's conditions fall outside the range the baseline is trusted for, the engine flags the result as low-confidence/out-of-range rather than silently extrapolating a confident number.
- **Missing operating-condition inputs**: When the inputs needed to compute an expectation are absent for a reading, the deviation is represented as explicitly unavailable — never fabricated from assumed inputs.
- **Metric with no measured actual (e.g. energy on banks that do not meter it)**: The expected clean-membrane value is still computed and labeled modeled; a deviation is produced only where an actual exists to compare against, otherwise the actual side is marked not-measured.
- **Immediately after a cleaning event**: Cycle position resets, so the membrane is treated as freshly clean and deviations are expected to return near zero; a persistent post-cleaning deviation is itself a meaningful (labeled) signal, not an error.
- **Clean-state calibration data is thin for a bank**: The baseline still produces expected values but the reduced calibration confidence is reflected in the reported error/provenance rather than hidden.
- **Reading exactly at a cycle boundary (cleaning day)**: The reading is attributed to a single, well-defined cycle position deterministically, so the same reading always yields the same expected value.
- **Element-level question asked of the engine**: A request for element-by-element localization is refused/reframed to whole-unit resolution rather than answered with a fabricated spatial claim.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: For any unit under any given operating condition, the engine MUST compute the expected clean-membrane performance for each supported metric (permeate flux, salt passage/rejection, pressure drop, specific energy).
- **FR-002**: The engine MUST compute the deviation of each actual reading from its expected clean-membrane value, per metric, and expose that deviation as the health signal (distinct from the raw reading).
- **FR-003**: The expected value MUST be conditioned on the same operating conditions as the actual reading (feed temperature, pressure, flow, salinity, recovery), so that operating-condition confounds are removed from the deviation.
- **FR-004**: The engine MUST produce a deviation (or an explicit unavailable marker) for every reading of every one of the 21 units, so downstream capabilities can consume the confound-free delta rather than raw values.
- **FR-005**: The engine MUST express each deviation in both absolute and normalized/relative terms, so consumers can threshold and rank across metrics and units.
- **FR-006**: The engine MUST represent membrane condition by position in the clean→cleaning cycle (a saw-tooth that resets at each cleaning event), NOT by absolute membrane age.
- **FR-007**: The baseline MUST represent a clean, healthy membrane (anchored to clean-state operation), so that the deviation isolates degradation rather than baseline miscalibration.
- **FR-008**: The clean-baseline parameters MUST be calibratable per membrane bank from that bank's own clean-state operation, so expected values reflect each unit's real clean behavior rather than generic defaults.
- **FR-009**: Each deviation output MUST carry provenance/evidence: the metric, its magnitude versus the clean baseline, the operating conditions used to compute the expectation, and measured-vs-modeled flags for its inputs.
- **FR-010**: Each expected value and deviation MUST be labeled with the fidelity level that produced it (high-fidelity vs analytical estimate).
- **FR-011**: When the high-fidelity model is unavailable, the engine MUST degrade gracefully to a simpler analytical estimate and still return a deviation, labeled as reduced fidelity — it MUST NOT fail to produce a signal.
- **FR-012**: The engine MUST operate at whole-unit (lumped) resolution and MUST NOT produce or imply element-by-element spatial diagnosis; requests for element-level localization MUST be refused or reframed to whole-unit resolution.
- **FR-013**: The baseline's accuracy against real clean-state operation MUST be measurable — the engine MUST support comparing expected-vs-actual under known-clean conditions and reporting the resulting error metric.
- **FR-014**: When a reading's operating conditions fall outside the range the baseline is validated for, the engine MUST flag the result as low-confidence/out-of-range rather than silently extrapolating.
- **FR-015**: When the operating-condition inputs required to compute an expectation are missing for a reading, the engine MUST represent the deviation as explicitly unavailable and MUST NOT fabricate a delta from assumed inputs.
- **FR-016**: The engine MUST be deterministic and reproducible: the same unit, operating conditions, and clean-baseline parameters MUST yield the same expected value and the same deviation.
- **FR-017**: The engine MUST expose expected values and deviations in a form that downstream forecasting, anomaly detection, and diagnostics can consume as their input signal.
- **FR-018**: The engine MUST be advise-only and read-only: it produces interpretations of readings and MUST NOT actuate equipment or issue any control command.
- **FR-019**: When the high-fidelity model is used, the engine MUST record the physics solver's convergence/diagnostic status as part of the deviation's provenance, and a non-converged or ill-posed solve MUST trigger the labeled analytical-fallback path (FR-011) rather than emit a number presented as high-fidelity — solver health is part of the evidence, never hidden.
- **FR-020**: The clean-membrane baseline SHOULD be grounded in real membrane-element specifications (a vendor membrane model appropriate to BWRO) rather than generic property defaults, and the membrane basis used MUST be recorded in the expected value's provenance so the baseline's credibility is traceable.
- **FR-021**: The expected specific-energy baseline MUST account for energy-recovery devices on the banks that have them (F–G), so the energy expectation is not overstated for ERD-equipped units and the resulting energy deviation stays confound-free.
- **FR-022**: Each expected value and deviation SHOULD carry credibility metadata alongside its provenance — at minimum the validation basis of the baseline (e.g. plant-clean-data, vendor-spec, literature, or assumed) and its calibration status (calibrated vs. preliminary) — so consumers can weigh how much trust a figure has earned (operationalizes Constitution Principles II and IV).

### Key Entities *(include if feature involves data)*

- **Operating Condition**: The set of inputs that define the state a reading was taken under — feed temperature, pressure, flow, salinity, recovery, and the unit's position in its clean→cleaning cycle. The expectation is always computed relative to these.
- **Clean-Membrane Baseline (Expected Performance)**: The expected performance of a clean, healthy membrane under a given operating condition, per metric (flux, salt passage/rejection, pressure drop, specific energy). Anchored to each bank's clean-state operation; carries a fidelity level and provenance.
- **Deviation (Expected-vs-Actual Delta)**: The actual reading minus the expected clean-membrane value, per metric, in absolute and normalized terms. The confound-free health signal downstream capabilities consume; carries its evidence (metric, magnitude vs baseline, conditions used, measured/modeled, fidelity).
- **Baseline Calibration**: The per-bank parameters, fitted from clean-state operation, that make the expected values reflect real clean behavior; carries a calibration-confidence/error indication.
- **Fidelity & Provenance Envelope**: The metadata that travels with every expected value and deviation — high-fidelity vs analytical-estimate, measured-vs-modeled inputs, out-of-range/low-confidence flags, whole-unit resolution, the physics-solver convergence/diagnostic status, the membrane basis used, and credibility metadata (validation basis and calibration status) — ensuring no bare number circulates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every reading across all 21 units receives an expected-vs-actual deviation for each supported metric, or an explicit unavailable marker — 100% coverage, zero silent gaps.
- **SC-002**: Under known clean-state operating conditions, expected-vs-actual deviations cluster near zero within a reported, reproducible error bound (the baseline's clean-state accuracy is measured, not asserted).
- **SC-003**: The deviation is confound-free: across readings of comparably-healthy membranes taken under materially different feed conditions, the deviation stays within a small band while the raw values swing widely — demonstrating operating-condition confounds are removed.
- **SC-004**: 100% of deviation outputs carry complete provenance (metric, magnitude vs baseline, operating conditions used, measured/modeled flags, fidelity level); zero bare numbers are emitted.
- **SC-005**: The engine returns a labeled result for every reading it is asked to interpret — high-fidelity, analytical-fallback, out-of-range/low-confidence, or explicitly unavailable — with zero unhandled failures, including when the high-fidelity model is unavailable.
- **SC-006**: Zero outputs make element-level spatial-diagnosis claims; every output is at whole-unit resolution.
- **SC-007**: Reproducibility: identical inputs (unit, operating conditions, clean-baseline parameters) yield identical expected values and deviations, every run.
- **SC-008**: On the recorded clean→cleaning cycles, the fouling-sensitive deviation is directionally distinguishable from the clean baseline ahead of the cleaning event, establishing the delta as a usable early-fouling signal (precise lead-time and precision figures are produced by the downstream validation feature, not claimed here).

## Assumptions

- **High-fidelity model choice is an implementation concern**: The primary "expected clean-membrane" values are produced by a physics simulation of the single-stage BWRO unit (the WaterTAP `ReverseOsmosis0D` model with a NaCl property pack, per [docs/03-physics-engine.md](../../docs/03-physics-engine.md)). This spec names the model only here for grounding; the choice does not belong in the requirements.
- **High-fidelity toolset option — vendored deterministic RO simulator**: The high-fidelity path MAY adopt a vendored, version-isolated snapshot of an open-source (MIT) deterministic RO-simulation toolset (the Puran Water `watertap-engine` patterns) for its solver-hygiene pipeline (degrees-of-freedom → scaling → initialization → diagnostics → solve → relaxed-solve recovery), its vendor membrane catalog, its energy-recovery-device unit for ERD-equipped banks, and — where a stage's feed must be derived rather than measured — its multi-stage RO-train template. This is named here only for grounding; the requirements are robust convergence (FR-019), real-membrane grounding (FR-020), correct ERD energy (FR-021), and credibility metadata (FR-022) — not the specific toolset. Adopting it means maintaining our own fork; it is not a live runtime dependency.
- **Analytical fallback choice is an implementation concern**: The reduced-fidelity path is a simplified analytical RO estimate (e.g. van't Hoff osmotic pressure with flux ∝ (ΔP − Δπ), pure-numeric). Named here only; the requirement (FR-011) is the graceful degradation, not the specific method.
- **Supported metrics**: Permeate flux, salt passage/rejection, pressure drop (normalized ΔP / transmembrane pressure), and specific energy. Additional derived metrics may be added later without changing these requirements.
- **Energy provenance**: Actual energy is metered only on some banks (F–G); expected energy is computed fleet-wide and labeled modeled where no measured actual exists. An energy deviation is produced only where a measured actual is available to compare against (supports FR-009 measured-vs-modeled honesty).
- **"Clean" is defined by cycle position**: Clean-state readings are identified from early positions in the clean→cleaning cycle (low days-since-cleaning), used both to calibrate and to validate the baseline. Exact thresholds are tunable at planning time and do not change the requirements.
- **Deviation is the health signal; cause-attribution is a separable, additive layer**: The core engine isolates *that* performance deviates from clean expectation, and forecasting its trajectory remains a downstream job. Attributing the deviation to a fouling *mechanism* is handled by downstream features.
- **Accuracy/lead-time claims are deferred**: This feature makes the clean-state error *measurable* (SC-002) and the signal *available* (SC-008); published precision, recall, and fouling lead-time figures are produced by the downstream fouling-validation feature after its backtest actually runs (evidence before claim).
- **Baseline caching is acceptable**: Repeated expectations for the same operating condition may be reused; caching does not change any requirement here.
- **Compute placement is out of scope**: Whether expected-vs-actual is computed in the analytics store, in a dedicated service, or a mix is an implementation decision for planning, not a requirement of this spec.

## Dependencies

- **Feature 001 — Data Foundation (required upstream)**: Provides the harmonized operating-condition inputs for every reading — feed temperature, pressure, flow, salinity, recovery, days-since-cleaning cycle, and cleaning-event markers, across all 21 units. Without these conditioned inputs there is nothing to compute an expectation against.
- **Provisioned GCP compute environment (required, user-provided)**: Computing the high-fidelity and analytical baselines and persisting expected-vs-actual results requires a provisioned cloud compute/analytics environment already in place. That provisioning is owned by the future Cloud Platform feature and **must be set up by the user**; it is a prerequisite, not an open question for this spec.
- **Vendored physics toolset (implementation option, maintained by us)**: If the high-fidelity path adopts the vendored MIT deterministic RO simulator (see Assumptions), it is a build-time/offline dependency we fork and maintain — the upstream project is archived, so no upstream support is assumed. It runs as separate physics compute that writes baseline surfaces for the analytics store to consume; it is not part of the AI-compute layer (Constitution Principle I).
- **Downstream dependents**: Forecasting and anomaly/fouling-onset detection, the fouling-validation backtest, and the conversational diagnostics/assistant all consume the expected-vs-actual deviation as their confound-free input signal. The deviation contract defined here is their shared input, so changes to it ripple to all of them.
