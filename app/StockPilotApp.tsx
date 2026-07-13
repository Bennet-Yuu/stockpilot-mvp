"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { stocks, tickerList, type Stock, type Ticker } from "./data";
import { calculateEvidenceScore, calculateReadiness } from "./domain/scoring";
import { summarizePortfolio } from "./domain/portfolio";
import type { ChecklistInput as Checklist, JournalRecord, TradeRecord as Trade, WatchlistRecord as WatchItem, WatchStatus, UserData } from "./domain/models";
import { marketDataProvider } from "./providers/marketData";
import { getBrowserStorage, readThemePreference, readUserData, writeThemePreference, writeUserData } from "./storage/userData";

type View = "dashboard" | "stock" | "watchlist" | "checklist" | "portfolio" | "journal" | "insights";

const nav: { id: View; label: string; glyph: string }[] = [
  {id:"dashboard",label:"Dashboard",glyph:"⌂"},{id:"watchlist",label:"Watchlist",glyph:"☆"},{id:"checklist",label:"Buy Checklist",glyph:"✓"},
  {id:"portfolio",label:"Paper Portfolio",glyph:"▦"},{id:"journal",label:"Trade Journal",glyph:"✎"},{id:"insights",label:"Insights",glyph:"⌁"},
];

const initialWatchlist: WatchItem[] = [
  {ticker:"NVDA",target:128,reason:"Wait for valuation to offer a wider margin of safety.",status:"Watching"},
  {ticker:"MSFT",target:420,reason:"Research Azure growth durability and AI capex returns.",status:"Researching"},
  {ticker:"AMZN",target:190,reason:"Watch AWS margin and retail operating leverage.",status:"Ready to Buy"},
];

const initialTrades: Trade[] = [
  {id:1,ticker:"AAPL",buyPrice:204.12,shares:12,date:"2026-05-08",target:245,maxLoss:12,thesis:"Services growth and durable cash flow can offset slower hardware cycles.",invalidation:"Services growth below 5% for two quarters.",holding:"6–12 months"},
  {id:2,ticker:"MSFT",buyPrice:425.30,shares:5,date:"2026-06-14",target:490,maxLoss:10,thesis:"Cloud and AI monetization can sustain double-digit earnings growth.",invalidation:"Azure growth falls below 20% without margin improvement.",holding:"1–3 years"},
  {id:3,ticker:"AMZN",buyPrice:198.40,shares:4,date:"2026-04-22",target:225,maxLoss:10,thesis:"AWS and ads improve consolidated margins.",invalidation:"AWS growth and margins decline together for two quarters.",holding:"6–12 months",closed:true,sellPrice:212.10},
];

const emptyChecklist: Checklist = {why:"",holding:"",invalidation:"",maxLoss:"",weight:"",driver:"",event:"",target:"",exit:""};

function Badge({children,tone="neutral"}:{children:React.ReactNode;tone?:"fact"|"input"|"inference"|"neutral"}) { return <span className={`badge ${tone}`}>{children}</span>; }
function Money({value}:{value:number}) { return <>{value.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2})}</>; }
type AppProps = { initialView?: View; initialTicker?: Ticker };

export default function StockPilotApp({ initialView = "dashboard", initialTicker = "AAPL" }: AppProps){
  const router = useRouter();
  const [view,setView]=useState<View>(initialView);
  const [ticker,setTicker]=useState<Ticker>(initialTicker);
  const [query,setQuery]=useState("");
  const [theme,setTheme]=useState<"light"|"dark">(()=>readThemePreference(getBrowserStorage()));
  const [boot] = useState<{data:UserData;hasSavedData:boolean;recovered:boolean}>(()=>{
    const defaults:UserData={version:1,watchlist:initialWatchlist,trades:initialTrades,checklistDrafts:{[initialTicker]:emptyChecklist},journals:{}};
    if(typeof window==="undefined") return {data:defaults,hasSavedData:false,recovered:false};
    const storage=getBrowserStorage();
    const stored=readUserData(storage);
    return {data:stored.hasSavedData?stored.data:defaults,hasSavedData:stored.hasSavedData,recovered:stored.recovered};
  });
  const [watchlist,setWatchlist]=useState<WatchItem[]>(boot.data.watchlist);
  const [trades,setTrades]=useState<Trade[]>(boot.data.trades);
  const [checklist,setChecklist]=useState<Checklist>(boot.data.checklistDrafts[initialTicker]??emptyChecklist);
  const [journals,setJournals]=useState<Record<string,JournalRecord>>(boot.data.journals);
  const [toast,setToast]=useState("");
  const [researchTab,setResearchTab]=useState<"snapshot"|"report">("snapshot");
  const [journalSaved,setJournalSaved]=useState(false);
  useEffect(()=>{
    const storage=getBrowserStorage();
    if(!boot.hasSavedData) writeUserData(boot.data,storage);
    if(boot.recovered) window.setTimeout(()=>setToast("Saved data was unreadable; demo data was restored"),0);
  },[boot]);
  useEffect(()=>{ document.documentElement.dataset.theme=theme; writeThemePreference(theme,getBrowserStorage()); },[theme]);
  useEffect(()=>{
    const storage=getBrowserStorage();
    const existing=readUserData(storage).data;
    writeUserData({...existing,version:1,watchlist,trades,checklistDrafts:{...existing.checklistDrafts,[ticker]:checklist},journals},storage);
  },[watchlist,trades,checklist,journals,ticker]);
  useEffect(()=>{ if(!toast)return; const timer=setTimeout(()=>setToast(""),2600); return()=>clearTimeout(timer); },[toast]);

  const cash=6000;
  const portfolio=summarizePortfolio(trades,stocks,cash);
  const activeTrades=portfolio.openTrades;
  const portfolioValue=portfolio.portfolioValue;
  const pnl=portfolio.unrealizedPnL;
  const searchResults=marketDataProvider.listSupportedTickers().filter(t=>`${t} ${stocks[t].name}`.toLowerCase().includes(query.toLowerCase()));

  const navigate=(next:View)=>{setView(next);const path=next==="dashboard"?"/":next==="stock"?`/stocks/${ticker}`:next==="checklist"?`/checklist/${ticker}`:next==="portfolio"?"/paper-trades":`/${next}`;router.push(path);window.scrollTo({top:0,behavior:"smooth"});};
  const openStock=(next:Ticker)=>{setTicker(next);setQuery("");setResearchTab("snapshot");setView("stock");router.push(`/stocks/${next}`);window.scrollTo({top:0,behavior:"smooth"});};
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={()=>navigate("dashboard")} aria-label="StockPilot dashboard"><span className="brand-mark">SP</span><span><strong>StockPilot</strong><small>Research with a process</small></span></button>
      <nav aria-label="Primary navigation">{nav.map(item=><button key={item.id} className={view===item.id?"active":""} onClick={()=>navigate(item.id)}><span>{item.glyph}</span>{item.label}</button>)}</nav>
      <div className="side-footer"><Badge tone="neutral">Demo workspace</Badge><p>Sample data only<br/>No brokerage connection</p></div>
    </aside>
    <main>
      <header className="topbar">
        <button className="mobile-brand" onClick={()=>navigate("dashboard")}><span className="brand-mark">SP</span></button>
        <div className="global-search">
          <span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search AAPL, MSFT, NVDA, AMZN, TSLA" aria-label="Search stocks" />
          {query&&<div className="search-popover">{searchResults.length?searchResults.map(t=><button key={t} onClick={()=>openStock(t)}><b>{t}</b><span>{stocks[t].name}</span><em><Money value={stocks[t].price}/></em></button>):<p>No supported demo ticker found.</p>}</div>}
        </div>
        <button className="icon-button" onClick={()=>setTheme(theme==="light"?"dark":"light")} aria-label="Toggle color theme">{theme==="light"?"☾":"☀"}</button>
        <div className="avatar" aria-label="Demo user">DW</div>
      </header>
      <div className="demo-banner"><span>●</span><strong>Demo mode</strong> — Prices, analysis, and transactions use sample data. Nothing here involves real money.</div>
      <div className="page-wrap">
        {view==="dashboard"&&<Dashboard portfolioValue={portfolioValue} pnl={pnl} activeTrades={activeTrades} watchlist={watchlist} openStock={openStock} navigate={navigate}/>} 
        {view==="stock"&&<StockDetail stock={stocks[ticker]} researchTab={researchTab} setResearchTab={setResearchTab} watchlist={watchlist} setWatchlist={setWatchlist} navigate={navigate} notify={setToast}/>} 
        {view==="watchlist"&&<Watchlist items={watchlist} setItems={setWatchlist} openStock={openStock}/>} 
        {view==="checklist"&&<BuyChecklist ticker={ticker} setTicker={setTicker} form={checklist} setForm={setChecklist} setTrades={setTrades} navigate={navigate} notify={setToast}/>} 
        {view==="portfolio"&&<Portfolio trades={trades} setTrades={setTrades} portfolioValue={portfolioValue} cash={cash} navigate={navigate} notify={setToast}/>} 
        {view==="journal"&&<Journal trades={trades} saved={journalSaved} setSaved={setJournalSaved} entries={journals} setEntries={setJournals}/>} 
        {view==="insights"&&<Insights/>}
      </div>
      <footer><p><strong>StockPilot is an educational research and paper-trading tool.</strong> It does not provide personalized investment advice or execute trades.<br/>Demo analysis based on sample data. Not investment advice.</p><p><Badge tone="fact">Source fact</Badge> Verify demo facts with original sources: <a href="https://www.sec.gov/edgar/search/" target="_blank" rel="noreferrer">SEC EDGAR</a> and company investor relations pages.</p></footer>
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{nav.slice(0,5).map(item=><button key={item.id} className={view===item.id?"active":""} onClick={()=>navigate(item.id)}><span>{item.glyph}</span><small>{item.label.replace("Paper ","").replace("Buy ","")}</small></button>)}</nav>
    {toast&&<div role="status" className="toast">✓ {toast}</div>}
  </div>;
}

function PageTitle({eyebrow,title,subtitle,action}:{eyebrow:string;title:string;subtitle:string;action?:React.ReactNode}){return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}

function Dashboard({portfolioValue,pnl,activeTrades,watchlist,openStock,navigate}:{portfolioValue:number;pnl:number;activeTrades:Trade[];watchlist:WatchItem[];openStock:(t:Ticker)=>void;navigate:(v:View)=>void}){
  const [heroQuery,setHeroQuery]=useState("");
  const results=tickerList.filter(t=>`${t} ${stocks[t].name}`.toLowerCase().includes(heroQuery.toLowerCase()));
  return <>
    <PageTitle eyebrow="Monday, July 13" title="Good morning, Demo Investor" subtitle="Stay focused on your process, not today’s noise."/>
    <section className="hero-search"><div><Badge tone="inference">START A RESEARCH PATH</Badge><h2>What company do you want to understand?</h2><p>Search a supported ticker to review facts, balanced analysis, and risk checks.</p></div><div className="hero-search-box"><span>⌕</span><input value={heroQuery} onChange={e=>setHeroQuery(e.target.value)} placeholder="Search by ticker or company" aria-label="Search a stock from dashboard"/>{heroQuery&&<div className="hero-results">{results.map(t=><button key={t} onClick={()=>openStock(t)}><b>{t}</b><span>{stocks[t].name}</span><em>View research →</em></button>)}</div>}</div><div className="quick-tickers">Popular in demo: {tickerList.map(t=><button key={t} onClick={()=>openStock(t)}>{t}</button>)}</div></section>
    <div className="metric-grid">
      <Metric label="Paper portfolio" value={<Money value={portfolioValue}/>} delta={`+$${pnl.toFixed(2)} unrealized`} />
      <Metric label="Total return" value={`+${(pnl/Math.max(1,portfolioValue-pnl)*100).toFixed(2)}%`} delta="Since first paper trade" />
      <Metric label="Open positions" value={String(activeTrades.length)} delta="Within your 5-position limit" />
      <Metric label="Watchlist" value={String(watchlist.length)} delta={`${watchlist.filter(w=>w.status==="Ready to Buy").length} ready for checklist`} />
    </div>
    <div className="two-col dashboard-lower">
      <section className="card"><div className="section-head"><div><p className="eyebrow">PAPER PORTFOLIO</p><h2>Open positions</h2></div><button className="text-button" onClick={()=>navigate("portfolio")}>View portfolio →</button></div><div className="table-wrap"><table><thead><tr><th>Company</th><th>Value</th><th>Return</th><th>Thesis status</th></tr></thead><tbody>{activeTrades.map(t=>{const current=stocks[t.ticker].price*t.shares;const ret=(stocks[t.ticker].price/t.buyPrice-1)*100;return <tr key={t.id} onClick={()=>openStock(t.ticker)}><td><TickerCell ticker={t.ticker}/></td><td><Money value={current}/></td><td className={ret>=0?"positive":"negative"}>{ret>=0?"+":""}{ret.toFixed(1)}%</td><td><Badge tone="inference">On track</Badge></td></tr>})}</tbody></table></div></section>
      <section className="card decisions"><div className="section-head"><div><p className="eyebrow">NEXT ACTIONS</p><h2>Decision queue</h2></div><span className="count">3</span></div><button onClick={()=>navigate("checklist")}><span className="decision-icon">✓</span><span><b>Complete AMZN buy checklist</b><small>2 risk questions remain</small></span><em>→</em></button><button onClick={()=>openStock("NVDA")}><span className="decision-icon">⌁</span><span><b>Review NVDA valuation</b><small>Target watch price: $128.00</small></span><em>→</em></button><button onClick={()=>navigate("journal")}><span className="decision-icon">✎</span><span><b>Reflect on closed AMZN trade</b><small>Journal entry is incomplete</small></span><em>→</em></button></section>
    </div>
    <section className="principle"><span>i</span><div><b>Process reminder</b><p>A rising price is not a thesis. Before creating a paper trade, write down what would prove your reasoning wrong.</p></div></section>
  </>;
}

function Metric({label,value,delta}:{label:string;value:React.ReactNode;delta:string}){return <section className="metric card"><p>{label}</p><h2>{value}</h2><small>{delta}</small></section>}
function TickerCell({ticker}:{ticker:Ticker}){return <div className="ticker-cell"><span>{ticker.slice(0,1)}</span><div><b>{ticker}</b><small>{stocks[ticker].name}</small></div></div>}

function StockDetail({stock,researchTab,setResearchTab,watchlist,setWatchlist,navigate,notify}:{stock:Stock;researchTab:"snapshot"|"report";setResearchTab:(v:"snapshot"|"report")=>void;watchlist:WatchItem[];setWatchlist:React.Dispatch<React.SetStateAction<WatchItem[]>>;navigate:(v:View)=>void;notify:(s:string)=>void}){
  const score=calculateEvidenceScore(stock); const watched=watchlist.some(w=>w.ticker===stock.ticker);
  const investorRelations:Record<Ticker,string>={AAPL:"https://investor.apple.com/",MSFT:"https://www.microsoft.com/en-us/Investor",NVDA:"https://investor.nvidia.com/",AMZN:"https://ir.aboutamazon.com/",TSLA:"https://ir.tesla.com/"};
  const add=()=>{if(!watched)setWatchlist(items=>[...items,{ticker:stock.ticker,target:Math.round(stock.price*.92),reason:"Research the business and wait for a better entry.",status:"Researching"}]);notify(watched?"Already on your watchlist":"Added to watchlist")};
  return <>
    <div className="stock-heading"><div className="stock-identity"><span>{stock.ticker.slice(0,1)}</span><div><div><h1>{stock.ticker}</h1><Badge tone="fact">SAMPLE MARKET DATA</Badge></div><p>{stock.name} · {stock.sector}</p></div></div><div className="stock-price"><h2><Money value={stock.price}/></h2><p className={stock.change>=0?"positive":"negative"}>{stock.change>=0?"+":""}{stock.change.toFixed(2)}% today</p></div><div className="stock-actions"><button className="secondary" onClick={add}>{watched?"✓ On Watchlist":"☆ Add to Watchlist"}</button><button className="primary" onClick={()=>navigate("checklist")}>Start Buy Checklist →</button></div></div>
    <div className="tabbar"><button className={researchTab==="snapshot"?"active":""} onClick={()=>setResearchTab("snapshot")}>Research Snapshot</button><button className={researchTab==="report"?"active":""} onClick={()=>setResearchTab("report")}>Full Research Report</button></div>
    {researchTab==="snapshot"?<>
      <section className="card score-card"><div className="score-total"><p className="eyebrow">RESEARCH EVIDENCE SCORE</p><div className="score-ring" style={{"--score":`${score*3.6}deg`} as React.CSSProperties}><span><b>{score}</b><small>/100</small></span></div><h2>{score>=80?"Evidence is broadly supportive":"Evidence is mixed"}</h2><p>This is a deterministic evidence score, not a price forecast or buy signal.</p><div className="legend"><Badge tone="fact">Source fact</Badge><Badge tone="inference">System calculation</Badge></div></div><div className="score-breakdown">{stock.scores.map(s=><div key={s.label}><div className="score-line"><b>{s.label}</b><span>{s.value} / {s.max}</span></div><div className="progress"><i style={{width:`${s.value/s.max*100}%`}}/></div><p>{s.explanation}</p></div>)}</div></section>
      <div className="two-col stock-grid"><section className="card"><div className="section-head"><div><p className="eyebrow">12-MONTH SAMPLE</p><h2>Price trend</h2></div><Badge tone="fact">Delayed demo</Badge></div><PriceTrendChart stock={stock}/></section><section className="card company-about"><p className="eyebrow">BUSINESS OVERVIEW</p><h2>What the company does</h2><p>{stock.description}</p><button className="text-button" onClick={()=>setResearchTab("report")}>Read full structured report →</button></section></div>
      <section className="card"><div className="section-head"><div><p className="eyebrow">FUNDAMENTALS</p><h2>Key metrics</h2></div><Badge tone="fact">Sample provider facts</Badge></div><div className="fundamentals">{[["Market cap",stock.marketCap],["P/E",stock.pe],["Forward P/E",stock.forwardPe],["Revenue growth",stock.growth],["Net margin",stock.margin],["Free cash flow",stock.fcf],["52-week high",`$${stock.high}`],["52-week low",`$${stock.low}`]].map(([k,v])=><div key={k}><small>{k}</small><b>{v}</b></div>)}</div><div className="source-links"><div><Badge tone="fact">Original sources</Badge><p>Use primary documents to verify all demo facts before making a real-world decision.</p></div><a href="https://www.sec.gov/edgar/search/" target="_blank" rel="noreferrer">SEC EDGAR ↗</a><a href={investorRelations[stock.ticker]} target="_blank" rel="noreferrer">Company investor relations ↗</a></div></section>
    </>:<ResearchReport stock={stock}/>} 
  </>;
}

function PriceTrendChart({stock}:{stock:Stock}){
  const data=stock.prices.map((price,index)=>({month:["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul"][index]??String(index+1),price}));
  return <div className="recharts-shell" role="img" aria-label={`${stock.ticker} 12-month sample price trend`}><ResponsiveContainer width="100%" height={230}><LineChart data={data} margin={{top:18,right:12,left:0,bottom:0}}><XAxis dataKey="month" tick={{fontSize:9,fill:"var(--muted)"}} axisLine={{stroke:"var(--line)"}} tickLine={false}/><YAxis domain={["dataMin","dataMax"]} tick={{fontSize:9,fill:"var(--muted)"}} axisLine={false} tickLine={false} width={38}/><Tooltip contentStyle={{background:"var(--nav)",border:0,borderRadius:8,color:"#fff",fontSize:10}} formatter={(value)=>[`$${Number(value).toFixed(2)}`,"Sample price"]}/><Line type="monotone" dataKey="price" stroke="var(--brand)" strokeWidth={2.5} dot={{r:2.5,fill:"var(--brand)",strokeWidth:0}} activeDot={{r:4}}/></LineChart></ResponsiveContainer></div>;
}

function ResearchReport({stock}:{stock:Stock}){return <><section className="report-disclaimer"><b>Demo analysis based on sample data. Not investment advice.</b><p>Balanced scenarios below are system-generated for product demonstration and require independent verification.</p></section><div className="report-layout"><aside className="report-index"><p>IN THIS REPORT</p>{stock.report.map((r,i)=><a href={`#report-${i}`} key={r.title}>{String(i+1).padStart(2,"0")} {r.title}</a>)}</aside><article className="report-content">{stock.report.map((r,i)=><section className={`report-section ${r.title==="Bull Case"?"bull":r.title==="Bear Case"?"bear":""}`} id={`report-${i}`} key={r.title}><span>{String(i+1).padStart(2,"0")}</span><div><h2>{r.title}</h2>{(r.title==="Bull Case"||r.title==="Bear Case")&&<Badge tone="inference">Scenario, not forecast</Badge>}<p>{r.body}</p></div></section>)}</article></div></>}

function Watchlist({items,setItems,openStock}:{items:WatchItem[];setItems:React.Dispatch<React.SetStateAction<WatchItem[]>>;openStock:(t:Ticker)=>void}){
  return <><PageTitle eyebrow="IDEA PIPELINE" title="Watchlist" subtitle="Keep curiosity separate from commitment. A watchlist entry is not a recommendation." action={<button className="secondary" onClick={()=>openStock("AAPL")}>＋ Add a stock</button>}/><section className="card"><div className="table-wrap"><table className="watch-table"><thead><tr><th>Company</th><th>Sample price</th><th>Target watch price</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>{items.map((item,index)=><tr key={item.ticker}><td onClick={()=>openStock(item.ticker)}><TickerCell ticker={item.ticker}/></td><td><Money value={stocks[item.ticker].price}/><small className={stocks[item.ticker].change>=0?"positive":"negative"}>{stocks[item.ticker].change>=0?"+":""}{stocks[item.ticker].change}%</small></td><td><label className="inline-money">$<input type="number" value={item.target} onChange={e=>setItems(old=>old.map((x,i)=>i===index?{...x,target:Number(e.target.value)}:x))}/></label></td><td><input className="inline-input" value={item.reason} onChange={e=>setItems(old=>old.map((x,i)=>i===index?{...x,reason:e.target.value}:x))}/></td><td><select value={item.status} onChange={e=>setItems(old=>old.map((x,i)=>i===index?{...x,status:e.target.value as WatchStatus}:x))}><option>Researching</option><option>Watching</option><option>Ready to Buy</option><option>Avoiding</option></select></td><td><button className="ghost" aria-label={`Remove ${item.ticker}`} onClick={()=>setItems(old=>old.filter(x=>x.ticker!==item.ticker))}>×</button></td></tr>)}</tbody></table></div></section><section className="principle"><span>i</span><div><b>About target watch prices</b><p>This is a user-entered reminder, not an automated signal. Recheck the business and valuation before creating any paper trade.</p></div></section></>;
}

function BuyChecklist({ticker,setTicker,form,setForm,setTrades,navigate,notify}:{ticker:Ticker;setTicker:(t:Ticker)=>void;form:Checklist;setForm:React.Dispatch<React.SetStateAction<Checklist>>;setTrades:React.Dispatch<React.SetStateAction<Trade[]>>;navigate:(v:View)=>void;notify:(s:string)=>void}){
  const set=(key:keyof Checklist,value:string)=>setForm(old=>({...old,[key]:value}));
  const readiness=calculateReadiness(form); const {score,completedCount:complete,warnings}=readiness;
  const create=(e:FormEvent)=>{e.preventDefault();if(score<60){notify("Reach a readiness score of 60 before creating a trade");return;}setTrades(old=>[...old,{id:Date.now(),ticker,buyPrice:stocks[ticker].price,shares:1,date:"2026-07-13",target:Number(form.target)||stocks[ticker].price*1.15,maxLoss:Number(form.maxLoss)||10,thesis:form.why,invalidation:form.invalidation,holding:form.holding}]);notify("Paper trade created with 1 sample share");navigate("portfolio")};
  return <><PageTitle eyebrow="DECISION CHECK" title="Buy Checklist" subtitle="Slow the decision down. Write a falsifiable thesis before you simulate a position."/><div className="checklist-layout"><form className="card checklist-form" onSubmit={create}><div className="section-head"><div><p className="eyebrow">USER INPUT</p><h2>Investment plan</h2></div><select value={ticker} onChange={e=>setTicker(e.target.value as Ticker)}>{tickerList.map(t=><option key={t}>{t}</option>)}</select></div><Field label="1. Why am I buying this stock?" hint="Use business evidence, not a price prediction."><textarea value={form.why} onChange={e=>set("why",e.target.value)} placeholder="I believe… because…"/></Field><div className="form-row"><Field label="2. Expected holding period"><select value={form.holding} onChange={e=>set("holding",e.target.value)}><option value="">Select period</option><option>Under 3 months</option><option>3–6 months</option><option>6–12 months</option><option>1–3 years</option><option>3+ years</option></select></Field><Field label="3. Maximum acceptable loss"><div className="suffix-input"><input type="number" value={form.maxLoss} onChange={e=>set("maxLoss",e.target.value)} placeholder="10"/><span>%</span></div></Field></div><Field label="4. What would prove my thesis wrong?" hint="Make this observable and specific."><textarea value={form.invalidation} onChange={e=>set("invalidation",e.target.value)} placeholder="My thesis is invalid if…"/></Field><div className="form-row"><Field label="5. Portfolio allocation"><div className="suffix-input"><input type="number" value={form.weight} onChange={e=>set("weight",e.target.value)} placeholder="8"/><span>%</span></div></Field><Field label="6. Primary buying driver"><select value={form.driver} onChange={e=>set("driver",e.target.value)}><option value="">Select driver</option><option>Fundamentals</option><option>Recent price movement</option><option>Both</option></select></Field></div><div className="form-row"><Field label="7. Earnings or major event approaching?"><select value={form.event} onChange={e=>set("event",e.target.value)}><option value="">Select answer</option><option>Yes</option><option>No</option><option>Not sure</option></select></Field><Field label="8. Target price"><div className="prefix-input"><span>$</span><input type="number" value={form.target} onChange={e=>set("target",e.target.value)} placeholder={String(Math.round(stocks[ticker].price*1.15))}/></div></Field></div><Field label="9. What is my exit plan?"><textarea value={form.exit} onChange={e=>set("exit",e.target.value)} placeholder="I will exit or reassess when…"/></Field><button className="primary full" type="submit">Create Paper Trade →</button></form><aside className="checklist-side"><section className="card readiness"><p className="eyebrow">SYSTEM CALCULATION</p><div className="readiness-number"><b>{score}</b><span>/100</span></div><h2>{score>=80?"Ready for paper trade":score>=60?"Proceed with caution":"Needs more thought"}</h2><div className="progress large"><i style={{width:`${score}%`}}/></div><p>{complete} of 9 prompts completed. Score rewards completeness, falsifiability, and conservative risk limits.</p></section><section className={`card warnings ${warnings.length?"has-warnings":""}`}><p className="eyebrow">RISK CHECKS</p><h2>{warnings.length?`${warnings.length} item${warnings.length>1?"s":""} to review`:"No active warnings"}</h2>{warnings.length?<ul>{warnings.map(w=><li key={w.code}>{w.message}</li>)}</ul>:<p>Your current inputs are within the prototype guardrails.</p>}</section><section className="card data-key"><h3>Data clarity</h3><p><Badge tone="fact">Fact</Badge> Sample company metrics</p><p><Badge tone="input">Your input</Badge> Thesis and risk limits</p><p><Badge tone="inference">System</Badge> Score and warnings</p></section></aside></div></>;
}

function Field({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}){return <label className="field"><b>{label}</b>{hint&&<small>{hint}</small>}{children}</label>}

function Portfolio({trades,setTrades,portfolioValue,cash,navigate,notify}:{trades:Trade[];setTrades:React.Dispatch<React.SetStateAction<Trade[]>>;portfolioValue:number;cash:number;navigate:(v:View)=>void;notify:(s:string)=>void}){
  const active=trades.filter(t=>!t.closed);const cost=active.reduce((s,t)=>s+t.buyPrice*t.shares,0);const value=active.reduce((s,t)=>s+stocks[t.ticker].price*t.shares,0);const pnl=value-cost;
  const close=(id:number)=>{setTrades(old=>old.map(t=>t.id===id?{...t,closed:true,sellPrice:stocks[t.ticker].price}:t));notify("Paper position closed — add your reflection next");setTimeout(()=>navigate("journal"),600)};
  return <><PageTitle eyebrow="NO REAL FUNDS" title="Paper Portfolio" subtitle="Track decisions and outcomes without connecting a brokerage account." action={<button className="primary" onClick={()=>navigate("checklist")}>＋ New paper trade</button>}/><div className="metric-grid"><Metric label="Portfolio value" value={<Money value={portfolioValue}/>} delta={`Includes $${cash.toLocaleString()} sample cash`}/><Metric label="Invested capital" value={<Money value={cost}/>} delta={`${active.length} open positions`}/><Metric label="Unrealized P/L" value={<><span className={pnl>=0?"positive":"negative"}>{pnl>=0?"+":""}<Money value={pnl}/></span></>} delta={`${(pnl/Math.max(cost,1)*100).toFixed(2)}% on invested capital`}/><Metric label="Cash available" value={<Money value={cash}/>} delta={`${(cash/portfolioValue*100).toFixed(1)}% portfolio weight`}/></div><section className="card"><div className="section-head"><div><p className="eyebrow">OPEN PAPER TRADES</p><h2>Positions</h2></div><Badge tone="input">User-created records</Badge></div><div className="table-wrap"><table><thead><tr><th>Company</th><th>Cost basis</th><th>Current value</th><th>Return</th><th>Weight</th><th>Risk plan</th><th></th></tr></thead><tbody>{active.map(t=>{const current=stocks[t.ticker].price*t.shares;const ret=(stocks[t.ticker].price/t.buyPrice-1)*100;return <tr key={t.id}><td><TickerCell ticker={t.ticker}/><small>{t.shares} shares · {t.date}</small></td><td><Money value={t.buyPrice*t.shares}/><small>${t.buyPrice.toFixed(2)} / share</small></td><td><Money value={current}/><small>${stocks[t.ticker].price.toFixed(2)} / share</small></td><td className={ret>=0?"positive":"negative"}>{ret>=0?"+":""}{ret.toFixed(2)}%</td><td>{(current/portfolioValue*100).toFixed(1)}%</td><td><small>Target ${t.target.toFixed(0)}<br/>Max loss {t.maxLoss}%</small></td><td><button className="secondary compact" onClick={()=>close(t.id)}>Close & reflect</button></td></tr>})}</tbody></table></div></section><section className="card thesis-list"><p className="eyebrow">THESIS MONITOR</p><h2>What must remain true</h2>{active.map(t=><div key={t.id}><TickerCell ticker={t.ticker}/><p>{t.thesis}</p><span><b>Invalidation:</b> {t.invalidation}</span></div>)}</section></>;
}

function Journal({trades,saved,setSaved,entries,setEntries}:{trades:Trade[];saved:boolean;setSaved:(v:boolean)=>void;entries:Record<string,JournalRecord>;setEntries:React.Dispatch<React.SetStateAction<Record<string,JournalRecord>>>}){
  const closed=trades.filter(t=>t.closed);const [selected,setSelected]=useState(closed[closed.length-1]?.id||0);
  const existing=entries[String(selected)];
  const errors=["Chasing momentum","Oversized position","Trading before earnings","No clear exit plan","Holding a broken thesis","Selling winners too early","Averaging down without evidence","Emotional decision","Poor research"];
  const save=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const formData=new FormData(event.currentTarget);setEntries(old=>({...old,[String(selected)]:{tradeId:selected,buyReason:String(formData.get("buyReason")??""),sellReason:String(formData.get("sellReason")??""),emotionalState:String(formData.get("emotionalState")??""),whatWentWell:String(formData.get("whatWentWell")??""),whatWentWrong:String(formData.get("whatWentWrong")??""),thesisCorrect:String(formData.get("thesisCorrect")??""),processCorrect:String(formData.get("processCorrect")??""),lessonsLearned:String(formData.get("lessonsLearned")??""),mistakeCategories:formData.getAll("mistakeCategories").map(String)}}));setSaved(true)};
  return <><PageTitle eyebrow="LEARN FROM THE PROCESS" title="Trade Journal" subtitle="Separate a good outcome from a good decision. Both deserve an honest review."/><div className="journal-layout"><aside className="card trade-selector"><p className="eyebrow">CLOSED TRADES</p>{closed.map(t=><button key={t.id} className={selected===t.id?"active":""} onClick={()=>{setSelected(t.id);setSaved(Boolean(entries[String(t.id)]))}}><TickerCell ticker={t.ticker}/><span className={(t.sellPrice||0)>=t.buyPrice?"positive":"negative"}>{(((t.sellPrice||0)/t.buyPrice-1)*100).toFixed(1)}%</span></button>)}</aside><form className="card journal-form" onSubmit={save}><div className="section-head"><div><p className="eyebrow">USER REFLECTION</p><h2>Post-trade review</h2></div><Badge tone="input">Private to this device</Badge></div><div className="form-row"><Field label="Buy reason"><textarea name="buyReason" defaultValue={existing?.buyReason??"I expected cloud margin improvement and stronger operating leverage."}/></Field><Field label="Sell reason"><textarea name="sellReason" defaultValue={existing?.sellReason??""} placeholder="Why did you close the position?"/></Field></div><div className="form-row"><Field label="Emotional state"><select name="emotionalState" defaultValue={existing?.emotionalState??"Calm"}><option>Calm</option><option>Confident</option><option>Anxious</option><option>Fearful</option><option>Impulsive</option></select></Field><Field label="Was the original thesis correct?"><select name="thesisCorrect" defaultValue={existing?.thesisCorrect??"Mostly"}><option>Yes</option><option>Mostly</option><option>No</option><option>Too early to know</option></select></Field></div><div className="form-row"><Field label="What went well"><textarea name="whatWentWell" defaultValue={existing?.whatWentWell??""} placeholder="Evidence, sizing, patience…"/></Field><Field label="What went wrong"><textarea name="whatWentWrong" defaultValue={existing?.whatWentWrong??""} placeholder="Research gaps, timing, behavior…"/></Field></div><Field label="Was the process correct?"><div className="radio-row"><label><input type="radio" name="processCorrect" value="Yes" defaultChecked={existing?.processCorrect==="Yes"||!existing}/> Yes</label><label><input type="radio" name="processCorrect" value="Partly" defaultChecked={existing?.processCorrect==="Partly"}/> Partly</label><label><input type="radio" name="processCorrect" value="No" defaultChecked={existing?.processCorrect==="No"}/> No</label></div></Field><Field label="Mistakes to tag"><div className="chip-grid">{errors.map(err=><label key={err}><input type="checkbox" name="mistakeCategories" value={err} defaultChecked={existing?.mistakeCategories.includes(err)}/><span>{err}</span></label>)}</div></Field><Field label="Lessons learned"><textarea name="lessonsLearned" defaultValue={existing?.lessonsLearned??""} placeholder="Next time, I will…"/></Field><button className="primary full" type="submit">{saved?"✓ Reflection saved":"Save reflection"}</button></form></div></>;
}

function Insights(){return <><PageTitle eyebrow="SAMPLE JOURNAL ANALYSIS" title="Insights" subtitle="Patterns from 12 simulated closed trades. Useful for reflection, not prediction."/><div className="metric-grid"><Metric label="Win rate" value="58%" delta="7 of 12 paper trades"/><Metric label="Average gain" value="+12.4%" delta="Among winning trades"/><Metric label="Average loss" value="−7.1%" delta="Among losing trades"/><Metric label="Profit factor" value="1.72×" delta="Gross gains ÷ gross losses"/></div><div className="two-col insights-grid"><section className="card"><div className="section-head"><div><p className="eyebrow">HOLDING PERIOD</p><h2>Performance by duration</h2></div><Badge tone="inference">System summary</Badge></div><div className="horizontal-chart">{[["Under 3 months",-2.4],["3–6 months",4.8],["6–12 months",11.6],["1+ years",16.2]].map(([name,val])=><div key={String(name)}><span>{name}</span><div><i className={Number(val)<0?"loss":""} style={{width:`${Math.abs(Number(val))*4}%`}}/></div><b className={Number(val)<0?"negative":"positive"}>{Number(val)>0?"+":""}{val}%</b></div>)}</div></section><section className="card"><div className="section-head"><div><p className="eyebrow">POSITION SIZE</p><h2>Performance by allocation</h2></div><Badge tone="inference">System summary</Badge></div><div className="horizontal-chart">{[["Under 5%",8.3],["5–10%",13.7],["10–20%",4.1],["Over 20%",-9.2]].map(([name,val])=><div key={String(name)}><span>{name}</span><div><i className={Number(val)<0?"loss":""} style={{width:`${Math.abs(Number(val))*4}%`}}/></div><b className={Number(val)<0?"negative":"positive"}>{Number(val)>0?"+":""}{val}%</b></div>)}</div></section></div><div className="two-col insight-cards"><section className="card best"><p className="eyebrow">BEST-PERFORMING PROCESS</p><span>01</span><h2>Quality growth, held 6–12 months</h2><p>Average sample return: <b>+14.8%</b> across 4 paper trades.</p></section><section className="card mistake"><p className="eyebrow">MOST COMMON MISTAKE</p><span>!</span><h2>Chasing momentum</h2><p>Tagged in <b>4 of 12</b> reflections, with an average sample return of −3.6%.</p></section></div><section className="principle"><span>i</span><div><b>Small sample warning</b><p>Twelve simulated trades are not statistically reliable. Use these patterns to ask better questions, not to forecast future returns.</p></div></section></>}
