---
title: Brain Pipeline
type: system
tags: [system, cron, meta]
schedule: "0 21 * * * (UTC)"
---

# Brain Pipeline

How this vault stays true and how it reaches the browser.

```
GitHub API ──► scripts/repos.py ──► data/repos.json
                                          │
data/projects.json ───────────────────────┤
                                          ▼
                              scripts/brain.py
                                  │        │
              brain/projects/*.md │        │ brain/repos/*.md   (generated)
                                  │        │
              every .md in brain/ ┴────────┴──► data/brain.json  (bundle)
                                                      │
                                                 brain.html
```

## Two halves

**Generation.** Project and repo notes are written from data, not by hand, so
they cannot drift from `data/projects.json` and `data/repos.json`. They carry
`generated: true` and a banner.

**Bundling.** Every markdown file in `brain/` — generated or hand-written — is
parsed, its frontmatter read, its `[[wikilinks]]` resolved, and the whole thing
written to one `data/brain.json` with a full link graph and backlink index.

## Why a bundle

GitHub Pages serves files, not directory listings. A browser has no way to
discover 90 markdown files by crawling. One bundle gives the viewer instant
full-text search, an already-computed graph, and a single network request.

## Running it

```sh
npm run repos    # refresh repo metadata  (needs network + GITHUB_TOKEN)
npm run brain    # regenerate notes + bundle
```

`brain.py` never needs the network. If `repos.py` cannot reach GitHub, the
previous `data/repos.json` is used unchanged and the vault still rebuilds.

## Related

- [[Brain Indexer]] · [[Deploy Pipeline]] · [[Exaryn Studio]] · [[Cron Ledger]]
