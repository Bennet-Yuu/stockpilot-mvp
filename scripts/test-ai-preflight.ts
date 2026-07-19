import { existsSync, readFileSync } from "node:fs";
import { getAiRuntimeConfig, preflightOpenAiModel, preflightOpenAiResponse } from "../app/providers/ai/client";
import { AiProviderError, toSafeAiError } from "../app/providers/ai/errors";
import { setServerRuntimeConfig } from "../app/runtime/serverRuntimeConfig";

type SafeFailure = AiProviderError;

function readLocalEnv(): Record<string, string> {
  if (!existsSync(".env.local")) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^("|')(.*)\1$/, "$2");
  }
  return values;
}

function value(name: string, localEnv: Record<string, string>): string | undefined {
  return process.env[name] ?? localEnv[name];
}

function isPlaceholder(value: string | undefined): boolean {
  return !value?.trim() || /^(your[-_]|sk[-_]example|replace[-_]|placeholder|changeme)/i.test(value.trim());
}

function safe(error: unknown): SafeFailure {
  return error instanceof AiProviderError ? error : toSafeAiError(error);
}

function safeFields(error: SafeFailure): string {
  const diagnostic = error.diagnostic;
  return `diagnosticCode=${error.code} errorClass=${diagnostic?.errorClass ?? "unknown"} httpStatus=${diagnostic?.httpStatus ?? "none"} apiCode=${diagnostic?.apiCode ?? "none"} apiType=${diagnostic?.apiType ?? "none"} clientRequestId=${diagnostic?.clientRequestId ?? "none"} openaiRequestId=${diagnostic?.openaiRequestId ?? "none"} retryable=${error.retryable}`;
}

function authenticationState(code: SafeFailure["code"]): "success" | "failure" | "unknown" {
  if (code === "AI_INVALID_API_KEY") return "failure";
  if (["AI_PERMISSION_DENIED", "AI_MODEL_NOT_FOUND", "AI_INSUFFICIENT_QUOTA", "AI_RATE_LIMITED", "AI_BAD_REQUEST"].includes(code)) return "success";
  return "unknown";
}

function modelAccessState(code: SafeFailure["code"]): "failure" | "unknown" {
  if (["AI_PERMISSION_DENIED", "AI_MODEL_NOT_FOUND", "AI_BAD_REQUEST"].includes(code)) return "failure";
  return "unknown";
}

function reportConfigFailure(model: string | undefined): void {
  console.error(`OPENAI_PREFLIGHT=blocked phase=config authentication=failure modelAccess=not-attempted model=${model?.trim() || "unavailable"} diagnosticCode=AI_NOT_CONFIGURED httpStatus=none clientRequestId=none openaiRequestId=none retryable=false`);
  process.exitCode = 2;
}

async function main(): Promise<void> {
  const localEnv = readLocalEnv();
  const apiKey = value("OPENAI_API_KEY", localEnv);
  const model = value("OPENAI_MODEL", localEnv);
  if (isPlaceholder(apiKey) || isPlaceholder(model)) {
    reportConfigFailure(model);
    return;
  }

  setServerRuntimeConfig({
    SEC_USER_AGENT: value("SEC_USER_AGENT", localEnv),
    SEC_REQUESTS_PER_SECOND: value("SEC_REQUESTS_PER_SECOND", localEnv),
    SEC_CACHE_TTL_SECONDS: value("SEC_CACHE_TTL_SECONDS", localEnv),
    SEC_TIMEOUT_MS: value("SEC_TIMEOUT_MS", localEnv),
    SEC_MAX_RESPONSE_BYTES: value("SEC_MAX_RESPONSE_BYTES", localEnv),
    OPENAI_API_KEY: apiKey,
    OPENAI_MODEL: model,
    OPENAI_TIMEOUT_MS: value("OPENAI_TIMEOUT_MS", localEnv),
    OPENAI_MAX_OUTPUT_TOKENS: value("OPENAI_MAX_OUTPUT_TOKENS", localEnv),
    AI_CACHE_TTL_SECONDS: value("AI_CACHE_TTL_SECONDS", localEnv),
    AI_REQUESTS_PER_MINUTE: value("AI_REQUESTS_PER_MINUTE", localEnv),
  }, "node");

  const config = getAiRuntimeConfig();
  try {
    const modelResult = await preflightOpenAiModel();
    const modelDiagnostic = modelResult.diagnostic;
    console.log(`phase=models authentication=success modelAccess=success model=${modelResult.model} httpStatus=${modelResult.status} diagnosticCode=none errorClass=none apiCode=none apiType=none clientRequestId=${modelDiagnostic.clientRequestId ?? "none"} openaiRequestId=${modelDiagnostic.openaiRequestId ?? "none"} retryable=false latencyMs=${modelResult.latencyMs}`);

    try {
      const responseResult = await preflightOpenAiResponse();
      const responseDiagnostic = responseResult.diagnostic;
      const usage = responseResult.tokenUsage;
      console.log(`OPENAI_PREFLIGHT=passed authentication=success modelAccess=success response=success model=${responseResult.model} httpStatus=${responseResult.status} diagnosticCode=none clientRequestId=${responseDiagnostic.clientRequestId ?? "none"} openaiRequestId=${responseDiagnostic.openaiRequestId ?? "none"} retryable=false inputTokens=${usage?.inputTokens ?? "unknown"} outputTokens=${usage?.outputTokens ?? "unknown"} totalTokens=${usage?.totalTokens ?? "unknown"} latencyMs=${responseResult.latencyMs}`);
    } catch (error) {
      const failure = safe(error);
      console.error(`OPENAI_PREFLIGHT=blocked phase=responses authentication=success modelAccess=success response=failure model=${config.model} ${safeFields(failure)}`);
      process.exitCode = 1;
    }
  } catch (error) {
    const failure = safe(error);
    console.error(`OPENAI_PREFLIGHT=blocked phase=models authentication=${authenticationState(failure.code)} modelAccess=${modelAccessState(failure.code)} model=${config.model} ${safeFields(failure)}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const failure = safe(error);
  console.error(`OPENAI_PREFLIGHT=blocked phase=unexpected authentication=unknown modelAccess=unknown ${safeFields(failure)}`);
  process.exitCode = 1;
});
