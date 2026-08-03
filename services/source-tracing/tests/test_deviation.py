import pytest
import pandas as pd
import numpy as np
from deviation import compute, physics_baseline, clean_anchor

def test_compute_unavailable():
    # Test that missing actual values produce 'unavailable' status
    df = pd.DataFrame({
        "unit_id": ["A1", "A1", "A1", "A1"],
        "cycle_id": ["c1", "c1", "c1", "c1"],
        "reading_date": pd.to_datetime(["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04"]),
        "days_since_replacement": [1, 2, 3, 4],
        "unit_n_delta_p": [1.0, 1.1, 1.2, np.nan],  # fourth row missing actual
        "salt_passage": [10.0, 10.5, 11.0, 11.5],
        "unit_recovery": [85.0, 84.5, 84.0, 83.5],
    })
    
    out = compute(df)
    
    # The output has 3 metrics * 4 rows = 12 rows
    unavailable = out[out["status"] == "unavailable"]
    assert not unavailable.empty
    assert len(unavailable) == 1
    assert unavailable.iloc[0]["metric"] == "unit_n_delta_p"
    assert pd.isna(unavailable.iloc[0]["deviation"])

def test_physics_baseline():
    res = physics_baseline()
    assert isinstance(res, dict)
    assert "available" in res
    if res["available"]:
        assert "clean_water_flux_kg_m2_h" in res

def test_physics_baseline_fail(monkeypatch):
    # Only meaningful when the WaterTAP/Pyomo stack is installed; skip otherwise (FR-011).
    pyo = pytest.importorskip("pyomo.environ")
    def mock_model():
        raise Exception("Mock failure")
    monkeypatch.setattr(pyo, "ConcreteModel", mock_model)
    res = physics_baseline()
    assert res["available"] is True
    assert res.get("fallback") == "analytical"

def test_compute_out_of_range():
    # out-of-range fires on |z| > 4 where z uses the *cycle* std. A single huge spike
    # inflates its own std, so it paradoxically won't flag; a moderate deviation against
    # a tight baseline does. So: 19 tight readings + one moderate late spike that sits
    # OUTSIDE the clean-anchor window (day 20 > min + CLEAN_DAYS).
    n = 20
    dp = [1.0] * (n - 1) + [3.0]
    df = pd.DataFrame({
        "unit_id": ["A1"] * n,
        "cycle_id": ["c1"] * n,
        "reading_date": pd.date_range("2020-01-01", periods=n, freq="D"),
        "days_since_replacement": list(range(1, n + 1)),
        "unit_n_delta_p": dp,
        "salt_passage": [10.0] * n,
        "unit_recovery": [85.0] * n,
    })
    out = compute(df)
    oor = out[out["status"] == "out-of-range"]
    assert len(oor) == 1
    assert oor.iloc[0]["metric"] == "unit_n_delta_p"


def test_physics_baseline_unavailable_degrades_gracefully():
    # With or without the Pyomo/WaterTAP stack, physics_baseline must return a dict with
    # an 'available' flag and never raise (FR-011 graceful degradation).
    res = physics_baseline()
    assert isinstance(res, dict) and "available" in res
    if not res["available"]:
        assert "reason" in res

