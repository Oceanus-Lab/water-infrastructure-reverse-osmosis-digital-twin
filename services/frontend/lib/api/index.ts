import { generateMockFleet } from "../data/mock-fleet";
import { getMockTimelineRange } from "../data/mock-timeline";
import { getMockInspection } from "../data/mock-inspection";
import { getMockAlerts } from "../data/mock-alerts";
import { mockValidation } from "../data/mock-validation";
import type { SourceProvenance } from "../types";

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

/** A request that failed in a way the caller must distinguish, rather than fall back over. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly detail?: string) {
    super(detail ?? `HTTP ${status}`);
  }
}

/**
 * Fetch that reports failure instead of substituting a value, and can be abandoned.
 *
 * `live()` is right for the fleet/inspection reads, where a placeholder keeps the UI usable
 * offline and the banner marks it. It is wrong for the surfaces added in feature 012: a
 * what-if has no honest placeholder, and a 503 from the warehouse endpoints means "these
 * results were never produced" — a distinct, actionable state that a fallback would erase.
 *
 * Still routes status through the data-source store so the placeholder marker keeps working
 * on the new screens (FR-030).
 */
export async function request<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  try {
    const res = await fetch(`${API}${path}`, { cache: "no-store", ...init });
    if (!res.ok) {
      const detail = await res
        .json()
        .then((b) => (typeof b?.detail === "string" ? b.detail : undefined))
        .catch(() => undefined);
      throw new ApiError(res.status, detail);
    }
    useDataSourceStore.getState().markLive(path);
    return (await res.json()) as T;
  } catch (err) {
    // An abort is the user's own doing, not a service failure — recording it would raise the
    // placeholder banner on a screen showing nothing wrong.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (!(err instanceof ApiError)) {
      useDataSourceStore
        .getState()
        .markMock(path, err instanceof Error ? err.message : String(err));
    }
    throw err;
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

export interface UnitEconomicsRow {
  unitId: string;
  bankId: string;
  cycleId: number;
  dpRisePsi: number;
  dailyEnergyPenaltyUsd: number;
  cumEnergyPenaltyUsd: number;
  cipCostUsd: number;
  recommendation: "CLEAN NOW" | "WAIT";
  breakEvenDay: number | null;
  provenance: SourceProvenance;
  credibility: "high" | "medium";
}

export interface CostAssumption {
  key: string;
  label: string;
  unit: string;
  value: number;
  defaultValue: number;
  provenance: "assumed" | "sourced";
  assumption: string;
  min: number;
}

export interface FleetEconomicsSnapshot {
  date: string;
  units: UnitEconomicsRow[];
  assumptions: CostAssumption[];
  unavailableUnits: string[];
}

/** Fleet economics as of one replay date — one coherent snapshot, not 21 requests. */
export const fetchFleetEconomics = (date: string, signal?: AbortSignal) =>
  request<FleetEconomicsSnapshot>(`/api/economics/fleet?date=${date}`, { signal });

export interface SolveResult {
  available: boolean;
  fidelity?: "high";
  solver_status?: string;
  solve_failed?: string;
  /** Present when the combination has no feasible solution — actionable, not a fault. */
  hint?: string;
  reason?: string;
  clean_water_flux_kg_m2_h?: number;
  clean_salt_rejection_pct?: number;
  operating_point?: Record<string, number>;
  provenance?: string;
  solvedBy?: string;
}

export interface WhatIfComparison {
  baseline: SolveResult;
  scenario: SolveResult;
  change: Record<string, number>;
  /** Null unless BOTH solves reached high fidelity. Must never render as 0. */
  delta: { flux_kg_m2_h: number; rejection_pct: number } | null;
}

/**
 * One on-demand pair of physics solves, computed for the conditions actually requested.
 *
 * Takes an AbortSignal because a solve runs in the seconds range and the user must be able to
 * abandon it (FR-014). Uses `request` rather than `live` — there is no honest placeholder for
 * a physics result, so a failure must surface as a failure.
 */
export const requestWhatIf = (
  base: Record<string, number>,
  change: Record<string, number>,
  signal?: AbortSignal,
) =>
  request<WhatIfComparison>("/api/physics/what-if", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base, change }),
    signal,
  });

export interface WarehouseForecastPoint {
  forecast_date: string;
  ndp_forecast: number;
  ndp_lower_90: number;
  ndp_upper_90: number;
  provenance?: string;
}

export interface WarehouseForecast {
  unitId: string;
  method: string;
  computedIn: string;
  horizon: WarehouseForecastPoint[];
  anomalies: unknown[];
}

/** In-warehouse forecast (TimesFM via AI.FORECAST, spec 004's architecture-aligned path). */
export const fetchWarehouseForecast = (unitId: string, signal?: AbortSignal) =>
  request<WarehouseForecast>(`/api/bq-forecast/${unitId}`, { signal });

export interface DocumentPassage {
  source_document: string;
  section: string;
  category: string;
  chunk_text: string;
  distance: number;
}

export interface DocumentSearchResult {
  query: string;
  computedIn: string;
  method: string;
  results: DocumentPassage[];
}

/** In-warehouse document retrieval (VECTOR_SEARCH over the plant-knowledge corpus). */
export const searchDocuments = (query: string, signal?: AbortSignal) =>
  request<DocumentSearchResult>(
    `/api/docs/search?q=${encodeURIComponent(query)}&top_k=4`,
    { signal },
  );
