# Implementation Plan: External Data Ingest

**Branch**: `feature/external-data-ingest` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-external-data-ingest/spec.md`

## Summary

This plan defines the ingestion mechanism for the EIA API (electricity prices, generation mix/carbon) and Open-Meteo (forward weather forecast) into BigQuery, driving the economic and AI components of the Digital Twin. It includes Dataform transform logic to compute LCOW and ESG metrics (CO₂/m³) dynamically, and updates the Next.js frontend UI (`fleet-grid` and inspection drawer) to display the newly available Carbon Intensity, energy cost, and forward-looking ambient temperature contexts.

## Technical Context

**Language/Version**: Python 3.11 (Ingest scripts) / TypeScript & React (Frontend UI)

**Primary Dependencies**: `google-cloud-bigquery`, `requests` (Ingest); Next.js, shadcn/ui, TailwindCSS (Frontend)

**Storage**: Google BigQuery (`ro_raw`, `ro_curated`, `ro_serving` datasets)

**Testing**: `pytest` for ingestion scripts

**Target Platform**: GCP Cloud Run Jobs (Ingest trigger) / Vercel or GCP Cloud Run (Next.js Frontend)

**Project Type**: Data Pipeline + Frontend UI

**Performance Goals**: N/A (Asynchronous daily batch)

**Constraints**: <10k/day API requests for Open-Meteo (Non-commercial limits)

**Scale/Scope**: 1-14 days lookahead for weather; statewide monthly updates for EIA

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status |
|---|---|
| I. BigQuery-as-AI-Compute | ✅ Data is loaded into BQ `ro_raw` and transformed via Dataform natively in-place. |
| II. Evidence Over Assertion | ✅ UI strictly labels external numbers vs internally calculated SEC. ESG metrics derive mechanically from EIA mix. |
| IV. Measured vs Modeled Honesty | ✅ ESG metrics surface grid-level averages; explicit mapping. |

## Project Structure

### Documentation (this feature)

```text
specs/010-external-data-ingest/
├── plan.md              # This file
├── research.md          # Architecture and tooling decisions
├── data-model.md        # BigQuery schema for external datasets
└── quickstart.md        # Manual execution and UI verification guide
```

### Source Code (repository root)

```text
pipeline/
├── ingest/
│   ├── fetch_eia.py       # Pulls grid mix and pricing
│   └── fetch_weather.py   # Pulls Open-Meteo 7-day forecasts
└── dataform/
    └── definitions/
        ├── staging/
        │   ├── stg_eia_prices.sqlx
        │   ├── stg_eia_carbon.sqlx
        │   └── stg_open_meteo.sqlx
        └── curated/
            └── environmental_context.sqlx

services/frontend/
├── components/
│   ├── charts/
│   │   └── fleet-grid.tsx       # Add ESG Carbon Intensity / LCOW columns
│   └── inspection-drawer.tsx    # Add forward-looking weather context
```

**Structure Decision**: Add Python scripts to `pipeline/ingest` and new SQLX staging/curated tables to `pipeline/dataform`. Modify existing frontend components (`fleet-grid.tsx` and `inspection-drawer.tsx`) to render the newly populated data.
