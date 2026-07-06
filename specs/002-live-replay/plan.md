# Implementation Plan: Live Operations Replay

**Branch**: `002-live-replay` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-live-replay/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

This feature converts the static digital twin into an always-moving "now". A replay harness will stream historical unit readings (2019-2021) in chronological order via a controllable simulation clock. The architecture ensures that "swapping the historical source for a real plant feed is a single connector change with no downstream rework."

## Technical Context

**Language/Version**: Python 3.11

**Primary Dependencies**: `google-cloud-pubsub`, `pandas`, `asyncio`

**Storage**: BigQuery, Pub/Sub

**Testing**: `pytest`

**Target Platform**: GCP Cloud Run (for API/Consumers) or a simple background Python daemon (for the Replay Harness).

**Project Type**: Background streaming orchestrator & Replay state manager.

**Performance Goals**: Support simulated speed up to 1 day per second without dropping messages.

**Constraints**: Must run asynchronously to emit non-blocking events and accept live control commands (play/pause/jump).

**Scale/Scope**: 21 units (with focus on Vertical Slice Bank F first), ~15,624 daily rows.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. BigQuery-as-AI-Compute**: Pass. Current state will reside in BigQuery or memory-backed materialized views reading directly from the Pub/Sub connector, without moving to external silos.
- **III. Advise-Only**: Pass. Replay harness emits readings only; no actuation logic.
- **VI. Honest Twin Maturity**: Pass. The design explicitly forces an "is_historical_replay: true" label on the payload to prevent faking a live plant.

## Project Structure

### Documentation (this feature)

```text
specs/002-live-replay/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
services/replay/
├── src/
│   ├── harness.py           # Core asyncio streaming logic
│   ├── controller.py        # Control server for play/pause/jump
│   └── pubsub_connector.py  # Abstraction for the single connector
└── tests/
    └── test_harness.py
```

**Structure Decision**: A dedicated `services/replay` directory to keep the orchestrator decoupled from the Serving API and AI logic. This ensures the single-connector swap cleanly isolates the replay engine from the rest of the application.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations.*
