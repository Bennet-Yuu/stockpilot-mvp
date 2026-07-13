import type { Ticker } from "../data";
export type FilingSummary={ticker:Ticker;form:string;filedAt:string;sourceUrl:string;sample:true};
export interface FilingDataProvider{listRecent(ticker:Ticker):FilingSummary[]}
export class MockFilingDataProvider implements FilingDataProvider{listRecent(ticker:Ticker){return[{ticker,form:"10-K",filedAt:"2026-01-31",sourceUrl:"https://www.sec.gov/edgar/search/",sample:true as const}]}}
export const filingDataProvider:FilingDataProvider=new MockFilingDataProvider();
