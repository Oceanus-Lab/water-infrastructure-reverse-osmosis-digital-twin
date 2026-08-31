# Implementation Plan: 013-agent-intelligence-chat

**Branch**: `013-agent-intelligence-chat` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

## Summary
Implement the Next-Generation Self-Improving Agent Architecture & 21st.dev-inspired visual chat interface for the Oceanus Digital Twin across four cohesive phases:
1. **Phase 1: Typed Signatures & Adaptive CRAG**: Define typed Gemini structured output contracts (`responseSchema`), HyDE query embeddings, and CRAG relevance gating.
2. **Phase 2: Reflexion Critic & Context Caching**: In-harness test-time self-reflection to verify numerical claims against grounding, dynamic tool calling, Enterprise Context Caching, and OpenTelemetry tracing.
3. **Phase 3: Autonomous Eval Flywheel**: Telemetry trace logging to BigQuery (`ro_serving.agent_traces`), automated 50-case benchmark evaluation runner (`agentplatform.evals`), and TextGrad-driven prompt optimization.
4. **Phase 4: 21st.dev Visual Chat Surface**: Redesign the AI Assistant into a responsive glassmorphic drawer with collapsible thinking accordions, embedded interactive tool execution widgets (sparklines, what-if sliders, proposal approval cards), feedback buttons, and dynamic follow-up chips.

---

## Technical Context

**Language/Version**: TypeScript 5.4+ (Next.js 14 App Router), Python 3.11  
**Primary Dependencies**: `@google/genai`, `lucide-react`, `recharts`, `framer-motion`, `google-genai`, `google-cloud-bigquery`, `agentplatform`  
**Storage**: BigQuery (`ro_serving.agent_traces`, `ro_embeddings.qa_cache`, `ro_serving.decision_log`)  
**Testing**: Vitest (`@testing-library/react`), Pytest  
**Target Platform**: Cloud Run (`us-central1`), browser client (mobile + desktop)  
**Performance Goals**: TTFT $< 200\text{ ms}$ (cached) / $< 3\text{ s}$ (dynamic); deep simulation completion $< 10\text{ s}$  
**Constraints**: Constitution Principle III (Gated HITL, zero SCADA writes), Principle II (No hallucinated numbers)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [X] **Principle I (BigQuery-as-AI-Compute)**: Trace logging, semantic caching, vector search, and document embeddings run in-place in BigQuery.
- [X] **Principle II (Evidence First / No Hallucinations)**: Short-term Reflexion critic validates numerical fidelity before token release; accuracy benchmarks run against real 50-case golden datasets.
- [X] **Principle III (Advise-Only / HITL Gated - HARD GATE)**: All decision and proposal actions flow through gated human approval buttons; zero plant actuation capabilities.
- [X] **Principle IV (Measured vs. Modeled)**: Reflexion critic strictly validates that Bank A modeled energy is never mislabeled as measured.
- [X] **Principle VII (Test-First Discipline)**: Complete Vitest and Pytest test suites planned for all new components and harness endpoints.

---

## Project Structure & Source Code Layout

```text
services/frontend/
├── app/
│   └── api/
│       └── agent/
│           ├── stream/route.ts       # Enhanced multi-agent streaming with Reflexion & trace logging
│           ├── feedback/route.ts     # Operator thumbs up/down feedback ingestion
│           └── approve/route.ts      # HITL decision approval committing to BigQuery
├── components/
│   └── assistant/
│       ├── assistant-drawer.tsx      # Modern 21st.dev-inspired glassmorphic chat drawer
│       ├── thinking-accordion.tsx    # Animated step-by-step specialist consultation view
│       ├── message-bubble.tsx        # Markdown message with copy, feedback, & timestamp
│       ├── follow-up-chips.tsx       # Dynamic contextual action suggestion buttons
│       └── artifacts/
│           ├── sparkline-widget.tsx  # Embedded interactive telemetry trend card
│           ├── what-if-widget.tsx    # Embedded interactive physics what-if slider card
│           ├── proposal-card.tsx     # Gated HITL decision approval card
│           └── citation-popover.tsx  # Document provenance and snippet viewer
└── lib/
    └── agent/
        ├── harness.ts                # Orchestrator with Reflexion critic & Context Caching
        ├── prompts.ts                # Typed signatures and specialist system prompts
        ├── grounding.ts              # Adaptive CRAG & HyDE query retrieval
        └── tracing.ts                # OpenTelemetry / Cloud Trace wrapper

services/agent/
└── eval/
    ├── run_eval.py                   # Automated Eval Quality Flywheel runner
    ├── metrics.py                    # Groundedness, Hallucination, and Tool Selection metrics
    └── golden_benchmark_50.json      # Expanded 50-case comprehensive test dataset
```

---

## Complexity Tracking

| Mechanism | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| In-Harness Reflexion Critic | Prevents ungrounded figures from reaching plant operators. | Raw system prompt compliance alone occasionally generates uncalibrated numbers on rare edge cases. |
| HyDE Query Expansion | Bridges colloquial operator terms (*"acid wash"*) to formal SOP manuals (*"Citric acid CIP"*). | Simple keyword/dense vector search frequently misses domain terminology. |
| Embedded Interactive Chat Artifacts | Allows instant parameter tweaking and one-click HITL decision recording. | Plain text responses require operators to manually navigate away to other screens to act on recommendations. |
