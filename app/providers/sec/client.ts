import { SecProviderError } from "./errors";
import type { SecHttpClient } from "./types";

export const SEC_SUBMISSIONS_URL = (cik: string): string => `https://data.sec.gov/submissions/CIK${cik}.json`;
export const SEC_COMPANY_FACTS_URL = (cik: string): string => `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

export interface SecRuntimeConfig {
  userAgent?: string;
  requestsPerSecond: number;
  cacheTtlSeconds: number;
  timeoutMs: number;
  maxResponseBytes: number;
  maxRetries: number;
}

function numericEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const value = Number(env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export function getSecRuntimeConfig(env: NodeJS.ProcessEnv = process.env): SecRuntimeConfig {
  const requestsPerSecond = Math.min(10, Math.max(1, Math.floor(Number(env.SEC_REQUESTS_PER_SECOND) || 5)));
  const cacheTtlSeconds = Math.max(1, Math.floor(Number(env.SEC_CACHE_TTL_SECONDS) || 3600));
  return {
    userAgent: env.SEC_USER_AGENT?.trim() || undefined,
    requestsPerSecond,
    cacheTtlSeconds,
    timeoutMs: Math.max(1000, Math.floor(numericEnv(env, "SEC_TIMEOUT_MS", 10000))),
    maxResponseBytes: Math.max(100_000, Math.floor(numericEnv(env, "SEC_MAX_RESPONSE_BYTES", 2_000_000))),
    maxRetries: 2,
  };
}

export class SecRateLimiter {
  private readonly timestamps: number[] = [];
  private readonly limit: number;
  private readonly now: () => number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(requestsPerSecond = 5, now: () => number = Date.now, sleep: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))) {
    this.limit = Math.min(10, Math.max(1, Math.floor(requestsPerSecond)));
    this.now = now;
    this.sleep = sleep;
  }

  get maxRequestsPerSecond(): number {
    return this.limit;
  }

  async acquire(): Promise<void> {
    while (true) {
      const current = this.now();
      while (this.timestamps[0] !== undefined && current - this.timestamps[0] >= 1000) this.timestamps.shift();
      if (this.timestamps.length < this.limit) {
        this.timestamps.push(current);
        return;
      }
      const waitFor = Math.max(1, 1000 - (current - (this.timestamps[0] ?? current)));
      await this.sleep(waitFor);
    }
  }
}

export interface FetchSecHttpClientOptions {
  userAgent?: string;
  requestsPerSecond?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRetries?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  fetchImpl?: typeof fetch;
}

export class FetchSecHttpClient implements SecHttpClient {
  private readonly userAgent?: string;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly maxRetries: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly fetchImpl: typeof fetch;
  private readonly rateLimiter: SecRateLimiter;

  constructor(options: FetchSecHttpClientOptions = {}) {
    const config = getSecRuntimeConfig();
    this.userAgent = options.userAgent?.trim() || config.userAgent;
    this.timeoutMs = options.timeoutMs ?? config.timeoutMs;
    this.maxResponseBytes = options.maxResponseBytes ?? config.maxResponseBytes;
    this.maxRetries = Math.min(2, Math.max(0, options.maxRetries ?? config.maxRetries));
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.rateLimiter = new SecRateLimiter(options.requestsPerSecond ?? config.requestsPerSecond, options.now, this.sleep);
  }

  async getJson<T>(url: string): Promise<T> {
    if (!this.userAgent) throw new SecProviderError("SEC_NOT_CONFIGURED", "SEC_USER_AGENT is not configured.");
    let lastError: SecProviderError | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        await this.rateLimiter.acquire();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        let response: Response;
        try {
          response = await this.fetchImpl(url, { method: "GET", headers: { "User-Agent": this.userAgent, Accept: "application/json", "Accept-Encoding": "gzip, deflate" }, signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
        if (response.status === 403) throw new SecProviderError("SEC_FORBIDDEN", "SEC rejected the request.", { status: 403 });
        if (response.status === 429) throw new SecProviderError("SEC_RATE_LIMITED", "SEC rate limit reached.", { status: 429, retryable: true });
        if (response.status >= 500 && response.status <= 599) throw new SecProviderError("SEC_HTTP_ERROR", "SEC returned a temporary server error.", { status: response.status, retryable: true });
        if (!response.ok) throw new SecProviderError("SEC_HTTP_ERROR", "SEC returned an error response.", { status: response.status });
        const contentLength = Number(response.headers.get("content-length") ?? 0);
        if (contentLength > this.maxResponseBytes) throw new SecProviderError("SEC_RESPONSE_TOO_LARGE", "SEC response exceeded the safety limit.");
        const text = await response.text();
        if (new TextEncoder().encode(text).byteLength > this.maxResponseBytes) throw new SecProviderError("SEC_RESPONSE_TOO_LARGE", "SEC response exceeded the safety limit.");
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new SecProviderError("SEC_INVALID_JSON", "SEC returned invalid JSON.");
        }
      } catch (error) {
        const safe = error instanceof SecProviderError ? error : error instanceof DOMException && error.name === "AbortError" ? new SecProviderError("SEC_TIMEOUT", "SEC request timed out.", { retryable: true }) : new SecProviderError("SEC_NETWORK_ERROR", "SEC network request failed.", { retryable: true });
        lastError = safe;
        if (!safe.retryable || attempt >= this.maxRetries) throw safe;
        await this.sleep(250 * 2 ** attempt);
      }
    }
    throw lastError ?? new SecProviderError("SEC_UNAVAILABLE", "SEC data is unavailable.");
  }
}
