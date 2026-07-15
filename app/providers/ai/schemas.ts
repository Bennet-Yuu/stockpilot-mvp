# StockPilot

StockPilot æ˜¯é¢å‘ç¾Žè‚¡æ–°æ‰‹çš„ç ”ç©¶ã€ä¹°å…¥æ£€æŸ¥ã€æ¨¡æ‹Ÿäº¤æ˜“å’Œäº¤æ˜“å¤ç›˜ Web åº”ç”¨ã€‚å®ƒå¸®åŠ©ç”¨æˆ·å†™ä¸‹å¯éªŒè¯çš„æŠ•èµ„é€»è¾‘ã€æ£€æŸ¥é£Žé™©å¹¶è§‚å¯Ÿè¿‡ç¨‹ï¼Œä¸è¿žæŽ¥çœŸå®žåˆ¸å•†ã€ä¸ä½¿ç”¨çœŸå®žèµ„é‡‘ã€ä¸è‡ªåŠ¨ä¸‹å•ï¼Œä¹Ÿä¸æä¾›ä¸ªæ€§åŒ–æŠ•èµ„å»ºè®®æˆ–ä»·æ ¼é¢„æµ‹ã€‚

## 0.3 æ–°å¢ž

è‚¡ç¥¨è¯¦æƒ…é¡µçŽ°åœ¨æœ‰ç‹¬ç«‹çš„ **SEC Source Facts** é¢æ¿ï¼š

- æœåŠ¡ç«¯è¯»å– SEC å®˜æ–¹ submissions å’Œ XBRL Company Factsã€‚
- èº«ä»½ã€CIKã€SICã€æœ€æ–° 10-K/10-Q/8-Kã€å¹´åº¦äº”å¹´äº‹å®žã€filed/as-of å’ŒåŽŸå§‹æ¥æºé“¾æŽ¥å‡å¯è¿½æº¯ã€‚
- Revenueã€Operating Incomeã€Net Incomeã€OCFã€CapExã€FCFã€Assetsã€Liabilitiesã€Cashã€Diluted EPS é€é¡¹æ˜¾ç¤ºï¼›ç¼ºå¤±å€¼ä¸º `Unavailable`ï¼Œä¸ä¼šå¡« 0ã€‚
- FCF æ˜Žç¡®æŒ‰åŒä¸€å¹´åº¦ `Operating Cash Flow - Capital Expenditure` è®¡ç®—å¹¶ä¿ç•™ä¸¤æ¡æ¥æºã€‚
- User-Agentã€é™é€Ÿã€è¶…æ—¶ã€å“åº”å¤§å°ã€schemaã€é‡è¯•ã€TTL/stale cache å’Œå®‰å…¨ fallback å‡åœ¨ server provider ä¸­å®žçŽ°ã€‚
- æ²¡æœ‰ `SEC_USER_AGENT` æ—¶ä¸å‘ SEC è¯·æ±‚ï¼Œä»å®Œæ•´è¿è¡Œ Sample Demoã€‚

SEC é¢æ¿ä¸Ž Sample marketã€Research Profileã€Paper Portfolioã€Checklistã€Journal å’Œ Insights éš”ç¦»ï¼›SEC facts ä¸å½±å“æ¨¡æ‹Ÿä»·æ ¼ã€è¯„åˆ†æˆ–äº¤æ˜“æ•°é‡ã€‚

## å¯åŠ¨

éœ€è¦ Node.js 22.13+ã€‚å½“å‰ Codex è¿è¡Œæ—¶è‹¥æ²¡æœ‰å…¨å±€ npmï¼Œå¯ç”¨ç­‰ä»·çš„ `pnpm --ignore-workspace` å‘½ä»¤ã€‚

```bash
npm install
npm run dev
```

æµè§ˆå™¨æ‰“å¼€ç»ˆç«¯æ˜¾ç¤ºçš„åœ°å€ï¼Œé€šå¸¸ä¸º <http://localhost:3000>ã€‚

æœ¬åœ°å¼€å‘é»˜è®¤ä½¿ç”¨ vinext Node SSR è¿è¡Œå™¨ï¼Œä¾¿äºŽ server-only SEC provider è¿›è¡Œ live éªŒè¯ï¼›ç”Ÿäº§æž„å»ºä»ä¿ç•™ Cloudflare Worker æ’ä»¶ã€‚è‹¥éœ€è¦æœ¬åœ° Worker é¢„è§ˆï¼Œå¯è®¾ç½® `STOCKPILOT_CLOUDFLARE_DEV=1`ã€‚Worker å…¥å£ä¼šåœ¨æ¯ä¸ªè¯·æ±‚å¼€å§‹æ—¶åªæ³¨å…¥ç™½åå• SEC é…ç½®ï¼Œé¿å…åœ¨æ¨¡å—åŠ è½½æ—¶å†»ç»“ç©ºçš„ `process.env`ã€‚

## å¯ç”¨ SEC liveï¼ˆå¯é€‰ï¼‰

å¤åˆ¶ `.env.example` ä¸ºæœ¬åœ° `.env.local`ï¼ŒæŠŠ `SEC_USER_AGENT` æ”¹æˆçœŸå®žä¸”å¯è”ç³»çš„åº”ç”¨å/é‚®ç®±ï¼›å¯æŒ‰éœ€è°ƒæ•´ `SEC_REQUESTS_PER_SECOND`ã€`SEC_CACHE_TTL_SECONDS`ã€`SEC_TIMEOUT_MS` å’Œ `SEC_MAX_RESPONSE_BYTES`ã€‚Cloudflare/Sites éƒ¨ç½²æ—¶åº”åœ¨æœåŠ¡å™¨ç«¯ secret/environment è®¾ç½®ä¸­é…ç½®ç›¸åŒå˜é‡ï¼Œä¸èƒ½å†™å…¥ä»“åº“æˆ–å®¢æˆ·ç«¯ bundleã€‚`/api/sec/health` åªè¿”å›ž runtimeã€æ˜¯å¦é…ç½®å’Œå®‰å…¨è¯Šæ–­ç ï¼Œä¸è¿”å›ž User-Agent å€¼ã€‚ä¸è¦æäº¤ `.env`ã€çœŸå®žé‚®ç®±ã€API keyã€æ•°æ®åº“å¯†ç ã€`node_modules`ã€`.next` æˆ– `dist`ã€‚

## éªŒè¯

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` ä½¿ç”¨å®Œå…¨ç¦»çº¿ SEC fixturesï¼Œè¦†ç›– CIK æ˜ å°„ã€æ¦‚å¿µå›žé€€ã€å¹´åº¦/å­£åº¦ç­›é€‰ã€ä¿®è®¢åŽ»é‡ã€å•ä½ã€FCFã€è¯·æ±‚å¤´ã€é™é€Ÿ/é‡è¯•ã€ç¼“å­˜/fallbackã€API schemaï¼Œä»¥åŠ 0.2 ledgerã€Checklistã€Journalã€Insights å’Œ HTML æ¸²æŸ“å›žå½’ã€‚

åªæœ‰åœ¨ `.env.local` ä¸­å¡«å†™çœŸå®žå¯è”ç³»é‚®ç®±åŽï¼Œæ‰æ‰‹åŠ¨è¿è¡Œ `npm run test:sec-live`ï¼ˆæˆ– `pnpm test:sec-live`ï¼‰è®¿é—® SECï¼ŒéªŒè¯ AAPLã€MSFTã€NVDAã€AMZNã€TSLAã€‚æ²¡æœ‰é…ç½®æ—¶è¯¥å‘½ä»¤ä¼šæ˜Žç¡®è·³è¿‡å¹¶è¿”å›žéžé›¶çŠ¶æ€ï¼›å¸¸è§„ `npm test` ä¸è®¿é—®ç½‘ç»œã€‚

## ç›®å½•

```text
app/
  domain/       ç»„åˆã€è¯„åˆ†ã€é£Žé™©å’Œ Insights çº¯å‡½æ•°
  providers/    Sample providers ä¸Ž server-only SEC provider
  storage/      Zod æ ¡éªŒçš„ localStorage v2
  api/sec/      SEC snapshot/company/filings route handlers
  components/   SEC source facts panel
  stocks/       /stocks/[ticker] é¡µé¢
  StockPilotApp.tsx äº¤äº’åº”ç”¨å£³
tests/fixtures/sec/  ç¦»çº¿ SEC å“åº”å½¢çŠ¶ fixture
docs/             äº§å“ã€æž¶æž„ã€SEC å¥‘çº¦å’Œè·¯çº¿å›¾
memory-bank/      é¡¹ç›®è¿›åº¦ä¸Žæž¶æž„è®°å¿†
```

## ä¸»è¦æ–‡æ¡£

- `docs/SEC_INTEGRATION.md`ï¼šç«¯ç‚¹ã€æœåŠ¡ç«¯è¾¹ç•Œã€ç¼“å­˜ã€é™é€Ÿã€å½’ä¸€åŒ–è§„åˆ™ã€‚
- `docs/SEC_WORKER_RUNTIME.md`ï¼šWorker ç™½åå•é…ç½®æ³¨å…¥ã€health è¯Šæ–­å’Œæœ¬åœ°é¢„è§ˆã€‚
- `docs/SEC_DATA_CONTRACT.md`ï¼šsnapshot schemaã€provenanceã€çŠ¶æ€å’Œæ•°æ®åˆ†ç±»ã€‚
- `docs/ARCHITECTURE_V2.md`ï¼š0.2/0.3 åˆ†å±‚ä¸Žéš”ç¦»åŽŸåˆ™ã€‚
- `docs/ROADMAP.md`ï¼šç‰ˆæœ¬èŒƒå›´å’Œå‘å¸ƒé—¨æ§›ã€‚
- `PRODUCT_SPEC.md`ã€`USER_FLOWS.md`ã€`UI_SPEC.md`ã€`DATA_MODEL.md`ã€`IMPLEMENTATION_PLAN.md`ï¼šäº§å“ä¸Žå·¥ç¨‹è§„æ ¼ã€‚

## å…è´£å£°æ˜Ž

StockPilot is an educational research and paper-trading tool. It does not provide financial advice, personalized recommendations, guaranteed returns, or real trade execution. SEC facts are public source evidence and do not constitute a buy or sell signal.

## 0.4 Source-grounded AI Research Assistant

Stock detail pages now include an optional, user-triggered `AI Research Assistant`. It uses only eligible SEC identity/facts, deterministic annual trends, filing metadata, the selected language, and an optional question up to 500 characters. It never receives Paper Trades, Portfolio, Checklist, Journal, Insights, Watchlist, localStorage, prices, secrets, or browser identifiers.

The server uses the official OpenAI Responses API with Structured Outputs (`responses.parse` + `zodTextFormat`) and `store:false`. Every factual claim must cite an Evidence Bundle source and passes deterministic grounding checks before it is displayed. The assistant does not provide ratings, trading instructions, price targets, forecasts, expected returns, or personalized advice. See `docs/AI_RESEARCH_ASSISTANT.md`, `docs/AI_DATA_CONTRACT.md`, and `docs/AI_SAFETY_BOUNDARIES.md`.

Without `OPENAI_API_KEY`, the app remains fully usable, SEC fallback behavior is unchanged, and the panel shows `Not configured` with clearly marked rules-based questions. Configure AI only in the server environment; never commit `.env.local` or expose the key to the browser.
