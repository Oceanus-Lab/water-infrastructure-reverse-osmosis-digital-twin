<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0
Bump rationale: Initial ratification — first concrete constitution replacing the template.

Principles (all newly defined at initial ratification):
  I.   BigQuery-as-AI-Compute (In-Place First)
  II.  Evidence Over Assertion (No Hallucinated Numbers)
  III. Advise-Only, Human-in-the-Loop (NON-NEGOTIABLE)
  IV.  Measured vs. Modeled Honesty (Lead With Deltas)
  V.   Physics-Grounded, Fit-for-Purpose Fidelity
  VI.  Honest Twin Maturity (Live-Ready, Not Faked)
  VII. Test-First Discipline

Added sections:
  - Engineering Constraints (runtime, cloud, models, code, security)
  - Development Workflow (Spec-Driven Development, docs-as-source-of-truth)
  - Governance (strong-defaults register + three hard MUST gates)

Removed sections: none (template placeholders replaced).

Templates reviewed for consistency:
  ✅ .specify/templates/plan-template.md — "Constitution Check" gate is generic
       ([Gates determined based on constitution file]); references this file dynamically,
       no hardcoded principles to update.
  ✅ .specify/templates/spec-template.md — no principle-specific content; no change needed.
  ✅ .specify/templates/tasks-template.md — task categories are principle-agnostic;
       no change needed.
  ✅ .specify/templates/checklist-template.md — generic; no change needed.
  ✅ AGENTS.md — already consistent with these principles (BigQuery-as-AI-compute,
       advise-only, delta-economics, Python 3.11, Gemini model rules).

Follow-up TODOs: none. All placeholders resolved.
-->

# RO Digital Twin Constitution

A cloud-native digital twin for Municipal/Industrial BWRO (Brackish Water Reverse Osmosis)
facilities, unifying operational data, physics simulation, AI diagnostics, and economics on
GCP. These principles govern every spec, plan, and implementation. They are **strong
defaults**: deviations are permitted only with a written justification recorded in the
relevant spec or plan. Three items marked **(HARD GATE)** admit no exceptions.

## Core Principles

### I. BigQuery-as-AI-Compute (In-Place First)

BigQuery is both the storage layer AND the primary AI compute layer. Forecasting
(`AI.FORECAST`), anomaly detection (`AI.DETECT_ANOMALIES`), embeddings + retrieval
(`AI.GENERATE_EMBEDDING`, `VECTOR_SEARCH`), and language tasks (`AI.GENERATE`,
`AI.GENERATE_TABLE`, `AI.GENERATE_BOOL`) SHOULD run in SQL, in-place. Vertex AI / Agent
Runtime is reserved for agent orchestration only. Introducing a custom ML pipeline or an
external model service requires a written justification, in the spec or plan, that no
BigQuery AI function meets the need.

*Rationale:* Fewer moving parts, lower latency and cost, and faster iteration. This is the
architecture's foundational bet — eroding it quietly defeats the design.

### II. Evidence Over Assertion (No Hallucinated Numbers)

Every numeric, physics, or economic figure surfaced to a user MUST trace to a tool result or
query — bare model-generated numbers are not permitted. Each ML-backed tool returns evidence
alongside its value: forecasts carry a confidence interval and drivers; anomalies name the
signal that deviated and its magnitude versus baseline; fouling scores include feature
attribution. Accuracy claims (lead time, precision, MAPE) are published only after the
backtest or validation that produces them has actually run — **evidence first, claim
second (HARD GATE)**.

*Rationale:* This is the project's top governance priority and the line between a credible
twin and a buzzword. A confident wrong number is worse than an honest "unknown."

### III. Advise-Only, Human-in-the-Loop (NON-NEGOTIABLE)

Agents are read-only by default. Any write — decision log entry, recommendation record, work
order — flows through a gated tool that requires explicit human approval. The system **MUST
NEVER actuate plant equipment** or issue SCADA/PLC commands **(HARD GATE)**.
Auto-generated artifacts (e.g. skill-factory `SKILL.md` files) require human review before
they are used.

*Rationale:* Safety and accountability. "Advise, and propose-to-record" is the agency
ceiling; the operator remains in control of the plant at all times.

### IV. Measured vs. Modeled Honesty (Lead With Deltas)

Every dollar or performance figure is labeled measured or modeled (e.g. Banks F–G energy is
metered; Banks A–E energy is WaterTAP-modeled). Cost answers declare their assumptions inline
and honor conversational parameter overrides. Prefer deltas, trends, and rankings — which are
robust — over absolute LCOW, which carries ±20% uncertainty; quote absolutes only with their
assumptions attached.

*Rationale:* The parametric economics model is trustworthy only when its provenance is
explicit. Leading with deltas turns an uncertain absolute into a defensible decision.

### V. Physics-Grounded, Fit-for-Purpose Fidelity

Anomaly and fouling detection operate on the delta between the WaterTAP clean-membrane
baseline and the actual reading, removing temperature and operating-condition confounds.
Fouling is modeled per the `dss` (Days Since Cleaning) clean→CIP cycle — a saw-tooth that
resets at cleaning — never as absolute membrane age. WaterTAP baselines are validated against
OCWD actuals (clean-state MAPE; the 71 real CIP events) before being treated as
authoritative. The 0D lumped model's limits are respected: no element-level spatial-diagnosis
claims.

*Rationale:* A model is only as good as its fit to purpose. Stating scope honestly is a
feature, not a gap.

### VI. Honest Twin Maturity (Live-Ready, Not Faked)

The prototype is a digital shadow that progresses descriptive → diagnostic → predictive,
running on a live-ready, event-driven spine. Historical replay is always labeled as replay
with the simulation clock visible; the UI never implies a live plant connection that does not
exist. "Now" means "as of the replay clock." Production swap-in is a single connector change
feeding the same Pub/Sub topic the replay harness uses.

*Rationale:* Over-claiming a "real-time twin" is the single biggest credibility risk.
Naming the maturity level honestly converts that risk into a strength.

### VII. Test-First Discipline

Test-driven development is the default: write the test, watch it fail, implement, refactor.
Maintain ≥80% coverage across unit and integration tests; critical user and data flows get
end-to-end coverage. Data transforms ship with Dataform assertions, and the WaterTAP path
keeps spike-style gate checks (mass balance, recovery bounds, flux sanity, solver
convergence). Tests are fixed, not deleted, to make a build pass.

*Rationale:* Spec-driven and test-driven development together keep velocity honest and make
refactoring safe.

## Engineering Constraints

- **Runtime:** Python 3.11 only (WaterTAP supports 3.9–3.12, not 3.13+). Never run
  `idaes get-extensions` — WaterTAP 1.6.0 bundles Ipopt via `watertap-solvers`.
- **Cloud:** GCP region `us-central1`; Cloud Run, serverless and scale-to-zero; a prototype
  budget alert at ~$50/month. Gemini Flash is the default model; Gemini Pro only where
  complex reasoning justifies the cost.
- **Models:** New agents use `gemini-3-flash-preview` / `gemini-3-pro-preview`. Never rename
  an existing agent's model. A 404 is usually a `GOOGLE_CLOUD_LOCATION` issue (try `global`),
  not the model name.
- **Code:** Many small, focused files (200–400 lines typical, 800 max); high cohesion, low
  coupling; immutable patterns (return new objects, never mutate in place); validate all input
  at system boundaries.
- **Security (HARD GATE — no secrets in source):** No secrets in source — use environment
  variables or Secret Manager. Service accounts follow least privilege. Treat uploaded
  documents and RAG content as untrusted input (a prompt-injection surface).

## Development Workflow

- **Spec-Driven Development** via Spec Kit drives all non-trivial work:
  constitution → `specify` → (`clarify`) → `plan` → `tasks` → (`analyze`) → `implement`.
- **docs/ briefs are the source of truth.** When a documented fact proves wrong during
  implementation, fix the doc rather than working around it. Do not duplicate doc content
  into code comments or AGENTS.md.
- **AGENTS.md** is the agent entry point and MUST stay consistent with this constitution.
- **Skills on demand:** use the ADK skills (`adk-dev-guide`, `adk-cheatsheet`,
  `adk-eval-guide`, `adk-deploy-guide`) when writing or evaluating agent code, and the
  superpowers skills (brainstorming, writing-plans, test-driven-development,
  systematic-debugging) as the work demands.

## Governance

This constitution supersedes ad-hoc practice. Principles are **strong defaults**: a deviation
is allowed only with a written justification recorded in the governing spec or plan. Three
items are **hard gates** with no exceptions: (1) the system never actuates plant equipment
(Principle III); (2) no secrets in source (Engineering Constraints); (3) no accuracy claim is
published before the run that validates it (Principle II).

**Amendments:** edit this file, bump the version per semantic versioning, record the rationale
in the Sync Impact Report, and propagate changes to dependent templates and docs.

**Versioning policy:** MAJOR = backward-incompatible principle removal or redefinition;
MINOR = a new principle or section, or materially expanded guidance; PATCH = clarifications,
wording, and non-semantic refinements.

**Compliance review:** `/speckit.plan` runs a Constitution Check gate before research and
again after design; `/speckit.analyze` cross-checks artifacts against these principles.
AGENTS.md and the docs/ briefs are kept in sync with any amendment.

**Version**: 1.0.0 | **Ratified**: 2026-06-30 | **Last Amended**: 2026-07-01
