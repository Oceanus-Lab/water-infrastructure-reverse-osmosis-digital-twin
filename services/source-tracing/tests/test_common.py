import pytest
from common import load_readings
import pandas as pd

def test_load_readings(monkeypatch):
    import common
    
    # Mock CSV path
    class MockPath:
        def exists(self): return True
    monkeypatch.setattr(common, "CSV", MockPath())
    
    # Mock pandas read_csv
    df_mock = pd.DataFrame({
        "reading_date": pd.to_datetime(["2020-01-01"]),
        "unit_id": ["A1"],
        "cip": ["True"],
        "percent_ec_removal": [0.99]
    })
    monkeypatch.setattr(pd, "read_csv", lambda *args, **kwargs: df_mock)
    
    df = load_readings()
    assert not df.empty
    assert "salt_passage" in df.columns
    assert df.iloc[0]["salt_passage"] == pytest.approx(1.0)
    assert bool(df.iloc[0]["cip"]) is True

def test_load_readings_missing_file(monkeypatch):
    import common
    class MockPath:
        def exists(self): return False
    monkeypatch.setattr(common, "CSV", MockPath())
    
    with pytest.raises(SystemExit):
        load_readings()
