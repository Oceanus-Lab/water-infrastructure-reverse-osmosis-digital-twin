import { NextRequest } from 'next/server';
import { GovernanceError, recordDecision } from '@/lib/agent/decisions';

/**
 * The operator tapped Approve — write the decision.
 *
 * This used to ask the Agent Platform interactions API to call record_decision on our behalf
 * with a "[SYSTEM OVERRIDE]" prompt. That endpoint is the one the preview-tier quota blocks
 * (docs/11-agent-enterprise-quota.md), so Approve returned 500 and decision_log stayed empty;
 * and a governance gate implemented as a natural-language instruction is only as strong as
 * the model's willingness to comply. lib/agent/decisions.ts writes directly, with approval
 * established here rather than asserted in a prompt.
 */
export async function POST(req: NextRequest) {
  try {
    const { proposal } = await req.json();
    if (!proposal) {
      return Response.json({ error: 'Missing proposal' }, { status: 400 });
    }

    const written = await recordDecision(proposal, true);
    return Response.json({ success: true, status: 'approved', ...written });
  } catch (error) {
    if (error instanceof GovernanceError) {
      // 422, not 500: the request was understood and refused on policy.
      return Response.json({ error: error.message, governance: true }, { status: 422 });
    }
    console.error('approve route error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
