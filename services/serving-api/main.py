#!/usr/bin/env python3
"""
Serving API — the backend↔frontend bridge (spec 009 `ro-serving-api`).

Reads the source-tracing backend outputs (specs 003–007) and returns them in the EXACT shapes
the Next.js frontend (spec 008) already expects — so `lib/api/index.ts` can swap its mock
generators for real `fetch()` calls with zero type changes.

Endpoints mirror the frontend's data functions:
  GET /api/fleet?date=YYYY-MM-DD          -> UnitHealth[]        (fetchFleetStatus)
  GET /api/inspection/{unit_id}?date=...  -> UnitInspection      (fetchUnitInspection)
  GET /api/alerts?date=YYYY-MM-DD         -> AlertItem[]         (fetchAlerts)
  GET /api/timeline                       -> [start, end]        (fetchTimelineRange)

Data source: the source-tracing CSV outputs by default (runs offline for local dev). Swap
`DATA` reads for BigQuery (`ro_simulation` / `ro_forecasts`) in production — same columns.
Provenance follows the project rule: banks F–G energy = measured, A–E = modeled.
"""
from __future__ import annotations
import ast
import json
import math
import os
import pathlib
import sys
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

HERE = pathlib.Path(__file__).parent
# The 003-006 modules (common, forecast_anomaly, economics) are imported at request time for
# as-of-date evaluation. Cloud Run's build context is this directory only, so deploy.sh stages
# them into _lib/; locally they are read from the sibling source-tracing checkout. Prefer the
# staged copy, exactly like DATA below — without this the deployed service 500s with
# ModuleNotFoundError: No module named 'forecast_anomaly'.
_BUNDLED_LIB = HERE / "_lib"
sys.path.append(str(_BUNDLED_LIB if _BUNDLED_LIB.exists() else HERE.parent / "source-tracing"))
# economics.unit_economics returns None below this many valid readings — starting the history
# loop here skips prefixes that can only produce None.
_MIN_ECON_READINGS = 5
# Deployed (Cloud Run) builds only get this directory as build context, so a copy of
# source-tracing/data is bundled alongside main.py at deploy time. Local dev falls back to
# the sibling directory so nothing has to be duplicated by hand during development.
_BUNDLED_DATA = HERE / "data"
DATA = _BUNDLED_DATA if _BUNDLED_DATA.exists() else HERE.parent / "source-tracing" / "data"

app = FastAPI(title="RO Digital Twin — Serving API", version="0.1.0")

_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_allowed_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    # POST is required: /api/economics/{unit_id}/override is a POST, and with a GET-only
    # allow list the browser preflight fails, so the economics override silently never works.
    CORSMiddleware, allow_origins=_allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"],
)


_CACHE: dict[str, tuple[float, int, pd.DataFrame]] = {}


def _csv(name: str) -> pd.DataFrame:
    """Read a source-tracing CSV, cached on (mtime, size).

    Every endpoint re-parsed its CSVs on each request; deviations.csv alone is ~4 MB, so a
    single /api/physics-deviation call spent ~40 ms just in read_csv. The stat() keeps a
    regenerated file (run_all.py) from being served stale — the whole point of the CSVs is
    that they are rewritten in place.
    """
    f = DATA / name
    if not f.exists():
        _CACHE.pop(name, None)
        return pd.DataFrame()
    st = f.stat()
    hit = _CACHE.get(name)
    if hit is not None and hit[0] == st.st_mtime and hit[1] == st.st_size:
        return hit[2]
    df = pd.read_csv(f)
    _CACHE[name] = (st.st_mtime, st.st_size, df)
    return df


def _literal(value, fallback: list) -> list:
    """Parse a stringified list out of a CSV cell.

    Never `eval()` here — these cells come from files on disk, so eval would execute whatever
    the pipeline (or anything that can write to data/) put in them.
    """
    if not isinstance(value, str):
        return value if isinstance(value, list) else fallback
    try:
        parsed = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return fallback
    return parsed if isinstance(parsed, list) else fallback


def _measured(unit_id: str) -> str:
    # banks F–G have metered energy; A–E are WaterTAP-modeled (matches frontend mock + Constitution IV)
    return "measured" if unit_id[:1] in ("F", "G") else "modeled"


def _status(score):
    if score is None:
        return "unknown"
    if score >= 70:
        return "healthy"
    if score >= 40:
        return "watch"
    return "alert"


def _health_score(current_rise, anomalies) -> int | None:
    """0–100 health from the 003 fouling signal: higher ΔP rise over clean = lower health."""
    if pd.isna(current_rise):
        return None
    score = 95.0 - max(0.0, float(current_rise)) * 9.0 - min(float(anomalies or 0), 10) * 1.0
    return int(max(5, min(98, round(score))))


def _get_active_cycles(date: str) -> dict:
    readings = _csv("readings.csv")
    if readings.empty:
        return {}
    past = readings[readings["reading_date"] <= date]
    if past.empty:
        return {}
    last = past.sort_values("reading_date").groupby("unit_id").tail(1)
    return last.set_index("unit_id")["cycle_id"].to_dict()


# ── as-of-date evaluation ──────────────────────────────────────────────────────────────
# forecasts.csv and economics.csv hold ONE row per (unit, cycle), computed from the whole
# cycle. Serving those for a `?date=` inside the cycle leaks the future: asking for
# 2020-04-01 returned a fouling slope and a health score derived from readings that had not
# happened yet, and the numbers were byte-identical across four months of the timeline. For
# a replay twin that is the defect that invalidates the whole scrubber. These helpers
# recompute from readings truncated at `date`, using the same 003–006 functions.

_ASOF_CACHE: dict[tuple, object] = {}
_ASOF_CACHE_MAX = 4096


def _data_version() -> tuple:
    f = DATA / "readings.csv"
    if not f.exists():
        return ()
    st = f.stat()
    return (st.st_mtime, st.st_size)


def _asof_cached(key: tuple, compute):
    key = key + _data_version()
    if key in _ASOF_CACHE:
        return _ASOF_CACHE[key]
    value = compute()
    if len(_ASOF_CACHE) >= _ASOF_CACHE_MAX:
        _ASOF_CACHE.clear()
    _ASOF_CACHE[key] = value
    return value


_UNIT_INDEX: dict[tuple, dict[str, pd.DataFrame]] = {}


def _readings_by_unit() -> dict[str, pd.DataFrame]:
    """readings.csv split per unit, sorted, with reading_date parsed exactly once.

    Both matter for the as-of path. Filtering `reading_date <= date` on the raw CSV meant a
    string comparison over all 15,624 rows for each of the 21 units on every uncached date,
    and cycle_days re-ran pd.to_datetime (with format inference) on every call. Together they
    were the bulk of the ~120 ms an unseen date cost.
    """
    key = _data_version()
    hit = _UNIT_INDEX.get(key)
    if hit is not None:
        return hit
    r = _csv("readings.csv")
    if r.empty:
        return {}
    r = r.copy()
    r["reading_date"] = pd.to_datetime(r["reading_date"])
    index = {uid: g.sort_values("reading_date") for uid, g in r.groupby("unit_id", sort=False)}
    _UNIT_INDEX.clear()          # only ever one generation of readings.csv is live
    _UNIT_INDEX[key] = index
    return index


def _cycle_as_of(unit_id: str, date: str):
    """Rows of unit_id's then-active cycle up to `date`, with the 003 deviation attached.

    The clean anchor is derived from the truncated frame on purpose: early in a cycle there
    may not be 3 clean readings yet, and the honest answer then is "not enough evidence",
    which is what the 003/004 helpers already return. This is why the as-of path computes the
    deviation rather than joining 003's deviations.csv the way the batch pipeline does — that
    file's anchor is built from the whole cycle, which would leak the future here.
    """
    from common import add_deviation

    g = _readings_by_unit().get(unit_id)
    if g is None:
        return None
    u = g[g["reading_date"] <= pd.Timestamp(date)]
    if u.empty:
        return None
    cyc_id = u["cycle_id"].iloc[-1]          # already sorted by date
    return add_deviation(u[u["cycle_id"] == cyc_id].copy())


def _forecast_as_of(unit_id: str, date: str):
    def compute():
        from forecast_anomaly import anomalies as _anoms, forecast_unit

        cyc = _cycle_as_of(unit_id, date)
        if cyc is None or cyc.empty:
            return None
        res = forecast_unit(cyc)
        if res is None:
            return None
        found = _anoms(cyc)
        res["anomalies_count"] = len(found)
        res["anomalies"] = found
        return res

    return _asof_cached(("fc", unit_id, date), compute)


def _nan_to_none(d: dict) -> dict:
    return {k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in d.items()}


def _economics_history(unit_id: str, date: str, params: dict | None = None) -> list[dict]:
    """Economics recomputed at each day of the cycle up to `date`.

    The breakeven chart plots this as a series, so it has to be the running value, not the
    single end-of-cycle row economics.csv stores.
    """
    def compute():
        from economics import PARAMS, unit_economics

        cyc = _cycle_as_of(unit_id, date)
        if cyc is None or cyc.empty:
            return []
        cyc = cyc.sort_values("reading_date")
        out = []
        for i in range(_MIN_ECON_READINGS, len(cyc) + 1):
            res = unit_economics(cyc.iloc[:i], params or PARAMS)
            if res is not None:
                out.append(_nan_to_none(res))
        return out

    if params is not None:      # overrides are per-request, never cached
        return compute()
    return _asof_cached(("econ", unit_id, date), compute)


def _economics_as_of(unit_id: str, date: str, params: dict | None = None):
    history = _economics_history(unit_id, date, params)
    return history[-1] if history else None


def _unit_ids() -> list[str]:
    return [f"{bank}{stage}" for bank in "ABCDEFG" for stage in ("01", "02", "03")]


@app.get("/api/timeline")
def timeline():
    r = _csv("readings.csv")
    if r.empty:
        # Do NOT fall back to the OCWD date range here. Returning it when readings.csv is
        # missing makes an API with no data behind it look fully loaded — the deployed
        # service did exactly that while every other endpoint returned null. Fail loudly
        # instead so a missing data/ bundle is visible rather than disguised.
        raise HTTPException(status_code=503, detail="readings.csv unavailable — no timeline to serve")
    return [str(r["reading_date"].min())[:10], str(r["reading_date"].max())[:10]]


@app.get("/api/fleet")
def fleet(date: str = Query(...)):
    out = []
    for uid in _unit_ids():
        r = _forecast_as_of(uid, date)   # as-of, not the whole-cycle row from forecasts.csv
        score = _health_score(r["current_rise"], r.get("anomalies_count", 0)) if r else None
        out.append({
            "id": uid, "score": score, "status": _status(score),
            "scoreSource": _measured(uid), "timestamp": date,
        })
    return out


@app.get("/api/inspection/{unit_id}")
def inspection(unit_id: str, date: str = Query(...)):
    readings = _csv("readings.csv")
    econ = _csv("economics.csv")
    if readings.empty:  # no data available — return an all-null shape rather than crashing
        src = _measured(unit_id)
        return {
            "unitId": unit_id, "timestamp": date,
            "flux": {"value": None, "source": src},
            "pressureDrop": {"value": None, "source": "measured"},
            "energyUsage": {"value": None, "source": src},
            "daysSinceClean": 0,
        }
    u = readings[(readings["unit_id"] == unit_id) & (readings["reading_date"] <= date)].sort_values("reading_date")
    last = u.iloc[-1] if not u.empty else None

    days_since_clean = 0
    energy = None
    if last is not None:
        cyc_id = last["cycle_id"]
        cyc = u[u["cycle_id"] == cyc_id]
        # From reading_date, not days_since_replacement: that column counts from the last
        # membrane REPLACEMENT and resets mid-cycle when one is swapped, which made
        # "days since clean" jump to ~1700 on C01/D01 cycle 4 (see common.cycle_days).
        _d = pd.to_datetime(cyc["reading_date"])
        days_since_clean = int((pd.to_datetime(last["reading_date"]) - _d.min()).days)
        # as-of, not the whole-cycle row from economics.csv
        e = _economics_as_of(unit_id, date)
        energy = float(e["daily_energy_penalty_usd"]) if e else None

    src = _measured(unit_id)
    return {
        "unitId": unit_id, "timestamp": date,
        "flux": {"value": (round(float(last["stage_1_flux"]), 2)
                            if last is not None and "stage_1_flux" in u.columns
                            and pd.notna(last.get("stage_1_flux")) else None), "source": src},
        "pressureDrop": {"value": (round(float(last["unit_n_delta_p"]), 2)
                                   if last is not None and pd.notna(last["unit_n_delta_p"]) else None),
                         "source": "measured"},
        "energyUsage": {"value": (round(energy, 2) if energy is not None else None), "source": src},
        "daysSinceClean": days_since_clean,
    }


@app.get("/api/alerts")
def alerts(date: str = Query(...)):
    att = _csv("attributions.csv")
    cycles = _get_active_cycles(date)
    if not cycles:
        return []

    mech = {}
    if not att.empty:
        for _, r in att.iterrows():
            if cycles.get(r["unit_id"]) == r["cycle_id"]:
                mech[r["unit_id"]] = r["attributed_mechanism"]

    # as-of forecasts, so an alert is raised on the evidence available at `date` — the
    # whole-cycle rows fired alerts on the timeline before the fouling had happened.
    candidates = []
    for uid in _unit_ids():
        f = _forecast_as_of(uid, date)
        if f:
            candidates.append((uid, f))
    candidates.sort(key=lambda t: (t[1].get("days_to_clean") is None,
                                   t[1].get("days_to_clean") or 0.0))

    out = []
    for uid, f in candidates:
        dtc, anom = f.get("days_to_clean"), int(f.get("anomalies_count", 0))
        if dtc is not None and dtc <= 21:
            sev, msg = "critical", "Fouling threshold imminent"
            ev = f"Projected to hit action threshold in ~{dtc:.0f} days"
        elif anom >= 8:
            sev, msg = "warning", "Elevated anomaly count"
            ev = f"{anom} anomalies flagged this cycle"
        else:
            continue
        cause = mech.get(uid, "unspecified")
        out.append({
            "id": f"alrt-{len(out) + 1}", "unitId": uid, "severity": sev,
            "message": f"{msg} ({cause})", "timestamp": date, "evidence": ev,
        })
    return out


@app.get("/api/physics-deviation/{unit_id}")
def physics_deviation(unit_id: str, date: str = Query(...)):
    devs = _csv("deviations.csv")
    if devs.empty:
        return []
    
    u = devs[(devs["unit_id"] == unit_id) & (devs["reading_date"] == date)]
    out = []
    for _, r in u.iterrows():
        out.append({
            "unitId": r["unit_id"],
            "cycleId": r["cycle_id"],
            "readingDate": r["reading_date"],
            "metric": r["metric"],
            "expectedClean": r["expected_clean"] if pd.notna(r["expected_clean"]) else None,
            "actual": r["actual"] if pd.notna(r["actual"]) else None,
            "deviation": r["deviation"] if pd.notna(r["deviation"]) else None,
            "deviationPct": r["deviation_pct"] if pd.notna(r["deviation_pct"]) else None,
            "status": r["status"],
            "fidelity": r["fidelity"],
            "provenance": r["provenance"],
        })
    return out


@app.get("/api/forecast/{unit_id}")
def get_forecast(unit_id: str, date: str = Query(...)):
    r = _forecast_as_of(unit_id, date)
    if r is None:
        return None
    return {
        "unitId": r["unit_id"],
        "timestamp": date,
        "foulingRatePerDay": r["fouling_rate_per_day"],
        "trendR2": r["trend_r2"],
        "currentRise": r["current_rise"],
        "daysToClean": r["days_to_clean"],
        "forecastBandDays": r["forecast_band_days"],
        "ciLower": r["ci_lower"],
        "ciUpper": r["ci_upper"],
        "forecastDrivers": r["forecast_drivers"],
        "foulingOnsetScore": r["fouling_onset_score"],
        "featureAttribution": r["feature_attribution"],
    }


@app.get("/api/anomaly/{unit_id}")
def get_anomaly(unit_id: str, date: str = Query(...)):
    r = _forecast_as_of(unit_id, date)
    return r["anomalies"] if r else []


@app.get("/api/env")
def environment(date: str = Query(...)):
    """Environmental context for the given replay date.

    ambientTemperatureC is the fleet-wide mean over the last 7 reading-dates of the plant's
    feed-water temperature (temp_c) — the only temperature signal in the dataset, used as an
    ambient proxy. Electricity cost and grid carbon are documented constants: the EIA/grid
    enrichment joins in docs/02-data-pipeline.md are not present in the source-tracing outputs.
    """
    readings = _csv("readings.csv")
    ambient = 22.5
    if not readings.empty and "temp_c" in readings.columns:
        past = readings[readings["reading_date"] <= date]
        if not past.empty:
            last7 = sorted(past["reading_date"].unique())[-7:]
            recent = past[past["reading_date"].isin(last7)]
            if recent["temp_c"].notna().any():
                ambient = round(float(recent["temp_c"].mean()), 1)
    return {
        "date": date,
        "electricityCostUsdPerKwh": 0.12,
        "gridCarbonIntensityKgPerKwh": 0.35,
        "ambientTemperatureC": ambient,
    }


@app.get("/api/validation")
def validation():
    f = DATA / "validation_report.json"
    if not f.exists():
        return {}
    with open(f, "r") as file:
        return json.load(file)


@app.get("/api/economics/{unit_id}")
def get_economics(unit_id: str, date: str = Query(...)):
    # as-of, not the whole-cycle row from economics.csv. That file holds ONE row per
    # (unit, cycle) computed from the entire cycle, so it reported the end-of-cycle penalty
    # no matter where the timeline sat.
    history = _economics_history(unit_id, date)
    if not history:
        return None
    return {"current": history[-1], "history": history}


@app.post("/api/economics/{unit_id}/override")
def override_economics(unit_id: str, params: dict, date: str = Query(...)):
    readings = _csv("readings.csv")
    cycles = _get_active_cycles(date)
    cyc_id = cycles.get(unit_id)
    if not cyc_id:
        return {"error": "no data"}
        
    cyc = readings[(readings["unit_id"] == unit_id) & (readings["cycle_id"] == cyc_id) & (readings["reading_date"] <= date)].copy()
    if cyc.empty:
        return {"error": "no cycle data found for date"}

    from common import add_deviation
    from economics import unit_economics, PARAMS

    cyc = add_deviation(cyc)

    # Validate before computing: unknown keys are rejected rather than silently dropped, and
    # a non-numeric value used to reach float() unguarded and surface as a 500.
    p = PARAMS.copy()
    unknown = sorted(set(params) - set(PARAMS))
    if unknown:
        raise HTTPException(status_code=422,
                            detail=f"unknown parameter(s): {unknown}; allowed: {sorted(PARAMS)}")
    for k, v in params.items():
        if v is None:
            continue
        try:
            fv = float(v)
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail=f"parameter '{k}' must be a number, got {v!r}")
        if not math.isfinite(fv) or fv < 0:
            raise HTTPException(status_code=422, detail=f"parameter '{k}' must be finite and >= 0, got {fv}")
        p[k] = fv

    # History = economics as of each day of the cycle. This ran unit_economics on every
    # prefix, so an N-reading cycle re-scanned O(N^2) rows; the sub-frame slicing dominated.
    # Sorting once and reusing the slices keeps the same output at a fraction of the cost.
    history = []
    cyc_sorted = cyc.sort_values("reading_date")
    for i in range(_MIN_ECON_READINGS, len(cyc_sorted) + 1):
        res = unit_economics(cyc_sorted.iloc[:i], p)
        if res is not None:
            history.append({k: (None if isinstance(v, float) and math.isnan(v) else v)
                            for k, v in res.items()})

    if not history:
        return {"error": "could not calculate economics"}
        
    current = history[-1]
        
    # Check if recommendation flipped
    default_res = unit_economics(cyc, PARAMS)
    if default_res:
        current["recommendation_flipped"] = (current["recommendation"] != default_res["recommendation"])
    else:
        current["recommendation_flipped"] = False
        
    current["params"] = p
    
    return {"current": current, "history": history}


@app.get("/")
def root():
    return {"service": "ro-serving-api", "endpoints": ["/api/fleet", "/api/inspection/{id}",
                                                        "/api/alerts", "/api/timeline", "/api/physics-deviation/{unit_id}", "/api/forecast/{unit_id}", "/api/anomaly/{unit_id}", "/api/validation", "/api/economics/{unit_id}"]}

