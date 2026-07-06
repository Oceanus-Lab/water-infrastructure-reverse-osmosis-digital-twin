export type HealthStatus = 'healthy' | 'watch' | 'alert' | 'unknown';
export type SourceProvenance = 'measured' | 'modeled';

export interface UnitHealth {
  id: string; // e.g. A01, A02, ..., G03
  score: number | null; // 0-100 or null if offline/unknown
  status: HealthStatus;
  scoreSource: SourceProvenance;
  timestamp: string;
}

export interface UnitHoverSummary extends UnitHealth {
  stage3FluxPct: number;
  recoveryPct: number;
  lastCipDate: string;
  stage3FluxSource: SourceProvenance;
}

export interface ReplayState {
  currentDate: string; // ISO format date, e.g. "2019-01-01T00:00:00Z"
  isPlaying: boolean;
  speed: number;
  availableDateRange: [string, string]; // [start, end]
  selectedUnitId: string | null;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertItem {
  id: string;
  unitId: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  evidence: string; // e.g. "Differential pressure exceeded 1.5 bar"
}

export interface UnitInspection {
  unitId: string;
  timestamp: string;
  flux: { value: number | null; source: SourceProvenance };
  pressureDrop: { value: number | null; source: SourceProvenance };
  energyUsage: { value: number | null; source: SourceProvenance };
  daysSinceClean: number;
}

export interface EnvironmentalContext {
  date: string;
  electricityCostUsdPerKwh: number;
  gridCarbonIntensityKgPerKwh: number;
  ambientTemperatureC: number;
}

export type DeviationStatus = 'ok' | 'out-of-range' | 'unavailable';
export type FidelityLevel = 'analytical' | 'high';

export interface PhysicsDeviation {
  unitId: string;
  cycleId: string;
  readingDate: string;
  metric: string; // e.g., 'unit_n_delta_p', 'salt_passage', 'unit_recovery'
  expectedClean: number | null;
  actual: number | null;
  deviation: number | null;
  deviationPct: number | null;
  status: DeviationStatus;
  fidelity: FidelityLevel;
  provenance: SourceProvenance;
}

export interface Forecast {
  unitId: string;
  timestamp: string;
  foulingRatePerDay: number;
  trendR2: number;
  currentRise: number;
  daysToClean: number | null;
  forecastBandDays: number | null;
  ciLower: number | null;
  ciUpper: number | null;
  forecastDrivers: string[];
  foulingOnsetScore: number;
  featureAttribution: string[];
}

export interface Anomaly {
  signal: string;
  deviation_from_baseline: number;
  z_score: number;
}

