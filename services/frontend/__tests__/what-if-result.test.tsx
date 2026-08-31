import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WhatIfResult } from '@/components/simulation/what-if-result';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SOLVED = {
  baseline: {
    available: true, fidelity: 'high', solver_status: 'optimal',
    clean_water_flux_kg_m2_h: 8.42, clean_salt_rejection_pct: 99.21,
    operating_point: { tds_ppm: 1500, temp_c: 23, pressure_bar: 15, recovery: 0.85, membrane_area_m2: 50 },
    provenance: 'modeled',
  },
  scenario: {
    available: true, fidelity: 'high', solver_status: 'optimal',
    clean_water_flux_kg_m2_h: 10.57, clean_salt_rejection_pct: 99.39,
    operating_point: { tds_ppm: 1500, temp_c: 23, pressure_bar: 20, recovery: 0.85, membrane_area_m2: 50 },
    provenance: 'modeled',
  },
  change: { pressure_bar: 20 },
  delta: { flux_kg_m2_h: 2.15, rejection_pct: 0.18 },
};

// Every individual value is inside its range; the COMBINATION has no solution. The capability
// returns an actionable hint for exactly this case — flattening it into a generic error would
// make a correctly-behaving engine look broken (research R2).
const INFEASIBLE = {
  baseline: {
    available: true, solve_failed: 'infeasible', fallback: 'analytical',
    hint: 'No feasible solution at this combination. Higher feed temperature raises permeability, so at a fixed area and feed flow the permeate demand can exceed the feed. Try a smaller membrane_area_m2 or a lower temp_c.',
    operating_point: { tds_ppm: 1500, temp_c: 30, pressure_bar: 15, recovery: 0.85, membrane_area_m2: 50 },
  },
  scenario: { available: true, solve_failed: 'infeasible', fallback: 'analytical' },
  change: { temp_c: 30 },
  delta: null,
};

const UNAVAILABLE = {
  baseline: { available: false, reason: 'watertap-engine unreachable: URLError' },
  scenario: { available: false, reason: 'watertap-engine unreachable: URLError' },
  change: { pressure_bar: 20 },
  delta: null,
};

describe('WhatIfResult — three distinguishable outcomes (research R2)', () => {
  it('shows baseline, scenario and the difference when solved (FR-009)', () => {
    render(<WhatIfResult result={SOLVED} />);
    expect(screen.getByText('8.42')).toBeTruthy();
    expect(screen.getByText('10.57')).toBeTruthy();
    expect(screen.getByText(/\+2\.15/)).toBeTruthy();
  });

  it('labels the result modeled and shows the conditions it was computed under (FR-012)', () => {
    render(<WhatIfResult result={SOLVED} />);
    expect(screen.getAllByText(/modeled/i).length).toBeGreaterThan(0);
    // Appears twice by design: once as the changed condition, once in the full operating point.
    expect(screen.getAllByText(/pressure/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/clean-membrane solve/i)).toBeTruthy();
  });

  it('renders the capability hint verbatim for a no-feasible-solution outcome (research R2)', () => {
    render(<WhatIfResult result={INFEASIBLE} />);
    expect(screen.getByText(/no feasible solution at this combination/i)).toBeTruthy();
    expect(screen.getByText(/smaller membrane_area_m2 or a lower temp_c/i)).toBeTruthy();
  });

  it('does not call an infeasible combination a failure of the service', () => {
    render(<WhatIfResult result={INFEASIBLE} />);
    expect(screen.queryByText(/simulation failed/i)).toBeNull();
    expect(screen.queryByText(/error/i)).toBeNull();
  });

  it('states unavailability and its reason, without approximating (FR-011)', () => {
    render(<WhatIfResult result={UNAVAILABLE} />);
    expect(screen.getByText(/watertap-engine unreachable/i)).toBeTruthy();
    expect(screen.queryByText(/8\.42/)).toBeNull();
  });

  it('never renders a null delta as zero (FR-029)', () => {
    for (const result of [INFEASIBLE, UNAVAILABLE]) {
      cleanup();
      render(<WhatIfResult result={result} />);
      expect(screen.queryByText('0')).toBeNull();
      expect(screen.queryByText('0.00')).toBeNull();
      expect(screen.queryByText(/^\+0(\.0+)?$/)).toBeNull();
    }
  });

  it('renders nothing before a comparison has been requested', () => {
    const { container } = render(<WhatIfResult result={null} />);
    expect(container.textContent).toBe('');
  });
});
