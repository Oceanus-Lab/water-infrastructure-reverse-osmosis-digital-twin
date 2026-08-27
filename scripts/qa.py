#!/usr/bin/env python3
"""
Full-stack QA — local pipeline, serving API contract, and GCP connectivity in one run.

Answers three questions that were each getting checked by hand:
  1. Does the local pipeline produce outputs that match the code that writes them?
  2. Does the serving API satisfy the frontend's TypeScript contract, with no look-ahead?
  3. Is GCP reachable, and does what is in BigQuery match what is on disk?

Usage:
    python scripts/qa.py                     # everything
    python scripts/qa.py --skip-gcp          # offline (no gcloud/bq needed)
    python scripts/qa.py --skip-local        # GCP only
    python scripts/qa.py --web http://localhost:3000    # also probe a running Next.js dev server

Exit code 0 = every check passed. Warnings (informational) never fail the run.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE_TRACING = ROOT / "services" / "source-tracing"
DATA = SOURCE_TRACING / "data"

SRC_PROJECT = "spatial-cat-489006-a4"      # the shared project the dataset came from
DST_PROJECT = "ro-twin-somi"               # personal sandbox

# Frontend contract, mirrored from services/frontend/lib/types/index.ts
HEALTH_STATUS = {"healthy", "watch", "alert", "unknown"}
PROVENANCE = {"measured", "modeled"}
SEVERITY = {"info", "warning", "critical"}
DEVIATION_STATUS = {"ok", "out-of-range", "unavailable"}

UNIT_IDS = [f"{b}{s}" for b in "ABCDEFG" for s in ("01", "02", "03")]
DATE = "2020-06-01"
UNIT = "B03"

_results: list[tuple[str, str, str]] = []   # (status, name, detail)


def ok(name, detail=""):
    _results.append(("PASS", name, detail))


def bad(name, detail=""):
    _results.append(("FAIL", name, detail))


def warn(name, detail=""):
    _results.append(("WARN", name, detail))


def check(name, cond, detail=""):
    (ok if cond else bad)(name, detail)
    return cond


def section(title):
    print(f"\n\033[1m{'─' * 3} {title} {'─' * max(3, 66 - len(title))}\033[0m")


def _flush(from_index: int):
    for status, name, detail in _results[from_index:]:
        colour = {"PASS": "\033[32m", "FAIL": "\033[31m", "WARN": "\033[33m"}[status]
        print(f"  {colour}{status}\033[0m  {name}" + (f"  \033[2m{detail}\033[0m" if detail else ""))


def run(fn, title):
    section(title)
    start = len(_results)
    try:
        fn()
    except Exception as exc:                                  # a broken check is a failure
        bad(f"{title} raised", f"{type(exc).__name__}: {exc}")
    _flush(start)


# ── 1. local pipeline outputs ──────────────────────────────────────────────────────────

def qa_local_data():
    import pandas as pd

    if not (DATA / "readings.csv").exists():
        warn("readings.csv missing", "run the bq extract, see services/source-tracing/README.md")
        return

    readings = pd.read_csv(DATA / "readings.csv")
    check("readings.csv shape", readings.shape == (15624, 16), f"{readings.shape}")
    check("readings.csv units", readings["unit_id"].nunique() == 21,
          f"{readings['unit_id'].nunique()} units")
    cip = readings["cip"].astype(str).str.lower().eq("true").sum()
    check("readings.csv CIP events", cip == 71, f"{cip}")

    # Outputs must carry every column their module emits — a CSV written by older code is
    # missing columns, which is exactly how the serving API ended up returning fallbacks.
    expected = {
        "forecasts.csv": {"ci_lower", "ci_upper", "forecast_drivers", "fouling_onset_score",
                          "feature_attribution", "anomalies_count", "anomalies"},
        "economics.csv": {"break_even_day", "provenance", "credibility"},
        "deviations.csv": {"expected_clean", "actual", "deviation", "deviation_pct", "status"},
    }
    frames = {}
    for name, cols in expected.items():
        f = DATA / name
        if not f.exists():
            bad(f"{name} missing", "run `python run_all.py` in services/source-tracing")
            continue
        df = frames[name] = pd.read_csv(f)
        missing = cols - set(df.columns)
        check(f"{name} columns", not missing,
              f"{len(df):,} rows" if not missing else f"missing {sorted(missing)}")

    # 003 / 004 / 006 must report the same rise-over-clean, per the shared clean anchor.
    if {"deviations.csv", "forecasts.csv", "economics.csv"} <= frames.keys():
        dev = frames["deviations.csv"]
        dp = dev[dev["metric"] == "unit_n_delta_p"].dropna(subset=["deviation"])
        latest = dp.sort_values("reading_date").groupby(["unit_id", "cycle_id"]).tail(1)
        for label, df, col in (("004 current_rise", frames["forecasts.csv"], "current_rise"),
                               ("006 dp_rise_psi", frames["economics.csv"], "dp_rise_psi")):
            m = df.merge(latest, on=["unit_id", "cycle_id"])
            worst = (m[col] - m["deviation"]).abs().max() if len(m) else float("nan")
            check(f"{label} reconciles with 003", len(m) > 0 and worst <= 0.011,
                  f"{len(m)} cycles, max delta {worst:.4f}")

    report = DATA / "validation_report.json"
    if report.exists():
        r = json.loads(report.read_text())
        li = r["leading_indicator"]
        ok("validation_report.json",
           f"{li['signal']} precision={li['precision']} recall={li['recall']} "
           f"lead={li['median_lead_days']}d")


# ── 2. serving API contract, in-process ────────────────────────────────────────────────

def qa_serving_api():
    sys.path.insert(0, str(ROOT / "services" / "serving-api"))
    sys.path.insert(0, str(SOURCE_TRACING))
    try:
        import main
        from fastapi.testclient import TestClient
    except ImportError as exc:
        warn("serving API not importable", f"{exc} — pip install -r services/serving-api/requirements.txt")
        return

    c = TestClient(main.app)

    j = c.get("/api/timeline").json()
    check("GET /api/timeline", isinstance(j, list) and len(j) == 2, str(j))

    fleet = c.get("/api/fleet", params={"date": DATE}).json()
    check("GET /api/fleet -> 21 UnitHealth", len(fleet) == 21, f"{len(fleet)}")
    check("fleet keys", all(set(u) == {"id", "score", "status", "scoreSource", "timestamp"} for u in fleet))
    check("fleet status enum", all(u["status"] in HEALTH_STATUS for u in fleet))
    check("fleet scoreSource enum", all(u["scoreSource"] in PROVENANCE for u in fleet))
    scored = sum(u["score"] is not None for u in fleet)
    check("fleet has real scores", scored > 0, f"{scored}/21 scored")

    insp = c.get(f"/api/inspection/{UNIT}", params={"date": DATE}).json()
    check("GET /api/inspection", set(insp) == {"unitId", "timestamp", "flux", "pressureDrop",
                                               "energyUsage", "daysSinceClean"})
    check("inspection daysSinceClean sane", 0 <= insp["daysSinceClean"] <= 400,
          f"{insp['daysSinceClean']}d")

    alerts = c.get("/api/alerts", params={"date": DATE}).json()
    check("GET /api/alerts", isinstance(alerts, list), f"{len(alerts)} alerts")
    if alerts:
        check("alert severity enum", all(a["severity"] in SEVERITY for a in alerts))

    dev = c.get(f"/api/physics-deviation/{UNIT}", params={"date": DATE}).json()
    check("GET /api/physics-deviation", isinstance(dev, list), f"{len(dev)} metrics")
    if dev:
        check("deviation status enum", all(d["status"] in DEVIATION_STATUS for d in dev))

    fc = c.get(f"/api/forecast/{UNIT}", params={"date": DATE}).json()
    check("GET /api/forecast", fc is not None and set(fc) == {
        "unitId", "timestamp", "foulingRatePerDay", "trendR2", "currentRise", "daysToClean",
        "forecastBandDays", "ciLower", "ciUpper", "forecastDrivers", "foulingOnsetScore",
        "featureAttribution"})
    if fc:
        check("forecastDrivers is string[]", isinstance(fc["forecastDrivers"], list)
              and all(isinstance(x, str) for x in fc["forecastDrivers"]))

    an = c.get(f"/api/anomaly/{UNIT}", params={"date": DATE}).json()
    check("GET /api/anomaly", isinstance(an, list), f"{len(an)} anomalies")

    env = c.get("/api/env", params={"date": DATE}).json()
    check("GET /api/env", set(env) == {"date", "electricityCostUsdPerKwh",
                                       "gridCarbonIntensityKgPerKwh", "ambientTemperatureC"})

    val = c.get("/api/validation").json()
    check("GET /api/validation", "leading_indicator" in val)

    econ = c.get(f"/api/economics/{UNIT}", params={"date": DATE}).json()
    check("GET /api/economics", econ is not None and set(econ) == {"current", "history"},
          f"{len(econ['history'])} history points" if econ else "")

    # POST must survive CORS AND validate its input.
    pre = c.options("/api/economics/{}/override".format(UNIT),
                    headers={"Origin": "http://localhost:3000",
                             "Access-Control-Request-Method": "POST"})
    allow = pre.headers.get("access-control-allow-methods", "")
    check("CORS allows POST", "POST" in allow, allow or "no header")

    r = c.post(f"/api/economics/{UNIT}/override", params={"date": DATE},
               json={"electricity_price_usd_kwh": 0.25})
    check("POST override", r.status_code == 200, f"HTTP {r.status_code}")
    r = c.post(f"/api/economics/{UNIT}/override", params={"date": DATE},
               json={"electricity_price_usd_kwh": "abc"})
    check("POST override rejects junk", r.status_code == 422, f"HTTP {r.status_code}")

    # No look-ahead: the same unit at different dates must not return identical answers.
    seen = set()
    for d in ("2020-04-01", "2020-05-01", "2020-06-01", "2020-07-01"):
        f = c.get(f"/api/forecast/{UNIT}", params={"date": d}).json()
        seen.add((f["currentRise"], f["foulingRatePerDay"]) if f else None)
    check("no look-ahead leakage", len(seen) > 1,
          f"{len(seen)} distinct answers across 4 dates")

    # eval() must be gone — a payload that would execute under eval() must not.
    probe = pathlib.Path("/tmp/ro_qa_eval_probe")
    probe.unlink(missing_ok=True)
    payload = f"[__import__('pathlib').Path({str(probe)!r}).write_text('x')]"
    main._literal(payload, ["safe"])
    check("CSV cells are not eval()'d", not probe.exists())
    probe.unlink(missing_ok=True)


# ── 3. optional: a running Next.js dev server ──────────────────────────────────────────

def qa_frontend(web: str):
    for path in ("/", "/twin"):
        try:
            with urllib.request.urlopen(web + path, timeout=10) as r:
                check(f"GET {path}", r.status == 200, f"HTTP {r.status}")
        except (urllib.error.URLError, TimeoutError) as exc:
            warn(f"GET {path}", f"{exc} — is `npm run dev` running?")
            return


# ── 4. GCP ─────────────────────────────────────────────────────────────────────────────

def _bq(project: str, sql: str):
    p = subprocess.run(["bq", f"--project_id={project}", "query", "--use_legacy_sql=false",
                        "--format=json", sql],
                       capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        raise RuntimeError((p.stderr or p.stdout).strip().splitlines()[0][:160])
    return json.loads(p.stdout or "[]")


def qa_gcp():
    import pandas as pd

    if not subprocess.run(["which", "bq"], capture_output=True).returncode == 0:
        warn("bq CLI not found", "skipping GCP checks")
        return

    # Source project: is the dataset still there, and does the local extract match it?
    try:
        rows = _bq(SRC_PROJECT, f"""
            SELECT COUNT(*) n, COUNT(DISTINCT unit_id) units, COUNTIF(cip) cip
            FROM `{SRC_PROJECT}.ro_curated.unit_readings`""")[0]
        check(f"{SRC_PROJECT} ro_curated.unit_readings",
              int(rows["n"]) == 15624 and int(rows["units"]) == 21 and int(rows["cip"]) == 71,
              f"{int(rows['n']):,} rows / {rows['units']} units / {rows['cip']} CIP")

        if (DATA / "readings.csv").exists():
            local = pd.read_csv(DATA / "readings.csv")
            check("local readings.csv matches BigQuery row count",
                  len(local) == int(rows["n"]), f"{len(local):,} vs {int(rows['n']):,}")
    except Exception as exc:
        bad(f"{SRC_PROJECT} unreachable", str(exc))

    # Destination project: raw copied, and how far the rebuild has got.
    try:
        raw = _bq(DST_PROJECT, f"""
            SELECT 'ae' t, COUNT(*) n FROM `{DST_PROJECT}.ro_raw.unit_readings_ae_raw`
            UNION ALL SELECT 'fg', COUNT(*) FROM `{DST_PROJECT}.ro_raw.unit_readings_fg_raw`""")
        counts = {r["t"]: int(r["n"]) for r in raw}
        check(f"{DST_PROJECT} ro_raw copied", counts == {"ae": 11160, "fg": 4464}, str(counts))
    except Exception as exc:
        warn(f"{DST_PROJECT} ro_raw", str(exc))

    try:
        cur = _bq(DST_PROJECT, f"""
            SELECT COUNT(*) n FROM `{DST_PROJECT}.ro_curated.unit_readings`""")[0]
        check(f"{DST_PROJECT} ro_curated built", int(cur["n"]) == 15624, f"{int(cur['n']):,} rows")
    except Exception:
        warn(f"{DST_PROJECT} ro_curated not built yet",
             "run Dataform with defaultProject=" + DST_PROJECT)

    # The architecture principle CLAUDE.md calls non-negotiable: forecasting and anomaly
    # detection happen in BigQuery, in-SQL. These tables are what proves it is not just a
    # SQL file sitting unused.
    for table, min_rows in (("fouling_forecast_bq", 21), ("fouling_anomalies_bq", 1)):
        try:
            r = _bq(DST_PROJECT, f"""
                SELECT COUNT(*) n, COUNT(DISTINCT unit_id) units
                FROM `{DST_PROJECT}.ro_forecasts.{table}`""")[0]
            check(f"{DST_PROJECT} ro_forecasts.{table} (in-SQL AI)",
                  int(r["n"]) >= min_rows,
                  f"{int(r['n']):,} rows / {r['units']} units")
        except Exception:
            warn(f"{DST_PROJECT} ro_forecasts.{table} not built",
                 "run Dataform with --tags bqml")

    # The assistant's two BigQuery dependencies. Both fail silently when absent: the Document
    # specialist swallows a failed lookup and reports "no corpus", and a missing qa_cache
    # removes the fallback that keeps the assistant answering under the agent quota — which
    # is exactly what happened here, 404-ing on every question with nothing user-visible.
    for table, label in (("doc_embeddings", "document corpus"), ("qa_cache", "semantic cache")):
        try:
            r = _bq(DST_PROJECT, f"SELECT COUNT(*) n FROM `{DST_PROJECT}.ro_embeddings.{table}`")[0]
            n = int(r["n"])
            if table == "doc_embeddings":
                check(f"{DST_PROJECT} {label} embedded", n > 0,
                      f"{n} chunks" if n else "empty — run pipeline/ingest/embed_docs.py")
            else:
                # Empty is fine (it fills as questions are answered); missing is not.
                ok(f"{DST_PROJECT} {label} present", f"{n} entries")
        except Exception as exc:
            bad(f"{DST_PROJECT} {label} unavailable", str(exc)[:110])

    # The assistant's only write path. Its tables live in Terraform, not Dataform, so a
    # project built by running the Dataform graph has neither — and the approve route then
    # 500s on "Table not found", which is what kept decision_log empty.
    for table in ("decision_log", "agent_memory"):
        try:
            r = _bq(DST_PROJECT, f"SELECT COUNT(*) n FROM `{DST_PROJECT}.ro_serving.{table}`")[0]
            # Rows are optional — these fill as operators approve things. Existing is not.
            ok(f"{DST_PROJECT} ro_serving.{table} present", f"{int(r['n'])} rows")
        except Exception as exc:
            bad(f"{DST_PROJECT} ro_serving.{table} missing", str(exc)[:110])

    # Deployed Cloud Run services — are they serving anything real?
    for project in (DST_PROJECT, SRC_PROJECT):
        try:
            p = subprocess.run(["gcloud", "run", "services", "list", f"--project={project}",
                                "--region=us-central1", "--format=value(metadata.name,status.url)"],
                               capture_output=True, text=True, timeout=90)
            services = dict(line.split("\t")[:2] for line in p.stdout.strip().splitlines() if "\t" in line)
            if not services:
                warn(f"{project} Cloud Run", "no services")
                continue
            ok(f"{project} Cloud Run", ", ".join(services))

            url = services.get("ro-serving-api")
            if not url:
                continue
            with urllib.request.urlopen(f"{url}/api/fleet?date={DATE}", timeout=60) as r:
                fleet = json.load(r)
            scored = sum(u.get("score") is not None for u in fleet)
            if scored == 0:
                warn(f"{project} ro-serving-api returns no scores",
                     f"0/{len(fleet)} units — data/ or _lib/ missing from the image, see deploy.sh")
            else:
                ok(f"{project} ro-serving-api", f"{scored}/{len(fleet)} units scored")

            # A deployed service can still be leaking the future; check it the same way.
            # Only our own project is a hard check — SRC_PROJECT is a collaborator's
            # deployment we do not control, so its state is reported, not enforced.
            seen = set()
            for d in ("2020-04-01", "2020-07-01"):
                with urllib.request.urlopen(f"{url}/api/forecast/{UNIT}?date={d}", timeout=60) as r:
                    f = json.load(r)
                seen.add((f or {}).get("currentRise"))
            label = f"{project} deployed API has no look-ahead"
            detail = f"{len(seen)} distinct answers across 2 dates"
            if project == DST_PROJECT:
                check(label, len(seen) > 1, detail)
            elif len(seen) > 1:
                ok(label, detail)
            else:
                warn(label, detail + " — image predates the as-of fix, not redeployed by us")
        except Exception as exc:
            warn(f"{project} Cloud Run probe", str(exc))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--skip-local", action="store_true")
    ap.add_argument("--skip-gcp", action="store_true")
    ap.add_argument("--web", help="probe a running Next.js server, e.g. http://localhost:3000")
    args = ap.parse_args()

    print("\033[1mRO Digital Twin — full-stack QA\033[0m")

    if not args.skip_local:
        run(qa_local_data, "LOCAL · pipeline outputs")
        run(qa_serving_api, "LOCAL · serving API contract")
    if args.web:
        run(lambda: qa_frontend(args.web.rstrip("/")), "LOCAL · frontend")
    if not args.skip_gcp:
        run(qa_gcp, "GCP · BigQuery + Cloud Run")

    passed = sum(s == "PASS" for s, _, _ in _results)
    failed = [(n, d) for s, n, d in _results if s == "FAIL"]
    warned = [(n, d) for s, n, d in _results if s == "WARN"]

    print(f"\n\033[1m{'═' * 72}\033[0m")
    print(f"  \033[32m{passed} passed\033[0m"
          + (f"   \033[31m{len(failed)} failed\033[0m" if failed else "")
          + (f"   \033[33m{len(warned)} warnings\033[0m" if warned else ""))
    for n, d in failed:
        print(f"    \033[31mFAIL\033[0m {n}  {d}")
    for n, d in warned:
        print(f"    \033[33mWARN\033[0m {n}  {d}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
