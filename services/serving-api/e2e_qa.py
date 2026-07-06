#!/usr/bin/env python3
"""
End-to-end QA for the backend<->frontend connection.

Hits the live serving API exactly as the frontend does, validates every response against the
frontend TypeScript contract (lib/types/index.ts), and confirms both servers + the wiring.
Run while `uvicorn main:app` (:8000) and `npm run dev` (:3000) are up.

    python e2e_qa.py            # defaults to :8000 / :3000
Exit code 0 = all pass.
"""
from __future__ import annotations
import json, sys, urllib.request, pathlib

API = "http://127.0.0.1:8000"
WEB = "http://localhost:3000"
HERE = pathlib.Path(__file__).parent
DATE = "2021-01-13"

HEALTH = {"healthy", "watch", "alert", "unknown"}
PROV = {"measured", "modeled"}
SEV = {"info", "warning", "critical"}

passed, failed = 0, []


def check(name, cond, detail=""):
    global passed
    if cond:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed.append(name)
        print(f"  ❌ {name}  {detail}")


def get(url):
    with urllib.request.urlopen(url, timeout=10) as r:
        return r.status, json.loads(r.read().decode())


print("=" * 64)
print("E2E QA — backend (:8000) <-> frontend (:3000) connection")
print("=" * 64)

# ---- 1. serving API reachable ----
print("\n[1] Serving API endpoints (what the browser calls)")
try:
    st, tl = get(f"{API}/api/timeline")
    check("GET /api/timeline -> 200", st == 200)
    check("timeline is [start, end] dates", isinstance(tl, list) and len(tl) == 2
          and all(isinstance(x, str) for x in tl), str(tl))

    st, fleet = get(f"{API}/api/fleet?date={DATE}")
    check("GET /api/fleet -> 200", st == 200)
    check("fleet has 21 units", len(fleet) == 21, f"got {len(fleet)}")
    ok_shape = all(
        set(u) >= {"id", "score", "status", "scoreSource", "timestamp"}
        and u["status"] in HEALTH and u["scoreSource"] in PROV
        and (u["score"] is None or isinstance(u["score"], int)) for u in fleet)
    check("every unit matches UnitHealth contract", ok_shape)
    check("F/G units labeled measured", all(u["scoreSource"] == "measured"
          for u in fleet if u["id"][0] in "FG"))

    st, insp = get(f"{API}/api/inspection/D02?date={DATE}")
    check("GET /api/inspection/D02 -> 200", st == 200)
    ok_insp = (set(insp) >= {"unitId", "timestamp", "flux", "pressureDrop", "energyUsage", "daysSinceClean"}
               and all(set(insp[m]) == {"value", "source"} and insp[m]["source"] in PROV
                       for m in ("flux", "pressureDrop", "energyUsage"))
               and isinstance(insp["daysSinceClean"], int))
    check("inspection matches UnitInspection contract", ok_insp, str(insp))

    st, alerts = get(f"{API}/api/alerts?date={DATE}")
    check("GET /api/alerts -> 200", st == 200)
    ok_alerts = all(set(a) >= {"id", "unitId", "severity", "message", "timestamp", "evidence"}
                    and a["severity"] in SEV for a in alerts)
    check("every alert matches AlertItem contract", ok_alerts)
    check("alerts carry source-tracing evidence", all(a["evidence"] for a in alerts) and len(alerts) > 0,
          f"{len(alerts)} alerts")
except Exception as e:
    check("serving API reachable", False, f"is uvicorn running on :8000? ({e})")

# ---- 2. frontend reachable ----
print("\n[2] Frontend server")
for path in ("/", "/twin"):
    try:
        st, _ = urllib.request.urlopen(f"{WEB}{path}", timeout=10).status, None
        check(f"GET {path} -> 200", st == 200)
    except Exception as e:
        check(f"frontend {path} reachable", False, f"is npm run dev on :3000? ({e})")

# ---- 3. wiring: frontend actually points at the API ----
print("\n[3] Wiring check (frontend -> API)")
api_file = (HERE.parent / "frontend" / "lib" / "api" / "index.ts").read_text()
check("lib/api/index.ts calls the real API (fetch)", "fetch(" in api_file and "/api/" in api_file)
check("uses NEXT_PUBLIC_API_URL / localhost:8000", "NEXT_PUBLIC_API_URL" in api_file or "8000" in api_file)

# ---- summary ----
print("\n" + "=" * 64)
if failed:
    print(f"RESULT: {passed} passed, {len(failed)} FAILED -> {failed}")
    sys.exit(1)
print(f"RESULT: all {passed} checks passed ✅  backend<->frontend contract verified")
