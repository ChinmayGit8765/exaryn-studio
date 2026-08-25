---
title: Systems Map
type: map
tags: [moc, systems, infra]
---

# Systems Map

The parts of the studio that run without anyone watching.

## The pipelines

- [[Daily Signal Pipeline]] — ~20 feeds → `data/digest.json` → the feed page, every morning
- [[Brain Pipeline]] — GitHub API → repo notes → `data/brain.json` → this vault in the browser
- [[Deploy Pipeline]] — one workflow, two behaviours: push deploys, cron regenerates then deploys
- [[Worktree Workflow]] — how parallel work is isolated, for humans and agents alike

## The schedule

[[Cron Ledger]] is the full table of everything scheduled. All of it fires at
21:00 UTC, which is morning in Melbourne, and all of it follows the same
failure policy: a dead source is a warning, never a failed build, and the last
good data stays live.

## The shape they share

```
cron ──► stdlib python ──► JSON in data/ ──► git commit [skip ci] ──► Pages
```

That is the entire studio backend. It costs nothing when nobody visits, every
run is a diffable commit, and a regression is bisectable. See
[[Agent Patterns]] and principle 1 in [[Studio Principles]].

## Related

- [[Agent Structure]] · [[Stack Map]] · [[GitHub Actions]] · [[Home]]
