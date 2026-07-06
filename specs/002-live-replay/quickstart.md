# Quickstart: 002-live-replay Validation

This guide documents how to run and validate the Live Replay Harness.

## Prerequisites
- Python 3.11+
- `google-cloud-pubsub` and `pandas` installed
- GCP Project configured and authenticated via `gcloud auth application-default login`
- The Pub/Sub topic `ro-readings` created.

## 1. Start the Replay Harness
Run the harness in "demo" mode, focusing on Bank F for the vertical slice:
```bash
python services/replay/harness.py --bank F --speed 1.0
```
*Expected Output:* The console should log the simulation clock advancing, emitting readings strictly in chronological order for Bank F units.

## 2. Pause and Jump Validation
Use the interactive controls (if CLI) or the API to jump to a specific date:
```bash
python services/replay/controller.py --jump-to "2020-05-15"
```
*Expected Output:* The harness stops emitting readings prior to May 15, and the next emitted event aligns exactly with the new date.

## 3. Current State Verification
Query the BigQuery materialized view (or current-state endpoint):
```sql
SELECT unit_id, reading_date, status 
FROM `ro_curated.current_state`
WHERE bank = 'F'
```
*Expected Output:* Exactly one row per unit representing the latest reading at or before the simulation clock.

## 4. Consumer Honesty Check
Verify that the consuming API includes the historical replay label:
```bash
curl http://localhost:8080/api/fleet/current-state
```
*Expected Output:* Response includes `"is_historical_replay": true` and `"simulation_clock": "2020-05-15"`.
