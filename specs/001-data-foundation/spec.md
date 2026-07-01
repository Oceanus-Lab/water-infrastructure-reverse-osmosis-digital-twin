# Feature Specification: Data Foundation

**Feature Branch**: `001-data-foundation`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Data Foundation — Establish a unified, trustworthy operational history for a brackish-water reverse-osmosis (BWRO) facility. Today the source data is 21 separate operating units (7 banks A–G × 3 stages) recorded as daily readings in inconsistent layouts (some units have 128 columns, others 117), spanning 2019-01-01 to 2021-01-13. This feature ingests all of that history into a single, consistent, queryable model so that operators, analysts, and downstream AI capabilities can ask questions across the whole plant without worrying about per-unit formatting differences. It must (a) harmonize every unit onto one shared core schema, preserving unit/bank/stage identity; (b) derive per-cycle operating features — most importantly 'days since last cleaning' (a saw-tooth that resets at each clean-in-place event), not absolute membrane age; (c) detect and catalog the clean-in-place (CIP) events from the history so they can serve as ground-truth labels later; and (d) clearly mark which signals are directly measured versus absent for a given unit (for example, energy is metered only on banks F and G). The outcome: a single source of operational truth that every other capability builds on."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One queryable history across all 21 units (Priority: P1)

An analyst or downstream capability needs to ask a single question of the whole facility — "show daily normalized pressure drop and last-stage flux for every unit over the full history" — and get a consistent answer, without first reconciling that some units were recorded with 128 columns and others with 117. The harmonized core model lets any consumer treat all 21 units (7 banks × 3 stages) as rows of one shared shape, with each row carrying its unit, bank, stage, and reading date.

**Why this priority**: This is the foundation every other feature in the project depends on. Until the 21 inconsistent layouts are unified into one trustworthy model with preserved identity, no cross-plant analysis, physics comparison, forecasting, or economics work can begin. Delivered alone, it already replaces 21 fragmented files with one source of operational truth.

**Independent Test**: Load all 21 unit files and confirm that a single query over the unified model returns the expected full-history row count, that every row is attributable to exactly one unit/bank/stage and date, and that the shared core signals are populated for units regardless of their original layout.

**Acceptance Scenarios**:

1. **Given** the 21 source unit files in their two different layouts, **When** the history is ingested into the unified model, **Then** the unified model contains the complete daily history for all 21 units with each row tagged by unit, bank, stage, and reading date.
2. **Given** a unit recorded in the 128-column layout and a unit recorded in the 117-column layout, **When** an analyst queries the shared core signals (e.g. recovery, normalized pressure drop, per-stage flux, salt/organic rejection, feed-water quality), **Then** both units return those signals under the same names and units of measure.
3. **Given** the unified model, **When** an analyst counts distinct units, banks, and stages, **Then** the result is exactly 21 units across 7 banks and 3 stages with no unit duplicated or missing.

---

### User Story 2 - Fouling framed by cleaning cycle, not membrane age (Priority: P2)

An analyst studying membrane degradation needs to compare like-for-like points within a fouling cycle. Because fouling resets at each Clean-In-Place (CIP) event rather than accumulating monotonically with membrane age, the foundation derives a per-cycle "days since last cleaning" feature — a saw-tooth that resets at each cleaning — so that consumers can align readings to where they sit in the current clean→dirty cycle.

**Why this priority**: The project's core insight is that fouling is cyclical, not age-monotonic; analysis keyed to absolute membrane age is misleading. Providing the cycle-relative time feature in the foundation prevents every downstream consumer from re-deriving it inconsistently, and it is the correct frame for all later fouling and anomaly work.

**Independent Test**: For any unit, confirm that the days-since-cleaning value increases by one per day within a cycle and resets to its low value at each recorded cleaning event, and that membrane age (which only increases until a membrane is replaced) is retained as a separate, distinct field.

**Acceptance Scenarios**:

1. **Given** a unit's daily history containing cleaning events, **When** the days-since-cleaning feature is derived, **Then** its value resets to the cycle start within one day of each cleaning event and increases by one per day otherwise.
2. **Given** the same unit, **When** an analyst requests membrane age, **Then** a separate monotonic membrane-age field is available that does not reset at cleaning events.
3. **Given** any reading in the history, **When** an analyst asks which cleaning cycle it belongs to, **Then** the reading can be grouped into a single, identifiable cycle for that unit.

---

### User Story 3 - Cleaning events cataloged as ground-truth labels (Priority: P2)

A reliability analyst needs an authoritative, queryable catalog of every historical Clean-In-Place event — which unit, on which date — so these real maintenance actions can later serve as ground-truth labels for validating fouling and maintenance-prediction work. The foundation detects every cleaning event from the history and records it as a first-class catalog with per-cycle context.

**Why this priority**: These cleaning events are the only real maintenance labels in the dataset. Cataloging them as trustworthy ground truth is essential for later validation, but it can be delivered independently of the cycle feature and the measured/modeled provenance work.

**Independent Test**: Compare the cataloged cleaning events against the cleaning signals in the source history and confirm every event is captured exactly once with its unit and date, and that the total matches the count present in the source.

**Acceptance Scenarios**:

1. **Given** the ingested history with its cleaning signal, **When** cleaning events are cataloged, **Then** each event appears once with its unit and date and no source cleaning event is missed or duplicated.
2. **Given** the cleaning-event catalog, **When** an analyst counts events per unit and across the facility, **Then** the totals reconcile with the cleaning signals in the source history.
3. **Given** a cataloged cleaning event, **When** an analyst inspects it, **Then** it carries enough cycle context (e.g. the cycle it closes) to be usable as a label for that cycle.

---

### User Story 4 - Honest provenance: measured vs. absent per signal (Priority: P3)

A consumer of the foundation — analyst, economics model, or AI capability — must never mistake an absent signal for a real one. Because some signals (notably energy) are metered only on certain units (banks F and G) and absent on the rest, the foundation explicitly marks, per unit and per signal, whether a value is directly measured or simply not available, so downstream work can decide honestly when to use a measured value versus when a value must be modeled elsewhere.

**Why this priority**: Honest provenance is a project principle (measured-vs-modeled), but it is a quality/governance layer on top of the core unified model and can follow the first three stories. It prevents silent errors where a missing energy reading is treated as measured truth.

**Independent Test**: For a signal that is metered only on some units (energy), confirm the foundation reports it as measured for those units and as not-available for the others, and that no absent value is silently presented as a measured zero or estimate.

**Acceptance Scenarios**:

1. **Given** a signal that is metered only on banks F and G, **When** a consumer queries that signal's provenance for a unit, **Then** the foundation reports "measured" for banks F and G and "not available" for the other banks.
2. **Given** a unit with no energy metering, **When** a consumer reads its energy signal, **Then** the absence is explicit and is never represented as a measured value of zero.
3. **Given** any core signal on any unit, **When** a consumer asks whether it is directly measured, **Then** the foundation gives an unambiguous measured/not-available answer.

---

### Edge Cases

- **Missing daily readings**: Source operational columns have small gaps (a few percent of days). The foundation must represent a missing reading as explicitly absent, never as a fabricated or zero value, and a gap must not corrupt the days-since-cleaning count or cycle grouping.
- **Always-empty source columns**: Some source columns are entirely empty for the units that carry them (e.g. energy columns present in a layout but never populated for banks A–E). These must not surface as if they were real measured signals.
- **Cleaning event with no clean preceding history**: A unit whose first recorded cycle begins mid-history (no prior clean baseline visible) must still produce a valid cycle and a valid days-since-cleaning series from the data available.
- **Membrane replacement within the window**: Membrane age may reset when a membrane is replaced; this reset is distinct from a cleaning event and must not be misread as a cleaning cycle reset.
- **Out-of-range or implausible values**: Readings outside physically valid bounds (e.g. recovery outside 0–1, pH outside a plausible band) must be flagged or rejected by the foundation rather than passed through as if trustworthy.
- **Date continuity**: Large gaps in a unit's daily timeline must be detectable so consumers know a stretch of history is missing rather than assuming continuous coverage.
- **Provenance vs. presence**: A signal can be "supported for this unit" yet missing on a given day; the foundation must distinguish "this unit never measures X" from "this unit measures X but not on this date."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST ingest the complete daily operational history for all 21 units (7 banks A–G × 3 stages 01–03) covering the full source time span, preserving every original reading without modifying the source records.
- **FR-002**: The system MUST harmonize units recorded in differing source layouts onto a single shared core schema, so that the same operational signal is exposed under the same name and unit of measure for every unit regardless of its original layout.
- **FR-003**: Each record in the unified model MUST carry its unit, bank, stage, and reading date so that any reading is unambiguously attributable to one operating unit on one day.
- **FR-004**: The unified model MUST allow querying any core operational signal across all 21 units together, without the consumer needing to know or reconcile per-unit layout differences.
- **FR-005**: The system MUST exclude source columns that are entirely empty for the units that carry them, so that empty placeholders are never presented as real measured signals.
- **FR-006**: The system MUST derive a per-unit "days since last cleaning" feature that increases by one per day within a cleaning cycle and resets to the cycle start at each cleaning event (a saw-tooth aligned to the clean→dirty cycle).
- **FR-007**: The system MUST retain membrane age as a separate field distinct from days-since-cleaning, where membrane age increases monotonically and resets only on membrane replacement, not on cleaning.
- **FR-008**: The system MUST allow every reading to be grouped into a single identifiable cleaning cycle for its unit.
- **FR-009**: The system MUST detect every Clean-In-Place (cleaning) event present in the source history and record it in a queryable catalog, capturing the unit and the event date.
- **FR-010**: The cleaning-event catalog MUST capture each source cleaning event exactly once with no missed or duplicated events, and the per-unit and facility totals MUST reconcile with the cleaning signal in the source history.
- **FR-011**: Each cataloged cleaning event MUST carry enough cycle context to be usable as a ground-truth label for the cycle it closes.
- **FR-012**: The system MUST record, per unit and per signal, whether a signal is directly measured or not available for that unit (for example, energy is measured only on banks F and G and not available on banks A–E).
- **FR-013**: The system MUST represent any absent value — whether a signal unsupported for a unit or a missing daily reading — explicitly as absent, never as a fabricated, zero, or estimated value.
- **FR-014**: The system MUST validate ingested readings against physically plausible bounds (e.g. recovery within 0–1, water-quality signals within sensible ranges) and flag or reject values that fall outside those bounds rather than passing them through as trustworthy.
- **FR-015**: The system MUST make data-completeness signals available so consumers can tell where a unit's daily timeline has gaps and which core signals are sufficiently populated to rely on.
- **FR-016**: The unified model and derived features MUST be reproducible from the source history, so that re-running ingestion on the same source yields the same unified model, catalog, and features.

### Key Entities *(include if feature involves data)*

- **Operating Unit**: One of the 21 RO units, identified by its bank (A–G) and stage (01–03). Owns a daily history and a sequence of cleaning cycles. Carries which core signals it supports (notably whether energy is measured).
- **Daily Reading (harmonized)**: One unit's record for one day, on the shared core schema. Attributes include reading date plus core operational signals (recovery, normalized pressure drop, per-stage flux, salt and organic rejection, feed-water quality), the days-since-cleaning value, the cleaning-cycle it belongs to, and membrane age. Every signal is either a measured value or an explicit absence.
- **Cleaning (CIP) Event**: A recorded Clean-In-Place action for a unit on a date. Closes one cleaning cycle and starts the next; serves as a ground-truth maintenance label.
- **Cleaning Cycle**: The span of a unit's history between consecutive cleaning events (or between history start/end and a cleaning event). The natural frame for fouling analysis; the days-since-cleaning feature is measured within it.
- **Signal Provenance**: A per-unit, per-signal statement of whether a signal is directly measured or not available for that unit — the basis for honest measured-vs-modeled handling downstream.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the source daily history for all 21 units is represented in the unified model, with the total record count matching the source and every record attributable to exactly one unit, bank, stage, and date.
- **SC-002**: A single query can return any core operational signal for all 21 units at once, with no consumer-side handling of the original layout differences.
- **SC-003**: For every unit, the days-since-cleaning feature resets within one day of each recorded cleaning event and otherwise increases by exactly one per day, verified across the full history.
- **SC-004**: The cleaning-event catalog reconciles exactly with the cleaning signal in the source — every source cleaning event is captured once, none missed or duplicated, and per-unit and facility totals match.
- **SC-005**: For every signal that is metered on only some units, the foundation correctly reports "measured" for the units that meter it and "not available" for the rest, with zero cases of an absent value presented as measured.
- **SC-006**: Zero fabricated values: no missing reading or unsupported signal anywhere in the unified model is represented as a zero or estimated value in place of an explicit absence.
- **SC-007**: Re-running ingestion on the unchanged source produces an identical unified model, cleaning-event catalog, and derived features (fully reproducible).
- **SC-008**: A new analyst can answer a cross-plant question (e.g. "which units show the steepest last-stage flux decline in their current cleaning cycle?") using only the unified model, without opening any of the original per-unit source files.

## Assumptions

- **Source dataset is authoritative and fixed**: The history is the profiled OCWD brackish-water RO dataset — 21 units (7 banks A–G × 3 stages 01–03), 15,624 daily rows, spanning 2019-01-01 → 2021-01-13, with banks A–E in a 128-column layout and banks F–G in a 117-column layout. These facts are treated as given, not open questions.
- **Cleaning events come from the source cleaning signal**: Clean-In-Place events are read directly from the dataset's existing cleaning flag (≈71 events across the 21 units); no event synthesis or inference beyond reading that signal is required for this feature.
- **Days-since-cleaning exists in source but is re-derived for trust**: The source carries a days-since-cleaning signal; the foundation derives/validates it from first principles (count within cycle, reset at cleaning) rather than trusting the raw column blindly, to guarantee the saw-tooth and cycle grouping are correct.
- **Energy is the primary measured-vs-absent example, not the only one**: Energy is metered only on banks F–G; the provenance mechanism is general and applies to any signal that is supported on some units but not others.
- **Unit/bank/stage identity is recoverable from the source**: Each source unit file maps to a known bank and stage, so identity can be attached during ingestion.
- **Imputing or modeling absent signals is out of scope here**: This feature only marks signals as measured or not-available. Producing modeled stand-ins for absent signals (e.g. physics-modeled energy for banks A–E) belongs to later physics/economics features and is explicitly deferred.
- **Streaming/live ingestion is out of scope here**: This feature establishes the unified historical model from the bulk source. The live/replay event path that feeds the same model in motion is a separate, later feature.
- **Core signal set is the model-ready subset, not all 128/117 columns**: Harmonization targets the shared, model-ready operational signals (the project's core schema), not a verbatim reproduction of every raw source column; raw history is preserved unmodified but consumers work against the harmonized core.

## Dependencies

- **Source data availability**: Requires the 21 OCWD unit history files to be available to the ingestion process.
- **Downstream consumers**: The physics-deviation, forecasting/anomaly, fouling-validation, economics, and AI-assistant features all build on this foundation; its schema and cleaning-event catalog are their shared inputs. Changes here ripple to all of them.
- **Cloud data platform**: A managed analytics data store and transform layer (the project's chosen GCP/BigQuery stack) hosts the unified model and runs the harmonization and feature derivation. Specific technology choices are deferred to planning.
