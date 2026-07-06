#!/usr/bin/env python3
"""
Spec 007 — AI Assistant (prototype, advise-only).

Composes the outputs of specs 003–006 into a per-unit decision briefing for the operator's
core question: "should we clean this unit now, and why?" Every statement is backed by an
actual number from an upstream module — no bare claims, no fabricated values (AGENTS.md
no-hallucinated-numbers guardrail). Advise-only / read-only: it never actuates equipment.

Production path (docs/04-ai-agent.md): Gemini on the Agent Platform with these module
outputs exposed as tools (physics-deviation, forecast, fouling, economics) + RAG over the
cited EVIDENCE.md. This prototype is the deterministic evidence-composer of the same contract.
"""
from __future__ import annotations
import pandas as pd
from common import load_readings, DATA


def _load(name) -> pd.DataFrame:
    f = DATA / name
    return pd.read_csv(f) if f.exists() else pd.DataFrame()


def latest_per_unit(df, key="cycle_id"):
    return df.sort_values(key).groupby("unit_id").tail(1) if not df.empty else df


def brief(unit: str, fc, att, econ) -> str:
    lines = [f"── Unit {unit} — cleaning decision briefing (advise-only) ──"]
    f = fc[fc["unit_id"] == unit]
    # only GENUINELY significant cycles count as attribution evidence (no self-contradiction)
    a = att[(att["unit_id"] == unit) &
            (att["attributed_mechanism"] != "no-significant-fouling")]
    e = econ[econ["unit_id"] == unit]
    frow = f.iloc[-1] if not f.empty else None
    erow = e.iloc[-1] if not e.empty else None

    # 003/004 — fouling state & forecast (NaN-safe: never print a bare 'nan')
    if frow is not None:
        rate = frow["fouling_rate_per_day"]
        if pd.isna(rate):
            lines.append("• Fouling trend (003/004): insufficient valid readings this cycle "
                         "to fit a trend (signal gap) — no forecast emitted.")
        else:
            dtc = frow["days_to_clean"]
            lines.append(f"• Fouling trend (003/004): ΔP rising {rate:.4f}/day "
                         f"(R²={frow['trend_r2']:.2f}); current rise {frow['current_rise']:+.2f}. "
                         f"Projected days-to-clean: {'—' if pd.isna(dtc) else f'{dtc:.0f} d'}. "
                         f"Anomalies flagged: {int(frow.get('anomalies_count', 0))}." )
    # 005 — source attribution
    if not a.empty:
        r = a.sort_values("cycle_id").iloc[-1]
        lines.append(f"• Source attribution (005): latest significant cycle → "
                     f"{r['attributed_mechanism']} ({r['confidence']}). Evidence: ΔP rise "
                     f"{r['ndp_rise']:+.1f}, rejection change {r['rej_change_pct']:+.2f}%.")
    else:
        lines.append("• Source attribution (005): no significant-fouling cycle on record.")
    # 006 — economics (fold the model's own verdict in)
    if erow is not None:
        lines.append(f"• Economics (006): daily energy penalty ${erow['daily_energy_penalty_usd']:.2f}, "
                     f"accrued ${erow['cum_energy_penalty_usd']:.0f} vs CIP ${erow['cip_cost_usd']:.0f} "
                     f"→ cost model says {erow['recommendation']}.")

    # composed recommendation (evidence-gated; folds forecast + economics)
    rec, why = "MONITOR", "fouling within normal cycle economics"
    if frow is not None and pd.notna(frow["days_to_clean"]) and frow["days_to_clean"] <= 21:
        rec, why = "SCHEDULE CIP SOON", f"projected to hit action threshold in ~{frow['days_to_clean']:.0f} days"
    elif erow is not None and str(erow["recommendation"]) == "CLEAN NOW":
        rec, why = "SCHEDULE CIP SOON", "energy-penalty cost model recommends cleaning"
    if frow is not None and pd.notna(frow.get("anomalies_count")) and int(frow.get("anomalies_count", 0)) >= 8:
        why += f"; {int(frow.get('anomalies_count', 0))} anomalies warrant inspection"
    lines.append(f"→ RECOMMENDATION: {rec} — {why}. (operator decides; system does not actuate)")
    return "\n".join(lines)


def main():
    df = load_readings()
    fc = latest_per_unit(_load("forecasts.csv"))
    att = _load("attributions.csv")
    econ = latest_per_unit(_load("economics.csv"))
    if fc.empty:
        raise SystemExit("run deviation.py, forecast_anomaly.py, fouling_validation.py, "
                         "economics.py first to generate module outputs")

    print("=" * 70)
    print("SPEC 007 — AI ASSISTANT  ·  advise-only decision briefings")
    print("=" * 70)
    # rank units by urgency (soonest days-to-clean) and brief the top few
    urgent = fc[fc["days_to_clean"].notna()].sort_values("days_to_clean")
    for unit in urgent["unit_id"].head(3):
        print("\n" + brief(unit, fc, att, econ))
    print("\n" + "-" * 70)
    print("All 21 units briefed → data/briefings.txt")

    with open(DATA / "briefings.txt", "w") as fh:
        for unit in sorted(df["unit_id"].unique()):
            fh.write(brief(unit, fc, att, econ) + "\n\n")


if __name__ == "__main__":
    main()
