# Research & Decisions: 002-live-replay

## 1. Event Streaming Substrate
- **Decision:** Google Cloud Pub/Sub
- **Rationale:** The architecture strictly mandates GCP (us-central1) and standard event-streaming into an analytics store. Pub/Sub is the native GCP event bus.
- **Alternatives considered:** Kafka (too operationally heavy for this prototype), Redis Streams (does not natively sink to BigQuery as easily as Pub/Sub).

## 2. Current State Store
- **Decision:** BigQuery Materialized Views (via BigQuery Subscriptions from Pub/Sub) or direct BigQuery insertions if using a simple Python consumer script.
- **Rationale:** The constitution demands "BigQuery-as-AI-Compute". Replicating data to a separate operational DB violates the "In-Place First" principle. BigQuery will serve as the current state store.
- **Alternatives considered:** Cloud SQL, Firestore. Rejected due to Principle I (BigQuery-as-AI-Compute).

## 3. Clock Implementation
- **Decision:** Python `asyncio` based replay harness.
- **Rationale:** Needs to support jumping, pausing, and variable speed (e.g., 1 simulated day per second). A Python orchestrator can easily load the harmonized CSV/BigQuery history and emit messages to Pub/Sub honoring a variable simulated clock.

## 4. Runtime & Dependencies
- **Decision:** Python 3.11, `google-cloud-pubsub`, `pandas`.
- **Rationale:** Python 3.11 is a hard constraint (AGENTS.md). `pandas` handles the harmonized history efficiently.
