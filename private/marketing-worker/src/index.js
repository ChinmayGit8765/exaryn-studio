// Private host for the marketing workspace (EXA-59).
//
// Every request is gated by a server-side Cloudflare Access JWT check before
// any static asset is served. Assets come from `../../workspace` via the
// Workers static-assets binding with `run_worker_first = true`, so nothing
// bypasses this handler. Records stay in the visitor's browser (localStorage);
// this Worker stores nothing and is not sync.

import { deniedResponse, requireAccess } from "./access.js";

const PRIVATE_HEADERS = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

function withPrivateHeaders(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request, env) {
    const gate = await requireAccess(request, env);
    if (!gate.ok) return deniedResponse(gate);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed\n", {
        status: 405,
        headers: { allow: "GET, HEAD", ...PRIVATE_HEADERS },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return withPrivateHeaders(
        Response.redirect(new URL("/marketing.html", url).toString(), 302),
      );
    }
    if (url.pathname === "/healthz") {
      return new Response("ok\n", { status: 200, headers: PRIVATE_HEADERS });
    }

    const asset = await env.ASSETS.fetch(request);
    return withPrivateHeaders(asset);
  },
};
