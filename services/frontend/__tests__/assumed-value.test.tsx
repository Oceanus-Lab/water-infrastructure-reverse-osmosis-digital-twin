import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AssumedValue } from '@/components/assumed-value';

afterEach(cleanup);

describe('AssumedValue', () => {
  it('marks an assumed figure as resting on an assumption (FR-028)', () => {
    render(
      <AssumedValue
        value={0.08}
        unit="USD/kWh"
        label="Electricity price"
        assumption="No sourced price feed; parametric default"
      />,
    );
    expect(screen.getByText(/assumed/i)).toBeTruthy();
  });

  it('states the assumption itself, not just that one exists (FR-028)', () => {
    render(
      <AssumedValue
        value={3000}
        unit="USD"
        label="CIP cost"
        assumption="Chemicals plus labour, parametric default"
      />,
    );
    expect(screen.getByText(/chemicals plus labour/i)).toBeTruthy();
  });

  it('does not present an assumed value as measured (FR-028)', () => {
    render(
      <AssumedValue value={0.08} label="Electricity price" assumption="parametric default" />,
    );
    expect(screen.queryByText(/^measured$/i)).toBeNull();
  });

  it('renders an explicit non-answer when there is no value (FR-029)', () => {
    render(<AssumedValue value={null} label="Electricity price" assumption="parametric default" />);
    expect(document.body.textContent?.trim()).not.toBe('0');
    expect(screen.getByText(/unavailable/i)).toBeTruthy();
  });

  it('exposes the assumption to assistive technology (FR-033)', () => {
    render(
      <AssumedValue
        value={0.08}
        label="Electricity price"
        assumption="No sourced price feed"
      />,
    );
    const marker = screen.getByText(/assumed/i);
    expect(marker.getAttribute('title')).toMatch(/no sourced price feed/i);
  });
});
