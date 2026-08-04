import pytest
import pandas as pd
import numpy as np
from economics import unit_economics, PARAMS, SIGNAL

def test_unit_economics_delta_and_breakeven():
    """Test that delta SEC logic and break-even calculations work, and provenance is added."""
    # Create a synthetic cycle: 10 days, fouling rises by 0.5 psi per day
    days = 10
    dp_rise = np.linspace(0.0, 5.0, days)
    df = pd.DataFrame({
        "unit_id": ["A01"] * days,
        "bank_id": ["A"] * days,
        "cycle_id": [1] * days,
        "days_since_replacement": range(days),
        "reading_date": pd.date_range("2020-01-01", periods=days, freq="D"),
        SIGNAL: dp_rise
    })
    
    # Run with default params
    res = unit_economics(df, PARAMS)
    
    assert res is not None
    assert res["unit_id"] == "A01"
    assert res["provenance"] == "modeled"  # A01 is modeled
    assert res["credibility"] == "medium"
    
    assert res["dp_rise_psi"] > 0
    assert res["daily_energy_penalty_usd"] > 0
    assert res["cum_energy_penalty_usd"] > 0
    
    # Break-even day should be present
    assert res["break_even_day"] is not None
    assert isinstance(res["break_even_day"], int)

def test_unit_economics_provenance_measured():
    """Test provenance assignment for measured banks."""
    df = pd.DataFrame({
        "unit_id": ["F01"] * 5,
        "bank_id": ["F"] * 5,
        "cycle_id": [1] * 5,
        "days_since_replacement": range(5),
        "reading_date": pd.date_range("2020-01-01", periods=5, freq="D"),
        SIGNAL: [0, 1, 2, 3, 4]
    })
    res = unit_economics(df, PARAMS)
    assert res["provenance"] == "measured"
    assert res["credibility"] == "high"

def test_unit_economics_override_sensitivity():
    """Test that an override parameter changes the daily penalty."""
    df = pd.DataFrame({
        "unit_id": ["A01"] * 5,
        "bank_id": ["A"] * 5,
        "cycle_id": [1] * 5,
        "days_since_replacement": range(5),
        "reading_date": pd.date_range("2020-01-01", periods=5, freq="D"),
        SIGNAL: [0, 1, 2, 3, 4]
    })
    
    res_default = unit_economics(df, PARAMS)
    
    p_override = PARAMS.copy()
    p_override["electricity_price_usd_kwh"] = PARAMS["electricity_price_usd_kwh"] * 2.0
    
    res_override = unit_economics(df, p_override)
    
    assert res_override["daily_energy_penalty_usd"] > res_default["daily_energy_penalty_usd"]
