import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { mockFetchRoutes } from './helpers/mock-fetch';
import CloudDataPage from '@/app/cloud-data/page';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Warehouse-intelligence surface — not-yet-produced state (US5, FR-026)', () => {
  it('shows no "Under Construction" placeholder (SC-001)', async () => {
    mockFetchRoutes({
      '/api/bq-forecast': { ok: false, status: 503 },
      '/api/docs/search': { ok: false, status: 503 },
    });
    render(<CloudDataPage />);
    await waitFor(() => expect(screen.queryByText(/under construction/i)).toBeNull());
  });

  it('states plainly that results were never produced, naming what would produce them', async () => {
    mockFetchRoutes({
      '/api/bq-forecast': {
        ok: false, status: 503,
        json: { detail: "BigQuery unavailable — run the Dataform 'bqml' tag first" },
      },
      '/api/docs/search': {
        ok: false, status: 503,
        json: { detail: 'document corpus unavailable — run pipeline/ingest/embed_docs.py' },
      },
    });
    render(<CloudDataPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/embed_docs\.py/).length).toBeGreaterThan(0);
    });
    // Never a blank panel where the 503 detail could have gone.
    expect(document.body.textContent).not.toMatch(/^\s*$/);
  });
});
