"""The `?date=` parameter must accept what the frontend actually sends.

lib/store/replay-store.ts holds the replay clock as an ISO instant
("2019-01-01T00:00:00Z") and passes it straight to the API. Every endpoint compares it
against reading_date, a naive daily date, so pd.Timestamp() on the tz-aware form raised
"Cannot compare tz-naive and tz-aware" — a 500 on every request the deployed UI made. The UI
then fell back to its mock generators, and the only visible symptom was the MOCK DATA badge.

Run: python -m pytest services/serving-api/test_date_param.py
"""
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "source-tracing"))

main = pytest.importorskip("main")
from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(main.app)

# Exactly what the replay clock produces, plus the plain form used elsewhere.
DATE_FORMS = ["2020-06-01", "2020-06-01T00:00:00Z", "2020-06-01T12:34:56Z", "2020-06-01T00:00:00.000Z"]

DATED_ENDPOINTS = [
    "/api/fleet",
    "/api/alerts",
    "/api/env",
    "/api/inspection/B03",
    "/api/physics-deviation/B03",
    "/api/forecast/B03",
    "/api/anomaly/B03",
    "/api/economics/B03",
]


@pytest.fixture(scope="module", autouse=True)
def _needs_data():
    if not (main.DATA / "readings.csv").exists():
        pytest.skip("no pipeline outputs — run source-tracing/run_all.py")


@pytest.mark.parametrize("path", DATED_ENDPOINTS)
@pytest.mark.parametrize("date", DATE_FORMS)
def test_endpoint_accepts_every_date_form(path, date):
    r = client.get(path, params={"date": date})
    assert r.status_code == 200, f"{path} with date={date!r} -> {r.status_code}"


@pytest.mark.parametrize("path", DATED_ENDPOINTS)
def test_iso_instant_returns_the_same_data_as_the_plain_date(path):
    plain = client.get(path, params={"date": "2020-06-01"}).json()
    iso = client.get(path, params={"date": "2020-06-01T00:00:00Z"}).json()
    assert plain == iso, f"{path} answers differently for the two forms of the same day"


def test_post_override_accepts_an_iso_instant():
    r = client.post("/api/economics/B03/override",
                    params={"date": "2020-06-01T00:00:00Z"},
                    json={"electricity_price_usd_kwh": 0.25})
    assert r.status_code == 200, r.text
