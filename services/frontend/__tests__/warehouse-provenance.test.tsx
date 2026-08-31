import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProjectionPanel } from '@/components/warehouse/projection-panel';
import { DocumentSearchPanel } from '@/components/warehouse/document-search-panel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Warehouse provenance requirements (US5)', () => {
  it('never shows a projection without its uncertainty band (FR-024)', () => {
    render(
      <ProjectionPanel
        result={{
          unitId: 'B03',
          method: 'AI.FORECAST (TimesFM)',
          computedIn: 'bigquery',
          horizon: [{ forecast_date: '2021-01-14', ndp_forecast: 12.4, ndp_lower_90: 11.1, ndp_upper_90: 13.8, provenance: 'modeled' }],
          anomalies: [],
        }}
      />,
    );
    expect(screen.getByText(/11\.1/)).toBeTruthy();
    expect(screen.getByText(/13\.8/)).toBeTruthy();
    expect(screen.getByText(/computed in the warehouse|bigquery/i)).toBeTruthy();
  });

  it('does not render a passage without a source_document (FR-025)', () => {
    render(
      <DocumentSearchPanel
        result={{
          query: 'cleaning',
          computedIn: 'bigquery',
          method: 'VECTOR_SEARCH',
          results: [
            { source_document: 'Clean-Now-or-Wait Decision Guide', section: 'Thresholds', category: 'procedure', chunk_text: 'Attributed content', distance: 0.1 },
            // @ts-expect-error — deliberately missing source_document to test the guard
            { section: 'Untitled', category: 'procedure', chunk_text: 'Unattributed content', distance: 0.2 },
          ],
        }}
      />,
    );
    expect(screen.getByText(/attributed content/i)).toBeTruthy();
    expect(screen.queryByText(/unattributed content/i)).toBeNull();
  });

  it('names the source document for every rendered passage', () => {
    render(
      <DocumentSearchPanel
        result={{
          query: 'cleaning',
          computedIn: 'bigquery',
          method: 'VECTOR_SEARCH',
          results: [
            { source_document: 'Delta Economics Method', section: 'Overview', category: 'procedure', chunk_text: 'Some text', distance: 0.1 },
          ],
        }}
      />,
    );
    expect(screen.getByText('Delta Economics Method')).toBeTruthy();
  });
});
