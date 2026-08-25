---
title: Daily Signal Pipeline
type: system
tags: [system, cron, feeds]
schedule: "0 21 * * * (UTC)"
---

# Daily Signal Pipeline

The studio's oldest running automation and the template for everything else.

```
21:00 UTC  cron ──► scripts/digest.py ──► ~20 RSS/Atom feeds
                          │
                          ├─► data/digest.json      (today)
                          └─► data/archive/YYYY-MM-DD.json + index.json
                                     │
              git commit "digest: daily refresh [skip ci]"
                                     │
                          GitHub Pages redeploy
```

## Design decisions worth keeping

- **Per-kind caps and freshness windows.** News, papers and video each get
  their own limits, so a prolific arXiv day cannot bury the news.
- **Archive every run.** The feed page's day-by-day browser is free once every
  run writes a dated file. Costs a few KB, buys a whole feature.
- **`[skip ci]` on the commit.** Otherwise the digest commit triggers the push
  workflow, which triggers a deploy, forever.
- **A dead feed is a warning.** Never a build failure. Yesterday's data stays
  live until a good run replaces it.

## Related

- [[Digest Bot]] · [[Cron Ledger]] · [[Deploy Pipeline]] · [[Exaryn Studio]]
