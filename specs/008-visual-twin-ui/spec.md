# Feature Specification: Visual Operations Twin (UI)

**Feature Branch**: `008-visual-twin-ui`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Visual Operations Twin (UI) — A visual, status-at-a-glance interface that turns the twin's data and intelligence into an intuitive operating picture of the facility. Instead of tables, operators see a spatial representation of the plant's units (the RO banks and their key equipment) where each unit's health is immediately legible through color and status (healthy / watch / alert), reflecting the physics-adjusted health and fouling signals. Operators can hover a unit for a quick summary and click it to inspect details and open the Diagnostic AI Assistant already scoped to that unit, so they can ask 'why is this one alerting?' in context. The interface reflects the moving 'now' from the live replay (with the simulation clock always visible and clearly labeled as replay, never implying a real live plant), and lets users move through the timeline. It presents the twin's outputs honestly — health, trends, forecasts with their uncertainty, fouling-onset indicators, validated accuracy evidence, and cost/cleaning trade-offs — always showing the evidence behind a number rather than a bare figure. There is a clear mapping from data to visual state (a defined health score maps to defined green/amber/red thresholds). The outcome: a demoable, trustworthy operational cockpit where a non-expert can see plant health at a glance and drill into any unit for explainable, evidence-backed diagnostics."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the whole plant's health at a glance in a spatial view (Priority: P1)

An operator opens the interface and sees a spatial, map-like picture of the facility — the RO banks and their key equipment laid out along the process flow — rather than a table of numbers. Each unit's health is immediately legible through color and a status label (healthy / watch / alert), so a non-expert can tell at a glance which units are fine and which need attention. The degrading unit stands out; the healthy fleet reads as calm.

**Why this priority**: This is the feature's reason to exist — turning the twin's data and intelligence into an intuitive operating picture. Delivered alone (a spatial view where every unit's health is color-coded and legible at a glance) it is already the "operational cockpit where a non-expert sees plant health at a glance" the project promises, and it is the canvas every other interaction attaches to.

**Independent Test**: Load the interface against a period with a known-degrading unit and confirm (a) the plant's units are shown spatially, not as a table, (b) each unit carries a color/status that reflects its underlying health, and (c) a first-time viewer can correctly point to the unit(s) needing attention without reading any numbers.

**Acceptance Scenarios**:

1. **Given** the plant's per-unit health is available for the current moment, **When** the operator opens the interface, **Then** every unit is rendered spatially with a color and status label (healthy / watch / alert) that matches its underlying health, and no table-reading is required to locate a problem unit.
2. **Given** one unit is degrading and the rest are healthy, **When** the operator views the scene, **Then** the degrading unit is visually distinct (color/status) and the healthy fleet is uniformly calm, so the eye is drawn to the exception.
3. **Given** a unit whose health improves or worsens as the timeline moves, **When** its underlying health crosses a threshold, **Then** its on-screen color/status updates to match, keeping the picture faithful to the data.

---

### User Story 2 - A defined, transparent mapping from data to visual state (Priority: P1)

The color an operator sees is not decorative — it is governed by an explicit, documented rule. A defined health score maps to defined green / amber / red thresholds (healthy / watch / alert), and the same rule drives color everywhere it appears (the spatial scene, any grid or list, alert markers). An operator or reviewer can look up why a unit is amber and see exactly which score and threshold put it there. The thresholds are stated and consistent, not per-view guesswork.

**Why this priority**: A status-at-a-glance interface is only trustworthy if the glance means something precise. A single, transparent data-to-visual contract is what separates a credible cockpit from a mood-lit dashboard, and it is the backbone that makes every color in Story 1 defensible. It is co-essential with Story 1 and independently testable by verifying score→color mapping against the stated thresholds across views.

**Independent Test**: Take units at scores spanning the healthy/watch/alert bands and confirm each renders the color the stated thresholds require, that the same score yields the same color in every view it appears in, and that a viewer can trace any color back to the score and threshold that produced it.

**Acceptance Scenarios**:

1. **Given** the defined health-score-to-color thresholds, **When** a unit's score falls in the healthy, watch, or alert band, **Then** its color/status is exactly the one the thresholds specify — green/healthy, amber/watch, or red/alert.
2. **Given** the same unit appears in more than one place (spatial scene, any grid/list, alert markers), **When** its color is compared across those places, **Then** the color is identical everywhere, driven by the one shared rule.
3. **Given** an operator asks why a unit is amber, **When** they inspect it, **Then** the interface surfaces the score and the threshold band that produced the color, so the mapping is transparent rather than opaque.

---

### User Story 3 - Hover for a quick summary, click to inspect a unit in depth (Priority: P1)

Hovering a unit shows a quick summary card — the key indicators for that unit (its health/fouling signal, a couple of headline KPIs, and its status) — enough to understand the situation without leaving the scene. Clicking the unit opens a deeper inspection view for it: its details, trends, and the analytical outputs relevant to that unit, so the operator can go from "something's off here" to "here's what's happening" in two gestures.

**Why this priority**: The at-a-glance view answers *which* unit; hover-and-click answer *what* and let the operator drill in. This progressive disclosure — glance → hover summary → click detail — is what makes the cockpit usable rather than merely pretty, and it is the bridge from the spatial overview to the explainable diagnostics. It is independently testable: hover any unit and confirm the summary; click and confirm the inspection view.

**Independent Test**: Hover several units and confirm each shows a quick summary of that unit's key indicators; click a unit and confirm a deeper inspection view for that specific unit opens with its details and relevant analytical outputs.

**Acceptance Scenarios**:

1. **Given** a unit in the scene, **When** the operator hovers it, **Then** a concise summary card appears showing that unit's status and its headline indicators, without navigating away from the scene.
2. **Given** a unit the operator wants to understand, **When** they click it, **Then** a deeper inspection view opens scoped to that unit, presenting its details, trends, and the analytical outputs relevant to it.
3. **Given** the operator moves between units, **When** they hover or click a different unit, **Then** the summary/inspection updates to the newly targeted unit rather than showing stale content from the previous one.

---

### User Story 4 - Click a unit to open the Diagnostic AI Assistant already scoped to it (Priority: P1)

From a unit, the operator can open the Diagnostic AI Assistant already scoped to that unit — so they can immediately ask "why is this one alerting?" or "clean it now or wait?" in context, without re-stating which unit they mean. The interface carries the unit context into the conversation; the assistant's answers (and their evidence, source traces, and honest non-answers) surface right there beside the unit the operator is looking at.

**Why this priority**: This closes the loop from *seeing* a problem to *understanding* it in the operator's own words — the spatial cockpit becomes a launchpad for explainable, in-context diagnostics. Embedding the assistant scoped to the clicked unit is what makes the interface a decision surface rather than a status board. It is co-essential with Stories 1 and 3 and independently testable: click a unit, open the assistant, and confirm it is pre-scoped to that unit.

**Independent Test**: Click a unit, open the assistant from it, and confirm the conversation is already scoped to that unit (a context-dependent question like "why is this one alerting?" is answered for the clicked unit without the operator naming it), with the assistant's evidence and source traces visible in the interface.

**Acceptance Scenarios**:

1. **Given** a unit the operator has selected, **When** they open the Diagnostic AI Assistant from it, **Then** the assistant is already scoped to that unit and a context-dependent question ("why is this one alerting?") is answered for that unit without the operator re-identifying it.
2. **Given** an answer the assistant returns in this context, **When** it is displayed, **Then** the interface presents it with its evidence and source traces intact — no figure is shown bare — consistent with how the assistant grounds its answers.
3. **Given** the assistant honestly declines (e.g. "not yet validated / I don't know"), **When** that response is returned, **Then** the interface shows the honest non-answer plainly rather than substituting or implying a figure.

---

### User Story 5 - Reflect the live-replay "now" with a visible, clearly-labeled simulation clock and timeline navigation (Priority: P1)

The interface reflects a moving "now" that comes from the live replay. A simulation clock is always visible and clearly labeled as replay, so no one ever mistakes the picture for a real-time connection to a physical plant. The operator can move through the timeline — advance, rewind, jump to a moment — and the whole scene (unit health, colors, summaries) reflects the state as of the chosen replay moment. "Now" always means "as of the replay clock."

**Why this priority**: This is a constitutional line (Principle VI — Honest Twin Maturity): the twin is a live-ready shadow running on replay, and it must never imply a live plant feed it does not have. Making the replay clock visible-and-labeled and letting the operator scrub the timeline is what makes the cockpit both honest and explorable. It is co-essential with Story 1 (the scene animates off this clock) and independently testable by checking the clock's presence, its replay label, and timeline-driven scene updates.

**Independent Test**: Confirm the simulation clock is visible and explicitly labeled as replay at all times, that moving the timeline (advance / rewind / jump) updates the scene's unit health and colors to the chosen moment, and that nothing in the interface implies a real-time connection to a physical plant.

**Acceptance Scenarios**:

1. **Given** the interface is open, **When** the operator looks at it, **Then** a simulation clock is visible and clearly labeled as replay (as-of a historical moment), never presented as a live real-time plant connection.
2. **Given** the operator moves the timeline (advance, rewind, or jump to a moment), **When** the replay moment changes, **Then** the scene — unit health, colors, status, and summaries — updates to reflect the plant state as of that replay moment.
3. **Given** any place the interface says "now" or "current," **When** it is read, **Then** it means "as of the replay clock," and no wording or indicator implies a real-time feed from a physical plant.

---

### User Story 6 - Every quantitative figure is shown with its evidence, honestly labeled (Priority: P1)

Wherever the interface shows a number — a health/fouling score, a trend, a forecast, an anomaly, a fouling-onset indicator, a validated-accuracy figure, or a cost/cleaning trade-off — it shows the evidence behind that number, not a bare figure. A forecast is shown with its uncertainty; an anomaly with the signal that deviated and how far; a fouling indicator with what drove it; an accuracy figure only once it has been validated; a cost figure with its measured-vs-modeled label and the assumptions in force (leading with deltas/trade-offs, not bare absolutes). The interface is the honest window onto the twin's outputs.

**Why this priority**: This is the constitutional heart of the whole project surfaced in the UI (Principle II — Evidence Over Assertion / No Hallucinated Numbers, a HARD GATE; Principle IV — Measured-vs-Modeled Honesty). A cockpit that shows confident bare numbers would betray exactly the trust the twin is built to earn. Making evidence a property of every on-screen figure is what makes the interface *trustworthy*, not just legible. It is co-essential with every other story and independently testable by inspecting on-screen figures for their accompanying evidence.

**Independent Test**: Inspect on-screen figures of each kind (health/fouling, forecast, anomaly, fouling-onset, accuracy, cost) and confirm each is accompanied by the evidence proper to its type — forecast uncertainty, deviating signal + magnitude, driver/attribution, validated-only accuracy, measured/modeled label + assumptions with deltas led — with no bare numbers displayed.

**Acceptance Scenarios**:

1. **Given** a forecast figure is displayed, **When** it is read, **Then** its uncertainty (a confidence band or interval) is shown with it, not a bare point number.
2. **Given** an anomaly or fouling-onset indicator is displayed, **When** it is read, **Then** the interface shows the signal that deviated and its magnitude versus baseline (or the drivers behind the indicator), not just a flag.
3. **Given** a cost or cleaning trade-off figure is displayed, **When** it is read, **Then** it is labeled measured or modeled with its assumptions shown, and framed as a delta/trade-off rather than a bare absolute.
4. **Given** an accuracy or performance figure, **When** it is displayed, **Then** it appears only if it has been validated, and an un-validated claim is shown as "not yet validated" rather than as a number.

---

### Edge Cases

- **A unit has no health data for the selected replay moment**: The interface shows that unit as indeterminate/unknown (a distinct, non-alarming state) rather than defaulting it to green or inventing a color, so "no data" is never mistaken for "healthy."
- **The timeline is scrubbed to a moment before a unit has any data**: The scene shows the unit as unknown for that moment rather than carrying forward a stale color from a later moment.
- **A capability returns a figure without its evidence**: The interface withholds the bare figure (or shows it as unavailable) rather than displaying an evidence-less number, consistent with the no-bare-numbers rule.
- **An accuracy figure has not yet been validated**: The interface shows "not yet validated" in that place rather than a provisional number.
- **The health score sits exactly on a threshold boundary**: The mapping resolves the boundary deterministically per the stated rule (a boundary value lands in exactly one defined band), so identical scores never render as different colors.
- **The Diagnostic AI Assistant honestly declines for the scoped unit** ("I don't know / not yet validated"): The interface surfaces the honest non-answer plainly and does not fill the gap with a fabricated figure.
- **A cost absolute is requested/shown**: The interface leads with the delta/trade-off and attaches the assumptions and an uncertainty caveat to any absolute, never presenting a bare cost-of-water headline.
- **The replay is paused or between updates**: The clock still reads as replay and the scene holds the last replay moment; nothing implies a live real-time feed resumed.
- **Many units alert at once**: The interface still lets the operator distinguish and prioritize among alerting units (they remain individually legible and inspectable) rather than collapsing into an undifferentiated wall of red.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The interface MUST present the plant's units (the RO banks and their key equipment) as a spatial, map-like operating picture laid out along the process flow, not as a table of numbers, as the primary operator view.
- **FR-002**: The interface MUST encode each unit's health at a glance using color and a status label spanning at least three states — healthy, watch, and alert — so a non-expert can identify problem units without reading numeric values.
- **FR-003**: The interface MUST derive each unit's on-screen color/status from a defined health score via defined thresholds (a healthy band, a watch band, and an alert band), and MUST resolve threshold-boundary values deterministically so an identical score always yields an identical color.
- **FR-004**: The interface MUST apply the same one health-score-to-color rule everywhere color conveys status (the spatial scene and any grid, list, or alert markers), so a given score renders the same color in every view.
- **FR-005**: The interface MUST make the data-to-visual mapping transparent — for any unit, the operator can see the score and the threshold band that produced its color, rather than an unexplained color.
- **FR-006**: The interface MUST update a unit's color/status when its underlying health crosses a threshold as the active replay moment changes, keeping the visual state faithful to the data.
- **FR-007**: The interface MUST show a concise summary of a unit's key indicators (status plus headline indicators for that unit) on hover, without navigating away from the scene.
- **FR-008**: The interface MUST open a deeper inspection view scoped to a specific unit when that unit is clicked, presenting that unit's details, trends, and the analytical outputs relevant to it.
- **FR-009**: The interface MUST update the hover summary and inspection view to the currently targeted unit when the operator moves to a different unit, never showing stale content from a previously targeted unit.
- **FR-010**: The interface MUST let the operator open the Diagnostic AI Assistant from a unit with the conversation already scoped to that unit, so a context-dependent question (e.g. "why is this one alerting?") is answered for that unit without the operator re-identifying it.
- **FR-011**: The interface MUST display the Diagnostic AI Assistant's answers with their evidence and source traces intact, and MUST surface the assistant's honest non-answers ("I don't know / not yet validated") plainly rather than substituting or implying a figure.
- **FR-012**: The interface MUST always display a simulation clock that is clearly labeled as replay (as-of a historical moment) and MUST NOT present, word, or indicate the picture as a real-time connection to a physical plant.
- **FR-013**: The interface MUST let the operator move through the timeline (advance, rewind, and jump to a moment) and MUST update the scene — unit health, colors, status, and summaries — to reflect the plant state as of the chosen replay moment.
- **FR-014**: Wherever the interface uses "now" or "current," it MUST mean "as of the replay clock," consistent with the honest-maturity framing, and MUST NOT imply a live real-time plant feed.
- **FR-015**: The interface MUST show every quantitative figure with the evidence proper to its type and MUST NOT display a bare figure: a forecast with its uncertainty (confidence band/interval); an anomaly or fouling-onset indicator with the deviating signal and its magnitude versus baseline (or its drivers); a health/fouling score with its contributing attribution; and a cost figure with its measured-vs-modeled label and assumptions.
- **FR-016**: The interface MUST lead economic figures with deltas/trade-offs and MUST attach assumptions and an uncertainty caveat to any absolute cost figure, never presenting a bare cost-of-water absolute.
- **FR-017**: The interface MUST display an accuracy or performance figure only after it has been validated, and MUST show an un-validated claim as "not yet validated" rather than as a number.
- **FR-018**: The interface MUST NOT display an evidence-less figure as a bare number — when a capability returns a value without its evidence, that figure is treated as un-surfaceable (withheld or shown as unavailable).
- **FR-019**: The interface MUST represent a unit with no health data for the selected replay moment as a distinct indeterminate/unknown state (never defaulting it to healthy/green or carrying a stale color forward from another moment).
- **FR-020**: The interface MUST keep alerting units individually legible and inspectable when many alert at once, so the operator can distinguish and prioritize among them rather than facing an undifferentiated block of alerts.

### Key Entities *(include if feature involves data)*

- **Plant Scene**: The spatial, map-like operating picture of the facility — the RO banks and their key equipment arranged along the process flow — that serves as the primary operator canvas; each element carries a health-driven color/status and is hoverable and clickable.
- **Unit (Visual)**: An on-screen representation of a plant unit (an RO bank/stage or key equipment item) carrying its current health-driven color and status, a hover summary, an inspection view, and an entry point to the scoped assistant.
- **Health Status Encoding**: The visual state (color + label) a unit displays — healthy / watch / alert (plus an indeterminate/unknown state) — the at-a-glance signal an operator reads.
- **Data-to-Visual Contract**: The defined, shared mapping from a unit's health score to its color/status via stated thresholds (healthy / watch / alert bands, with deterministic boundary resolution) — the rule that makes every color defensible and consistent across views.
- **Hover Summary**: The concise, in-place card of a unit's status and headline indicators shown on hover, for quick understanding without leaving the scene.
- **Inspection View**: The deeper, unit-scoped view opened on click, presenting that unit's details, trends, and relevant analytical outputs (each figure with its evidence).
- **Scoped Assistant Session**: The Diagnostic AI Assistant conversation opened from a unit and pre-scoped to it, so in-context questions are answered for that unit with evidence and source traces intact.
- **Replay Clock / Timeline**: The always-visible, replay-labeled simulation clock and the timeline control that lets the operator move through replay moments; the whole scene reflects the state as of the selected moment, and "now" means "as of the replay clock."
- **On-Screen Figure + Evidence**: Any quantitative value the interface shows bundled with the evidence proper to its type (forecast uncertainty; deviating signal + magnitude; attribution/drivers; measured/modeled label + assumptions), validated where accuracy is claimed, and never displayed bare.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time, non-expert viewer, shown the interface against a period with a known-degrading unit, can correctly identify the unit(s) needing attention from the spatial view alone — without reading numeric values — in the large majority of trials.
- **SC-002**: For units at scores spanning the healthy, watch, and alert bands, 100% render the color the stated thresholds require, and the same score yields the same color in every view it appears in — zero cross-view color inconsistencies.
- **SC-003**: For any unit, the operator can trace its displayed color back to the score and threshold band that produced it in 100% of checks — no unexplained colors.
- **SC-004**: Hovering any unit surfaces a correct quick summary of that unit, and clicking any unit opens an inspection view scoped to that same unit, in 100% of trials — with no stale content from a previously targeted unit.
- **SC-005**: Opening the Diagnostic AI Assistant from a unit yields a conversation pre-scoped to that unit — a context-dependent question is answered for the clicked unit without the operator naming it — in 100% of trials.
- **SC-006**: The simulation clock is visible and explicitly labeled as replay at all times, and no element of the interface implies a real-time connection to a physical plant — verified across every screen/state, 100% compliance.
- **SC-007**: Moving the timeline (advance / rewind / jump) updates the scene's unit health, colors, and summaries to the selected replay moment in 100% of trials, and a scrub to a moment before a unit has data shows that unit as unknown rather than a stale or defaulted color.
- **SC-008**: 100% of quantitative figures displayed carry the evidence proper to their type (forecast uncertainty; deviating signal + magnitude; attribution/drivers; measured/modeled label + assumptions); zero figures appear bare.
- **SC-009**: 100% of economic figures displayed lead with deltas/trade-offs and, where an absolute is shown, carry their assumptions and an uncertainty caveat; zero bare cost-of-water absolutes are surfaced.
- **SC-010**: Every accuracy/performance figure displayed has been validated before it appears; un-validated claims are shown as "not yet validated" in 100% of cases — zero un-validated numbers displayed.

## Assumptions

- **The interface visualizes; it does not compute the twin's intelligence**: Health/fouling signals, physics deviation, forecasts, anomaly and fouling-onset detection, validation evidence, and economics are produced by upstream features. This feature is the visual and interaction layer that presents those outputs honestly; it does not re-derive them.
- **The health score and its thresholds come from the twin's health/deviation capability**: The interface consumes a defined health score and renders it via the stated green/amber/red thresholds. The concrete numeric threshold values (the healthy/watch/alert cut-points) are tunable and owned by the health/deviation capability; the interface's contract is that a defined score maps deterministically to a defined color band and that the mapping is transparent and consistent.
- **Evidence is produced upstream and displayed, not re-derived**: Forecast uncertainty, deviating-signal magnitude, attribution/drivers, and measured/modeled labels + assumptions are returned by the underlying capabilities (per their evidence contracts). The interface's job is to display that evidence faithfully alongside each figure.
- **The Diagnostic AI Assistant is embedded, not re-built here**: This feature surfaces the assistant (Feature 007) scoped to a unit and displays its answers, evidence, source traces, and honest non-answers; the assistant's grounding, orchestration, and governance are owned by that feature.
- **"Now" is the replay clock**: Consistent with the twin's honest-maturity principle, the interface animates off the live-replay clock and never implies a live plant connection; production swap-in to a real feed is a future concern, not part of this feature.
- **Rendering, framework, and asset-generation choices are implementation concerns**: How the spatial scene is rendered (2.5D/isometric or otherwise), the frontend framework, the serving/data-access path, how equipment visuals/sprites are produced, and how timeline scrubbing is wired to data are decided in `/speckit.plan`, per Constitution Principle I. This spec states outcomes and the visual/interaction/honesty contract, not the mechanism.
- **Scope is the operator-facing cockpit and the unit-scoped drill-in for this iteration**: The signature experience is the spatial health-at-a-glance scene, hover/click drill-in, the scoped assistant, the replay clock/timeline, and evidence-bearing figures. The broader multi-tab analytics surface (engineer/manager views, the full visualization catalog) can layer on the same contracts but is not required to satisfy this feature's outcomes; its breadth is set at planning time.
- **Personas**: The primary user is a plant operator (status-at-a-glance + drill-in); engineer and manager views reuse the same data-to-visual and evidence contracts and are an extension, not a prerequisite, for this feature.

## Dependencies

- **Feature 002 — Live Replay (required upstream)**: Supplies the moving "now" — the replay clock and the stream of plant state over time — that the scene animates off and the timeline navigates; also the source of the replay labeling the interface must honor.
- **Feature 003 — Physics Deviation / Health (required upstream)**: Supplies the physics-adjusted health and fouling signals and the health score that the data-to-visual contract maps to green/amber/red — the substance behind every unit's color/status.
- **Feature 004 — Forecasting & Anomaly Detection (required upstream)**: Supplies the forecasts (with uncertainty), anomalies (deviating signal + magnitude), and fouling-onset indicators (with drivers/attribution) the interface displays with their evidence.
- **Feature 005 — Fouling Detection Validation (required upstream)**: Supplies the validated accuracy evidence, so the interface shows accuracy figures only once validated and shows "not yet validated" otherwise.
- **Feature 006 — Operating-Cost & Cleaning Economics (required upstream)**: Supplies the cost/cleaning trade-off figures, measured/modeled labels, and assumptions the interface displays delta-led, never as bare absolutes.
- **Feature 007 — Diagnostic AI Assistant (embedded)**: The interface embeds the assistant scoped to a clicked unit and surfaces its answers, evidence, source traces, and honest non-answers with all guardrails intact.
- **Provisioned GCP environment (required, user-provided)**: The interface's serving/data-access path to the twin's outputs and the embedded assistant require a provisioned cloud environment already in place. That provisioning is owned by the future Cloud Platform feature (Feature 009) and **must be set up by the user**; it is a prerequisite, not an open question for this spec.
