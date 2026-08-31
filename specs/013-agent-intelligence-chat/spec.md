# Feature Specification: 013-agent-intelligence-chat

**Feature Name:** Next-Generation Self-Improving Agent Architecture & 21st.dev-Inspired Visual Chat Surface  
**Target Areas:** `services/agent/`, `services/frontend/lib/agent/`, `services/frontend/components/assistant/`, `pipeline/ingest/`  
**Constitution Alignment:** Principle I (In-Place BQ Compute), Principle II (Evidence First / No Hallucinations), Principle III (Advise-Only / HITL Gated), Principle IV (Measured vs. Modeled), Principle VII (Test-First).

---

## 1. Executive Summary & Value Proposition

Reverse osmosis plant operators, process engineers, and operations managers require real-time, trustworthy, and actionable diagnostic intelligence. While the initial digital twin assistant proved the viability of multi-agent routing and BigQuery caching, complex operational queries (e.g., multi-hop root cause analysis, what-if trade-offs, and compliance inquiries) demand:
1. **Verifiable Reasoning & Self-Reflection**: An agent that critiques its own numerical claims against live sensor baselines before streaming tokens.
2. **Adaptive Corrective RAG (CRAG)**: Dynamic document retrieval that understands informal plant terminology via HyDE (Hypothetical Document Embeddings) and validates chunk relevance before generation.
3. **Continuous Self-Improvement**: An automated Quality Flywheel that logs real-world interaction traces, clusters failure modes, and iteratively refines system prompts using textual feedback without human prompt hacking.
4. **State-of-the-Art Interactive UI**: A modern, responsive chat interface inspired by 21st.dev and Vercel AI SDK chat components featuring collapsible reasoning accordions, embedded interactive tool execution widgets (sparklines, simulation comparison cards, parameter sliders), and rich feedback affordances.

---

## 2. User Personas & Core Scenarios

### User Scenario 1: Plant Operator Investigating Rapid Degradation
* **Actor:** Plant Operator (Desk / Mobile HMI)
* **Goal:** Understand why Bank B Stage 3 is alarming, see the exact historical baseline, and request advice.
* **Experience:** 
  1. Operator opens the modern AI Assistant drawer and selects *"Why is B03 degrading faster than the clean baseline?"*.
  2. The UI renders a collapsible **"Thinking & Specialist Consultation"** accordion showing the DataAnalyst and Simulation specialists querying BigQuery and WaterTAP in parallel.
  3. The response streams in, embedding an **interactive flux sparkline widget** directly in the chat bubble showing measured $\Delta P$ vs. WaterTAP baseline.
  4. At the bottom of the response, interactive follow-up chips appear: *"Simulate 5-day delay"*, *"Check chemical dosing SOP"*, *"Draft CIP Recommendation"*.

### User Scenario 2: Process Engineer Executing Multi-Hop Physics What-Ifs
* **Actor:** Process Engineer
* **Goal:** Ask a compound question: *"Compare Bank A and Bank G specific energy consumption, then simulate what happens if we increase Bank A recovery to 85% at 22°C"*.
* **Experience:**
  1. The agent's Adaptive Router recognizes a multi-hop intent and invokes both `DataAnalyst` and `Simulation` specialists.
  2. Before answering, the **Reflexion Critic** validates that Bank A energy is explicitly labeled as *modeled* and Bank G as *measured*.
  3. The chat bubble renders an embedded **What-If Comparison Card** comparing baseline SEC ($1.82\text{ kWh/m}^3$) with the new scenario ($2.04\text{ kWh/m}^3$, $+0.22\text{ delta}$), complete with an inline slider to tweak temperature interactively.

### User Scenario 3: Operations Manager Reviewing Governance & Providing Feedback
* **Actor:** Operations Manager
* **Goal:** Review proposed cleaning schedules and log approved decisions.
* **Experience:**
  1. Operator asks *"Should we clean B03 this weekend?"*.
  2. The agent outputs an economic breakdown with inline assumptions ($0.08/kWh electricity, $5,000 CIP).
  3. A **Proposal Card** renders inside the chat with an explicit **"Approve & Record to Audit Log"** button (HITL Gate).
  4. Clicking "Approve" triggers `POST /api/agent/approve`, appending the record to `ro_serving.decision_log` and updating the card state to "Approved".
  5. The manager provides a thumbs-up rating with an optional note, feeding the interaction into the automated Eval Flywheel.

---

## 3. Functional Requirements by Phase

### Phase 1: Structured Signatures, Progressive Skills & Adaptive Corrective RAG (CRAG)
* **FR-001 (Typed Signatures)**: Every specialist (`DataAnalyst`, `Simulation`, `Economics`, `Document`) MUST define typed input, reasoning, and output contracts using Gemini structured output schemas (`responseSchema` / `Type.OBJECT`).
* **FR-002 (Adaptive RAG Routing)**: The router MUST classify incoming queries by complexity. Simple single-fact queries route to direct BigQuery vector lookup; complex multi-hop queries invoke the multi-agent specialist DAG.
* **FR-003 (HyDE Query Expansion)**: For document search queries, the system MUST generate a hypothetical technical excerpt before embedding, closing the vocabulary gap between colloquial operator queries and formal technical manuals.
* **FR-004 (CRAG Relevance Gate)**: Retrieved document passages MUST pass a cosine similarity threshold ($\text{distance} < 0.12$). Passages failing the threshold MUST trigger query reformulation rather than injecting irrelevant context.
* **FR-005 (Mandatory Document Provenance)**: Every passage surfaced by RAG MUST cite `source_document`, section title, and relevance score.

### Phase 2: Multi-Agent Harness Optimization & Short-Term Reflexion Critic
* **FR-006 (Short-Term Reflexion Pass)**: Prior to final streaming release, a lightweight validation check MUST compare all generated numerical values ($\Delta P$, flux, dollar estimates) against the retrieved grounding context.
* **FR-007 (Corrective Self-Critique)**: If ungrounded numbers or mislabeled provenance (e.g., calling Bank A modeled energy "measured") are detected, the critic MUST inject a corrective prompt and regenerate the answer.
* **FR-008 (Dynamic Function Calling)**: Replace static pre-fetching with dynamic Gemini Tool Calling (`get_unit_telemetry`, `run_watertap_what_if`, `query_cost_model`, `search_docs`).
* **FR-009 (Context Caching)**: The system MUST configure Gemini Enterprise Context Caching (`ContextCacheConfig`, TTL 3600s) on static plant topology instructions and standard operational procedures (>2,048 tokens).
* **FR-010 (Distributed Tracing)**: Instrument the agent pipeline with OpenTelemetry spans (`agent.route`, `agent.tool_call`, `agent.specialist`, `agent.reflexion`, `agent.compose`) exportable to Google Cloud Trace.

### Phase 3: Autonomous Self-Improvement Flywheel (TextGrad / DSPy / Eval Automation)
* **FR-011 (Telemetry Logging)**: All agent interactions, grounding contexts, generated responses, and user feedback ratings (thumbs up/down) MUST log to BigQuery `ro_serving.agent_traces`.
* **FR-012 (Automated Eval Suite)**: Implement an automated Python evaluation script using `agentplatform.evals` evaluating against 50+ golden Q&A cases across four metrics:
  1. `grounding` (factuality vs. BigQuery ground truth)
  2. `hallucination` (absence of ungrounded figures)
  3. `multi_turn_task_success` (goal completion)
  4. `tool_use_quality` (accurate tool invocation)
* **FR-013 (Loss Clustering)**: Automated clustering MUST group low-scoring interactions into semantic error taxonomies.
* **FR-014 (Textual Feedback Optimization)**: Optimization harness MUST generate candidate prompt diffs for underperforming skills and test them against the benchmark.
* **FR-015 (Regression Gate)**: Candidate prompt improvements MUST NOT be promoted unless they achieve $\ge 95\%$ pass rate on the golden benchmark with zero regressions on safety and provenance.

### Phase 4: 21st.dev-Inspired UI / UX Chat Experience
* **FR-016 (Modern Glassmorphic Shell)**: Redesign the AI Assistant panel into a premium, responsive glassmorphic drawer with expandable full-screen canvas view.
* **FR-017 (Collapsible Reasoning Accordions)**: Multi-agent execution steps and specialist thoughts MUST render inside an animated, collapsible *"Thinking & Specialist Workflows"* accordion.
* **FR-018 (Embedded Interactive Artifacts)**: The chat interface MUST render rich embedded UI widgets directly within message bubbles:
  - **Telemetry Sparkline Card**: Mini interactive chart of $\Delta P$ or flux over time.
  - **What-If Simulation Delta Card**: Interactive baseline vs. scenario comparison table with adjustable input sliders.
  - **Actionable Proposal Card**: Gated HITL approval card with one-click "Approve" button wired to `POST /api/agent/approve`.
  - **Attributed Citation Pills**: Clickable source document tags opening relevant SOP snippets in a popover.
* **FR-019 (Message Feedback & Copy Controls)**: Each assistant message MUST include one-click markdown copy, code snippet copy, and thumbs up / thumbs down feedback triggers with optional tag selection (e.g., *"Wrong calculation"*, *"Missing source"*).
* **FR-020 (Dynamic Follow-Up Suggestion Chips)**: At the conclusion of every response, the assistant MUST provide 2–3 contextual, clickable follow-up action chips.

---

## 4. Key Entities & Data Contracts

```typescript
// Chat Message Entity Schema
export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  status: 'streaming' | 'completed' | 'error';
  thinking?: {
    summary: string;
    specialistsConsulted: Array<{
      id: 'dataAnalyst' | 'simulation' | 'economics' | 'document';
      status: 'started' | 'completed' | 'error';
      durationMs: number;
    }>;
    reflexionCritique?: string;
  };
  artifacts?: Array<
    | { type: 'sparkline'; unitId: string; metric: string; data: Array<{ date: string; value: number }> }
    | { type: 'what_if_delta'; base: Record<string, number>; change: Record<string, number>; delta: Record<string, number> }
    | { type: 'proposal'; proposalId: string; title: string; payload: Record<string, unknown>; status: 'pending' | 'approved' | 'dismissed' }
    | { type: 'citation'; document: string; section: string; snippet: string }
  >;
  suggestedFollowUps?: string[];
  feedback?: {
    rating: 'thumbs_up' | 'thumbs_down';
    reason?: string;
  };
}
```

---

## 5. Non-Functional Requirements & Guardrails

* **Response Latency**: 
  - Cached queries: $< 200\text{ ms}$ TTFT.
  - Simple queries: $< 3\text{ s}$ TTFT.
  - Deep multi-agent + simulation queries: $< 10\text{ s}$ total completion time.
* **Governance (HARD GATE)**: The chat interface and agent harness MUST NEVER provide any mechanism to actuate physical equipment, dose chemicals, or write to SCADA/PLCs (Constitution Principle III).
* **Accessibility**: Full keyboard navigability (Tab/Shift-Tab/Enter), ARIA live regions for streaming output (`aria-live="polite"`), and high-contrast dark/light mode tokens.
* **Responsiveness**: Fluid layout reflow across mobile (375px), tablet (768px), and desktop (1280px+).

---

## 6. Success Criteria & Verification Metrics

1. **Groundedness Score**: $\ge 98\%$ on the 50-case benchmark (0 hallucinated numbers).
2. **RAG Retrieval Precision**: $\ge 90\%$ relevance on operator procedural queries.
3. **Reflexion Correction Rate**: 100% of synthetic ungrounded claims caught and corrected before token streaming.
4. **Latency Reduction**: $\ge 40\%$ reduction in Time-To-First-Token via Context Caching and parallel DAG execution.
5. **Operator Task Efficiency**: Single-click navigation and interactive proposal approval reducing workflow time by $> 50\%$.
