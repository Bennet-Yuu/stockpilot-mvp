import type { SecDiagnosticCode } from "../providers/sec/errors";

export interface ServerRuntimeConfig {
  SEC_USER_AGENT?: string;
  SEC_REQUESTS_PER_SECOND?: string;
  SEC_CACHE_TTL_SECONDS?: string;
  SEC_TIMEOUT_MS?: string;
  SEC_MAX_RESPONSE_BYTES?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_TIMEOUT_MS?: string;
  OPENAI_MAX_OUTPUT_TOKENS?: string;
  AI_CACHE_TTL_SECONDS?: string;
  AI_REQUESTS_PER_MINUTE?: string;
}

export type ServerRuntimeKind = "cloudflare" | "node";

const SEC_RUNTIME_KEYS = [
  "SEC_USER_AGENT",
  "SEC_REQUESTS_PER_SECOND",
  "SEC_CACHE_TTL_SECONDS",
  "SEC_TIMEOUT_MS",
  "SEC_MAX_RESPONSE_BYTES",
] as const;

const AI_RUNTIME_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_TIMEOUT_MS",
  "OPENAI_MAX_OUTPUT_TOKENS",
  "AI_CACHE_TTL_SECONDS",
  "AI_REQUESTS_PER_MINUTE",
] as const;

let injectedConfig: ServerRuntimeConfig | undefined;
let runtimeKind: ServerRuntimeKind = "node";
let lastDiagnosticCode: SecDiagnosticCode | undefined;

function pickSecRuntimeConfig(source: Record<string, unknown> | undefined): ServerRuntimeConfig {
  const selected: ServerRuntimeConfig = {};
  for (const key of SEC_RUNTIME_KEYS) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) selected[key] = value.trim();
  }
  return selected;
}

function pickAiRuntimeConfig(source: Record<string, unknown> | undefined): ServerRuntimeConfig {
  const selected: ServerRuntimeConfig = {};
  for (const key of AI_RUNTIME_KEYS) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) selected[key] = value.trim();
  }
  return selected;
}

/** Inject only the allowlisted SEC settings supplied by a Worker request. */
export function setServerRuntimeConfig(config: Record<string, unknown>, kind: ServerRuntimeKind = "cloudflare"): void {
  injectedConfig = { ...pickSecRuntimeConfig(config), ...pickAiRuntimeConfig(config) };
  runtimeKind = kind;
}

/** Read Worker-injected settings, or process.env for the local Node runtime. */
export function getServerRuntimeConfig(): ServerRuntimeConfig {
  if (injectedConfig) return { ...injectedConfig };
  if (typeof process === "undefined") return {};
  return { ...pickSecRuntimeConfig(process.env), ...pickAiRuntimeConfig(process.env) };
}

export function getServerRuntimeKind(): ServerRuntimeKind {
  return runtimeKind;
}

export function setLastSecDiagnosticCode(code?: SecDiagnosticCode): void {
  lastDiagnosticCode = code;
}

export function getLastSecDiagnosticCode(): SecDiagnosticCode | undefined {
  return lastDiagnosticCode;
}

/** Test-only reset; production callers should inject a new request config instead. */
export function clearServerRuntimeConfigForTests(): void {
  injectedConfig = undefined;
  runtimeKind = "node";
  lastDiagnosticCode = undefined;
}
