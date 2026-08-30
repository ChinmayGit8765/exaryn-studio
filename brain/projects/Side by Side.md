---
title: Side by Side
type: project
tags: [project, games-play]
status: shipped
year: 2026
category: Games & Play
repo: ChinmayGit8765/collingwood-fan-suite
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Side by Side

*A self-updating Collingwood super-fan suite — reskinnable for any AFL club.*

Next-game countdown, form guide, live ladder and a daily news sweep, rebuilt every morning by a cron job from the free Squiggle API and Google News. Everything club-specific lives in one config file — fork it, edit club.json, and it's your club's suite.

## How it is put together

Same shape as One Piece Guess: cron job, Python fetcher, committed JSON, static Pages. Everything club-specific is isolated in `club.json` so the suite reskins by config, not by fork-and-edit.

## What is actually in it

- Next-game countdown, form guide and live ladder from the free Squiggle API
- Daily news sweep via Google News
- Reskins to any AFL club by editing one config file
- Rebuilt every morning by a cron job — nothing to host

## What it taught

> Config file over fork. Making the club swappable took an hour and turned a personal page into something anyone can use.

## Facts

| | |
| --- | --- |
| Status | shipped |
| Year | 2026 |
| Dev time | a weekend |
| Category | Games & Play |
| Repository | [ChinmayGit8765/collingwood-fan-suite](https://github.com/ChinmayGit8765/collingwood-fan-suite) |
| Primary language | CSS |
| Size | 41 KB |
| Licence | none declared |
| Created | 2026-08-24 |
| Last push | 2026-08-30 |
| Visibility | public |
| Language mix | CSS 32.4%, JavaScript 24.7%, Python 22.1%, HTML 20.8% |

## Stack

[[Vanilla JS]] · [[Python]] · Squiggle API · [[GitHub Actions]]

## Agents

[[Fan Suite Bot]]

## Links

[Live](https://chinmaygit8765.github.io/collingwood-fan-suite/) · [Source](https://github.com/ChinmayGit8765/collingwood-fan-suite)

## Related

[[Projects Map]] · [[Home]]
