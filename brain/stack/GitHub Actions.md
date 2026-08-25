---
title: GitHub Actions
type: stack
aliases: [GitHub Pages, Cron]
tags: [stack, ci,cron]
---

# GitHub Actions

The studio backend. Every scheduled system in the [[Cron Ledger]] is an Actions cron, and every static site here deploys from one.

The shape, repeated everywhere: cron fires → stdlib Python runs → JSON is committed with `[skip ci]` → Pages redeploys. No server, no database, no bill when nobody visits. See [[Agent Patterns]].

## Where it shows up

[[Exaryn Studio]] · [[One Piece Guess]] · [[Side by Side]] · [[Deploy Pipeline]] · [[Daily Signal Pipeline]] · [[Brain Pipeline]]
