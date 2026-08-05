#!/usr/bin/env bash
# Deploy watertap-engine (docs/05-gcp-infrastructure.md).
#
# physics.py is staged from ../source-tracing rather than committed here: Cloud Run's build
# context is this directory only, and two copies of a flowsheet drift. Same pattern as
# services/serving-api/deploy.sh.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-spatial-cat-489006-a4}}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-watertap-engine}"

echo "==> Staging physics.py from ../source-tracing"
cp "${HERE}/../source-tracing/physics.py" "${HERE}/physics.py"

echo "==> Deploying ${SERVICE} to ${PROJECT_ID} (${REGION})"
# The image is heavier than the rest of the fleet (Pyomo/IDAES/Ipopt) and a solve is
# CPU-bound for a couple of seconds, so it gets more memory and a longer timeout than the
# API. Still scale-to-zero: nothing is running between what-if questions.
gcloud run deploy "${SERVICE}" \
  --source="${HERE}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --min-instances=0 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --quiet \
  "$@"

url=$(gcloud run services describe "${SERVICE}" --project="${PROJECT_ID}" --region="${REGION}" \
      --format='value(status.url)')
echo "==> Deployed: ${url}"

# /health solves; a container whose solver failed to install serves HTTP fine and would pass
# a plain liveness check while returning available=false forever.
echo "==> Solver check"
status=$(curl -fsS --max-time 120 "${url}/health" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
echo "    ${status}"
[[ "${status}" == "ok" ]] || { echo "Error: solver not available in the image." >&2; exit 1; }
