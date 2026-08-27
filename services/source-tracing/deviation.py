#!/usr/bin/env python3
"""
Spec 003 — Physics Deviation Engine (prototype).

Gives every reading a confound-free health signal: the deviation of the actual reading
from the expected *clean-membrane* value under the same cycle, per metric.

Fidelity levels (FR-010/FR-011):
  - "analytical"  : empirical clean anchor = the freshly-cleaned start of each cleaning
                    cycle (post-CIP), on temperature-normalized signals — fast, all readings.
  - "high"        : WaterTAP ReverseOsmosis0D physics baseline — demonstrated on a sample
                    (see physics_baseline()); the production upgrade.

Honesty (spec 003): whole-unit resolution only (no element localization); every deviation
carries provenance (metric, baseline, cycle position, measured/modeled, fidelity, out-of-range).
`unit_n_delta_p` is already temperature-normalized → it is the D4516-aligned confound-free
quantity (see EVIDENCE.md Pillar 4).
"""
from __future__ import annotations
import pathlib
import numpy as np
import pandas as pd
from common import load_readings, DATA, clean_anchor as _clean_anchor, CLEAN_DAYS

# metrics we interpret, and whether a rise means worse membrane health
METRICS = {
    "unit_n_delta_p": {"worse": "up",   "provenance": "measured"},
    "salt_passage":   {"worse": "up",   "provenance": "measured"},
    "unit_recovery":  {"worse": "down", "provenance": "measured"},
}
CLEAN_DAYS = 10          # first N days of a cycle define the freshly-cleaned anchor
OUT_OF_RANGE_Z = 4.0     # |z| beyond this => flag low-confidence/out-of-range


def _safe_std(series) -> float:
    """Cycle std for z-scoring; guards NaN (single-value cycle) so out-of-range can still fire."""
    v = series.std()
    return float(v) if (v and not np.isnan(v)) else 1.0


# Re-exported from common so 003/004/005/006 share ONE definition. This module used to keep
# its own copy; they agreed by coincidence until either was touched.
clean_anchor = _clean_anchor


def compute(df: pd.DataFrame) -> pd.DataFrame:
    out = []
    for (unit, cycle), cyc in df.groupby(["unit_id", "cycle_id"]):
        cyc = cyc.sort_values("reading_date")
        anchors = {m: clean_anchor(cyc, m) for m in METRICS}
        stds = {m: _safe_std(cyc[m]) for m in METRICS}
        for _, r in cyc.iterrows():
            for m, meta in METRICS.items():
                exp = anchors[m]
                actual = r[m]
                if exp is None or pd.isna(actual):
                    out.append(dict(unit_id=unit, cycle_id=cycle, reading_date=r["reading_date"],
                                    metric=m, deviation=np.nan, deviation_pct=np.nan,
                                    fidelity="analytical", provenance=meta["provenance"],
                                    status="unavailable"))
                    continue
                dev = actual - exp
                z = dev / stds[m]
                # orient so positive deviation == worse health
                signed = dev if meta["worse"] == "up" else -dev
                # ...and orient the percentage the SAME way. It used the raw dev, so for
                # unit_recovery (worse == "down") `deviation` and `deviation_pct` carried
                # opposite signs on the same row — a UI showing both contradicted itself.
                dev_pct = 100.0 * signed / abs(exp) if exp else np.nan
                status = "out-of-range" if abs(z) > OUT_OF_RANGE_Z else "ok"
                out.append(dict(unit_id=unit, cycle_id=cycle, reading_date=r["reading_date"],
                                metric=m, expected_clean=round(exp, 3),
                                actual=round(float(actual), 3),
                                deviation=round(float(signed), 3),
                                deviation_pct=round(float(dev_pct), 2),
                                fidelity="analytical", provenance=meta["provenance"],
                                resolution="whole-unit", status=status))
    return pd.DataFrame(out)


def physics_baseline(sample_tds_ppm=1500, temp_c=23.0, recovery=0.85, pressure_bar=15.0):
    """High-fidelity WaterTAP clean-membrane baseline for one operating point (FR-010 'high').
    Demonstrates the physics path; returns None if WaterTAP/solver unavailable (graceful, FR-011)."""
    try:
        import pyomo.environ as pyo
        from idaes.core import FlowsheetBlock
        from idaes.core.solvers import get_solver
        from idaes.core.util.scaling import calculate_scaling_factors
        from watertap.property_models.NaCl_prop_pack import NaClParameterBlock
        from watertap.unit_models.reverse_osmosis_0D import (
            ReverseOsmosis0D, ConcentrationPolarizationType, MassTransferCoefficient)
    except Exception as e:
        return {"available": False, "reason": str(e)}
    try:
        # mirrors the validated spike_watertap.py setup (port-based DOF fixing)
        m = pyo.ConcreteModel()
        m.fs = FlowsheetBlock(dynamic=False)
        m.fs.properties = NaClParameterBlock()
        # BWRO scaling: NaCl stream ~500x smaller than H2O — required for low-salinity convergence
        m.fs.properties.set_default_scaling("flow_mass_phase_comp", 1, index=("Liq", "H2O"))
        m.fs.properties.set_default_scaling("flow_mass_phase_comp", 1e3, index=("Liq", "NaCl"))
        m.fs.unit = ReverseOsmosis0D(
            property_package=m.fs.properties,
            concentration_polarization_type=ConcentrationPolarizationType.none,
            mass_transfer_coefficient=MassTransferCoefficient.none)
        nacl = sample_tds_ppm * 1e-6            # kg/s per 1 kg/s feed (BWRO)
        m.fs.unit.inlet.flow_mass_phase_comp[0, "Liq", "H2O"].fix(1.0 - nacl)
        m.fs.unit.inlet.flow_mass_phase_comp[0, "Liq", "NaCl"].fix(nacl)
        m.fs.unit.inlet.temperature[0].fix(273.15 + temp_c)
        m.fs.unit.inlet.pressure[0].fix(pressure_bar * 1e5)
        m.fs.unit.A_comp[0, "H2O"].fix(4.2e-12)
        m.fs.unit.B_comp[0, "NaCl"].fix(3.5e-8)
        m.fs.unit.area.fix(50)
        m.fs.unit.permeate.pressure[0].fix(101325)
        calculate_scaling_factors(m)
        m.fs.unit.initialize(outlvl=0)
        res = get_solver().solve(m)
        ok = "optimal" in str(res.solver.termination_condition).lower()
        flux = pyo.value(m.fs.unit.flux_mass_phase_comp_avg[0, "Liq", "H2O"]) * 3600
        rej = pyo.value(m.fs.unit.rejection_phase_comp[0, "Liq", "NaCl"]) * 100
        return {"available": True, "fidelity": "high", "solver_status": str(res.solver.termination_condition),
                "clean_water_flux_kg_m2_h": round(flux, 2), "clean_salt_rejection_pct": round(rej, 2),
                "operating_point": dict(tds_ppm=sample_tds_ppm, temp_c=temp_c, pressure_bar=pressure_bar)}
    except Exception as e:
        # graceful degradation (FR-011): physics unavailable → analytical path already covered all readings
        return {"available": True, "solve_failed": str(e)[:120], "fallback": "analytical"}


def main():
    df = load_readings()
    dev = compute(df)
    out = DATA / "deviations.csv"
    dev.to_csv(out, index=False)

    ok = dev[dev["status"].isin(["ok", "out-of-range"])]
    print("=" * 68)
    print(f"SPEC 003 — PHYSICS DEVIATION ENGINE  ·  {len(dev):,} deviation records")
    print(f"  readings interpreted : {df.shape[0]:,} across {df['unit_id'].nunique()} units")
    print(f"  coverage             : {100*len(ok)/len(dev):.1f}% computed, "
          f"{100*(dev['status']=='unavailable').mean():.1f}% explicit-unavailable")
    print(f"  out-of-range flagged : {(dev['status']=='out-of-range').sum():,}")
    print("=" * 68)
    print("\nMean |deviation %| by metric (fouling signal strength):")
    print(ok.assign(a=ok['deviation_pct'].abs()).groupby('metric')['a'].mean().round(2).to_string())

    print("\nHigh-fidelity WaterTAP baseline check (FR-010):")
    print(" ", physics_baseline())
    print(f"\nsaved → {out}")


if __name__ == "__main__":
    main()
