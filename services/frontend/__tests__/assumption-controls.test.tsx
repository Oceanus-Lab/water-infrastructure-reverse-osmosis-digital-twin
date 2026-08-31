import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { mockFetchRoutes } from './helpers/mock-fetch';
import { AssumptionControls } from '@/components/economics/assumption-controls';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ASSUMPTIONS = [
  {
    key: 'electricity_price_usd_kwh', label: 'Electricity price', unit: 'USD/kWh',
    value: 0.08, defaultValue: 0.08, provenance: 'assumed' as const,
    assumption: 'No sourced price feed; parametric default', min: 0,
  },
  {
    key: 'cip_cost_usd', label: 'CIP cost', unit: 'USD',
    value: 3000, defaultValue: 3000, provenance: 'assumed' as const,
    assumption: 'Chemicals plus labour, parametric default', min: 0,
  },
];

const FLIPPED = {
  current: { recommendation: 'CLEAN NOW', recommendation_flipped: true, params: {} },
  history: [],
};
const NOT_FLIPPED = {
  current: { recommendation: 'WAIT', recommendation_flipped: false, params: {} },
  history: [],
};

describe('AssumptionControls (US3)', () => {
  it('shows every assumption with its value and marks it assumed (FR-018, FR-028)', () => {
    render(<AssumptionControls assumptions={ASSUMPTIONS} unitId="B03" date="2020-06-01" />);
    expect(screen.getByLabelText(/electricity price/i)).toBeTruthy();
    expect(screen.getByLabelText(/cip cost/i)).toBeTruthy();
    expect(screen.getAllByText(/assumed/i).length).toBeGreaterThan(0);
  });

  it('recomputes from a changed value (FR-016)', async () => {
    const fetchFn = mockFetchRoutes({ '/override': { json: NOT_FLIPPED } });
    render(<AssumptionControls assumptions={ASSUMPTIONS} unitId="B03" date="2020-06-01" />);

    fireEvent.change(screen.getByLabelText(/electricity price/i), { target: { value: '0.25' } });
    fireEvent.click(screen.getByRole('button', { name: /recompute/i }));

    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    const body = JSON.parse((fetchFn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.electricity_price_usd_kwh).toBe(0.25);
  });

  it('calls out a reversed recommendation explicitly (FR-017)', async () => {
    mockFetchRoutes({ '/override': { json: FLIPPED } });
    render(<AssumptionControls assumptions={ASSUMPTIONS} unitId="B03" date="2020-06-01" />);
    fireEvent.change(screen.getByLabelText(/electricity price/i), { target: { value: '0.25' } });
    fireEvent.click(screen.getByRole('button', { name: /recompute/i }));

    await waitFor(() => expect(screen.getByText(/recommendation changed/i)).toBeTruthy());
    expect(screen.getByText(/CLEAN NOW/)).toBeTruthy();
  });

  it('does not claim a reversal when none occurred (FR-017)', async () => {
    mockFetchRoutes({ '/override': { json: NOT_FLIPPED } });
    render(<AssumptionControls assumptions={ASSUMPTIONS} unitId="B03" date="2020-06-01" />);
    fireEvent.click(screen.getByRole('button', { name: /recompute/i }));
    await waitFor(() => expect(screen.getByText(/WAIT/)).toBeTruthy());
    expect(screen.queryByText(/recommendation changed/i)).toBeNull();
  });

  it('rejects an unusable value and leaves the previous result intact (FR-019)', async () => {
    mockFetchRoutes({ '/override': { json: NOT_FLIPPED } });
    render(<AssumptionControls assumptions={ASSUMPTIONS} unitId="B03" date="2020-06-01" />);

    fireEvent.click(screen.getByRole('button', { name: /recompute/i }));
    await waitFor(() => expect(screen.getByText(/WAIT/)).toBeTruthy());

    fireEvent.change(screen.getByLabelText(/electricity price/i), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /recompute/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/must be a number/i)).toBeTruthy();
    // the earlier result is still on screen
    expect(screen.getByText(/WAIT/)).toBeTruthy();
  });

  it('surfaces a server rejection without inventing a figure (FR-019)', async () => {
    mockFetchRoutes({
      '/override': { ok: false, status: 422, json: { detail: "parameter 'cip_cost_usd' must be finite and >= 0" } },
    });
    render(<AssumptionControls assumptions={ASSUMPTIONS} unitId="B03" date="2020-06-01" />);
    fireEvent.click(screen.getByRole('button', { name: /recompute/i }));
    await waitFor(() => expect(screen.getByText(/must be finite/i)).toBeTruthy());
  });

  it('can restore the defaults', () => {
    render(<AssumptionControls assumptions={ASSUMPTIONS} unitId="B03" date="2020-06-01" />);
    const field = screen.getByLabelText(/electricity price/i) as HTMLInputElement;
    fireEvent.change(field, { target: { value: '0.25' } });
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(field.value).toBe('0.08');
  });
});
