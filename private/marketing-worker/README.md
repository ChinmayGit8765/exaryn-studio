# Private marketing workspace host (EXA-59)

A Cloudflare Worker that serves the existing `workspace/` marketing notebook to
authenticated studio members only. It does not change the workspace itself:
records still live in the visitor's browser (`localStorage`), export/import
still work, and nothing here is cloud sync or a social integration.

## How access is enforced

1. A Cloudflare Access application in front of the `workers.dev` hostname with an
   explicit allow policy (named emails, one-time PIN or verified identity). The
   policy lives in Cloudflare only; no email address is written in this repo.
2. The Worker independently verifies the Access JWT (`Cf-Access-Jwt-Assertion`
   header or `CF_Authorization` cookie) on every request before touching the
   asset binding: RS256 signature against the team JWKS, issuer, audience,
   `exp`/`nbf`/`iat`. Anything missing or invalid is a uniform `401` with
   `Cache-Control: no-store`. If the secrets are absent the Worker denies
   everything, so a mis-deploy cannot leak the workspace.
3. `run_worker_first = true` and `preview_urls = false` ensure there is no asset
   route or version-preview hostname that skips the gate.

## Deploy (coordinator only)

```sh
cd private/marketing-worker
npm test                                   # 16 gate tests
npx -y wrangler@4 deploy --dry-run --outdir /tmp/dry
npx -y wrangler@4 secret put ACCESS_TEAM_DOMAIN   # <team>.cloudflareaccess.com
npx -y wrangler@4 secret put ACCESS_AUD           # Access application AUD tag
npx -y wrangler@4 deploy
```

Then create the Access application for the deployed hostname, attach the allow
policy, and run the denial checks (anonymous request, wrong identity) plus one
authorised sign-in before calling it ready. Rollback: `wrangler rollback` or
`wrangler delete`; the public GitHub Pages site is untouched by this Worker.

Local check without any Cloudflare account: `npx -y wrangler@4 dev` and observe
that every path returns `401` until the two secrets exist.
