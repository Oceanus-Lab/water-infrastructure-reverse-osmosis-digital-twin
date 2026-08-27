#!/usr/bin/env bash
# Deploy ro-serving-api to Cloud Run.
#
# Cloud Run's build context is THIS directory only — its sibling ../source-tracing is not
# uploaded. Two things therefore have to be staged here first, and both have already caused a
# deployed service to fail in a way that looked like working software:
#
#   data/     the CSV outputs. Missing them made every endpoint return null/empty while
#             /api/timeline still answered with a plausible date range.
#   _lib/     the 003-006 modules main.py imports for its as-of-date evaluation. Missing them
#             is a 500 on /api/fleet with ModuleNotFoundError: No module named
#             'forecast_anomaly'.
#
# Staging them by hand is exactly how they get forgotten, so this script owns it.
#
#   ./deploy.sh                      # deploy to $PROJECT_ID
#   PROJECT_ID=my-proj ./deploy.sh
#   ./deploy.sh -- --no-allow-unauthenticated

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_TRACING="$(cd "${HERE}/../source-tracing" && pwd)"

PROJECT_ID="${PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-spatial-cat-489006-a4}}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-ro-serving-api}"

EXTRA_FLAGS=(--allow-unauthenticated)
if [[ "${1:-}" == "--" ]]; then
  shift
  EXTRA_FLAGS=("$@")
fi

# Modules main.py imports at request time. Keep in sync with the imports in main.py.
LIB_MODULES=(common.py forecast_anomaly.py economics.py physics.py)

echo "==> Staging data/ and _lib/ from ${SOURCE_TRACING}"
rm -rf "${HERE}/data" "${HERE}/_lib"
mkdir -p "${HERE}/data" "${HERE}/_lib"

shopt -s nullglob
outputs=("${SOURCE_TRACING}"/data/*.csv "${SOURCE_TRACING}"/data/validation_report.json)
shopt -u nullglob
if [[ ${#outputs[@]} -eq 0 ]]; then
  echo "Error: no pipeline outputs in ${SOURCE_TRACING}/data — run 'python run_all.py' first." >&2
  exit 1
fi
cp "${outputs[@]}" "${HERE}/data/"

for m in "${LIB_MODULES[@]}"; do
  if [[ ! -f "${SOURCE_TRACING}/${m}" ]]; then
    echo "Error: ${SOURCE_TRACING}/${m} not found." >&2
    exit 1
  fi
  cp "${SOURCE_TRACING}/${m}" "${HERE}/_lib/"
done

echo "    data/: $(ls -1 "${HERE}/data" | wc -l | tr -d ' ') files, _lib/: ${LIB_MODULES[*]}"

# Fail before a 5-minute build rather than after it.
echo "==> Import check"
(cd "${HERE}" && PYTHONPATH="${HERE}/_lib" python3 -c "
import common, forecast_anomaly, economics, physics
print('    modules import cleanly')
") || { echo "Error: staged modules do not import." >&2; exit 1; }

echo "==> Deploying ${SERVICE} to ${PROJECT_ID} (${REGION})"
gcloud run deploy "${SERVICE}" \
  --source="${HERE}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --min-instances=0 \
  --memory=1Gi \
  --quiet \
  "${EXTRA_FLAGS[@]}"

url=$(gcloud run services describe "${SERVICE}" --project="${PROJECT_ID}" --region="${REGION}" \
      --format='value(status.url)')
echo "==> Deployed: ${url}"

# A deploy that returns 200s full of nulls is the failure mode this service actually had.
echo "==> Smoke test"
scored=$(curl -fsS --max-time 60 "${url}/api/fleet?date=2020-06-01" \
         | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(u['score'] is not None for u in d))")
echo "    /api/fleet: ${scored}/21 units scored"
if [[ "${scored}" -eq 0 ]]; then
  echo "Error: deployed service returns no scores — data/ or _lib/ did not make it in." >&2
  exit 1
fi
echo "==> OK"
