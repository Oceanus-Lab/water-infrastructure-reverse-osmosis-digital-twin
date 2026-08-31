import { NextRequest } from "next/server";
import { recordDecision, GovernanceError, type Proposal } from "@/lib/agent/decisions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both direct { proposal: { ... } } and flattened { proposalId, unitId, action, ... }
    const proposal: Proposal = body.proposal || {
      proposal_id: body.proposalId,
      payload: {
        unit_id: body.unitId,
        action: body.action,
        record_type: "decision",
        assumptions: {
          cipCost: body.assumedCipCost,
          electricity: body.assumedElectricity,
        },
      },
    };

    const result = await recordDecision(proposal, true);

    return new Response(
      JSON.stringify({
        status: "approved",
        proposal_id: result.proposal_id,
        written_at: result.written_at,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof GovernanceError) {
      return new Response(
        JSON.stringify({ error: err.message, governance: true }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
