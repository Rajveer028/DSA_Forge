/**
 * In-memory sliding-window rate limiter.
 *
 * Sufficient for a single Node instance; swap the store for Redis/Upstash when
 * running multiple replicas. Every expensive or abusable server entry point
 * (code execution, AI generation, search) goes through this.
 */

interface Bucket {
  hits: number[];
}

const store = new Map<string, Bucket>();

export class RateLimitError extends Error {
  status = 429;
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export interface RateLimitRule {
  /** Requests allowed inside the window. */
  limit: number;
  windowMs: number;
  label: string;
}

export const RATE_LIMITS = {
  run: { limit: 30, windowMs: 60_000, label: "code runs" },
  submit: { limit: 20, windowMs: 60_000, label: "submissions" },
  aiHint: { limit: 20, windowMs: 5 * 60_000, label: "AI hints" },
  aiGenerate: { limit: 8, windowMs: 10 * 60_000, label: "AI generations" },
  aiAnalyze: { limit: 15, windowMs: 10 * 60_000, label: "AI analyses" },
  search: { limit: 60, windowMs: 60_000, label: "searches" },
  write: { limit: 60, windowMs: 60_000, label: "changes" },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitKey = keyof typeof RATE_LIMITS;

export function checkRateLimit(identifier: string, key: RateLimitKey) {
  const rule = RATE_LIMITS[key];
  const now = Date.now();
  const bucketKey = `${key}:${identifier}`;
  const bucket = store.get(bucketKey) ?? { hits: [] };

  bucket.hits = bucket.hits.filter((t) => now - t < rule.windowMs);

  if (bucket.hits.length >= rule.limit) {
    const oldest = bucket.hits[0];
    const retryAfter = Math.ceil((rule.windowMs - (now - oldest)) / 1000);
    store.set(bucketKey, bucket);
    throw new RateLimitError(
      `Too many ${rule.label}. Try again in ${retryAfter}s.`,
      retryAfter,
    );
  }

  bucket.hits.push(now);
  store.set(bucketKey, bucket);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (v.hits.every((t) => now - t > 15 * 60_000)) store.delete(k);
    }
  }

  return { remaining: rule.limit - bucket.hits.length };
}
