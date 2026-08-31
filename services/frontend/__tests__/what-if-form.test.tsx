import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { mockFetchPending, mockFetchRoutes } from './helpers/mock-fetch';
import { WhatIfForm } from '@/components/simulation/what-if-form';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SOLVED = {
  baseline: { available: true, fidelity: 'high', clean_water_flux_kg_m2_h: 8.42, clean_salt_rejection_pct: 99.21, operating_point: {}, provenance: 'modeled' },
  scenario: { available: true, fidelity: 'high', clean_water_flux_kg_m2_h: 10.5, clean_salt_rejection_pct: 99.4, operating_point: {}, provenance: 'modeled' },
  change: { pressure_bar: 20 },
  delta: { flux_kg_m2_h: 2.08, rejection_pct: 0.19 },
};

describe('WhatIfForm — arbitrary conditions, on demand (US2)', () => {
  it('exposes every supported operating condition as an independent field (FR-013)', () => {
    render(<WhatIfForm />);
    for (const label of [/feed salinity/i, /temperature/i, /pressure/i, /recovery/i, /membrane area/i]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('bounds each field to the supported envelope so most rejections never reach the solver (FR-010)', () => {
    render(<WhatIfForm />);
    const temp = screen.getByLabelText(/temperature/i) as HTMLInputElement;
    expect(temp.min).toBe('5');
    expect(temp.max).toBe('45');
  });

  it('shows work in progress while a comparison is computing (FR-014, SC-008)', async () => {
    mockFetchPending();
    render(<WhatIfForm />);
    fireEvent.click(screen.getByRole('button', { name: /compare/i }));
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    expect(screen.getByText(/computing/i)).toBeTruthy();
  });

  it('lets the user abandon a comparison in progress (FR-014, SC-008)', async () => {
    mockFetchPending();
    render(<WhatIfForm />);
    fireEvent.click(screen.getByRole('button', { name: /compare/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByText(/computing/i)).toBeNull());
  });

  it('leaves no partial result behind after a cancellation (FR-014)', async () => {
    mockFetchPending();
    render(<WhatIfForm />);
    fireEvent.click(screen.getByRole('button', { name: /compare/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText(/8\.42/)).toBeNull();
      expect(screen.queryByText(/delta/i)).toBeNull();
    });
  });

  it('sends the conditions actually requested and renders the returned result (FR-013)', async () => {
    const fetchFn = mockFetchRoutes({ '/api/physics/what-if': { json: SOLVED } });
    render(<WhatIfForm />);
    fireEvent.change(screen.getByLabelText(/pressure/i), { target: { value: '17.3' } });
    fireEvent.click(screen.getByRole('button', { name: /compare/i }));

    await waitFor(() => expect(screen.getByText('8.42')).toBeTruthy());
    const body = JSON.parse((fetchFn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.change.pressure_bar).toBe(17.3);
  });

  it('reports a rejected request without extrapolating a figure (FR-010)', async () => {
    mockFetchRoutes({
      '/api/physics/what-if': { ok: false, status: 422, json: { detail: "parameter 'temp_c' out of range" } },
    });
    render(<WhatIfForm />);
    fireEvent.click(screen.getByRole('button', { name: /compare/i }));
    await waitFor(() => expect(screen.getByText(/out of range/i)).toBeTruthy());
  });
});
