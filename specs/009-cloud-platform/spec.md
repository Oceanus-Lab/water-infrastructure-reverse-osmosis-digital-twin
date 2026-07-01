# Feature Specification: Cloud Platform & Delivery

**Feature Branch**: `009-cloud-platform`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Cloud Platform & Delivery — The secure, low-cost, reproducible cloud foundation that every other capability runs on, and the one the operator/owner must stand up first. This feature provisions and governs the shared environment: the cloud project itself, the data-warehouse datasets the twin reads and writes, the event-streaming substrate the live replay and ingestion use, the identities and least-privilege access controls for services and the human operator, the secret storage for credentials (no secrets ever live in source), serverless hosting that scales to zero when idle to keep prototype cost near zero, and a cost budget with an alert so spend cannot silently run away. It also covers reproducible setup and delivery: a documented, copy-pasteable bootstrap (the exact steps/commands to create the project, enable required services, create the datasets, the event topic, service accounts and roles, secrets, and the budget), plus an automated path to deploy and update the application. The governing rules: least-privilege access everywhere, no secrets in source (a hard rule), honest cost control (scale-to-zero, a small prototype budget alert), and reproducibility so the whole environment can be recreated from the documented steps. The outcome: a one-time, well-documented setup that makes the environment secure, cheap, and reproducible, and unblocks every other feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reproducible one-time environment bootstrap (Priority: P1)

The owner/operator standing up the project for the first time needs an explicit, ordered, copy-pasteable setup checklist that takes them from an empty cloud account to a fully provisioned environment — the cloud project created, required services enabled, the data-warehouse datasets created, the event topic created, service accounts and their least-privilege roles created, secrets stored, and the budget with its alert set. Following the checklist top to bottom produces a working, governed environment without guesswork or tribal knowledge.

**Why this priority**: This is the single prerequisite that unblocks every other feature (001–008). Until the shared environment exists and is documented, no ingestion, physics, forecasting, economics, agent, or UI work can run. Delivered alone, it already turns "we need infrastructure" into a repeatable, auditable procedure the owner can execute by hand.

**Independent Test**: Starting from a clean cloud account, a person who has never seen the project follows only the documented checklist and ends with the project, all required services, all datasets, the event topic, all service accounts with their roles, all secrets, and the budget alert in place — verified by inspecting the environment against the checklist, with no undocumented manual step required.

**Acceptance Scenarios**:

1. **Given** an empty cloud account and the documented bootstrap checklist, **When** the owner executes the steps in order, **Then** the cloud project, enabled services, warehouse datasets, event topic, service accounts and roles, secrets, and budget alert all exist and match the checklist.
2. **Given** a fully provisioned environment, **When** it is torn down and the checklist is re-run from scratch, **Then** the recreated environment is equivalent to the original (same datasets, topic, identities, roles, secrets slots, budget) with no manual fix-ups.
3. **Given** the checklist, **When** a reviewer reads it end to end, **Then** every command needed to reach a working environment is present and copy-pasteable, and no step depends on knowledge that is not written down.

---

### User Story 2 - Secure-by-default access and secrets (Priority: P1)

Every service and the human operator must have only the access they need, and no credential may ever live in source. Each service identity is scoped to the minimum permissions for its job (for example, the physics service can write only to the simulation dataset; the read-only serving path can read only serving data); external credentials are held in the managed secret store and read at runtime; and uploaded or retrieved content that later features process is treated as untrusted input rather than trusted instructions.

**Why this priority**: Security is a hard governance gate for the project. A single over-privileged identity or a secret committed to source undermines the whole system's trustworthiness, so it must be built into the foundation rather than retrofitted. It shares P1 with the bootstrap because the environment is not "done" until it is also safe.

**Independent Test**: Inspect every service identity and confirm it holds only least-privilege roles scoped to the datasets/resources it needs; confirm the codebase contains no secret material and that credentials are resolved from the secret store at runtime; confirm a scan of the repository history surfaces zero secrets.

**Acceptance Scenarios**:

1. **Given** the provisioned identities, **When** an auditor reviews each service account's roles, **Then** each holds only the permissions required for its function and nothing broader (no project-wide owner/editor on service identities).
2. **Given** the application source and its history, **When** it is scanned for credentials, **Then** no secret (API key, password, token, connection string) is found anywhere in source or committed configuration.
3. **Given** a service that needs an external credential, **When** it runs, **Then** it obtains that credential from the managed secret store at runtime, never from a value baked into the code or image.
4. **Given** content that downstream features ingest or retrieve (uploaded documents, RAG passages), **When** the platform's access model is defined, **Then** that content is classified as untrusted input and is isolated from privileged actions.

---

### User Story 3 - Honest cost control: scale-to-zero and a budget alert (Priority: P1)

The owner running this as a prototype must keep spend near zero when idle and be warned before spend runs away. All hosted services scale to zero when not in use so an idle environment costs effectively nothing, and a small prototype budget is configured with an alert that notifies the owner as spend approaches the cap — so cost can never silently balloon.

**Why this priority**: Honest, low cost is an explicit project value and a practical constraint for a self-funded prototype. Without scale-to-zero and a budget alert, an idle demo could accrue meaningful charges unnoticed. This is foundational because every other feature deploys onto this cost posture.

**Independent Test**: Confirm each hosted service is configured to scale to zero and that an idle environment shows no running compute; confirm a budget with a defined threshold and an alert recipient exists; simulate/verify that crossing the alert threshold produces a notification to the owner.

**Acceptance Scenarios**:

1. **Given** no traffic to the environment, **When** it sits idle, **Then** hosted compute has scaled to zero and the idle cost is effectively zero.
2. **Given** the configured budget, **When** spend reaches the alert threshold, **Then** the owner receives a notification before the budget cap is reached.
3. **Given** the default model policy, **When** a new AI-backed capability is added, **Then** it defaults to the lower-cost model tier unless a written justification selects the higher tier.

---

### User Story 4 - Automated deploy and update path (Priority: P2)

Once the environment exists, the developer needs a repeatable, automated way to deploy the application and to ship updates — building the service image(s), publishing them, and rolling out the new version to the serverless hosting — without hand-run, error-prone steps. Redeploying the same version is safe and idempotent, and a failed rollout does not leave the environment in an undefined state.

**Why this priority**: The one-time bootstrap (P1) makes the environment exist; this makes delivering software onto it repeatable and low-risk. It follows the bootstrap because there is nothing to deploy onto until the environment is provisioned, but it is essential for every feature to reach a running state.

**Independent Test**: From a clean checkout against the provisioned environment, run the documented deploy path and confirm the application reaches a running, reachable state; run it again and confirm the redeploy is safe (no duplication or drift); confirm the same path applies an update to a new version.

**Acceptance Scenarios**:

1. **Given** a provisioned environment and the application source, **When** the developer runs the automated deploy path, **Then** the service(s) build, publish, and roll out to a running, reachable state.
2. **Given** a deployed application, **When** a new version is shipped through the same path, **Then** the running version updates to the new one with a clear record of what was deployed.
3. **Given** the deploy path, **When** it is run twice on the same version, **Then** the second run is idempotent and does not create duplicate or conflicting resources.

---

### Edge Cases

- **Partial bootstrap failure**: A step in the middle of the checklist fails (e.g. a service fails to enable or a dataset already exists). The checklist must be safe to re-run from the top or resumable, so the operator can recover without deleting everything and starting over.
- **Pre-existing resource collision**: A dataset, topic, identity, or secret slot already exists from a prior attempt. Re-running the bootstrap must not error out destructively or silently overwrite in-use data; it must be clearly idempotent or guard against clobbering.
- **Budget alert reaches the owner but is ignored**: The alert is a notification, not a hard stop; the spec must be explicit that the prototype relies on the alert plus scale-to-zero, and that a hard spend cap (if any) is called out as such so the owner is not surprised by either a bill or a shutdown.
- **Missing or unset secret at runtime**: A service starts but its required secret slot is empty or unreadable. The platform must fail fast with a clear signal rather than run with a blank credential or fall back to an insecure default.
- **Over-broad role requested by a later feature**: A downstream feature needs access it was not scoped for. The model must require an explicit, least-privilege grant scoped to the needed resource rather than widening an existing identity to a broad role.
- **Region drift**: A resource is accidentally created in the wrong region. The environment must standardize on the single project region so data and compute stay co-located and low-cost.
- **Untrusted content reaching a privileged path**: Uploaded/retrieved content must not be able to trigger privileged actions; the access model must keep such content isolated from identities that can write or invoke sensitive resources.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST provision a single dedicated cloud project as the isolation and billing boundary for the twin, standardized on one project region for all resources.
- **FR-002**: The platform MUST enable exactly the set of managed cloud services the twin depends on (data warehouse, event streaming, serverless container hosting, container image registry, build/deploy, secret storage, object storage, and observability/logging), and no broader set than needed.
- **FR-003**: The platform MUST create the data-warehouse datasets the twin reads and writes, separated by role (e.g. raw, curated, serving, simulation, forecasts, embeddings) so that access can be scoped per dataset.
- **FR-004**: The platform MUST create the event-streaming topic that the live-replay and ingestion path publishes to, so that the historical-replay harness and a future live source feed the same downstream path without change.
- **FR-005**: The platform MUST create a distinct service identity for each service (physics engine, serving API, agent, transforms) and grant each only the least-privilege roles it needs, scoped to the specific datasets/resources it uses — no service identity may hold project-wide administrative roles.
- **FR-006**: The platform MUST define least-privilege access for the human operator/owner, granting the roles needed to run and inspect the environment without defaulting to unrestricted ownership for day-to-day operation.
- **FR-007**: The platform MUST provide a managed secret store for all external credentials, and every service MUST read its credentials from that store at runtime.
- **FR-008 (HARD GATE — no secrets in source)**: No secret (API key, password, token, connection string, or private key) may appear anywhere in source code, committed configuration, or a built image; secrets exist only in the managed secret store.
- **FR-009**: The platform MUST host application services on serverless hosting configured to scale to zero when idle, so an unused environment incurs effectively no compute cost.
- **FR-010**: The platform MUST configure a small prototype spending budget with an alert threshold that notifies the owner before the budget cap is reached, so spend cannot silently run away.
- **FR-011**: The platform MUST default new AI-backed capabilities to the lower-cost model tier, requiring a written justification for any use of a higher-cost tier.
- **FR-012**: The platform MUST deliver an explicit, ordered, copy-pasteable bootstrap checklist that provisions the entire environment — create project, enable services, create warehouse datasets, create event topic, create service accounts and least-privilege roles, store secrets, and set the budget and its alert — such that following it from an empty account yields a working, governed environment with no undocumented manual step.
- **FR-013**: The bootstrap checklist MUST be safe to re-run — idempotent or resumable — so that a partial failure or a pre-existing resource does not force a destructive teardown and does not silently overwrite in-use data.
- **FR-014**: The platform MUST provide an automated deploy-and-update path that builds, publishes, and rolls out the application service(s) to the serverless hosting, and that applies subsequent version updates through the same path.
- **FR-015**: The automated deploy path MUST be idempotent — re-running it on the same version does not create duplicate or conflicting resources — and a failed rollout MUST NOT leave the environment in an undefined state.
- **FR-016**: The platform MUST be recreatable from its documented steps, so that tearing the environment down and re-running the bootstrap yields an equivalent environment (same datasets, topic, identities and roles, secret slots, and budget alert).
- **FR-017**: Services that require a secret MUST fail fast with a clear signal when a required secret is missing or unreadable, rather than running with a blank credential or an insecure default.
- **FR-018**: The access model MUST treat content that downstream features ingest or retrieve (uploaded documents, retrieved passages) as untrusted input, isolated from identities that can write to or invoke privileged resources.
- **FR-019**: The platform MUST provide observability (structured logs and basic operational metrics/alerts) for the hosted services so the owner can see failures and health without adding per-feature plumbing.
- **FR-020**: The platform MUST document its cost posture honestly — stating that idle cost is near zero via scale-to-zero, that the budget alert is a notification (and whether any hard cap exists), and the expected prototype spend range — so the owner is not surprised by either a bill or a shutdown.

### Key Entities *(include if feature involves data)*

- **Cloud Project**: The single dedicated project that is the isolation, identity, and billing boundary for the entire twin; pinned to one region.
- **Managed Service Set**: The specific enabled cloud services the twin depends on (data warehouse, event streaming, serverless hosting, image registry, build/deploy, secret store, object storage, observability) — deliberately minimal.
- **Warehouse Dataset**: A role-scoped dataset the twin reads or writes (raw, curated, serving, simulation, forecasts, embeddings); the unit at which data access is granted.
- **Event Topic**: The streaming channel the replay/ingestion path publishes to; the seam that lets a live source later replace the replay harness without downstream change.
- **Service Identity**: A per-service identity carrying only the least-privilege roles that service needs; the basis for scoped, auditable access.
- **Operator Access Grant**: The least-privilege role set for the human owner to operate and inspect the environment.
- **Secret**: An external credential held only in the managed secret store and read at runtime; never present in source.
- **Budget & Alert**: The prototype spending limit and the notification threshold that warns the owner before the cap.
- **Bootstrap Checklist**: The ordered, copy-pasteable procedure that provisions the whole environment and can be re-run to recreate it.
- **Deploy Path**: The automated build/publish/rollout procedure that ships the application and its updates onto the serverless hosting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Starting from an empty cloud account, an operator recreates the entire environment (project, services, datasets, event topic, service identities and roles, secret slots, budget alert) using only the documented bootstrap checklist, with zero undocumented manual steps.
- **SC-002**: 100% of service identities hold only least-privilege roles scoped to the resources they use; zero service identities hold project-wide administrative/owner roles.
- **SC-003**: A scan of the source repository and its history finds zero secrets; every service resolves its credentials from the secret store at runtime.
- **SC-004**: With no traffic, the environment's hosted compute scales to zero and idle compute cost is effectively zero.
- **SC-005**: A budget alert exists and fires a notification to the owner when spend crosses the configured threshold, verified before any hard cap is reached.
- **SC-006**: The automated deploy path takes the application from a clean checkout to a running, reachable state, and a second run on the same version is idempotent (no duplicate or conflicting resources).
- **SC-007**: An update shipped through the same deploy path replaces the running version with a clear record of what was deployed.
- **SC-008**: Tearing down and re-running the bootstrap yields an environment equivalent to the original (same datasets, topic, identities and roles, secret slots, budget alert), demonstrating reproducibility.
- **SC-009**: A service started with a missing or unreadable required secret fails fast with a clear signal rather than running with a blank or default credential.
- **SC-010**: All Features 001–008 can be deployed onto the provisioned environment using its datasets, event topic, identities, secrets, and deploy path, with no additional undocumented environment setup required.

## Assumptions

- **Cloud provider and region**: The platform is Google Cloud Platform, region `us-central1` (single region for all resources), per docs/05-gcp-infrastructure.md and the constitution's Engineering Constraints.
- **Concrete service mapping** (product names deferred out of the requirements by design): data warehouse = **BigQuery** (datasets `ro_raw`, `ro_curated`, `ro_serving`, `ro_simulation`, `ro_forecasts`, `ro_embeddings`); event streaming = **Pub/Sub** (topic `ro-readings`/`ro-readings` equivalent); serverless hosting = **Cloud Run** (min instances 0 / scale-to-zero); image registry = **Artifact Registry**; build/deploy = **Cloud Build** (and/or `gcloud`/`bq`, optionally Terraform); secret store = **Secret Manager**; identities/roles = **IAM** service accounts; budget = **Cloud Billing budgets**; observability = **Cloud Logging / Monitoring / Trace**.
- **Bootstrap format**: The deliverable checklist is a documented, copy-pasteable sequence of `gcloud`/`bq` (and optionally Terraform/Dataform) commands, consistent with docs/05; whether it is imperative commands, infrastructure-as-code, or a mix is a planning decision, but the outcome (reproducible from documented steps) is fixed here.
- **Budget threshold**: Prototype budget alert at ~$50/month with an earlier warning tier (e.g. an alert at a lower fraction), matching docs/05 and the constitution; the exact numbers are strong defaults, adjustable in planning.
- **Default model tier**: Gemini Flash is the default lower-cost tier; Gemini Pro is used only with written justification (constitution Principle-aligned; docs/05 cost controls).
- **Scale-to-zero is acceptable for the prototype**: Cold-start latency from min-instances-0 is an accepted trade-off for near-zero idle cost at prototype scale; keeping a warm instance is an explicit, later, cost-justified decision.
- **Single environment for the prototype**: One environment (e.g. `dev`) is sufficient for the prototype; multi-environment promotion (dev→staging→prod) is out of scope for this feature and deferred.
- **Owner performs the one-time setup manually**: The human owner runs the bootstrap by hand (the checklist is written for a person), while the application deploy/update path is automated. This split is intentional.
- **Free-trial credit may apply**: Prototype spend may be $0 under GCP free-trial credit; the budget alert is still configured so real spend cannot run away after credit is exhausted.
- **Live-ready architecture (Principle VI)**: The event topic is created so the replay harness and a future live SCADA/MQTT source publish to the same channel; standing up that topic here (even before a live source exists) is deliberate.

## Dependencies

- **No upstream feature dependency**: This is the first feature to stand up. It has no prerequisite among the project's features.
- **Prerequisite for Features 001–008**: This feature is the prerequisite that unblocks every other feature — 001 Data Foundation, 002 Live Replay, 003 Physics Deviation, 004 Forecast & Anomaly, 005 Fouling Validation, 006 Economics Model, 007 AI Assistant, and 008 Visual Twin UI each depend on "a provisioned GCP environment" (project, datasets, event topic, identities, secrets, hosting, deploy path) delivered here. It MUST be provisioned before any of them can deploy or run.
- **External account & billing**: Requires a Google Cloud account with billing enabled and sufficient permission to create a project, enable services, and configure IAM, budgets, and Secret Manager.
- **Tooling**: Requires the cloud CLIs used by the bootstrap and deploy path (`gcloud`, `bq`, and optionally Terraform/Dataform), available to the owner/developer performing setup.
- **Grounding docs**: docs/05-gcp-infrastructure.md (services, datasets, IAM, Cloud Run, cost, secrets, observability) and docs/00-overview.md (architecture, decisions) are the authoritative source for concrete product choices; this spec stays capability-level and defers SKUs to those docs and to planning.
