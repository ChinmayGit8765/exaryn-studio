---
title: Cron Ledger
type: system
tags: [system, cron, index]
---

# Cron Ledger

Everything in the studio that runs without being asked.

| Job | Schedule | Repo | Writes | Note |
| --- | --- | --- | --- | --- |
| Daily signal | `0 21 * * *` UTC | `exaryn-studio` | `data/digest.json`, `data/archive/` | [[Digest Bot]] |
| Repo sweep | `0 21 * * *` UTC | `exaryn-studio` | `data/repos.json` | [[Brain Indexer]] |
| Brain bundle | `0 21 * * *` UTC | `exaryn-studio` | `brain/**`, `data/brain.json` | [[Brain Indexer]] |
| Daily pirate | morning | `one-piece-guess-game` | the day's character | [[Pirate Picker]] |
| Fan suite refresh | morning | `collingwood-fan-suite` | fixtures, ladder, news | [[Fan Suite Bot]] |

21:00 UTC is ~7am Melbourne in winter and ~8am in summer. Nothing here is
precise enough for that to matter.

## Shared failure policy

Every one of these jobs follows the same rule: a failed fetch is a logged
warning, never a failed build, and the previous good data stays live. The site
degrades to *slightly stale* rather than *broken*.

## Related

- [[Daily Signal Pipeline]] · [[Brain Pipeline]] · [[Deploy Pipeline]] · [[Agent Patterns]]
