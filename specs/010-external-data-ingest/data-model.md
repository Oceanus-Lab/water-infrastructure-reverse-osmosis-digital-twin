# Data Model: External Data Ingest

## BigQuery Schema (ro_raw)

### 1. `ro_raw.eia_prices_raw`
- `date` (DATE)
- `state_id` (STRING)
- `price_cents_per_kwh` (FLOAT)
- `ingest_timestamp` (TIMESTAMP)

### 2. `ro_raw.eia_generation_mix_raw`
- `date` (DATE)
- `state_id` (STRING)
- `fuel_type` (STRING)
- `generation_mwh` (FLOAT)
- `ingest_timestamp` (TIMESTAMP)

### 3. `ro_raw.open_meteo_forecast_raw`
- `forecast_date` (DATE)
- `latitude` (FLOAT)
- `longitude` (FLOAT)
- `temperature_2m_mean` (FLOAT)
- `ingest_timestamp` (TIMESTAMP)

## Curated Schema (ro_curated)

### 1. `ro_curated.environmental_context`
- `date` (DATE)
- `plant_id` (STRING)
- `electricity_cost_usd_per_kwh` (FLOAT)
- `grid_carbon_intensity_kg_per_kwh` (FLOAT)
- `ambient_temperature_c` (FLOAT)

## Serving Schema Updates (ro_serving)

### 1. `ro_serving.kpi_daily` (Modified)
- `date` (DATE)
- `plant_id` (STRING)
- `total_production_m3` (FLOAT)
- `specific_energy_kwh_per_m3` (FLOAT)
- **[NEW]** `energy_cost_usd` (FLOAT) = `specific_energy_kwh_per_m3` * `electricity_cost_usd_per_kwh`
- **[NEW]** `carbon_emissions_kg` (FLOAT) = `specific_energy_kwh_per_m3` * `grid_carbon_intensity_kg_per_kwh`
