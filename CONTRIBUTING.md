# Contributing to Oceanus RO Digital Twin

Thank you for your interest in contributing to **Oceanus**! This repository is a cloud-native digital twin for municipal and industrial Brackish Water Reverse Osmosis (BWRO) facilities, unifying operational telemetry, WaterTAP physics modeling, BigQuery in-database AI, and self-reflective Gemini agents on Google Cloud.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
* **Node.js**: `v18.17+` or `v20+` (LTS recommended) & `npm`
* **Python**: `3.11` strictly (WaterTAP 1.6.0 supports Python 3.9–3.12, **not 3.13+**)
* **Graphviz**: `dot` binary for diagram generation (`brew install graphviz` on macOS)
* **Google Cloud SDK**: `gcloud` CLI installed and authenticated with `gcloud auth application-default login`

### 2. Repository Setup
```bash
# Clone the repository
git clone https://github.com/Oceanus-Lab/water-infrastructure-reverse-osmosis-digital-twin.git
cd water-infrastructure-reverse-osmosis-digital-twin

# Frontend setup (Next.js 14)
cd services/frontend
npm install
npm run dev

# Python environment setup (Pipeline & Physics)
cd ../..
python3.11 -m venv .venv-pipeline
source .venv-pipeline/bin/activate
pip install -r pipeline/ingest/requirements.txt
```

---

## 🌿 Branching Strategy & Workflow

We follow standard Trunk-Based Development with feature branches:

1. **Branch Naming Conventions**:
   * `feat/<feature-name>`: New features or UI components (e.g., `feat/21st-task-list-animations`)
   * `fix/<bug-name>`: Bug fixes or error handling (e.g., `fix/qa-cache-cosine-distance`)
   * `docs/<topic>`: Documentation, architecture diagrams, or blog drafts (e.g., `docs/gcp-solution-diagram`)
   * `refactor/<scope>`: Code refactoring without behavioral changes (e.g., `refactor/harness-prompts`)
   * `test/<scope>`: Adding or improving test coverage (e.g., `test/reflexion-critic-benchmark`)

2. **Pull Request (PR) Requirements**:
   * All PRs must target `main`.
   * Title format: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat(agent): add adaptive CRAG query expansion`).
   * Include a clear description of changes, motivation, and verification steps.
   * Ensure all automated test suites pass prior to requesting review.

---

## 🧪 Testing Guidelines

Before opening a PR, run the relevant verification suites:

### 1. Frontend Test Suite (Vitest)
```bash
cd services/frontend
npx vitest run
```

### 2. Agent Benchmark Eval Suite (50 Golden Cases)
```bash
python3 services/agent/eval/run_eval.py
```

### 3. Fouling Validation Backtest (OCWD Dataset)
```bash
python3 research/fouling_backtest.py
```

### 4. Physics & Delta-Economics Pipeline
```bash
cd services/source-tracing
../../.venv-watertap-spike/bin/python run_all.py
```

---

## 🎨 Code Style & Quality Standards

### TypeScript & React (Frontend)
* Follow ESLint and Tailwind CSS conventions.
* Keep components focused, modular, and typed (strict TypeScript).
* Adhere to accessible semantic HTML standards and smooth UI micro-interactions (Framer Motion).

### Python (Backend & Pipelines)
* Formatted with **Ruff** (`ruff check .` and `ruff format .`).
* Strict type hints where possible (`typing` / `pydantic`).
* WaterTAP equations must use exact parameter blocks (`watertap.unit_models.reverse_osmosis_0D`, `NaCl_prop_pack`).

### BigQuery & SQL (Dataform)
* BigQuery is our storage layer **and** primary AI compute engine. Avoid custom external ML services when native BigQuery ML functions (`AI.FORECAST`, `AI.DETECT_ANOMALIES`, `VECTOR_SEARCH`) suffice.
* All time-series tables must partition on `DATE(reading_date)` and cluster on `(bank_id, unit_id, stage)`.

---

## 🛡️ Governance & Safety Rules (Do Not Violate)

* **Advise-Only Boundary**: The AI assistant must operate on a **propose-to-record** basis. The hardcoded actuation denylist (`set_flow`, `adjust_pressure`, `dose_chemical`, `stop_pump`, `open_valve`, `close_valve`, `scada_command`, `plc_write`) must never be bypassed.
* **No Secrets in Source**: Never commit API keys, service account keys, or environment secrets to git. Use Secret Manager and local `.env.local` files.
* **Provenanced Tagging**: Every displayed number must be labeled as either `[measured]` (SCADA sensor) or `[modeled]` (WaterTAP physics).

---

Thank you for helping build resilient, climate-aware water infrastructure! 🌊
