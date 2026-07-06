#!/usr/bin/env python3
"""
Spec 004 — Forecasting & Anomaly Detection (prototype).

Consumes the 003 confound-free fouling signal (normalized ΔP) and, per unit's current
cleaning cycle:
  - FORECAST: robust linear fouling trend -> projected days until the ΔP crosses a
    fouling-action threshold ("days-to-clean"), with a simple prediction band.
  - ANOMALY : rolling-median + MAD z-score flags readings that deviate abnormally fast
    (early-warning, distinct from the slow fouling trend).

Architecture note (AGENTS.md): the production path is BigQuery AI.FORECAST (TimesFM) /
AI.DETECT_ANOMALIES in-SQL, in-place — implemented and verified in `forecast_bq.sql`
(both run on the real ro_curated.unit_readings). This local module is the offline-prototype
twin of that contract; every output carries evidence (slope, R², band, which reading tripped).
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from common import load_readings, DATA

SIGNAL = "unit_n_delta_p"
ACTION_RISE = 5.0        # ΔP rise over clean anchor that warrants a cleaning decision
MAD_Z = 3.5              # anomaly threshold on robust z-score


def robust_trend(days: np.ndarray, y: np.ndarray):
    """Least-squares slope/intercept + R² of ΔP vs days-since-cleaning."""
    if len(days) < 5:
        return None
    A = np.vstack([days, np.ones_like(days)]).T
    (slope, intercept), *_ = np.linalg.lstsq(A, y, rcond=None)
    resid = y - (slope * days + intercept)
    ss_res, ss_tot = np.sum(resid**2), np.sum((y - y.mean())**2) or 1.0
    return slope, intercept, 1 - ss_res / ss_tot, resid.std()


def forecast_unit(cyc: pd.DataFrame) -> dict | None:
    cyc = cyc.sort_values("days_since_replacement")
    d0 = cyc["days_since_replacement"].min()
    days = (cyc["days_since_replacement"] - d0).to_numpy(float)
    y = cyc[SIGNAL].to_numpy(float)
    mask = ~np.isnan(y)                 # drop NaN readings — else slope/R²/days_to_clean = NaN
    days, y = days[mask], y[mask]
    tr = robust_trend(days, y)
    if tr is None:
        return None
    slope, intercept, r2, sd = tr
    anchor = y[:5].mean()
    target = anchor + ACTION_RISE
    now_day, now_val = days[-1], y[-1]
    # projected days from now until ΔP reaches the action threshold
    if slope > 1e-6:
        day_hit = (target - intercept) / slope
        days_to_clean = max(0.0, day_hit - now_day)
        band = sd / slope if slope else np.nan  # crude ± in days
    else:
        days_to_clean, band = np.inf, np.nan
    return dict(unit_id=cyc["unit_id"].iloc[0], bank_id=cyc["bank_id"].iloc[0],
                cycle_id=int(cyc["cycle_id"].iloc[0]),
                fouling_rate_per_day=round(float(slope), 4), trend_r2=round(float(r2), 3),
                current_rise=round(float(now_val - anchor), 2),
                days_to_clean=(round(float(days_to_clean), 1) if np.isfinite(days_to_clean) else None),
                forecast_band_days=(round(float(band), 1) if np.isfinite(band) else None))


def anomalies(cyc: pd.DataFrame) -> int:
    y = cyc.sort_values("reading_date")[SIGNAL].dropna().to_numpy(float)
    if len(y) < 10:
        return 0
    s = pd.Series(y)
    med = s.rolling(7, min_periods=3, center=True).median()
    mad = (s - med).abs().rolling(7, min_periods=3, center=True).median().replace(0, np.nan)
    z = 0.6745 * (s - med) / mad
    return int((z.abs() > MAD_Z).sum())


def main():
    df = load_readings()
    fc_rows, anom_total = [], 0
    for (unit, cycle), cyc in df.groupby(["unit_id", "cycle_id"]):
        f = forecast_unit(cyc)
        if f:
            f["anomalies"] = anomalies(cyc)
            anom_total += f["anomalies"]
            fc_rows.append(f)
    fc = pd.DataFrame(fc_rows)
    if fc.empty:
        raise SystemExit("no cycle had >=5 valid readings to model — check readings.csv")
    # latest cycle per unit = the actionable forecast
    latest = fc.sort_values("cycle_id").groupby("unit_id").tail(1)
    out = DATA / "forecasts.csv"
    fc.to_csv(out, index=False)

    print("=" * 68)
    print(f"SPEC 004 — FORECAST & ANOMALY  ·  {len(fc)} cycles modeled, "
          f"{anom_total} anomalies flagged")
    print("=" * 68)
    act = latest[latest["days_to_clean"].notna()].sort_values("days_to_clean")
    print("\nMost urgent units (projected days-to-clean, current cycle):")
    cols = ["unit_id", "bank_id", "fouling_rate_per_day", "trend_r2",
            "current_rise", "days_to_clean", "anomalies"]
    print(act.head(10)[cols].to_string(index=False))
    print(f"\nsaved → {out}")


if __name__ == "__main__":
    main()
