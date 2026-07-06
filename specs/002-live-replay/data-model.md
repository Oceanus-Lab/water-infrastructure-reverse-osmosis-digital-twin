# Data Model: 002-live-replay

## 1. Simulation Clock
- **Fields:**
  - `current_simulation_date` (Date/Timestamp)
  - `run_state` (Enum: PLAYING, PAUSED)
  - `speed_multiplier` (Float: simulated time per unit of wall-clock time)
- **Relationships:** Defines the "now" for all Consumers and Current State views.
- **State Transitions:**
  - `PAUSED` -> `PLAYING` (upon Play action)
  - `PLAYING` -> `PAUSED` (upon Pause action)

## 2. Reading Event
- **Fields:**
  - `unit_id` (String)
  - `reading_date` (Date)
  - `metrics` (Map of float values, e.g., pressure, recovery, temperature)
- **Validation:** 
  - Emitted strictly in chronological order by `reading_date`.
- **Relationships:** Derived from harmonized history, published to Source Connector (Pub/Sub).

## 3. Current State (as-of-clock)
- **Fields:**
  - `clock_date` (Date)
  - `latest_readings` (Map of `unit_id` -> Reading Event)
  - `recent_trends` (Map of `unit_id` -> Trend Data)
  - `is_historical_replay` (Boolean: Always TRUE for this feature)
- **Validation:**
  - Exposes latest reading per unit *at or before* the `clock_date`.
  - Missing units represented explicitly as not-yet-reporting.

## 4. Replay Controls
- **Fields/Actions:**
  - `play()`
  - `pause()`
  - `jump_to_date(target_date)`
  - `set_speed(multiplier)`

## 5. Source Connector
- **Fields:**
  - `topic_name` (String, e.g., `ro-readings`)
- **Validation:** Pluggable. The replay harness acts as the historical connector. A real plant feed can replace it without changing the downstream schema.
