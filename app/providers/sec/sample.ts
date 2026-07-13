import { getSecIdentity } from "./tickerMap";
import type { SecCompanyFinancialSnapshot, SecFactProvenance, SecFinancialMetric, SecFilingDataProvider, SecMetricName, SecNormalizedFact, SecRecentFiling } from "./types";
import type { Ticker } from "../../data";

export const SEC_METRIC_NAMES: SecMetricName[] = ["Revenue", "Operating Income", "Net Income", "Operating Cash Flow", "Capital Expenditure", "Free Cash Flow", "Assets", "Liabilities", "Cash and Cash Equivalents", "Diluted EPS"];

const sampleValues: Record<Ticker, { revenue: number[]; netIncome: number[]; ocf: number[]; capex: number[] }> = {
  AAPL: { revenue: [383285, 394328, 365817, 274515, 260174], netIncome: [93736, 99803, 94680, 57411, 55256], ocf: [122151, 110543, 122151, 80674, 69391], capex: [9959, 10959, 10708, 7309, 10495] },
  MSFT: { revenue: [245122, 211915, 198270, 168088, 143015], netIncome: [88100, 72361, 72738, 61271, 44281], ocf: [118548, 87582, 89035, 76740, 56324], capex: [44477, 28107, 23886, 20622, 15441] },
  NVDA: { revenue: [130497, 60922, 26974, 16675, 10378], netIncome: [72880, 4368, 9752, 4332, 4332], ocf: [64120, 28300, 56400, 9100, 5800], capex: [5070, 1069, 976, 976, 323] },
  AMZN: { revenue: [574785, 513983, 469822, 386064, 280522], netIncome: [5915, -2722, 33364, 21331, 11588], ocf: [84950, 68448, 46327, 66864, 66864], capex: [48400, 63300, 61053, 40667, 40140] },
  TSLA: { revenue: [96773, 81462, 53823, 31536, 24578], netIncome: [14974, 12556, 5644, 721, 862], ocf: [13256, 14724, 11497, 1153, 2405], capex: [8899, 7172, 6963, 3242, 3232] },
};

const years = [2024, 2023, 2022, 2021, 2020];
const endDates = ["2024-12-31", "2023-12-31", "2022-12-31", "2021-12-31", "2020-12-31"];

function sampleProvenance(ticker: Ticker, metric: SecMetricName, year: number, periodEnd: string): SecFactProvenance {
  const identity = getSecIdentity(ticker);
  const concept = metric === "Revenue" ? "RevenueFromContractWithCustomerExcludingAssessedTax" : metric.replaceAll(" ", "");
  return { taxonomy: "us-gaap", concept, unit: metric === "Diluted EPS" ? "USD/shares" : "USD", form: "10-K", filedAt: `${year + 1}-02-01`, periodEnd, periodStart: `${year}-01-01`, fiscalYear: year, fiscalPeriod: "FY", accessionNumber: `sample-${ticker}-${year}`, sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${Number(identity.cik)}`, periodKind: "annual" };
}

function makeSampleFact(ticker: Ticker, metric: SecMetricName, year: number, periodEnd: string, value: number): SecNormalizedFact {
  return { ...sampleProvenance(ticker, metric, year, periodEnd), metric, value };
}

function makeMetric(ticker: Ticker, metric: SecMetricName, values: number[]): SecFinancialMetric {
  const annualHistory = years.map((year, index) => makeSampleFact(ticker, metric, year, endDates[index], values[index] ?? values[values.length - 1] ?? 0));
  return { metric, status: "available", latest: annualHistory[0], annualHistory, warning: `Sample ${metric.toLowerCase()}; not a live SEC fact.` };
}

function unavailable(metric: SecMetricName): SecFinancialMetric {
  return { metric, status: "unavailable", annualHistory: [], warning: "Not available in this demo fallback." };
}

function sampleFilings(ticker: Ticker): SecRecentFiling[] {
  const identity = getSecIdentity(ticker);
  return [2024, 2023, 2022].map((year) => {
    const accessionNumber = `sample-${ticker}-${year}`;
    return { accessionNumber, form: "10-K", filingDate: `${year + 1}-02-01`, reportDate: `${year}-12-31`, primaryDocument: `${ticker.toLowerCase()}-${year}.htm`, sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${Number(identity.cik)}` };
  });
}

export function createSampleSecSnapshot(ticker: Ticker, now = Date.now(), warnings: string[] = []): SecCompanyFinancialSnapshot {
  const identity = getSecIdentity(ticker);
  const values = sampleValues[ticker];
  const metrics = {} as Record<SecMetricName, SecFinancialMetric>;
  metrics.Revenue = makeMetric(ticker, "Revenue", values.revenue);
  metrics["Net Income"] = makeMetric(ticker, "Net Income", values.netIncome);
  metrics["Operating Cash Flow"] = makeMetric(ticker, "Operating Cash Flow", values.ocf);
  metrics["Capital Expenditure"] = makeMetric(ticker, "Capital Expenditure", values.capex);
  metrics["Operating Income"] = unavailable("Operating Income");
  metrics.Assets = unavailable("Assets");
  metrics.Liabilities = unavailable("Liabilities");
  metrics["Cash and Cash Equivalents"] = unavailable("Cash and Cash Equivalents");
  metrics["Diluted EPS"] = unavailable("Diluted EPS");
  const freeCashFlowHistory = years.map((year, index) => {
    const ocf = metrics["Operating Cash Flow"].annualHistory[index];
    const capex = metrics["Capital Expenditure"].annualHistory[index];
    return { ...makeSampleFact(ticker, "Free Cash Flow", year, endDates[index], (values.ocf[index] ?? 0) - (values.capex[index] ?? 0)), derivedFrom: [ocf, capex].map((fact) => ({ taxonomy: fact.taxonomy, concept: fact.concept, unit: fact.unit, form: fact.form, filedAt: fact.filedAt, periodEnd: fact.periodEnd, periodStart: fact.periodStart, fiscalYear: fact.fiscalYear, fiscalPeriod: fact.fiscalPeriod, accessionNumber: fact.accessionNumber, sourceUrl: fact.sourceUrl, periodKind: fact.periodKind })) };
  });
  metrics["Free Cash Flow"] = { metric: "Free Cash Flow", status: "available", latest: freeCashFlowHistory[0], annualHistory: freeCashFlowHistory, warning: "Derived from sample operating cash flow minus sample capital expenditure." };
  const annualHistory = years.map((year, index) => ({ fiscalYear: year, periodEnd: endDates[index], revenue: metrics.Revenue.annualHistory[index], netIncome: metrics["Net Income"].annualHistory[index], operatingCashFlow: metrics["Operating Cash Flow"].annualHistory[index], freeCashFlow: freeCashFlowHistory[index] }));
  return { ticker, cik: identity.cik, companyName: identity.legalName, identity, metrics, annualHistory, recentFilings: sampleFilings(ticker), sourceMode: "sample", status: "fallback", fetchedAt: new Date(now).toISOString(), asOf: endDates[0], warnings: warnings.length > 0 ? warnings : ["SEC live data is not configured; showing sample fallback data."] };
}

export class MockSecFilingDataProvider implements SecFilingDataProvider {
  async getCompanySnapshot(ticker: Ticker): Promise<SecCompanyFinancialSnapshot> { return createSampleSecSnapshot(ticker); }
  async getCompanyIdentity(ticker: Ticker) { return createSampleSecSnapshot(ticker).identity; }
  async getRecentFilings(ticker: Ticker) { return createSampleSecSnapshot(ticker).recentFilings; }
  async getCompanyFacts(ticker: Ticker) {
    const snapshot = createSampleSecSnapshot(ticker);
    return { ticker, cik: snapshot.cik, taxonomyCount: 1, conceptCount: SEC_METRIC_NAMES.length, retrievedAt: snapshot.fetchedAt };
  }
  async getNormalizedFinancials(ticker: Ticker) { return createSampleSecSnapshot(ticker).metrics; }
}
