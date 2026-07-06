# Quickstart: External Data Ingest

## Prerequisites
- GCP Project `spatial-cat-489006-a4`
- `google-cloud-bigquery` installed locally
- EIA API v2 Key exported as `EIA_API_KEY`

## 1. Run Ingestion Locally
Navigate to the ingest directory and trigger the jobs:
```bash
cd pipeline/ingest
python fetch_eia.py --type prices
python fetch_eia.py --type carbon
python fetch_weather.py
```

## 2. Verify BigQuery Raw Tables
```bash
bq query --use_legacy_sql=false 'SELECT count(*) FROM `spatial-cat-489006-a4.ro_raw.eia_prices_raw`'
bq query --use_legacy_sql=false 'SELECT count(*) FROM `spatial-cat-489006-a4.ro_raw.open_meteo_forecast_raw`'
```

## 3. Run Dataform
Update the curated tables to propagate the new metrics to the serving layer:
```bash
cd pipeline/dataform
dataform run
```

## 4. Verify Frontend UI
Launch the frontend:
```bash
cd services/frontend
npm run dev
```
Open the Dashboard. Verify that the Fleet Grid now displays a new column for **Carbon Intensity (CO₂/m³)** and **Electricity Cost ($)**. Open a specific plant's inspection drawer to verify the 7-day ambient temperature forecast is displayed.
