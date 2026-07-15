export type SecErrorCode =
  | "SEC_NOT_CONFIGURED"
  | "SEC_RATE_LIMITED"
  | "SEC_FORBIDDEN"
  | "SEC_HTTP_ERROR"
  | "SEC_TIMEOUT"
  | "SEC_NETWORK_ERROR"
  | "SEC_INVALID_JSON"
  | "SEC_INVALID_RESPONSE"
  | "SEC_RESPONSE_TOO_LARGE"
  | "SEC_INVALID_TICKER"
  | "SEC_UNAVAILABLE";

export type SecDiagnosticCode = Exclude<SecErrorCode, "SEC_INVALID_TICKER">;

export class SecProviderError extends Error {
  readonly code: SecErrorCode;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(code: SecErrorCode, message: string, options?: { status?: number; retryable?: boolean }) {
    super(message);
    this.name = "SecProviderError";
    this.code = code;
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
  }
}

export function isSecProviderError(error: unknown): error is SecProviderError {
  return error instanceof SecProviderError;
}

export function toSafeSecError(error: unknown): SecProviderError {
  if (isSecProviderError(error)) return error;
  return new SecProviderError("SEC_UNAVAILABLE", "SEC data is temporarily unavailable.", { retryable: true });
}
