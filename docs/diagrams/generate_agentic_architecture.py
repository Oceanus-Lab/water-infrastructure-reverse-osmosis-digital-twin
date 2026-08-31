"""
Oceanus Multi-Agent System Architecture Diagram Generator
Diagrams-as-Code with official Google Cloud Platform & component icons.
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
        "fontsize": "24",
        "fontname": "Helvetica Neue, Arial, sans-serif",
        "bgcolor": "#FFFFFF",
        "pad": "0.6",
        "splines": "spline",
        "nodesep": "0.6",
        "ranksep": "0.8",
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
        "Oceanus RO Digital Twin — Multi-Agent AI System Architecture",
        filename="docs/diagrams/oceanus_agentic_architecture",
        outformat="png",
        show=False,
        direction="TB",
        graph_attr=graph_attr,
        node_attr=node_attr,
        edge_attr=edge_attr,
    ):
        # 1. Operator Input & UX Layer
        with Cluster("1. Operator Interaction & Reasoning UX"):
            operator = User("Plant Operator /\nProcess Engineer")
            frontend_ui = React("Next.js 16 Web Command Center\n• 21st.dev AITaskList\n• Real-Time SSE Token Stream\n• 2.5D Isometric Twin")
            operator >> Edge(label="Natural Language Query") >> frontend_ui

        # 2. Semantic Cache & Dual-Speed Router
        with Cluster("2. Semantic QA Cache & Dual-Speed Routing"):
            qa_cache = BigQuery("BigQuery VECTOR_SEARCH\n(ro_embeddings.qa_cache)\n• text-embedding-005\n• Cosine Dist < 0.08 (0ms hit)")
            router = VertexAI("Coordinator & Intent Router\n(Gemini 3 Flash / Fast-Path)\n• 0ms Heuristic Routing\n• Structured JSON Schema")

            frontend_ui >> Edge(label="Check Cache") >> qa_cache
            qa_cache >> Edge(label="Cache Hit (0ms)", style="dashed") >> frontend_ui
            qa_cache >> Edge(label="Cache Miss") >> router

        # 3. Grounding & Specialist Fan-Out Tier
        with Cluster("3. Multi-Agent Specialist Fan-Out (Parallel Execution)"):
            with Cluster("Data Analyst Specialist"):
                analyst = VertexAI("Data Analyst Agent\n(Gemini 3 Flash)")
                analyst_data = Run("Serving API\n• SCADA Telemetry\n• Normalized Flux / Salt\n• Anomaly Detection")
                analyst_data >> analyst

            with Cluster("Simulation Specialist"):
                sim = VertexAI("Simulation Agent\n(Gemini 3 Flash)")
                sim_data = Run("WaterTAP Engine (Cloud Run)\n• 0D BWRO Physics Model\n• Pyomo + Ipopt Solver\n• Baseline vs Actual ΔP")
                sim_data >> sim

            with Cluster("Economics Specialist"):
                econ = VertexAI("Economics Agent\n(Gemini 3 Flash)")
                econ_data = BigQuery("BigQuery Curated Datasets\n• Real-Time EIA Tariffs\n• SEC Penalties\n• Net ROI CIP Deltas")
                econ_data >> econ

            with Cluster("Document Specialist (Adaptive CRAG)"):
                doc = VertexAI("Document Agent\n(Gemini 3 Flash)")
                doc_data = BigQuery("BigQuery Vector Store\n• HyDE Query Expansion\n• Plant SOPs & Manuals\n• Cosine Relevance <= 0.12")
                doc_data >> doc

            router >> Edge(label="Fan-Out") >> analyst
            router >> Edge(label="Fan-Out") >> sim
            router >> Edge(label="Fan-Out") >> econ
            router >> Edge(label="Fan-Out") >> doc

        # 4. Synthesis, Critic & Governance Plane
        with Cluster("4. Synthesis, Verification & Human-in-the-Loop Governance"):
            composer = VertexAI("Composer Coordinator\n(Gemini 3 Flash)\n• Synthesizes Findings\n• Enforces [measured] vs [modeled]\n• Streams SSE Output")
            reflexion = VertexAI("In-Harness Reflexion Critic\n• Test-Time Verification\n• Zero-Hallucination Audit\n• Inline Assumption Validation")
            hitl_gate = Iam("HITL Governance Gate\n• Actuation Denylist\n• Propose-to-Record\n• Operator Approval Required")
            decision_log = BigQuery("BigQuery ro_serving.decision_log\n(Audited Operational Records)")

            analyst >> composer
            sim >> composer
            econ >> composer
            doc >> composer

            composer >> Edge(label="Draft Answer") >> reflexion
            composer >> Edge(label="Stream SSE Tokens & Events") >> frontend_ui
            composer >> Edge(label="Propose Action") >> hitl_gate
            frontend_ui >> Edge(label="Operator Approves", style="dashed") >> hitl_gate
            hitl_gate >> Edge(label="Commit Record") >> decision_log


if __name__ == "__main__":
    generate_agentic_architecture_diagram()
    print("Agentic architecture diagram generated: docs/diagrams/oceanus_agentic_architecture.png")
