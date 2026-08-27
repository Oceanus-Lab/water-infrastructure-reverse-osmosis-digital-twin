import { BigQuery } from '@google-cloud/bigquery';

/**
 * Propose-to-record: the one write path the assistant has, gated on human approval.
 *
 * The approve route used to ask the Agent Platform interactions API to call the
 * record_decision tool on our behalf, via a "[SYSTEM OVERRIDE]" prompt. Two problems. That
 * endpoint is the one blocked by the preview-tier quota (docs/11-agent-enterprise-quota.md) —
 * the stream route was rewritten to bypass it but this path was not, so tapping Approve
 * returned a 500 and ro_serving.decision_log stayed empty. And routing a governance-gated
 * write through a natural-language instruction makes the gate only as reliable as the model's
 * compliance: a prompt that can be talked into a tool call is not a hard gate.
 *
 * The write happens here instead. Approval is a fact the server establishes, not a claim the
 * model passes along.
 */

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'spatial-cat-489006-a4';
const DATASET = process.env.BQ_SERVING_DATASET || 'ro_serving';
const TABLE = `${PROJECT}.${DATASET}.decision_log`;

const bq = new BigQuery({ projectId: PROJECT });

/**
 * Field names that would make a record an actuation instruction rather than a note.
 *
 * Mirrors _ACTUATION_DENYLIST in services/agent/tools.py. The assistant is advise-only: it
 * may record that a decision was taken, never a command to carry one out.
 */
const ACTUATION_DENYLIST = [
  'set_flow', 'adjust_pressure', 'dose_chemical', 'stop_pump',
  'open_valve', 'close_valve', 'set_recovery', 'scada_command',
  'plc_write', 'actuate',
];

const UNIT_RE = /^[A-G]0[1-3]$/;

export interface Proposal {
  proposal_id?: string;
  payload?: Record<string, unknown>;
}

export class GovernanceError extends Error {}

/** Reject a payload that reads as an actuation command, at any nesting depth. */
function assertNoActuation(payload: Record<string, unknown>, path = ''): void {
  for (const [key, value] of Object.entries(payload)) {
    const here = path ? `${path}.${key}` : key;
    if (ACTUATION_DENYLIST.some((d) => key.toLowerCase().includes(d))) {
      throw new GovernanceError(
        `payload key "${here}" resembles an actuation command; the assistant never writes ` +
          'actuation records (FR-013)',
      );
    }
    // Nesting is checked too — a denied key one level down is still a denied key.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      assertNoActuation(value as Record<string, unknown>, here);
    }
  }
}

/**
 * Write an approved decision. `approved` is passed explicitly so the gate is visible at the
 * call site rather than implied by which function was called.
 */
export async function recordDecision(
  proposal: Proposal,
  approved: boolean,
): Promise<{ proposal_id: string; written_at: string }> {
  if (!approved) {
    throw new GovernanceError(
      'write blocked — no human approval received. The operator must tap Approve before a ' +
        'record is written (FR-014, Constitution Principle III)',
    );
  }
  const payload = proposal.payload;
  if (!payload || typeof payload !== 'object') {
    throw new GovernanceError('proposal.payload must be an object');
  }
  assertNoActuation(payload);

  const unitId = typeof payload.unit_id === 'string' ? payload.unit_id.toUpperCase() : null;
  if (unitId && !UNIT_RE.test(unitId)) {
    throw new GovernanceError(`invalid unit_id "${payload.unit_id}" — expected A01..G03`);
  }

  const written_at = new Date().toISOString();
  const proposal_id = proposal.proposal_id || `prop-${Date.now()}`;

  await bq.dataset(DATASET).table('decision_log').insert([{
    proposal_id,
    record_type: typeof payload.record_type === 'string' ? payload.record_type : 'decision',
    unit_id: unitId,
    content: JSON.stringify(payload),
    written_at,
    // Records HOW the write was authorised, not who the operator was — the UI has no identity
    // yet, and inventing one in an audit column would be worse than naming the mechanism.
    written_by: 'operator_approved_via_hitl_chip',
  }]);

  return { proposal_id, written_at };
}

export { TABLE as DECISION_LOG_TABLE };
