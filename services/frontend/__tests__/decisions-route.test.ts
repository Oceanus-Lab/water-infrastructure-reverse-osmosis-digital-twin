import { describe, it, expect, afterEach, vi } from 'vitest';

// The route reads BigQuery through lib/agent/decisions. Mocking that boundary keeps this a
// test of the route's contract — ordering, empty vs unreachable, read-only — rather than of
// the BigQuery client.
const listDecisions = vi.fn();
vi.mock('@/lib/agent/decisions', () => ({ listDecisions: () => listDecisions() }));

const { GET } = await import('@/app/api/agent/decisions/route');

afterEach(() => vi.clearAllMocks());

const ENTRY = (proposalId: string, writtenAt: string) => ({
  proposalId,
  recordType: 'decision',
  unitId: 'B03',
  content: { note: 'test' },
  writtenAt,
  writtenBy: 'operator_approved_via_hitl_chip',
});

describe('GET /api/agent/decisions (US4)', () => {
  it('returns an empty entries array when nothing is recorded (FR-021)', async () => {
    listDecisions.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ entries: [] });
  });

  it('returns recorded entries', async () => {
    listDecisions.mockResolvedValue([ENTRY('prop-2', '2026-08-28T10:00:00.000Z')]);
    const body = await (await GET()).json();
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].proposalId).toBe('prop-2');
  });

  it('preserves the newest-first ordering the query produces', async () => {
    listDecisions.mockResolvedValue([
      ENTRY('prop-newer', '2026-08-28T12:00:00.000Z'),
      ENTRY('prop-older', '2026-08-27T09:00:00.000Z'),
    ]);
    const body = await (await GET()).json();
    expect(body.entries.map((e: { proposalId: string }) => e.proposalId)).toEqual([
      'prop-newer',
      'prop-older',
    ]);
  });

  it('returns 503 rather than an empty list when the store is unreachable', async () => {
    // These are different facts: "no decisions yet" vs "we cannot tell you". Collapsing them
    // would report an audit trail as empty when it may not be.
    listDecisions.mockRejectedValue(new Error('PERMISSION_DENIED'));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.entries).toBeUndefined();
    expect(body.error).toMatch(/unavailable/i);
  });

  it('exposes only a GET handler — no write path (FR-032)', async () => {
    const mod = await import('@/app/api/agent/decisions/route');
    expect(Object.keys(mod)).toEqual(['GET']);
  });
});
