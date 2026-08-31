# Research: 013-agent-intelligence-chat

## 1. Technical Decisions & Architectural Choices

### Decision 1: In-Harness Test-Time Reflexion vs. Standalone Microservice
* **Decision**: Implement the short-term Reflexion critic directly within [`services/frontend/lib/agent/harness.ts`](file:///Users/abdullahabtahi/RO%20Digital%20Twin/services/frontend/lib/agent/harness.ts) before token streaming.
* **Rationale**: Running the critic in-process using Gemini with `thinkingLevel: LOW` adds only ~600ms latency, while eliminating the networking overhead, serialized network hops, and failure points of a separate microservice.
* **Alternatives Considered**:
  - *Standalone Python Critic Service*: Rejected due to added inter-service latency on every conversational turn.
  - *Post-Generation Regex Parser*: Rejected because simple regex cannot verify contextual nuances (e.g., distinguishing whether Bank A energy was claimed as modeled vs. measured).

### Decision 2: BigQuery HyDE (Hypothetical Document Embeddings) & Adaptive CRAG
* **Decision**: For document retrieval, the agent first expands colloquial operator queries into a dense technical pseudo-passage, generates embeddings via BigQuery `ML.GENERATE_EMBEDDING` (`text-embedding-005`), and applies a strict relevance threshold ($\text{cosine distance} < 0.12$).
* **Rationale**: Plant operators search using informal terms (e.g. *"how to clean foulant"*, *"acid wash"*), whereas DuPont/Toray/OCWD manuals use formal nomenclature (*"Citric acid 2.0 wt% CIP protocol for metal hydroxide scale"*). HyDE bridges this vocabulary discrepancy with zero index schema changes.
* **Alternatives Considered**:
  - *BM25 Keyword Search*: Rejected due to high failure rate on technical synonyms.
  - *External Vector DB (Pinecone/Weaviate)*: Rejected to adhere to Constitution Principle I (BigQuery-as-AI-Compute).

### Decision 3: 21st.dev / Modern AI Chat Interface Aesthetics & Component Architecture
* **Decision**: Build a rich, glassmorphic AI Assistant drawer component suite inspired by modern 21st.dev / Vercel AI SDK chat standards:
  - Collapsible reasoning accordion (`ThinkingAccordion`) showing step-by-step specialist consultations.
  - Embedded interactive tool widgets: `SparklineWidget` (measured vs. baseline $\Delta P$), `WhatIfDeltaWidget` (interactive parameter sliders), `ProposalActionCard` (gated HITL approval).
  - Feedback affordance (thumbs up/down with feedback reason tags) and copy-to-clipboard buttons.
* **Rationale**: Replaces raw text walls with actionable, interactive cards that allow operators to verify data and execute approvals in single clicks.
* **Alternatives Considered**:
  - *Plain text markdown chat*: Rejected as it fails to provide intuitive visual evidence.

### Decision 4: Enterprise Context Caching on Gemini Enterprise Agent Platform
* **Decision**: Configure `ContextCacheConfig` with a 1-hour TTL on the static plant configuration (21 units, bank descriptions, sensor ranges, standard chemical wash procedures).
* **Rationale**: The static system instruction prefix is ~2,400 tokens. Context caching reduces input token cost by ~85% and significantly accelerates Time-To-First-Token (TTFT) on uncached dynamic queries.

### Decision 5: Eval Quality Flywheel Pipeline (`adk eval` & `agentplatform.evals`)
* **Decision**: Implement an automated evaluation runner in `services/agent/eval/run_eval.py` scoring responses against a 50-case benchmark on `grounding`, `hallucination`, and `tool_use_quality`.
* **Rationale**: Provides verifiable quantitative evidence before code promotion, satisfying Constitution Principle II (Evidence First).
