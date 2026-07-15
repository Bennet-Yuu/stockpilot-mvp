import type { Ticker } from "../../data";
import type { SecDiagnosticCode } from "./errors";

export type SecSourceMode = "live" | "cached" | "stale-cache" | "sample" | "unavailable";
export type SecSnapshotStatus =
  | "success"
  | "cached"
  | "fallback"
  | "partial"
  | "not-configured"
  | "rate-limited"
  | "unavailable"
  | "invalid-ticker";

export type SecMetricName =
  | "Revenue"
  | "Operating Income"
  | "Net Income"
  | "Operating Cash Flow"
  | "Capital Expenditure"
  | "Free Cash Flow"
  | "Assets"
  | "Liabilities"
  | "Cash and Cash Equivalents"
  | "Diluted EPS";

export type SecPeriodKind = "annual" | "quarterly" | "instant";
export type SecFactProvenanceType = "source" | "system-derived";

export interface SecCompanyIdentity {
  ticker: Ticker;
  cik: string;
  legalName: string;
  exchanges: string[];
  sic?: string;
  sicDescription?: string;
  fiscalYearEnd?: string;
}

export interface SecFactProvenance {
  taxonomy: string;
  concept: string;
  unit: string;
  form: string;
  filedAt: string;
  periodEnd: string;
  periodStart?: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  accessionNumber: string;
  sourceUrl: string;
  periodKind: SecPeriodKind;
}

export interface SecNormalizedFact extends SecFactProvenance {
  metric: SecMetricName;
  value: number;
  provenanceType: SecFactProvenanceType;
  derivedFrom?: SecFactProvenance[];
}

export interface SecFinancialMetric {
  metric: SecMetricName;
  status: "available" | "unavailable";
  latest?: SecNormalizedFact;
  annualHistory: SecNormalizedFact[];
  warning?: string;
}

export interface SecAnnualFinancialPoint {
  fiscalYear?: number;
  periodEnd: string;
  revenue?: SecNormalizedFact;
  netIncome?: SecNormalizedFact;
  operatingCashFlow?: SecNormalizedFact;
  freeCashFlow?: SecNormalizedFact;
}

export interface SecRecentFiling {
  accessionNumber: string;
  form: "10-K" | "10-K/A" | "10-Q" | "10-Q/A" | "8-K";
  filingDate: string;
  reportDate?: string;
  primaryDocument: string;
  sourceUrl: string;
  isXbrl?: boolean;
}

export interface SecCompanyFactsSummary {
  ticker: Ticker;
  cik: string;
  taxonomyCount: number;
  conceptCount: number;
  retrievedAt: string;
}

export interface SecSnapshotMetadata {
  sourceMode: SecSourceMode;
  status: SecSnapshotStatus;
  fetchedAt: string;
  asOf: string;
  warnings: string[];
  diagnosticCode?: SecDiagnosticCode;
}

export interface SecCompanyIdentityResponse extends SecSnapshotMetadata {
  ticker: Ticker;
  identity: SecCompanyIdentity;
}

export interface SecRecentFilingsResponse extends SecSnapshotMetadata {
  ticker: Ticker;
  filings: SecRecentFiling[];
}

export interface SecCompanyFinancialSnapshot {
  ticker: Ticker;
  cik: string;
  companyName: string;
  identity: SecCompanyIdentity;
  metrics: Record<SecMetricName, SecFinancialMetric>;
  annualHistory: SecAnnualFinancialPoint[];
  recentFilings: SecRecentFiling[];
  sourceMode: SecSourceMode;
  status: SecSnapshotStatus;
  fetchedAt: string;
  asOf: string;
  warnings: string[];
  diagnosticCode?: SecDiagnosticCode;
}

export interface SecCacheEntry<T> {
  key: string;
  storedAt: number;
  expiresAt: number;
  source: "live" | "sample" | "cached" | "stale-cache";
  value: T;
}

export interface SecCache {
  get<T>(key: string): SecCacheEntry<T> | undefined;
  getFresh<T>(key: string, now?: number): SecCacheEntry<T> | undefined;
  getStale<T>(key: string, now?: number): SecCacheEntry<T> | undefined;
  set<T>(entry: SecCacheEntry<T>): void;
  clear(): void;
}

export interface SecHttpClient {
  getJson<T>(url: string): Promise<T>;
}

export interface SecProviderOptions {
  client?: SecHttpClient;
  cache?: SecCache;
  clock?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  requestsPerSecond?: number;
  cacheTtlSeconds?: number;
  userAgent?: string;
}

export interface SecFilingDataProvider {
  getCompanySnapshot(ticker: Ticker): Promise<SecCompanyFinancialSnapshot>;
  getCompanyIdentity(ticker: Ticker): Promise<SecCompanyIdentity>;
  getRecentFilings(ticker: Ticker): Promise<SecRecentFiling[]>;
  getCompanyFacts(ticker: Ticker): Promise<SecCompanyFactsSummary>;
  getNormalizedFinancials(ticker: Ticker): Promise<Record<SecMetricName, SecFinancialMetric>>;
}
