# Making the AI Assistant Work in Gemini Agent Enterprise — Quota Options

**Status:** Option 1 (semantic-cache pre-seed + honest fallback) is **implemented**; Options 2–5
remain future work toward full arbitrary-question capability.
**Goal:** get the custom `ro-assistant` agent answering reliably on the Gemini Enterprise
Agent Platform, past the preview-tier quota wall that currently blocks it.

> **Implemented (2026-07-15):** The stream route
> (`services/frontend/app/api/agent/stream/route.ts`) now embeds with `text-embedding-005`,
> serves `ro_embeddings.qa_cache` hits before calling the agent, falls back to the cache when
> the agent 429s (for any question, including time-sensitive ones), and otherwise returns an
> honest "rate-limited" message instead of a generic error. `services/frontend/scripts/seed-qa-cache.mjs`
> seeds grounded answers for the core demo questions. Result: the assistant answers those
> questions instantly with zero agent-quota dependency; novel questions still need the quota
> raised (Option 4). See below for the remaining options.

---

## The problem (observed, dated 2026-07-15)

Live interaction attempts against the deployed agent return `429`, and the *metric changes*
depending on the pattern of use:

| When | Quota metric | Scope |
|---|---|---|
| Rapid retries | `aiplatform.googleapis.com/stateful_interaction_creations` | per minute, per project |
| After sustained use | `aiplatform.googleapis.com/interaction_throughput_bytes` | **per day**, per project (global) |

Both are preview-tier limits on `aiplatform.googleapis.com`. The daily throughput cap is the
harder one — once it's exhausted, the agent is down until the day rolls over, and it re-exhausts
quickly under any real traffic. Neither metric appears in the standard Cloud Console **Quotas &
System Limits** table (confirmed: a direct `serviceusage` API lookup returns
`SU_METRIC_NOT_FOUND`), so there is no self-service "Edit Quota" row to raise.

This is an **external platform constraint, not a code bug.** The agent resource is provisioned
correctly and the request path (semantic-cache check → `interactions.create` with
`background:true, stream:true`) is in place. The BigQuery `ro_embeddings.qa_cache` table exists
with the right schema. It's the quota that stops it.

## Current agent footprint (what drives the byte cap)

From the live agent config:

- `base_agent`: `antigravity-preview-05-2026`
- `system_instruction`: ~1,391 chars
- `tools`: `code_execution`
- mounted sources: `gs://spatial-cat-489006-a4-agent-staging/skills` (6 skill folders)

`interaction_throughput_bytes` counts bytes moved per interaction. The mounted skills, the
system instruction, and each tool round-trip all add to that per-call weight — so a lighter
agent gets *more interactions per day* under the same cap.

---

## Options (ordered by near-term practicality)

### 1. Pre-seed the semantic cache — highest leverage, no quota needed
The stream route (`services/frontend/app/api/agent/stream/route.ts`) already checks
`ro_embeddings.qa_cache` via `VECTOR_SEARCH` **before** calling the agent, and serves a cached
answer on a cosine-distance hit (`< 0.08`). Pre-populate that table with embeddings + canned
answers for the expected demo/eval questions (the 10-case golden set in
`specs/007-ai-assistant/eval/golden_qa.json` is a ready starting list). Those questions then
return straight from BigQuery and **never touch the agent quota**. This is the strongest way to
make the assistant reliably responsive for a demo while the quota is constrained, and it uses
machinery that already exists.

### 2. Hybrid routing: direct model call for non-agentic questions
For questions that don't need multi-tool orchestration, call a Gemini *model* interaction
(`ai.interactions.create({ model: 'gemini-3-flash-preview', ... })`) instead of the custom
`agent`. Model interactions draw on a different (and generally larger) quota bucket than the
custom Agent Platform metrics. Reserve the `ro-assistant` agent only for questions that genuinely
need its sub-agents/tools. Requires a routing heuristic in the stream route.

### 3. Shrink the per-interaction byte footprint
Directly lowers `interaction_throughput_bytes` per call, so more calls fit the daily cap:
- Trim the system instruction to essentials.
- Mount only the skills a given interaction needs, not all six every time.
- Drop `code_execution` if it isn't exercised by the diagnostic flows.

### 4. Request a quota increase / preview allowlist
Because these metrics aren't self-service, this goes through the **Quotas → Increase Requests**
flow (visible even when the metric has no editable row), or a support case tied to whatever
grant enabled `antigravity-preview-05-2026` access. Slowest path; start it early if the demo
horizon is far enough out. Capture the exact metric names above in the request.

### 5. Provisioned throughput (production posture)
For a real Gemini Enterprise deployment (not a prototype), a provisioned-throughput /
dedicated-capacity reservation removes reliance on the shared per-project daily cap entirely.
This is the "make it work in production" answer, distinct from the "survive the demo" answers
above.

---

## One thing to verify once quota allows

Context7's `@google/genai` docs show `background: true` agent interactions using a
**create → poll** pattern (`ai.interactions.get(id)` until `status === 'completed'`), not SSE
streaming. Our stream route sets both `background: true` and `stream: true` and iterates the
result as an async stream. Before trusting the streaming UX, confirm the agent actually yields
incremental token chunks rather than a single queued acknowledgement — and if it's the latter,
switch the route to poll-and-emit. This can't be tested while the `429` blocks every call, so it
stays a known unknown until Option 1, 2, or 4 opens a path through.

## Recommended sequence

1. **Now / for the demo:** Option 1 (pre-seed cache) + Option 3 (trim footprint).
2. **In parallel:** Option 4 (file the increase request — it has lead time).
3. **When a real call gets through:** resolve the streaming-vs-polling question above.
4. **For production Gemini Enterprise:** Option 5.
