/**
 * Retrieve-then-generate grounding for the in-route agent harness.
 *
 * Extracts unit references from a question and fetches the real plant data each specialist needs
 * from the serving-api. Every figure a specialist can state therefore originates in this data —
 * the structural guarantee behind the no-hallucinated-numbers gate (FR-006/FR-008).
 */
import type { SpecialistId } from './prompts';

const API_BASE =
  process.env.SERVING_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Default "now" = the last replay date in the dataset. The frontend may pass its replay-clock date.
export const DEFAULT_DATE = '2021-01-13';

export interface Grounding {
  scope: 'unit' | 'fleet';
  units: string[];
  date: string;
  // Raw serving-api payloads keyed by specialist, injected into each specialist prompt as CONTEXT.
  data: Partial<Record<SpecialistId, unknown>>;
}

/** Normalize "B3", "B-03", "unit F-03", "bank F" → canonical unit IDs (A01–G03). */
export function extractUnits(question: string): string[] {
  const units = new Set<string>();

  // "bank F" → F01, F02, F03
  for (const m of question.matchAll(/\bbank\s+([A-G])\b/gi)) {
    const b = m[1].toUpperCase();
    ['01', '02', '03'].forEach((s) => units.add(`${b}${s}`));
  }
  // "B03", "B-03", "B3", "F-3"
  for (const m of question.matchAll(/\b([A-G])[-\s]?0?([1-3])\b/gi)) {
    units.add(`${m[1].toUpperCase()}0${m[2]}`);
  }
  return [...units];
}

async function getJson(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch the grounding each selected specialist needs. Fleet-scope questions (no unit named, e.g.
 * "how's the plant?", equipment terms like "HP feed pump") get the fleet + alerts overview.
 */
export async function fetchGrounding(
  specialists: SpecialistId[],
  rawUnits: string[],
  date: string = DEFAULT_DATE,
): Promise<Grounding> {
  const units = rawUnits.slice(0, 4); // bound the fan-out
  const scope: 'unit' | 'fleet' = units.length > 0 ? 'unit' : 'fleet';
  const data: Partial<Record<SpecialistId, unknown>> = {};

  const q = (p: string) => getJson(`${p}${p.includes('?') ? '&' : '?'}date=${date}`);

  if (specialists.includes('dataAnalyst')) {
    if (scope === 'fleet') {
      const [fleet, alerts] = await Promise.all([q('/api/fleet'), q('/api/alerts')]);
      data.dataAnalyst = { scope, fleet, alerts };
    } else {
      data.dataAnalyst = {
        scope,
        units: await Promise.all(
          units.map(async (u) => ({
            unitId: u,
            inspection: await q(`/api/inspection/${u}`),
            anomalies: await q(`/api/anomaly/${u}`),
            physicsDeviation: await q(`/api/physics-deviation/${u}`),
          })),
        ),
      };
    }
  }

  if (specialists.includes('simulation')) {
    data.simulation = {
      units: await Promise.all(
        units.map(async (u) => ({ unitId: u, forecast: await q(`/api/forecast/${u}`) })),
      ),
    };
  }

  if (specialists.includes('economics')) {
    data.economics = {
      units: await Promise.all(
        units.map(async (u) => ({ unitId: u, economics: await q(`/api/economics/${u}`) })),
      ),
    };
  }

  if (specialists.includes('document')) {
    // RAG over plant docs (ro_embeddings.doc_embeddings) is not wired into this harness yet —
    // the specialist returns an honest non-answer rather than inventing a spec.
    data.document = { note: 'no plant-document corpus is available to this harness' };
  }

  return { scope, units, date, data };
}
