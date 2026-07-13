import { secCompanyFactsSchema, secSubmissionsSchema, type SecCompanyFacts, type SecRawFact, type SecSubmissions } from "./schemas";
import { conceptCandidates, preferredUnits } from "./concepts";
import { secArchiveUrl } from "./tickerMap";
import type { SecAnnualFinancialPoint, SecCompanyIdentity, SecCompanyFinancialSnapshot, SecFinancialMetric, SecFactProvenance, SecMetricName, SecNormalizedFact, SecRecentFiling, SecPeriodKind } from "./types";
import type { Ticker } from "../../data";

const METRICS: SecMetricName[] = ["Revenue", "Operating Income", "Net Income", "Operating Cash Flow", "Capital Expenditure", "Free Cash Flow", "Assets", "Liabilities", "Cash and Cash Equivalents", "Diluted EPS"];
const SUPPORTED_FACT_FORMS = new Set(["10-K", "10-K/A", "10-Q", "10-Q/A"]);

type FilingLookup = Map<string, { primaryDocument: string; filingDate: string; reportDate?: string }>;
type FactCandidate = { taxonomy: string; concept: string; unit: string; fact: SecRawFact; candidateRank: number };

function filingLookup(submissions: SecSubmissions): FilingLookup {
  const recent = submissions.filings.recent;
  const lookup: FilingLookup = new Map();
  for (let index = 0; index < recent.accessionNumber.length; index += 1) {
    const accession = recent.accessionNumber[index];
    if (accession && recent.primaryDocument[index] && recent.filingDate[index]) {
      lookup.set(accession, { primaryDocument: recent.primaryDocument[index], filingDate: recent.filingDate[index], reportDate: recent.reportDate[index] });
    }
  }
  return lookup;
}

function periodKind(fact: SecRawFact): SecPeriodKind {
  if (!fact.start) return "instant";
  const start = Date.parse(fact.start);
  const end = Date.parse(fact.end);
  return Number.isFinite(start) && Number.isFinite(end) && end - start > 260 * 24 * 60 * 60 * 1000 ? "annual" : "quarterly";
}

function isAnnual(fact: SecRawFact): boolean {
  if (fact.form !== "10-K" && fact.form !== "10-K/A") return false;
  if (fact.fp === "FY") return true;
  if (!fact.start) return true;
  return periodKind(fact) === "annual";
}

function isSupportedFact(fact: SecRawFact): boolean {
  return SUPPORTED_FACT_FORMS.has(fact.form);
}

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase().replace(/\s+/g, "");
}

function factSourceUrl(cik: string, fact: SecRawFact, filings: FilingLookup): string {
  const filing = filings.get(fact.accn);
  if (filing) return secArchiveUrl(cik, fact.accn, filing.primaryDocument);
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
}

function compareFacts(a: FactCandidate, b: FactCandidate): number {
  if (a.candidateRank !== b.candidateRank) return a.candidateRank - b.candidateRank;
  const filed = b.fact.filed.localeCompare(a.fact.filed);
  if (filed !== 0) return filed;
  return b.fact.accn.localeCompare(a.fact.accn);
}

function chooseUnit(units: Record<string, SecRawFact[]>, metric: SecMetricName): [string, SecRawFact[]] | undefined {
  const entries = Object.entries(units);
  for (const unit of preferredUnits(metric)) {
    const expected = normalizeUnit(unit);
    const found = entries.find(([name, values]) => normalizeUnit(name) === expected && values.length > 0);
    if (found) return found;
  }
  return undefined;
}

function sourceProvenance(taxonomy: string, concept: string, unit: string, fact: SecRawFact, cik: string, filings: FilingLookup): SecFactProvenance {
  return { taxonomy, concept, unit, form: fact.form, filedAt: fact.filed, periodEnd: fact.end, periodStart: fact.start, fiscalYear: fact.fy, fiscalPeriod: fact.fp, accessionNumber: fact.accn, sourceUrl: factSourceUrl(cik, fact, filings), periodKind: periodKind(fact) };
}

function provenanceFromFact(fact: SecNormalizedFact): SecFactProvenance {
  return { taxonomy: fact.taxonomy, concept: fact.concept, unit: fact.unit, form: fact.form, filedAt: fact.filedAt, periodEnd: fact.periodEnd, periodStart: fact.periodStart, fiscalYear: fact.fiscalYear, fiscalPeriod: fact.fiscalPeriod, accessionNumber: fact.accessionNumber, sourceUrl: fact.sourceUrl, periodKind: fact.periodKind };
}

function toNormalizedFact(metric: SecMetricName, candidate: FactCandidate, cik: string, filings: FilingLookup): SecNormalizedFact {
  const provenance = sourceProvenance(candidate.taxonomy, candidate.concept, candidate.unit, candidate.fact, cik, filings);
  return { ...provenance, metric, value: metric === "Capital Expenditure" ? Math.abs(candidate.fact.val) : candidate.fact.val, provenanceType: "source" };
}

function factsForMetric(facts: SecCompanyFacts, metric: SecMetricName): FactCandidate[] {
  const candidates = conceptCandidates(metric);
  const found: FactCandidate[] = [];
  for (let candidateRank = 0; candidateRank < candidates.length; candidateRank += 1) {
    const candidate = candidates[candidateRank];
    for (const taxonomy of Object.keys(facts.facts)) {
      const concept = facts.facts[taxonomy][candidate];
      if (!concept) continue;
      const selected = chooseUnit(concept.units, metric);
      if (!selected) continue;
      for (const fact of selected[1]) if (isSupportedFact(fact)) found.push({ taxonomy, concept: candidate, unit: selected[0], fact, candidateRank });
    }
  }
  return found;
}

function periodKey(fact: SecRawFact): string {
  return `${fact.end}|${fact.start ?? ""}|${fact.fy ?? ""}|${fact.fp ?? ""}`;
}

function selectFacts(values: FactCandidate[], annualOnly: boolean): FactCandidate[] {
  const selected = new Map<string, FactCandidate>();
  for (const candidate of values) {
    if (annualOnly && !isAnnual(candidate.fact)) continue;
    const key = periodKey(candidate.fact);
    const previous = selected.get(key);
    if (!previous || compareFacts(candidate, previous) < 0) selected.set(key, candidate);
  }
  return [...selected.values()].sort((a, b) => b.fact.end.localeCompare(a.fact.end) || b.fact.filed.localeCompare(a.fact.filed));
}

function unavailable(metric: SecMetricName, warning = "No supported SEC fact with a compatible unit was returned; this metric is unavailable."): SecFinancialMetric {
  return { metric, status: "unavailable", annualHistory: [], warning };
}

function metricFacts(facts: SecCompanyFacts, metric: SecMetricName, cik: string, filings: FilingLookup): SecNormalizedFact[] {
  if (metric === "Free Cash Flow") return [];
  return selectFacts(factsForMetric(facts, metric), false).map((candidate) => toNormalizedFact(metric, candidate, cik, filings));
}

function samePeriod(a: SecNormalizedFact, b: SecNormalizedFact): boolean {
  return a.periodEnd === b.periodEnd && a.periodStart === b.periodStart && a.fiscalYear === b.fiscalYear && normalizeUnit(a.unit) === normalizeUnit(b.unit);
}

function fcfWarning(ocfAnnual: SecNormalizedFact[], capexAnnual: SecNormalizedFact[], freeCashFlows: SecNormalizedFact[]): string | undefined {
  if (ocfAnnual.length === 0) return "Free Cash Flow unavailable: Operating Cash Flow is missing; no zero was substituted.";
  if (capexAnnual.length === 0) return "Free Cash Flow unavailable: Capital Expenditure is missing; no zero was substituted.";
  const ocfUnit = ocfAnnual[0]?.unit;
  const capexUnit = capexAnnual[0]?.unit;
  if (!ocfUnit || !capexUnit || normalizeUnit(ocfUnit) !== normalizeUnit(capexUnit)) return `Free Cash Flow unavailable: Operating Cash Flow uses ${ocfUnit ?? "an unknown unit"} while Capital Expenditure uses ${capexUnit ?? "an unknown unit"}; no automatic conversion is applied.`;
  if (freeCashFlows.length === 0) return "Free Cash Flow unavailable: Operating Cash Flow and Capital Expenditure have no matching fiscal year, period end, and period start.";
  if (freeCashFlows.length < Math.min(ocfAnnual.length, capexAnnual.length)) return "Some annual Free Cash Flow periods are unavailable because the OCF and CapEx periods did not match exactly.";
  return undefined;
}

export function normalizeRecentFilings(submissionsInput: unknown, ticker: Ticker): SecRecentFiling[] {
  const submissions = secSubmissionsSchema.parse(submissionsInput);
  const recent = submissions.filings.recent;
  const filings: SecRecentFiling[] = [];
  for (let index = 0; index < recent.accessionNumber.length; index += 1) {
    const form = recent.form[index];
    const accessionNumber = recent.accessionNumber[index];
    const filingDate = recent.filingDate[index];
    const primaryDocument = recent.primaryDocument[index];
    if (!accessionNumber || !filingDate || !primaryDocument || (form !== "10-K" && form !== "10-K/A" && form !== "10-Q" && form !== "10-Q/A" && form !== "8-K")) continue;
    filings.push({ accessionNumber, form, filingDate, reportDate: recent.reportDate[index], primaryDocument, sourceUrl: secArchiveUrl(submissions.cik, accessionNumber, primaryDocument), isXbrl: recent.isXBRL[index] });
  }
  return filings.sort((a, b) => b.filingDate.localeCompare(a.filingDate)).slice(0, 10).map((filing) => ({ ...filing, ticker }));
}

export function normalizeFinancials(factsInput: unknown, submissionsInput: unknown, ticker: Ticker): { metrics: Record<SecMetricName, SecFinancialMetric>; annualHistory: SecAnnualFinancialPoint[] } {
  void ticker;
  const facts = secCompanyFactsSchema.parse(factsInput);
  const submissions = secSubmissionsSchema.parse(submissionsInput);
  const filings = filingLookup(submissions);
  const metricValues = new Map<SecMetricName, SecNormalizedFact[]>();
  for (const metric of METRICS) metricValues.set(metric, metricFacts(facts, metric, submissions.cik, filings));

  const annualByMetric = new Map<SecMetricName, SecNormalizedFact[]>();
  for (const metric of METRICS.filter((value) => value !== "Free Cash Flow")) {
    const candidates = selectFacts(factsForMetric(facts, metric), true);
    annualByMetric.set(metric, candidates.map((candidate) => toNormalizedFact(metric, candidate, submissions.cik, filings)));
  }

  const ocfAnnual = annualByMetric.get("Operating Cash Flow") ?? [];
  const capexAnnual = annualByMetric.get("Capital Expenditure") ?? [];
  const freeCashFlows: SecNormalizedFact[] = [];
  if (ocfAnnual.length > 0 && capexAnnual.length > 0 && normalizeUnit(ocfAnnual[0]?.unit ?? "") === normalizeUnit(capexAnnual[0]?.unit ?? "")) {
    for (const ocf of ocfAnnual) {
      const capex = capexAnnual.find((value) => samePeriod(ocf, value));
      if (!capex) continue;
      freeCashFlows.push({ ...ocf, metric: "Free Cash Flow", value: ocf.value - capex.value, provenanceType: "system-derived", derivedFrom: [provenanceFromFact(ocf), provenanceFromFact(capex)] });
    }
  }
  const freeCashFlowAnnual = freeCashFlows.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  metricValues.set("Free Cash Flow", freeCashFlows);
  annualByMetric.set("Free Cash Flow", freeCashFlowAnnual);
  const fcfWarningText = fcfWarning(ocfAnnual, capexAnnual, freeCashFlows);

  const metrics = {} as Record<SecMetricName, SecFinancialMetric>;
  for (const metric of METRICS) {
    const annualHistory = annualByMetric.get(metric) ?? [];
    const allValues = metricValues.get(metric) ?? [];
    if (metric === "Free Cash Flow") metrics[metric] = allValues.length > 0 ? { metric, status: "available", latest: allValues[0], annualHistory: annualHistory.slice(0, 5), warning: fcfWarningText } : unavailable(metric, fcfWarningText);
    else metrics[metric] = allValues.length > 0 ? { metric, status: "available", latest: allValues[0], annualHistory: annualHistory.slice(0, 5) } : unavailable(metric);
  }
  const periodEnds = new Set<string>();
  for (const metric of ["Revenue", "Net Income", "Operating Cash Flow", "Free Cash Flow"] as SecMetricName[]) for (const fact of metrics[metric].annualHistory) periodEnds.add(fact.periodEnd);
  const annualHistory = [...periodEnds].sort((a, b) => b.localeCompare(a)).slice(0, 5).map((periodEnd) => {
    const revenue = metrics.Revenue.annualHistory.find((fact) => fact.periodEnd === periodEnd);
    const netIncome = metrics["Net Income"].annualHistory.find((fact) => fact.periodEnd === periodEnd);
    const operatingCashFlow = metrics["Operating Cash Flow"].annualHistory.find((fact) => fact.periodEnd === periodEnd);
    const freeCashFlow = metrics["Free Cash Flow"].annualHistory.find((fact) => fact.periodEnd === periodEnd);
    return { periodEnd, fiscalYear: revenue?.fiscalYear ?? netIncome?.fiscalYear ?? operatingCashFlow?.fiscalYear ?? freeCashFlow?.fiscalYear, revenue, netIncome, operatingCashFlow, freeCashFlow };
  });
  return { metrics, annualHistory };
}

export function normalizeSnapshot(factsInput: unknown, submissionsInput: unknown, ticker: Ticker, sourceMode: SecCompanyFinancialSnapshot["sourceMode"], status: SecCompanyFinancialSnapshot["status"], fetchedAt: string, warnings: string[] = []): SecCompanyFinancialSnapshot {
  const submissions = secSubmissionsSchema.parse(submissionsInput);
  const identity: SecCompanyIdentity = { ticker, cik: submissions.cik.padStart(10, "0"), legalName: submissions.name, exchanges: submissions.exchanges, sic: submissions.sic, sicDescription: submissions.sicDescription, fiscalYearEnd: submissions.fiscalYearEnd };
  const normalized = normalizeFinancials(factsInput, submissionsInput, ticker);
  const metricWarnings = Object.values(normalized.metrics).flatMap((metric) => metric.warning ? [metric.warning] : []).filter((warning) => warning.startsWith("Free Cash Flow"));
  return { ticker, cik: identity.cik, companyName: submissions.name, identity, metrics: normalized.metrics, annualHistory: normalized.annualHistory, recentFilings: normalizeRecentFilings(submissionsInput, ticker), sourceMode, status, fetchedAt, asOf: normalized.annualHistory[0]?.periodEnd ?? fetchedAt.slice(0, 10), warnings: [...warnings, ...metricWarnings] };
}
