import { listDecisions } from '@/lib/agent/decisions';

/**
 * The approved-decision record (feature 012, US4).
 *
 * Read-only. The write path is the approve route, gated on human approval; nothing here
 * writes, updates, or deletes (FR-032).
 *
 * An unreachable store returns 503 rather than an empty list. The two are different facts —
 * "no decisions yet" and "we cannot tell you" — and collapsing them would misrepresent the
 * audit trail as empty when it may not be.
 */
export async function GET() {
  try {
    return Response.json({ entries: await listDecisions() });
  } catch (error) {
    console.error('decisions route error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `decision record unavailable: ${message}` },
      { status: 503 },
    );
  }
}
