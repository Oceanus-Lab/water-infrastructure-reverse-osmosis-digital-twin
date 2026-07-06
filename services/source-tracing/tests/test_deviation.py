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
    # Test graceful fallback when pyomo fails
    import pyomo.environ as pyo
    def mock_model():
        raise Exception("Mock failure")
    monkeypatch.setattr(pyo, "ConcreteModel", mock_model)
    res = physics_baseline()
    assert res["available"] is True
    assert res.get("fallback") == "analytical"

def test_compute_out_of_range():
    df = pd.DataFrame({
        "unit_id": ["A1"] * 5,
        "cycle_id": ["c1"] * 5,
        "reading_date": pd.to_datetime(["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04", "2020-01-05"]),
        "days_since_replacement": [1, 2, 3, 4, 5],
        "unit_n_delta_p": [1.0, 1.0, 1.0, 1.0, 100.0],  # huge deviation
        "salt_passage": [10.0, 10.0, 10.0, 10.0, 10.0],
        "unit_recovery": [85.0, 85.0, 85.0, 85.0, 85.0],
    })
    out = compute(df)
    oor = out[out["status"] == "out-of-range"]
    assert len(oor) == 1
    assert oor.iloc[0]["metric"] == "unit_n_delta_p"

