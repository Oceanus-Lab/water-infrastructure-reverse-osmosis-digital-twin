"""
Oceanus Water Infrastructure Reverse Osmosis Digital Twin
Google Cloud Architecture Diagram Generator (Diagrams-as-Code)

Generates professional GCP architecture diagrams using official GCP icons.
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


def generate_architecture_diagram():
    os.makedirs("docs/diagrams", exist_ok=True)

    graph_attr = {
        "fontsize": "24",
        "fontname": "Helvetica Neue, Arial, sans-serif",
        "bgcolor": "#FFFFFF",
        "pad": "0.6",
        "splines": "spline",
        "nodesep": "0.7",
        "ranksep": "0.9",
    }

    node_attr = {
        "fontsize": "11",
        "fontname": "Helvetica Neue, Arial, sans-serif",
        "shape": "box",
        "style": "rounded,filled",
        "fillcolor": "#F8FAFC",
        "color": "#94A3B8",
        "penwidth": "1.2",
    }

    edge_attr = {
        "color": "#334155",
        "penwidth": "1.3",
        "fontsize": "10",
        "fontname": "Helvetica Neue, Arial, sans-serif",
    }

    with Diagram(
        "Oceanus RO Digital Twin — Production Architecture",
        filename="docs/diagrams/oceanus_gcp_architecture",
        outformat="png",
        show=False,
        direction="LR",
        graph_attr=graph_attr,
        node_attr=node_attr,
        edge_attr=edge_attr,
    ):
        # 1. Ingest & Telemetry Layer
        with Cluster("Ingestion & Telemetry"):
            gcs_raw = GCS("Cloud Storage\n(Raw OCWD / EIA CSVs)")
            replay_job = Run("Replay Harness\n(Cloud Run Job)")
            telemetry_stream = PubSub("Cloud Pub/Sub\n(ro-readings topic)")

            replay_job >> Edge(label="Publish") >> telemetry_stream

        # 2. BigQuery Storage & AI Compute Tier
        with Cluster("BigQuery Storage & In-Place AI Compute"):
            dataform = Code("Dataform\n(Versioned SQL)")
            bq_warehouse = BigQuery(
                "BigQuery Datasets\n"
                "• ro_raw (append-only)\n"
                "• ro_curated (harmonized)\n"
                "• ro_serving (KPI views)\n"
                "• ro_simulation (baselines)\n"
                "• ro_forecasts (TimesFM)\n"
                "• ro_embeddings (RAG/Cache)"
            )
            bq_ai = BigQuery(
                "In-SQL AI Functions\n"
                "• AI.FORECAST (TimesFM)\n"
                "• AI.DETECT_ANOMALIES\n"
                "• AI.GENERATE_EMBEDDING\n"
                "• VECTOR_SEARCH (QA Cache)"
            )

            gcs_raw >> Edge(label="Batch load") >> dataform >> bq_warehouse
            telemetry_stream >> Edge(label="Streaming insert") >> bq_warehouse
            bq_warehouse >> Edge(label="In-place ML") >> bq_ai

        # 3. Physics Simulation Engine
        with Cluster("Physics Simulation"):
            watertap = Run(
                "WaterTAP Engine\n(Cloud Run / Python 3.11)\n"
                "• BWRO 0D Model\n"
                "• Pyomo + Ipopt Solver\n"
                "• Baseline vs Actual ΔP"
            )

        # 4. Multi-Agent Intelligence Tier (Vertex AI GenAI SDK)
        with Cluster("Vertex AI Multi-Agent Intelligence"):
            adk_agent = VertexAI(
                "Multi-Agent Orchestrator\n(Gemini 3 Flash on Vertex AI)\n"
                "• Router / Coordinator\n"
                "• Data Analyst Specialist\n"
                "• Simulation Specialist\n"
                "• Economics Specialist\n"
                "• Doc Grounding Specialist"
            )

            adk_agent >> Edge(label="What-if physics solve") >> watertap
            bq_ai >> Edge(label="Vector Search / Grounding") >> adk_agent

        # 5. Serving & Frontend
        with Cluster("Serving & Application Layer"):
            serving_api = Run(
                "Serving API\n(FastAPI / Cloud Run)\n"
                "• Fleet Aggregates\n"
                "• Materialized Views"
            )
            frontend = React(
                "Next.js 16 Visual Twin\n(Cloud Run)\n"
                "• 2.5D Isometric Fleet View\n"
                "• Live SSE Streaming"
            )

            bq_warehouse >> Edge(label="Serving views") >> serving_api
            serving_api >> Edge(label="REST API") >> frontend
            adk_agent >> Edge(label="Streaming SSE") >> frontend

        # 6. User Personas
        with Cluster("End User Personas"):
            operator = User("Plant Operator\n(Fleet / Anomaly)")
            engineer = User("Process Engineer\n(Simulation / What-If)")
            manager = User("Ops Manager\n(LCOW & Economics)")

            frontend >> Edge(label="2.5D Fleet Twin", style="dashed") >> operator
            frontend >> Edge(label="Sim Workbench", style="dashed") >> engineer
            frontend >> Edge(label="Financials", style="dashed") >> manager

        # 7. Cross-Cutting Security & Observability
        with Cluster("Security & Observability"):
            secrets = SecretManager("Secret Manager\n(API Credentials)")
            iam = Iam("Cloud IAM\n(Role-Scoped SAs)")
            logging = Logging("Cloud Logging")
            monitoring = Monitoring("Cloud Monitoring")

            secrets - Edge(style="dotted", color="#94A3B8") - adk_agent
            adk_agent - Edge(style="dotted", color="#94A3B8") - logging
            serving_api - Edge(style="dotted", color="#94A3B8") - monitoring
            watertap - Edge(style="dotted", color="#94A3B8") - iam


if __name__ == "__main__":
    generate_architecture_diagram()
    print("Architecture diagram generated at: docs/diagrams/oceanus_gcp_architecture.png")
