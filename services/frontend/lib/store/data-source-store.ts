import { create } from 'zustand';

export type DataSourceMode = 'live' | 'mock';

interface DataSourceStore {
  mode: DataSourceMode;
  /** Endpoints that fell back to mock data, in the order they first failed. */
  failedPaths: string[];
  /** Last failure reason (HTTP status or network error), for the banner tooltip. */
  lastError: string | null;
  markLive: (path: string) => void;
  markMock: (path: string, reason: string) => void;
}

/**
 * Tracks whether the numbers on screen came from the serving API or from the mock
 * generators in lib/data/.
 *
 * lib/api/index.ts falls back to mocks whenever a fetch fails, which keeps the UI rendering
 * offline but previously did so with no indication at all. The deployed frontend had no
 * NEXT_PUBLIC_API_URL, so every request went to localhost:8000 on the *viewer's* machine,
 * failed, and the page showed fabricated fleet data as if it were the real plant. For a
 * product whose whole claim is source-traced, provenance-labelled numbers, silently
 * substituting invented ones is the worst failure mode available.
 */
export const useDataSourceStore = create<DataSourceStore>((set, get) => ({
  mode: 'live',
  failedPaths: [],
  lastError: null,

  markLive: (path) => {
    const { failedPaths } = get();
    if (!failedPaths.includes(path)) return;
    const remaining = failedPaths.filter((p) => p !== path);
    set({ failedPaths: remaining, mode: remaining.length ? 'mock' : 'live' });
  },

  markMock: (path, reason) => {
    const { failedPaths } = get();
    set({
      mode: 'mock',
      lastError: reason,
      failedPaths: failedPaths.includes(path) ? failedPaths : [...failedPaths, path],
    });
  },
}));
