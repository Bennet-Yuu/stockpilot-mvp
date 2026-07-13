import type { SecCache, SecCacheEntry } from "./types";

export class MemorySecCache implements SecCache {
  private readonly entries = new Map<string, SecCacheEntry<unknown>>();

  get<T>(key: string): SecCacheEntry<T> | undefined {
    return this.entries.get(key) as SecCacheEntry<T> | undefined;
  }

  getFresh<T>(key: string, now = Date.now()): SecCacheEntry<T> | undefined {
    const entry = this.get<T>(key);
    return entry && entry.expiresAt > now ? entry : undefined;
  }

  getStale<T>(key: string, now = Date.now()): SecCacheEntry<T> | undefined {
    const entry = this.get<T>(key);
    return entry && entry.expiresAt <= now ? entry : undefined;
  }

  set<T>(entry: SecCacheEntry<T>): void {
    this.entries.set(entry.key, entry as SecCacheEntry<unknown>);
  }

  clear(): void {
    this.entries.clear();
  }
}

export function makeSecCacheEntry<T>(key: string, value: T, source: SecCacheEntry<T>["source"], ttlMs: number, now = Date.now()): SecCacheEntry<T> {
  return { key, value, source, storedAt: now, expiresAt: now + Math.max(0, ttlMs) };
}
