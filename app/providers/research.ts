import { stocks, type Stock, type Ticker } from "../data";

export type ResearchReport = Stock["report"];

export interface ResearchProvider {
  getReport(ticker: Ticker): ResearchReport;
}

export class MockResearchProvider implements ResearchProvider {
  getReport(ticker: Ticker): ResearchReport {
    return stocks[ticker].report.map((section) => ({ ...section }));
  }
}

export const researchProvider: ResearchProvider = new MockResearchProvider();
