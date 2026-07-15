import { z } from "zod";
import { tickerList } from "../../data";

export const aiPromptVersion = "stockpilot-ai-research-v1" as const;
export const supportedResearchLanguages = ["en", "zh"] as const;

export const researchLanguageSchema = z.enum(supportedResearchLanguages);
export type ResearchLanguage = z.infer<typeof researchLanguageSchema>;

export const researchSourceSchema = z.object({
  sourceId: z.string().min(1).max(180),
  sourceType: z.enum(["identity", "metric", "derived", "trend", "filing"]),
  label: z.string().min(1).max(240),
  metric: z.string().optional(),
  value: z.number().finite().optional(),
  yearOverYearChange: z.number().finite().optional(),
  unit: z.string().max(80).optional(),
  periodEnd: z.string().max(40).optional(),
  filedAt: z.string().max(40).optional(),
  form: z.string().max(20).optional(),
  accessionNumber: z.string().max(80).optional(),
  sourceUrl: z.string().url(),
  derived: z.boolean(),
  derivedFrom: z.array(z.string().min(1).max(180)).max(8).optional(),
});

export type ResearchSource = z.infer<typeof researchSourceSchema>;

export const researchEvidenceFactSchema = z.object({
  sourceId: z.string().min(1).max(180),
  metric: z.string().min(1).max(80),
  value: z.number().finite(),
  unit: z.string().max(80),
  periodEnd: z.string().max(40),
  periodStart: z.string().max(40).optional(),
  fiscalYear: z.number().int().optional(),
  fiscalPeriod: z.string().max(12).optional(),
  filedAt: z.string().max(40),
  form: z.string().max(20),
  accessionNumber: z.string().max(80),
  provenanceType: z.enum(["source", "system-derived"]),
  derivedFrom: z.array(z.string().min(1).max(180)).max(8).optional(),
});

export type ResearchEvidenceFact = z.infer<typeof researchEvidenceFactSchema>;

export const researchAnnualTrendSchema = z.object({
  sourceId: z.string().min(1).max(180),
  metric: z.enum(["Revenue", "Net Income", "Operating Cash Flow", "Free Cash Flow"]),
  periodEnd: z.string().max(40),
  fiscalYear: z.number().int().optional(),
  value: z.number().finite(),
  unit: z.string().max(80),
  yearOverYearChange: z.number().finite().optional(),
  comparisonPeriodEnd: z.string().max(40).optional(),
});

export type ResearchAnnualTrend = z.infer<typeof researchAnnualTrendSchema>;

export const researchEvidenceFilingSchema = z.object({
  sourceId: z.string().min(1).max(180),
  form: z.enum(["10-K", "10-K/A", "10-Q", "10-Q/A", "8-K"]),
  filingDate: z.string().max(40),
  reportDate: z.string().max(40).optional(),
  accessionNumber: z.string().max(80),
  sourceUrl: z.string().url(),
});

export type ResearchEvidenceFiling = z.infer<typeof researchEvidenceFilingSchema>;

export const researchEvidenceBundleSchema = z.object({
  ticker: z.enum(tickerList as [string, ...string[]]),
  companyName: z.string().min(1).max(240),
  cik: z.string().regex(/^\d{10}$/),
  asOf: z.string().max(40),
  sourceMode: z.enum(["live", "cached", "stale-cache"]),
  generatedFromSnapshotAt: z.string().max(60),
  facts: z.array(researchEvidenceFactSchema).max(80),
  annualTrends: z.array(researchAnnualTrendSchema).max(80),
  recentFilings: z.array(researchEvidenceFilingSchema).max(10),
  sources: z.array(researchSourceSchema).max(160),
  evidenceHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export type ResearchEvidenceBundle = z.infer<typeof researchEvidenceBundleSchema>;

export const researchClaimSchema = z.object({
  text: z.string().min(1).max(900),
  sourceIds: z.array(z.string().min(1).max(180)).max(8).default([]),
});

export type ResearchClaim = z.infer<typeof researchClaimSchema>;

export const researchBriefSchema = z.object({
  ticker: z.enum(tickerList as [string, ...string[]]),
  language: researchLanguageSchema,
  asOf: z.string().max(40),
  summary: z.array(researchClaimSchema).min(2).max(4),
  financialTrends: z.array(researchClaimSchema).min(2).max(5),
  strengths: z.array(researchClaimSchema).min(1).max(4),
  risks: z.array(researchClaimSchema).min(2).max(5),
  bullCaseConditions: z.array(researchClaimSchema).min(1).max(4),
  bearCaseConditions: z.array(researchClaimSchema).min(1).max(4),
  researchQuestions: z.array(researchClaimSchema).min(3).max(6),
  limitations: z.array(researchClaimSchema).min(1).max(5),
  sourceIndex: z.array(z.string().min(1).max(180)).min(1).max(160),
  generatedAt: z.string().max(60),
  model: z.string().min(1).max(80),
  promptVersion: z.string().min(1).max(80),
}).strict();

export type ResearchBrief = z.infer<typeof researchBriefSchema>;

export const researchRequestSchema = z.object({
  language: researchLanguageSchema.default("en"),
  question: z.string().max(500).optional(),
  regenerate: z.boolean().default(false),
}).strict();

export type ResearchRequest = z.infer<typeof researchRequestSchema>;

export const researchResponseSchema = z.object({
  ticker: z.string(),
  status: z.enum(["success", "cached", "not-configured", "sec-unavailable", "rate-limited", "provider-error", "schema-error", "grounding-error", "refused"]),
  sourceMode: z.enum(["live", "cached", "stale-cache", "sample", "unavailable"]),
  aiMode: z.enum(["ai-live", "ai-cached", "not-configured", "rules-based"]),
  generatedAt: z.string().optional(),
  cached: z.boolean(),
  promptVersion: z.string(),
  brief: researchBriefSchema.optional(),
  sources: z.array(researchSourceSchema),
  warnings: z.array(z.string()),
  diagnosticCode: z.string().optional(),
}).strict();

export type ResearchResponse = z.infer<typeof researchResponseSchema>;
