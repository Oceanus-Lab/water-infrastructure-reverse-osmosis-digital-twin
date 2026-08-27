import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * The agent's preview-tier quota (aiplatform interaction_throughput_bytes, per day per
 * project) is an external limit — it cannot be raised self-service, and a fresh project gets
 * the same cap. See docs/11-agent-enterprise-quota.md.
 *
 * So the semantic cache in app/api/agent/stream/route.ts IS the mitigation, and the ordering
 * of its fallbacks is what keeps the assistant answering at all. These tests pin that
 * ordering, and that a 429 never surfaces as a raw error to the operator.
 */

const CACHED = [{ id: 'cached-1', steps: [{ role: 'model', content: [{ text: 'cached answer' }] }] }];

const mocks = vi.hoisted(() => ({
  embed: vi.fn(),
  query: vi.fn(),
  harness: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { embedContent: mocks.embed };
  },
}));
vi.mock('@google-cloud/bigquery', () => ({
  BigQuery: class {
    query = mocks.query;
  },
}));
vi.mock('@/lib/agent/harness', () => ({ runHarness: mocks.harness }));

async function ask(input: string, date = '2020-06-01') {
  const { POST } = await import('@/app/api/agent/stream/route');
  const res = await POST({ json: async () => ({ input, date }) } as never);
  return await new Response(res.body).text();
}

const embeddingOk = () => mocks.embed.mockResolvedValue({ embeddings: [{ values: [0.1, 0.2] }] });
const cacheHit = () => mocks.query.mockResolvedValue([[{ answer_json: JSON.stringify(CACHED) }]]);
const cacheMiss = () => mocks.query.mockResolvedValue([[]]);

describe('agent stream — quota fallback chain', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.embed.mockReset();
    mocks.query.mockReset();
    mocks.harness.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('answers greetings locally, spending no quota at all', async () => {
    const body = await ask('hi');
    expect(body).toMatch(/RO diagnostic assistant/);
    expect(mocks.embed).not.toHaveBeenCalled();
    expect(mocks.harness).not.toHaveBeenCalled();
  });

  it('serves a cache hit without calling the agent', async () => {
    embeddingOk();
    cacheHit();
    const body = await ask('which unit is fouling fastest?');
    expect(body).toContain('cached answer');
    expect(mocks.harness).not.toHaveBeenCalled();
  });

  it('falls back to the cache when the agent 429s', async () => {
    embeddingOk();
    cacheMiss().mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ answer_json: JSON.stringify(CACHED) }]]);
    mocks.harness.mockRejectedValue(Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 }));

    const body = await ask('what is driving energy cost?');

    expect(mocks.harness).toHaveBeenCalled();
    expect(body).toContain('cached answer');
    expect(body).not.toMatch(/429|RESOURCE_EXHAUSTED/);   // never leak the raw quota error
  });

  it('returns an honest message when the agent 429s and the cache misses', async () => {
    embeddingOk();
    cacheMiss();
    mocks.harness.mockRejectedValue(new Error('429 RESOURCE_EXHAUSTED'));

    const body = await ask('some question never seen before');

    expect(body).toMatch(/couldn't complete that answer/i);
    expect(body).not.toMatch(/429|RESOURCE_EXHAUSTED/);
  });

  it('skips the cache for time-sensitive questions so "now" is never stale', async () => {
    embeddingOk();
    cacheHit();
    mocks.harness.mockImplementation(async (_ai, _q, emit) => emit('live answer'));

    const body = await ask('what is the current fouling rate?');

    expect(mocks.harness).toHaveBeenCalled();
    expect(body).toContain('live answer');
    expect(body).not.toContain('cached answer');
  });

  it('still answers when embedding itself fails, rather than erroring out', async () => {
    mocks.embed.mockRejectedValue(new Error('embedding quota'));
    mocks.harness.mockImplementation(async (_ai, _q, emit) => emit('live answer'));

    const body = await ask('why is bank F energy climbing?');

    expect(body).toContain('live answer');
  });
});
