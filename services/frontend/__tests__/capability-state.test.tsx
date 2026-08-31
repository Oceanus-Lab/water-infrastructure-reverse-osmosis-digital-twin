import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CapabilityState } from '@/components/capability-state';

afterEach(cleanup);

// The one rule every one of these asserts: a non-answer must READ as a non-answer. Rendering
// 0, an empty string, or a substituted value in place of a real figure is the failure mode
// Constitution Principle II exists to prevent (FR-029).
const FORBIDDEN = ['0', '0.0', '$0', '$0.00', '—0', 'NaN', 'null', 'undefined'];

function expectNoSubstitutedValue() {
  const body = document.body.textContent ?? '';
  for (const token of FORBIDDEN) {
    expect(body.trim()).not.toBe(token);
  }
}

describe('CapabilityState', () => {
  it('renders nothing of its own when the capability is available', () => {
    const { container } = render(
      <CapabilityState state="available">
        <span>12.4 psi</span>
      </CapabilityState>,
    );
    expect(container.textContent).toContain('12.4 psi');
  });

  it('states unavailability and its reason, not a value (FR-029)', () => {
    render(
      <CapabilityState
        state="unavailable"
        reason="watertap-engine unreachable: URLError"
      >
        <span>12.4 psi</span>
      </CapabilityState>,
    );
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText(/unavailable/i)).toBeTruthy();
    expect(screen.getByText(/watertap-engine unreachable/i)).toBeTruthy();
    // the child value must NOT leak through
    expect(screen.queryByText('12.4 psi')).toBeNull();
    expectNoSubstitutedValue();
  });

  it('says results were never produced and names what would produce them (FR-026)', () => {
    render(
      <CapabilityState
        state="not_produced"
        producedBy="pipeline/ingest/embed_docs.py"
      />,
    );
    expect(screen.getByText(/not yet produced/i)).toBeTruthy();
    expect(screen.getByText(/embed_docs\.py/)).toBeTruthy();
    expectNoSubstitutedValue();
  });

  it('marks placeholder data rather than presenting it as real (FR-030)', () => {
    render(<CapabilityState state="placeholder" />);
    expect(screen.getByText(/placeholder/i)).toBeTruthy();
    expectNoSubstitutedValue();
  });

  it('never renders a bare zero for any non-available state (FR-029)', () => {
    for (const state of ['unavailable', 'not_produced', 'placeholder'] as const) {
      cleanup();
      render(
        <CapabilityState state={state}>
          <span>0</span>
        </CapabilityState>,
      );
      expect(document.body.textContent?.trim()).not.toBe('0');
    }
  });

  it('exposes non-answers to assistive technology (FR-033)', () => {
    render(<CapabilityState state="unavailable" reason="solver offline" />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });
});
