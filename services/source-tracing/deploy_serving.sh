#!/usr/bin/env bash
# Publish the source-tracing backend outputs (specs 003–007) to the BigQuery serving layer
# so the frontend / other consumers can read them on GCP. Idempotent (--replace).
#
# Prereq: run_all.py has produced data/*.csv, and `bq` is authenticated with write access
# to the ro_serving dataset (verified: Data-Editor on spatial-cat-489006-a4).
set -euo pipefail

PROJECT="${GCP_PROJECT:-spatial-cat-489006-a4}"
DATASET="ro_serving"
HERE="$(cd "$(dirname "$0")" && pwd)"

load() {  # load <table> <csv>
  local table="$1" csv="$2"
  echo "→ ${DATASET}.${table}  <-  ${csv}"
  bq --project_id="$PROJECT" load --autodetect --source_format=CSV --replace \
     --skip_leading_rows=1 "${DATASET}.${table}" "${HERE}/data/${csv}"
}

load st_deviations   deviations.csv     # 003 confound-free deviation per reading
load st_forecasts    forecasts.csv      # 004 days-to-clean + anomalies
load st_attributions attributions.csv   # 005 mechanism source-attribution
load st_economics    economics.csv      # 006 clean-now-vs-wait economics

echo "✅ published to ${PROJECT}:${DATASET} (st_* tables). Query e.g.:"
echo "   bq query --nouse_legacy_sql 'SELECT * FROM \`${PROJECT}.${DATASET}.st_forecasts\` ORDER BY days_to_clean LIMIT 10'"
