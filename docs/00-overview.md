# RO Digital Twin — Project Overview
**Status:** Planning complete → Moving to architecture & implementation  
**Last updated:** 2026-06-30

---

## What We're Building

A **cloud-native digital twin for Municipal / Industrial BWRO (Brackish Water RO) facilities** — water reclamation districts, utilities, food & beverage, industrial process water. The system unifies operational data, physics-based simulation, AI-driven intelligence, and economics & financial forecasting into a single platform.

**Architecture vs. instance (key framing):** this is a **production-grade, scalable, live-capable digital-twin architecture**, run in this prototype in **historical-replay mode** — a clock-driven harness streams the real OCWD history through the same event-driven path a live SCADA feed would use (see [02-data-pipeline.md](02-data-pipeline.md)). The data thread is genuinely live; only the *source* is a faithful replay rather than a real-time plant feed. Maturity today: descriptive → diagnostic → predictive (a **digital shadow** on a live-ready spine); bidirectional / prescriptive control is explicit roadmap, consistent with the advise-only governance in [04-ai-agent.md](04-ai-agent.md).

**Primary dataset:** Orange County Water District (OCWD) RO fouling data — 21 membrane units, 7 banks × 3 stages, **daily 2019-01-01 → 2021-01-13** (15,624 rows, 71 labeled CIP events; Harvard Dataverse).

---

## Core Goals

- Prototype first, production-scalable architecture
- Leverage GCP-native services end-to-end — no custom ML pipelines where SQL functions suffice
- ADK 2.0 agent with Memory Bank, RAG, tool-calling for intelligent diagnostics and Q&A
- WaterTAP (BWRO) physics engine for simulation and anomaly detection
- 2.5D isometric visual digital twin frontend (Next.js)
- Economics layer: LCOW, SEC, production forecast, operational margin

---

## Architecture Principle (Decided 2026-06-30)

> **BigQuery is both the storage AND the primary AI compute layer.**  
> Forecasting, anomaly detection, embeddings, and NL summarization all happen *in SQL, in-place*.  
> Vertex AI / Agent Runtime is reserved for **agent orchestration only**.

This means: fewer moving parts, lower latency, lower cost, faster prototype.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  INGEST          Cloud Storage (batch) │ Pub/Sub (stream)     │
│                  Dataform (versioned SQL transforms)          │
└───────────────────────────┬──────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  BIGQUERY — DATA + AI COMPUTE LAYER                           │
│  • Raw → curated tables (operational, economic, simulation)  │
│  • AI.FORECAST (TimesFM)     → production, LCOW, energy       │
│  • AI.DETECT_ANOMALIES       → fouling / scaling signals      │
│  • AI.GENERATE / AI.CLASSIFY → NL summaries, alert scoring   │
│  • AI.GENERATE_EMBEDDING + VECTOR_SEARCH → RAG + history      │
└───────────┬───────────────────────────────────┬──────────────┘
            │                                     │
            ▼                                     ▼
┌────────────────────────┐          ┌────────────────────────────┐
│ WaterTAP Engine         │          │ ADK Agent (Gemini Flash)   │
│ • Cloud Run Service     │◄────────►│ on Agent Runtime           │
│   (~2s solve, on-demand)│  tools   │ • Sessions + Memory Bank   │
│ • Python 3.11, FastAPI  │          │ • Tools: BQ, WaterTAP,     │
│ • PhysicsEngine abstrac.│          │   VECTOR_SEARCH, Code Exec │
└────────────────────────┘          │ • Eval: Example Store      │
                                    └─────────────┬──────────────┘
                                                  │
                                                  ▼
                                 ┌────────────────────────────────┐
                                 │ Next.js Frontend (2.5D Twin)   │
                                 │ • Cloud Run Serving API        │
                                 │ • BQ Materialized Views        │
                                 └────────────────────────────────┘
```

---

## Key Decisions Summary

| Area | Decision | Status |
|---|---|---|
| Cloud platform | GCP, region `us-central1` | ✅ |
| Compute | Cloud Run (serverless, scales to zero) | ✅ |
| Analytics + AI | BigQuery as primary AI compute layer | ✅ |
| Physics engine | WaterTAP 1.6.0 (BWRO, Ipopt/Pyomo) | ✅ spike passed |
| Agent framework | ADK 2.0 on Gemini Enterprise Agent Runtime | ✅ |
| Agent model | Gemini Flash (default); Pro for complex reasoning | ✅ |
| Data pipeline | Event-driven, live-ready; prototype in **historical-replay mode** (clock-driven → Pub/Sub), live SCADA swap-in | ✅ |
| Transforms | Dataform (versioned, tested SQL) | ✅ |
| Frontend | Next.js, 2.5D isometric, 4 nav sections | ✅ |
| Architecture option | Option C — Multi-Agent (design TBD) | ✅ |
| Frontend timing | TBD — concurrent vs. after backend | ⏳ |

---

## Three User Personas (All Share BigQuery Layer)

| Persona | Primary Screen | Key Question |
|---|---|---|
| Plant Operator | Digital Twin (2.5D) + Alerts | "What unit is degrading now, what do I do?" |
| Process Engineer | Physical Simulation | "Run WaterTAP what-if, compare bank A vs G fouling" |
| Operations Manager | Industry Engine (Analytics + Financial) | "LCOW trend, production forecast, maintenance budget?" |

---

## Document Index

| File | Purpose |
|---|---|
| [01-problem-domain.md](01-problem-domain.md) | Pain points, economics, use cases |
| [02-data-pipeline.md](02-data-pipeline.md) | Datasets, BigQuery schema brief, ETL, AI functions |
| [03-physics-engine.md](03-physics-engine.md) | WaterTAP integration, spike results, API contract |
| [04-ai-agent.md](04-ai-agent.md) | ADK agent, Memory Bank, RAG, tools, eval |
| [05-gcp-infrastructure.md](05-gcp-infrastructure.md) | GCP services, Cloud Run, IAM, cost, security |
| [06-open-questions.md](06-open-questions.md) | Unresolved items, next steps, risks |
| [07-implementation-plan.md](07-implementation-plan.md) | Phased build plan |
| [08-validation-live-replay.md](08-validation-live-replay.md) | Live-replay spec + 71-CIP backtest (credibility deliverables) |
| [2026-06-30-plan-review.md](2026-06-30-plan-review.md) | External critique — credibility & sequencing findings |
| [10-frontend-visual-twin.md](10-frontend-visual-twin.md) | 2.5D twin UI — equipment, hover cards, visualization catalog, image-gen spec |
