import { env } from "@/config/env";
import { TooManyRequestsError } from "@/lib/errors";

/**
 * Very small in-memory fixed-window rate limiter.
 *
 * Suitable for a single-instance deployment and demos. For a horizontally
 * scaled deployment this would be backed by Redis (same interface).
 */
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit = env.LOGIN_RATE_LIMIT,
  windowSec = env.LOGIN_RATE_WINDOW_SEC
): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryIn = Math.ceil((bucket.resetAt - now) / 1000);
    throw new TooManyRequestsError(
      `Too many attempts. Try again in ${retryIn}s.`
    );
  }
}

/** Best-effort client IP from proxy headers (falls back to a constant). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
