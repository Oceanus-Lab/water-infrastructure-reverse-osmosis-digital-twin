import { HealthStatus } from "../types";

export function scoreToStatus(score: number | null): HealthStatus {
  if (score === null || score === undefined) return 'unknown';
  
  if (score < 33) return 'healthy';
  if (score < 66) return 'watch';
  return 'alert';
}
