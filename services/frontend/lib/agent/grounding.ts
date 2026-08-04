/**
 * Retrieve-then-generate grounding for the in-route agent harness.
 *
 * Extracts unit references from a question and fetches the real plant data each specialist needs
 * from the serving-api. Every figure a specialist can state therefore originates in this data —
 * the structural guarantee behind the no-hallucinated-numbers gate (FR-006/FR-008).
 */
import type { SpecialistId } from './prompts';

// SERVING_API_URL first: this module runs server-side, and NEXT_PUBLIC_API_URL is inlined at
// build time, so an image built with it still reads `undefined` at runtime unless the same
// value is also present in the environment. Deploy sets SERVING_API_URL as a runtime var.
const API_BASE =
  process.env.SERVING_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** How many units a fleet-scope question pulls per-unit detail for. */
const FLEET_FANOUT = 5;

/**
 * The least healthy units right now, lowest score first.
 *
 * /api/fleet is one request and already ranks the fleet, so this costs one call instead of
 * 21 — which is what made the fleet path exceed Cloud Run's request timeout. Units with no
 * score yet (not enough evidence in-cycle) sort last rather than first.
 */
async function worstUnits(
  q: (path: string) => Promise<unknown>,
  limit: number,
): Promise<string[]> {
  const fleet = (await q('/api/fleet')) as { id: string; score: number | null }[] | null;
  if (!Array.isArray(fleet)) return [];
  return [...fleet]
    .sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity))
    .slice(0, limit)
    .map((u) => u.id);
}

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

  // Fleet-scope questions ("which unit is fouling fastest?") name no unit, so `units` is
  // empty and these two specialists used to fetch nothing — the assistant then answered the
  // flagship question with "the data does not include a rate of change", which is honest but
  // useless when /api/forecast carries foulingRatePerDay for every unit.
  //
  // Fanning out to all 21 is not the answer either: each forecast is computed as-of the date,
  // and 21 of them blew past Cloud Run's request timeout. Take the least healthy units — for
  // "fouling fastest" / "clean now or wait", those are the ones the question is about.
  const simUnits = units.length > 0 ? units : await worstUnits(q, FLEET_FANOUT);

  if (specialists.includes('simulation')) {
    data.simulation = {
      scope,
      units: (
        await Promise.all(
          simUnits.map(async (u) => ({ unitId: u, forecast: await q(`/api/forecast/${u}`) })),
        )
      ).filter((r) => r.forecast !== null),
    };
  }

  if (specialists.includes('economics')) {
    data.economics = {
      scope,
      units: (
        await Promise.all(
          simUnits.map(async (u) => ({ unitId: u, economics: await q(`/api/economics/${u}`) })),
        )
      ).filter((r) => r.economics !== null),
    };
  }

  if (specialists.includes('document')) {
    // RAG over plant docs (ro_embeddings.doc_embeddings) is not wired into this harness yet —
    // the specialist returns an honest non-answer rather than inventing a spec.
    data.document = { note: 'no plant-document corpus is available to this harness' };
  }

  return { scope, units, date, data };
}
