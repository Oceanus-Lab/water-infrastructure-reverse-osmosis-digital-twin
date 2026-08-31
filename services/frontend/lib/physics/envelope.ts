/**
 * The operating envelope the physics capability supports.
 *
 * Mirrors `LIMITS` in services/source-tracing/physics.py. Enforced here as input bounds so a
 * value that cannot be solved is rejected immediately rather than after a multi-second round
 * trip — the server check remains authoritative (defence in depth, research R2).
 *
 * Note these bound each condition INDIVIDUALLY. A combination in which every value is legal
 * can still have no feasible solution; that case is not an envelope violation and is reported
 * by the capability with an explanatory hint.
 */
export interface OperatingPoint extends Record<string, number> {
  tds_ppm: number;
  temp_c: number;
  pressure_bar: number;
  recovery: number;
  membrane_area_m2: number;
}

export interface ConditionSpec {
  key: keyof OperatingPoint;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export const CONDITIONS: ConditionSpec[] = [
  { key: "tds_ppm", label: "Feed salinity", unit: "ppm", min: 200, max: 10000, step: 50, default: 1500 },
  { key: "temp_c", label: "Feed temperature", unit: "°C", min: 5, max: 45, step: 0.5, default: 23 },
  { key: "pressure_bar", label: "Feed pressure", unit: "bar", min: 5, max: 60, step: 0.1, default: 15 },
  { key: "recovery", label: "Recovery", unit: "fraction", min: 0.3, max: 0.95, step: 0.01, default: 0.85 },
  { key: "membrane_area_m2", label: "Membrane area", unit: "m²", min: 1, max: 200, step: 1, default: 50 },
];

export const DEFAULT_POINT: OperatingPoint = CONDITIONS.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.default }),
  {} as OperatingPoint,
);
