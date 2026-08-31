import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProposalCard } from '@/components/assistant/artifacts/proposal-card';

describe('ProposalCard & HITL Approval', () => {
  it('renders pending proposal card and allows approval', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ decisionId: 'dec-123', status: 'COMMITTED_TO_AUDIT_LOG' }),
    } as any);

    const artifact = {
      type: 'proposal' as const,
      proposalId: 'prop-b03-clean',
      unitId: 'B03',
      action: 'CLEAN_NOW' as const,
      economicImpact: { netBenefit: 1250, assumedElectricity: 0.08, assumedCipCost: 5000 },
      status: 'pending' as const,
    };

    render(<ProposalCard artifact={artifact} />);
    expect(screen.getByText('Gated Action Proposal — CLEAN NOW')).toBeDefined();
    expect(screen.getByText('+$1,250')).toBeDefined();

    const approveBtn = screen.getByRole('button', { name: /Approve & Record Decision/i });
    fireEvent.click(approveBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/agent/approve', expect.any(Object));
  });
});
