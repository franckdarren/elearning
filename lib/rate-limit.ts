// Simple sliding-window rate limiter, in-memory.
//
// LIMITATIONS:
//   - Per-instance only. On Vercel with multiple lambdas the limit is
//     effectively per-lambda — fine as a soft brute-force speed bump but
//     not a strong guarantee. For production, swap to Upstash Redis or
//     Vercel Edge Config.
//   - Map is cleared on cold start.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { windowMs: number; max: number },
): { ok: boolean; retryInMs: number } {
  const now = Date.now();
  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryInMs: 0 };
  }
  if (hit.count >= opts.max) {
    return { ok: false, retryInMs: Math.max(0, hit.resetAt - now) };
  }
  hit.count++;
  return { ok: true, retryInMs: 0 };
}

export async function ipFromHeaders(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}
