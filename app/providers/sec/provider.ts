import { SEC_COMPANY_FACTS_URL, SEC_SUBMISSIONS_URL, FetchSecHttpClient, getSecRuntimeConfig } from "./client";
import { MemorySecCache, makeSecCacheEntry } from "./cache";
import { SecProviderError, toSafeSecError } from "./errors";
import { normalizeFinancials, normalizeRecentFilings, normalizeSnapshot } from "./normalize";
import { secCompanyFactsSchema, secCompanyFinancialSnapshotSchema, secSubmissionsSchema } from "./schemas";
import { createSampleSecSnapshot } from "./sample";
import { getSecIdentity, normalizeSecTicker } from "./tickerMap";
import type { SecCache, SecCompanyFactsSummary, SecCompanyFinancialSnapshot, SecCompanyIdentity, SecFilingDataProvider, SecHttpClient, SecMetricName, SecProviderOptions, SecRecentFiling } from "./types";
import type { Ticker } from "../../data";

export class SecFilingDataProviderImpl implements SecFilingDataProvider {
  private readonly client?: SecHttpClient;
  private readonly cache: SecCache;
  private readonly clock: () => number;
  private readonly cacheTtlMs: number;
  private readonly configured: boolean;

  constructor(options: SecProviderOptions = {}) {
    const config = getSecRuntimeConfig();
    const configuredUserAgent = options.userAgent !== undefined ? options.userAgent.trim() || undefined : config.userAgent;
    this.clock = options.clock ?? Date.now;
    this.cache = options.cache ?? new MemorySecCache();
    this.cacheTtlMs = Math.max(1000, (options.cacheTtlSeconds ?? config.cacheTtlSeconds) * 1000);
    this.client = options.client ?? (configuredUserAgent ? new FetchSecHttpClient({ userAgent: configuredUserAgent, requestsPerSecond: options.requestsPerSecond ?? config.requestsPerSecond }) : undefined);
    this.configured = Boolean(options.client || configuredUserAgent);
  }

  async getCompanySnapshot(rawTicker: Ticker): Promise<SecCompanyFinancialSnapshot> {
    const ticker = normalizeSecTicker(rawTicker);
    const key = `sec:snapshot:${ticker}`;
    const now = this.clock();
    const fresh = this.cache.getFresh<SecCompanyFinancialSnapshot>(key, now);
    if (fresh) return this.withSource(fresh.value, "cached", "cached", ["Showing a cached SEC snapshot within the configured freshness window."]);
    if (!this.configured || !this.client) return this.sampleWithStatus(ticker, now, "not-configured", ["SEC source access is not configured; showing sample fallback data without making a request."]);

    try {
      const submissions = await this.getSubmissions(ticker);
      const facts = await this.getFacts(ticker);
      if (submissions.cik.padStart(10, "0") !== getSecIdentity(ticker).cik) throw new SecProviderError("SEC_INVALID_RESPONSE", "SEC CIK did not match the verified ticker mapping.");
      const fetchedAt = new Date(this.clock()).toISOString();
      const normalized = normalizeSnapshot(facts, submissions, ticker, "live", "success", fetchedAt);
      const unavailableCount = Object.values(normalized.metrics).filter((metric) => metric.status === "unavailable").length;
      const snapshot = unavailableCount > 0 ? { ...normalized, status: "partial" as const, warnings: [`${unavailableCount} requested SEC concept${unavailableCount === 1 ? " is" : "s are"} unavailable in the returned facts.`] } : normalized;
      const parsed = secCompanyFinancialSnapshotSchema.safeParse(snapshot);
      if (!parsed.success) throw new SecProviderError("SEC_INVALID_RESPONSE", "Normalized SEC snapshot failed validation.");
      const validated = parsed.data as unknown as SecCompanyFinancialSnapshot;
      this.cache.set(makeSecCacheEntry(key, validated, "live", this.cacheTtlMs, this.clock()));
      return validated;
    } catch (error) {
      const safe = toSafeSecError(error);
      const stale = this.cache.getStale<SecCompanyFinancialSnapshot>(key, this.clock());
      if (stale) return this.withSource(stale.value, "stale-cache", "fallback", ["Live SEC data could not be refreshed; showing the last cached snapshot.", this.safeReason(safe)]);
      const status = safe.code === "SEC_RATE_LIMITED" ? "rate-limited" : "unavailable";
      return this.sampleWithStatus(ticker, this.clock(), status, ["Live SEC data is unavailable; showing sample fallback data.", this.safeReason(safe)]);
    }
  }

  async getCompanyIdentity(rawTicker: Ticker): Promise<SecCompanyIdentity> {
    return (await this.getCompanySnapshot(rawTicker)).identity;
  }

  async getRecentFilings(rawTicker: Ticker): Promise<SecRecentFiling[]> {
    return (await this.getCompanySnapshot(rawTicker)).recentFilings;
  }

  async getCompanyFacts(rawTicker: Ticker): Promise<SecCompanyFactsSummary> {
    const snapshot = await this.getCompanySnapshot(rawTicker);
    return { ticker: snapshot.ticker, cik: snapshot.cik, taxonomyCount: snapshot.sourceMode === "sample" ? 1 : 1, conceptCount: Object.values(snapshot.metrics).filter((metric) => metric.status === "available").length, retrievedAt: snapshot.fetchedAt };
  }

  async getNormalizedFinancials(rawTicker: Ticker): Promise<Record<SecMetricName, SecCompanyFinancialSnapshot["metrics"][SecMetricName]>> {
    return (await this.getCompanySnapshot(rawTicker)).metrics;
  }

  private async getSubmissions(ticker: Ticker) {
    const key = `sec:submissions:${ticker}`;
    const cached = this.cache.getFresh<unknown>(key, this.clock());
    if (cached) return secSubmissionsSchema.parse(cached.value);
    const identity = getSecIdentity(ticker);
    const raw = await this.client?.getJson<unknown>(SEC_SUBMISSIONS_URL(identity.cik));
    const parsed = secSubmissionsSchema.safeParse(raw);
    if (!parsed.success) throw new SecProviderError("SEC_INVALID_RESPONSE", "SEC submissions response failed validation.");
    this.cache.set(makeSecCacheEntry(key, parsed.data, "live", this.cacheTtlMs, this.clock()));
    return parsed.data;
  }

  private async getFacts(ticker: Ticker) {
    const key = `sec:facts:${ticker}`;
    const cached = this.cache.getFresh<unknown>(key, this.clock());
    if (cached) return secCompanyFactsSchema.parse(cached.value);
    const identity = getSecIdentity(ticker);
    const raw = await this.client?.getJson<unknown>(SEC_COMPANY_FACTS_URL(identity.cik));
    const parsed = secCompanyFactsSchema.safeParse(raw);
    if (!parsed.success) throw new SecProviderError("SEC_INVALID_RESPONSE", "SEC company facts response failed validation.");
    this.cache.set(makeSecCacheEntry(key, parsed.data, "live", this.cacheTtlMs, this.clock()));
    return parsed.data;
  }

  private withSource(snapshot: SecCompanyFinancialSnapshot, sourceMode: SecCompanyFinancialSnapshot["sourceMode"], status: SecCompanyFinancialSnapshot["status"], warnings: string[]): SecCompanyFinancialSnapshot {
    return { ...snapshot, sourceMode, status, warnings: [...snapshot.warnings, ...warnings] };
  }

  private safeReason(error: SecProviderError): string {
    if (error.code === "SEC_RATE_LIMITED") return "SEC rate limit reached after bounded retries.";
    if (error.code === "SEC_NOT_CONFIGURED") return "SEC source access is not configured.";
    if (error.code === "SEC_FORBIDDEN") return "SEC rejected the request; check the User-Agent contact string.";
    return "The provider returned a safe fallback status; no raw error details are exposed.";
  }

  private sampleWithStatus(ticker: Ticker, now: number, status: "not-configured" | "rate-limited" | "unavailable", warnings: string[]): SecCompanyFinancialSnapshot {
    return { ...createSampleSecSnapshot(ticker, now, warnings), status };
  }
}

export const secFilingDataProvider: SecFilingDataProvider = new SecFilingDataProviderImpl();

export function createSecProvider(options: SecProviderOptions = {}): SecFilingDataProviderImpl {
  return new SecFilingDataProviderImpl(options);
}

export { normalizeFinancials, normalizeRecentFilings };
