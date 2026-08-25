---
title: Fan Suite Bot
type: agent
tier: 1
tags: [agent, cron, sport]
project: Side by Side
repo: ChinmayGit8765/collingwood-fan-suite
---

# Fan Suite Bot

Rebuilds [[Side by Side]] every morning: next-game countdown, form guide, live
ladder from the free Squiggle API, plus a news sweep from Google News.

## The config-file trick

Everything club-specific lives in `club.json`. Fork the repo, edit one file,
and it is your club's suite — no code changes. That took about an hour and is
the difference between a personal page and something anyone can use.

## Same skeleton, different data

Structurally identical to [[Pirate Picker]] and [[Digest Bot]]: cron, Python,
committed JSON, static Pages. Three unrelated products, one mechanism.

## Related

- [[Side by Side]] · [[Agent Patterns]] · [[Cron Ledger]] · [[Python]]
