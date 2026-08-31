import { NextRequest } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || "spatial-cat-489006-a4";
const bq = new BigQuery({ projectId: PROJECT });
const TRACES_TABLE = `${PROJECT}.ro_serving.agent_traces`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { traceId, rating, reasonTag, comment } = body;

    if (!traceId || !rating) {
      return new Response(JSON.stringify({ error: "Missing traceId or rating" }), { status: 400 });
    }

    // Update the trace record with user feedback asynchronously
    bq.query({
      query: `
        UPDATE \`${TRACES_TABLE}\`
        SET
          user_feedback_rating = @rating,
          user_feedback_reason = @reason
        WHERE trace_id = @traceId
      `,
      params: {
        traceId,
        rating,
        reason: comment ? `${reasonTag || 'general'}: ${comment}` : (reasonTag || null),
      },
    }).catch((err) => console.error("[FeedbackAPI] BigQuery feedback update error:", err.message));

    return new Response(JSON.stringify({ status: "recorded", traceId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[FeedbackAPI] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
