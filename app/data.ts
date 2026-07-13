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
      {title:"Bull Case",body:"Services mix expansion, device upgrades, and disciplined capital returns could support durable earnings-per-share growth even with modest revenue growth."},
      {title:"Bear Case",body:"A mature smartphone market, regulatory pressure on App Store economics, and weaker demand in Greater China could compress growth and the valuation multiple."},
      {title:"Key Risks",body:"Supply-chain concentration, platform regulation, premium-device demand sensitivity, foreign exchange, and dependence on iPhone economics."},
      {title:"Upcoming Catalysts",body:"Next product cycle, quarterly Services growth, developer conference announcements, and capital-return updates."},
      {title:"Valuation Summary",body:"The sample forward P/E is above Apple’s long-run market premium. The current price assumes resilient margins and continued per-share growth."},
      {title:"What Would Invalidate the Thesis",body:"Sustained installed-base contraction, material Services margin erosion, or two years of declining free cash flow without a credible recovery path."},
      {title:"Questions Requiring Further Research",body:"How durable is Services growth by geography? What portion of AI investment can lift device upgrades? How exposed is App Store profit to regulatory remedies?"},
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

const genericSections = [
  ["Company Overview","The company operates a scaled platform in its core market, supported by brand, distribution, and ongoing product investment."],
  ["How the Company Makes Money","Revenue comes from a mix of core products and higher-margin services. The durability and concentration of each stream require further review."],
  ["Bull Case","Execution on the core franchise and higher-margin growth initiatives could expand earnings and free cash flow faster than revenue."],
  ["Bear Case","Competitive pressure, slower demand, or sustained investment could reduce margins and challenge the current valuation."],
  ["Key Risks","Competition, regulation, macro sensitivity, execution, customer concentration, and valuation compression."],
  ["Upcoming Catalysts","Quarterly results, product updates, management guidance, and changes in industry demand."],
  ["Valuation Summary","The sample valuation embeds continued growth. Compare cash-flow outcomes across base, upside, and downside cases before acting."],
  ["What Would Invalidate the Thesis","Two consecutive periods of worsening core operating metrics without a credible, evidence-backed recovery plan."],
  ["Questions Requiring Further Research","Which segment drives incremental profit? How durable is pricing power? Which leading indicator would reveal a slowdown first?"],
];

(["MSFT","NVDA","AMZN","TSLA"] as Ticker[]).forEach((ticker) => {
  stocks[ticker].report = genericSections.map(([title,body]) => ({title,body}));
});

export const tickerList = Object.keys(stocks) as Ticker[];
