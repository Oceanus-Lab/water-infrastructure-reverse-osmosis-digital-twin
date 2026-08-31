import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { mockFetchRoutes } from './helpers/mock-fetch';
import { DecisionRecordPanel } from '@/components/decisions/decision-record-panel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ENTRIES = {
  entries: [
    {
      proposalId: 'prop-1724800000',
      recordType: 'decision',
      unitId: 'B03',
      content: { note: 'Scheduled CIP for B03 next window' },
      writtenAt: '2026-08-28T09:14:22.000Z',
      writtenBy: 'operator_approved_via_hitl_chip',
    },
  ],
};

describe('DecisionRecordPanel (US4)', () => {
  it('shows an approved decision with its time, scope and content (FR-020)', async () => {
    mockFetchRoutes({ '/api/agent/decisions': { json: ENTRIES } });
    render(<DecisionRecordPanel />);
    await waitFor(() => {
      expect(screen.getByText('B03')).toBeTruthy();
      expect(screen.getByText(/scheduled cip/i)).toBeTruthy();
    });
  });

  it('shows an explicit empty state and no sample row when nothing is recorded (FR-021)', async () => {
    mockFetchRoutes({ '/api/agent/decisions': { json: { entries: [] } } });
    render(<DecisionRecordPanel />);
    await waitFor(() => expect(screen.getByText(/no decisions have been recorded/i)).toBeTruthy());
    expect(screen.queryByRole('row')).toBeNull();
  });

  it('distinguishes an unreachable store from an empty record (contracts)', async () => {
    mockFetchRoutes({ '/api/agent/decisions': { ok: false, status: 503 } });
    render(<DecisionRecordPanel />);
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    expect(screen.queryByText(/no decisions have been recorded/i)).toBeNull();
  });

  it('presents the authorisation basis, not a personal identity (data-model §4)', async () => {
    mockFetchRoutes({ '/api/agent/decisions': { json: ENTRIES } });
    render(<DecisionRecordPanel />);
    await waitFor(() => expect(screen.getByText(/approved by an operator/i)).toBeTruthy());
  });

  it('exposes no write, edit or delete control (FR-032, SC-014)', async () => {
    mockFetchRoutes({ '/api/agent/decisions': { json: ENTRIES } });
    render(<DecisionRecordPanel />);
    await waitFor(() => expect(screen.getByText('B03')).toBeTruthy());
    for (const name of [/delete/i, /edit/i, /remove/i, /new decision/i]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });
});
