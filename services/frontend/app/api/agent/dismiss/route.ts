import { NextRequest } from 'next/server';

/**
 * The operator tapped Dismiss — no record is written.
 *
 * This used to call the Agent Platform interactions API with a "[SYSTEM OVERRIDE]" prompt
 * telling the agent NOT to invoke record_decision. That inverts the gate: it makes not-writing
 * depend on the model obeying an instruction, when the correct implementation of "do not
 * write" is to not write. It also hit the quota-blocked endpoint, so Dismiss returned 500.
 *
 * Nothing is written here, and nothing needs to be. Writing only ever happens in the approve
 * route, which calls recordDecision with approved=true.
 */
export async function POST(req: NextRequest) {
  try {
    const { proposal } = await req.json();
    if (!proposal) {
      return Response.json({ error: 'Missing proposal' }, { status: 400 });
    }
    return Response.json({
      success: true,
      status: 'dismissed',
      proposal_id: proposal.proposal_id ?? null,
      written: false,
    });
  } catch (error) {
    console.error('dismiss route error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
