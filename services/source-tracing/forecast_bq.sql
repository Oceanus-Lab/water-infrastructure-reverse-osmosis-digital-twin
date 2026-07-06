-- Spec 004 — Forecasting & Anomaly Detection, BigQuery-native (architecture-aligned).
--
-- AGENTS.md architecture principle: "BigQuery is both storage AND the primary AI compute
-- layer. Forecasting, anomaly detection ... happen in SQL, in-place (AI.FORECAST,
-- AI.DETECT_ANOMALIES). Don't introduce custom ML pipelines where a BQ SQL function suffices."
--
-- This is the production path for 004. Both queries below were verified to run on the real
-- ro_curated.unit_readings (TimesFM foundation model, no training). forecast_anomaly.py is the
-- offline-prototype twin (runs without BigQuery); this SQL is the architecture-correct version.
-- Ref: google/skills bigquery-ai-ml (AI.FORECAST, AI.DETECT_ANOMALIES).

-- ── 1. FORECAST the normalized-ΔP fouling signal (per unit) ────────────────────────────────
-- 10-day-ahead projection with a 90% prediction interval, using the pre-trained TimesFM model.
SELECT
  forecast_timestamp,
  ROUND(forecast_value, 2)                    AS ndp_forecast,
  ROUND(prediction_interval_lower_bound, 2)   AS lo_90,
  ROUND(prediction_interval_upper_bound, 2)   AS hi_90
FROM
  AI.FORECAST(
    (SELECT TIMESTAMP(reading_date) AS ts, unit_n_delta_p AS y
     FROM `spatial-cat-489006-a4.ro_curated.unit_readings`
     WHERE unit_id = 'D02'            -- parameterize per unit (loop / stored-proc in production)
       AND unit_n_delta_p IS NOT NULL),
    data_col       => 'y',
    timestamp_col  => 'ts',
    horizon        => 10,
    confidence_level => 0.9
  );

-- ── 2. DETECT ANOMALIES in the fouling signal (per unit) ───────────────────────────────────
-- Flags readings whose value deviates from the TimesFM expectation above anomaly_prob_threshold.
SELECT
  time_series_timestamp AS ts,
  ROUND(time_series_data, 2) AS ndp,
  is_anomaly,
  ROUND(anomaly_probability, 3) AS anomaly_p,
  ROUND(lower_bound, 2) AS lo,
  ROUND(upper_bound, 2) AS hi
FROM
  AI.DETECT_ANOMALIES(
    (SELECT TIMESTAMP(reading_date) AS ts, unit_n_delta_p AS y
     FROM `spatial-cat-489006-a4.ro_curated.unit_readings`
     WHERE unit_id = 'D02'
       AND unit_n_delta_p IS NOT NULL),
    data_col              => 'y',
    timestamp_col         => 'ts',
    anomaly_prob_threshold => 0.9,
    last_n_points         => 90       -- required: analyze the most recent 90 points
  )
WHERE is_anomaly = TRUE
ORDER BY ts DESC;
