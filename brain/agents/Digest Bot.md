---
title: Digest Bot
type: agent
tier: 1
tags: [agent, cron, feeds]
project: Exaryn Studio
repo: ChinmayGit8765/exaryn-studio
---

# Digest Bot

`scripts/digest.py`. Rebuilds the studio's daily AI signal every morning at
21:00 UTC — roughly 7–8am Melbourne, which is the only timezone that matters
here.

## What it sweeps

Around twenty RSS and Atom feeds across three kinds:

- **news** — Hacker News, TechCrunch AI, The Verge, VentureBeat, MIT Tech
  Review, Hugging Face, Google AI, OpenAI, Simon Willison
- **papers** — arXiv `cs.AI` and `cs.LG`
- **video** — YouTube channel feeds (Fireship, Two Minute Papers, AI Explained,
  3Blue1Brown and others)

Each kind has its own per-source cap and freshness window, so papers cannot
drown out news and one prolific channel cannot take the whole page.

## Failure behaviour

A dead feed logs a warning and is skipped. It never fails the build, and
yesterday's `digest.json` stays live until a good run replaces it. Every run is
also archived by date, which is where the day-by-day archive on the feed page
comes from.

## Stdlib only

No pip install in CI. `urllib` and `xml.etree` do the whole job, which means
the workflow has no dependency that can break on a Tuesday.

## Related

- [[Daily Signal Pipeline]] · [[Exaryn Studio]] · [[Agent Patterns]] · [[GitHub Actions]] · [[Python]]
