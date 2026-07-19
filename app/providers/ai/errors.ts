import { APIConnectionError, APIConnectionTimeoutError, APIError } from "openai";
import type { AiProviderErrorOptions, AiRequestDiagnostic, SafeAiErrorCode } from "./types";

export class AiProviderError extends Error {
  readonly code: SafeAiErrorCode;
  readonly retryable: boolean;
  readonly diagnostic?: AiRequestDiagnostic;

  constructor(code: SafeAiErrorCode, message: string, options: AiProviderErrorOptions = {}) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.diagnostic = options.diagnostic;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeStatus(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
}

function safeConstructorName(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  const constructor = error.constructor;
  if (typeof constructor !== "function") return undefined;
  return safeString((constructor as { name?: unknown }).name);
}

function safeErrorClass(error: unknown): string {
  const name = isRecord(error) ? safeString(error.name) : undefined;
  const constructor = safeConstructorName(error);
  return name && name !== "Error" ? name : constructor ?? "UnknownError";
}

function hasNetworkSignal(error: unknown, errorClass: string): boolean {
  if (error instanceof APIConnectionError || /APIConnectionError/i.test(errorClass)) return true;
  const message = isRecord(error) ? safeString(error.message)?.toLowerCase() ?? "" : "";
  const cause = isRecord(error) && isRecord(error.cause) ? error.cause : undefined;
  const causeCode = cause ? safeString(cause.code)?.toLowerCase() ?? "" : "";
  return /dns|network|socket|connection|fetch failed|econnreset|enotfound|eai_again|etimedout|reset/i.test(`${message} ${causeCode}`);
}

function mergeDiagnostic(base: AiRequestDiagnostic | undefined, extra: AiRequestDiagnostic | undefined): AiRequestDiagnostic | undefined {
  if (!base && !extra) return undefined;
  return { ...base, ...extra };
}

export function withAiRequestDiagnostic(error: AiProviderError, diagnostic: AiRequestDiagnostic): AiProviderError {
  return new AiProviderError(error.code, error.message, { retryable: error.retryable, diagnostic: mergeDiagnostic(error.diagnostic, diagnostic) });
}

export function toSafeAiError(error: unknown, requestDiagnostic: AiRequestDiagnostic = {}): AiProviderError {
  if (error instanceof AiProviderError) return withAiRequestDiagnostic(error, requestDiagnostic);

  const record = isRecord(error) ? error : undefined;
  const errorClass = safeErrorClass(error);
  const httpStatus = safeStatus(record?.status);
  const apiCode = safeString(record?.code);
  const apiType = safeString(record?.type);
  const openaiRequestId = safeString(record?.requestID);
  const diagnostic = mergeDiagnostic({ errorClass, httpStatus, apiCode, apiType, openaiRequestId }, requestDiagnostic);
  const providerCode = (apiCode ?? apiType)?.toLowerCase();
  const message = record ? safeString(record.message) ?? "" : error instanceof Error ? error.message : "";
  const isTimeout = error instanceof APIConnectionTimeoutError || /timeout|timed out|abort/i.test(`${errorClass} ${message}`);

  if (isTimeout) return new AiProviderError("AI_TIMEOUT", "The AI provider timed out.", { retryable: true, diagnostic });
  if (httpStatus === 401 || providerCode === "invalid_api_key") return new AiProviderError("AI_INVALID_API_KEY", "The AI provider rejected the API credentials.", { diagnostic });
  if (httpStatus === 403 || ["permission_denied", "project_not_found", "organization_not_found", "org_not_found", "access_denied"].includes(providerCode ?? "")) return new AiProviderError("AI_PERMISSION_DENIED", "The AI provider denied access to the requested project or model.", { diagnostic });
  if (httpStatus === 404 || providerCode === "model_not_found") return new AiProviderError("AI_MODEL_NOT_FOUND", "The requested OpenAI model was not found.", { diagnostic });
  if ((httpStatus === 429 && providerCode === "insufficient_quota") || providerCode === "insufficient_quota") return new AiProviderError("AI_INSUFFICIENT_QUOTA", "The OpenAI project quota or billing limit was reached.", { diagnostic });
  if (httpStatus === 429 || providerCode === "rate_limit_exceeded") return new AiProviderError("AI_RATE_LIMITED", "The OpenAI project rate limit was reached.", { retryable: true, diagnostic });
  if (httpStatus !== undefined && httpStatus >= 500 && httpStatus <= 599) return new AiProviderError("AI_SERVER_ERROR", "The OpenAI service returned a temporary server error.", { retryable: true, diagnostic });
  if (httpStatus === 400) return new AiProviderError("AI_BAD_REQUEST", "The OpenAI service rejected the request.", { diagnostic });
  if (hasNetworkSignal(error, errorClass)) return new AiProviderError("AI_NETWORK_ERROR", "The OpenAI service could not be reached.", { retryable: true, diagnostic });
  if (error instanceof APIError || httpStatus !== undefined || apiCode !== undefined || apiType !== undefined) return new AiProviderError("AI_PROVIDER_ERROR", "The OpenAI provider returned an unclassified error.", { diagnostic });
  return new AiProviderError("AI_PROVIDER_ERROR", "The AI provider returned an unavailable response.", { diagnostic });
}

let lastDiagnosticCode: SafeAiErrorCode | undefined;

export function setLastAiDiagnosticCode(code?: SafeAiErrorCode): void {
  lastDiagnosticCode = code;
}

export function getLastAiDiagnosticCode(): SafeAiErrorCode | undefined {
  return lastDiagnosticCode;
}

export function clearAiDiagnosticForTests(): void {
  lastDiagnosticCode = undefined;
}
