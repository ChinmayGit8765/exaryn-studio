---
title: Deploy Pipeline
type: system
tags: [system, ci, pages]
---

# Deploy Pipeline

`.github/workflows/site.yml`. One workflow does both jobs — regenerate and
deploy — with the trigger deciding which.

| Trigger | Regenerates data? | Deploys? |
| --- | --- | --- |
| `push` to `main` | no | yes |
| `schedule` (21:00 UTC) | yes | yes |
| `workflow_dispatch` | yes | yes |

A plain push deploys what you committed. A cron or manual run refreshes the
digest, repo metadata and brain bundle first, commits anything that changed
with `[skip ci]`, then deploys.

## Why the split

Pushing should be fast and predictable — you deploy exactly what you wrote.
Regenerating on every push would mean the site content depends on when you
pushed, which makes rollbacks lie.

## Concurrency

The `pages` concurrency group with `cancel-in-progress: false` means two runs
queue rather than racing. A cancelled Pages deploy can leave the site on a
half-published artifact, which is worse than waiting.

## Related

- [[Daily Signal Pipeline]] · [[Brain Pipeline]] · [[GitHub Actions]] · [[Cron Ledger]]
