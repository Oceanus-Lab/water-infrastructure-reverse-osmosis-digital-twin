# Research & Architecture Decisions: External Data Ingest

## 1. Triggering Mechanism
**Decision:** Cloud Scheduler triggering a Cloud Run Job (Python).
**Rationale:** We are already heavily invested in GCP (BigQuery, Pub/Sub, Cloud Run). A daily Cloud Run job is serverless, scales to zero, and aligns with the existing budget constraints.
**Alternatives considered:** GitHub Actions cron (free but couples data ingest with source control), Apache Airflow (too heavy for a few simple API calls).

## 2. Ingest Implementation
**Decision:** Python 3.11 scripts using `requests` and `google-cloud-bigquery` to load directly into `ro_raw`.
**Rationale:** Python is our standard for the data pipeline and physics engine. Writing straight to BigQuery `ro_raw` fits the ELT (Extract, Load, Transform) pattern driven by Dataform.

## 3. Frontend Integration
**Decision:** 
1. **Weather:** Surface Open-Meteo forecasts in a new "Environmental Context" section on the plant inspection view, showing forward-looking temperature to explain forecast trends.
2. **ESG (Carbon):** Add a "Carbon Intensity (CO₂/m³)" metric card to the `fleet-grid` and inspection drawer, calculated dynamically using the EIA generation mix.
**Rationale:** The user requested frontend reflection. By displaying these metrics alongside the existing operational KPIs, we contextualize energy consumption and provide the requested ESG output.

## 4. BigQuery Dataform Integration
**Decision:** Create staging views (`stg_eia_prices`, `stg_open_meteo`, `stg_eia_carbon`) and join them into `ro_serving.kpi_daily`.
**Rationale:** Dataform handles the complexity of merging the asynchronous daily updates from external APIs with the internal high-frequency operational data.
