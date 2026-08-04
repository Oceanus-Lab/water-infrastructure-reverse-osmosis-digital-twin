#!/usr/bin/env python3
"""
Spec 005 — Fouling Validation & Source Attribution.

Validates the early warning logic against ground-truth CIP events using
pre-registered horizons and threshold durations. Dynamically ranks candidate
signals to find the strongest leading indicator, computes precision/recall,
evaluates the physics baseline error, and outputs the results for UI consumption.
"""
from __future__ import annotations
import json
import numpy as np
import pandas as pd
from common import load_readings, DATA, clean_anchor, cycle_days, CLEAN_DAYS
from attribute import percentile_ranks, attribute_cycle

# FR-005/FR-007 Pre-registered constraints
MIN_SUSTAINED_WARNING_DAYS = 3
HORIZON_DAYS = 90

# Candidate leading indicators, and the bar each must clear to raise a warning.
#
# The bar is expressed in robust sigmas of each signal's OWN clean-window spread, not in raw
# units. It used to be a fixed number per signal — 3.0 psi for unit_n_delta_p and 0.5 % for
# salt_passage — which on this dataset works out to 6.6σ and 12.2σ respectively. Ranking the
# two by (precision + recall) / 2 while holding one to a nearly twice stricter bar does not
# measure which signal leads; it measures which threshold happened to be kinder. Normalising
# makes the comparison a like-for-like one.
#
# The bar is 4σ — the same "clearly beyond noise" convention deviation.py already uses for
# OUT_OF_RANGE_Z. Chosen for consistency with the rest of the codebase, NOT tuned against the
# backtest: `sensitivity` in validation_report.json reports the full 4–12σ sweep so the
# choice stays auditable and the alternatives are visible rather than hidden.
#
# For reference, the old hand-picked thresholds correspond to 6.6σ (unit_n_delta_p, 3.0 psi)
# and 12.2σ (salt_passage, 0.5 %). salt_passage ranks first at every σ in the sweep except
# 12.2, so the "salt passage is the leading indicator" finding does not depend on this
# choice — which is the point of reporting the sweep.
CANDIDATE_SIGNALS = ("unit_n_delta_p", "salt_passage")
WARN_SIGMA = 4.0
SENSITIVITY_SIGMAS = (4.0, 5.0, 6.0, 6.6, 8.0, 10.0, 12.2)

def robust_sigma(df: pd.DataFrame, signal: str) -> float:
    """Median across cycles of each clean window's MAD-based sigma.

    MAD rather than std so a single spike in a freshly-cleaned window cannot inflate the bar
    it is being measured against.
    """
    sigmas = []
    for _, cyc in df.groupby(["unit_id", "cycle_id"]):
        early = cyc[cycle_days(cyc) <= CLEAN_DAYS][signal].dropna()
        if len(early) >= 3:
            mad = (early - early.median()).abs().median()
            if mad > 0:
                sigmas.append(1.4826 * mad)
    return float(np.median(sigmas)) if sigmas else float("nan")


def warn_rise_for(df: pd.DataFrame, signal: str) -> float:
    """The raw-unit threshold WARN_SIGMA corresponds to for this signal."""
    return WARN_SIGMA * robust_sigma(df, signal)


def cip_events(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["unit_id", "cycle_id", "reading_date"])
    return df[df["cip"] == True][["unit_id", "cycle_id", "reading_date"]].drop_duplicates()

def evaluate_signal(df: pd.DataFrame, signal: str, warn_rise: float) -> dict:
    tps, fps, fns = 0, 0, 0
    lead_days = []
    
    events = cip_events(df)
    
    for (u, c), cyc in df.groupby(["unit_id", "cycle_id"]):
        cyc = cyc.sort_values("reading_date")
        anchor = clean_anchor(cyc, signal)
        if anchor is None:
            continue
            
        is_warning = cyc[signal] >= anchor + warn_rise
        sustained = is_warning.rolling(MIN_SUSTAINED_WARNING_DAYS).sum() >= MIN_SUSTAINED_WARNING_DAYS
        warn_dates = cyc.loc[sustained, "reading_date"]
        
        cip_in_cycle = events[(events["unit_id"] == u) & (events["cycle_id"] == c)]
        has_cip = not cip_in_cycle.empty
        
        if warn_dates.empty:
            if has_cip:
                fns += 1
            continue
            
        first_warn = warn_dates.iloc[0]
        
        if has_cip:
            cip_date = cip_in_cycle.iloc[0]["reading_date"]
            lead = (cip_date - first_warn).days
            if 0 <= lead <= HORIZON_DAYS:
                tps += 1
                lead_days.append(lead)
            elif lead > HORIZON_DAYS:
                fps += 1
                fns += 1  # Missed the actual CIP window
            else:
                # lead < 0: the warning fired AFTER the CIP, so it predicted nothing. This
                # branch did not exist, so such cycles were counted as neither TP, FP nor
                # FN — they vanished from the denominator and flattered precision.
                fps += 1
                fns += 1
        else:
            fps += 1

    precision = tps / (tps + fps) if (tps + fps) > 0 else 0.0
    recall = tps / (tps + fns) if (tps + fns) > 0 else 0.0
    
    return {
        "signal": signal,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "tps": tps,
        "fps": fps,
        "fns": fns,
        "median_lead_days": float(np.median(lead_days)) if lead_days else None,
        "p25_lead_days": float(np.percentile(lead_days, 25)) if lead_days else None,
        "p75_lead_days": float(np.percentile(lead_days, 75)) if lead_days else None,
        "score": (precision + recall) / 2.0
    }

def compute_baseline_error(df: pd.DataFrame) -> float:
    """FR-008/009: how far the clean anchor misses a clean reading it has not seen.

    Leave-one-out over each cycle's clean window. The previous version fitted the anchor on
    the whole window and then scored it against that same window, so it reported the window's
    own mean absolute deviation — a number that can only shrink as readings are added and
    never says anything about predictive accuracy.
    """
    errors = []
    for (u, c), cyc in df.groupby(["unit_id", "cycle_id"]):
        early = cyc[cycle_days(cyc) <= CLEAN_DAYS]      # not days_since_replacement
        vals = early["unit_n_delta_p"].dropna().to_numpy(float)
        if len(vals) < 4:            # need >=3 to form an anchor, +1 to hold out
            continue
        total = vals.sum()
        for i, held_out in enumerate(vals):
            anchor_without_i = (total - held_out) / (len(vals) - 1)
            errors.append(abs(held_out - anchor_without_i))
    return float(np.mean(errors)) if errors else 0.0

def attributions(df: pd.DataFrame) -> pd.DataFrame:
    ranked = percentile_ranks(df)
    rows = [a for _, cyc in ranked.groupby(["unit_id", "cycle_id"])
            if (a := attribute_cycle(cyc))]
    return pd.DataFrame(rows)

def main():
    df = load_readings()
    events = cip_events(df)
    
    # Rank candidate signals against the same statistical bar (FR-010/FR-011). Each
    # signal's raw threshold is derived from its own clean-window spread, so the comparison
    # is like-for-like rather than a comparison of how kind each hand-picked number was.
    thresholds = {sig: warn_rise_for(df, sig) for sig in CANDIDATE_SIGNALS}
    results = []
    for sig, rise in thresholds.items():
        r = evaluate_signal(df, sig, rise)
        r["warn_sigma"] = WARN_SIGMA
        r["warn_rise_raw"] = round(rise, 4)      # auditable: what the bar was in real units
        results.append(r)
    results.sort(key=lambda x: x["score"], reverse=True)
    best_signal = results[0]
    
    # Threshold sensitivity — publish it rather than only the chosen operating point, so a
    # reader can see how much the ranking and the lead time depend on WARN_SIGMA.
    sigmas = {sig: robust_sigma(df, sig) for sig in CANDIDATE_SIGNALS}
    sensitivity = []
    for sg in SENSITIVITY_SIGMAS:
        for sig in CANDIDATE_SIGNALS:
            r = evaluate_signal(df, sig, sg * sigmas[sig])
            sensitivity.append({
                "warn_sigma": sg, "signal": sig,
                "warn_rise_raw": round(sg * sigmas[sig], 4),
                "precision": r["precision"], "recall": r["recall"], "tps": r["tps"],
                "median_lead_days": r["median_lead_days"], "score": round(r["score"], 3),
            })

    baseline_error = compute_baseline_error(df)
    
    att = attributions(df)
    fouled = att[att["attributed_mechanism"] != "no-significant-fouling"]
    att.to_csv(DATA / "attributions.csv", index=False)
    
    mechanism_mix = fouled["attributed_mechanism"].value_counts().to_dict()
    
    report = {
        "pre_registered_params": {
            "horizon_days": HORIZON_DAYS,
            "min_sustained_warning_days": MIN_SUSTAINED_WARNING_DAYS,
            "warn_sigma": WARN_SIGMA,
            # the raw-unit bar each candidate was actually held to, so the ranking is auditable
            "warn_rise_raw": {s: round(t, 4) for s, t in thresholds.items()},
        },
        "total_cip_events": len(events),
        "detected_cycles": len(att),
        "baseline_error": round(baseline_error, 3),
        "leading_indicator": best_signal,
        "alternative_indicators": results[1:],
        "sensitivity": sensitivity,
        "mechanism_mix": mechanism_mix,
        "data_limits": [
            "scaling species not identified — no individual ions in feed",
            "biofouling vs organic not separable — no microbial/AOC signal",
            "turbidity is an SDI proxy, not ASTM D4189 SDI"
        ]
    }
    
    with open(DATA / "validation_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("=" * 68)
    print("SPEC 005 — FOULING VALIDATION & SOURCE ATTRIBUTION")
    print("=" * 68)
    print(f"  Best Signal         : {best_signal['signal']} (score: {best_signal['score']:.2f})")
    print(f"  CIP events          : {len(events)}")
    print(f"  True Positives      : {best_signal['tps']}")
    print(f"  Precision           : {best_signal['precision'] * 100:.1f}%")
    print(f"  Recall              : {best_signal['recall'] * 100:.1f}%")
    print(f"  Median Lead Time    : {best_signal['median_lead_days']} days")
    print(f"  Baseline Error      : {baseline_error:.3f}")
    print(f"\n  SOURCE ATTRIBUTION  : {len(fouled)} significant-fouling cycles")
    for m, n in mechanism_mix.items():
        print(f"      {m:<24} {n}")
    print(f"\nsaved → {DATA/'validation_report.json'}")

if __name__ == "__main__":
    main()
