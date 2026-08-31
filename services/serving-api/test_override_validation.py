"""Validation contract for POST /api/economics/{unit}/override (feature 012, US3).

The override is what makes the economics arguable rather than asserted, so a bad value must be
refused with a message naming what was wrong — not silently dropped, and not a 500. Before
feature 012 nothing in the UI called this endpoint, so none of it had ever been exercised.

Calls the route function directly rather than through fastapi.testclient.TestClient, which
needs an HTTP client library that is not installable in this environment.

Run: python -m pytest services/serving-api/test_override_validation.py
"""
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "source-tracing"))

main = pytest.importorskip("main")
from fastapi import HTTPException  # noqa: E402

UNIT = "B03"
DATE = "2020-06-01"


@pytest.fixture(scope="module", autouse=True)
def _needs_data():
    if not (main.DATA / "readings.csv").exists():
        pytest.skip("no pipeline outputs — run source-tracing/run_all.py")


def _override(params):
    return main.override_economics(UNIT, params, date=DATE)


def test_a_valid_override_recomputes():
    out = _override({"electricity_price_usd_kwh": 0.25})
    assert "current" in out and "history" in out
    assert out["current"]["params"]["electricity_price_usd_kwh"] == 0.25


def test_reports_whether_the_recommendation_reversed():
    """FR-017: the surface states the reversal, so the server has to report it."""
    out = _override({"electricity_price_usd_kwh": 0.25})
    assert isinstance(out["current"]["recommendation_flipped"], bool)


def test_an_unknown_parameter_is_rejected_by_name():
    with pytest.raises(HTTPException) as exc:
        _override({"not_a_real_parameter": 1.0})
    assert exc.value.status_code == 422
    assert "not_a_real_parameter" in str(exc.value.detail)


def test_a_non_numeric_value_is_rejected_rather_than_500ing():
    with pytest.raises(HTTPException) as exc:
        _override({"electricity_price_usd_kwh": "expensive"})
    assert exc.value.status_code == 422
    assert "electricity_price_usd_kwh" in str(exc.value.detail)


def test_a_negative_value_is_rejected():
    with pytest.raises(HTTPException) as exc:
        _override({"cip_cost_usd": -5})
    assert exc.value.status_code == 422
    assert "cip_cost_usd" in str(exc.value.detail)


def test_a_non_finite_value_is_rejected():
    with pytest.raises(HTTPException) as exc:
        _override({"cip_cost_usd": float("inf")})
    assert exc.value.status_code == 422


def test_none_is_ignored_rather_than_treated_as_zero():
    """A cleared field must fall back to the default, not silently become 0."""
    from economics import PARAMS

    out = _override({"electricity_price_usd_kwh": None})
    assert out["current"]["params"]["electricity_price_usd_kwh"] == PARAMS["electricity_price_usd_kwh"]


def test_accepts_the_iso_instant_the_replay_clock_sends():
    plain = main.override_economics(UNIT, {"electricity_price_usd_kwh": 0.2}, date=DATE)
    iso = main.override_economics(UNIT, {"electricity_price_usd_kwh": 0.2}, date=f"{DATE}T00:00:00Z")
    assert plain == iso
