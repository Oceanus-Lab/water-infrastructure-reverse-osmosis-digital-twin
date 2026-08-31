import { describe, it, expect, vi } from 'vitest';
import { filterCragPassages, generateHydeQuery } from '@/lib/agent/crag';

describe('Adaptive Corrective RAG (CRAG & HyDE Expansion)', () => {
  it('generates technical HyDE expansion for colloquial operator queries', () => {
    const rawQuery = 'acid wash procedure for silica';
    const hydeQuery = generateHydeQuery(rawQuery);
    expect(hydeQuery).toContain('acid');
    expect(hydeQuery.length).toBeGreaterThanOrEqual(rawQuery.length);
  });

  it('filters out irrelevant passages that exceed the cosine distance threshold', () => {
    const passages = [
      { document: 'OCWD_CIP_Protocol.md', section: 'Silica Scaling', distance: 0.05, snippet: 'Use 2% citric acid.' },
      { document: 'Employee_Handbook.md', section: 'Vacation Policy', distance: 0.35, snippet: 'Submit PTO in advance.' },
    ];

    const filtered = filterCragPassages(passages, 0.12);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].document).toBe('OCWD_CIP_Protocol.md');
  });

  it('returns empty list when all passages fail CRAG relevance threshold', () => {
    const passages = [
      { document: 'Random_Doc.md', section: 'Irrelevant', distance: 0.25, snippet: 'Nothing relevant.' },
    ];

    const filtered = filterCragPassages(passages, 0.12);
    expect(filtered).toHaveLength(0);
  });
});
