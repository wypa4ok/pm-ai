import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "../errors";

type RateLimitBucket = {
  remaining: number;
  resetAt: number;
};

const BUCKETS = new Map<string, RateLimitBucket>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

function keyFromRequest(request: NextRequest) {
  const user = (request as any).auth?.user?.id;
  if (user) return `user:${user}`;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.ip ??
    "unknown";
  return `ip:${ip}`;
}

export function rateLimit(request: NextRequest): NextResponse | null {
  const key = keyFromRequest(request);
  const now = Date.now();
  const bucket = BUCKETS.get(key);

  if (!bucket || bucket.resetAt <= now) {
    BUCKETS.set(key, { remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (bucket.remaining <= 0) {
    const res = errorResponse("rate_limited", "Too many requests", 429, {
      resetAt: new Date(bucket.resetAt).toISOString(),
    });
    res.headers.set("retry-after", Math.ceil((bucket.resetAt - now) / 1000).toString());
    return res;
  }

  bucket.remaining -= 1;
  return null;
}
