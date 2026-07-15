import type { Ticker } from "../../data";
import type { SecCompanyFinancialSnapshot, SecFinancialMetric, SecNormalizedFact, SecMetricName } from "../sec/types";
import { researchEvidenceBundleSchema, type ResearchAnnualTrend, type ResearchEvidenceBundle, type ResearchEvidenceFact, type ResearchSource } from "./schemas";

const trendMetrics = ["Revenue", "Net Income", "Operating Cash Flow", "Free Cash Flow"] as const;
type TrendMetric = (typeof trendMetrics)[number];

function hashText(input: string): string {
  // A deterministic, dependency-free cache fingerprint. It is not a secret or security hash.
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5];
  const values = seeds.map((seed, index) => {
    let hash = seed >>> 0;
    for (let cursor = index; cursor < input.length; cursor += 4) {
      hash ^= input.charCodeAt(cursor) & 0xff;
      hash = Math.imul(hash, 0x01000193) >>> 0;
      const nextCode = input.charCodeAt(cursor + 1);
      hash ^= Number.isFinite(nextCode) ? nextCode : 0;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  });
  return values.join("");
}

export function makeEvidenceHash(input: string): string {
  return hashText(input);
}

function normalizedUnit(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function sourceId(prefix: "metric" | "derived", fact: SecNormalizedFact, seen: Set<string>): string {
  const base = `sec:${prefix}:${fact.metric.replaceAll(" ", "")}:${fact.periodEnd}`;
  let candidate = base;
  let suffix = 2;
  while (seen.has(candidate)) candidate = `${base}:${suffix++}`;
  seen.add(candidate);
  return candidate;
}

function sameProvenance(source: ResearchSource, item: NonNullable<SecNormalizedFact["derivedFrom"]>[number]): boolean {
  return source.taxonomy === item.taxonomy
    && source.concept === item.concept
    && normalizedUnit(source.unit ?? "") === normalizedUnit(item.unit)
    && source.form === item.form
    && source.accessionNumber === item.accessionNumber
    && source.periodStart === item.periodStart
    && source.periodEnd === item.periodEnd;
}

function findDerivedSourceId(item: NonNullable<SecNormalizedFact["derivedFrom"]>[number], sources: ResearchSource[]): string | undefined {
  return sources.find((source) => sameProvenance(source, item))?.sourceId;
}

function factSource(fact: SecNormalizedFact, id: string, existingSources: ResearchSource[]): ResearchSource {
  const derivedFrom = fact.derivedFrom?.map((item) => findDerivedSourceId(item, existingSources)).filter((value): value is string => Boolean(value));
  return {
    sourceId: id,
    sourceType: fact.provenanceType === "system-derived" ? "derived" : "metric",
    label: `${fact.metric} for ${fact.periodEnd}`,
    metric: fact.metric,
    taxonomy: fact.taxonomy,
    concept: fact.concept,
    value: fact.value,
    unit: fact.unit,
    periodStart: fact.periodStart,
    periodEnd: fact.periodEnd,
    fiscalYear: fact.fiscalYear,
    fiscalPeriod: fact.fiscalPeriod,
    filedAt: fact.filedAt,
    form: fact.form,
    accessionNumber: fact.accessionNumber,
    sourceUrl: fact.sourceUrl,
    derived: fact.provenanceType === "system-derived",
    derivedFrom,
  };
}

function factRecord(fact: SecNormalizedFact, id: string, existingSources: ResearchSource[]): ResearchEvidenceFact {
  return {
    sourceId: id,
    metric: fact.metric,
    taxonomy: fact.taxonomy,
    concept: fact.concept,
    value: fact.value,
    unit: fact.unit,
    periodEnd: fact.periodEnd,
    periodStart: fact.periodStart,
    fiscalYear: fact.fiscalYear,
    fiscalPeriod: fact.fiscalPeriod,
    filedAt: fact.filedAt,
    form: fact.form,
    accessionNumber: fact.accessionNumber,
    provenanceType: fact.provenanceType,
    derivedFrom: fact.derivedFrom?.map((item) => findDerivedSourceId(item, existingSources)).filter((value): value is string => Boolean(value)),
  };
}

function addFact(fact: SecNormalizedFact, seen: Set<string>, facts: ResearchEvidenceFact[], sources: ResearchSource[]): string {
  const id = sourceId(fact.provenanceType === "system-derived" ? "derived" : "metric", fact, seen);
  facts.push(factRecord(fact, id, sources));
  sources.push(factSource(fact, id, sources));
  return id;
}

function assertDerivedSourceIntegrity(facts: ResearchEvidenceFact[], sources: ResearchSource[]): void {
  const sourceMap = new Map(sources.map((source) => [source.sourceId, source]));
  for (const source of sources.filter((value) => value.derived)) {
    const derivedFrom = source.derivedFrom ?? [];
    if (source.metric !== "Free Cash Flow" || derivedFrom.length !== 2 || new Set(derivedFrom).size !== 2) throw new Error("System-derived Free Cash Flow must reference exactly two distinct source facts.");
    const underlying = derivedFrom.map((sourceId) => sourceMap.get(sourceId));
    if (underlying.some((value) => !value || value.derived || value.value === undefined)) throw new Error("System-derived Free Cash Flow references an unavailable or derived source.");
    const metrics = new Set(underlying.map((value) => value?.metric));
    if (!metrics.has("Operating Cash Flow") || !metrics.has("Capital Expenditure") || metrics.size !== 2) throw new Error("System-derived Free Cash Flow must reference Operating Cash Flow and Capital Expenditure only.");
    if (underlying.some((value) => !value || value.taxonomy !== source.taxonomy || !value.concept || value.accessionNumber !== source.accessionNumber || value.periodStart !== source.periodStart || value.periodEnd !== source.periodEnd || normalizedUnit(value.unit ?? "") !== normalizedUnit(source.unit ?? "") || value.form !== source.form)) throw new Error("System-derived Free Cash Flow provenance does not match the underlying taxonomy, concept, period, unit, form, and accession.");
  }
  for (const fact of facts.filter((value) => value.provenanceType === "system-derived")) {
    if (fact.metric !== "Free Cash Flow" || fact.derivedFrom?.length !== 2 || new Set(fact.derivedFrom).size !== 2) throw new Error("System-derived Free Cash Flow evidence must retain two distinct source IDs.");
  }
}

function metricFacts(metric: SecFinancialMetric): SecNormalizedFact[] {
  if (metric.status !== "available") return [];
  const facts = [...metric.annualHistory];
  if (metric.latest && !facts.some((fact) => fact.accessionNumber === metric.latest?.accessionNumber && fact.periodEnd === metric.latest?.periodEnd)) facts.unshift(metric.latest);
  return facts.slice(0, 6);
}

function buildTrend(metric: TrendMetric, facts: SecNormalizedFact[], seen: Set<string>, sources: ResearchSource[]): ResearchAnnualTrend[] {
  const sorted = [...facts].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  return sorted.slice(0, 5).map((fact, index) => {
    const prior = sorted[index + 1];
    const comparable = prior && normalizedUnit(prior.unit) === normalizedUnit(fact.unit) && prior.value !== 0;
    const yearOverYearChange = comparable ? ((fact.value - prior.value) / Math.abs(prior.value)) * 100 : undefined;
    const id = `sec:trend:${metric.replaceAll(" ", "")}:${fact.periodEnd}`;
    if (!seen.has(id)) {
      seen.add(id);
      sources.push({
        sourceId: id,
        sourceType: "trend",
        label: `${metric} trend for ${fact.periodEnd}`,
        metric,
        taxonomy: fact.taxonomy,
        concept: fact.concept,
        value: fact.value,
        unit: fact.unit,
        periodStart: fact.periodStart,
        periodEnd: fact.periodEnd,
        fiscalYear: fact.fiscalYear,
        fiscalPeriod: fact.fiscalPeriod,
        filedAt: fact.filedAt,
        form: fact.form,
        accessionNumber: fact.accessionNumber,
        sourceUrl: fact.sourceUrl,
        derived: false,
        yearOverYearChange,
      });
    }
    return { sourceId: id, metric, periodEnd: fact.periodEnd, fiscalYear: fact.fiscalYear, value: fact.value, unit: fact.unit, yearOverYearChange, comparisonPeriodEnd: prior?.periodEnd };
  });
}

export function isEvidenceEligibleSnapshot(snapshot: SecCompanyFinancialSnapshot): boolean {
  return snapshot.sourceMode === "live" || snapshot.sourceMode === "cached" || snapshot.sourceMode === "stale-cache";
}

export function buildResearchEvidenceBundle(snapshot: SecCompanyFinancialSnapshot): ResearchEvidenceBundle {
  if (!isEvidenceEligibleSnapshot(snapshot)) throw new Error("SEC sample or unavailable data cannot be sent to the AI provider.");

  const facts: ResearchEvidenceFact[] = [];
  const sources: ResearchSource[] = [{
    sourceId: `sec:identity:${snapshot.ticker}`,
    sourceType: "identity",
    label: `${snapshot.companyName} SEC identity`,
    sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${Number(snapshot.cik)}`,
    derived: false,
  }];
  const seen = new Set(sources.map((source) => source.sourceId));

  const metricMap = new Map<SecMetricName, SecNormalizedFact[]>();
  for (const metricName of Object.keys(snapshot.metrics) as SecMetricName[]) {
    const metricValues = metricFacts(snapshot.metrics[metricName]);
    metricMap.set(metricName, metricValues);
    for (const fact of metricValues) addFact(fact, seen, facts, sources);
  }

  const annualTrends = trendMetrics.flatMap((metric) => buildTrend(metric, metricMap.get(metric) ?? [], seen, sources));
  const recentFilings = snapshot.recentFilings.slice(0, 10).map((filing) => {
    const id = `sec:filing:${filing.accessionNumber}`;
    if (!seen.has(id)) {
      seen.add(id);
      sources.push({ sourceId: id, sourceType: "filing", label: `${filing.form} filed ${filing.filingDate}`, form: filing.form, filedAt: filing.filingDate, accessionNumber: filing.accessionNumber, sourceUrl: filing.sourceUrl, derived: false });
    }
    return { sourceId: id, form: filing.form, filingDate: filing.filingDate, reportDate: filing.reportDate, accessionNumber: filing.accessionNumber, sourceUrl: filing.sourceUrl };
  });

  assertDerivedSourceIntegrity(facts, sources);
  const base = { ticker: snapshot.ticker as Ticker, companyName: snapshot.companyName, cik: snapshot.cik, asOf: snapshot.asOf, sourceMode: snapshot.sourceMode as "live" | "cached" | "stale-cache", generatedFromSnapshotAt: snapshot.fetchedAt, facts, annualTrends, recentFilings, sources };
  const evidenceHash = hashText(JSON.stringify(base));
  return researchEvidenceBundleSchema.parse({ ...base, evidenceHash });
}

export function evidenceSourceMap(bundle: ResearchEvidenceBundle): Map<string, ResearchSource> {
  return new Map(bundle.sources.map((source) => [source.sourceId, source]));
}

export function stableEvidenceJson(bundle: ResearchEvidenceBundle): string {
  return JSON.stringify(bundle);
}
