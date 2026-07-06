# Tasks: 002-live-replay

**Input**: Design documents from `/specs/002-live-replay/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Phase 1: Setup (Shared Infrastructure)
**Purpose**: Project initialization and basic structure

- [x] T001 Create `services/replay/src` and `services/replay/tests` directories
- [x] T002 Initialize Python requirements file `services/replay/requirements.txt` with `google-cloud-pubsub`, `pandas`, `asyncio`
- [x] T003 [P] Configure basic logging in `services/replay/src/logger.py`

## Phase 2: Foundational (Blocking Prerequisites)
**Purpose**: Core infrastructure for Pub/Sub publishing

- [x] T004 Create Pub/Sub connector abstraction in `services/replay/src/pubsub_connector.py`
- [x] T005 Create data loader to parse `ro_curated` CSV history into memory in `services/replay/src/data_loader.py`

## Phase 3: User Story 1 - Ticking Clock & Emitting Readings (Priority: P1) 🎯 MVP
**Goal**: The simulation clock advances and emits readings strictly in chronological order.

### Implementation for User Story 1
- [x] T006 [P] [US1] Create SimulationClock model in `services/replay/src/clock.py`
- [x] T007 [US1] Implement core `asyncio` harness loop in `services/replay/src/harness.py` that polls the clock and emits due events.
- [x] T008 [US1] Add integration test for harness loop in `services/replay/tests/test_harness.py`

## Phase 4: User Story 2 - Controllable Replay Clock (Priority: P1)
**Goal**: Add play, pause, jump, and speed controls.

### Implementation for User Story 2
- [x] T009 [P] [US2] Create Controller API in `services/replay/src/controller.py` to accept state changes.
- [x] T010 [US2] Connect Controller API state changes to SimulationClock in `services/replay/src/clock.py`.

## Phase 5: User Story 3 - Honestly Labeled as Replay (Priority: P2)
**Goal**: Every payload declares it is a replay and exposes the simulation clock.

### Implementation for User Story 3
- [x] T011 [P] [US3] Update `pubsub_connector.py` payloads to inject `"is_historical_replay": True` and `"simulation_clock_date"` fields.

## Phase 6: User Story 4 - Live-Ready Swap (Priority: P2)
**Goal**: The event path is decoupled.

### Implementation for User Story 4
- [x] T012 [P] [US4] Finalize `pubsub_connector.py` so it accepts environment variables (`PUBSUB_TOPIC`, `PUBSUB_PROJECT`) allowing easy swap.

## Phase 7: Polish & Cross-Cutting Concerns
**Purpose**: Improvements that affect multiple user stories

- [x] T013 Code cleanup and refactoring
- [x] T014 Run quickstart.md validation locally
- [x] T015 Commit to branch `002-live-replay` and prepare to push.
