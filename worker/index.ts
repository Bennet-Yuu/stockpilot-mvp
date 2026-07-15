/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { setServerRuntimeConfig } from "../app/runtime/serverRuntimeConfig";

// Some local Miniflare/edge previews do not expose WeakRef even though the
// React Server Components runtime expects it. Keep a strong-reference shim
// for that preview only; real Worker runtimes use their native implementation.
if (typeof globalThis.WeakRef === "undefined") {
  class StrongReference<T extends object> {
    constructor(private readonly target: T) {}
    deref(): T | undefined { return this.target; }
  }
  globalThis.WeakRef = StrongReference as unknown as typeof WeakRef;
}

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  SEC_USER_AGENT?: string;
  SEC_REQUESTS_PER_SECOND?: string;
  SEC_CACHE_TTL_SECONDS?: string;
  SEC_TIMEOUT_MS?: string;
  SEC_MAX_RESPONSE_BYTES?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    setServerRuntimeConfig({
      SEC_USER_AGENT: env.SEC_USER_AGENT,
      SEC_REQUESTS_PER_SECOND: env.SEC_REQUESTS_PER_SECOND,
      SEC_CACHE_TTL_SECONDS: env.SEC_CACHE_TTL_SECONDS,
      SEC_TIMEOUT_MS: env.SEC_TIMEOUT_MS,
      SEC_MAX_RESPONSE_BYTES: env.SEC_MAX_RESPONSE_BYTES,
    }, "cloudflare");
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
