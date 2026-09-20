var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/access.js
var JWKS_TTL_MS = 10 * 60 * 1e3;
var CLOCK_SKEW_S = 60;
var jwksCache = /* @__PURE__ */ new Map();
function b64urlToBytes(s) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]*$/.test(s)) {
    throw new Error("bad base64url");
  }
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - s.length % 4);
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(b64urlToBytes, "b64urlToBytes");
function decodeJsonSegment(seg) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(seg)));
}
__name(decodeJsonSegment, "decodeJsonSegment");
function extractToken(request) {
  const header = request.headers.get("cf-access-jwt-assertion");
  if (header) return header.trim();
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === "CF_Authorization") return rest.join("=").trim();
  }
  return null;
}
__name(extractToken, "extractToken");
async function importJwk(jwk) {
  if (jwk.kty !== "RSA" || jwk.alg && jwk.alg !== "RS256") return null;
  return crypto.subtle.importKey(
    "jwk",
    { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}
__name(importJwk, "importJwk");
async function loadJwks(teamDomain, fetchImpl, force) {
  const cached = jwksCache.get(teamDomain);
  if (!force && cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys;
  const res = await fetchImpl(`https://${teamDomain}/cdn-cgi/access/certs`, {
    headers: { accept: "application/json" }
  });
  if (!res.ok) throw new Error(`jwks fetch failed: ${res.status}`);
  const body = await res.json();
  const keys = /* @__PURE__ */ new Map();
  for (const jwk of body.keys || []) {
    if (!jwk.kid) continue;
    const key = await importJwk(jwk);
    if (key) keys.set(jwk.kid, key);
  }
  jwksCache.set(teamDomain, { fetchedAt: Date.now(), keys });
  return keys;
}
__name(loadJwks, "loadJwks");
function audienceMatches(aud, expected) {
  if (Array.isArray(aud)) return aud.includes(expected);
  return aud === expected;
}
__name(audienceMatches, "audienceMatches");
async function verifyAccessJwt(token, env, opts = {}) {
  const fetchImpl = opts.fetch || globalThis.fetch;
  const now = opts.now ? opts.now() : Math.floor(Date.now() / 1e3);
  const teamDomain = (env.ACCESS_TEAM_DOMAIN || "").trim();
  const aud = (env.ACCESS_AUD || "").trim();
  if (!teamDomain || !aud) return { ok: false, reason: "access_not_configured" };
  if (!token) return { ok: false, reason: "missing_token" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  let header;
  let claims;
  let signature;
  try {
    header = decodeJsonSegment(parts[0]);
    claims = decodeJsonSegment(parts[1]);
    signature = b64urlToBytes(parts[2]);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!header || header.alg !== "RS256" || typeof header.kid !== "string") {
    return { ok: false, reason: "bad_header" };
  }
  let keys;
  try {
    keys = await loadJwks(teamDomain, fetchImpl, false);
    if (!keys.has(header.kid)) keys = await loadJwks(teamDomain, fetchImpl, true);
  } catch {
    return { ok: false, reason: "jwks_unavailable" };
  }
  const key = keys.get(header.kid);
  if (!key) return { ok: false, reason: "unknown_kid" };
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  let valid = false;
  try {
    valid = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, signature, data);
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: "bad_signature" };
  if (claims.iss !== `https://${teamDomain}`) return { ok: false, reason: "bad_issuer" };
  if (!audienceMatches(claims.aud, aud)) return { ok: false, reason: "bad_audience" };
  if (typeof claims.exp !== "number" || claims.exp <= now - CLOCK_SKEW_S) {
    return { ok: false, reason: "expired" };
  }
  if (typeof claims.nbf === "number" && claims.nbf > now + CLOCK_SKEW_S) {
    return { ok: false, reason: "not_yet_valid" };
  }
  if (typeof claims.iat === "number" && claims.iat > now + CLOCK_SKEW_S) {
    return { ok: false, reason: "issued_in_future" };
  }
  const allowed = (env.ACCESS_ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length) {
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    if (!email || !allowed.includes(email)) return { ok: false, reason: "email_not_allowed" };
  }
  return { ok: true, claims };
}
__name(verifyAccessJwt, "verifyAccessJwt");
async function requireAccess(request, env, opts) {
  return verifyAccessJwt(extractToken(request), env, opts);
}
__name(requireAccess, "requireAccess");
function deniedResponse(result) {
  return new Response("Unauthorized\n", {
    status: 401,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-access-denied": result && result.reason ? result.reason : "denied"
    }
  });
}
__name(deniedResponse, "deniedResponse");

// src/index.js
var PRIVATE_HEADERS = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff"
};
function withPrivateHeaders(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) out.headers.set(k, v);
  return out;
}
__name(withPrivateHeaders, "withPrivateHeaders");
var src_default = {
  async fetch(request, env) {
    const gate = await requireAccess(request, env);
    if (!gate.ok) return deniedResponse(gate);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed\n", {
        status: 405,
        headers: { allow: "GET, HEAD", ...PRIVATE_HEADERS }
      });
    }
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return withPrivateHeaders(
        Response.redirect(new URL("/marketing.html", url).toString(), 302)
      );
    }
    if (url.pathname === "/healthz") {
      return new Response("ok\n", { status: 200, headers: PRIVATE_HEADERS });
    }
    const asset = await env.ASSETS.fetch(request);
    return withPrivateHeaders(asset);
  }
};

// ../../../../../home/ubuntu/.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../home/ubuntu/.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-vivcRJ/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../home/ubuntu/.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-vivcRJ/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
