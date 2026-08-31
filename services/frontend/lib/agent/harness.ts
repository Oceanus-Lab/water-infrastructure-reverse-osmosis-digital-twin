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

function fastRoute(question: string): RouterDecision | null {
  const q = question.toLowerCase().trim();
  const units = extractUnits(question);

  // 0. Conversational, Greetings & Capability Inquiries (0-Specialist Direct Response)
  if (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q === 'good morning' ||
    q === 'good afternoon' ||
    q.includes('new to this place') ||
    q.includes('new here') ||
    q.includes('who are you') ||
    q.includes('what is this') ||
    q.includes('what can you do') ||
    q.includes('how to use') ||
    q.includes('help me') ||
    q === 'help'
  ) {
    return {
      specialists: [],
      units: [],
      needsClarification:
        "Welcome! I am the RO Digital Twin diagnostic assistant for plant operators and engineers. You can ask me to analyze specific units (e.g., 'Analyze unit F01'), run What-If simulations ('Clean now or wait on B03?'), look up SOP protocols ('What is the silica CIP protocol?'), or review fleet economics.",
    };
  }

  // 1. Decision & Unit Diagnostic Queries: cross-functional review (Data + Simulation + Economics)
  if (
    q.includes('clean now or wait') ||
    q.includes('should i clean') ||
    q.includes('when to clean') ||
    (units.length > 0 && (q.includes('analyze') || q.includes('status') || q.includes('inspect') || q.includes('health') || q.includes('what about')))
  ) {
    return { specialists: ['dataAnalyst', 'simulation', 'economics'], units };
  }

  // 2. Fouling Rate & Delta P Trends
  if (q.includes('fouling fastest') || q.includes('fouling rate') || q.includes('delta p') || q.includes('pressure drop') || q.includes('anomaly')) {
    return { specialists: ['dataAnalyst', 'simulation'], units };
  }

  // 3. Energy Economics & Penalties
  if (q.includes('energy cost') || q.includes('tariff') || q.includes('cost model') || q.includes('electricity rate') || q.includes('driving this week')) {
    return { specialists: ['economics', 'dataAnalyst'], units };
  }

  // 4. Standard Operating Procedures & Scaling RAG
  if (
    q.includes('sop') ||
    q.includes('protocol') ||
    q.includes('wash') ||
    q.includes('citric') ||
    q.includes('caustic') ||
    q.includes('silica') ||
    q.includes('scaling') ||
    q.includes('membrane cleaning') ||
    q.includes('procedure') ||
    q.includes('permit') ||
    q.includes('compliance')
  ) {
    return { specialists: ['document'], units };
  }

  // 5. WaterTAP What-If Simulation
  if (q.includes('simulate') || q.includes('what if') || q.includes('recovery rate') || q.includes('watertap')) {
    return { specialists: ['simulation'], units };
  }

  return null;
}

async function route(ai: GoogleGenAI, question: string): Promise<RouterDecision> {
  // Fast-path heuristic routing: executes in 0ms without consuming Gemini tokens or latency
  const fast = fastRoute(question);
  if (fast) return fast;

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

  // 1. Route.
  const routeSpan = startSpan('harness.route');
  const decision = await route(ai, question);
  routeSpan.end({ specialistsCount: decision.specialists.length });

  // If question is conversational, orientation, or needs clarification: respond directly with NO thinking DAG
  if (decision.specialists.length === 0 || decision.needsClarification) {
    const text =
      decision.needsClarification ||
      "Welcome! I am the RO Digital Twin diagnostic assistant. I can diagnose unit anomalies, simulate WaterTAP physics, compute cleaning economics, and look up standard CIP protocols. How can I help you today?";
    onToken(text);
    onEvent?.({ type: 'token', payload: { text } });
    span.end({ status: 'conversational' });
    return { durationMs: Date.now() - t0, finalAnswer: text };
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
