import { z } from "zod";
import type { SecFactProvenanceType, SecMetricName, SecPeriodKind, SecSourceMode, SecSnapshotStatus } from "./types";

const secBooleanFlagSchema = z.preprocess((value) => {
  if (value === 0) return false;
  if (value === 1) return true;
  if (value === null) return undefined;
  return value;
}, z.boolean().optional());
const secOptionalStringSchema = z.preprocess((value) => value === null ? undefined : value, z.string().optional());
const secOptionalNumberSchema = z.preprocess((value) => value === null ? undefined : value, z.number().optional());

export const secSubmissionRecentSchema = z.object({
  accessionNumber: z.array(z.string()).default([]),
  filingDate: z.array(z.string()).default([]),
  reportDate: z.array(secOptionalStringSchema).default([]),
  form: z.array(z.string()).default([]),
  primaryDocument: z.array(z.string()).default([]),
  isXBRL: z.array(secBooleanFlagSchema).default([]),
}).passthrough();

export const secSubmissionsSchema = z.object({
  cik: z.string(),
  name: z.string(),
  tickers: z.array(z.string()).default([]),
  exchanges: z.array(z.string()).default([]),
  sic: z.string().optional(),
  sicDescription: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  filings: z.object({ recent: secSubmissionRecentSchema }).passthrough(),
}).passthrough();

export const secRawFactSchema = z.object({
  accn: z.string(),
  fy: secOptionalNumberSchema,
  fp: secOptionalStringSchema,
  form: z.string(),
  filed: z.string(),
  frame: secOptionalStringSchema,
  start: secOptionalStringSchema,
  end: z.string(),
  val: z.number(),
}).passthrough();

export const secConceptSchema = z.object({
  label: secOptionalStringSchema,
  description: secOptionalStringSchema,
  units: z.record(z.string(), z.array(secRawFactSchema)),
}).passthrough();

export const secCompanyFactsSchema = z.object({
  entityName: z.string(),
  facts: z.record(z.string(), z.record(z.string(), secConceptSchema)),
}).passthrough();

const secPeriodKindSchema: z.ZodType<SecPeriodKind> = z.enum(["annual", "quarterly", "instant"]);
const secSourceModeSchema: z.ZodType<SecSourceMode> = z.enum(["live", "cached", "stale-cache", "sample", "unavailable"]);
const secStatusSchema: z.ZodType<SecSnapshotStatus> = z.enum(["success", "cached", "fallback", "partial", "not-configured", "rate-limited", "unavailable", "invalid-ticker"]);
const metricNames = ["Revenue", "Operating Income", "Net Income", "Operating Cash Flow", "Capital Expenditure", "Free Cash Flow", "Assets", "Liabilities", "Cash and Cash Equivalents", "Diluted EPS"] as const;
export const secMetricNameSchema: z.ZodType<SecMetricName> = z.enum(metricNames);

export const secFactProvenanceSchema = z.object({
  taxonomy: z.string(), concept: z.string(), unit: z.string(), form: z.string(), filedAt: z.string(), periodEnd: z.string(), periodStart: z.string().optional(), fiscalYear: z.number().optional(), fiscalPeriod: z.string().optional(), accessionNumber: z.string(), sourceUrl: z.string().url(), periodKind: secPeriodKindSchema,
});
const secFactProvenanceTypeSchema: z.ZodType<SecFactProvenanceType> = z.enum(["source", "system-derived"]);
export const secNormalizedFactSchema = secFactProvenanceSchema.extend({ metric: secMetricNameSchema, value: z.number(), provenanceType: secFactProvenanceTypeSchema, derivedFrom: z.array(secFactProvenanceSchema).optional() });
export const secFinancialMetricSchema = z.object({ metric: secMetricNameSchema, status: z.enum(["available", "unavailable"]), latest: secNormalizedFactSchema.optional(), annualHistory: z.array(secNormalizedFactSchema), warning: z.string().optional() });
export const secAnnualFinancialPointSchema = z.object({ fiscalYear: z.number().optional(), periodEnd: z.string(), revenue: secNormalizedFactSchema.optional(), netIncome: secNormalizedFactSchema.optional(), operatingCashFlow: secNormalizedFactSchema.optional(), freeCashFlow: secNormalizedFactSchema.optional() });
export const secRecentFilingSchema = z.object({ accessionNumber: z.string(), form: z.enum(["10-K", "10-K/A", "10-Q", "10-Q/A", "8-K"]), filingDate: z.string(), reportDate: z.string().optional(), primaryDocument: z.string(), sourceUrl: z.string().url(), isXbrl: z.boolean().optional() });
export const secCompanyIdentitySchema = z.object({ ticker: z.string(), cik: z.string(), legalName: z.string(), exchanges: z.array(z.string()), sic: z.string().optional(), sicDescription: z.string().optional(), fiscalYearEnd: z.string().optional() });
export const secCompanyFinancialSnapshotSchema = z.object({
  ticker: z.string(), cik: z.string(), companyName: z.string(), identity: secCompanyIdentitySchema,
  metrics: z.record(secMetricNameSchema, secFinancialMetricSchema), annualHistory: z.array(secAnnualFinancialPointSchema), recentFilings: z.array(secRecentFilingSchema), sourceMode: secSourceModeSchema, status: secStatusSchema, fetchedAt: z.string(), asOf: z.string(), warnings: z.array(z.string()),
});

const secSnapshotMetadataSchema = z.object({ sourceMode: secSourceModeSchema, status: secStatusSchema, fetchedAt: z.string(), asOf: z.string(), warnings: z.array(z.string()) });
export const secCompanyIdentityResponseSchema = secSnapshotMetadataSchema.extend({ ticker: z.string(), identity: secCompanyIdentitySchema });
export const secRecentFilingsResponseSchema = secSnapshotMetadataSchema.extend({ ticker: z.string(), filings: z.array(secRecentFilingSchema) });

export type SecSubmissions = z.infer<typeof secSubmissionsSchema>;
export type SecCompanyFacts = z.infer<typeof secCompanyFactsSchema>;
export type SecRawFact = z.infer<typeof secRawFactSchema>;
