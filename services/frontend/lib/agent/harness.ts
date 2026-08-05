/**
 * In-route multi-agent harness (Coordinator → specialists → composer) running on generateContent.
 *
 * Preserves the topology and mounted-skill contracts of the ADK agent in services/agent/, but
 * bypasses the quota-blocked Agent Platform interactions endpoint (docs/11-agent-enterprise-quota.md).
 * Flow: router picks specialists + units → grounding is fetched from serving-api → each specialist
 * reasons over ONLY its grounding → the coordinator composes one answer, streamed to the caller.
 */
import { Type, type GoogleGenAI } from '@google/genai';
import { ROUTER_SYSTEM, COMPOSER_SYSTEM, SPECIALIST_SYSTEM, type SpecialistId } from './prompts';
import { extractUnits, fetchGrounding, DEFAULT_DATE } from './grounding';

const MODEL = 'gemini-3-flash-preview';
const ALL_SPECIALISTS: SpecialistId[] = ['dataAnalyst', 'simulation', 'economics', 'document'];
const MAX_CONTEXT_CHARS = 6000;

interface RouterDecision {
  specialists: SpecialistId[];
  units: string[];
  needsClarification?: string | null;
}

async function route(ai: GoogleGenAI, question: string): Promise<RouterDecision> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: question,
    config: {
      systemInstruction: ROUTER_SYSTEM,
      temperature: 0,
      responseMimeType: 'application/json',
      // Structured output guarantees clean JSON (the model otherwise sometimes emits trailing
      // braces or markdown fences that break JSON.parse).
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          specialists: { type: Type.ARRAY, items: { type: Type.STRING } },
          units: { type: Type.ARRAY, items: { type: Type.STRING } },
          needsClarification: { type: Type.STRING, nullable: true },
        },
        required: ['specialists', 'units'],
      },
    },
  });
  const text = res.text ?? '{}';
  let parsed: any = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    // Last-resort salvage: grab the first balanced-looking object.
    const m = text.match(/\{[\s\S]*\}/);
    try {
      parsed = m ? JSON.parse(m[0]) : {};
    } catch {
      parsed = {};
    }
  }
  const specialists = (Array.isArray(parsed.specialists) ? parsed.specialists : []).filter(
    (s: string): s is SpecialistId => (ALL_SPECIALISTS as string[]).includes(s),
  );
  return {
    specialists: specialists.length ? specialists : ['dataAnalyst'], // safe default
    units: Array.isArray(parsed.units) ? parsed.units : [],
    needsClarification: parsed.needsClarification ?? null,
  };
}

async function runSpecialist(
  ai: GoogleGenAI,
  id: SpecialistId,
  context: unknown,
): Promise<{ id: SpecialistId; finding: string }> {
  const ctx = JSON.stringify(context).slice(0, MAX_CONTEXT_CHARS);
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: `CONTEXT (the only data you may cite):\n${ctx}`,
    config: { systemInstruction: SPECIALIST_SYSTEM[id], temperature: 0.2 },
  });
  return { id, finding: res.text ?? '' };
}

/**
 * Run the harness for a question, streaming the composed answer token-by-token via `onToken`.
 * Throws on model failure so the caller can fall back to cache / honest message.
 */
export async function runHarness(
  ai: GoogleGenAI,
  question: string,
  onToken: (text: string) => void,
  date: string = DEFAULT_DATE,
): Promise<void> {
  // 1. Route.
  const decision = await route(ai, question);
  if (decision.needsClarification) {
    onToken(decision.needsClarification);
    return;
  }

  // 2. Ground (merge router units with a regex pass so we never miss an explicit unit).
  const units = [...new Set([...decision.units, ...extractUnits(question)])];
  const grounding = await fetchGrounding(decision.specialists, units, date, question);

  // 3. Specialists reason in parallel, each over ONLY its grounding.
  const findings = await Promise.all(
    decision.specialists
      .filter((id) => grounding.data[id] !== undefined)
      .map((id) => runSpecialist(ai, id, grounding.data[id])),
  );

  // 4. Coordinator composes one grounded answer, streamed.
  const findingsBlock =
    findings.map((f) => `### ${f.id} finding\n${f.finding}`).join('\n\n') ||
    '(no specialist produced a grounded finding)';

  const composePrompt =
    `OPERATOR QUESTION: ${question}\n\n` +
    `SCOPE: ${grounding.scope}${grounding.units.length ? ` (units: ${grounding.units.join(', ')})` : ''}, ` +
    `as of ${grounding.date} (replay clock).\n\n` +
    `SPECIALIST FINDINGS (the only figures you may state):\n\n${findingsBlock}`;

  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: composePrompt,
    config: { systemInstruction: COMPOSER_SYSTEM, temperature: 0.3 },
  });

  for await (const chunk of stream) {
    const t = chunk.text;
    if (t) onToken(t);
  }
}
