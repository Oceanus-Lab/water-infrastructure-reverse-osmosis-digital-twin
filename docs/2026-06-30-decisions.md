# RO Digital Twin — Decisions Log Index
**Date:** 2026-06-30  
**Status:** Planning complete → Architecture & implementation

> This file is the index. All content has been split into focused briefs. Use those files directly when briefing coding agents or setting up GCP.

---

## Document Map

| File | Purpose | Brief for |
|---|---|---|
| [00-overview.md](00-overview.md) | Project brief, architecture principle, decision summary, diagram | Any agent / human starting fresh |
| [01-problem-domain.md](01-problem-domain.md) | Pain points, economics, personas, OCWD context | Domain context, agent Q&A design, UI features |
| [02-data-pipeline.md](02-data-pipeline.md) | Datasets, BigQuery layer design, ETL, AI functions, Dataform | Data layer coding agent, BQ setup |
| [03-physics-engine.md](03-physics-engine.md) | WaterTAP decision, BWRO specs, spike results, API contract, calibration | Physics service coding agent, Cloud Run deploy |
| [04-ai-agent.md](04-ai-agent.md) | ADK agent, tools, Memory Bank, RAG, eval, observability | Agent coding agent, Gemini Enterprise setup |
| [05-gcp-infrastructure.md](05-gcp-infrastructure.md) | GCP services, Cloud Run config, IAM, cost controls, Dataform | GCP/infra setup agent |
| [06-open-questions.md](06-open-questions.md) | Unresolved decisions, risks, ordered next steps | Review before each planning session |

---

## Key Decisions (Summary)

| Area | Decision |
|---|---|
| Platform | GCP `us-central1`, Cloud Run (serverless) |
| Analytics + AI | **BigQuery as primary AI compute layer** (`AI.FORECAST`, `AI.DETECT_ANOMALIES`, `AI.GENERATE`, `VECTOR_SEARCH`) |
| Physics engine | **WaterTAP 1.6.0 BWRO** — spike ✅ passed 2026-06-30, solve ~2s |
| Agent | **ADK 2.0** on Gemini Enterprise Agent Runtime, Gemini Flash default |
| Architecture option | **Option C — Multi-Agent** (design to be refined) |
| Frontend | Next.js, 2.5D isometric, 4 nav sections |

---

## Blocking Question Before Plan Is Written

**Q1: Frontend timing** — Build frontend concurrently from week 1, or finish backend/agent first?  
→ Answer in [06-open-questions.md](06-open-questions.md) then invoke writing-plans skill.

---

## 1. Project Overview

A **cloud-native digital twin prototype** for **Municipal / Industrial BWRO (Brackish Water RO) facilities** — including water reclamation districts, water utilities, food & beverage producers, and industrial process water plants. The system unifies real-time (and initially synthetic) operational data, physics-based simulation, AI-driven intelligence, and **economics & financial forecasting** into a single unified platform.

**Platform framing rationale:**
- Available dataset (Harvard OCWD) is authentically from a municipal water reclamation district → context matches data exactly
- The canonical BWRO plant layout (pre-filtration → RO arrays → permeate storage → brine) fits all facility types
- Economics layer is **parameterizable** — same platform, different pricing model per deployment context
- Addresses water scarcity, operational efficiency, and sustainability at scale

**Core goals:**
- Prototype first, production-scalable architecture from day one
- Leverage GCP-native services end-to-end
- Integrate AI agents for intelligent diagnostics, optimization, and economic forecasting
- Provide an intuitive visual digital twin (2.5D isometric)
- Surface financial intelligence: cost per m³, energy cost, production forecast, operational margin

---
