import { generateMockFleet } from "../data/mock-fleet";
import { getMockTimelineRange } from "../data/mock-timeline";
import { getMockInspection } from "../data/mock-inspection";
import { getMockAlerts } from "../data/mock-alerts";
import { mockValidation } from "../data/mock-validation";

import { useDataSourceStore } from "../store/data-source-store";

// Real serving API (ro-serving-api). Falls back to mock data if the API is unreachable,
// so the UI still renders offline. Set NEXT_PUBLIC_API_URL to override the default.
//
// NOTE: NEXT_PUBLIC_* is inlined at `next build`, not read at runtime — setting it as a
// Cloud Run environment variable has no effect on this value. It must be passed at image
// build time (see services/frontend/README.md).
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function live<T>(path: string, fallback: () => T): Promise<T> {
  try {
    const res = await fetch(`${API}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    useDataSourceStore.getState().markLive(path);
    return data;
  } catch (err) {
    // Still fall back so the UI renders, but record it — DataSourceBanner surfaces this.
    // Returning invented numbers with no visible marker is the one thing this product
    // must never do.
    useDataSourceStore.getState().markMock(path, err instanceof Error ? err.message : String(err));
    return fallback();
  }
}

export const fetchFleetStatus = (date: string) =>
  live(`/api/fleet?date=${date}`, () => generateMockFleet(date));

export const fetchTimelineRange = () =>
  live(`/api/timeline`, () => getMockTimelineRange());

export const fetchUnitInspection = (unitId: string, date: string) =>
  live(`/api/inspection/${unitId}?date=${date}`, () => getMockInspection(unitId, date));

export const fetchAlerts = (date: string) =>
  live(`/api/alerts?date=${date}`, () => getMockAlerts(date));

export const fetchEnvironmentContext = (date: string) =>
  live(`/api/env?date=${date}`, () => ({
    date,
    electricityCostUsdPerKwh: 0.12, // approx 12 cents
    gridCarbonIntensityKgPerKwh: 0.35, // approx 350 g/kWh
    ambientTemperatureC: 22.5,
  }));

export const fetchPhysicsDeviation = async (unitId: string, date: string) => {
  try {
    const res = await fetch(`${API}/api/physics-deviation/${unitId}?date=${date}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return []; // Return empty array instead of mock data
  }
};

export const fetchForecast = async (unitId: string, date: string) => {
  try {
    const res = await fetch(`${API}/api/forecast/${unitId}?date=${date}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
};

export const fetchAnomaly = async (unitId: string, date: string) => {
  try {
    const res = await fetch(`${API}/api/anomaly/${unitId}?date=${date}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return [];
  }
};

export const fetchValidationReport = () =>
  live(`/api/validation`, () => mockValidation);

export const fetchEconomics = async (unitId: string, date: string) => {
  try {
    const res = await fetch(`${API}/api/economics/${unitId}?date=${date}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
};

export const fetchEconomicsOverrides = async (unitId: string, date: string, params: Record<string, number>) => {
  try {
    const res = await fetch(`${API}/api/economics/${unitId}/override?date=${date}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
};
