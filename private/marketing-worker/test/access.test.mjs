import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  deniedResponse,
  extractToken,
  resetJwksCache,
  verifyAccessJwt,
} from "../src/access.js";
import worker from "../src/index.js";

const TEAM = "unit-test-team.cloudflareaccess.com";
const AUD = "a".repeat(64);
const NOW = 1_800_000_000;

function b64url(bytes) {
  const bin = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makeKeyPair() {
  return crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
}

async function jwksFor(pairs) {
  const keys = [];
  for (const { kid, pair } of pairs) {
    const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    keys.push({ kid, kty: "RSA", alg: "RS256", use: "sig", n: jwk.n, e: jwk.e });
  }
  return { keys };
}

async function sign(pair, kid, claims, headerOverride = {}) {
  const header = { alg: "RS256", kid, typ: "JWT", ...headerOverride };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(claims));
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    pair.privateKey,
    new TextEncoder().encode(`${h}.${p}`),
  );
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`;
}

function fetchFor(jwks, calls = []) {
  return async (url) => {
    calls.push(url);
    if (url === `https://${TEAM}/cdn-cgi/access/certs`) {
      return new Response(JSON.stringify(jwks), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("not found", { status: 404 });
  };
}

const baseClaims = () => ({
  iss: `https://${TEAM}`,
  aud: [AUD],
  exp: NOW + 3600,
  iat: NOW - 10,
  nbf: NOW - 10,
  email: "someone@example.com",
  sub: "user-1",
});

const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD };
const opts = (jwks, calls) => ({ fetch: fetchFor(jwks, calls), now: () => NOW });

let good;
let rogue;
let jwks;

beforeEach(async () => {
  resetJwksCache();
  good = await makeKeyPair();
  rogue = await makeKeyPair();
  jwks = await jwksFor([{ kid: "kid-good", pair: good }]);
});

test("valid token verifies and returns claims", async () => {
  const token = await sign(good, "kid-good", baseClaims());
  const r = await verifyAccessJwt(token, env, opts(jwks));
  assert.equal(r.ok, true);
  assert.equal(r.claims.email, "someone@example.com");
});

test("missing token is denied", async () => {
  const r = await verifyAccessJwt(null, env, opts(jwks));
  assert.deepEqual(r, { ok: false, reason: "missing_token" });
});

test("unconfigured worker fails closed even with a token", async () => {
  const token = await sign(good, "kid-good", baseClaims());
  const r = await verifyAccessJwt(token, {}, opts(jwks));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "access_not_configured");
});

test("signature from a key not in the JWKS is denied", async () => {
  const token = await sign(rogue, "kid-good", baseClaims());
  const r = await verifyAccessJwt(token, env, opts(jwks));
  assert.deepEqual(r, { ok: false, reason: "bad_signature" });
});

test("unknown kid is denied after one JWKS refresh", async () => {
  const calls = [];
  const token = await sign(rogue, "kid-other", baseClaims());
  const r = await verifyAccessJwt(token, env, opts(jwks, calls));
  assert.deepEqual(r, { ok: false, reason: "unknown_kid" });
  assert.equal(calls.length, 2);
});

test("alg none / non-RS256 header is denied", async () => {
  const token = await sign(good, "kid-good", baseClaims(), { alg: "none" });
  const r = await verifyAccessJwt(token, env, opts(jwks));
  assert.deepEqual(r, { ok: false, reason: "bad_header" });
  const hs = await sign(good, "kid-good", baseClaims(), { alg: "HS256" });
  assert.equal((await verifyAccessJwt(hs, env, opts(jwks))).ok, false);
});

test("wrong issuer is denied", async () => {
  const token = await sign(good, "kid-good", { ...baseClaims(), iss: "https://other.cloudflareaccess.com" });
  const r = await verifyAccessJwt(token, env, opts(jwks));
  assert.deepEqual(r, { ok: false, reason: "bad_issuer" });
});

test("wrong audience is denied (string and array forms)", async () => {
  const t1 = await sign(good, "kid-good", { ...baseClaims(), aud: ["b".repeat(64)] });
  assert.equal((await verifyAccessJwt(t1, env, opts(jwks))).reason, "bad_audience");
  const t2 = await sign(good, "kid-good", { ...baseClaims(), aud: "b".repeat(64) });
  assert.equal((await verifyAccessJwt(t2, env, opts(jwks))).reason, "bad_audience");
  const t3 = await sign(good, "kid-good", { ...baseClaims(), aud: AUD });
  assert.equal((await verifyAccessJwt(t3, env, opts(jwks))).ok, true);
});

test("expired and not-yet-valid tokens are denied", async () => {
  const expired = await sign(good, "kid-good", { ...baseClaims(), exp: NOW - 120 });
  assert.equal((await verifyAccessJwt(expired, env, opts(jwks))).reason, "expired");
  const future = await sign(good, "kid-good", { ...baseClaims(), nbf: NOW + 600 });
  assert.equal((await verifyAccessJwt(future, env, opts(jwks))).reason, "not_yet_valid");
  const noExp = await sign(good, "kid-good", { ...baseClaims(), exp: undefined });
  assert.equal((await verifyAccessJwt(noExp, env, opts(jwks))).reason, "expired");
});

test("malformed tokens are denied without throwing", async () => {
  for (const bad of ["", "abc", "a.b", "a.b.c", "!!.!!.!!", `${b64url("{}")}.${b64url("{}")}.AAAA`]) {
    const r = await verifyAccessJwt(bad, env, opts(jwks));
    assert.equal(r.ok, false, `token ${JSON.stringify(bad)} should be denied`);
  }
});

test("JWKS unavailable fails closed", async () => {
  const token = await sign(good, "kid-good", baseClaims());
  const r = await verifyAccessJwt(token, env, { fetch: async () => new Response("x", { status: 503 }), now: () => NOW });
  assert.deepEqual(r, { ok: false, reason: "jwks_unavailable" });
});

test("optional email allowlist is enforced on the signed claim only", async () => {
  const envList = { ...env, ACCESS_ALLOWED_EMAILS: "Allowed@Example.com, other@example.com" };
  const ok = await sign(good, "kid-good", { ...baseClaims(), email: "allowed@example.com" });
  assert.equal((await verifyAccessJwt(ok, envList, opts(jwks))).ok, true);
  const no = await sign(good, "kid-good", { ...baseClaims(), email: "someone@example.com" });
  assert.equal((await verifyAccessJwt(no, envList, opts(jwks))).reason, "email_not_allowed");
  const none = await sign(good, "kid-good", { ...baseClaims(), email: undefined });
  assert.equal((await verifyAccessJwt(none, envList, opts(jwks))).reason, "email_not_allowed");
});

test("token is read from header first, then CF_Authorization cookie", () => {
  const h = new Request("https://x/", { headers: { "cf-access-jwt-assertion": " tok1 " } });
  assert.equal(extractToken(h), "tok1");
  const c = new Request("https://x/", { headers: { cookie: "a=b; CF_Authorization=tok2; z=1" } });
  assert.equal(extractToken(c), "tok2");
  assert.equal(extractToken(new Request("https://x/")), null);
});

test("denied response is 401, uncacheable and uniform", () => {
  const r = deniedResponse({ ok: false, reason: "expired" });
  assert.equal(r.status, 401);
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("worker: unauthenticated request never reaches the asset binding", async () => {
  let assetCalls = 0;
  const workerEnv = { ...env, ASSETS: { fetch: async () => { assetCalls++; return new Response("secret"); } } };
  const res = await worker.fetch(new Request("https://private.example/marketing.html"), workerEnv);
  assert.equal(res.status, 401);
  assert.equal(assetCalls, 0);
});

test("worker: unconfigured env denies everything including /healthz", async () => {
  const res = await worker.fetch(new Request("https://private.example/healthz"), { ASSETS: { fetch: async () => new Response("secret") } });
  assert.equal(res.status, 401);
});
