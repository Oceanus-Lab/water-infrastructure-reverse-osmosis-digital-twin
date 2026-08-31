import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThinkingAccordion } from '@/components/assistant/thinking-accordion';

describe('ThinkingAccordion', () => {
  it('renders specialist consultation list and durations', () => {
    const thinking = {
      summary: 'Evaluating Unit B03 degradation',
      specialistsConsulted: [
        { id: 'dataAnalyst' as const, status: 'completed' as const, durationMs: 420 },
        { id: 'simulation' as const, status: 'completed' as const, durationMs: 650 },
      ],
      reflexionCritique: 'Verified no ungrounded numbers.',
    };

    render(<ThinkingAccordion thinking={thinking} />);
    expect(screen.getByText('Evaluating Unit B03 degradation')).toBeDefined();
    expect(screen.getByText('dataAnalyst')).toBeDefined();
    expect(screen.getByText('420ms')).toBeDefined();
    expect(screen.getByText('simulation')).toBeDefined();
    expect(screen.getByText('650ms')).toBeDefined();
    expect(screen.getByText(/Verified no ungrounded numbers/)).toBeDefined();
  });
});
