# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**RO Digital Twin (product name "Oceanus")** — a cloud-native digital twin for Municipal/Industrial
Brackish Water RO (BWRO) facilities on GCP. Unifies operational data (BigQuery), physics simulation
(WaterTAP), AI diagnostics (ADK agent on Gemini), and economics into one platform. Prototype runs in
**historical-replay mode** against the real Orange County Water District (OCWD) dataset (21 units,
7 banks × 3 stages, daily 2019-01-01 → 2021-01-13, 15,624 rows, 71 labeled CIP events).

Read [AGENTS.md](AGENTS.md) first — it holds the load-bearing conventions and gotchas (WaterTAP
import paths, dataset harmonization quirks, fouling-cycle semantics, economics framing, agent
governance rules). Do not duplicate that content here; this file only adds commands/architecture
context AGENTS.md doesn't cover. [docs/00-overview.md](docs/00-overview.md) and
[docs/2026-06-30-decisions.md](docs/2026-06-30-decisions.md) are the architecture source of truth —
treat design docs under `docs/` and `specs/` as authoritative, don't re-derive them from code alone.

**Architecture principle (do not violate):** BigQuery is both storage AND the primary AI compute
layer — forecasting/anomaly detection/embeddings/NL summarization happen in-SQL (`AI.FORECAST`,
`AI.DETECT_ANOMALIES`, `AI.GENERATE`, `VECTOR_SEARCH`). Vertex AI / ADK Agent Runtime is for agent
orchestration only. Agents are read-only / advise-only — they may propose-to-record but never
actuate plant equipment.

## Repository layout

```
services/
  agent/            ADK 2.0 multi-agent (Coordinator + DataAnalyst/Simulation/Economics/Document)
  source-tracing/   Runnable Python prototype of specs 003–007 (physics deviation, forecast/
                     anomaly, fouling validation/backtest, economics, AI assistant briefings)
  serving-api/       FastAPI bridge serving source-tracing CSV outputs to the frontend (spec 008)
  replay/            Clock-driven harness that streams OCWD history through Pub/Sub like a live feed
  frontend/          Next.js 2.5D "digital twin" UI (App Router)
  platform-healthcheck/  Minimal Cloud Run health-check service
pipeline/
  ingest/            BigQuery loaders (load_raw.py, fetch_eia.py, fetch_weather.py, column_maps.py)
  dataform/          Versioned SQL transforms (staging → curated), definitions + assertions
infra/
  terraform/         GCP foundation: BQ datasets, Pub/Sub topic, buckets, Artifact Registry, IAM,
                     secret containers, budget. Does NOT declare Cloud Run services.
  scripts/           bootstrap.sh (phase 0 + terraform), deploy_service.sh (the one Cloud Run
                     deploy path — `gcloud run deploy`, never Terraform), set_secret.sh
docs/                Numbered design briefs (00-overview through 10-frontend-visual-twin) — read
                     these before implementing a feature area
specs/               Per-feature spec-kit docs (001-data-foundation … 010-external-data-ingest):
                     spec.md / plan.md / tasks.md / research.md / quickstart.md per feature
```

Data flow: Pub/Sub (or replay clock) → Dataform transforms → BigQuery curated tables → in-SQL AI
(forecast/anomaly/embeddings) → ADK agent tools ↔ WaterTAP physics service → serving-api → Next.js
frontend. See the diagram in [docs/00-overview.md](docs/00-overview.md).

## Environment

- **Python 3.11 only** for anything touching WaterTAP (supports 3.9–3.12, not 3.13+).
- Two project venvs exist at repo root:
  - `.venv-watertap-spike/` — WaterTAP + pandas, used for `spike_watertap.py` and
    `services/source-tracing/` (physics/economics/forecast modules).
  - `.venv-pipeline/` — used for `pipeline/` ingest/loader work.
- WaterTAP 1.6.0 via pip does **not** bundle the Ipopt solver — run
  `.venv-watertap-spike/bin/idaes get-extensions` once after install (conda installs bundle it via
  `watertap-solvers`, this repo uses pip).
- GCP project `spatial-cat-489006-a4`, region `us-central1`, Cloud Run (serverless, scale-to-zero).

## Common commands

### source-tracing backend (specs 003–007 — physics/forecast/fouling/economics/assistant)
```bash
cd services/source-tracing
../../.venv-watertap-spike/bin/python run_all.py     # runs the whole prototype pipeline
../../.venv-watertap-spike/bin/python -m pytest tests/            # all tests
../../.venv-watertap-spike/bin/python -m pytest tests/test_economics.py -k test_name  # single test
```
Outputs land in `data/*.csv` (gitignored) — regenerate from BigQuery per the README before running
downstream modules.

### serving-api (FastAPI bridge, spec 008)
```bash
cd services/serving-api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# needs services/source-tracing/data/*.csv to already exist
```

### replay harness (clock-driven Pub/Sub feed)
```bash
cd services/replay
pip install -r requirements.txt
python -m pytest tests/
```

### agent (ADK 2.0 multi-agent)
```bash
cd services/agent
pip install -r requirements.txt
./provision.sh     # one-time GCP provisioning
./deploy.sh         # deploy to Agent Runtime
```

### frontend (Next.js)
```bash
cd services/frontend
npm install
npm run dev         # localhost:3000
npm run build
npm run lint
npx vitest run                      # all tests
npx vitest run __tests__/health.test.ts   # single test file
```
Set `NEXT_PUBLIC_API_URL` (see `.env.local.example`) to point at the serving-api for real data;
otherwise the UI falls back to mock generators in `lib/data/`.

### pipeline (BigQuery ingest/loaders)
```bash
cd pipeline
../.venv-pipeline/bin/python -m pytest tests/
bash tests/verify_data_foundation.sh
```

### infra (Terraform bootstrap)
```bash
cd infra
bash scripts/bootstrap.sh                 # phase 0 + terraform apply
bash scripts/deploy_service.sh <service>  # the only path for deploying a Cloud Run service
bash tests/verify_bootstrap.sh            # live checks against the provisioned project
terraform -chdir=terraform test           # runs terraform/tests/bootstrap.tftest.hcl
```
Full runbook: [specs/009-cloud-platform/quickstart.md](specs/009-cloud-platform/quickstart.md).

## Working agreements

- Keep files small and focused (200–400 lines typical); prefer immutable patterns.
- When a doc fact proves wrong during implementation, fix the doc rather than working around it.
- No secrets in source — use env vars / Secret Manager (`infra/scripts/set_secret.sh`).
- Model names: new agents use `gemini-3-flash-preview` / `gemini-3-pro-preview`. Never rename an
  existing agent's model — a 404 is usually a `GOOGLE_CLOUD_LOCATION` issue (try `global`).
