#!/usr/bin/env python3
"""
Spec 006 — Economics Model (prototype).

Parametric, delta-first cost model for the "clean now vs. wait" decision. As a membrane
fouls, normalized ΔP rises, so the pump must push harder to hold the recovery setpoint —
that extra pressure is extra energy (money) every day. A CIP cleaning costs money too
(chemicals + labor + lost production during downtime). The optimal cleaning day is when the
accumulating energy penalty overtakes the one-off CIP cost.

Honesty (AGENTS.md): lead with DELTAS, not absolute LCOW (absolutes ±20%, deltas robust).
Energy is measured only on banks F–G; elsewhere it is modeled from ΔP — labeled accordingly.
All six parameters below are editable.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from common import load_readings, add_deviation, cycle_days, DATA

SIGNAL = "unit_n_delta_p_deviation"   # consume the 003 deviation bus, not raw ΔP

# ── editable parameters ────────────────────────────────────────────
PARAMS = dict(
    electricity_price_usd_kwh = 0.08,
    pump_efficiency           = 0.75,
    recovery_setpoint         = 0.85,
    permeate_flow_m3_day      = 500.0,   # per unit, nominal
    cip_cost_usd              = 3000.0,  # chemicals + labor
    cip_downtime_lost_usd     = 2000.0,  # lost production during CIP
)
PSI_TO_BAR = 0.0689476
WARN_RISE = 3.0


def extra_sec_kwh_m3(dp_rise_psi: float, p: dict) -> float:
    """Extra specific energy from the fouling-driven pressure rise: SEC = ΔP/(36·η·recovery)."""
    dp_bar = max(0.0, dp_rise_psi) * PSI_TO_BAR
    return dp_bar / (36.0 * p["pump_efficiency"] * p["recovery_setpoint"])


def unit_economics(cyc: pd.DataFrame, p: dict) -> dict | None:
    # Ordered by reading_date, not days_since_replacement — see common.cycle_days. Sorting by
    # the latter picked the wrong "latest" reading on the two cycles where a membrane swap
    # resets it (D01#4 reported +13.19 psi when the true latest deviation was −1.35).
    cyc = cyc.sort_values("reading_date")
    y = cyc[SIGNAL].to_numpy(float)
    if len(y) < 5 or np.isnan(y).all():
        return None
    valid = ~np.isnan(y)
    y = y[valid]
    # Elapsed days, not the reading count. The two differ whenever the cycle has gaps, and
    # every "per day" figure below (amortised CIP, cumulative penalty, break-even) was
    # previously scaled by len(y) — understating them in proportion to the missing days.
    d = cycle_days(cyc).to_numpy(float)[valid]
    elapsed_days = max(float(d[-1] - d[0]) + 1.0, 1.0)

    # SIGNAL is already (reading − clean anchor) from common.add_deviation, so the rise over
    # clean IS the deviation. The old local anchor (y[:5].mean(), first 5 *rows*) quietly
    # replaced the shared 10-day anchor, so 006's dp_rise_psi disagreed with 003's output.
    dp_rise_now = y[-1]
    # daily energy penalty at the current fouling level
    extra_sec = extra_sec_kwh_m3(dp_rise_now, p)
    daily_penalty = extra_sec * p["permeate_flow_m3_day"] * p["electricity_price_usd_kwh"]
    # cumulative penalty accrued so far this cycle (integrate ΔP rise over the cycle)
    rise_series = np.clip(y, 0, None)
    cum_sec = extra_sec_kwh_m3(rise_series.mean(), p) * elapsed_days  # avg penalty × days
    cum_penalty = cum_sec * p["permeate_flow_m3_day"] * p["electricity_price_usd_kwh"]
    cip_total = p["cip_cost_usd"] + p["cip_downtime_lost_usd"]

    # delta-first recommendation: is today's daily penalty already > amortized CIP over a cycle?
    breakeven_daily = cip_total / elapsed_days
    recommend = "CLEAN NOW" if daily_penalty > breakeven_daily and dp_rise_now > WARN_RISE else "WAIT"

    # Day at which the accumulating penalty equals one CIP, assuming the penalty ramps
    # linearly from 0 to today's daily_penalty over elapsed_days:
    #   cum(d) = ∫₀ᵈ (daily/D)·t dt = daily·d²/(2D)  ⇒  d = √(2·cip_total·D / daily)
    # The factor of 2 from that integral was missing, so break-even landed ~1.41× early.
    break_even_day = None
    if daily_penalty > 0:
        break_even_day = int(np.sqrt(2.0 * cip_total * elapsed_days / daily_penalty))

    unit_id = cyc["unit_id"].iloc[0]
    provenance = "measured" if unit_id.startswith("F") or unit_id.startswith("G") else "modeled"
    credibility = "high" if provenance == "measured" else "medium"

    return dict(unit_id=unit_id, bank_id=cyc["bank_id"].iloc[0],
                cycle_id=int(cyc["cycle_id"].iloc[0]),
                dp_rise_psi=round(float(dp_rise_now), 2),
                extra_sec_kwh_m3=round(float(extra_sec), 4),
                daily_energy_penalty_usd=round(float(daily_penalty), 2),
                cum_energy_penalty_usd=round(float(cum_penalty), 2),
                cip_cost_usd=round(cip_total, 2),
                recommendation=recommend,
                break_even_day=break_even_day,
                provenance=provenance,
                credibility=credibility)


def main():
    df = add_deviation(load_readings())   # 003 deviation bus
    p = PARAMS
    rows = [r for (_, _), cyc in df.groupby(["unit_id", "cycle_id"])
            if (r := unit_economics(cyc, p))]
    econ = pd.DataFrame(rows)
    latest = econ.sort_values("cycle_id").groupby("unit_id").tail(1)
    econ.to_csv(DATA / "economics.csv", index=False)

    print("=" * 70)
    print("SPEC 006 — ECONOMICS  ·  delta-first clean-now-vs-wait")
    print("  params:", {k: p[k] for k in ("electricity_price_usd_kwh", "cip_cost_usd",
                                          "permeate_flow_m3_day")}, "...")
    print("=" * 70)
    # worst fouling state each unit reached (max cumulative penalty cycle)
    worst = econ.sort_values("cum_energy_penalty_usd").groupby("unit_id").tail(1)
    worst = worst.sort_values("cum_energy_penalty_usd", ascending=False)
    cols = ["unit_id", "bank_id", "dp_rise_psi", "daily_energy_penalty_usd",
            "cum_energy_penalty_usd", "cip_cost_usd"]
    print("\nWorst fouling cycle per unit — energy penalty accrued vs CIP cost:")
    print(worst.head(8)[cols].to_string(index=False))

    fleet_cum = worst["cum_energy_penalty_usd"].sum()
    cip_total = p["cip_cost_usd"] + p["cip_downtime_lost_usd"]
    print(f"\nFINDING (delta-first, honest): peak per-cycle energy penalty "
          f"(${worst['cum_energy_penalty_usd'].max():,.0f}) stays well below one CIP "
          f"(${cip_total:,.0f}).")
    print("  → At these BWRO parameters, fouling energy cost alone does NOT justify CIP;")
    print("    cleaning is driven by ΔP mechanical limits & water quality, not energy.")
    print("  → Source-tracing/forecast value = avoiding ΔP damage & quality excursions.")
    # sensitivity: SWRO-like pressures / higher tariff scale the penalty up
    mult = (0.20 / p["electricity_price_usd_kwh"]) * 3.0   # $0.20/kWh, 3x permeate flow
    print(f"  Sensitivity: at $0.20/kWh & 3× flow, penalties scale ~{mult:.0f}× "
          f"(peak → ${worst['cum_energy_penalty_usd'].max()*mult:,.0f}).")
    print(f"\nsaved → {DATA/'economics.csv'}")


if __name__ == "__main__":
    main()
