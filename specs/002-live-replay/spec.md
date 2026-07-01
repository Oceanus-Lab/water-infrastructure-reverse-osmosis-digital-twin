# Feature Specification: Live Operations Replay

**Feature Branch**: `002-live-replay`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Live Operations Replay — Make the digital twin show a moving 'now' instead of a static archive, on the exact same event path a real plant's live data would use. The facility's history (daily readings, 2019-01-01 to 2021-01-13) is replayed through a clock-driven harness that emits each unit's reading in chronological order as if it were arriving live, advancing a controllable simulation clock. Operators and every downstream capability then see 'the current state as of the replay clock' — the latest reading per unit, recent trend, and elapsed position in the timeline. The replay clock is controllable: play, pause, jump to a date, and adjust speed (e.g. 1 day per second). Crucially, this is honestly labeled as replay — the UI/state always exposes the simulation clock and never implies a real live plant connection — yet the architecture is live-ready: swapping the historical source for a real plant feed is a single connector change with no downstream rework. The outcome: a believable, demoable, always-moving twin whose 'now' is real and whose path to production is one swap."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An always-moving "now" the whole twin shares (Priority: P1)

An operator opens the twin and sees a living plant: a simulation clock is ticking, and every one of the 21 units shows its current state *as of that clock* — the latest reading at or before the clock, its recent trend, and where the clock sits in the overall timeline. Nothing is a frozen archive; the readings advance on their own as the clock moves, exactly as a live plant would feel. Every downstream capability (twin view, diagnostics, alerting) reads the same single "now," so what the operator sees and what the rest of the system reasons about never disagree.

**Why this priority**: This is the feature's core value and its minimum viable slice — it converts a static historical record into a believable, demoable, moving twin. Delivered alone, with the clock simply playing forward at a fixed speed, it already gives operators and every consumer a shared, advancing present. All clock controls and honesty labeling build on top of this.

**Independent Test**: Start a replay from the beginning of history and let the clock advance; confirm that at any clock instant a single query returns exactly one latest reading per unit (the most recent at or before the clock), a recent trend per unit, and the clock's date and progress through the timeline — and that two separate consumers reading at the same clock instant see the same values.

**Acceptance Scenarios**:

1. **Given** a replay advancing the simulation clock, **When** an operator views the twin at a clock instant, **Then** each of the 21 units shows its latest reading at or before that clock instant, its recent trend, and the clock's position (date and elapsed progress) in the timeline.
2. **Given** the clock advances past a unit's next recorded reading, **When** the operator looks again, **Then** that unit's "current" reading updates to the newer reading without any manual refresh of the underlying history.
3. **Given** two downstream consumers reading the current state at the same clock instant, **When** each reports a unit's latest reading, **Then** both report identical values for that unit (one shared "now").

---

### User Story 2 - A controllable replay clock (Priority: P1)

A presenter or analyst needs to steer the moving twin: press play to run it forward, pause to hold on an interesting moment, jump straight to a specific date (a known fouling cycle, the lead-up to a cleaning), and change the speed (e.g. one simulated day per second for a slow walkthrough, or much faster to cover months in a demo). The clock — not the wall clock — governs what "now" means, and the operator controls the clock.

**Why this priority**: Control is what makes the moving twin demoable and explorable rather than a fixed-rate playback. It is co-essential with the moving "now": without play/pause/jump/speed the feature cannot be driven to the moments that matter. It depends only on User Story 1's clock-and-current-state foundation.

**Independent Test**: Exercise each control in turn — play (clock advances), pause (clock and current state hold steady), jump-to-date (current state immediately reflects the target date), and speed change (the rate the clock advances changes accordingly) — and confirm each takes effect on the observable current state.

**Acceptance Scenarios**:

1. **Given** a paused replay, **When** the operator presses play, **Then** the simulation clock begins advancing and the current state updates as new readings come due.
2. **Given** a playing replay, **When** the operator presses pause, **Then** the clock stops advancing and the current state holds unchanged until play resumes.
3. **Given** a replay at any position, **When** the operator jumps to a chosen date, **Then** the current state immediately reflects "as of that date" — the latest reading per unit at or before it — with no readings from after that date present.
4. **Given** a playing replay, **When** the operator changes the speed, **Then** the simulated time elapsed per unit of wall-clock time changes to match, while chronological order of readings is preserved.

---

### User Story 3 - Honestly labeled as replay, never faked-live (Priority: P2)

Every view and every answer that surfaces the current state declares, unmistakably, that the source is historical replay and shows the current simulation-clock date. "Right now" always means "as of the replay clock." The system never presents the data as a live connection to a real plant. An operator, a stakeholder in a demo, or a downstream agent answer can always tell that they are looking at an honest replay of recorded history, not a real-time feed.

**Why this priority**: Honest maturity labeling is a project principle and the single biggest credibility safeguard, but it layers on top of the working moving twin (Stories 1–2). It is essential before any demo or stakeholder-facing use, yet the moving "now" can be built and tested before the labeling is finalized.

**Independent Test**: Inspect the current-state output and any consumer-facing surface at several clock positions and confirm each one exposes the simulation-clock date and an explicit "replay of historical data" indication, and that no surface states or implies a live plant connection.

**Acceptance Scenarios**:

1. **Given** the current state at any clock position, **When** a consumer reads it, **Then** the simulation-clock date and an explicit "historical replay" source indication are present.
2. **Given** a consumer asks for the "current"/"now" state, **When** the answer is produced, **Then** it is framed as "as of the replay clock [date]" and never as a real-time plant reading.
3. **Given** any operator- or stakeholder-facing surface, **When** it displays the moving twin, **Then** it carries the replay label and the live simulation-clock date, with no claim of a real live plant connection.

---

### User Story 4 - Live-ready: one connector swap to production (Priority: P2)

The replay path is the production path. The historical source feeds the same event flow and the same current-state model a real plant feed would. When a real facility is connected later, the only thing that changes is the source connector — the historical replay is replaced by a real plant feed publishing onto the same path — and nothing downstream (current-state model, twin view, diagnostics, alerting) needs rework.

**Why this priority**: This is what makes the prototype an honest *architecture* rather than a throwaway demo, and it underpins the "path to production is one swap" promise. It is a property of how Stories 1–3 are shaped rather than a separate user-facing surface, so it follows them.

**Independent Test**: Identify the single boundary at which readings enter the event path (the source connector) and confirm that every downstream consumer depends only on the shared event/current-state contract — so substituting a different source that honors the same contract requires no change to any consumer.

**Acceptance Scenarios**:

1. **Given** the live-ready event path, **When** the historical replay source is replaced by an alternative source that emits readings on the same contract, **Then** all downstream consumers continue to function with no change to their logic.
2. **Given** a downstream consumer, **When** it is inspected for dependencies, **Then** it depends on the shared event/current-state contract only and not on anything specific to the historical replay source.
3. **Given** the documented production path, **When** a reviewer traces it, **Then** the single point of substitution (the source connector) is explicit and the rest of the path is identical to the prototype.

---

### Edge Cases

- **Gaps in a unit's history**: When the clock advances over days where a unit has no recorded reading, that unit's "current" reading remains its last real reading (marked as carried-forward), and a gap is never filled with a fabricated or zero value.
- **Clock paused**: While paused, every consumer sees a stable, frozen "now"; no current-state values change and no new readings are emitted until play resumes.
- **Jump backward**: Jumping to an earlier date recomputes the current state to "as of that earlier date" — no reading from after the target date may linger in the current state (no future leakage).
- **Jump to a date with no exact reading**: The current state resolves to the latest reading at or before the chosen date for each unit; units that have no reading yet at that date are explicitly shown as not-yet-reporting rather than guessed.
- **Multiple / late-joining consumers**: A consumer that begins observing partway through a replay can immediately obtain the full current state as of the clock, consistent with consumers already attached.
- **Restart or re-emit mid-replay**: If the replay restarts or re-sends a reading already delivered, the current state is unaffected (the same reading applied twice yields the same state) — no double counting or corruption.
- **Reaching the start/end of history**: The clock cannot advance before the first recorded day or beyond the last; reaching the end holds at the final real state and never emits a fabricated "future" reading.
- **Uneven unit coverage**: Units whose recorded history starts or ends mid-window are handled correctly — they appear as not-yet-reporting before their first reading and hold their last reading after their last, without distorting other units' current state.
- **Very high speed**: At fast playback the chronological ordering of readings across all units is still preserved; speed changes the rate of time, never the sequence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replay the facility's harmonized daily history by emitting each unit's reading in chronological order, as if it were arriving live, advancing a single simulation clock.
- **FR-002**: The system MUST maintain a "current state as of the replay clock" that exposes, for each of the 21 units, its latest reading at or before the current clock instant.
- **FR-003**: The current state MUST include a recent trend for each unit (its readings over a recent window leading up to the clock) so consumers can see direction of change, not just a single point.
- **FR-004**: The current state MUST expose the clock's position in the timeline — the current simulation-clock date and the elapsed progress through the overall history span.
- **FR-005**: The system MUST preserve global chronological order across all units when emitting readings (ordered by reading date, with a deterministic tie-break across units), regardless of replay speed.
- **FR-006**: Users MUST be able to start/resume the replay (play), causing the simulation clock to advance and the current state to update as readings become due.
- **FR-007**: Users MUST be able to pause the replay, freezing the simulation clock and the current state until play resumes, with no readings emitted while paused.
- **FR-008**: Users MUST be able to jump the simulation clock to a chosen date, forward or backward, after which the current state reflects "as of that date" with no reading from after the target present.
- **FR-009**: Users MUST be able to adjust the replay speed (the amount of simulated time elapsed per unit of wall-clock time, e.g. one simulated day per second), without altering the chronological order of readings.
- **FR-010**: The system MUST expose the simulation clock (its current date and run state) to every consumer, so that "now" is always defined as "as of the replay clock."
- **FR-011**: All downstream consumers MUST observe the same single "now" from the shared simulation clock, so that no two consumers reading at the same clock instant disagree on a unit's current reading.
- **FR-012**: The system MUST label the data as historical replay on every current-state output and consumer-facing surface, showing the simulation-clock date and never stating or implying a live connection to a real plant.
- **FR-013**: The system MUST represent any absence — a unit with no reading yet at the clock, or a gap in a unit's history — explicitly (not-yet-reporting or carried-forward-from-last-reading), never as a fabricated, zero, or estimated value.
- **FR-014**: The system MUST be tolerant of restarts and repeated delivery: applying the same reading more than once MUST leave the current state unchanged (no double counting or corruption).
- **FR-015**: The system MUST bound the simulation clock to the history span: it cannot advance before the first recorded day or beyond the last, and reaching the end holds the final real state without emitting any fabricated future reading.
- **FR-016**: The replay MUST be deterministic and reproducible: the same history replayed with the same control inputs MUST produce the same emitted sequence and the same current state at the same clock positions.
- **FR-017**: The readings MUST enter the system through a single, well-defined source-connector boundary, such that every downstream consumer depends only on the shared event/current-state contract and not on anything specific to the historical source.
- **FR-018**: The system MUST allow the historical replay source to be substituted by an alternative source that honors the same contract (e.g. a real plant feed) with no change required to any downstream consumer — a single-connector swap to production.

### Key Entities *(include if feature involves data)*

- **Simulation Clock**: The single source of "now" for the replay. Holds the current simulation date, its run state (playing or paused), and its speed (simulated time per unit of wall-clock time). All current-state answers are relative to it.
- **Reading Event**: One unit's harmonized daily reading, emitted onto the event path at its event time (its reading date) as if arriving live. Carries the unit/bank/stage identity and reading date from the harmonized history.
- **Current State (as-of-clock)**: The derived view every consumer reads — for each of the 21 units, its latest reading at or before the clock, a recent trend, and an explicit not-yet-reporting/carried-forward marker where applicable — plus the clock's date, run state, elapsed progress, and the historical-replay label.
- **Replay Controls**: The operator-facing actions that steer the clock — play, pause, jump-to-date, and set-speed — and the only way the simulation clock changes.
- **Source Connector**: The single boundary at which readings enter the event path. In the prototype it is the historical-replay source; in production it is a real plant feed honoring the identical contract. The one component that changes between prototype and production.
- **Consumer**: Any downstream capability that reads the stream or the current state (e.g. the twin view, diagnostics, alerting). Depends only on the shared contract and the simulation clock.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At any simulation-clock instant, the current state returns exactly one latest reading per unit (the most recent at or before the clock) across all 21 units, with units having no reading yet shown explicitly as not-yet-reporting.
- **SC-002**: 100% of emitted readings are in non-decreasing chronological order by event time, at every replay speed.
- **SC-003**: Every clock control takes observable effect: play advances the clock, pause holds both clock and current state steady for as long as it is paused, jump moves the current state to the target date, and a speed change alters the simulated-time-per-wall-second rate — each verifiable from the current state alone.
- **SC-004**: Every current-state output and consumer-facing surface carries the simulation-clock date and an explicit historical-replay indication, with zero surfaces implying a live plant connection.
- **SC-005**: Jumping backward to a date yields a current state identical to a fresh replay played up to and stopped at that same date, with zero readings from after the target date present.
- **SC-006**: All consumers reading at the same clock instant agree on every unit's current reading (zero divergence on the shared "now").
- **SC-007**: Substituting the source connector with an alternative honoring the same contract requires zero changes to any downstream consumer (verified against the shared contract).
- **SC-008**: Re-running the replay with identical history and identical control inputs produces an identical emitted sequence and identical current state at matching clock positions.
- **SC-009**: Zero fabricated readings: across gaps, not-yet-reporting units, and end-of-history, no absent value is ever presented as a real, zero, or estimated reading.
- **SC-010**: A presenter can drive the twin to any chosen date and run it forward at a controllable speed in a live demo, with the moving "now" and the visible simulation clock staying consistent throughout.

## Assumptions

- **History source is Feature 001's harmonized model**: The replay streams the unified, harmonized daily history produced by the Data Foundation feature (21 units, 7 banks A–G × 3 stages, daily 2019-01-01 → 2021-01-13), ordered by reading date. This feature does not re-ingest or re-harmonize raw source files.
- **Event-path technology is deferred to planning**: The "same path a live feed would use" is an event-streaming substrate that delivers reading events to a current-state store (the project's chosen message-topic-into-analytics-store pattern). Specific services, topic names, and table layouts are intentionally out of this spec and belong to planning and the Cloud Platform feature.
- **Default control behavior**: A reasonable default speed (on the order of one simulated day per few wall-clock seconds) and a single shared event stream carrying one message per (unit, reading) are assumed; exact defaults are tunable at planning time and do not change the requirements here.
- **One message per (unit, reading), keyed for idempotency**: Each emitted reading is identified by its unit and reading date so that restarts and re-sends are safely de-duplicated downstream (supports FR-014).
- **A single-bank vertical slice is an acceptable first increment**: For early demos the replay may run one bank before fanning out to all seven; the specification and success criteria are stated for the full 21 units.
- **Production swap-in is a connector replacement**: Going live means replacing the historical-replay source with a real plant feed (e.g. SCADA/OPC-UA/MQTT) that publishes onto the same path; no downstream rework is implied (supports FR-017/FR-018).
- **Read-only and advise-only**: The replay only emits and exposes readings; it never actuates plant equipment and issues no control commands, consistent with the project's advise-only governance.
- **"Recent trend" window is configurable**: The exact length of the recent-trend window (FR-003) is a tunable default chosen at planning time and does not alter the requirement that a trend be present.

## Dependencies

- **Feature 001 — Data Foundation (required upstream)**: This feature consumes the harmonized history (one queryable model across all 21 units, with reading date and unit/bank/stage identity) as its replay source. Without that harmonized model there is nothing to replay in a consistent shape.
- **Provisioned GCP environment / event-streaming substrate (required, user-provided)**: This feature requires a provisioned cloud environment with an event-streaming path and a current-state store already in place. That provisioning is owned by the future Cloud Platform feature and **must be set up by the user**; it is a prerequisite, not an open question for this spec.
- **Downstream consumers (dependents)**: The visual twin UI, the AI assistant/diagnostics, and the forecasting/anomaly capabilities all read the moving current-state and the shared simulation clock this feature provides. The event/current-state contract defined here is their shared input, so changes to it ripple to all of them.
- **Live source connector (future, out of scope here)**: The real-plant feed that replaces the historical source at go-live is referenced as the single swap point but is not delivered by this feature.
