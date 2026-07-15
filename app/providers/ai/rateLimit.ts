export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class AiRateLimiter {
  private readonly timestamps = new Map<string, number[]>();

  constructor(private readonly limit = 5, private readonly windowMs = 60_000, private readonly now: () => number = Date.now) {}

  take(identifier: string): RateLimitDecision {
    const current = this.now();
    const recent = (this.timestamps.get(identifier) ?? []).filter((timestamp) => current - timestamp < this.windowMs);
    if (recent.length >= Math.max(1, this.limit)) {
      const oldest = recent[0] ?? current;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((this.windowMs - (current - oldest)) / 1000)) };
    }
    recent.push(current);
    this.timestamps.set(identifier, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  clear(): void {
    this.timestamps.clear();
  }
}

const sharedRateLimiters = new Map<number, AiRateLimiter>();

export function getAiRateLimiter(limit = 5): AiRateLimiter {
  // The isolate-local limiter is intentionally a cost guard, not an authentication boundary.
  const bounded = Math.max(1, Math.min(60, Math.floor(limit)));
  const existing = sharedRateLimiters.get(bounded);
  if (existing) return existing;
  const created = new AiRateLimiter(bounded);
  sharedRateLimiters.set(bounded, created);
  return created;
}

export function hashClientIdentifier(value: string | undefined): string {
  const input = value?.trim() || "global";
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function clearAiRateLimiterForTests(): void {
  for (const limiter of sharedRateLimiters.values()) limiter.clear();
  sharedRateLimiters.clear();
}
