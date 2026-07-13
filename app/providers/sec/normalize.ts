import { secCompanyFactsSchema, secSubmissionsSchema, type SecCompanyFacts, type SecRawFact, type SecSubmissions } from "./schemas";
import { conceptCandidates, preferredUnits } from "./concepts";
import { secArchiveUrl } from "./tickerMap";
import type { SecAnnualFinancialPoint, SecCompanyIdentity, SecCompanyFinancialSnapshot, SecFinancialMetric, SecFactProvenance, SecMetricName, SecNormalizedFact, SecRecentFiling, SecPeriodKind } from "./types";
import type { Ticker } from "../../data";

const METRICS: SecMetricName[] = ["Revenue", "Operating Income", "Net Income", "Operating Cash Flow", "Capital Expenditure", "Free Cash Flow", "Assets", "Liabilities", "Cash and Cash Equivalents", "Diluted EPS"];

type FilingLookup = Map<string, { primaryDocument: string; filingDate: string; reportDate?: string }>;

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

function factSourceUrl(cik: string, fact: SecRawFact, filings: FilingLookup): string {
  const filing = filings.get(fact.accn);
  if (filing) return secArchiveUrl(cik, fact.accn, filing.primaryDocument);
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
}

function compareFacts(a: SecRawFact, b: SecRawFact): number {
  const filed = b.filed.localeCompare(a.filed);
  if (filed !== 0) return filed;
  return b.accn.localeCompare(a.accn);
}

function chooseUnit(units: Record<string, SecRawFact[]>, metric: SecMetricName): [string, SecRawFact[]] | undefined {
  const entries = Object.entries(units);
  for (const unit of preferredUnits(metric)) {
    const found = entries.find(([name, values]) => name.toLowerCase().replaceAll(" ", "") === unit.toLowerCase().replaceAll(" ", "") && values.length > 0);
    if (found) return found;
  }
  return entries.find(([, values]) => values.length > 0);
}

function sourceProvenance(taxonomy: string, concept: string, unit: string, fact: SecRawFact, cik: string, filings: FilingLookup): SecFactProvenance {
  return { taxonomy, concept, unit, form: fact.form, filedAt: fact.filed, periodEnd: fact.end, periodStart: fact.start, fiscalYear: fact.fy, fiscalPeriod: fact.fp, accessionNumber: fact.accn, sourceUrl: factSourceUrl(cik, fact, filings), periodKind: periodKind(fact) };
}

function provenanceFromFact(fact: SecNormalizedFact): SecFactProvenance {
  return { taxonomy: fact.taxonomy, concept: fact.concept, unit: fact.unit, form: fact.form, filedAt: fact.filedAt, periodEnd: fact.periodEnd, periodStart: fact.periodStart, fiscalYear: fact.fiscalYear, fiscalPeriod: fact.fiscalPeriod, accessionNumber: fact.accessionNumber, sourceUrl: fact.sourceUrl, periodKind: fact.periodKind };
}

function toNormalizedFact(metric: SecMetricName, taxonomy: string, concept: string, unit: string, fact: SecRawFact, cik: string, filings: FilingLookup): SecNormalizedFact {
  const provenance = sourceProvenance(taxonomy, concept, unit, fact, cik, filings);
  return { ...provenance, metric, value: metric === "Capital Expenditure" ? Math.abs(fact.val) : fact.val };
}

function factsForMetric(facts: SecCompanyFacts, metric: SecMetricName): Array<{ taxonomy: string; concept: string; unit: string; fact: SecRawFact }> {
  const candidates = conceptCandidates(metric);
  const found: Array<{ taxonomy: string; concept: string; unit: string; fact: SecRawFact }> = [];
  for (const taxonomy of Object.keys(facts.facts)) {
    const taxonomyFacts = facts.facts[taxonomy];
    for (const candidate of candidates) {
      const concept = taxonomyFacts[candidate];
      if (!concept) continue;
      const selected = chooseUnit(concept.units, metric);
      if (selected) for (const fact of selected[1]) found.push({ taxonomy, concept: candidate, unit: selected[0], fact });
      if (found.length > 0) break;
    }
    if (found.length > 0) break;
  }
  return found;
}

function metricFacts(facts: SecCompanyFacts, metric: SecMetricName, cik: string, filings: FilingLookup): SecNormalizedFact[] {
  if (metric === "Free Cash Flow") return [];
  return factsForMetric(facts, metric).map(({ taxonomy, concept, unit, fact }) => toNormalizedFact(metric, taxonomy, concept, unit, fact, cik, filings));
}

function dedupeAndSort(values: SecNormalizedFact[], annualOnly: boolean): SecNormalizedFact[] {
  const selected = new Map<string, SecNormalizedFact>();
  for (const fact of values) {
    if (annualOnly && !isAnnual({ accn: fact.accessionNumber, fy: fact.fiscalYear, fp: fact.fiscalPeriod, form: fact.form, filed: fact.filedAt, end: fact.periodEnd, start: fact.periodStart, val: fact.value })) continue;
    const key = `${fact.periodEnd}|${fact.fiscalYear ?? ""}|${fact.form.replace(/\/A$/, "")}`;
    const previous = selected.get(key);
    if (!previous || compareFacts({ accn: fact.accessionNumber, filed: fact.filedAt, form: fact.form, end: fact.periodEnd, val: fact.value }, { accn: previous.accessionNumber, filed: previous.filedAt, form: previous.form, end: previous.periodEnd, val: previous.value }) < 0) selected.set(key, fact);
  }
  return [...selected.values()].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || b.filedAt.localeCompare(a.filedAt));
}

function unavailable(metric: SecMetricName, warning = "This SEC concept is not available in the returned facts."): SecFinancialMetric {
  return { metric, status: "unavailable", annualHistory: [], warning };
}

export function normalizeRecentFilings(submissionsInput: unknown, ticker: Ticker): SecRecentFiling[] {
  void ticker;
  const submissions = secSubmissionsSchema.parse(submissionsInput);
  const recent = submissions.filings.recent;
  const filings: SecRecentFiling[] = [];
  for (let index = 0; index < recent.accessionNumber.length; index += 1) {
    const form = recent.form[index];
    const accessionNumber = recent.accessionNumber[index];
    const filingDate = recent.filingDate[index];
    const primaryDocument = recent.primaryDocument[index];
    if (!accessionNumber || !filingDate || !primaryDocument || (form !== "10-K" && form !== "10-Q" && form !== "8-K")) continue;
    filings.push({ accessionNumber, form, filingDate, reportDate: recent.reportDate[index], primaryDocument, sourceUrl: secArchiveUrl(submissions.cik, accessionNumber, primaryDocument), isXbrl: recent.isXBRL[index] });
  }
  return filings.sort((a, b) => b.filingDate.localeCompare(a.filingDate)).slice(0, 10).map((filing) => ({ ...filing, form: filing.form, ticker }));
}

export function normalizeFinancials(factsInput: unknown, submissionsInput: unknown, ticker: Ticker): { metrics: Record<SecMetricName, SecFinancialMetric>; annualHistory: SecAnnualFinancialPoint[] } {
  void ticker;
  const facts = secCompanyFactsSchema.parse(factsInput);
  const submissions = secSubmissionsSchema.parse(submissionsInput);
  const filings = filingLookup(submissions);
  const metricValues = new Map<SecMetricName, SecNormalizedFact[]>();
  for (const metric of METRICS) metricValues.set(metric, metricFacts(facts, metric, submissions.cik, filings));

  const annualByMetric = new Map<SecMetricName, SecNormalizedFact[]>();
  for (const metric of METRICS.filter((value) => value !== "Free Cash Flow")) annualByMetric.set(metric, dedupeAndSort(metricValues.get(metric) ?? [], true));

  const ocfAnnual = annualByMetric.get("Operating Cash Flow") ?? [];
  const capexAnnual = annualByMetric.get("Capital Expenditure") ?? [];
  const freeCashFlows: SecNormalizedFact[] = [];
  for (const ocf of ocfAnnual) {
    const capex = capexAnnual.find((value) => value.periodEnd === ocf.periodEnd && value.fiscalYear === ocf.fiscalYear);
    if (!capex) continue;
    freeCashFlows.push({ ...ocf, metric: "Free Cash Flow", value: ocf.value - capex.value, derivedFrom: [provenanceFromFact(ocf), provenanceFromFact(capex)] });
  }
  const freeCashFlowAnnual = dedupeAndSort(freeCashFlows, false);
  metricValues.set("Free Cash Flow", freeCashFlowAnnual);
  annualByMetric.set("Free Cash Flow", freeCashFlowAnnual);

  const metrics = {} as Record<SecMetricName, SecFinancialMetric>;
  for (const metric of METRICS) {
    const annualHistory = annualByMetric.get(metric) ?? [];
    const allValues = dedupeAndSort(metricValues.get(metric) ?? [], false);
    metrics[metric] = allValues.length > 0 ? { metric, status: "available", latest: allValues[0], annualHistory: annualHistory.slice(0, 5) } : unavailable(metric);
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
  return { ticker, cik: identity.cik, companyName: submissions.name, identity, metrics: normalized.metrics, annualHistory: normalized.annualHistory, recentFilings: normalizeRecentFilings(submissionsInput, ticker), sourceMode, status, fetchedAt, asOf: normalized.annualHistory[0]?.periodEnd ?? fetchedAt.slice(0, 10), warnings };
}
