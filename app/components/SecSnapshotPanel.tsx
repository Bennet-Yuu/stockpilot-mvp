"use client";

import { useEffect, useState } from "react";
import type { SecCompanyFinancialSnapshot, SecFinancialMetric, SecNormalizedFact, SecMetricName } from "../providers/sec/types";
import type { Ticker } from "../data";

type LoadState = "loading" | "ready" | "error";

const metricOrder: SecMetricName[] = ["Revenue", "Operating Income", "Net Income", "Operating Cash Flow", "Capital Expenditure", "Free Cash Flow", "Assets", "Liabilities", "Cash and Cash Equivalents", "Diluted EPS"];

function isSnapshot(value: unknown): value is SecCompanyFinancialSnapshot {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.ticker === "string" && typeof record.cik === "string" && typeof record.fetchedAt === "string" && Array.isArray(record.recentFilings) && typeof record.metrics === "object";
}

function formatValue(fact: SecNormalizedFact): string {
  if (fact.unit.includes("share")) return `$${fact.value.toFixed(2)}`;
  const absolute = Math.abs(fact.value);
  const sign = fact.value < 0 ? "-" : "";
  if (absolute >= 1_000_000_000_000) return `${sign}$${(absolute / 1_000_000_000_000).toFixed(2)}T`;
  if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(2)}M`;
  return `${sign}$${absolute.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function FactValue({ metric }: { metric: SecFinancialMetric }) {
  if (metric.status !== "available" || !metric.latest) return <span className="sec-unavailable">Unavailable</span>;
  return <><b>{formatValue(metric.latest)}</b><small>{metric.latest.periodEnd} · filed {metric.latest.filedAt}</small></>;
}

function sourceModeLabel(mode: SecCompanyFinancialSnapshot["sourceMode"]): string {
  if (mode === "live") return "SEC live";
  if (mode === "cached") return "SEC cached";
  if (mode === "stale-cache") return "Stale cache";
  if (mode === "sample") return "Sample fallback";
  return "Unavailable";
}

export default function SecSnapshotPanel({ ticker }: { ticker: Ticker }) {
  const [state, setState] = useState<LoadState>("loading");
  const [snapshot, setSnapshot] = useState<SecCompanyFinancialSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loadedTicker, setLoadedTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/sec/snapshot/${ticker}`, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok || !isSnapshot(payload)) throw new Error("SEC snapshot is unavailable");
        return payload;
      })
      .then((payload) => { setSnapshot(payload); setLoadedTicker(ticker); setState("ready"); })
      .catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError("SEC data could not be loaded. The sample market and research profile remain available."); setLoadedTicker(ticker); setState("error"); });
    return () => controller.abort();
  }, [ticker]);

  if (state === "loading" || loadedTicker !== ticker) return <section className="card sec-panel"><div className="section-head"><div><p className="eyebrow">SEC SOURCE FACTS</p><h2>Loading official filing data…</h2></div><span className="sec-status">Loading</span></div><p className="sec-muted">The browser never calls SEC directly; the server provider applies rate limits, validation, and cache rules.</p></section>;
  if (state === "error" || !snapshot) return <section className="card sec-panel"><div className="section-head"><div><p className="eyebrow">SEC SOURCE FACTS</p><h2>SEC data unavailable</h2></div><span className="sec-status error">Unavailable</span></div><p className="sec-muted">{error}</p></section>;

  return <section className="card sec-panel">
    <div className="section-head"><div><p className="eyebrow">SEC SOURCE FACTS</p><h2>Official company identity and filings</h2><p className="sec-subtitle">Separate from Sample market data and Research Profile. Facts retain filing dates and source links.</p></div><span className={`sec-status ${snapshot.sourceMode}`}>{sourceModeLabel(snapshot.sourceMode)}</span></div>
    <div className="sec-identity-grid">
      <div><small>Company</small><b>{snapshot.identity.legalName}</b></div><div><small>CIK</small><b>{snapshot.cik}</b></div><div><small>Exchange</small><b>{snapshot.identity.exchanges.join(", ") || "Unavailable"}</b></div><div><small>SIC</small><b>{snapshot.identity.sic ? `${snapshot.identity.sic}${snapshot.identity.sicDescription ? ` · ${snapshot.identity.sicDescription}` : ""}` : "Unavailable"}</b></div><div><small>Fiscal year end</small><b>{snapshot.identity.fiscalYearEnd || "Unavailable"}</b></div>
    </div>
    <div className="sec-section-head"><div><p className="eyebrow">LATEST FACTS</p><h3>Normalized metrics</h3></div><span className="sec-asof">As of {snapshot.asOf}</span></div>
    <div className="sec-metrics-grid">{metricOrder.map((name) => <div className="sec-metric" key={name}><small>{name}</small><FactValue metric={snapshot.metrics[name]}/>{snapshot.metrics[name].latest && <a href={snapshot.metrics[name].latest.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a>}</div>)}</div>
    <div className="sec-section-head"><div><p className="eyebrow">ANNUAL TREND</p><h3>Five-year filing facts</h3></div><span className="sec-asof">Text table · no price forecast</span></div>
    <div className="sec-table-wrap"><table className="sec-annual-table"><thead><tr><th>Year</th><th>Revenue</th><th>Net income</th><th>Operating cash flow</th><th>Free cash flow</th></tr></thead><tbody>{snapshot.annualHistory.length ? snapshot.annualHistory.map((point) => <tr key={point.periodEnd}><td>{point.fiscalYear ?? point.periodEnd}</td><td>{point.revenue ? <a href={point.revenue.sourceUrl} target="_blank" rel="noreferrer">{formatValue(point.revenue)}</a> : "Unavailable"}</td><td>{point.netIncome ? <a href={point.netIncome.sourceUrl} target="_blank" rel="noreferrer">{formatValue(point.netIncome)}</a> : "Unavailable"}</td><td>{point.operatingCashFlow ? <a href={point.operatingCashFlow.sourceUrl} target="_blank" rel="noreferrer">{formatValue(point.operatingCashFlow)}</a> : "Unavailable"}</td><td>{point.freeCashFlow ? <a href={point.freeCashFlow.sourceUrl} target="_blank" rel="noreferrer">{formatValue(point.freeCashFlow)}</a> : "Unavailable"}</td></tr>) : <tr><td colSpan={5}>Unavailable</td></tr>}</tbody></table></div>
    <div className="sec-section-head"><div><p className="eyebrow">RECENT FILINGS</p><h3>10-K, 10-Q and 8-K</h3></div><span className="sec-asof">Newest {snapshot.recentFilings.length}</span></div>
    <div className="sec-table-wrap"><table className="sec-filings-table"><thead><tr><th>Form</th><th>Filed</th><th>Report date</th><th>Accession</th><th>Source</th></tr></thead><tbody>{snapshot.recentFilings.length ? snapshot.recentFilings.map((filing) => <tr key={filing.accessionNumber}><td><b>{filing.form}</b></td><td>{filing.filingDate}</td><td>{filing.reportDate || "—"}</td><td>{filing.accessionNumber}</td><td><a href={filing.sourceUrl} target="_blank" rel="noreferrer">Open filing ↗</a></td></tr>) : <tr><td colSpan={5}>No supported filing found</td></tr>}</tbody></table></div>
    <div className="sec-footer"><span>Fetched {new Date(snapshot.fetchedAt).toLocaleString("en-US")}</span><span>SEC facts are source evidence, not a buy/sell signal or investment advice.</span></div>
    {snapshot.warnings.length > 0 && <div className="sec-warning"><b>Data status</b><ul>{snapshot.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
  </section>;
}
