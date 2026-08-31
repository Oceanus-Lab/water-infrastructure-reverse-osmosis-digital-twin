"""
Oceanus Water Infrastructure Reverse Osmosis Digital Twin
Google Cloud Enterprise Solution Architecture Diagram (Diagrams-as-Code)

Designed according to Google Cloud Professional Services & Solution Architecture Standards.
"""

import os
from diagrams import Cluster, Diagram, Edge
from diagrams.gcp.analytics import BigQuery, PubSub
from diagrams.gcp.compute import Run
from diagrams.gcp.devtools import Code
from diagrams.gcp.ml import VertexAI
from diagrams.gcp.operations import Logging, Monitoring
from diagrams.gcp.security import Iam, SecretManager
from diagrams.gcp.storage import GCS
from diagrams.onprem.client import User
from diagrams.programming.framework import React


def generate_enterprise_architecture():
    os.makedirs("docs/diagrams", exist_ok=True)

    # Google Cloud Solution Architect Diagram Visual Standard
    graph_attr = {
        "fontsize": "22",
        "fontname": "Helvetica Neue, Arial, sans-serif",
        "bgcolor": "#FFFFFF",
        "pad": "0.75",
        "splines": "ortho",
        "nodesep": "0.65",
        "ranksep": "0.85",
    }

    node_attr = {
        "fontsize": "10",
        "fontname": "Helvetica Neue, Arial, sans-serif",
        "shape": "box",
        "style": "rounded,filled",
        "fillcolor": "#FFFFFF",
        "color": "#94A3B8",
        "penwidth": "1.2",
    }

    edge_attr = {
        "color": "#475569",
        "penwidth": "1.2",
        "fontsize": "9",
        "fontname": "Helvetica Neue, Arial, sans-serif",
    }

    with Diagram(
        "Oceanus RO Digital Twin — Google Cloud Enterprise Reference Architecture",
        filename="docs/diagrams/oceanus_gcp_architecture",
        outformat="png",
        show=False,
        direction="LR",
        graph_attr=graph_attr,
        node_attr=node_attr,
        edge_attr=edge_attr,
    ):
        # =========================================================================
        # 1. DATA SOURCES & INGESTION TIER
        # =========================================================================
        with Cluster("1. Ingestion & Streaming Telemetry"):
            gcs_raw = GCS(
                "Cloud Storage\n(Landing Bucket)\n"
                "• 21-Unit OCWD Data\n"
                "• EIA Electricity Rates\n"
                "• NOAA Weather Feed"
            )
            replay_job = Run(
                "Replay Harness\n(Cloud Run Job)\n"
                "• 15,624 History Rows\n"
                "• 71 Labeled CIP Cycles"
            )
            telemetry_bus = PubSub(
                "Cloud Pub/Sub\n(ro-readings topic)\n"
                "• Event-Driven Stream\n"
                "• SCADA/MQTT Ready"
            )

            replay_job >> Edge(label="Accelerated\ntelemetry", color="#0284C7") >> telemetry_bus

        # =========================================================================
        # 2. DATA LAKEHOUSE & IN-DATABASE AI TIER (BIGQUERY)
        # =========================================================================
        with Cluster("2. BigQuery Storage & In-Place AI Compute Layer"):
            dataform = Code(
                "Dataform\n(Versioned SQL)\n"
                "• Harmonization\n"
                "• Curated Views"
            )

            with Cluster("Scoped Datasets (us-central1)"):
                bq_lakehouse = BigQuery(
                    "BigQuery Datasets\n"
                    "• ro_raw (append-only)\n"
                    "• ro_curated (21-unit core)\n"
                    "• ro_serving (KPI views)\n"
                    "• ro_simulation (physics)\n"
                    "• ro_forecasts (TimesFM)\n"
                    "• ro_embeddings (RAG)"
                )

            with Cluster("In-SQL ML & Search"):
                bq_ml = BigQuery(
                    "BigQuery AI / ML\n"
                    "• AI.FORECAST (TimesFM)\n"
                    "• AI.DETECT_ANOMALIES\n"
                    "• VECTOR_SEARCH (QA Cache)\n"
                    "• text-embedding-005"
                )

            gcs_raw >> Edge(label="Batch load", color="#0284C7") >> dataform >> bq_lakehouse
            telemetry_bus >> Edge(label="Streaming\ninsert", color="#0284C7") >> bq_lakehouse
            bq_lakehouse >> Edge(label="In-place\nanalytics", color="#7C3AED") >> bq_ml

        # =========================================================================
        # 3. DETERMINISTIC PHYSICS SIMULATION ENGINE
        # =========================================================================
        with Cluster("3. Physics Simulation Engine"):
            watertap = Run(
                "WaterTAP Solver Service\n(Cloud Run / Pyomo + Ipopt)\n"
                "• 0D BWRO First-Principles\n"
                "• Clean Baseline ΔP\n"
                "• ~2s Non-Linear Solve"
            )

        # =========================================================================
        # 4. ENTERPRISE MULTI-AGENT ORCHESTRATION (VERTEX AI)
        # =========================================================================
        with Cluster("4. Agent Platform & Reasoning DAG (Vertex AI)"):
            orchestrator = VertexAI(
                "Multi-Agent Orchestrator\n(Gemini 3 Flash / Vertex AI)\n"
                "• 0ms Heuristic Fast-Path\n"
                "• Router (Structured JSON)\n"
                "• 4 Parallel Specialists\n"
                "• Adaptive CRAG & HyDE"
            )
            reflexion = VertexAI(
                "Reflexion Critic & HITL\n"
                "• Zero-Hallucination Audit\n"
                "• [measured] vs [modeled]\n"
                "• Actuation Denylist Gate"
            )

            bq_ml >> Edge(label="Feature vector /\nCache lookup", color="#7C3AED") >> orchestrator
            orchestrator >> Edge(label="What-if\nsimulation", color="#0284C7") >> watertap
            orchestrator >> Edge(label="Draft audit", color="#059669") >> reflexion

        # =========================================================================
        # 5. SERVING & PRESENTATION LAYER
        # =========================================================================
        with Cluster("5. Serving & Presentation Layer"):
            serving_api = Run(
                "Serving API\n(FastAPI / Cloud Run)\n"
                "• Fleet Aggregates\n"
                "• Materialized Views"
            )
            frontend = React(
                "Next.js 16 Visual Twin\n(Cloud Run)\n"
                "• 2.5D Isometric Fleet\n"
                "• 21st.dev AITaskList DAG\n"
                "• Real-Time SSE Streams"
            )

            bq_lakehouse >> Edge(label="Materialized\nviews", color="#0284C7") >> serving_api
            serving_api >> Edge(label="REST API", color="#0284C7") >> frontend
            orchestrator >> Edge(label="Streaming SSE\nTokens & Events", color="#7C3AED") >> frontend

        # =========================================================================
        # 6. END-USER PERSONAS
        # =========================================================================
        with Cluster("6. Persona Interfaces"):
            operator = User("Plant Operator\n(/twin • Fleet & Anomaly)")
            engineer = User("Process Engineer\n(/sim • WaterTAP Physics)")
            manager = User("Operations Manager\n(/industry • LCOW & ROI)")

            frontend >> Edge(label="2.5D Fleet Twin", style="dashed", color="#0284C7") >> operator
            frontend >> Edge(label="Physics Workbench", style="dashed", color="#0284C7") >> engineer
            frontend >> Edge(label="Financial Dashboard", style="dashed", color="#0284C7") >> manager

        # =========================================================================
        # 7. CROSS-CUTTING SECURITY & GOVERNANCE
        # =========================================================================
        with Cluster("Security, Governance & Observability Plane"):
            secrets = SecretManager("Secret Manager\n(API Keys & Credentials)")
            iam = Iam("Cloud IAM\n(Role-Scoped SAs)")
            logging = Logging("Cloud Logging")
            monitoring = Monitoring("Cloud Monitoring")

            secrets - Edge(style="dotted", color="#94A3B8") - orchestrator
            orchestrator - Edge(style="dotted", color="#94A3B8") - logging
            serving_api - Edge(style="dotted", color="#94A3B8") - monitoring
            watertap - Edge(style="dotted", color="#94A3B8") - iam


if __name__ == "__main__":
    generate_enterprise_architecture()
    print("Enterprise architecture diagram generated: docs/diagrams/oceanus_gcp_architecture.png")
