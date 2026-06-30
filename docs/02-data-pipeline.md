# Data Pipeline & BigQuery Architecture
**Brief for:** BigQuery schema design, ETL setup, AI function configuration, Dataform transforms  
**Feeds into:** GCP infrastructure setup, coding agent for data layer

---

## Pipeline Design Principle

**Event-driven and live-ready; the prototype runs in historical-replay mode.** The architecture is a production-grade live digital-twin pipeline. The same BigQuery schema and tables serve every mode — only the *source connector* changes.

```
Bulk backfill:    CSV files → Cloud Storage → BQ load                         (one-time history load)
Prototype "live": OCWD history → Clock-driven REPLAY harness → Pub/Sub → BQ   (streams history as if arriving now)
Production:       Plant SCADA / OPC-UA / MQTT → Pub/Sub → BQ                  (same topic; swap the source)
                                    OR  BigQuery continuous queries (streaming SQL, no always-on Dataflow)
```

The **replay harness** reads rows ordered by `reading_date` and publishes them to Pub/Sub at an accelerated, configurable cadence (e.g. 1 simulated day / few seconds), so the agent, twin UI, and anomaly path all experience a genuine live stream. Production replaces only the harness with a real SCADA connector publishing to the same topic — making "is this live?" a deliberate, honest design choice rather than an exposed gap.

---

## ETL Stack

| Stage | Technology | Notes |
|---|---|---|
| Raw storage | **Cloud Storage** (GCS) | Bucket per data source; raw never modified |
| Batch load | **Dataflow** (Apache Beam) or BQ native load job | Normalization, unit conversion, quality checks |
| Transforms | **Dataform** (GCP-native, dbt-like) | Versioned, tested SQL; raw → curated → serving layers |
| Live replay (prototype) | **Clock-driven replay harness → Pub/Sub → BQ** | Streams real OCWD history as if live; the prototype's "live" feel |
| Production streaming (swap-in) | **SCADA/OPC-UA/MQTT → Pub/Sub → BQ** | Same topic + schema; replace only the source connector |
| Continuous queries (option) | **BigQuery continuous queries** | Streaming SQL over incoming rows, no always-on Dataflow |

---

## BigQuery Layer Design

Three logical layers in BigQuery (implemented as datasets):

```
ro_raw          ← unchanged source data (append-only, partitioned by date)
ro_curated      ← cleaned, normalized, enriched (Dataform outputs)
ro_serving      ← materialized views, pre-aggregated KPIs for UI
ro_simulation   ← WaterTAP baseline outputs + anomaly delta scores
ro_embeddings   ← document/event embeddings for VECTOR_SEARCH (RAG)
ro_forecasts    ← AI.FORECAST outputs (production, LCOW, energy, SEC)
```

### Partitioning Strategy
- Partition all time-series tables by `DATE(reading_date)` 
- Cluster by `(bank_id, unit_id, stage)` — matches query patterns
- Long-term storage discount kicks in after 90 days (auto)

---

## Dataset Reality (Profiled)

_Profiled directly from the 21 CSVs. This grounds every schema and feature decision below._

| Fact | Value |
|---|---|
| Units | 21 = 7 banks (A–G) × 3 stages (01/02/03) |
| Rows | 744 daily rows/unit → **15,624 total** |
| Time span | **2019-01-01 → 2021-01-13** (~2 years) |
| Columns | **128 (banks A–E)** vs **117 (banks F–G)** — two schemas |
| Data quality | 123/128 cols <5% missing; ops cols ~719/744 (~3.4% gaps) |
| Always-empty (A–E) | `total_kw`, `erd_boost_pressure`, `calc_conc_cond`, `calc_2_3_cond`, `calc_conc_corr_factor` — drop on ingest |
| Labeled events | `cip` flags **71 Clean-In-Place events** across all units |
| Energy data | Populated **only on banks F–G** (`total_kw`, `k_wh_feed_pump`, `erd_k_w`, `amps_erd`) |

**Schema variance (the core ingestion problem):**
- A–E-only (~26 cols): bucket-flow tests (`stage_N_bucket_flow/ec`), `stage_N_flow`, `x{1st,2nd,3rd}_pass_dp`, `kva`, `feed_psi`, `conc_psi`, `membrane_psi`, `total`.
- F–G-only (~15 cols): ERD energy (`erd_k_w`, `amps_erd`, `k_wh_feed_pump`, `total_kw`), `perm_flow_stage_{2,3}`, `stage_N_d_p`, `feed_press_stage_1`, `conc_press`.

**Three signal insights:**
1. `cip` = binary cleaning event → **supervised maintenance labels** (no synthesis needed).
2. `dss` = days-since-cleaning, **resets to 1 at each CIP** (saw-tooth) → the correct fouling-cycle frame.
3. `days_since_replacement` = monotonic membrane age. corr(age, normalized ΔP) ranges −0.46…+0.84 across units → fouling is **cyclical, not age-monotonic**. Model per CIP cycle, not calendar.

---

## Schema Design (Concrete)

Don't load 128/117 raw columns blindly. Land raw, then project into a **harmonized core** + **bank-group extensions**.

```
ro_raw.unit_readings_ae_raw     ← banks A–E, 128 cols verbatim (append-only)
ro_raw.unit_readings_fg_raw     ← banks F–G, 117 cols verbatim (append-only)
        │  (Dataform: select + rename + drop-empty + cast)
        ▼
ro_curated.unit_readings        ← HARMONIZED CORE (~40 shared, model-ready cols)
ro_curated.unit_energy          ← measured energy (F–G) + WaterTAP-imputed (A–E)
```

### `ro_curated.unit_readings` — harmonized core columns

| Column | Source | Notes |
|---|---|---|
| `unit_id`, `bank_id`, `stage`, `reading_date` | from filename + `date` | keys; partition by date, cluster by bank/unit/stage |
| `temp_c`, `unit_recovery` | direct | recovery range-checked 0–1 |
| `unit_dp`, `unit_n_delta_p` | direct | normalized ΔP = primary fouling indicator |
| `stage_1_flux`, `stage_2_flux`, `stage_3_flux` | direct | per-stage flux decline |
| `perm_ec`, `feed_ec`, `percent_ec_removal` | direct/`ec` | salt rejection proxy |
| `rof_toc_avg`, `rop_toc_avg`, `percent_toc_removal` | direct | organic fouling driver |
| `ph`, `turb`, `cl2_tot` | direct | feed-water quality |
| `cip` | direct | **event label (0/1)** |
| `dss` | direct | days-since-cleaning (resets at CIP) |
| `days_since_replacement` | direct | membrane element age |

### Key Tables

| Table | Layer | Primary Key | Description |
|---|---|---|---|
| `unit_readings_{ae,fg}_raw` | raw | unit_id, reading_date | Verbatim source, two schemas, append-only |
| `unit_readings` | curated | unit_id, reading_date | Harmonized core (~40 cols), model-ready |
| `unit_energy` | curated | unit_id, reading_date | Measured (F–G) + WaterTAP-imputed (A–E) energy/SEC |
| `unit_features` | curated | unit_id, reading_date | Engineered features (see below) |
| `unit_baselines` | simulation | unit_id, config_hash, solved_at | WaterTAP clean-membrane baselines |
| `fouling_scores` | curated | unit_id, reading_date | Δ(actual − baseline) anomaly score |
| `cip_events` | curated | unit_id, cip_date | Derived from `cip` flag: 71 labeled events + cycle stats |
| `kpi_daily` | serving | facility_id, date | LCOW, SEC, energy cost, production vol |
| `alerts` | serving | alert_id, created_at | AI.CLASSIFY-generated operational alerts |
| `forecasts_production` | forecasts | unit_id, forecast_date | AI.FORECAST output (production volume) |
| `forecasts_lcow` | forecasts | facility_id, forecast_date | AI.FORECAST output (LCOW) |
| `doc_embeddings` | embeddings | chunk_id | SOP/manual/WaterTAP doc chunks + vectors |
| `event_embeddings` | embeddings | event_id | Historical CIP/alert embeddings for similarity search |

---

## Feature Engineering (`ro_curated.unit_features`)

Grounded in the real signal columns. Computed in Dataform SQL (window functions over `dss` cycles).

| Feature | Definition | Powers |
|---|---|---|
| `flux_decline_7d` / `_30d` | rolling mean Δ of `stage_3_flux` within current `dss` cycle | fouling rate |
| `ndp_slope_cycle` | linear slope of `unit_n_delta_p` since last CIP | fouling severity |
| `recovery_norm` | `unit_recovery` normalized to clean-baseline @ same `temp_c` | temp-corrected health |
| `salt_passage` | `1 - percent_ec_removal` | integrity/scaling |
| `toc_load` | `rof_toc_avg` 7d mean | organic fouling pressure |
| `days_to_next_cip` | lookahead to next `cip=1` (label) | **maintenance prediction target** |
| `cip_imminent` | `days_to_next_cip <= 14` (binary label) | **AI.SCORE / classifier target** |
| `cycle_id` | running count of CIP events per unit | per-cycle grouping |
| `cross_bank_rank` | unit's fouling-rate percentile vs all 21 units | benchmarking |

**Energy imputation (A–E):** calibrate WaterTAP SEC against measured F–G `total_kw`/permeate-flow, then predict A–E energy from physics → `unit_energy`. This is the bridge that makes SEC/LCOW computable plant-wide.

---

## Data Quality & Validation (Dataform Assertions)

Concrete assertions grounded in the profile — fail the pipeline on violation:

| Assertion | Rule |
|---|---|
| Drop-empty | A–E always-empty cols never land in curated |
| Null guard | core ops cols (`unit_recovery`, `unit_n_delta_p`, flux) > 90% non-null per unit |
| Range: recovery | `unit_recovery` BETWEEN 0 AND 1 |
| Range: pH | `ph` BETWEEN 5 AND 9 |
| Range: removal | `percent_ec_removal`, `percent_toc_removal` BETWEEN 0 AND 1 |
| Monotonicity | `days_since_replacement` non-decreasing within a unit between membrane swaps |
| CIP reset | `dss` resets to ≤1 within 1 day of every `cip=1` |
| Date continuity | no gap > 3 days in `reading_date` per unit |
| Schema guard | row column-set matches its declared bank-group schema |

---

## Multi-Source Ingestion (Requirement: "data from multiple sources")

| Source | Type | Join key | Contributes |
|---|---|---|---|
| OCWD CSVs | structured time-series | unit_id + date | operational core (above) |
| US EIA prices | structured API | region + month | $/kWh → energy cost, LCOW |
| EIA generation mix | structured API | grid + date | emission factor → CO₂/m³ (carbon) |
| Open-Meteo | structured API | location + date | forecast ambient temp → seasonal scenarios |
| WaterTAP outputs | simulated | unit + config | clean baselines, imputed energy |
| SOPs / manuals / WaterTAP docs | **unstructured** | embedding | RAG corpus → `doc_embeddings` |
| CIP/alert history | semi-structured | event_id | similarity search → `event_embeddings` |

---

## Mapping to Decision Intelligence Requirements

| Platform Requirement | Data/AI Component |
|---|---|
| (a) Ingest & analyze multiple sources | Multi-source ingestion table above; structured CSVs/APIs + unstructured docs |
| (b) Natural-language interaction | ADK agent over BigQuery; `AI.GENERATE` in SQL |
| (c) Insights / forecasts / alerts | `AI.FORECAST` → `forecasts_*`; `AI.GENERATE`/`AI.CLASSIFY` → `alerts` |
| (d) Patterns / trends / anomalies | `AI.DETECT_ANOMALIES` + `fouling_scores` (Δ vs WaterTAP); CIP-cycle features |
| (e) Decision support | maintenance ROI from `cip_events` + `days_to_next_cip`; agent recommendations |
| (f) Scalable GCP deploy | BigQuery + Cloud Run (scale-to-zero), batch-first/streaming-ready |

---

## BigQuery AI Functions — Available in SQL (No Model Management)

These are GA or Preview as of 2026-06-30. Use these **before** building custom Vertex AI models.

| Function | Model | What It Does | Our Use Case |
|---|---|---|---|
| `AI.FORECAST` | TimesFM (built-in) | Time-series forecasting, zero training | Production volume, LCOW, SEC, energy cost forecasting |
| `AI.DETECT_ANOMALIES` | TimesFM (built-in) | Time-series anomaly detection | Fouling/scaling anomaly signals in `unit_readings` |
| `AI.GENERATE` | Gemini 3.0 | Gemini inference in SQL, structured output | NL plant summaries, maintenance recommendations |
| `AI.GENERATE_TABLE` | Gemini 3.0 | Returns structured table from prompt | Extract structured alerts from unstructured logs |
| `AI.CLASSIFY` | Gemini | Semantic classification | Classify alert type (fouling / scaling / integrity / energy) |
| `AI.SCORE` | Gemini | Score rows by semantic criteria | Severity scoring for alerts |
| `AI.AGG` | Gemini | Semantic aggregation over grouped rows | Summarize daily events per unit |
| `AI.IF` | Gemini | Conditional semantic filter | Filter rows by natural-language condition |
| `AI.GENERATE_EMBEDDING` | text-embedding | Generate vector embeddings | Embed SOPs, docs, historical events |
| `VECTOR_SEARCH` | — | ANN vector similarity search | RAG retrieval, "similar past fouling event" lookup |
| `AI.COUNT_TOKENS` | — | Pre-check token count before AI call | Cost control — skip expensive calls on large inputs |

**Cost control:** Use `AI.COUNT_TOKENS` before `AI.GENERATE` calls on large tables. Use `optimized` mode for bulk scoring (distilled model, lower cost at scale).

---

## Confirmed Datasets

| Dataset | Source | Contents | Format |
|---|---|---|---|
| **OCWD RO Fouling** | [Harvard Dataverse DOI:10.7910/DVN/PVY3QD](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/PVY3QD) | 21 units, 7 banks × 3 stages, **daily 2019-01-01–2021-01-13**, 15,624 rows, 128/117-col schemas, 71 labeled CIP events | 21 CSVs (downloaded) |

---

## Priority Dataset Acquisitions

_Validated live 2026-06-30. The OCWD dataset is rich and self-sufficient for the core fouling/anomaly/forecast story — these are **enrichment joins**, not replacements. Kept deliberately lean: each must earn its place._

| Dataset | Purpose | Source | Cost | Validated |
|---|---|---|---|---|
| **US EIA Electricity Prices** | $/kWh by state/month → converts SEC to energy cost, drives LCOW | [EIA API v2](https://www.eia.gov/opendata/) (free key) | Free | ✅ Essential join |
| **WaterTAP Costing Module** | LCOW, SEC baseline, CAPEX/OPEX | Built into WaterTAP package | Free | ✅ Already in stack |
| **Open-Meteo (forecast)** | **Forward** feed-temp / ambient for forecast scenarios (historical temp already in OCWD `temp_c`) | [open-meteo.com](https://open-meteo.com/en/docs/historical-weather-api) | Free (non-commercial, <10k/day) | ✅ Repositioned to forecast-only |
| **EIA generation mix → carbon** | CO₂/m³ ESG metric = SEC × grid emission factor (derived from EIA fuel mix) | [EIA API v2](https://www.eia.gov/opendata/) | Free | ✅ Replaces paid Electricity Maps |
| **NAWI Water-DAMS** | BWRO SEC/LCOW benchmarks for validation | [Water-DAMS](https://www.nawihub.org/?page_id=669) | Free | ✅ Corrected link (old `/resources` = legal docs) |
| **Historical Replay Harness** | Clock-driven replay of real OCWD history → Pub/Sub — the prototype's "live" data thread (core demo mechanism) | OCWD CSVs + Pub/Sub | To build | ✅ Core demo |

**Demoted / rejected after validation:**
- ❌ **UCI Water Treatment Plant** — 1993, 527 rows, urban *wastewater* (BOD/COD/solids), not RO/membranes. Wrong domain; OCWD's 15,624 rows + 71 CIP labels are far better for anomaly training.
- ❌ **USGS Water Use** — county-level, compiled every 5 years. Too coarse to drive plant-level decisions.
- ⚠️ **AWWA Rate Survey** — paywalled. Model tariff as a per-facility **config parameter** instead (see [01-problem-domain.md](01-problem-domain.md) revenue model).
- ⚠️ **Electricity Maps** — not free (€6,000/yr/country; 14-day trial only). Derive carbon from free EIA generation mix instead.

## Future / Advanced Datasets

| Dataset | Purpose | Source |
|---|---|---|
| Real utility operational logs | Production volume, OPEX actuals | Direct utility partnership |
| Chemical pricing indices | Antiscalant, acid cost trends | IHS Markit / ICIS |

---

## Dataform — Transform Governance

Use Dataform (GCP-native) for all SQL transforms:
- Version-controlled in Git
- Tested with assertions (row count, null checks, value ranges)
- Dependency graph: raw → curated → serving
- No extra cost — included in BigQuery

Transform chain (grounded in real schema):
```
ro_raw.unit_readings_ae_raw  ┐
ro_raw.unit_readings_fg_raw  ┘→ ro_curated.unit_readings   (harmonize 128/117→core, drop-empty, range-check)
                                → ro_curated.cip_events     (derive from cip flag: 71 events + cycle stats)
                                → ro_curated.unit_energy    (measured F–G + WaterTAP-imputed A–E)
                                → ro_curated.unit_features  (flux decline, ndp slope/cycle, days_to_next_cip)
                                → ro_curated.fouling_scores (Δ actual vs WaterTAP baseline)
                                → ro_serving.kpi_daily      (LCOW, SEC, production per facility/date)
                                → ro_forecasts.forecasts_*  (AI.FORECAST over kpi_daily / unit_features)
```
