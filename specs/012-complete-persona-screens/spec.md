# Feature Specification: Complete the Operator-Facing Product Surface

**Feature Branch**: `012-complete-persona-screens`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Close the gap between what the twin already computes and what a
person can actually reach. Two of the four navigation destinations are 'Under Construction'
placeholders, so the Operations Manager persona has no screen at all. The Process Engineer's
screen is labelled 'Physical Simulation' but offers no simulation — the physics capability, the
in-warehouse forecasting, the cost-assumption overrides, and the approved-decision record are all
computed and available, yet nothing in the interface exposes them. This feature makes every
capability the twin already produces reachable by the persona who needs it, without weakening any
of the honesty or governance guarantees that make the figures trustworthy."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Operations Manager gets a screen that answers their question (Priority: P1)

An operations manager opens the destination meant for them and sees the fleet through a financial
lens: how operating cost is trending, which units are carrying the most avoidable cost right now,
what the cleaning workload and its cost look like over the period, and where money would be saved.
Today that destination shows a placeholder, so this persona — one of the three the product claims
to serve — cannot use the product at all. Every figure carries the same evidence and
measured-versus-modeled labelling the rest of the twin uses, and figures that rest on an assumed
input say so.

**Why this priority**: This is the largest single gap between what the product claims and what it
delivers. A navigation entry that leads to "Under Construction" reads as unfinished regardless of
how strong the underlying engineering is, and one of three named personas currently has nowhere to
go. The economics results this screen presents are already computed — the work is exposure, not
invention, so the value-to-effort ratio is the highest available.

**Independent Test**: Navigate to the operations-manager destination and confirm it presents fleet
cost trend, a ranked view of units by avoidable cost, and cleaning-workload cost for the selected
period — each figure labelled measured or modeled, with no placeholder screen remaining.

**Acceptance Scenarios**:

1. **Given** the twin has economics results for the selected period, **When** the operations
   manager opens their destination, **Then** they see an operating-cost trend, a ranking of units
   by avoidable cost, and the cleaning workload with its cost — no "under construction" message.
2. **Given** a cost figure that derives from an assumed rather than a sourced input, **When** it is
   displayed, **Then** it is explicitly labelled as resting on an assumption, with the assumption
   stated.
3. **Given** the selected point in the replay timeline changes, **When** the screen updates,
   **Then** every figure reflects only evidence available at that point and none from later.
4. **Given** economics cannot be grounded for the selection, **When** the screen renders, **Then**
   it states that plainly rather than showing zero, blank, or an invented figure.

---

### User Story 2 - The Process Engineer can actually run a what-if (Priority: P1)

A process engineer opens the destination labelled for simulation, changes one or more operating
conditions (feed salinity, temperature, pressure, recovery, membrane area), and gets back a
comparison between the plant as it is and the plant under the change — expressed as a difference,
with the direction and magnitude of the effect on water production and separation quality. Today
this destination offers no way to change anything; the physics capability that answers exactly this
question is reachable by nothing a person can click.

**Why this priority**: The physics engine is the product's core technical differentiator against a
plain dashboard, and it is currently invisible to every user. The destination is already named for
this capability in the navigation, so the promise is made and unmet. Co-essential with Story 1: one
restores a missing persona, the other restores a missing capability, and either alone is a
demonstrable improvement.

**Independent Test**: Open the simulation destination, change at least one operating condition to a
value no prepared scenario covers, and confirm a baseline-versus-scenario comparison is returned for
exactly those conditions with the difference stated, or an explicit reason why it could not be
computed.

**Acceptance Scenarios**:

1. **Given** the simulation destination, **When** the engineer adjusts an operating condition and
   requests a comparison, **Then** the result presents the baseline case, the changed case, and the
   difference between them.
2. **Given** the physics capability is unavailable, **When** a comparison is requested, **Then** the
   engineer is told it is unavailable and why, and no substituted or approximated figure is shown.
3. **Given** a requested condition lies outside the range the physics capability supports, **When**
   the comparison is requested, **Then** the limit is stated and no figure is extrapolated.
4. **Given** a completed comparison, **When** the engineer reads it, **Then** the result is labelled
   as modeled, and the conditions it was computed under are shown alongside it.
5. **Given** the engineer sets an arbitrary combination of conditions that no prepared scenario
   covers, **When** the comparison is requested, **Then** a result is computed for exactly those
   conditions rather than substituted from a nearby prepared case.
6. **Given** a comparison that takes appreciable time to compute, **When** it is running, **Then**
   the engineer sees that work is in progress and can abandon it, and no blank or partial result is
   presented if it does not complete.

---

### User Story 3 - Cost assumptions can be challenged, and the answer moves (Priority: P2)

The twin's economics rest on a small set of editable assumptions (electricity price, cleaning cost,
downtime cost, and similar). A user who disagrees with one — "power costs more than that here" —
can change it and watch the recommendation and the numbers move in response, including when a
clean-now-versus-wait recommendation reverses. Today those assumptions are fixed from the user's
point of view even though the capability to override them exists.

**Why this priority**: This turns the economics from a static claim into a defensible argument, and
it is the most direct demonstration of the project's "lead with differences, declare your
assumptions" honesty commitment. It ranks below Stories 1–2 because those restore missing surfaces
while this deepens one that will exist; it is independently testable and independently valuable.

**Independent Test**: Change a cost assumption, confirm the displayed figures and the recommendation
recompute from the changed value, and confirm the active assumptions are visible alongside the
result.

**Acceptance Scenarios**:

1. **Given** a displayed economics result, **When** the user changes a cost assumption, **Then** the
   figures recompute from the new value and the change is reflected in the result.
2. **Given** a change that reverses the recommendation, **When** the result updates, **Then** the
   reversal is called out explicitly rather than left for the user to notice.
3. **Given** any economics result, **When** it is read, **Then** the assumptions in force are visible
   with it.
4. **Given** an assumption value that is not a usable number, **When** it is submitted, **Then** the
   user is told what is wrong and the previous result is left intact.

---

### User Story 4 - The approved-decision record is visible, not just written (Priority: P2)

When a user approves a proposed record — the human-in-the-loop step that is the product's governance
centrepiece — that decision is durably recorded. But there is currently no way to see what was
recorded. This story closes the loop: a user can review the decisions that were approved, when, what
each concerned, and on what basis, so the audit trail is something a person can actually audit.

**Why this priority**: An audit trail nobody can read is not an audit trail. The write path exists
and is enforced; only the reading surface is missing, so the effort is small and it converts an
internal guarantee into a visible one. It ranks below Stories 1–2 because it deepens a working
mechanism rather than restoring a missing surface.

**Independent Test**: Approve a proposed record, then confirm it appears in a reviewable list with
its timestamp, subject, and the basis on which it was recorded.

**Acceptance Scenarios**:

1. **Given** a decision has been approved, **When** the user opens the decision record, **Then** the
   entry appears with its time, the unit or scope it concerns, and its content.
2. **Given** no decisions have been recorded yet, **When** the user opens the record, **Then** an
   explicit empty state is shown and no example or placeholder entry is presented as real.
3. **Given** a proposal that was dismissed rather than approved, **When** the record is reviewed,
   **Then** no entry exists for it.

---

### User Story 5 - The in-warehouse intelligence is visible with its provenance (Priority: P3)

The twin computes forecasting and document retrieval inside the data warehouse rather than in a
separate pipeline — the project's central architectural bet. Today nothing in the interface shows
that work, so a user cannot see the projection, its uncertainty band, or the plant documents behind
a retrieved answer. This story surfaces those results with an explicit statement of where each was
computed and which document each retrieved passage came from.

**Why this priority**: It makes the architecture's principal claim demonstrable rather than
asserted, and it gives the fourth navigation destination a reason to exist. It is P3 because the
figures it exposes support the story rather than answer a daily operational question, and Stories
1–4 deliver operational value first.

**Independent Test**: Open the destination and confirm it shows a forward projection with its
uncertainty band and a document-retrieval result, each stating where it was computed and, for
retrieved text, which document it came from.

**Acceptance Scenarios**:

1. **Given** an in-warehouse projection exists for a unit, **When** it is displayed, **Then** it
   shows the projected values with an uncertainty band and states that it was computed in the
   warehouse.
2. **Given** a document search, **When** results are shown, **Then** each passage names its source
   document so the user can see it came from a project document rather than an external datasheet.
3. **Given** the in-warehouse results have not been produced, **When** the destination is opened,
   **Then** it says so plainly and does not present stale or fabricated values as current.

---

### Edge Cases

- **A capability behind a new screen is unavailable** (physics engine not running, warehouse results
  not produced): the screen states the capability is unavailable and why. It never renders zeros,
  blanks, or a substituted approximation in place of a real figure.
- **The underlying data service cannot be reached at all**: the existing prominent indicator that
  the displayed values are placeholders remains visible on every new screen, exactly as it is on
  existing screens — a new screen must not become a place where fabricated values appear unmarked.
- **A figure depends on an assumed constant rather than a sourced measurement** (for example an
  energy price not drawn from a real price source): the figure is labelled as resting on an
  assumption and the assumption is stated, rather than presented as if measured.
- **A what-if is requested outside the supported operating envelope**: the limit is stated and no
  figure is extrapolated past it.
- **A what-if takes a long time to compute**: the user is shown that work is in progress and can
  abandon it; the interface does not appear frozen or silently time out into a blank result.
- **No decisions have ever been approved**: the decision record shows an explicit empty state; no
  sample row is displayed that could be mistaken for a real decision.
- **The replay timeline is moved while a screen is open**: every figure on that screen updates to
  reflect only evidence available at the new point in time, with no value carried over from a later
  date.
- **A cost assumption is set to an unusable value** (negative, non-numeric, absent): the user is told
  what is wrong and the previously valid result remains displayed.
- **The viewport is narrow**: each new screen remains usable, with content reflowing rather than
  becoming unreachable or overlapping.

## Requirements *(mandatory)*

### Functional Requirements

#### Product surface completeness

- **FR-001**: Every destination reachable from the product's primary navigation MUST present
  functional content. No navigation destination may present an "under construction" or equivalent
  placeholder.
- **FR-002**: Each of the three personas the product serves — plant operator, process engineer,
  operations manager — MUST have a destination that answers that persona's primary question.
- **FR-003**: Every navigation label MUST accurately describe the content of the destination it
  leads to.

#### Operations-manager surface

- **FR-004**: The operations-manager destination MUST present how operating cost is trending across
  the selected period.
- **FR-005**: The operations-manager destination MUST present units ranked by the cost currently
  attributable to their condition, so attention can be prioritised.
- **FR-006**: The operations-manager destination MUST present the cleaning workload over the period
  and its associated cost.
- **FR-007**: The operations-manager destination MUST lead with differences and trends rather than
  absolute cost-of-water headlines, and MUST attach the assumptions in force and an uncertainty
  caveat to any absolute figure it does show.

#### Simulation surface

- **FR-008**: Users MUST be able to change one or more plant operating conditions and request a
  comparison between the unchanged and changed cases.
- **FR-009**: The comparison result MUST present the baseline case, the changed case, and the
  difference between them.
- **FR-010**: The system MUST reject a requested condition that lies outside the range the physics
  capability supports, stating the limit, and MUST NOT extrapolate a figure beyond it.
- **FR-011**: When the physics capability cannot produce a result, the system MUST state that it is
  unavailable and why, and MUST NOT substitute an approximation.
- **FR-012**: Simulation results MUST be labelled as modeled and MUST show the conditions they were
  computed under.
- **FR-013**: Users MUST be able to compose an arbitrary combination of the supported operating
  conditions — each independently settable within its supported range — rather than choosing only
  from a fixed list of prepared scenarios. Every result MUST be computed for the conditions actually
  requested, never selected from a stored set of pre-computed answers.
- **FR-014**: Because a requested comparison is computed on demand and may take appreciable time,
  the system MUST indicate that work is in progress, MUST allow the user to abandon a request in
  progress, and MUST NOT present a blank, stale, or partial result if a request does not complete.

#### Cost-assumption overrides

- **FR-015**: Users MUST be able to change the cost assumptions that economics figures rest on.
- **FR-016**: Changed assumptions MUST cause the affected figures and any recommendation to
  recompute from the changed values.
- **FR-017**: When a change reverses a recommendation, the system MUST state the reversal explicitly.
- **FR-018**: The assumptions in force MUST be visible alongside any economics result.
- **FR-019**: The system MUST reject an assumption value that is not a usable number, explain what is
  wrong, and leave the previously valid result displayed.

#### Decision record

- **FR-020**: Users MUST be able to review the decisions that have been approved, each showing when
  it was recorded, what it concerns, and its content.
- **FR-021**: The decision record MUST show an explicit empty state when nothing has been recorded,
  and MUST NOT display an example entry that could be mistaken for a real decision.
- **FR-022**: A proposal that was dismissed rather than approved MUST NOT appear in the decision
  record.

#### In-warehouse intelligence surface

- **FR-023**: The fourth navigation destination MUST be built as a surface that makes the twin's
  in-warehouse intelligence visible — the forward projections and the document retrieval that are
  computed inside the data warehouse rather than in a separate pipeline.
- **FR-024**: Forward projections presented there MUST show their uncertainty band and MUST state
  that they were computed in the warehouse.
- **FR-025**: Each retrieved document passage MUST name its source document, so a user can see it
  originates from a project document rather than an external manufacturer source.
- **FR-026**: When the in-warehouse results have not been produced, the surface MUST say so plainly
  and MUST NOT present stale or fabricated values as current.

#### Honesty and governance (apply to every new surface)

- **FR-027**: Every quantitative figure on a new surface MUST be labelled measured or modeled,
  consistent with how the rest of the product labels figures.
- **FR-028**: Any figure that derives from an assumed constant rather than a sourced measurement
  MUST be labelled as resting on an assumption, with the assumption stated.
- **FR-029**: When a capability behind a surface is unavailable, the surface MUST say so explicitly
  and MUST NOT render a zero, a blank, or a substituted value in place of a real figure.
- **FR-030**: When the underlying data service is unreachable and placeholder values are being shown,
  the existing prominent indicator of that condition MUST remain visible on every new surface.
- **FR-031**: Every figure on a new surface MUST reflect only evidence available at the currently
  selected point in the replay timeline, and MUST NOT incorporate evidence from a later point.
- **FR-032**: No new surface may present a control that would command or adjust plant equipment;
  every new surface remains advise-only.
- **FR-033**: Each new surface MUST be operable by keyboard and MUST expose its interactive elements
  and status messages to assistive technology.
- **FR-034**: Each new surface MUST remain usable at a narrow viewport, with content reflowing rather
  than becoming unreachable or overlapping.

### Key Entities *(include if feature involves data)*

- **Persona Destination**: A named area of the product serving one persona's primary question —
  operator, process engineer, or operations manager. Each is reachable from primary navigation and
  each must deliver content matching its label.
- **Cost Assumption**: An editable input the economics results rest on (energy price, cleaning cost,
  downtime cost, and similar). Has a current value, a default, and a provenance — sourced from real
  data, or assumed — that travels with any figure derived from it.
- **What-If Comparison**: A pair of modeled cases — the plant as-is and the plant under a change —
  together with the difference between them, the conditions each was computed under, and its modeled
  label.
- **Decision Record Entry**: A durable record of a decision a human approved: when it was recorded,
  the unit or scope it concerns, its content, and the basis on which the write was authorised.
- **Capability Availability State**: Whether the capability behind a surface can currently answer —
  available, unavailable with a stated reason, or not yet produced. Determines whether a surface
  shows a figure or an explicit non-answer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero destinations reachable from primary navigation present a placeholder or
  "under construction" message.
- **SC-002**: All three named personas can reach a destination that answers their primary question —
  verified by walking each persona's question end to end and reaching a real answer.
- **SC-003**: A process engineer can obtain a baseline-versus-scenario comparison, starting from the
  simulation destination, in no more than three interactions.
- **SC-004**: Any combination of the supported operating conditions can be submitted for comparison,
  and every returned result corresponds to the conditions actually requested — zero results are
  served from a pre-computed set.
- **SC-005**: 100% of quantitative figures on new surfaces are labelled measured or modeled; zero
  appear unlabelled.
- **SC-006**: 100% of figures derived from an assumed constant are labelled as resting on an
  assumption, with the assumption stated; zero such figures are presented as measured.
- **SC-007**: When a capability is unavailable, 100% of affected figures show an explicit
  unavailability message; zero show a zero, blank, or substituted value.
- **SC-008**: A comparison request that is still computing is visibly indicated as in progress and
  can be abandoned by the user; zero requests leave the interface appearing unresponsive or resolve
  into a blank result.
- **SC-009**: A change to a cost assumption is reflected in the displayed figures without the user
  needing to reload or re-navigate, and the assumptions in force remain visible in 100% of economics
  results.
- **SC-010**: Every approved decision appears in the reviewable record, and every dismissed proposal
  is absent from it — verified across a set of approvals and dismissals with zero discrepancies.
- **SC-011**: Moving the replay timeline updates every figure on each new surface to that point in
  time; zero figures retain a value derived from a later date.
- **SC-012**: Every new surface is fully operable using only a keyboard, and every interactive
  element and status message is exposed to assistive technology.
- **SC-013**: Every new surface remains usable at a viewport width of 1280 pixels, with no content
  unreachable or overlapping.
- **SC-014**: Zero controls on any new surface can command or adjust plant equipment.

## Assumptions

- **The capabilities behind these surfaces already exist and are not re-implemented here**: the
  economics results, the physics comparison capability, the cost-assumption override capability, the
  decision-record write path, and the in-warehouse projection and retrieval results are all produced
  by earlier features. This feature is the exposure layer over them. Where a capability turns out to
  be missing rather than merely unexposed, that is a finding for planning, not a licence to invent a
  figure.
- **No new figure types are introduced**: every value these surfaces show is a value the twin already
  computes. This feature adds no new analysis, and therefore inherits every existing evidence and
  labelling contract unchanged.
- **The energy price and grid carbon values currently in use are assumed constants, not sourced
  measurements**: the external price and grid data ingest was specified but has not been run, so
  figures depending on them rest on assumptions. This feature does not fix that upstream gap; it
  requires that any figure resting on those values be labelled accordingly (FR-026). Sourcing them
  properly is separate work.
- **"Now" means the currently selected point on the replay timeline**, consistent with the rest of
  the product. These surfaces never imply a live plant connection.
- **A single user role for this release**: all users are treated as having equal access, consistent
  with the existing product decision. Role-differentiated views are out of scope.
- **Placeholder-value behaviour is retained, not removed**: when the data service is unreachable the
  product continues to render placeholder values so the interface still works offline, and continues
  to mark that state prominently. This feature extends that marking to the new surfaces rather than
  changing the underlying behaviour.
- **Visual and interaction design follows the product's existing design language**: this feature
  introduces no new design system, and consistency with existing surfaces is the standard.
- **Deployment is out of scope**: making these surfaces reachable by an external audience depends on
  the product being deployed, which is separate work tracked elsewhere. This feature is complete when
  the surfaces work against a running data service.
- **The physics capability must be reachable for the what-if to function**: because comparisons are
  computed on demand for arbitrary conditions rather than served from a prepared set, User Story 2
  requires the physics capability to be running and reachable. Where it is not, the surface reports
  it as unavailable (FR-011) rather than degrading to an approximation. Ensuring it runs in a
  deployed environment is part of the separate deployment work.

## Dependencies

- **Feature 006 — Operating-Cost & Cleaning Economics (required upstream)**: supplies the cost
  figures, clean-now-versus-wait comparisons, measured-versus-modeled labels, and the editable
  assumptions that the operations-manager surface and the override interaction present.
- **Feature 003 — Physics Deviation Engine (required upstream)**: supplies the physics capability
  the what-if comparison exercises, including its supported operating envelope and its
  unavailable-with-a-reason behaviour.
- **Feature 004 — Forecasting & Anomaly Detection (required upstream)**: supplies the forward
  projections and uncertainty bands the in-warehouse surface presents.
- **Feature 007 — Diagnostic AI Assistant (required upstream)**: supplies the human-approval step
  that produces the decision records this feature makes reviewable, and the document retrieval whose
  results the in-warehouse surface presents.
- **Feature 008 — Visual Operations Twin UI (required upstream)**: supplies the existing design
  language, navigation, replay-timeline control, and the placeholder-value indicator that these new
  surfaces adopt unchanged.
- **A running data service (required)**: these surfaces read results from the product's serving
  layer. Whether that layer is reachable in a deployed environment is out of scope here.

## Clarifications

### Session 2026-08-28

- Q: What is the scope of what-if capability offered to users — arbitrary combinations of operating
  conditions, or a bounded set of prepared scenarios? → A: Option A — arbitrary. Each supported
  condition is independently settable within its range, and every result is computed on demand for
  the conditions actually requested, never served from a pre-computed set (FR-013). This makes the
  physics capability's real ability visible rather than implied, at the cost of requiring that
  capability to be running (recorded in Assumptions) and of needing in-progress and cancel handling
  for requests that take appreciable time (FR-014, SC-008).
- Q: Should the fourth navigation destination be built as an in-warehouse-intelligence surface, or
  removed from navigation? → A: Option A — build it. It becomes the surface that makes the twin's
  in-warehouse forecasting and document retrieval visible with their provenance (FR-023–FR-026),
  giving the project's central architectural claim a demonstrable form and giving already-computed
  results a home. User Story 5 is retained at P3.
