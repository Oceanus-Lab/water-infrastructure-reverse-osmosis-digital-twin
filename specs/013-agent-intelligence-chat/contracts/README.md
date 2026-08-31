# Interface Contracts: 013-agent-intelligence-chat

## 1. Streaming Assistant API Contract

### `POST /api/agent/stream`
* **Protocol**: HTTP/1.1 Server-Sent Events (SSE)
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "question": "Why is unit B03 degrading faster than the clean baseline?",
    "sessionId": "sess-12345",
    "selectedUnit": "B03"
  }
  ```

* **Event Stream Formats**:
  1. **Thinking / Status Event**:
     ```json
     event: thinking
     data: {
       "specialist": "dataAnalyst",
       "status": "running",
       "summary": "Querying BigQuery physics deviation baseline for Unit B03..."
     }
     ```

  2. **Reflexion Critic Event**:
     ```json
     event: reflexion
     data: {
       "status": "passed",
       "verifiedMetricsCount": 3,
       "provenanceChecked": true
     }
     ```

  3. **Embedded Artifact Event**:
     ```json
     event: artifact
     data: {
       "type": "sparkline",
       "unitId": "B03",
       "metric": "normalized_dp",
       "measuredData": [{"date": "2021-01-01", "value": 5.26}],
       "baselineData": [{"date": "2021-01-01", "value": 4.50}]
     }
     ```

  4. **Token Content Event**:
     ```json
     data: {"text": "Unit B03 has exceeded its clean-membrane baseline by +0.76 bar..."}
     ```

---

## 2. Operator Feedback API Contract

### `POST /api/agent/feedback`
* **Request Body**:
  ```json
  {
    "traceId": "trace-98765",
    "rating": "thumbs_up",
    "reasonTag": "accurate_physics",
    "comment": "Exact baseline match for B03."
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "status": "recorded",
    "traceId": "trace-98765"
  }
  ```

---

## 3. Human-In-The-Loop Proposal Approval Contract

### `POST /api/agent/approve`
* **Request Body**:
  ```json
  {
    "proposalId": "prop-b03-clean-20210113",
    "unitId": "B03",
    "action": "CLEAN_NOW",
    "operatorId": "operator-alice",
    "assumedCipCost": 5000,
    "assumedElectricity": 0.08
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "decisionId": "dec-9012",
    "status": "COMMITTED_TO_AUDIT_LOG",
    "recordedAt": "2026-08-31T17:30:00Z"
  }
  ```
