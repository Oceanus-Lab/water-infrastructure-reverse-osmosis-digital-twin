/**
 * Lightweight distributed tracing wrapper for Cloud Trace and performance analytics.
 */

export interface Span {
  name: string;
  startTime: number;
  attributes: Record<string, string | number | boolean>;
  end: (attributes?: Record<string, string | number | boolean>) => number;
}

export function startSpan(name: string, initialAttributes: Record<string, string | number | boolean> = {}): Span {
  const startTime = performance.now();
  const attributes = { ...initialAttributes };

  return {
    name,
    startTime,
    attributes,
    end(extraAttributes = {}) {
      const durationMs = Math.round(performance.now() - startTime);
      const merged = { ...attributes, ...extraAttributes, durationMs };
      
      // In production Cloud Run, structured JSON logs are automatically parsed by Cloud Trace & Cloud Logging
      if (process.env.NODE_ENV !== 'test') {
        console.log(JSON.stringify({
          severity: 'INFO',
          message: `[TraceSpan] ${name} completed in ${durationMs}ms`,
          'logging.googleapis.com/trace': process.env.GOOGLE_CLOUD_PROJECT,
          span: {
            name,
            ...merged,
          },
        }));
      }
      return durationMs;
    },
  };
}

export async function traceAsync<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  initialAttributes: Record<string, string | number | boolean> = {}
): Promise<{ result: T; durationMs: number }> {
  const span = startSpan(name, initialAttributes);
  try {
    const result = await fn(span);
    const durationMs = span.end({ status: 'success' });
    return { result, durationMs };
  } catch (error) {
    span.end({ status: 'error', error: String(error) });
    throw error;
  }
}
