export type Ticker = "AAPL" | "MSFT" | "NVDA" | "AMZN" | "TSLA";

export type Stock = {
  ticker: Ticker; name: string; sector: string; price: number; change: number;
  marketCap: string; pe: string; forwardPe: string; growth: string; margin: string;
  fcf: string; high: number; low: number; description: string; prices: number[];
  scores: { label: string; value: number; max: number; explanation: string }[];
  report: { title: string; body: string }[];
};

export const stocks: Record<Ticker, Stock> = {
  AAPL: {
    ticker: "AAPL", name: "Apple Inc.", sector: "Consumer Technology", price: 228.14, change: 0.84,
    marketCap: "$3.41T", pe: "34.7×", forwardPe: "30.9×", growth: "+6.1%", margin: "24.3%", fcf: "$108.7B", high: 237.49, low: 164.08,
    description: "Apple designs consumer devices and software, and operates a growing services ecosystem spanning payments, cloud, media, and warranties.",
    prices: [171,178,184,189,193,187,196,204,211,208,219,228],
    scores: [
      {label:"Financial Quality",value:27,max:30,explanation:"Strong free cash flow, durable margins, and a net cash-rich balance sheet."},
      {label:"Growth",value:16,max:25,explanation:"Services are growing, while hardware revenue remains mature and cyclical."},
      {label:"Valuation",value:11,max:20,explanation:"Premium multiple versus its history leaves limited room for disappointment."},
      {label:"Risk",value:11,max:15,explanation:"Brand strength offsets supply-chain, regulation, and China concentration risks."},
      {label:"Momentum",value:8,max:10,explanation:"Price remains above its sample 6- and 12-month trend levels."},
    ],
    report: [
      {title:"Company Overview",body:"Apple combines premium hardware, an installed base of active devices, and recurring services. Its ecosystem increases switching costs and supports pricing power."},
      {title:"How the Company Makes Money",body:"The iPhone remains the largest revenue source. Mac, iPad, Wearables, and Services diversify the mix; Services typically carries higher gross margins."},
      {title:"Bull Scenario",body:"Scenario, not forecast: Services mix expansion, device upgrades, and disciplined capital returns could support durable per-share growth. Sample content; verify independently."},
      {title:"Bear Scenario",body:"Scenario, not forecast: a mature smartphone market, App Store regulation, and weaker demand in Greater China could pressure growth and margins."},
      {title:"Key Risks",body:"Supply-chain concentration, platform regulation, premium-device demand sensitivity, foreign exchange, and dependence on iPhone economics."},
      {title:"Potential Catalysts",body:"Sample items include the next product cycle, Services growth, developer announcements, and capital-return updates."},
      {title:"Valuation Context",body:"The sample forward P/E is above Apple’s long-run market premium and assumes resilient margins and continued per-share growth."},
      {title:"Thesis Invalidation",body:"The scenario weakens with sustained installed-base contraction, material Services margin erosion, or prolonged free-cash-flow decline."},
      {title:"Further Research Questions",body:"How durable is Services growth by geography? Can AI investment affect upgrades? How exposed are App Store economics to regulatory remedies?"},
    ]
  },
  MSFT: {
    ticker:"MSFT",name:"Microsoft Corporation",sector:"Software & Cloud",price:447.23,change:1.18,marketCap:"$3.32T",pe:"36.2×",forwardPe:"31.4×",growth:"+16.0%",margin:"35.6%",fcf:"$74.1B",high:468.35,low:344.77,
    description:"Microsoft sells productivity software, cloud infrastructure, operating systems, developer tools, gaming, and business applications.",prices:[350,361,372,384,401,416,408,421,432,439,442,447],
    scores:[{label:"Financial Quality",value:29,max:30,explanation:"High recurring revenue, strong margins, and exceptional cash generation."},{label:"Growth",value:22,max:25,explanation:"Azure and AI services support double-digit sample revenue growth."},{label:"Valuation",value:12,max:20,explanation:"High quality is reflected in a premium forward earnings multiple."},{label:"Risk",value:12,max:15,explanation:"Diversification helps, but cloud competition and AI capex create execution risk."},{label:"Momentum",value:9,max:10,explanation:"Broadly positive 12-month sample trend with limited drawdowns."}],
    report:[]
  },
  NVDA: {
    ticker:"NVDA",name:"NVIDIA Corporation",sector:"Semiconductors",price:138.85,change:-1.32,marketCap:"$3.40T",pe:"54.8×",forwardPe:"36.1×",growth:"+94.0%",margin:"55.0%",fcf:"$60.9B",high:152.89,low:45.01,
    description:"NVIDIA designs accelerated computing platforms, including GPUs, networking, systems, and software used in AI data centers and other markets.",prices:[48,56,63,72,84,91,104,116,126,142,147,139],
    scores:[{label:"Financial Quality",value:28,max:30,explanation:"Very high margins and cash conversion in the sample period."},{label:"Growth",value:25,max:25,explanation:"Exceptional AI infrastructure demand drives sample revenue growth."},{label:"Valuation",value:9,max:20,explanation:"Expectations remain demanding despite rapid earnings growth."},{label:"Risk",value:8,max:15,explanation:"Customer concentration, export controls, and cyclicality raise risk."},{label:"Momentum",value:9,max:10,explanation:"Strong 12-month trend, with recent sample volatility."}],report:[]
  },
  AMZN: {
    ticker:"AMZN",name:"Amazon.com, Inc.",sector:"Commerce & Cloud",price:205.71,change:0.42,marketCap:"$2.16T",pe:"43.1×",forwardPe:"34.6×",growth:"+11.0%",margin:"9.2%",fcf:"$47.7B",high:212.25,low:139.52,
    description:"Amazon operates global e-commerce marketplaces, logistics, advertising, subscriptions, and AWS cloud infrastructure.",prices:[142,148,153,159,166,174,169,181,188,196,201,206],
    scores:[{label:"Financial Quality",value:24,max:30,explanation:"Improving cash flow and scale, with lower consolidated margins than software peers."},{label:"Growth",value:20,max:25,explanation:"AWS and advertising add faster-growing, higher-margin revenue."},{label:"Valuation",value:12,max:20,explanation:"Earnings multiple is elevated but cash flow is improving."},{label:"Risk",value:10,max:15,explanation:"Retail intensity, regulation, and cloud competition remain material."},{label:"Momentum",value:8,max:10,explanation:"Consistent upward sample trend over the last year."}],report:[]
  },
  TSLA: {
    ticker:"TSLA",name:"Tesla, Inc.",sector:"Automotive & Energy",price:251.44,change:-2.14,marketCap:"$807B",pe:"68.5×",forwardPe:"74.2×",growth:"+2.3%",margin:"7.4%",fcf:"$3.6B",high:299.29,low:138.80,
    description:"Tesla designs electric vehicles, energy storage products, charging infrastructure, and related software and services.",prices:[240,226,213,198,176,184,201,219,232,268,261,251],
    scores:[{label:"Financial Quality",value:19,max:30,explanation:"Positive cash flow, but automotive margin compression reduces quality."},{label:"Growth",value:14,max:25,explanation:"Energy is growing faster while vehicle deliveries have slowed in sample data."},{label:"Valuation",value:6,max:20,explanation:"Valuation depends heavily on long-duration growth assumptions."},{label:"Risk",value:6,max:15,explanation:"Competition, key-person exposure, demand, and execution risks are elevated."},{label:"Momentum",value:6,max:10,explanation:"Recovery from sample lows, but trend remains volatile."}],report:[]
  },
};

const reports:Record<Exclude<Ticker,"AAPL">,Array<{title:string;body:string}>>={
  MSFT:[
    {title:"Company Overview",body:"Microsoft combines enterprise software, Azure cloud infrastructure, Windows, security, developer tools, gaming, and business applications. Sample content; verify independently."},
    {title:"How the Company Makes Money",body:"Commercial subscriptions, Azure consumption, server products, Windows licensing, advertising, devices, and gaming create a diversified mix with substantial recurring revenue."},
    {title:"Bull Scenario",body:"Scenario, not forecast: Azure demand and paid AI features could sustain growth while recurring software revenue supports margins."},
    {title:"Bear Scenario",body:"Scenario, not forecast: AI infrastructure spending could rise faster than monetization, while cloud competition or slower enterprise budgets pressure returns."},
    {title:"Key Risks",body:"Cloud competition, cybersecurity failures, antitrust scrutiny, large capital commitments, and dependence on enterprise technology budgets require independent verification."},
    {title:"Potential Catalysts",body:"Sample items include Azure growth disclosures, Copilot adoption evidence, margin trends, security execution, and capital-spending guidance."},
    {title:"Valuation Context",body:"The sample forward multiple assumes durable double-digit earnings growth. Compare cash generation with the scale and timing of AI investment."},
    {title:"Thesis Invalidation",body:"The scenario weakens if Azure growth decelerates materially while AI capital intensity rises without measurable revenue or margin benefits."},
    {title:"Further Research Questions",body:"How much Copilot revenue is incremental? What is the useful life of AI infrastructure? Are security investments improving customer retention?"}],
  NVDA:[
    {title:"Company Overview",body:"NVIDIA supplies accelerated-computing chips, systems, networking, and software ecosystems. Sample content; verify independently."},
    {title:"How the Company Makes Money",body:"Data-center compute and networking dominate the sample mix, supplemented by gaming, visualization, automotive, and software-related revenue."},
    {title:"Bull Scenario",body:"Scenario, not forecast: expanding AI workloads and a broad software ecosystem could support demand beyond the initial training buildout."},
    {title:"Bear Scenario",body:"Scenario, not forecast: customers could digest capacity, develop alternatives, or shift workloads while export limits constrain accessible markets."},
    {title:"Key Risks",body:"Customer concentration, supply dependencies, export controls, rapid product cycles, custom silicon, and semiconductor cyclicality require verification."},
    {title:"Potential Catalysts",body:"Sample items include architecture launches, supply availability, inference demand, networking attachment, and customer capital-spending plans."},
    {title:"Valuation Context",body:"The sample multiple reflects exceptional growth and leaves sensitivity to normalization. Review earnings durability under lower growth assumptions."},
    {title:"Thesis Invalidation",body:"The scenario weakens if data-center demand and margins decline together for multiple periods without broader software or inference adoption."},
    {title:"Further Research Questions",body:"How concentrated is demand by customer? What share is training versus inference? How durable is the software moat versus custom accelerators?"}],
  AMZN:[
    {title:"Company Overview",body:"Amazon operates commerce, logistics, AWS cloud infrastructure, advertising, and subscription services. Sample content; verify independently."},
    {title:"How the Company Makes Money",body:"Retail generates scale and customer traffic; third-party services, advertising, Prime, and AWS contribute different growth and margin profiles."},
    {title:"Bull Scenario",body:"Scenario, not forecast: AWS and advertising growth plus retail efficiency could expand consolidated cash flow faster than sales."},
    {title:"Bear Scenario",body:"Scenario, not forecast: heavy logistics and AI investment, cloud competition, or weak consumer demand could delay margin improvement."},
    {title:"Key Risks",body:"Retail intensity, labor and delivery costs, regulation, cloud competition, capital allocation, and low consolidated margins require verification."},
    {title:"Potential Catalysts",body:"Sample items include AWS growth, retail regional profitability, advertising trends, fulfillment productivity, and capital-spending guidance."},
    {title:"Valuation Context",body:"Earnings multiples can obscure Amazon's segment mix. Compare operating income and free-cash-flow outcomes under different investment levels."},
    {title:"Thesis Invalidation",body:"The scenario weakens if AWS growth and margins deteriorate while retail efficiency reverses for multiple reporting periods."},
    {title:"Further Research Questions",body:"What drives incremental AWS margins? How repeatable are fulfillment savings? How much advertising growth depends on marketplace economics?"}],
  TSLA:[
    {title:"Company Overview",body:"Tesla produces electric vehicles, energy storage systems, charging products, and related software and services. Sample content; verify independently."},
    {title:"How the Company Makes Money",body:"Automotive sales remain the largest source, while energy generation and storage, services, charging, software, and regulatory credits contribute."},
    {title:"Bull Scenario",body:"Scenario, not forecast: lower production costs, energy-storage scale, and software adoption could diversify profit beyond vehicle sales."},
    {title:"Bear Scenario",body:"Scenario, not forecast: price competition, slower EV demand, execution delays, or further automotive margin pressure could weaken cash generation."},
    {title:"Key Risks",body:"Demand volatility, competition, manufacturing execution, key-person exposure, regulation, product concentration, and valuation assumptions require verification."},
    {title:"Potential Catalysts",body:"Sample items include delivery and margin trends, lower-cost platform progress, energy deployments, factory utilization, and product milestones."},
    {title:"Valuation Context",body:"The sample multiple depends on long-duration growth outside the current automotive profit base. Separate verified results from optional future scenarios."},
    {title:"Thesis Invalidation",body:"The scenario weakens if automotive margins and free cash flow remain depressed without verified progress in energy or software economics."},
    {title:"Further Research Questions",body:"What portion of value depends on unproven products? Are price reductions expanding lifetime economics? How capital-intensive is energy growth?"}],
};
Object.entries(reports).forEach(([ticker,report])=>{stocks[ticker as Exclude<Ticker,"AAPL">].report=report});

export const tickerList = Object.keys(stocks) as Ticker[];
