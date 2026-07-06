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
import pathlib
import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

HERE = pathlib.Path(__file__).parent
DATA = HERE.parent / "source-tracing" / "data"

app = FastAPI(title="RO Digital Twin — Serving API", version="0.1.0")
app.add_middleware(  # let the Next.js dev server call us
    CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET"], allow_headers=["*"],
)


def _csv(name: str) -> pd.DataFrame:
    f = DATA / name
    return pd.read_csv(f) if f.exists() else pd.DataFrame()


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


@app.get("/api/timeline")
def timeline():
    r = _csv("readings.csv")
    if r.empty:
        return ["2019-01-01", "2021-01-13"]
    return [str(r["reading_date"].min())[:10], str(r["reading_date"].max())[:10]]


@app.get("/api/fleet")
def fleet(date: str = Query(...)):
    fc = _csv("forecasts.csv")
    latest = fc.sort_values("cycle_id").groupby("unit_id").tail(1) if not fc.empty else fc
    by_unit = {r["unit_id"]: r for _, r in latest.iterrows()} if not latest.empty else {}
    out = []
    for bank in "ABCDEFG":
        for stage in ("01", "02", "03"):
            uid = f"{bank}{stage}"
            r = by_unit.get(uid)
            score = _health_score(r["current_rise"], r.get("anomalies_count", 0)) if r is not None else None
            out.append({
                "id": uid, "score": score, "status": _status(score),
                "scoreSource": _measured(uid), "timestamp": date,
            })
    return out


@app.get("/api/inspection/{unit_id}")
def inspection(unit_id: str, date: str = Query(...)):
    readings = _csv("readings.csv")
    econ = _csv("economics.csv")
    u = readings[readings["unit_id"] == unit_id].sort_values("reading_date")
    last = u.iloc[-1] if not u.empty else None
    # days since the last CIP = position within the current cleaning cycle (resets at CIP)
    days_since_clean = 0
    if last is not None:
        cyc = u[u["cycle_id"] == last["cycle_id"]]
        days_since_clean = int(last["days_since_replacement"] - cyc["days_since_replacement"].min())
    e = econ[econ["unit_id"] == unit_id]
    energy = float(e["daily_energy_penalty_usd"].iloc[-1]) if not e.empty else None
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
    fc = _csv("forecasts.csv")
    att = _csv("attributions.csv")
    if fc.empty:
        return []
    latest = fc.sort_values("cycle_id").groupby("unit_id").tail(1)
    mech = {r["unit_id"]: r["attributed_mechanism"]
            for _, r in att.iterrows()} if not att.empty else {}
    out, i = [], 0
    for _, r in latest.sort_values("days_to_clean").iterrows():
        dtc, anom = r["days_to_clean"], int(r.get("anomalies_count", 0))
        if pd.notna(dtc) and dtc <= 21:
            sev, msg = "critical", "Fouling threshold imminent"
        elif anom >= 8:
            sev, msg = "warning", "Elevated anomaly count"
        else:
            continue
        i += 1
        cause = mech.get(r["unit_id"], "unspecified")
        ev = (f"Projected to hit action threshold in ~{dtc:.0f} days"
              if pd.notna(dtc) and dtc <= 21 else f"{anom} anomalies flagged this cycle")
        out.append({
            "id": f"alrt-{i}", "unitId": r["unit_id"], "severity": sev,
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
    fc = _csv("forecasts.csv")
    if fc.empty:
        return None
    
    # Get latest cycle forecast for this unit
    unit_fc = fc[fc["unit_id"] == unit_id].sort_values("cycle_id").tail(1)
    if unit_fc.empty:
        return None
    
    r = unit_fc.iloc[0]
    has_evidence = pd.notna(r.get("days_to_clean"))
    
    return {
        "unitId": r["unit_id"],
        "timestamp": date,
        "foulingRatePerDay": r["fouling_rate_per_day"],
        "trendR2": r["trend_r2"],
        "currentRise": r["current_rise"],
        "daysToClean": r["days_to_clean"] if has_evidence else None,
        "forecastBandDays": r["forecast_band_days"] if has_evidence else None,
        "ciLower": r.get("ci_lower") if pd.notna(r.get("ci_lower")) else None,
        "ciUpper": r.get("ci_upper") if pd.notna(r.get("ci_upper")) else None,
        "forecastDrivers": eval(r.get("forecast_drivers", "['incomplete evidence']")) if isinstance(r.get("forecast_drivers"), str) else r.get("forecast_drivers", ["incomplete evidence"]),
        "foulingOnsetScore": r.get("fouling_onset_score"),
        "featureAttribution": eval(r.get("feature_attribution", "['unknown']")) if isinstance(r.get("feature_attribution"), str) else r.get("feature_attribution", ["unknown"])
    }


@app.get("/api/anomaly/{unit_id}")
def get_anomaly(unit_id: str, date: str = Query(...)):
    fc = _csv("forecasts.csv")
    if fc.empty:
        return []
    
    unit_fc = fc[fc["unit_id"] == unit_id].sort_values("cycle_id").tail(1)
    if unit_fc.empty:
        return []
    
    anomalies_str = unit_fc.iloc[0].get("anomalies", "[]")
    if pd.isna(anomalies_str):
        return []
    
    try:
        import ast
        anomalies_list = ast.literal_eval(anomalies_str)
        return anomalies_list
    except:
        return []


@app.get("/api/validation")
def validation():
    import json
    f = DATA / "validation_report.json"
    if not f.exists():
        return {}
    with open(f, "r") as file:
        return json.load(file)



@app.get("/")
def root():
    return {"service": "ro-serving-api", "endpoints": ["/api/fleet", "/api/inspection/{id}",
                                                        "/api/alerts", "/api/timeline", "/api/physics-deviation/{unit_id}", "/api/forecast/{unit_id}", "/api/anomaly/{unit_id}", "/api/validation"]}
