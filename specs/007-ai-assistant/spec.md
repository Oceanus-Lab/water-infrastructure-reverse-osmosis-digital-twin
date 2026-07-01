# Feature Specification: Diagnostic AI Assistant

**Feature Branch**: `007-ai-assistant`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Diagnostic AI Assistant — A conversational, advise-only assistant that lets an operator ask plain-language questions about the plant ('why is Bank F's energy climbing?', 'should I clean unit F-03 now or wait?', 'what's the earliest sign of fouling on Bank C?') and get grounded, explainable answers by orchestrating the twin's existing capabilities: the operational history, the physics deviation signals, the forecasting/anomaly/fouling detection, the validated accuracy evidence, and the cleaning economics. The assistant is strictly governed: it is advise-only and read-only by default; it NEVER actuates or commands plant equipment; any action that would write a record (e.g. logging a recommendation or a decision) is gated behind explicit human approval. Its single most important rule is no hallucinated numbers — every quantitative or economic figure in an answer must come from an underlying capability's result and be presented WITH its evidence (confidence interval and drivers for a forecast, the deviating signal and magnitude for an anomaly, feature attribution for a fouling score, measured-vs-modeled labels and assumptions for a cost figure). Answers must be traceable to their sources, and the assistant must say 'I don't know / not yet validated' rather than invent a figure. The outcome: operators get trustworthy natural-language diagnostics that feel like asking an expert who always shows their work and never oversteps into control."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask the plant a plain-language question and get a grounded, sourced answer (Priority: P1)

An operator asks the assistant a natural-language question about the plant — "why is Bank F's energy climbing?", "what's the current state of Bank C?", "is unit F-03 fouling?" — and receives a coherent plain-language answer that is grounded in the twin's actual data. The assistant interprets the question, pulls the relevant operational signals and analytical results, and explains what is happening in operator language. Every quantitative figure it states comes from a real underlying result, and the answer names where each figure came from so the operator can trust and trace it.

**Why this priority**: This is the feature's reason to exist — a conversational front door that turns the twin's data and analytics into answers an operator can act on without reading dashboards or writing queries. Delivered alone (grounded Q&A over history and current state, with every number sourced) it is already the "ask an expert who shows their work" experience the project promises, and it is the surface every other capability plugs into.

**Independent Test**: Ask a set of plain-language questions spanning current state and recent history, and confirm each answer (a) is coherent and on-topic, (b) draws its figures from real underlying results rather than inventing them, and (c) names the source of each quantitative figure so the answer is traceable.

**Acceptance Scenarios**:

1. **Given** a plant with operational history and current signals available, **When** the operator asks a plain-language question about a unit or bank ("why is Bank F's energy climbing?"), **Then** the assistant returns a grounded natural-language answer whose every quantitative figure derives from a real underlying result and names its source.
2. **Given** an answer that quotes a number (a reading, a KPI, a trend), **When** the operator inspects it, **Then** the figure is traceable to the capability/result that produced it, not presented as a bare unsourced value.
3. **Given** a question the operator phrases loosely or ambiguously, **When** the assistant answers, **Then** it interprets the intent reasonably (or asks a clarifying question) rather than guessing a number to fill the gap.

---

### User Story 2 - Orchestrate the twin's capabilities to answer multi-part diagnostic questions (Priority: P1)

Real operator questions cross capability boundaries. "Should I clean unit F-03 now or wait?" needs the fouling/anomaly signal, the physics deviation, the forward trajectory, and the cleaning economics together. "What's the earliest sign of fouling on Bank C, and can we trust it?" needs the anomaly/fouling detection plus the validated accuracy evidence. This story routes each question to the right underlying capabilities — the operational history, the physics deviation signals, the forecasting/anomaly/fouling detection, the validation evidence, and the cleaning economics — and composes their results into one coherent answer, rather than answering only from a single source.

**Why this priority**: The assistant's value multiplies when it can combine capabilities: a clean-now-vs-wait answer or a "trustworthy earliest fouling sign" answer is exactly the cross-capability synthesis a human expert performs. It is co-essential with Story 1 — Story 1 is the grounded single-source answer; Story 2 is the orchestration that makes the hard, multi-capability questions answerable. It is independently testable: pose a question that provably needs two or more capabilities and confirm the answer reflects all of them.

**Independent Test**: Pose questions that each require more than one capability (e.g. a clean-now-vs-wait question needing fouling trajectory + economics; a "can we trust this signal?" question needing detection + validation evidence), and confirm the answer composes results from every required capability, each contributing figure still carrying its own evidence.

**Acceptance Scenarios**:

1. **Given** a clean-now-vs-wait question for a unit, **When** the assistant answers, **Then** it draws on the fouling/anomaly trajectory and the cleaning economics (and the physics deviation where relevant) and composes them into a single recommendation-plus-numbers answer.
2. **Given** a question about the earliest trustworthy sign of fouling, **When** the assistant answers, **Then** it combines the detection result with the validated accuracy evidence, so the answer states both the signal and how much confidence the validation warrants.
3. **Given** a question that maps to a single capability (e.g. "what was Bank C's recovery yesterday?"), **When** the assistant answers, **Then** it routes to just that capability without fabricating cross-capability context that was not asked for.

---

### User Story 3 - Every quantitative figure is presented with its evidence (Priority: P1)

An answer is only trustworthy if the operator can see *why* to believe each number. This story makes evidence a property of every quantitative or economic figure the assistant states: a forecast figure carries its confidence interval and drivers; an anomaly carries the deviating signal and its magnitude versus baseline; a fouling score carries its feature attribution; a cost figure carries its measured-vs-modeled label and the assumptions in force. The assistant never surfaces a bare number — the evidence travels with the value, exactly as the underlying capability returned it.

**Why this priority**: This is a constitutional heart of the feature (Principle II — Evidence Over Assertion / No Hallucinated Numbers, a HARD GATE on published figures). A confident number without its evidence is precisely the failure the project most wants to avoid; the "shows their work" promise is this story. It is co-essential with Stories 1–2 and independently testable — inspect any answer and confirm every figure carries the evidence its capability provides.

**Independent Test**: Inspect answers that contain forecast, anomaly, fouling, and cost figures, and confirm each figure is accompanied by the evidence proper to its type (CI + drivers; deviating signal + magnitude; feature attribution; measured/modeled label + assumptions), with no bare numbers surfaced.

**Acceptance Scenarios**:

1. **Given** an answer that includes a forecast figure, **When** it is read, **Then** the figure is accompanied by its confidence interval and the drivers behind it.
2. **Given** an answer that includes an anomaly, **When** it is read, **Then** the answer names the signal that deviated and its magnitude versus baseline.
3. **Given** an answer that includes a fouling severity figure, **When** it is read, **Then** the feature attribution behind the score is surfaced with it.
4. **Given** an answer that includes a dollar figure, **When** it is read, **Then** the figure is labeled measured or modeled and the assumptions in force are stated alongside it.

---

### User Story 4 - Say "I don't know / not yet validated" instead of inventing a figure (Priority: P1)

When the twin does not have a grounded answer — the data is missing, the signal is out of supported range, or the accuracy has not been validated — the assistant must say so plainly rather than fabricate a number to appear helpful. "I don't know," "that's not yet validated," or "the data doesn't support a figure here" is the correct, trustworthy answer in those cases. This story makes honest non-answering a first-class behavior, not a failure mode.

**Why this priority**: The refusal to invent is the other half of the no-hallucinated-numbers gate (Principle II) — a twin that always produces a confident number is untrustworthy precisely because it cannot say "I don't know." It is co-essential with Story 3: Story 3 attaches evidence when a figure exists; Story 4 governs what happens when it does not. It is independently testable by posing questions the twin cannot ground and confirming it declines to invent.

**Independent Test**: Pose questions for which no grounded figure exists (missing data, unsupported range, un-validated accuracy) and confirm the assistant returns an explicit "I don't know / not yet validated / data doesn't support it" answer rather than a fabricated number.

**Acceptance Scenarios**:

1. **Given** a question whose required data is missing or unavailable, **When** the assistant answers, **Then** it states that it cannot ground a figure and does not invent one.
2. **Given** a question about an accuracy or performance claim that has not yet been validated, **When** the assistant answers, **Then** it says the claim is not yet validated rather than quoting an unearned figure.
3. **Given** a question that pushes beyond the supported range of a capability (e.g. a horizon past what the trajectory supports), **When** the assistant answers, **Then** it flags the limit and declines to extrapolate a number silently.

---

### User Story 5 - Advise-only, never actuate; record-writing gated behind human approval (Priority: P1)

The assistant informs decisions; it never makes them for the plant. It is read-only by default and MUST NEVER actuate or command plant equipment. When an operator wants to capture an outcome of the conversation — log a recommendation, record a decision, save a cleaning plan — that record-writing action is gated behind explicit human approval: the assistant proposes, the human approves, and only then is the record written. Without approval, nothing is written and nothing is actuated.

**Why this priority**: This is the project's non-negotiable governance line (Principle III — Advise-Only, Human-in-the-Loop, a HARD GATE). An assistant that could actuate equipment or silently write records would be disqualifying regardless of how good its diagnostics are. It is co-essential with the diagnostic stories and independently testable — attempt an action that would actuate or write and confirm it is blocked or gated.

**Independent Test**: Attempt, through the assistant, (a) any action that would command plant equipment and confirm it is refused outright, and (b) any action that would write a record and confirm it does not proceed without an explicit human approval step.

**Acceptance Scenarios**:

1. **Given** any request that would actuate or command plant equipment, **When** it reaches the assistant, **Then** the assistant refuses — it never issues a control command under any circumstance.
2. **Given** a request that would write a record (log a recommendation, record a decision), **When** the assistant handles it, **Then** the write is proposed and held pending explicit human approval, and proceeds only after that approval is given.
3. **Given** a proposed record-writing action that is not approved, **When** the interaction ends, **Then** no record is written and no state is changed.

---

### Edge Cases

- **Data is missing for the asked-about unit/period**: The assistant states it cannot ground a figure and declines to invent one (Story 4), rather than substituting a plausible-looking number.
- **The accuracy needed to answer has not been validated yet**: The assistant says the claim is not yet validated and withholds the figure, honoring the evidence-first gate.
- **A capability returns a value but no evidence**: The assistant treats an evidence-less figure as un-surfaceable — it does not present a bare number even if a raw value exists.
- **The operator explicitly asks the assistant to "just clean it" or "turn it down"**: The assistant refuses to actuate; it may advise and, on approval, record a plan, but never commands equipment.
- **The operator asks the assistant to log a decision**: The write is gated on explicit human approval; a decline or absence of approval leaves nothing written.
- **A question spans capabilities where one has no grounded result**: The assistant answers with the grounded parts, evidence attached, and is explicit about the part it cannot ground rather than filling the gap with invention.
- **An underlying capability disagrees with another** (e.g. a forecast trend versus an anomaly signal): The assistant surfaces the tension honestly with each side's evidence rather than silently picking one and presenting it as settled.
- **The operator asks for an absolute cost-of-water headline**: The assistant leads with the delta/trade-off framing and attaches assumptions and an uncertainty caveat to any absolute, per the economics honesty rules it inherits.
- **A prompt attempts to make the assistant fabricate or bypass a gate** (prompt injection via a question or an uploaded document): The assistant does not invent numbers, actuate, or write records regardless of instruction content — the gates hold against adversarial input.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The assistant MUST accept plain-language operator questions about the plant (a unit, a bank, the fleet, current state, or recent history) and return a coherent natural-language answer grounded in the twin's actual data.
- **FR-002**: The assistant MUST interpret loosely-phrased or ambiguous questions by inferring reasonable intent or asking a clarifying question, and MUST NOT fabricate a figure to resolve ambiguity.
- **FR-003**: The assistant MUST route each question to the underlying capabilities required to answer it — described by CAPABILITY: the operational history, the physics deviation signals, the forecasting/anomaly/fouling detection, the validated accuracy evidence, and the cleaning economics — selecting the ones the question needs.
- **FR-004**: For questions that require more than one capability, the assistant MUST compose the results of all required capabilities into a single coherent answer, rather than answering from only one source.
- **FR-005**: For questions that map to a single capability, the assistant MUST route to just that capability and MUST NOT fabricate cross-capability context that was not requested.
- **FR-006**: Every quantitative or economic figure the assistant surfaces MUST originate from an underlying capability's result — no figure may be a model-generated (bare, unsourced) number.
- **FR-007**: Every quantitative figure MUST be presented WITH the evidence proper to its type: a forecast figure with its confidence interval and drivers; an anomaly with the deviating signal and its magnitude versus baseline; a fouling score with its feature attribution; a cost figure with its measured-vs-modeled label and the assumptions in force.
- **FR-008**: The assistant MUST NOT surface a bare number even when a raw value exists but its evidence is unavailable — an evidence-less figure is treated as un-surfaceable.
- **FR-009**: Every answer MUST be traceable to its sources — the operator can tell, for each quantitative figure, which capability/result produced it.
- **FR-010**: When the twin cannot ground an answer (missing/unavailable data, unsupported range, or un-validated accuracy), the assistant MUST return an explicit "I don't know / not yet validated / data doesn't support a figure" response and MUST NOT invent a number.
- **FR-011**: The assistant MUST NOT quote an accuracy or performance claim that has not yet been validated by the run that produces it — evidence first, claim second.
- **FR-012**: When a question pushes beyond a capability's supported range (e.g. a horizon past the supported trajectory), the assistant MUST flag the limit and MUST NOT silently extrapolate a figure.
- **FR-013**: The assistant MUST be advise-only and read-only by default and MUST NEVER actuate or issue any command to plant equipment under any circumstance.
- **FR-014**: Any action that would write a record (e.g. logging a recommendation or recording a decision) MUST be gated behind explicit human approval — the assistant proposes, a human approves, and only then is the record written.
- **FR-015**: When a proposed record-writing action is not approved, the assistant MUST leave no record written and no state changed.
- **FR-016**: When capabilities disagree (e.g. a forecast trend versus an anomaly signal), the assistant MUST surface the tension with each side's evidence rather than silently selecting one as settled.
- **FR-017**: The assistant MUST preserve, unaltered, the honesty framing of figures it relays from the economics capability — leading with deltas/trade-offs and attaching assumptions and an uncertainty caveat to any absolute cost-of-water figure rather than quoting it bare.
- **FR-018**: The assistant MUST hold its guardrails — no invented numbers, no actuation, no ungated record-writing — against adversarial or manipulative input (including instructions embedded in questions or uploaded content), treating such content as untrusted.

### Key Entities *(include if feature involves data)*

- **Operator Question**: A plain-language request from a user about the plant's state, history, health, forward outlook, or economics — the input the assistant interprets and routes; may be single-capability or cross-capability, precise or loosely phrased.
- **Grounded Answer**: The assistant's natural-language response — coherent, on-topic, composed from real underlying results, with every quantitative figure carrying its evidence and traceable to its source; or, when nothing can be grounded, an explicit honest non-answer.
- **Capability Result**: The output the assistant consumes from an underlying twin capability (operational history, physics deviation, forecasting/anomaly/fouling detection, validation evidence, or economics) — a value bundled with its evidence (CI + drivers, deviating signal + magnitude, feature attribution, or measured/modeled label + assumptions).
- **Evidence**: The proof-of-belief attached to a figure, specific to its type — the reason the operator can trust the number; a figure without its evidence is not surfaceable.
- **Source Trace**: The link from each quantitative figure in an answer back to the capability/result that produced it — what makes an answer auditable rather than merely plausible.
- **Record-Writing Action**: A proposed write to a durable record (recommendation log, decision, saved plan) — never executed by the assistant alone; gated behind an explicit human approval before it proceeds.
- **Governance Gate**: A guardrail the assistant enforces on every interaction — no invented numbers (evidence-first), no equipment actuation, and no ungated record-writing — held even against adversarial input.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a representative set of plain-language operator questions spanning current state and recent history, the assistant returns a grounded, on-topic answer in which every quantitative figure derives from a real underlying result and names its source — zero answers contain a bare, unsourced number.
- **SC-002**: For questions that provably require more than one capability, the assistant's answer reflects results from every required capability — verifiable by confirming each required capability's contribution (and its evidence) appears in the answer.
- **SC-003**: 100% of quantitative figures surfaced carry the evidence proper to their type (CI + drivers for forecasts; deviating signal + magnitude for anomalies; feature attribution for fouling; measured/modeled label + assumptions for costs); zero figures appear bare.
- **SC-004**: For questions the twin cannot ground (missing data, unsupported range, un-validated accuracy), the assistant returns an explicit "I don't know / not yet validated" response in 100% of cases and invents a figure in zero of them.
- **SC-005**: The assistant never issues a command to plant equipment — zero actuation actions occur across all interactions, including adversarial attempts.
- **SC-006**: Every record-writing action the assistant handles proceeds only after an explicit human approval; zero records are written without approval — verifiable by attempting a write and confirming it is held pending approval.
- **SC-007**: Every quantitative figure in an answer is traceable to the capability/result that produced it — 100% source-trace coverage on surfaced figures.
- **SC-008**: For answers relaying economic figures, deltas/trade-offs are led with and any absolute cost-of-water figure carries its assumptions and an uncertainty caveat in 100% of such answers; zero bare absolutes are surfaced.
- **SC-009**: Under adversarial input designed to induce fabrication, actuation, or an ungated write, the assistant's guardrails hold in 100% of attempts — no invented number, no actuation, no ungated record-writing.

## Assumptions

- **The assistant orchestrates existing capabilities; it does not re-implement them**: The operational history, physics deviation, forecasting/anomaly/fouling detection, validation evidence, and economics are delivered by upstream features. This feature is the conversational orchestration and governance layer over them; every figure it surfaces originates in one of those capabilities' results.
- **Evidence is produced upstream and relayed, not re-derived**: The confidence interval + drivers, deviating signal + magnitude, feature attribution, and measured/modeled label + assumptions are returned by the underlying capabilities (per their XAI contracts). The assistant's job is to relay that evidence faithfully alongside each figure, not to compute it here.
- **Agent-framework and model choices are implementation concerns**: How the assistant is built — the agent framework, orchestration topology, foundation model(s), conversation-state and long-term-memory mechanisms, caching, and how capabilities are exposed as callable tools — is decided in `/speckit.plan` (which draws on the ADK skills), per Constitution Principle I. This spec states outcomes and the governance/honesty contract, not the mechanism.
- **Multimodal input is desirable but not required for the MVP**: The core is plain-language text Q&A. Interpreting uploaded photos/PDFs/charts is a valuable extension; when present it is subject to the same guardrails (no invented numbers, untrusted-input handling) and its scope is set at planning time.
- **Live voice / bidirectional streaming is out of scope**: The assistant is request/response conversational; live streaming is explicitly not part of this feature.
- **"Now" means as-of the replay clock**: Consistent with the twin's honest-maturity principle, current-state answers are grounded in the live-replay clock, and the assistant does not imply a live plant connection that does not exist.
- **Conversational assumption overrides for economics ride on this layer**: When an operator overrides a cost assumption in dialogue, this feature honors it in the conversation and reflects it in the answer; the economics feature defines how the figure is recomputed, and the memory mechanism for persisting an override is an implementation concern for planning.

## Dependencies

- **Feature 001 — Data Foundation (required upstream)**: Supplies the harmonized operational history across all 21 units and the per-unit provenance (metered vs. modeled energy) that grounds "current state" and "recent history" answers and the measured/modeled labels the assistant relays.
- **Feature 003 — Physics Deviation Engine (required upstream)**: Supplies the temperature-normalized physics deviation signals (baseline-vs-actual gap) the assistant draws on to explain *why* a unit is behaving as it is, confound-free.
- **Feature 004 — Forecasting & Anomaly Detection (required upstream)**: Supplies the forecast (with CI + drivers), anomaly (deviating signal + magnitude), and fouling (feature attribution) results — the predictive/diagnostic figures and their evidence the assistant surfaces.
- **Feature 005 — Fouling Detection Validation (required upstream)**: Supplies the validated accuracy evidence that lets the assistant answer "can we trust this signal?" and enforce the "not yet validated → I don't know" behavior; without it, accuracy claims are withheld.
- **Feature 006 — Operating-Cost & Cleaning Economics (required upstream)**: Supplies the cost figures, clean-now-vs-wait deltas, measured/modeled labels, and inline assumptions the assistant relays with its economics answers — always delta-led, never bare absolutes.
- **Provisioned GCP environment (required, user-provided)**: The assistant's orchestration runtime, conversation state, long-term memory, and access to the underlying capabilities require a provisioned cloud environment already in place. That provisioning is owned by the future Cloud Platform feature (Feature 009) and **must be set up by the user**; it is a prerequisite, not an open question for this spec.
- **Downstream consumer**: The operator-facing visual twin surfaces the assistant's answers (and its evidence, source traces, and honest non-answers) in the interface — the conversational diagnostics reach the operator through that surface with all guardrails intact.
