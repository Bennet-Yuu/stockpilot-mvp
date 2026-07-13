import { stocks, tickerList, type Stock, type Ticker } from "../data";

export interface MarketDataProvider {
  listSupportedTickers(): Ticker[];
  getStock(ticker: string): Stock | null;
}

export class MockMarketDataProvider implements MarketDataProvider {
  listSupportedTickers(): Ticker[] {
    return [...tickerList];
  }

  getStock(ticker: string): Stock | null {
    const normalized = ticker.trim().toUpperCase();
    return normalized in stocks ? stocks[normalized as Ticker] : null;
  }
}

export const marketDataProvider: MarketDataProvider = new MockMarketDataProvider();
