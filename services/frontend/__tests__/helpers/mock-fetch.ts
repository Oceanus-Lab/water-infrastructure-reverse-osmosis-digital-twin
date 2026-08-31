import { vi } from 'vitest';

/**
 * Stub `fetch` for one or more URL fragments.
 *
 * Matching is by substring so a test can name `/api/economics/fleet` without rebuilding the
 * base URL that `lib/api` prepends. An unmatched request rejects rather than silently
 * resolving — a fetch the test did not anticipate should fail loudly, not fall through to
 * the mock generators and look like a pass.
 */
export type RouteStub =
  | { ok?: true; json: unknown; status?: number }
  | { ok: false; status: number; json?: unknown };

export function mockFetchRoutes(routes: Record<string, RouteStub>) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) throw new Error(`unstubbed fetch: ${url}`);

    const stub = routes[key];
    const status = stub.status ?? (stub.ok === false ? 500 : 200);
    return {
      ok: stub.ok !== false,
      status,
      json: async () => stub.json ?? {},
    } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Every request fails — exercises the placeholder-data path (FR-030). */
export function mockFetchAllFailing(reason = 'ECONNREFUSED') {
  const fn = vi.fn().mockRejectedValue(new Error(reason));
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Never resolves, so a test can observe in-progress state and abort handling (FR-014). */
export function mockFetchPending() {
  const fn = vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        );
      }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}
