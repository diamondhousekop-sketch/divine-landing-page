import "./lib/error-capture";

// supabase-js (realtime) expects a global WebSocket. Node < 22 doesn't provide
// one, so polyfill it on the server before any Supabase client is constructed.
import WS from "ws";
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = WS;
}

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Safe defaults for every response. HTML/API are never served from a stale
// browser cache (a cached page pointing to deleted build files is the classic
// "opens in incognito but not in normal browser" bug). Hashed /assets files are
// immutable and keep their long cache.
function withSafeHeaders(request: Request, response: Response): Response {
  try {
    const url = new URL(request.url);
    const headers = new Headers(response.headers);
    const type = headers.get("content-type") ?? "";
    if (
      !url.pathname.startsWith("/assets/") &&
      (type.includes("text/html") || url.pathname.startsWith("/api/"))
    ) {
      headers.set("cache-control", "no-cache, must-revalidate");
    }
    if (!headers.has("x-content-type-options")) headers.set("x-content-type-options", "nosniff");
    if (!headers.has("referrer-policy"))
      headers.set("referrer-policy", "strict-origin-when-cross-origin");
    if (!headers.has("x-frame-options")) headers.set("x-frame-options", "SAMEORIGIN");
    if (!headers.has("permissions-policy"))
      headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSafeHeaders(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSafeHeaders(
        request,
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
