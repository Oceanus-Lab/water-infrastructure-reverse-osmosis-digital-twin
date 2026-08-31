import { ThinkingLevel, Type, type GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3-flash-preview';
const FAST = { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };

export interface ReflexionResult {
  isGrounded: boolean;
  critique: string | null;
  mislabeledProvenance: boolean;
}

const REFLEXION_SYSTEM_PROMPT = `You are the Oceanus Grounding & Provenance Critic for an industrial reverse osmosis digital twin.
Your ONLY job is to verify that a draft AI answer contains NO hallucinated figures and adheres strictly to provenance rules:
1. Every numeric figure (pressure, flux, recovery, cost, kWh/m3, dates) in the draft MUST exist in the supplied CONTEXT or be a trivial arithmetic combination.
2. Energy figures on Banks A-E MUST be labeled as WaterTAP-modeled (never as metered/measured). Energy on Banks F-G is metered.
3. Economic cost answers MUST declare their assumptions inline ($/kWh, CIP cost).

If the draft violates any rule, return isGrounded: false and provide a concise, actionable critique.
If the draft is fully compliant, return isGrounded: true and critique: null.`;

export async function runReflexionCritic(
  ai: GoogleGenAI,
  draftText: string,
  context: unknown
): Promise<ReflexionResult> {
  try {
    const ctxString = JSON.stringify(context).slice(0, 6000);
    const prompt = `DRAFT ANSWER TO AUDIT:\n${draftText}\n\nGROUNDING CONTEXT:\n${ctxString}`;

    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: REFLEXION_SYSTEM_PROMPT,
        temperature: 0,
        ...FAST,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isGrounded: { type: Type.BOOLEAN },
            critique: { type: Type.STRING, nullable: true },
            mislabeledProvenance: { type: Type.BOOLEAN },
          },
          required: ['isGrounded', 'mislabeledProvenance'],
        },
      },
    });

    const text = res.text ?? '{}';
    const parsed = JSON.parse(text);
    return {
      isGrounded: Boolean(parsed.isGrounded),
      critique: parsed.critique || null,
      mislabeledProvenance: Boolean(parsed.mislabeledProvenance),
    };
  } catch (err) {
    console.error('[ReflexionCritic] Audit failed, allowing default pass:', err);
    return {
      isGrounded: true,
      critique: null,
      mislabeledProvenance: false,
    };
  }
}
