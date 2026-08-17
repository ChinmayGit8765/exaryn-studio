# Exaryn ✳

The studio site — a portfolio of everything Exaryn has built, plus **The Daily
Signal**: a scrollable digest of AI news, papers, and videos that rebuilds
itself every morning on a GitHub Actions cron.

Pure static site. No framework, no build step, no dependencies.

```
index.html              the whole site (one page)
assets/style.css        design system — paper, hairlines, serif, one accent
assets/app.js           renders projects + digest from JSON
data/projects.json      the portfolio — edit this to add/update projects
data/digest.json        generated daily, don't edit by hand
scripts/digest.py       feed puller (stdlib-only Python)
.github/workflows/      daily cron + GitHub Pages deploy
```

## Run locally

```sh
npm run dev
# open http://localhost:3000
```

(Uses `npx serve` under the hood — no install step. `python -m http.server 8080`
works too. `fetch()` needs http, so opening `index.html` straight from disk
won't load data.)

Rebuild the digest whenever:

```sh
npm run digest   # = python scripts/digest.py
```

## Ship it

1. Create a GitHub repo and push this to `main`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Done. Every push deploys; every morning (~7am Melbourne) the cron
   refreshes `data/digest.json`, commits it, and redeploys.

## Add a project

Append an object to `data/projects.json`:

```json
{
  "name": "Thing",
  "tagline": "One line on what it does.",
  "tech": ["TypeScript", "Postgres"],
  "status": "shipped",            // or "in development" / "prototype"
  "year": "2026",
  "links": { "live": "https://…", "repo": "https://github.com/…" }
}
```

## Tune the digest

Edit the `FEEDS` list in `scripts/digest.py`. Any RSS or Atom URL works;
YouTube channels use `https://www.youtube.com/feeds/videos.xml?channel_id=…`
(channel ID is on the channel page → About → Share → Copy channel ID).
Caps and freshness windows are the constants right below the list.
A feed that dies just logs a warning — it never breaks the build.
