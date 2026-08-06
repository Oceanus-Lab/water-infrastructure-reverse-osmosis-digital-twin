import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Constitution Principle III: the assistant may propose a record, never write one without
 * explicit human approval, and never write an actuation instruction at all.
 *
 * The gate previously lived in a "[SYSTEM OVERRIDE]" prompt sent to the Agent Platform — it
 * held only as long as the model complied, and it 500'd on the quota anyway, which is why
 * ro_serving.decision_log was empty. These tests pin the gate now that it is server-side, by
 * asserting on the BigQuery insert itself: the only proof that nothing was written is that
 * insert was never called.
 */

const insert = vi.hoisted(() => vi.fn());

vi.mock('@google-cloud/bigquery', () => ({
  BigQuery: class {
    dataset() {
      return { table: () => ({ insert }) };
    }
  },
}));

const load = async () => await import('@/lib/agent/decisions');

const validProposal = {
  proposal_id: 'prop-1',
  payload: { record_type: 'decision', unit_id: 'B03', rationale: 'ΔP rise sustained 3 days' },
};

describe('recordDecision — the write gate', () => {
  beforeEach(() => {
    vi.resetModules();
    insert.mockReset().mockResolvedValue([{}]);
  });
  afterEach(() => vi.restoreAllMocks());

  it('writes when the operator approved', async () => {
    const { recordDecision } = await load();
    const out = await recordDecision(validProposal, true);

    expect(insert).toHaveBeenCalledTimes(1);
    const [[row]] = insert.mock.calls[0];
    expect(row.proposal_id).toBe('prop-1');
    expect(row.unit_id).toBe('B03');
    expect(row.written_by).toBe('operator_approved_via_hitl_chip');
    expect(JSON.parse(row.content).rationale).toContain('ΔP rise');
    expect(out.proposal_id).toBe('prop-1');
  });

  it('refuses without approval, and writes nothing', async () => {
    const { recordDecision, GovernanceError } = await load();
    await expect(recordDecision(validProposal, false)).rejects.toBeInstanceOf(GovernanceError);
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([
    ['open_valve', { record_type: 'decision', open_valve: 'B03' }],
    ['scada_command', { record_type: 'decision', scada_command: 'start' }],
    ['dose_chemical', { record_type: 'decision', dose_chemical_ppm: 5 }],
  ])('refuses an actuation payload (%s) even when approved', async (_name, payload) => {
    const { recordDecision, GovernanceError } = await load();
    await expect(recordDecision({ proposal_id: 'p', payload }, true))
      .rejects.toBeInstanceOf(GovernanceError);
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses an actuation key nested inside the payload', async () => {
    const { recordDecision, GovernanceError } = await load();
    await expect(
      recordDecision(
        { proposal_id: 'p', payload: { record_type: 'decision', action: { stop_pump: true } } },
        true,
      ),
    ).rejects.toBeInstanceOf(GovernanceError);
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a unit id outside A01..G03', async () => {
    const { recordDecision, GovernanceError } = await load();
    await expect(
      recordDecision({ proposal_id: 'p', payload: { unit_id: 'Z99' } }, true),
    ).rejects.toBeInstanceOf(GovernanceError);
    expect(insert).not.toHaveBeenCalled();
  });

  it('requires a payload object', async () => {
    const { recordDecision, GovernanceError } = await load();
    await expect(recordDecision({ proposal_id: 'p' }, true))
      .rejects.toBeInstanceOf(GovernanceError);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('approve / dismiss routes', () => {
  beforeEach(() => {
    vi.resetModules();
    insert.mockReset().mockResolvedValue([{}]);
  });

  const post = async (mod: string, body: unknown) => {
    const { POST } = await import(mod);
    return await POST({ json: async () => body } as never);
  };

  it('approve writes and reports the row', async () => {
    const res = await post('@/app/api/agent/approve/route', { proposal: validProposal });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('approved');
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('approve returns 422 on a governance refusal, not 500', async () => {
    const res = await post('@/app/api/agent/approve/route', {
      proposal: { proposal_id: 'p', payload: { open_valve: 'B03' } },
    });
    expect(res.status).toBe(422);
    expect((await res.json()).governance).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });

  it('dismiss writes nothing at all', async () => {
    const res = await post('@/app/api/agent/dismiss/route', { proposal: validProposal });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('dismissed');
    expect(body.written).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
});
