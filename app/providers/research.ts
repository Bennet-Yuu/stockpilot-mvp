import { stocks, type Stock, type Ticker } from "../data";
import { z } from "zod";

export type ResearchReport = Stock["report"];
export const researchReportSchema=z.array(z.object({title:z.string().min(1),body:z.string().min(1)})).length(9);

export interface ResearchProvider {
  getReport(ticker: Ticker): ResearchReport;
}

export class MockResearchProvider implements ResearchProvider {
  getReport(ticker: Ticker): ResearchReport {
    return stocks[ticker].report.map((section) => ({ ...section }));
  }
}

export const researchProvider: ResearchProvider = new MockResearchProvider();
