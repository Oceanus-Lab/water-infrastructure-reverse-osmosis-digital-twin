/**
 * Seeds ro_embeddings.qa_cache with grounded answers to the RO Assistant's core questions.
 *
 * Why this exists: the custom Gemini Enterprise agent is blocked by a per-day interaction
 * quota (see docs/11-agent-enterprise-quota.md). The stream route checks this cache before
 * calling the agent and falls back to it when the agent 429s — so seeded questions answer
 * instantly with zero agent-quota dependency.
 *
 * Answers are grounded in the real source-tracing outputs at replay date 2021-01-13
 * (fouling forecast, delta economics, validation report). Numbers carry their evidence and
 * measured-vs-modeled labels per the project constitution.
 *
 * Embeddings use text-embedding-005 (768-dim) — MUST match EMBED_MODEL in
 * app/api/agent/stream/route.ts or vector distances are meaningless.
 *
 * Run:  cd services/frontend && node scripts/seed-qa-cache.mjs
 * Idempotent: deletes any existing rows for these questions before inserting.
 */
import { GoogleGenAI } from '@google/genai';
import { BigQuery } from '@google-cloud/bigquery';

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'spatial-cat-489006-a4';
const EMBED_MODEL = 'text-embedding-005';
const TABLE = `${PROJECT}.ro_embeddings.qa_cache`;

const ai = new GoogleGenAI({ enterprise: true, project: PROJECT, location: 'global' });
const bq = new BigQuery({ projectId: PROJECT });

// Grounded Q&A — real values pulled from the serving-api at 2021-01-13.
const QA = [
  {
    q: 'Which unit is fouling fastest?',
    a: "B03 is fouling fastest. Its normalized ΔP is climbing about 0.054 per day and now sits +5.26 above its WaterTAP clean-membrane baseline (fouling trend R² 0.59), which puts it at its action threshold today — it's flagged critical for organic fouling. Next-fastest are E01 (~0.029/day, R² 0.78, ~2 days to threshold) and C02 (~0.030/day, ~5 days). Evidence: physics-deviation vs the clean baseline plus the fouling-onset forecast, both on measured ΔP.",
  },
  {
    q: 'Clean now or wait on B03?',
    a: "Recommendation: WAIT — even though B03 is at its fouling threshold. The extra energy from its fouling is only about $0.63/day right now (ΔP rise 5.26 psi → +0.0158 kWh/m³ specific energy, modeled), while a clean-in-place costs about $5,000. At that rate the cleaning would take ~880 days to pay for itself, so cleaning today isn't justified on energy alone. Watch for a step-change in ΔP or salt passage that would shift the call. (Energy here is modeled, medium credibility; the ΔP is measured.)",
  },
  {
    q: "What's driving this week's energy cost?",
    a: "Fouling-driven ΔP on the flagged units — not the electricity price, which is steady at $0.12/kWh. B03, E01 and C02 are the main contributors: each is at or near its fouling threshold with rising normalized ΔP, which raises specific energy consumption. B03 alone adds ~$0.0158 kWh/m³ (~$0.63/day, ~$18.54 accumulated this cycle, modeled). Lead with the delta: the cost rise tracks fouling, so it reverses at the next cleaning rather than being a permanent step-up.",
  },
  {
    q: 'Which units need attention?',
    a: "12 units are flagged as of 2021-01-13, all for imminent organic fouling. Most urgent by projected days-to-threshold: B03 (~0 days), E01 (~2 days), C02 (~5 days), then E02 (~13 days). These come from the fouling-onset forecast on measured ΔP against each unit's clean baseline. The rest of the fleet is within normal range.",
  },
  {
    q: 'How accurate is the fouling forecast?',
    a: "It's validated against all 71 real cleaning (CIP) events in the OCWD history, not a synthetic set. The best early-warning signal, salt passage, catches about 21% of cleanings at 50% precision, with a median lead time of 39 days before the clean — a genuine early warning, not a guarantee. ΔP rise gives a shorter ~5-day median lead. The full report is in the validation panel.",
  },
  {
    q: 'Is the plant healthy?',
    a: "Mixed. Most of the fleet is in normal range, but 12 of 21 units are flagged for imminent organic fouling as of 2021-01-13 — B03, E01 and C02 are nearest their action thresholds (0–5 days). No integrity or scaling alarms. Health scores come from each unit's ΔP deviation vs its WaterTAP clean baseline; banks F–G use measured energy, A–E are physics-modeled.",
  },
];

const chunk = (text, id) => ({ id, steps: [{ role: 'model', content: [{ text }] }] });

async function main() {
  const questions = QA.map((x) => x.q);

  // Idempotent: clear prior rows for these questions.
  await bq.query({
    query: `DELETE FROM \`${TABLE}\` WHERE question_text IN UNNEST(@qs)`,
    params: { qs: questions },
  });

  for (const { q, a } of QA) {
    const res = await ai.models.embedContent({ model: EMBED_MODEL, contents: q });
    const embedding = res.embeddings?.[0]?.values;
    if (!embedding) throw new Error(`No embedding for: ${q}`);

    const answerJson = JSON.stringify([chunk(a, `seed-${Buffer.from(q).toString('base64url').slice(0, 12)}`)]);

    await bq.query({
      query: `
        INSERT INTO \`${TABLE}\`
        (question_embedding, question_text, answer_json, cached_at, is_time_sensitive)
        VALUES (@embedding, @text, PARSE_JSON(@answer), CURRENT_TIMESTAMP(), FALSE)
      `,
      params: { embedding, text: q, answer: answerJson },
    });
    console.log(`seeded (${embedding.length}-dim): ${q}`);
  }

  const [[{ n }]] = await bq.query(`SELECT COUNT(*) AS n FROM \`${TABLE}\``);
  console.log(`\ndone — qa_cache now has ${n} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
