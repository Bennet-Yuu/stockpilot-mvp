import { notFound } from "next/navigation";
import StockPilotApp from "../../StockPilotApp";
import { tickerList, type Ticker } from "../../data";

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const normalized = ticker.toUpperCase();
  if (!tickerList.includes(normalized as Ticker)) notFound();
  return <StockPilotApp initialView="stock" initialTicker={normalized as Ticker} />;
}
