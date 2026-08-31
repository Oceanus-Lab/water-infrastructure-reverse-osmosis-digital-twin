"""
Oceanus Multi-Agent System Architecture Diagram Generator (Diagrams-as-Code)
Follows Google Cloud Solution Architecture & Enterprise Agent Design Standards.
"""

import os
from diagrams import Cluster, Diagram, Edge
from diagrams.gcp.analytics import BigQuery
from diagrams.gcp.compute import Run
from diagrams.gcp.ml import VertexAI
from diagrams.gcp.security import Iam, SecretManager
from diagrams.onprem.client import User
from diagrams.programming.framework import React


def generate_agentic_architecture_diagram():
    os.makedirs("docs/diagrams", exist_ok=True)

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
        "Oceanus Multi-Agent AI System — Execution DAG & Governance Architecture",
        filename="docs/diagrams/oceanus_agentic_architecture",
        outformat="png",
        show=False,
        direction="LR",
        graph_attr=graph_attr,
        node_attr=node_attr,
        edge_attr=edge_attr,
    ):
        # 1. User Interaction & UX
        with Cluster("1. Operator Interaction & Reasoning UX"):
            operator = User("Plant Operator /\nProcess Engineer")
            frontend_ui = React(
                "Next.js 16 Web Command Center\n"
                "• 21st.dev AITaskList DAG\n"
                "• SSE Token Streaming\n"
                "• 2.5D Isometric Fleet Twin"
            )
            operator >> Edge(label="Natural language\nquery", color="#0284C7") >> frontend_ui

        # 2. Semantic Cache & Dual-Speed Router
        with Cluster("2. Cache & Dual-Speed Router"):
            qa_cache = BigQuery(
                "Semantic QA Cache\n(BigQuery VECTOR_SEARCH)\n"
                "• text-embedding-005\n"
                "• Cosine Dist < 0.08\n"
                "• <15ms Instant Hit"
            )
            router = VertexAI(
                "Dual-Speed Router\n(Gemini 3 Flash)\n"
                "• 0ms Heuristic Fast-Path\n"
                "• Structured JSON Schema\n"
                "• Unit & Specialist Routing"
            )

            frontend_ui >> Edge(label="Cache check", color="#0284C7") >> qa_cache
            qa_cache >> Edge(label="Cache hit (0ms)", style="dashed", color="#059669") >> frontend_ui
            qa_cache >> Edge(label="Cache miss", color="#7C3AED") >> router

        # 3. Grounding & Specialist Fan-Out Tier
        with Cluster("3. Multi-Agent Specialist Fan-Out (Parallel Execution)"):
            with Cluster("Data Analyst Specialist"):
                analyst = VertexAI("Data Analyst Agent\n(Gemini 3 Flash)")
                analyst_data = Run("Serving API\n• SCADA Telemetry\n• Normalized Flux/Salt\n• Anomaly Detection")
                analyst_data >> analyst

            with Cluster("Simulation Specialist"):
                sim = VertexAI("Simulation Agent\n(Gemini 3 Flash)")
                sim_data = Run("WaterTAP Engine\n(Cloud Run / Pyomo + Ipopt)\n• 0D BWRO Physics Model\n• Clean Baseline ΔP")
                sim_data >> sim

            with Cluster("Economics Specialist"):
                econ = VertexAI("Economics Agent\n(Gemini 3 Flash)")
                econ_data = BigQuery("BigQuery Curated Datasets\n• Real-Time EIA Tariffs\n• SEC Penalties\n• Net ROI CIP Deltas")
                econ_data >> econ

            with Cluster("Document Specialist (Adaptive CRAG)"):
                doc = VertexAI("Document Agent\n(Gemini 3 Flash)")
                doc_data = BigQuery("BigQuery Vector Store\n• HyDE Query Expansion\n• Plant SOPs & Manuals\n• Cosine Dist <= 0.12")
                doc_data >> doc

            router >> Edge(label="Fan-out", color="#7C3AED") >> analyst
            router >> Edge(label="Fan-out", color="#7C3AED") >> sim
            router >> Edge(label="Fan-out", color="#7C3AED") >> econ
            router >> Edge(label="Fan-out", color="#7C3AED") >> doc

        # 4. Synthesis, Critic & Governance Plane
        with Cluster("4. Synthesis, Verification & HITL Governance"):
            composer = VertexAI(
                "Composer Coordinator\n(Gemini 3 Flash)\n"
                "• Synthesizes Findings\n"
                "• Enforces [measured] vs [modeled]\n"
                "• Streams SSE Output"
            )
            reflexion = VertexAI(
                "In-Harness Reflexion Critic\n"
                "• Test-Time Verification\n"
                "• Zero-Hallucination Audit\n"
                "• Inline Assumption Check"
            )
            hitl_gate = Iam(
                "HITL Governance Gate\n"
                "• Actuation Denylist\n"
                "• Propose-to-Record\n"
                "• Human Approval Required"
            )
            decision_log = BigQuery("BigQuery ro_serving.decision_log\n(Audited Operational Log)")

            analyst >> Edge(color="#7C3AED") >> composer
            sim >> Edge(color="#7C3AED") >> composer
            econ >> Edge(color="#7C3AED") >> composer
            doc >> Edge(color="#7C3AED") >> composer

            composer >> Edge(label="Draft audit", color="#059669") >> reflexion
            composer >> Edge(label="Stream tokens\n& lifecycle", color="#7C3AED") >> frontend_ui
            composer >> Edge(label="Propose action", color="#0284C7") >> hitl_gate
            frontend_ui >> Edge(label="Operator approves", style="dashed", color="#059669") >> hitl_gate
            hitl_gate >> Edge(label="Commit record", color="#0284C7") >> decision_log


if __name__ == "__main__":
    generate_agentic_architecture_diagram()
    print("Agentic architecture diagram generated: docs/diagrams/oceanus_agentic_architecture.png")
