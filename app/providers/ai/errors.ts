import type { SafeAiErrorCode, AiProviderErrorOptions } from "./types";

export class AiProviderError extends Error {
  readonly code: SafeAiErrorCode;
  readonly retryable: boolean;

  constructor(code: SafeAiErrorCode, message: string, options: AiProviderErrorOptions = {}) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

export function toSafeAiError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (error instanceof Error && /timeout|timed out|abort/i.test(error.message)) return new AiProviderError("AI_TIMEOUT", "The AI provider timed out.", { retryable: true });
  return new AiProviderError("AI_PROVIDER_ERROR", "The AI provider returned an unavailable response.");
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
