import type { ResearchBrief, ResearchLanguage } from "./schemas";

export interface AiCacheEntry {
  key: string;
  storedAt: number;
  expiresAt: number;
  brief: ResearchBrief;
}

export class MemoryAiCache {
  private readonly entries = new Map<string, AiCacheEntry>();

  constructor(private readonly now: () => number = Date.now) {}

  getFresh(key: string): AiCacheEntry | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, brief: ResearchBrief, ttlSeconds: number): void {
    const storedAt = this.now();
    this.entries.set(key, { key, storedAt, expiresAt: storedAt + Math.max(1, ttlSeconds) * 1000, brief });
  }

  clear(): void {
    this.entries.clear();
  }
}

const sharedAiCache = new MemoryAiCache();

export function getAiCache(): MemoryAiCache {
  return sharedAiCache;
}

export function hashQuestion(question?: string): string {
  const input = question?.trim() ?? "";
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function makeAiCacheKey(input: { ticker: string; evidenceHash: string; language: ResearchLanguage; promptVersion: string; model: string; question?: string }): string {
  return [input.ticker, input.evidenceHash, input.language, input.promptVersion, input.model, hashQuestion(input.question)].join(":");
}

export function clearAiCacheForTests(): void {
  sharedAiCache.clear();
}
