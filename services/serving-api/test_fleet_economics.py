"""Contract tests for GET /api/economics/fleet (feature 012, US1).

The operations-manager screen needs all 21 units as ONE coherent as-of snapshot. Fanning out
21 client requests would repeat the as-of recomputation and could not guarantee a single point
in time, so the aggregate is computed server-side — see specs/012 research R4.

These call the route function directly rather than through fastapi.testclient.TestClient:
TestClient needs an HTTP client library that is not installable in this environment, and the
contract being asserted is the returned payload, which the function returns either way.

Run: python -m pytest services/serving-api/test_fleet_economics.py
"""
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "source-tracing"))

main = pytest.importorskip("main")

DATE = "2020-06-01"
ALL_UNITS = {f"{b}{s}" for b in "ABCDEFG" for s in ("01", "02", "03")}
# The six editable parameters the economics rest on (services/source-tracing/economics.py).
EXPECTED_PARAMS = {
    "electricity_price_usd_kwh", "pump_efficiency", "recovery_setpoint",
    "permeate_flow_m3_day", "cip_cost_usd", "cip_downtime_lost_usd",
}


@pytest.fixture(scope="module", autouse=True)
def _needs_data():
    if not (main.DATA / "readings.csv").exists():
        pytest.skip("no pipeline outputs — run source-tracing/run_all.py")


@pytest.fixture(scope="module")
def payload():
    return main.fleet_economics(date=DATE)


def test_returns_the_documented_shape(payload):
    assert set(payload) >= {"date", "units", "assumptions", "unavailableUnits"}
    assert payload["date"] == DATE


def test_every_unit_is_accounted_for_exactly_once(payload):
    """A unit is either grounded or explicitly unavailable — never silently dropped."""
    grounded = {u["unitId"] for u in payload["units"]}
    unavailable = set(payload["unavailableUnits"])
    assert not (grounded & unavailable), "a unit cannot be both grounded and unavailable"
    assert grounded | unavailable == ALL_UNITS


def test_ungroundable_units_are_not_zero_filled(payload):
    """FR-029: an ungroundable unit must be named, not emitted with zeros."""
    for u in payload["units"]:
        assert u["dailyEnergyPenaltyUsd"] is not None
        assert u["cumEnergyPenaltyUsd"] is not None


def test_unit_rows_carry_the_fields_the_screen_needs(payload):
    if not payload["units"]:
        pytest.skip("no groundable units at this date")
    row = payload["units"][0]
    assert set(row) >= {
        "unitId", "bankId", "cycleId", "dpRisePsi", "dailyEnergyPenaltyUsd",
        "cumEnergyPenaltyUsd", "cipCostUsd", "recommendation", "breakEvenDay",
        "provenance", "credibility",
    }


def test_provenance_is_relayed_not_inferred(payload):
    """Constitution IV: banks F-G are metered, A-E are modeled."""
    for u in payload["units"]:
        expected = "measured" if u["unitId"][0] in ("F", "G") else "modeled"
        assert u["provenance"] == expected
        assert u["credibility"] in {"high", "medium"}


def test_recommendation_is_one_of_the_two_known_values(payload):
    for u in payload["units"]:
        assert u["recommendation"] in {"CLEAN NOW", "WAIT"}


def test_assumptions_are_returned_and_all_marked_assumed(payload):
    """Research R5: none of the six has a sourced feed behind it today."""
    assumptions = {a["key"]: a for a in payload["assumptions"]}
    assert set(assumptions) == EXPECTED_PARAMS
    for a in assumptions.values():
        assert a["provenance"] == "assumed"
        assert set(a) >= {"key", "label", "unit", "value", "defaultValue", "provenance", "min"}


def test_electricity_price_matches_the_economics_parameter(payload):
    """Single source of truth. /api/env reports a different figure (0.12 vs 0.08); the
    economics parameter is authoritative for anything derived from it (research R5)."""
    from economics import PARAMS

    price = next(a for a in payload["assumptions"] if a["key"] == "electricity_price_usd_kwh")
    assert price["value"] == PARAMS["electricity_price_usd_kwh"]


def test_accepts_the_iso_instant_the_replay_clock_sends():
    """lib/store/replay-store.ts holds the clock as an ISO instant and passes it through."""
    plain = main.fleet_economics(date=DATE)
    iso = main.fleet_economics(date=f"{DATE}T00:00:00Z")
    assert plain == iso


def test_is_as_of_the_requested_date():
    """FR-031: a later date must not be answered with an earlier date's figures."""
    early = main.fleet_economics(date="2019-06-01")
    late = main.fleet_economics(date="2020-11-01")
    assert early != late
