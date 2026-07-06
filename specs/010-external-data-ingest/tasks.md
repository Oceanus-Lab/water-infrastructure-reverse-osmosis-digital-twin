# Tasks: External Data Ingest

**Input**: Design documents from `/specs/010-external-data-ingest/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Python ingest scripts directory (`pipeline/ingest`) and `requirements.txt`.
- [x] T002 Add `google-cloud-bigquery` and `requests` to `pipeline/ingest/requirements.txt`.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T003 Set up BigQuery datasets (`ro_raw` and `ro_curated`) if not already present.
- [x] T004 Create foundational Dataform project structure in `pipeline/dataform/` if not present.

## Phase 3: User Story 1 - Economic Analysis Foundation (Priority: P1)

**Goal**: Ingest EIA API v2 electricity pricing to accurately convert SEC into LCOW.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create `fetch_eia.py` script to pull electricity prices in `pipeline/ingest/fetch_eia.py`.
- [x] T006 [P] [US1] Define raw BQ schema for prices in `pipeline/ingest/fetch_eia.py` and implement write to `ro_raw.eia_prices_raw`.
- [x] T007 [US1] Create staging SQLX view `stg_eia_prices.sqlx` in `pipeline/dataform/definitions/staging/`.
- [x] T008 [US1] Update `ro_serving.kpi_daily` or create `environmental_context.sqlx` in Dataform to calculate `energy_cost_usd`.
- [x] T009 [US1] Update `fleet-grid.tsx` in `services/frontend/components/charts/` to display `energy_cost_usd` per plant.

## Phase 4: User Story 2 - Forward-Looking Weather Integration (Priority: P1)

**Goal**: Pull 7-14 day temperature forecast from Open-Meteo into BQ and surface in frontend.

### Implementation for User Story 2

- [x] T010 [P] [US2] Create `fetch_weather.py` script to pull Open-Meteo data in `pipeline/ingest/fetch_weather.py`.
- [x] T011 [P] [US2] Implement write to `ro_raw.open_meteo_forecast_raw` in `fetch_weather.py`.
- [x] T012 [US2] Create staging SQLX view `stg_open_meteo.sqlx` in `pipeline/dataform/definitions/staging/`.
- [x] T013 [US2] Update frontend `inspection-drawer.tsx` in `services/frontend/components/` to display the 7-day ambient temperature context.

## Phase 5: User Story 3 - Carbon Emission Tracking (Priority: P2)

**Goal**: Ingest EIA grid mix to calculate CO2/m3 ESG metric.

### Implementation for User Story 3

- [x] T014 [P] [US3] Expand `fetch_eia.py` to support pulling generation mix and calculating emissions.
- [x] T015 [P] [US3] Implement write to `ro_raw.eia_generation_mix_raw` in `fetch_eia.py`.
- [x] T016 [US3] Create staging SQLX view `stg_eia_carbon.sqlx` in `pipeline/dataform/definitions/staging/`.
- [x] T017 [US3] Update Dataform `environmental_context.sqlx` or `kpi_daily` to output `carbon_emissions_kg`.
- [x] T018 [US3] Update `fleet-grid.tsx` in `services/frontend/components/charts/` to display ESG Carbon Intensity (CO2/m3).

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T019 Ensure Python dependencies are documented.
- [x] T020 Run `dataform run` and verify all tables materialize successfully.

## Dependencies & Execution Order

- **Phase 1 & 2**: Can run immediately. Wait for datasets to exist.
- **Phase 3 (US1)**: Must run first to establish pricing pipeline.
- **Phase 4 (US2)**: Can run in parallel with US1.
- **Phase 5 (US3)**: Builds on the EIA ingestion pattern from US1. Can be done right after US1.
