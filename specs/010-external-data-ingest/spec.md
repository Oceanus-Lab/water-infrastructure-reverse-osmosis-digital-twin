# Feature Specification: External Data Ingest

**Feature Branch**: `feature/external-data-ingest`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Ingest and transform external API data sources (EIA electricity prices, EIA generation mix, and Open-Meteo) into BigQuery to support the RO Digital Twin."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Economic Analysis Foundation (Priority: P1)

As a digital twin engine, I need to know the historical and current cost of electricity so that I can accurately convert Specific Energy Consumption (SEC) into a levelized cost of water (LCOW).

**Why this priority**: Without accurate electricity pricing, the economic model cannot generate a realistic LCOW, which is a key metric for operator decisions.

**Independent Test**: Can be fully tested by verifying that daily/monthly pricing data is ingested from EIA API v2 into BigQuery and joined successfully with operational SEC metrics.

**Acceptance Scenarios**:

1. **Given** a plant operation record at a specific date, **When** the economic model calculates LCOW, **Then** it applies the correct EIA electricity price for that state/month.
2. **Given** missing or delayed EIA data, **When** the ingest runs, **Then** it handles the gap gracefully (e.g., carrying forward the last known price).

---

### User Story 2 - Forward-Looking Weather Integration (Priority: P1)

As a forecasting module, I need to know the upcoming ambient/feed temperatures so that I can accurately predict future fouling and energy consumption under anticipated weather conditions.

**Why this priority**: Temperature significantly impacts RO membrane permeability and energy use. A forecast requires forward-looking inputs.

**Independent Test**: Can be fully tested by verifying that a 7-14 day temperature forecast is successfully pulled from Open-Meteo and stored in BigQuery daily.

**Acceptance Scenarios**:

1. **Given** a daily forecast run, **When** the pipeline requests weather, **Then** the Open-Meteo API provides the expected daily temperatures for the plant location.
2. **Given** an AI forecast scenario, **When** future days are simulated, **Then** it references the Open-Meteo forward feed-temp.

---

### User Story 3 - Carbon Emission Tracking (Priority: P2)

As a sustainability analyst, I need to know the grid's energy generation mix so that I can calculate the CO₂/m³ ESG metric for the RO plant's operations.

**Why this priority**: ESG reporting is a secondary but important outcome, derived from SEC and grid emission factors. Replaces the previously paid "Electricity Maps" solution.

**Independent Test**: Can be fully tested by verifying that EIA grid mix data is ingested and translated into an emission factor per kWh.

**Acceptance Scenarios**:

1. **Given** grid energy generation mix data from EIA, **When** the pipeline transforms it, **Then** it calculates a single CO₂ emission factor per kWh for that period.
2. **Given** an operation record, **When** the dashboard displays ESG metrics, **Then** it calculates CO₂/m³ as SEC × grid emission factor.

### Edge Cases

- What happens when an external API (EIA or Open-Meteo) is down or rate limits the requests?
- How does the system handle schema changes in the external APIs?
- What happens if the geographical location parameters for the APIs are incorrect?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST ingest monthly or daily electricity price data from the US EIA API v2.
- **FR-002**: System MUST ingest grid generation mix data from the US EIA API v2 and derive a carbon emission factor.
- **FR-003**: System MUST ingest forward-looking weather forecasts (ambient/feed temperature) from the Open-Meteo API.
- **FR-004**: System MUST store the raw JSON/CSV responses in BigQuery `ro_raw` dataset.
- **FR-005**: System MUST transform and harmonize the raw external data into structured tables in `ro_curated` via Dataform.
- **FR-006**: System MUST execute these ingestions on a scheduled basis (e.g., daily) to keep data fresh.
- **FR-007**: System MUST handle API rate limits and connection failures gracefully with retries and alerts.

### Key Entities

- **ElectricityPrice**: Represents the $/kWh cost for a given time period and location.
- **GridEmissionFactor**: Represents the CO₂ emissions per kWh based on the regional fuel mix.
- **WeatherForecast**: Represents anticipated temperatures for future dates at the plant coordinates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of historical OCWD data dates (2019-2021) have corresponding electricity price and carbon emission factors available in BigQuery.
- **SC-002**: Weather forecast ingest successfully updates daily without hitting Open-Meteo's non-commercial rate limit (<10k/day).
- **SC-003**: Dataform pipeline successfully joins the external datasets with the core `unit_readings` to produce `ro_serving.kpi_daily` without errors.

## Assumptions

- External APIs (EIA, Open-Meteo) are highly available.
- The free tiers of EIA API v2 and Open-Meteo are sufficient for the daily request volume of the Digital Twin.
- Plant location coordinates and state identifiers are known and static.
- Cloud Scheduler/Cloud Run (or similar mechanism) will be used to trigger the python ingest scripts.
