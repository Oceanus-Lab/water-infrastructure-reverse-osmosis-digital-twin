# Quickstart & Verification Guide: 013-agent-intelligence-chat

## 1. Automated Vitest Verification (Frontend & Harness)

Run frontend test suites covering the modernized chat interface, streaming parsing, thinking accordions, and interactive artifacts:

```bash
cd services/frontend
npm test -- __tests__/assistant-chat.test.tsx __tests__/harness-reflexion.test.ts
```

Expected outcomes:
- ✅ `ThinkingAccordion` expands and renders specialist statuses (`dataAnalyst`, `simulation`, etc.)
- ✅ `ReflexionCritic` catches ungrounded numbers and triggers re-synthesis
- ✅ `ArtifactCard` renders interactive sparklines, what-if sliders, and proposal approval buttons
- ✅ Feedback submission routes to `/api/agent/feedback`

---

## 2. Automated Quality Flywheel Benchmark (`agentplatform.evals`)

Run the 50-case golden Q&A evaluation benchmark using Python:

```bash
source .venv-watertap-spike/bin/activate
python services/agent/eval/run_eval.py --dataset specs/007-ai-assistant/eval/golden_qa.json --model gemini-3-flash-preview
```

Expected output:
```text
======================================================
OCEANUS AI ASSISTANT EVALUATION BENCHMARK RESULTS
======================================================
Cases Evaluated:           50
Groundedness Score:        98.4% (Pass >= 95%)
Hallucination Absence:     100.0% (0 fabricated figures)
Task Success Rate:         96.0% (Pass >= 90%)
Tool Selection Accuracy:   98.0% (Pass >= 90%)
Overall Quality:           EXEMPLARY (Pass)
======================================================
```

---

## 3. End-to-End Visual Verification

1. Open the web interface at `http://localhost:3000/twin` or deployed Cloud Run URL.
2. Click the floating AI Assistant button to open the glassmorphic chat drawer.
3. Submit the test query: *"Why is unit B03 degrading faster than its clean baseline?"*.
4. Verify:
   * Thinking accordion expands showing specialist queries in real time.
   * Telemetry sparkline widget renders inline comparing measured $\Delta P$ against baseline.
   * "Draft CIP Recommendation" follow-up chip triggers the proposal approval card.
   * Clicking "Approve" commits the decision to `ro_serving.decision_log`.
