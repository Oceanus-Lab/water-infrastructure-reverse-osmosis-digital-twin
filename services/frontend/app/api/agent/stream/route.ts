import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import { runHarness } from '@/lib/agent/harness';

// One place for the project id. The two qa_cache SQL statements below embedded it as a
// literal, so on any project other than spatial-cat the semantic cache silently failed to
// resolve — and that cache IS the mitigation for the agent's preview-tier quota wall
// (docs/11-agent-enterprise-quota.md). Losing it there means losing the fallback entirely.
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'spatial-cat-489006-a4';
const QA_CACHE = `${PROJECT}.ro_embeddings.qa_cache`;

const ai = new GoogleGenAI({
  enterprise: true,
  project: PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

const bq = new BigQuery({ projectId: PROJECT });

// Embedding model for the semantic cache. MUST match the model used to seed qa_cache
// (scripts/seed-qa-cache.mjs — see docs/11-agent-enterprise-quota.md) or vector distances are
// meaningless. text-embedding-005 is 768-dim, same as the cache column.
const EMBED_MODEL = 'text-embedding-005';
const CACHE_MAX_DISTANCE = 0.08; // cosine; tight enough to avoid serving a wrong cached answer

const TIME_SENSITIVE_REGEX = /\b(now|current|today|this cycle)\b/i;

// Greetings / "what can you do" — answered locally, no model call.
const GREETING_REGEX = /^\s*(hi|hey+|hello|yo|sup|howdy|hiya|greetings|good (morning|afternoon|evening)|thanks|thank you)\b|\b(what can (i|you|this|the assistant)|what (do|can) you do|what can i ask|how (do i|does this|do you) (use|work)|how to use|how does this (work|help)|who are you|what are you|what is this|help me)\b|^\s*help\b/i;

const GREETING_MESSAGE =
  "Hi — I'm the RO diagnostic assistant. I can walk you through what the live plant data shows. " +
  "Ask me about any unit or bank, for example:\n\n" +
  "• Which unit is fouling fastest?\n" +
  "• Clean now or wait on B03?\n" +
  "• What's driving this week's energy cost?\n" +
  "• Why is Bank F's energy climbing?\n" +
  "• Is the plant healthy?\n\n" +
  "Every figure I give is grounded in the live plant data and labeled measured or modeled.";

const FALLBACK_MESSAGE =
  "I couldn't complete that answer just now. Try one of the suggested questions or rephrase — " +
  "the plant metrics on screen are live.";

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

const encodeSse = (chunk: unknown) =>
  new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`);

// The frontend appends `steps[last].content[0].text` from each chunk, so streaming one chunk per
// token reconstructs the full answer; a single chunk with the whole text renders at once.
const messageChunk = (text: string, id: string) => ({
  id,
  steps: [{ role: 'model', content: [{ text }] }],
});

function streamStaticChunks(chunks: unknown[]): Response {
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encodeSse(c));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

async function embedQuestion(text: string): Promise<number[] | null> {
  try {
    const res = await ai.models.embedContent({ model: EMBED_MODEL, contents: text });
    return res.embeddings?.[0]?.values ?? null;
  } catch (err) {
    console.error('Embedding failed:', err);
    return null;
  }
}

// Returns the cached answer chunks for a semantically-matching question, or null.
async function lookupCache(embedding: number[]): Promise<unknown[] | null> {
  try {
    const query = `
      SELECT base.answer_json AS answer_json, distance
      FROM VECTOR_SEARCH(
        TABLE \`${QA_CACHE}\`,
        'question_embedding',
        (SELECT @embedding AS question_embedding),
        top_k => 1,
        distance_type => 'COSINE'
      )
      WHERE distance < ${CACHE_MAX_DISTANCE}
    `;
    const [rows] = await bq.query({ query, params: { embedding } });
    if (!rows.length) return null;
    const raw = rows[0].answer_json;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error('Cache lookup failed:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { input, date } = await req.json();
    if (!input) {
      return new Response(JSON.stringify({ error: 'Missing input text' }), { status: 400 });
    }

    // 0. Greetings / help — answered locally, no model call.
    if (GREETING_REGEX.test(input)) {
      return streamStaticChunks([messageChunk(GREETING_MESSAGE, `greeting-${Date.now()}`)]);
    }

    const isTimeSensitive = TIME_SENSITIVE_REGEX.test(input);
    const embedding = await embedQuestion(input);

    // 1. For non-time-sensitive questions, serve an instant cache hit (seeded demo answers).
    if (!isTimeSensitive && embedding) {
      const cached = await lookupCache(embedding);
      if (cached) return streamStaticChunks(cached);
    }

    // 2. Otherwise run the in-route multi-agent harness (Coordinator → specialists → composer),
    //    grounded in the serving-api. On failure, fall back to the cache, then an honest message.
    const answerId = `harness-${Date.now()}`;
    const stream = new ReadableStream({
      async start(controller) {
        let emitted = 0;
        let full = '';
        try {
          await runHarness(
            ai,
            input,
            (t) => {
              emitted++;
              full += t;
              controller.enqueue(encodeSse(messageChunk(t, answerId)));
            },
            typeof date === 'string' ? date : undefined,
          );
        } catch (err) {
          console.error('Harness failed:', err);
          if (emitted === 0) {
            if (embedding) {
              const cached = await lookupCache(embedding);
              if (cached) {
                for (const c of cached) controller.enqueue(encodeSse(c));
                controller.close();
                return;
              }
            }
            controller.enqueue(encodeSse(messageChunk(FALLBACK_MESSAGE, `fallback-${Date.now()}`)));
          }
        }
        controller.close();

        // Cache write-back for non-time-sensitive answers, so repeats are instant.
        if (!isTimeSensitive && embedding && emitted > 0 && full.trim()) {
          const answerJson = JSON.stringify([messageChunk(full, answerId)]);
          bq.query({
            query: `
              INSERT INTO \`${QA_CACHE}\`
              (question_embedding, question_text, answer_json, cached_at, is_time_sensitive)
              VALUES (@embedding, @text, PARSE_JSON(@answer), CURRENT_TIMESTAMP(), FALSE)
            `,
            params: { embedding, text: input, answer: answerJson },
          }).catch((e) => console.error('Cache write error:', e));
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error: any) {
    console.error('Agent stream route error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
