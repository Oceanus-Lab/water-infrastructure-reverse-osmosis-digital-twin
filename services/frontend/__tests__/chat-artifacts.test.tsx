import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SparklineWidget } from '@/components/assistant/artifacts/sparkline-widget';
import { WhatIfWidget } from '@/components/assistant/artifacts/what-if-widget';
import { CitationPopover } from '@/components/assistant/artifacts/citation-popover';

describe('Chat Interactive Artifacts', () => {
  it('renders SparklineWidget with metric and values', () => {
    const artifact = {
      type: 'sparkline' as const,
      unitId: 'B03',
      metric: 'Normalized ΔP',
      measuredData: [
        { date: '2021-01-01', value: 4.5 },
        { date: '2021-01-13', value: 5.26 },
      ],
    };

    render(<SparklineWidget artifact={artifact} />);
    expect(screen.getByText('Unit B03 — Normalized ΔP')).toBeDefined();
    expect(screen.getByText('5.26')).toBeDefined();
  });

  it('renders WhatIfWidget with recovery controls and modeled outputs', () => {
    const artifact = {
      type: 'what_if_delta' as const,
      unitId: 'A01',
      baseInputs: { recovery: 80, feedSalinity: 1200, temperature: 20 },
      modeledOutputs: { pressure: 14.5, sec: 1.88, permeateSalinity: 25 },
      deltas: { pressureDelta: 0.35, secDelta: 0.06 },
    };

    render(<WhatIfWidget artifact={artifact} />);
    expect(screen.getByText('WaterTAP Simulation Comparison — Unit A01')).toBeDefined();
    expect(screen.getByText('14.50 bar')).toBeDefined();
    expect(screen.getByText('1.88 kWh/m³')).toBeDefined();
  });

  it('renders CitationPopover button', () => {
    const artifact = {
      type: 'citation' as const,
      documentName: 'OCWD_CIP_Protocol.md',
      section: 'Section 4.2',
      relevanceScore: 0.95,
      snippet: 'Maintain pH between 11.5 and 12.0 during caustic clean.',
    };

    render(<CitationPopover artifact={artifact} />);
    expect(screen.getByText('OCWD_CIP_Protocol.md')).toBeDefined();
  });
});
