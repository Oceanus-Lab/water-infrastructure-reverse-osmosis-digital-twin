# 💧 RO Digital Twin — Water Infrastructure

> **A cloud-native digital twin for Municipal/Industrial Brackish Water Reverse Osmosis (BWRO) facilities** — unifying operational data, physics-based simulation, AI diagnostics, and economics into a single GCP-native platform.

## 🎥 What is Reverse Osmosis?

[![Watch: How Reverse Osmosis Works](https://img.youtube.com/vi/MC6Qrr58SmA/0.jpg)](https://www.youtube.com/watch?v=MC6Qrr58SmA)

> *Click the thumbnail above to watch a primer on how Reverse Osmosis works — a great starting point before diving into the codebase.*
---

## What is RO water?

**RO (Reverse Osmosis)** is a water-cleaning process.

- Water is pushed through a very fine membrane (a special filter).
- The membrane blocks most salts and impurities.
- Cleaner water passes through; concentrated waste (brine) is separated out.

For **brackish water** (water that is saltier than freshwater but less salty than seawater), RO is one of the most common ways to produce usable water for communities and industry.

---

## Why this project exists

RO plants generate lots of data every day, but it can be hard to quickly answer practical questions like:

- Is the plant running normally?
- Is membrane fouling getting worse?
- Why did energy use increase this week?
- What changed after a cleaning event (CIP)?
- What is the cost impact of a process change?

This digital twin combines plant data, physics-based simulation, and AI analysis to support those decisions.

---

## What is a “digital twin”?

A **digital twin** is a software model of a real system.

For this project, the twin mirrors an RO facility by combining:

1. **Operational data** (what happened in the plant)
2. **Physics models** (what should happen based on process behavior)
3. **AI diagnostics** (what looks unusual and why)
4. **Economic calculations** (what changes mean for cost)

The goal is decision support — **not automatic control of equipment**.

![High Fidelity Digital Twin](docs/High%20Fidelity%20Digital%20Twin.gif)

## 🔄 System Architecture & Data Flow

```mermaid
flowchart LR
    %% INGEST
    subgraph INGEST [Data Ingestion]
        direction TB
        S[IoT Sensors & SCADA] --> PS[Cloud Pub/Sub]
        PS --> DF[Dataform Pipelines]
    end

    %% CORE
    subgraph BIGQUERY [BigQuery: Unified Data & AI Compute Layer]
        direction TB
        DATA[(Curated Operational Data)]
        AI[In-Place AI: FORECAST & ANOMALY]
        EMB[Embeddings & Vector Search]
    end

    %% AGENTS
    subgraph MULTIAGENT [Vertex AI Multi-Agent System]
        direction TB
        CO[Coordinator Agent]
        subgraph SPECIALISTS [Capability Sub-Agents]
            DA[DataAnalyst]
            SI[Simulation]
            EC[Economics]
            DO[Document]
        end
        CO <--> SPECIALISTS
    end

    %% PHYSICS
    subgraph PHYSICS [Physics Simulation]
        direction TB
        WT[WaterTAP Engine]
    end

    %% FRONTEND
    subgraph FRONTEND [Digital Twin UI]
        direction TB
        UI[Next.js 2.5D Command Center]
    end

    %% Relationships
    INGEST --> BIGQUERY
    BIGQUERY <--> MULTIAGENT
    BIGQUERY <--> PHYSICS
    MULTIAGENT -.-> UI
    BIGQUERY --> UI
    
    %% Styling for GCP emphasis
    style BIGQUERY fill:#e8f0fe,stroke:#4285f4,stroke-width:3px,color:#174ea6,font-weight:bold
    style MULTIAGENT fill:#fce8e6,stroke:#ea4335,stroke-width:2px,color:#a50e0e,font-weight:bold
    style PHYSICS fill:#fef7e0,stroke:#fbbc04,stroke-width:2px,color:#e65100,font-weight:bold
    style INGEST fill:#f1f3f4,stroke:#9aa0a6,stroke-width:2px,color:#3c4043,font-weight:bold
    style FRONTEND fill:#e6f4ea,stroke:#34a853,stroke-width:2px,color:#0d652d,font-weight:bold
```

## 👥 Use Cases & Personas

```mermaid
flowchart TD
    %% Actors
    OP((Plant Operator))
    PE((Process Engineer))
    OM((Operations Manager))

    %% System
    subgraph OCEANUS [Oceanus: Digital Twin Platform]
        subgraph OPS [Operations]
            FOU[Monitor Fleet Fouling Map]
            ALR[Acknowledge Anomaly Alerts]
        end
        
        subgraph ENG [Engineering]
            SIM[Run WaterTAP 'What-If' Scenarios]
            CMP[Compare Measured vs Physics Model]
            CHAT[Query Agent for Directives]
        end
        
        subgraph MGMT [Management]
            LCOW[Forecast Levelized Cost]
            PROD[Forecast Production]
            EXP[Export Compliance Reports]
        end
    end

    %% Mappings
    OP --> FOU
    OP --> ALR
    OP --> CHAT

    PE --> SIM
    PE --> CMP
    PE --> CHAT

    OM --> LCOW
    OM --> PROD
    OM --> EXP
    
    %% Styling
    style OCEANUS fill:#f8fafc,stroke:#94a3b8,stroke-width:2px,color:#0f172a
    style OPS fill:none,stroke:#cbd5e1,stroke-width:1px,stroke-dasharray: 5 5
    style ENG fill:none,stroke:#cbd5e1,stroke-width:1px,stroke-dasharray: 5 5
    style MGMT fill:none,stroke:#cbd5e1,stroke-width:1px,stroke-dasharray: 5 5
    classDef actor fill:#e8f0fe,stroke:#174ea6,stroke-width:2px,color:#0f172a
    class OP,PE,OM actor
```

## 🗂️ Where to Start

| Doc | What it covers |
|---|---|
| [`docs/00-overview.md`](docs/00-overview.md) | Full architecture, system diagram, key decisions |
| [`docs/01-problem-domain.md`](docs/01-problem-domain.md) | Pain points, economics, use cases |
| [`docs/07-implementation-plan.md`](docs/07-implementation-plan.md) | Phased build plan |
| [`docs/03-physics-engine.md`](docs/03-physics-engine.md) | WaterTAP integration & spike results |
| [`docs/04-ai-agent.md`](docs/04-ai-agent.md) | ADK agent, Memory Bank, RAG, tools |
| [`AGENTS.md`](AGENTS.md) | Agent coding conventions & gotchas |
| [`spike_watertap.py`](spike_watertap.py) | Only runnable code today — WaterTAP validation spike |

> **Current status:** Planning complete. Architecture designed. Only the WaterTAP spike is runnable — the rest lives as design briefs in `docs/`. Read the docs as source of truth.
