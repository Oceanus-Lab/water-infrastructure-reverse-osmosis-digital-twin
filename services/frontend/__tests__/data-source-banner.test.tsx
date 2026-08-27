import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DataSourceBanner } from '@/components/data-source-banner';
import { useDataSourceStore } from '@/lib/store/data-source-store';
import { TooltipProvider } from '@/components/ui/tooltip';

const renderBanner = () =>
  render(
    <TooltipProvider>
      <DataSourceBanner />
    </TooltipProvider>,
  );

const reset = () =>
  useDataSourceStore.setState({ mode: 'live', failedPaths: [], lastError: null });

describe('DataSourceBanner', () => {
  beforeEach(reset);
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing while the serving API is reachable', () => {
    const { container } = renderBanner();
    expect(container.textContent).toBe('');
  });

  it('warns as soon as any endpoint falls back to mock data', () => {
    useDataSourceStore.getState().markMock('/api/fleet', 'HTTP 503');
    renderBanner();
    expect(screen.getByRole('status').textContent).toMatch(/mock data/i);
  });

  it('clears once every failed endpoint recovers', () => {
    const s = useDataSourceStore.getState();
    s.markMock('/api/fleet', 'HTTP 503');
    s.markMock('/api/alerts', 'HTTP 503');

    useDataSourceStore.getState().markLive('/api/fleet');
    expect(useDataSourceStore.getState().mode).toBe('mock'); // /api/alerts still down

    useDataSourceStore.getState().markLive('/api/alerts');
    expect(useDataSourceStore.getState().mode).toBe('live');

    const { container } = renderBanner();
    expect(container.textContent).toBe('');
  });
});

describe('lib/api live() wiring', () => {
  beforeEach(reset);
  afterEach(() => vi.restoreAllMocks());

  it('flags mock mode when the fetch rejects, and still returns data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const { fetchFleetStatus } = await import('@/lib/api');

    const fleet = await fetchFleetStatus('2020-06-01');

    expect(Array.isArray(fleet)).toBe(true);
    expect(fleet.length).toBeGreaterThan(0); // UI still renders...
    expect(useDataSourceStore.getState().mode).toBe('mock'); // ...but it is marked
    expect(useDataSourceStore.getState().failedPaths).toContain('/api/fleet?date=2020-06-01');
  });

  it('flags mock mode on a non-ok response (the 503 /api/timeline now returns)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );
    const { fetchTimelineRange } = await import('@/lib/api');

    await fetchTimelineRange();

    expect(useDataSourceStore.getState().mode).toBe('mock');
    expect(useDataSourceStore.getState().lastError).toBe('HTTP 503');
  });

  it('stays in live mode when the API answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }),
    );
    const { fetchAlerts } = await import('@/lib/api');

    await fetchAlerts('2020-06-01');

    expect(useDataSourceStore.getState().mode).toBe('live');
  });
});
