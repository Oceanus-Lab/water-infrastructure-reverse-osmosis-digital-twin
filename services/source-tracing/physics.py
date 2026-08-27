#!/usr/bin/env python3
"""
WaterTAP physics as a callable service function (spec 003 fidelity="high").

deviation.physics_baseline() proved the physics path works — it solves to optimal and returns
a clean-membrane flux and rejection — but nothing called it at request time. The Simulation
specialist read /api/forecast, a linear trend, so the "simulation" in its name was aspiration.
This makes the solve reachable per operating point, which is what a what-if question needs.

Two things a caller must know:

  * A solve takes seconds, not milliseconds. Results are cached on the rounded operating
    point, since an operator sweeping a slider revisits the same points constantly.
  * WaterTAP may be absent (it is deliberately not in requirements-dev.txt — the whole
    Pyomo/IDAES/Ipopt stack is heavy). Every entry point degrades to available=False with a
    reason rather than raising, matching FR-011.
"""
from __future__ import annotations

from typing import Any

# Operating envelope. Outside these the BWRO flowsheet stops being the right model, and an
# unconstrained solve would return a confident number for a plant that cannot exist.
LIMITS = {
    "tds_ppm":      (200.0, 10_000.0),   # brackish; above this is SWRO territory
    "temp_c":       (5.0, 45.0),
    "pressure_bar": (5.0, 60.0),
    "recovery":     (0.30, 0.95),
}

_CACHE: dict[tuple, dict] = {}
_CACHE_MAX = 512


def validate(tds_ppm: float, temp_c: float, pressure_bar: float, recovery: float) -> str | None:
    """Return a human-readable reason the point is out of envelope, or None if it is fine."""
    for name, value in (("tds_ppm", tds_ppm), ("temp_c", temp_c),
                        ("pressure_bar", pressure_bar), ("recovery", recovery)):
        lo, hi = LIMITS[name]
        if not (lo <= value <= hi):
            return f"{name}={value} is outside the BWRO envelope [{lo}, {hi}]"
    return None


def simulate(tds_ppm: float = 1500.0, temp_c: float = 23.0,
             pressure_bar: float = 15.0, recovery: float = 0.85,
             membrane_area_m2: float = 50.0) -> dict[str, Any]:
    """Solve the clean-membrane BWRO flowsheet at one operating point.

    Returns a dict that always carries `available`; on success it also carries
    `fidelity="high"`, which is the flag 003 propagates downstream through
    common.load_deviation_bus.
    """
    reason = validate(tds_ppm, temp_c, pressure_bar, recovery)
    if reason:
        return {"available": False, "reason": reason, "out_of_envelope": True}

    key = (round(tds_ppm, 1), round(temp_c, 2), round(pressure_bar, 2),
           round(recovery, 3), round(membrane_area_m2, 1))
    if key in _CACHE:
        return {**_CACHE[key], "cached": True}

    try:
        import pyomo.environ as pyo
        from idaes.core import FlowsheetBlock
        from idaes.core.solvers import get_solver
        from idaes.core.util.scaling import calculate_scaling_factors
        from watertap.property_models.NaCl_prop_pack import NaClParameterBlock
        from watertap.unit_models.reverse_osmosis_0D import (
            ConcentrationPolarizationType, MassTransferCoefficient, ReverseOsmosis0D)
    except Exception as exc:                      # FR-011: degrade, never raise
        return {"available": False, "reason": f"WaterTAP not installed: {exc}"}

    try:
        m = pyo.ConcreteModel()
        m.fs = FlowsheetBlock(dynamic=False)
        m.fs.properties = NaClParameterBlock()
        # BWRO scaling: the NaCl stream is ~500x smaller than H2O. Without this the solve
        # does not converge at low salinity.
        m.fs.properties.set_default_scaling("flow_mass_phase_comp", 1, index=("Liq", "H2O"))
        m.fs.properties.set_default_scaling("flow_mass_phase_comp", 1e3, index=("Liq", "NaCl"))
        m.fs.unit = ReverseOsmosis0D(
            property_package=m.fs.properties,
            concentration_polarization_type=ConcentrationPolarizationType.none,
            mass_transfer_coefficient=MassTransferCoefficient.none)

        nacl = tds_ppm * 1e-6                     # kg/s per 1 kg/s feed
        m.fs.unit.inlet.flow_mass_phase_comp[0, "Liq", "H2O"].fix(1.0 - nacl)
        m.fs.unit.inlet.flow_mass_phase_comp[0, "Liq", "NaCl"].fix(nacl)
        m.fs.unit.inlet.temperature[0].fix(273.15 + temp_c)
        m.fs.unit.inlet.pressure[0].fix(pressure_bar * 1e5)
        m.fs.unit.A_comp[0, "H2O"].fix(4.2e-12)
        m.fs.unit.B_comp[0, "NaCl"].fix(3.5e-8)
        m.fs.unit.area.fix(membrane_area_m2)
        m.fs.unit.permeate.pressure[0].fix(101325)

        calculate_scaling_factors(m)
        m.fs.unit.initialize(outlvl=0)
        res = get_solver().solve(m)
        status = str(res.solver.termination_condition)
        if "optimal" not in status.lower():
            out = {"available": True, "solve_failed": status, "fallback": "analytical",
                   "operating_point": {
                       "tds_ppm": tds_ppm, "temp_c": temp_c, "pressure_bar": pressure_bar,
                       "recovery": recovery, "membrane_area_m2": membrane_area_m2}}
            if "infeasible" in status.lower():
                # Infeasibility here is a property of the COMBINATION, not of any one value
                # being out of range — which is why the envelope check above cannot catch it.
                # Warmer feed means higher water permeability, so at a fixed area and feed
                # flow the permeate demand outruns what the feed can supply. Measured: 23 C
                # solves at 50 m2, 30 C does not, and 30 C at 30 m2 solves again. Say that,
                # rather than leaving the caller to read "infeasible" as a broken service.
                out["hint"] = (
                    "No feasible solution at this combination. Higher feed temperature raises "
                    "permeability, so at a fixed area and feed flow the permeate demand can "
                    "exceed the feed. Try a smaller membrane_area_m2 or a lower temp_c."
                )
            return out

        flux = pyo.value(m.fs.unit.flux_mass_phase_comp_avg[0, "Liq", "H2O"]) * 3600
        rejection = pyo.value(m.fs.unit.rejection_phase_comp[0, "Liq", "NaCl"]) * 100
        out = {
            "available": True,
            "fidelity": "high",
            "solver_status": status,
            "clean_water_flux_kg_m2_h": round(flux, 3),
            "clean_salt_rejection_pct": round(rejection, 3),
            "operating_point": {
                "tds_ppm": tds_ppm, "temp_c": temp_c, "pressure_bar": pressure_bar,
                "recovery": recovery, "membrane_area_m2": membrane_area_m2,
            },
            "model": "WaterTAP ReverseOsmosis0D (NaCl property package)",
            "provenance": "modeled",
        }
        if len(_CACHE) >= _CACHE_MAX:
            _CACHE.clear()
        _CACHE[key] = out
        return {**out, "cached": False}
    except Exception as exc:
        return {"available": True, "solve_failed": str(exc)[:160], "fallback": "analytical"}


def what_if(base: dict[str, float], change: dict[str, float]) -> dict[str, Any]:
    """Solve twice — as-is and with `change` applied — and report the delta.

    Deltas rather than absolutes, per the project's economics framing: the absolute flux
    carries model uncertainty that largely cancels between two solves of the same flowsheet.
    """
    baseline = simulate(**base)
    scenario = simulate(**{**base, **change})

    delta = None
    if baseline.get("fidelity") == "high" and scenario.get("fidelity") == "high":
        delta = {
            "flux_kg_m2_h": round(scenario["clean_water_flux_kg_m2_h"]
                                  - baseline["clean_water_flux_kg_m2_h"], 3),
            "rejection_pct": round(scenario["clean_salt_rejection_pct"]
                                   - baseline["clean_salt_rejection_pct"], 3),
        }
    return {"baseline": baseline, "scenario": scenario, "change": change, "delta": delta}
