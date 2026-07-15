import { tickerList, type Ticker } from "../../data";
import { SecProviderError } from "./errors";
import type { SecCompanyIdentity } from "./types";

export const SEC_TICKER_MAPPING_URL = "https://www.sec.gov/files/company_tickers_exchange.json";

// Verified against the SEC's official company_tickers_exchange.json.
export const secTickerMap: Record<Ticker, SecCompanyIdentity> = {
  AAPL: { ticker: "AAPL", cik: "0000320193", legalName: "Apple Inc.", exchanges: ["Nasdaq"] },
  MSFT: { ticker: "MSFT", cik: "0000789019", legalName: "MICROSOFT CORP", exchanges: ["Nasdaq"] },
  NVDA: { ticker: "NVDA", cik: "0001045810", legalName: "NVIDIA CORP", exchanges: ["Nasdaq"] },
  AMZN: { ticker: "AMZN", cik: "0001018724", legalName: "AMAZON COM INC", exchanges: ["Nasdaq"] },
  TSLA: { ticker: "TSLA", cik: "0001318605", legalName: "Tesla, Inc.", exchanges: ["Nasdaq"] },
};

export function normalizeSecTicker(value: unknown): Ticker {
  if (typeof value !== "string") throw new SecProviderError("SEC_INVALID_TICKER", "Unsupported ticker.");
  const ticker = value.trim().toUpperCase();
  if (!tickerList.includes(ticker as Ticker)) throw new SecProviderError("SEC_INVALID_TICKER", "Unsupported ticker.");
  return ticker as Ticker;
}

export function getSecIdentity(ticker: Ticker): SecCompanyIdentity {
  return secTickerMap[ticker];
}

export function cikForTicker(ticker: Ticker): string {
  return getSecIdentity(ticker).cik;
}

export function secArchiveUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const normalizedCik = cik.replace(/\D/g, "").replace(/^0+/, "") || "0";
  const accession = accessionNumber.replace(/-/g, "");
  const document = primaryDocument.replace(/^\/+/, "");
  return `https://www.sec.gov/Archives/edgar/data/${normalizedCik}/${accession}/${document}`;
}
