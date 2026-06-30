# GCP Infrastructure
**Brief for:** GCP project setup, services to enable, IAM, Cloud Run config, cost controls  
**Feeds into:** GCP setup agent, infrastructure-as-code scaffolding

---

## GCP Project Config

| Item | Value |
|---|---|
| Region | `us-central1` (Iowa) — lowest cost tier, low CO₂ |
| Project naming | `ro-digital-twin-{env}` (e.g., `ro-digital-twin-dev`) |
| Billing | Set budget alert at $50/month for prototype |

---

## Services to Enable

```bash
gcloud services enable \
  bigquery.googleapis.com \
  bigquerydatatransfer.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  dataflow.googleapis.com \
  pubsub.googleapis.com \
  secretmanager.googleapis.com \
  cloudtrace.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  aiplatform.googleapis.com \
  dataform.googleapis.com
```

---

## Cloud Run Services

### WaterTAP Physics Engine Service

| Setting | Value |
|---|---|
| Service name | `watertap-engine` |
| Image | `{REGION}-docker.pkg.dev/{PROJECT}/ro-digital-twin/watertap-engine:latest` |
| Python | 3.11 |
| Memory | 2 GiB |
| CPU | 2 vCPU |
| Min instances | 0 (scale to zero) |
| Max instances | 3 |
| Timeout | 30s |
| Concurrency | 4 (Pyomo is not thread-safe; keep low) |
| Auth | Require IAM auth (internal only) |

### Serving API (Frontend Backend)

| Setting | Value |
|---|---|
| Service name | `ro-serving-api` |
| Memory | 512 MiB |
| CPU | 1 vCPU |
| Min instances | 0 |
| Max instances | 10 |
| Timeout | 10s |
| Auth | Allow unauthenticated (public API for frontend) or API key via API Gateway |

### Historical Replay Harness (the prototype's "live" source)

| Setting | Value |
|---|---|
| Service name | `replay-harness` |
| Role | Reads OCWD history ordered by `reading_date`, publishes to Pub/Sub at an accelerated clock (e.g. 1 sim-day / few sec) |
| Deploy as | Cloud Run **Job** (or a small service with start/stop endpoints for demo control) |
| Publishes to | Pub/Sub topic `ro-readings` → BigQuery streaming insert |
| Production swap-in | Replace with a SCADA / OPC-UA / MQTT connector publishing to the **same** `ro-readings` topic; nothing downstream changes |

---

## BigQuery Datasets

```sql
CREATE SCHEMA ro_raw       OPTIONS(location='us-central1');
CREATE SCHEMA ro_curated   OPTIONS(location='us-central1');
CREATE SCHEMA ro_serving   OPTIONS(location='us-central1');
CREATE SCHEMA ro_simulation OPTIONS(location='us-central1');
CREATE SCHEMA ro_embeddings OPTIONS(location='us-central1');
CREATE SCHEMA ro_forecasts  OPTIONS(location='us-central1');
```

**Partitioning:** All time-series tables → `PARTITION BY DATE(reading_date)`.  
**Clustering:** `(bank_id, unit_id, stage)` on operational tables.  
**Long-term storage:** Automatic after 90 days (~50% cost reduction).

---

## Cloud Storage Buckets

| Bucket | Purpose |
|---|---|
| `{PROJECT}-raw-data` | Raw CSVs from OCWD, EIA, USGS, etc. — append-only |
| `{PROJECT}-dataform` | Dataform workspace files |
| `{PROJECT}-artifacts` | Build artifacts, model outputs |

---

## IAM — Service Accounts & Roles

| Service Account | Roles | Used By |
|---|---|---|
| `watertap-engine@` | `roles/bigquery.dataEditor` (ro_simulation dataset only) | WaterTAP Cloud Run |
| `serving-api@` | `roles/bigquery.dataViewer` (ro_serving, ro_forecasts) | Serving API Cloud Run |
| `adk-agent@` | `roles/bigquery.dataViewer` (all datasets), `roles/run.invoker` (watertap-engine) | ADK Agent on Agent Runtime |
| `dataform@` | `roles/bigquery.dataEditor` (ro_curated, ro_serving, ro_forecasts, ro_embeddings) | Dataform transforms |

**Principle of least privilege** — each service account has only the permissions it needs.

---

## Secret Manager — API Keys & Secrets

Store all external API credentials here. Never in source code or environment variables in plaintext.

| Secret | Used By |
|---|---|
| `eia-api-key` | Data pipeline (EIA electricity prices **and** generation-mix → carbon intensity) |
| `watertap-engine-url` | Agent (internal Cloud Run URL) |

Access pattern:
```python
from google.cloud import secretmanager
client = secretmanager.SecretManagerServiceClient()
secret = client.access_secret_version(name="projects/{PROJECT}/secrets/eia-api-key/versions/latest")
api_key = secret.payload.data.decode("utf-8")
```

---

## Artifact Registry

```bash
gcloud artifacts repositories create ro-digital-twin \
  --repository-format=docker \
  --location=us-central1
```

Images:
- `watertap-engine:latest`
- `ro-serving-api:latest`

---

## Cost Controls

| Control | Setting |
|---|---|
| BigQuery max bytes billed | Set per user/project custom quota (e.g., 100 GB/query for dev) |
| BigQuery budget alert | Alert at $20/month, hard cap at $50/month |
| Cloud Run min instances | 0 for all services (scale to zero) |
| Gemini model default | Flash (not Pro) — 10× cheaper |
| `AI.COUNT_TOKENS` | Pre-check before large `AI.GENERATE` calls |
| `AI.optimized` mode | Use for bulk row scoring (distilled model) |

---

## Monthly Cost Estimate

| Stage | Estimated Cost |
|---|---|
| Prototype (dev/demo) | **$10–15/month** (or $0 with $300 GCP free trial credit) |
| Production pilot (1 facility) | **$100–150/month** |
| Scale (10+ facilities) | **$600–1,100/month** |

**Biggest cost driver:** Gemini model tier (Flash ~$6/mo vs. Pro ~$70/mo at prototype scale).

---

## Observability Stack

| Signal | Service | Notes |
|---|---|---|
| Agent traces | **Cloud Trace** | Built into Agent Runtime; enable on ADK deploy |
| Application logs | **Cloud Logging** | Structured JSON logs from all Cloud Run services |
| Metrics + alerts | **Cloud Monitoring** | Alert on Cloud Run error rate, BQ job failures |
| Agent metrics | **Agent Runtime built-in** | Query latency, tool call frequency, error rate |

---

## Dataform Setup

```bash
# Link Dataform to Git repo
gcloud dataform repositories create ro-digital-twin \
  --region=us-central1 \
  --git-remote-url=https://github.com/{ORG}/ro-digital-twin
```

Dataform workspace structure:
```
definitions/
  staging/         ← raw → clean transforms
  analytics/       ← curated → KPI aggregations
  serving/         ← materialized views for UI
  ml/              ← AI.FORECAST, AI.DETECT_ANOMALIES SQL
  embeddings/      ← AI.GENERATE_EMBEDDING pipelines
```
