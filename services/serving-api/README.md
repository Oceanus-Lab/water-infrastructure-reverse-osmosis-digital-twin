# Serving API — backend ↔ frontend bridge (`ro-serving-api`)

Serves the source-tracing backend outputs (specs 003–007) to the Next.js frontend (spec 008)
in the exact shapes it already expects, so the UI can drop its mock generators for real data.

## Run locally

```bash
# deps (or reuse the source-tracing venv)
pip install -r requirements.txt
# needs the source-tracing outputs present: ../source-tracing/data/*.csv
#   (generate with: cd ../source-tracing && python run_all.py)
uvicorn main:app --reload --port 8000
```

Then: http://localhost:8000/api/fleet?date=2021-01-13

## Endpoints (mirror the frontend's `lib/api/index.ts`)

| Endpoint | Frontend function | Returns |
|---|---|---|
| `GET /api/fleet?date=` | `fetchFleetStatus` | `UnitHealth[]` (21 units, score/status/source) |
| `GET /api/inspection/{id}?date=` | `fetchUnitInspection` | `UnitInspection` (flux/pressureDrop/energyUsage + daysSinceClean) |
| `GET /api/alerts?date=` | `fetchAlerts` | `AlertItem[]` (severity + source-tracing evidence) |
| `GET /api/timeline` | `fetchTimelineRange` | `[start, end]` |

## Wire the frontend (one-line swap per function)

In `services/frontend/lib/api/index.ts`, replace the mock calls with `fetch`:

```ts
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const fetchFleetStatus     = (date: string) => fetch(`${API}/api/fleet?date=${date}`).then(r => r.json());
export const fetchTimelineRange   = ()             => fetch(`${API}/api/timeline`).then(r => r.json());
export const fetchUnitInspection  = (id: string, date: string) => fetch(`${API}/api/inspection/${id}?date=${date}`).then(r => r.json());
export const fetchAlerts          = (date: string) => fetch(`${API}/api/alerts?date=${date}`).then(r => r.json());
```

The response types already match `lib/types/index.ts` (`UnitHealth`, `UnitInspection`, `AlertItem`),
so no component changes are needed. CORS is enabled for `localhost:3000`.

## Data source

Reads `../source-tracing/data/*.csv` for local dev (runs offline). For production, swap the
`_csv(...)` reads for BigQuery queries against `ro_simulation` / `ro_forecasts` (same columns) —
the API shape stays identical. Provenance: banks F–G = measured, A–E = modeled (Constitution IV).
