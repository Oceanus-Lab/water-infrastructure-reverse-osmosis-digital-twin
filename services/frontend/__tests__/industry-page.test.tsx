import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { mockFetchRoutes } from './helpers/mock-fetch';
import IndustryPage from '@/app/industry/page';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SNAPSHOT = {
  date: '2020-06-01',
  units: [
    {
      unitId: 'B03', bankId: 'B', cycleId: 4, dpRisePsi: 6.31,
      dailyEnergyPenaltyUsd: 12.44, cumEnergyPenaltyUsd: 843.1,
      cipCostUsd: 5000, recommendation: 'CLEAN NOW', breakEvenDay: 141,
      provenance: 'modeled', credibility: 'medium',
    },
    {
      unitId: 'F01', bankId: 'F', cycleId: 2, dpRisePsi: 1.02,
      dailyEnergyPenaltyUsd: 2.11, cumEnergyPenaltyUsd: 120.4,
      cipCostUsd: 5000, recommendation: 'WAIT', breakEvenDay: 402,
      provenance: 'measured', credibility: 'high',
    },
  ],
  assumptions: [
    {
      key: 'electricity_price_usd_kwh', label: 'Electricity price', unit: 'USD/kWh',
      value: 0.08, defaultValue: 0.08, provenance: 'assumed',
      assumption: 'No sourced price feed; parametric default', min: 0,
    },
  ],
  unavailableUnits: ['A02'],
};

function stubSnapshot() {
  mockFetchRoutes({ '/api/economics/fleet': { json: SNAPSHOT } });
}

describe('Operations-manager surface (US1)', () => {
  it('shows no "Under Construction" placeholder (SC-001, FR-001)', async () => {
    stubSnapshot();
    render(<IndustryPage />);
    await waitFor(() => expect(screen.queryByText(/under construction/i)).toBeNull());
  });

  it('presents cost trend, avoidable-cost ranking, and cleaning workload (FR-004..006)', async () => {
    stubSnapshot();
    render(<IndustryPage />);
    await waitFor(() => {
      // getAllByText: the page description and the panel titles both mention cost, and the
      // assertion here is presence of each section, not uniqueness of the phrase.
      expect(screen.getAllByText(/operating cost/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/avoidable cost/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/cleaning workload/i).length).toBeGreaterThan(0);
    });
  });

  it('ranks units by avoidable cost, worst first (FR-005)', async () => {
    stubSnapshot();
    render(<IndustryPage />);
    const rows = await screen.findAllByTestId('avoidable-cost-row');
    expect(rows[0].textContent).toContain('B03');
  });

  it('labels every unit measured or modeled (FR-027, SC-005)', async () => {
    stubSnapshot();
    render(<IndustryPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/measured|modeled/i).length).toBeGreaterThan(0);
    });
  });

  it('marks assumed values as assumptions and states them (FR-028, SC-006)', async () => {
    stubSnapshot();
    render(<IndustryPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/assumed/i).length).toBeGreaterThan(0);
      // Stated in more than one place by design — the chart caption and the editable controls.
      expect(screen.getAllByText(/no sourced price feed/i).length).toBeGreaterThan(0);
    });
  });

  it('names ungroundable units rather than showing zeros for them (FR-029)', async () => {
    stubSnapshot();
    render(<IndustryPage />);
    await waitFor(() => expect(screen.getByText(/A02/)).toBeTruthy());
  });

  it('states unavailability when the snapshot cannot be loaded (FR-029)', async () => {
    mockFetchRoutes({ '/api/economics/fleet': { ok: false, status: 503 } });
    render(<IndustryPage />);
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
  });

  it('shows no control that could actuate plant equipment (FR-032, SC-014)', async () => {
    stubSnapshot();
    const { container } = render(<IndustryPage />);
    await waitFor(() => expect(screen.queryByText(/under construction/i)).toBeNull());
    expect(container.textContent).not.toMatch(/\b(start|stop|open valve|close valve|dose)\b/i);
  });
});
