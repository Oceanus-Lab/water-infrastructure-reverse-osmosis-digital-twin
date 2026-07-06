# Feature Specification: Deployment & API Safety

**Feature Branch**: `011-deployment`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "I'd like you to prepare deploying this, prepare a spec that's needed to deploy (this hackathon project, no need for 100% security, just make sure my api is safe). use relevant skills like /adk-deploy-guide /bigquery-ai-ml /gemini-agents-api"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Judges and reviewers can open one URL and use the full demo (Priority: P1)

A hackathon judge or reviewer, with no local setup, opens a single public link and sees the
2.5D digital twin: fleet health, the replay clock moving through the OCWD history, unit
inspection detail, and the AI assistant chat — able to ask a question, get an evidence-backed
answer, and see (without necessarily using) the approve/dismiss flow for a proposed record.
Nothing in the demo requires the reviewer to have credentials, a VPN, or local environment
setup.

**Why this priority**: This is the entire point of "deploying this" — without a reachable,
working demo, every other feature built so far (001–010) is invisible to a judge. It is the
single P1 that makes the hackathon submission demonstrable at all.

**Independent Test**: From a machine that has never touched this project, open the public
frontend URL and, without any setup step, view fleet status, scrub the replay timeline, open a
unit inspection, and get a streamed answer from the assistant to a plain-language question.

**Acceptance Scenarios**:

1. **Given** the deployed environment, **When** a reviewer opens the public frontend URL,
   **Then** the digital twin loads and shows fleet health, timeline, and inspection views
   backed by real deployed data (not local mocks).
2. **Given** the loaded twin, **When** the reviewer types a question into the assistant chat,
   **Then** a streamed, evidence-backed answer appears within a reasonable wait (see Success
   Criteria) without any error requiring a developer to intervene.
3. **Given** the assistant proposes a record (e.g., a recommended action), **When** the
   reviewer clicks approve or dismiss, **Then** the system responds with a clear outcome and
   the interaction completes without a crash or hang.
4. **Given** the deployed environment, **When** it is reached from a browser with no prior
   relationship to the project (new session, no cookies), **Then** it works exactly as it does
   for the developer's own browser — no hidden allowlist or local-only dependency.

---

### User Story 2 - The public API surface can't be abused or run up cost (Priority: P1)

Because the demo is reachable by anyone with the link, the owner needs the exposed API
surface (the serving API and the assistant's chat/approve/dismiss endpoints) to resist casual
abuse: it should not be possible for an anonymous script to hammer the assistant into running
up the owner's AI/BigQuery bill, to write approved records without a human having gone through
the chat flow, or to pull credentials/secrets out of a response. This is a "safe enough for a
public hackathon demo" bar, not enterprise-grade security — the owner explicitly does not need
full authentication, RBAC, or a security audit for this feature.

**Why this priority**: A public, credential-free demo (User Story 1) is only viable if it
can't be turned into an open cost/abuse vector the moment the link is shared. This shares P1
because an undeployed system is invisible, but an unsafely-deployed one is worse — it can
generate real cost or embarrassment before anyone notices.

**Independent Test**: From an external machine, send a burst of rapid requests to the public
API endpoints and confirm the system throttles/limits rather than processing unbounded calls;
attempt to call a write endpoint (approve/record) directly without going through the chat flow
and confirm it is rejected or clearly constrained; inspect API responses and deployed
configuration for any leaked credential, key, or internal-only value.

**Acceptance Scenarios**:

1. **Given** the public API, **When** an anonymous client sends requests far above normal
   single-user chat volume in a short window, **Then** the system limits or rejects the excess
   requests rather than passing all of them through to the paid AI/data backend.
2. **Given** the public API, **When** a request is made to a write-capable endpoint
   (approve/record) from an origin other than the deployed frontend, **Then** the request is
   rejected or otherwise fails to produce a written record.
3. **Given** any public API response or client-visible configuration, **When** it is
   inspected, **Then** it contains no secret, API key, or credential value.
4. **Given** the deployed services, **When** their runtime configuration is reviewed, **Then**
   every credential (project IDs are not secrets, but any API key, token, or connection
   string) is resolved from the managed secret store or environment at deploy time, never
   present in source or client-shipped code.

---

### User Story 3 - One documented, repeatable path deploys and updates every service (Priority: P2)

The owner needs a single documented sequence that takes each application service (the
serving API, the AI assistant, and the frontend) from source code to a running, reachable
instance on the already-bootstrapped cloud platform (spec 009), and that same sequence safely
re-applies to ship an update — without hand-editing infrastructure or guessing at flags.

**Why this priority**: Speed matters for a hackathon timeline. This follows the P1s because
there's no point automating a deploy path until the target shape (what's public, what's
protected) is decided, but a repeatable path is what lets the owner actually ship before the
deadline and fix issues under time pressure.

**Independent Test**: From a clean checkout, run the documented deploy sequence for each
service and confirm each reaches a running, reachable state; change one file, re-run the same
sequence, and confirm the update rolls out without manual cleanup or duplicate resources.

**Acceptance Scenarios**:

1. **Given** the bootstrapped platform from spec 009, **When** the owner follows the
   documented steps for the serving API, the assistant, and the frontend, **Then** each is
   reachable at a stable URL and serving real (not mock) data end to end.
2. **Given** a deployed service, **When** the owner ships a code change through the same
   documented path, **Then** the running service updates with no orphaned or duplicated
   resources left behind.
3. **Given** the three services, **When** their URLs are wired together (frontend →
   serving API, frontend → assistant), **Then** each points at the deployed instance of its
   dependency, not a `localhost` address.

---

### User Story 4 - The demo stays cheap when nobody is looking at it (Priority: P3)

Outside of active demo/review windows, the deployed services should scale down to
effectively zero cost, consistent with the budget guardrail already established in spec 009,
rather than the hackathon deployment silently adding new always-on spend.

**Why this priority**: Lowest priority because it doesn't block demonstrability or safety, but
it protects the existing "honest cost control" commitment (spec 009) from being undone by this
feature's new services.

**Independent Test**: Leave the deployed environment idle for an extended period and confirm
no compute keeps running and no cost accrues beyond storage/idle minimums; confirm the
existing project budget alert (spec 009) still covers the new services.

**Acceptance Scenarios**:

1. **Given** no active traffic, **When** the deployed services sit idle, **Then** their
   compute scales to zero.
2. **Given** the project's existing budget alert, **When** the new services are deployed,
   **Then** their spend is covered by the same budget and alert threshold — no new,
   unmonitored spend category is introduced.

---

### Edge Cases

- **Assistant/agent cost spike**: A reviewer (or a bot) sends many chat messages in quick
  succession. The system must degrade gracefully (limit/queue/reject) rather than letting
  every message reach the paid model and database backend uncontrolled.
- **Replay clock during a live demo**: The historical replay is a clock-driven simulation, not
  a live feed (constitution VI). The deployment must make clear, even to a first-time viewer,
  that "now" means "as of the replay clock," not a real-time plant connection.
- **Partial deploy failure**: One service (e.g., the assistant) fails to deploy or update
  while the others succeed. The frontend must fail visibly and gracefully for the affected
  feature rather than showing a silent blank or crashing the whole twin.
- **Direct API access bypassing the UI**: Someone calls the serving API or the assistant's
  endpoints directly (via curl/script) instead of through the frontend. The system's abuse
  limits must hold regardless of which client is calling.
- **Stale deployed data**: The demo is reachable after the owner's local data pipeline has
  moved on. The deployed environment must serve a clearly labeled, internally consistent
  snapshot rather than mixing old and new data silently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST make the frontend (digital twin UI), the serving API, and the
  AI assistant each reachable at a stable public URL without requiring reviewer credentials,
  a VPN, or local setup.
- **FR-002**: The system MUST serve the frontend from deployed data sources (serving API /
  BigQuery-backed) rather than the local mock generators used in development.
- **FR-003**: The system MUST limit the rate of requests any single client can make to the
  assistant chat endpoint and to the serving API, so that no anonymous client can drive
  unbounded calls to the paid AI model or BigQuery backend.
- **FR-004**: The system MUST reject or otherwise fail to persist a write (approve/record)
  request that does not originate from the deployed frontend's expected flow.
- **FR-005**: The system MUST NOT expose any secret, API key, credential, or internal-only
  configuration value in a client-visible response, client-shipped code, or public
  repository/image layer.
- **FR-006**: The system MUST resolve every credential each deployed service needs from the
  managed secret store or deploy-time environment configuration, never from a value committed
  to source (carried over from the existing no-secrets-in-source hard gate).
- **FR-007**: The system MUST cap the maximum number of concurrently running instances of
  each deployed service, so a burst of traffic (or abuse) has a known upper bound on cost
  rather than scaling without limit.
- **FR-008**: The system MUST provide a single, documented, repeatable sequence to deploy and
  to update each of the three application services (serving API, assistant, frontend) onto
  the already-provisioned cloud platform (spec 009), and re-running it MUST NOT create
  duplicate or conflicting deployed resources.
- **FR-009**: The deployed frontend MUST visibly label the data as historical replay (per the
  existing replay-clock labeling in the running application) so no viewer is misled into
  believing it is a live plant connection.
- **FR-010**: The system MUST scale each deployed application service to zero (or its
  practical minimum) when idle, and any spend it produces MUST be covered by the existing
  project budget alert from spec 009 rather than an unmonitored new spend category.
- **FR-011**: If any one of the three services fails to deploy, update, or respond, the
  frontend MUST present a clear, visible failure for the affected capability rather than a
  silent blank state or an unrelated crash.
- **FR-012**: The system MUST restrict which web origins may call the serving API and
  assistant endpoints to the deployed frontend's own origin (rather than allowing any
  origin), consistent with treating this as a public-but-not-open surface.

### Key Entities

- **Deployed Service**: One of the three application services this feature stands up
  (serving API, AI assistant, frontend). Attributes: stable public URL, current
  version/revision, scaling bounds (min/max instances), and the upstream dependency URLs it
  points at.
- **Rate/Abuse Limit**: A per-client (e.g., per-IP or per-session) ceiling on request
  volume to a public endpoint over a time window, applied to the assistant chat endpoint and
  the serving API.
- **Deploy Record**: The outcome of running the documented deploy/update sequence for a
  service — which version was deployed, when, and whether it succeeded — used to confirm
  idempotent re-runs and to support rollback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer with no prior setup can go from opening the public URL to seeing a
  streamed assistant answer to a real question in under 60 seconds of active interaction.
- **SC-002**: 100% of the demo's primary views (fleet health, timeline, unit inspection,
  assistant chat, approve/dismiss) work end to end against deployed (non-mock) data.
- **SC-003**: A burst of at least 50 requests in one minute from a single anonymous client
  against the public API results in the excess being limited/rejected rather than all being
  processed by the paid backend.
- **SC-004**: Zero secrets, API keys, or credentials are found when the deployed services'
  public responses, client-shipped code, and container images are inspected.
- **SC-005**: An idle deployed environment (no traffic for a full day) accrues no meaningful
  compute cost beyond the project's existing prototype budget baseline from spec 009.
- **SC-006**: Re-running the documented deploy sequence a second time on an unchanged
  version produces no duplicate or conflicting resource, and updating one file and re-running
  it ships the change without manual cleanup.

## Assumptions

- Deployment targets the already-bootstrapped GCP project and platform from spec 009
  (`spatial-cat-489006-a4`, region `us-central1`, Cloud Run, existing budget alert) — this
  feature does not re-provision the platform, only deploys the application services onto it.
- "Safe" for this feature means resistant to casual/anonymous abuse and free of leaked
  secrets — not full authentication, authorization, or a formal security audit, per the
  hackathon scope stated in the input.
- The serving API and frontend deploy to Cloud Run (consistent with the existing
  `infra/scripts/deploy_service.sh` path proven in spec 009); the AI assistant deploys via
  the Gemini Enterprise Agent Platform Managed Agents API (consistent with the existing
  `services/agent/provision.sh` / `deploy.sh` scripts), not a from-scratch ADK Cloud Run
  deployment.
- The replay harness (`services/replay/`) is treated as a data-generation/backfill tool run
  as needed to populate BigQuery, not a standing public-facing service for this feature —
  the public demo reads the data it has already produced rather than requiring it to run
  continuously in production.
- Reviewer traffic during demo/judging is low-volume and short-lived (a handful of people
  over a few hours), so "safe" rate limits are sized to block scripted abuse while leaving
  normal interactive use unaffected.
- No new user-account or login system is introduced; the public frontend remains anonymous
  and read-mostly, with the existing approve/dismiss chip as the only write trigger, gated by
  origin restriction (FR-004/FR-012) rather than a login.
- Existing governance hard gates (no actuation, no bare numbers, human-approval-gated writes)
  remain unchanged by this feature; this spec only adds the deployment and public-safety layer
  around them.
