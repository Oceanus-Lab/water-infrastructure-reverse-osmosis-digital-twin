import { describe, it, expect, vi } from 'vitest';
import { runReflexionCritic } from '@/lib/agent/reflexion';

describe('Reflexion Critic (Anti-Hallucination & Provenance Verification)', () => {
  const mockAi = {
    models: {
      generateContent: vi.fn(),
    },
  } as any;

  it('passes when draft numbers and provenance accurately match grounding context', async () => {
    mockAi.models.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        isGrounded: true,
        critique: null,
        mislabeledProvenance: false,
      }),
    });

    const context = {
      dataAnalyst: { unitId: 'B03', dpDeviation: 5.26, baseline: 4.50 },
    };
    const draft = 'Unit B03 normalized ΔP is 5.26 bar, +0.76 above baseline.';

    const result = await runReflexionCritic(mockAi, draft, context);
    expect(result.isGrounded).toBe(true);
    expect(result.critique).toBeNull();
  });

  it('detects ungrounded numerical claims and generates actionable critique', async () => {
    mockAi.models.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        isGrounded: false,
        critique: 'Draft cited $12,000 cleaning cost, but context contains $5,000.',
        mislabeledProvenance: false,
      }),
    });

    const context = {
      economics: { unitId: 'B03', cipCost: 5000 },
    };
    const draft = 'Cleaning unit B03 will cost $12,000.';

    const result = await runReflexionCritic(mockAi, draft, context);
    expect(result.isGrounded).toBe(false);
    expect(result.critique).toContain('$12,000');
  });

  it('detects mislabeled modeled energy on Bank A without explicit provenance', async () => {
    mockAi.models.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        isGrounded: false,
        critique: 'Bank A energy is WaterTAP-modeled, but draft stated it was metered.',
        mislabeledProvenance: true,
      }),
    });

    const context = {
      dataAnalyst: { unitId: 'A01', energyModel: 'WaterTAP_modeled' },
    };
    const draft = 'Metered power consumption for A01 is 1.85 kWh/m3.';

    const result = await runReflexionCritic(mockAi, draft, context);
    expect(result.isGrounded).toBe(false);
    expect(result.mislabeledProvenance).toBe(true);
  });
});
