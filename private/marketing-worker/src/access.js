// Server-side verification of a Cloudflare Access application token.
//
// Access places a signed JWT in the `Cf-Access-Jwt-Assertion` header (and the
// `CF_Authorization` cookie). We verify it ourselves instead of trusting any
// identity header: RS256 signature against the team's published JWKS, issuer,
// audience and time claims. Anything missing or wrong fails closed.
//
// Configuration comes from Worker secrets/vars, never from source:
//   ACCESS_TEAM_DOMAIN   e.g. "example.cloudflareaccess.com"
//   ACCESS_AUD           the application audience (AUD) tag from Access
//   ACCESS_ALLOWED_EMAILS optional, comma-separated extra allowlist enforced on the
//                        signed `email` claim (defence in depth; Access policy is
//                        still the authority)

const JWKS_TTL_MS = 10 * 60 * 1000;
const CLOCK_SKEW_S = 60;

const jwksCache = new Map(); // teamDomain -> { fetchedAt, keys: Map<kid, CryptoKey> }

function b64urlToBytes(s) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]*$/.test(s)) {
    throw new Error("bad base64url");
  }
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJsonSegment(seg) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(seg)));
}

export function extractToken(request) {
  const header = request.headers.get("cf-access-jwt-assertion");
  if (header) return header.trim();
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === "CF_Authorization") return rest.join("=").trim();
  }
  return null;
}

async function importJwk(jwk) {
  if (jwk.kty !== "RSA" || (jwk.alg && jwk.alg !== "RS256")) return null;
  return crypto.subtle.importKey(
    "jwk",
    { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

async function loadJwks(teamDomain, fetchImpl, force) {
  const cached = jwksCache.get(teamDomain);
  if (!force && cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys;
  const res = await fetchImpl(`https://${teamDomain}/cdn-cgi/access/certs`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`jwks fetch failed: ${res.status}`);
  const body = await res.json();
  const keys = new Map();
  for (const jwk of body.keys || []) {
    if (!jwk.kid) continue;
    const key = await importJwk(jwk);
    if (key) keys.set(jwk.kid, key);
  }
  jwksCache.set(teamDomain, { fetchedAt: Date.now(), keys });
  return keys;
}

export function resetJwksCache() {
  jwksCache.clear();
}

function audienceMatches(aud, expected) {
  if (Array.isArray(aud)) return aud.includes(expected);
  return aud === expected;
}

/**
 * Verify an Access JWT. Returns { ok: true, claims } or { ok: false, reason }.
 * Never throws for a bad token; throws only on programmer error.
 */
export async function verifyAccessJwt(token, env, opts = {}) {
  const fetchImpl = opts.fetch || globalThis.fetch;
  const now = opts.now ? opts.now() : Math.floor(Date.now() / 1000);
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

  const allowed = (env.ACCESS_ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length) {
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    if (!email || !allowed.includes(email)) return { ok: false, reason: "email_not_allowed" };
  }

  return { ok: true, claims };
}

export async function requireAccess(request, env, opts) {
  return verifyAccessJwt(extractToken(request), env, opts);
}

export function deniedResponse(result) {
  // Same body for every reason so responses do not leak configuration.
  return new Response("Unauthorized\n", {
    status: 401,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-access-denied": result && result.reason ? result.reason : "denied",
    },
  });
}
