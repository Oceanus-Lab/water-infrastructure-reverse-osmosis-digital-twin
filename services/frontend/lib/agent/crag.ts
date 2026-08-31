/**
 * Adaptive Corrective RAG (CRAG) & HyDE Expansion utilities.
 */

export interface RawDocumentPassage {
  document?: string;
  source_document?: string;
  section?: string;
  distance?: number;
  snippet?: string;
  content?: string;
  [key: string]: unknown;
}

const COLLOQUIAL_TERMS_MAP: Record<string, string> = {
  'acid wash': 'citric acid and hydrochloric acid low pH clean-in-place CIP protocol for inorganic scaling',
  'caustic wash': 'sodium hydroxide high pH clean-in-place CIP protocol for biofouling and organic matter',
  'clean foulant': 'clean-in-place CIP chemical cleaning procedure for reverse osmosis membranes',
  'membrane flush': 'permeate rinse and low pressure displacement procedure',
  'antiscalant': 'chemical dosing rate threshold and scale inhibitor limits',
};

/**
 * Expand colloquial operator questions into dense technical queries for vector search (HyDE).
 */
export function generateHydeQuery(rawQuery: string): string {
  const lower = rawQuery.toLowerCase();
  let expanded = rawQuery;

  for (const [colloquial, technical] of Object.entries(COLLOQUIAL_TERMS_MAP)) {
    if (lower.includes(colloquial)) {
      expanded += ` (${technical})`;
    }
  }

  return expanded;
}

/**
 * Corrective RAG relevance gate: Filters out document chunks exceeding cosine distance threshold.
 */
export function filterCragPassages<T extends RawDocumentPassage>(
  passages: T[],
  maxDistanceThreshold: number = 0.12
): T[] {
  if (!Array.isArray(passages)) return [];

  return passages.filter((p) => {
    // If distance is missing, treat as passing
    if (p.distance === undefined || p.distance === null) return true;
    return p.distance <= maxDistanceThreshold;
  });
}
