# Open Questions, Risks & Next Steps
**Brief for:** Tracking unresolved decisions; review before each planning session  
**Last updated:** 2026-06-30

---

## Resolved Decisions (Do Not Reopen)

| Decision | Resolution | Date |
|---|---|---|
| BWRO vs. SWRO model variant | **BWRO confirmed** — matches OCWD dataset | 2026-06-30 |
| BigQuery as AI compute layer | **Adopted** — use AI functions before custom Vertex models | 2026-06-30 |
| WaterTAP viability | **Confirmed viable** — spike passed all 4 gates, solve ~2s | 2026-06-30 |
| Architecture option | **Option C (Multi-Agent)** selected — multi-agent design to be refined before implementation | 2026-06-30 |
| Cloud Run shape for WaterTAP | **Service** (not Job) — 2s latency OK for on-demand | 2026-06-30 |

---

## Open Questions — Requires Decision

| # | Question | Impact | Owner |
|---|---|---|---|
| Q0 | **Multi-agent design** — Define orchestrator responsibilities, specialist agent boundaries (FoulingAgent, EconomicsAgent, WaterTAPAgent?), A2A protocol contracts, and whether frontend talks to orchestrator or a gateway | Affects entire agent + serving layer implementation | User + design session |
| Q1 | **Frontend timing** — Build concurrently (week 1) or after backend? | Affects phase plan structure | User |
| Q2 | **Frontend framework** — Next.js confirmed, or evaluate alternatives (SvelteKit, Remix)? | Affects frontend scaffolding | User |
| Q3 | **Prototype demo context** — Municipal ($/m³ tariff) or industrial (cost-as-input)? Affects default revenue config | Economics layer default | User |
| Q4 | **Real-time serving** — BQ materialized views only, or add Firestore for hot per-unit state (<1s reads)? | UI refresh latency | User |
| Q5 | **Dataform vs. plain SQL scripts** — Dataform adds overhead but gives versioning + testing | Transform governance | User |
| Q6 | **RAG corpus** — Which documents to embed first? (WaterTAP docs, OCWD SOPs, membrane datasheets?) | Agent knowledge quality at launch | User |
| Q7 | **WaterTAP calibration** — When to calibrate A/B coefficients against OCWD data? Before first demo or later? | Physics accuracy | User |

---

## Open Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **WaterTAP Docker containerization** — local install works; Cloud Run deploy not yet validated | 🟠 Med | Spike remaining: build minimal Docker image + test on Cloud Run. PhysicsEngine abstraction limits blast radius. |
| R2 | **Agent eval quality** — no golden Q&A dataset yet | 🟡 Low | Build alongside agent development; 50 pairs minimum before prototype demo |
| R3 | **Electricity tariff data** — EIA API free but may require registration/key | 🟡 Low | Register for free EIA API key early |
| R4 | **AWWA rate survey data** — may require subscription or manual request | 🟡 Low | Use DOE/NAWI benchmarks as fallback |
| R5 | **Memory Bank pricing** — newer Agent Platform features, exact pricing not fully public | 🟡 Low | Budget $5–20/month buffer; monitor billing |
| R6 | **WaterTAP calibration** — default A/B coefficients may give ~10–20% error vs. OCWD actuals | 🟠 Med | Calibrate before treating simulation output as authoritative |

---

## Next Steps

Ordered by dependency:

| # | Step | Status | Depends On |
|---|---|---|---|
| 1 | ✅ Confirm BWRO model variant | Done | — |
| 2 | ✅ Confirm BigQuery-as-AI-compute principle | Done | — |
| 3 | ✅ WaterTAP validation spike (local) | Done | — |
| 4 | ✅ Architecture option selection (Option C — Multi-Agent) | Done | — |
| 5 | **Answer Q1** (frontend timing) | ⏳ Blocking phase plan | User decision |
| 6 | Write implementation plan (invoke writing-plans skill) | ⏳ | Q1 answer |
| 7 | GCP project setup — enable services, create BQ datasets, Cloud Storage | ⏳ | Plan approved |
| 8 | OCWD data ingestion — download CSVs → GCS → BQ raw | ⏳ | GCP setup |
| 9 | Dataform transforms — raw → curated fouling scores | ⏳ | Data ingested |
| 10 | WaterTAP Cloud Run service (FastAPI + PhysicsEngine) | ⏳ | Plan approved |
| 11 | Validate WaterTAP Docker → Cloud Run (R1 spike) | ⏳ | Step 10 |
| 12 | ADK agent — tools, Memory Bank, Sessions | ⏳ | BQ + WaterTAP service |
| 13 | BigQuery AI functions — AI.FORECAST, AI.DETECT_ANOMALIES | ⏳ | Curated data |
| 14 | RAG corpus — embed docs into ro_embeddings | ⏳ | Q6 answer |
| 15 | Serving API (Cloud Run, FastAPI) | ⏳ | BQ serving layer |
| 16 | Next.js frontend (2.5D, 4 nav sections) | ⏳ | Q1, Q2 answers |
| 17 | Agent eval dataset + adk eval loop | ⏳ | Agent working |
| 18 | WaterTAP calibration against OCWD data | ⏳ | Q7 answer |

---

## Architecture Decisions Still Open

These are in [00-overview.md](00-overview.md) and will be locked as the plan is written:

- Frontend concurrency (Q1)
- Frontend framework (Q2)
- Prototype demo deployment context (Q3)
- Real-time serving strategy (Q4)
