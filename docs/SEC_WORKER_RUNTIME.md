# SEC Worker è¿è¡Œæ—¶é…ç½®

StockPilot 0.3.1 çš„ SEC è¯·æ±‚ä»åªåœ¨æœåŠ¡ç«¯æ‰§è¡Œã€‚Cloudflare Worker å…¥å£ä¼šåœ¨è°ƒç”¨ vinext handler å‰ï¼Œä»Ž Worker `env` å¤åˆ¶ä»¥ä¸‹ç™½åå•å­—æ®µåˆ°è¯·æ±‚è¿è¡Œæ—¶ï¼š

- `SEC_USER_AGENT`ï¼ˆsecretï¼Œå¿…é¡»æ˜¯å¯è”ç³»çš„åº”ç”¨åå’Œé‚®ç®±ï¼‰
- `SEC_REQUESTS_PER_SECOND`
- `SEC_CACHE_TTL_SECONDS`
- `SEC_TIMEOUT_MS`
- `SEC_MAX_RESPONSE_BYTES`

åº”ç”¨ä»£ç ä¸å¤åˆ¶æ•´ä¸ª Worker çŽ¯å¢ƒï¼Œä¹Ÿä¸ä¼šæŠŠè¿™äº›å€¼è¿”å›žåˆ° HTMLã€å®¢æˆ·ç«¯ bundle æˆ– API å“åº”ã€‚Node æœ¬åœ°è¿è¡Œæ—¶ç»§ç»­æŒ‰éœ€è¯»å– `process.env`ï¼›æ²¡æœ‰ `SEC_USER_AGENT` æ—¶ provider ä¸ä¼šå‘å‡º SEC è¯·æ±‚ï¼Œè€Œæ˜¯è¿”å›žå¸¦ `SEC_NOT_CONFIGURED` çš„ Sample fallbackã€‚

## éƒ¨ç½²é…ç½®

åœ¨ Sites/Cloudflare çš„æœåŠ¡å™¨ç«¯ environment/secret è®¾ç½®ä¸­é…ç½®å˜é‡ï¼Œä¸è¦æŠŠ `.env.local`ã€çœŸå®žé‚®ç®±æˆ– secret æäº¤åˆ° Gitã€‚Worker è¿è¡Œæ—¶æ˜¾å¼å£°æ˜Ž `compatibility_date`ã€`nodejs_compat` å’Œ `nodejs_compat_populate_process_env`ï¼›ä¸šåŠ¡ SEC é…ç½®çš„ä¸»è·¯å¾„ä»æ˜¯ `app/runtime/serverRuntimeConfig.ts`ï¼Œä¸ä¾èµ–å¹³å°æ˜¯å¦è‡ªåŠ¨å¡«å…… `process.env`ã€‚

## å®‰å…¨è¯Šæ–­

`GET /api/sec/health` åªè¿”å›žä»¥ä¸‹éžæ•æ„Ÿå­—æ®µï¼š

- `runtime`: `node` æˆ– `cloudflare`
- `configured`ã€`userAgentPresent`
- `requestsPerSecondConfigured`ã€`maxResponseBytesConfigured`
- `lastDiagnosticCode`
- `checkedAt`

snapshotã€company å’Œ filings API åœ¨ fallback å…ƒæ•°æ®ä¸­ä¹Ÿå¯è¿”å›žå®‰å…¨è¯Šæ–­ç ï¼Œä¾‹å¦‚ `SEC_FORBIDDEN`ã€`SEC_NETWORK_ERROR`ã€`SEC_TIMEOUT` æˆ– `SEC_UNAVAILABLE`ã€‚ä¸ä¼šè¿”å›žåŽŸå§‹å¼‚å¸¸ã€stackã€é‚®ç®±æˆ– User-Agentã€‚

## æœ¬åœ° Worker é¢„è§ˆ

```powershell
$env:STOCKPILOT_CLOUDFLARE_DEV="1"
pnpm dev
```

ä½¿ç”¨è¢« `.gitignore` å¿½ç•¥çš„ `.env.local` æˆ– Worker dev vars æ³¨å…¥é…ç½®ã€‚é¢„è§ˆåº”å…ˆæ£€æŸ¥ `/api/sec/health` çš„ `runtime=cloudflare` å’Œ `configured=true`ï¼Œå†æ£€æŸ¥ `/api/sec/snapshot/AAPL` çš„ `sourceMode=live` æˆ–æ˜Žç¡®çš„å®‰å…¨è¯Šæ–­ç ã€‚å¸¸è§„ `pnpm dev` ä»ä½¿ç”¨ Node SSRï¼Œå¸¸è§„æµ‹è¯•ä¸ä¼šè®¿é—®çœŸå®ž SECã€‚
