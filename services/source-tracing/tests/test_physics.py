"""Physics service contract.

physics.py exists because deviation.physics_baseline() proved the WaterTAP path solves but
nothing ever called it at request time — the Simulation specialist read a linear trend, so
"simulation" named something the system did not do.

WaterTAP is deliberately absent from requirements-dev.txt (the Pyomo/IDAES/Ipopt stack is
heavy and ships no solver via pip), so the solve tests skip without it while the envelope and
degradation tests — the parts that must hold whether or not it is installed — always run.
"""
import pytest

import physics


def _watertap_available() -> bool:
    return physics.simulate().get("fidelity") == "high"


needs_watertap = pytest.mark.skipif(
    not _watertap_available(), reason="WaterTAP/Ipopt not installed in this environment"
)


# ── envelope: these run everywhere ────────────────────────────────────────────────────

@pytest.mark.parametrize("kwargs,bad", [
    ({"tds_ppm": 35000}, "tds_ppm"),      # seawater — a different flowsheet
    ({"tds_ppm": 10}, "tds_ppm"),
    ({"temp_c": 80}, "temp_c"),
    ({"pressure_bar": 200}, "pressure_bar"),
    ({"recovery": 1.5}, "recovery"),
])
def test_out_of_envelope_is_refused_by_name(kwargs, bad):
    r = physics.simulate(**kwargs)
    assert r["available"] is False
    assert r["out_of_envelope"] is True
    assert bad in r["reason"], "the reason must name the offending parameter"


def test_envelope_check_precedes_the_solver():
    """An out-of-envelope point must not reach the solver even when WaterTAP is installed.

    Otherwise a seawater-salinity request would return a confident number from a brackish
    flowsheet — worse than refusing.
    """
    r = physics.simulate(tds_ppm=35000)
    assert "solver_status" not in r and "solve_failed" not in r


def test_result_always_carries_availability():
    """FR-011: every entry point reports availability rather than raising."""
    for r in (physics.simulate(), physics.simulate(tds_ppm=35000)):
        assert "available" in r


# ── solves: skipped without WaterTAP ──────────────────────────────────────────────────

@needs_watertap
def test_clean_membrane_solve_is_physically_sane():
    r = physics.simulate()
    assert r["fidelity"] == "high"
    assert "optimal" in r["solver_status"].lower()
    # BWRO at 1500 ppm: a few tens of kg/m2/h, and rejection well above 95%.
    assert 5.0 < r["clean_water_flux_kg_m2_h"] < 60.0
    assert 95.0 < r["clean_salt_rejection_pct"] <= 100.0
    assert r["provenance"] == "modeled"


@needs_watertap
def test_repeat_solves_are_cached():
    physics._CACHE.clear()
    assert physics.simulate().get("cached") is False
    assert physics.simulate().get("cached") is True


@needs_watertap
def test_higher_pressure_raises_flux():
    """Directional check — the solve should follow the physics, not merely converge.

    Both points are inside the window that actually solves at the default 50 m2. Measured
    across pressure: 12 bar infeasible, 15 -> 19.09, 18 -> 23.51, 20 -> 26.45, 25 fails to
    initialise. LIMITS allows 5-60 bar because it is a coarse guard on obviously-wrong input;
    the feasible window is narrower and depends on area, which is what the infeasibility hint
    exists to explain.
    """
    low = physics.simulate(pressure_bar=15)
    high = physics.simulate(pressure_bar=20)
    assert low["fidelity"] == "high" and high["fidelity"] == "high"
    assert high["clean_water_flux_kg_m2_h"] > low["clean_water_flux_kg_m2_h"]


@needs_watertap
def test_what_if_reports_a_delta():
    w = physics.what_if({"pressure_bar": 15}, {"pressure_bar": 20})
    assert w["delta"]["flux_kg_m2_h"] > 0
    assert w["change"] == {"pressure_bar": 20}


@needs_watertap
def test_infeasible_combination_explains_itself():
    """Measured: 23 C solves at 50 m2, 30 C does not, 30 C at 30 m2 does.

    Feasibility is a property of the combination, so the envelope check cannot catch it. The
    caller must still be able to tell an infeasible operating point from a broken service.
    """
    r = physics.simulate(temp_c=30, membrane_area_m2=50)
    assert r["available"] is True
    assert r["solve_failed"] == "infeasible"
    assert "membrane_area_m2" in r["hint"]
    assert r["operating_point"]["temp_c"] == 30

    assert physics.simulate(temp_c=30, membrane_area_m2=30)["fidelity"] == "high"
