/**
 * In-route multi-agent harness (Coordinator → specialists → composer) running on generateContent.
 *
 * Preserves the topology and mounted-skill contracts of the ADK agent in services/agent/, but
 * bypasses the quota-blocked Agent Platform interactions endpoint (docs/11-agent-enterprise-quota.md).
 * Flow: router picks specialists + units → grounding is fetched from serving-api → each specialist
 * reasons over ONLY its grounding → the coordinator composes one answer, streamed to the caller.
 */
import { ThinkingLevel, Type, type GoogleGenAI } from '@google/genai';
import { ROUTER_SYSTEM, COMPOSER_SYSTEM, SPECIALIST_SYSTEM, type SpecialistId } from './prompts';
import { extractUnits, fetchGrounding, DEFAULT_DATE } from './grounding';
import { startSpan } from './tracing';
import { runReflexionCritic } from './reflexion';

// One model throughout.
//
// Latency was measured per stage on the deployed service: route 2-11 s, specialists 8-10 s,
// compose 1.7-3.2 s, of a ~24 s total. A single specialist alone still took 9.5 s, so it is
// per-call latency rather than fan-out, and thinkingLevel LOW moved nothing.
//
// Routing the cheap stages to gemini-2.5-flash was tried and reverted: that model is not
// served on this enterprise endpoint, so every call threw and the harness fell straight to
// its "couldn't complete that answer" fallback — a 1.2 s response that looked fast and said
// nothing. Left here so the next person does not repeat the experiment.
const MODEL = 'gemini-3-flash-preview';
const ALL_SPECIALISTS: SpecialistId[] = ['dataAnalyst', 'simulation', 'economics', 'document'];
const MAX_CONTEXT_CHARS = 6000;

// Gemini 3 reasons before answering by default. Measured on the deployed service: the router
// took 2.6 s and the specialist fan-out 8.7 s of a 20 s total, for two jobs that need no
// deliberation — the router classifies into a fixed set, and a specialist restates figures it
// was handed under a rule about what it may cite. The composer keeps the default budget; that
// is where the reasoning actually earns its latency.
const FAST = { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };

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
      ...FAST,
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
    config: { systemInstruction: SPECIALIST_SYSTEM[id], temperature: 0.2, ...FAST },
  });
  return { id, finding: res.text ?? '' };
}

export interface HarnessEvent {
  type: 'thinking' | 'specialist' | 'reflexion' | 'token';
  payload: any;
}

/**
 * Run the harness for a question, streaming the composed answer token-by-token via `onToken`.
 * Optionally emits structured lifecycle events via `onEvent`.
 * Throws on model failure so the caller can fall back to cache / honest message.
 */
export async function runHarness(
  ai: GoogleGenAI,
  question: string,
  onToken: (text: string) => void,
  date: string = DEFAULT_DATE,
  onEvent?: (event: HarnessEvent) => void,
): Promise<{ durationMs: number; finalAnswer: string }> {
  const span = startSpan('harness.execution', { question, date });
  const t0 = Date.now();

  onEvent?.({
    type: 'thinking',
    payload: { status: 'running', summary: 'Classifying operator intent and routing to plant specialists...' },
  });

  // 1. Route.
  const routeSpan = startSpan('harness.route');
  const decision = await route(ai, question);
  routeSpan.end({ specialistsCount: decision.specialists.length });

  if (decision.needsClarification) {
    onToken(decision.needsClarification);
    span.end({ status: 'needsClarification' });
    return { durationMs: Date.now() - t0, finalAnswer: decision.needsClarification };
  }

  onEvent?.({
    type: 'thinking',
    payload: {
      status: 'running',
      summary: `Consulting specialists: ${decision.specialists.join(', ')}...`,
      specialists: decision.specialists,
    },
  });

  // 2. Ground (merge router units with a regex pass so we never miss an explicit unit).
  const units = [...new Set([...decision.units, ...extractUnits(question)])];
  const groundSpan = startSpan('harness.grounding');
  const grounding = await fetchGrounding(decision.specialists, units, date, question);
  groundSpan.end({ scope: grounding.scope, unitsCount: grounding.units.length });

  // 3. Specialists reason in parallel, each over ONLY its grounding.
  const specSpan = startSpan('harness.specialists');
  const findings = await Promise.all(
    decision.specialists
      .filter((id) => grounding.data[id] !== undefined)
      .map(async (id) => {
        const specStart = Date.now();
        const res = await runSpecialist(ai, id, grounding.data[id]);
        onEvent?.({
          type: 'specialist',
          payload: { id, status: 'completed', durationMs: Date.now() - specStart, findingsPreview: res.finding.slice(0, 100) },
        });
        return res;
      }),
  );
  specSpan.end({ findingsCount: findings.length });

  // 4. Coordinator composes one grounded answer.
  const findingsBlock =
    findings.map((f) => `### ${f.id} finding\n${f.finding}`).join('\n\n') ||
    '(no specialist produced a grounded finding)';

  const composePrompt =
    `OPERATOR QUESTION: ${question}\n\n` +
    `SCOPE: ${grounding.scope}${grounding.units.length ? ` (units: ${grounding.units.join(', ')})` : ''}, ` +
    `as of ${grounding.date} (replay clock).\n\n` +
    `SPECIALIST FINDINGS (the only figures you may state):\n\n${findingsBlock}`;

  const composeSpan = startSpan('harness.compose');
  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: composePrompt,
    config: { systemInstruction: COMPOSER_SYSTEM, temperature: 0.3 },
  });

  let fullAnswer = '';
  for await (const chunk of stream) {
    const t = chunk.text;
    if (t) {
      fullAnswer += t;
      onToken(t);
      onEvent?.({ type: 'token', payload: { text: t } });
    }
  }
  composeSpan.end();

  // 5. Reflexion check for verification logging
  const reflexion = await runReflexionCritic(ai, fullAnswer, grounding.data);
  onEvent?.({
    type: 'reflexion',
    payload: reflexion,
  });

  const totalDuration = span.end({ isGrounded: reflexion.isGrounded });
  return { durationMs: totalDuration, finalAnswer: fullAnswer };
}
