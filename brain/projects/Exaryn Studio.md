---
title: Exaryn Studio
type: project
tags: [project, infrastructure]
status: available
year: 2026
category: Infrastructure
generated: true
repo: ChinmayGit8765/exaryn-studio
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Exaryn Studio

*This site — public portfolio, daily AI signal, and an Obsidian vault in the browser.*

The studio's public front door: static HTML with no framework and no build step, a daily AI digest rebuilt by a GitHub Actions cron, and the Exaryn Brain — an Obsidian vault of markdown notes, browsable in-page. Generated repository metadata is public-only.

## How it is put together

No framework, no build step. HTML pages fetch JSON out of `/data`; Python scripts in `/scripts` regenerate that JSON on a cron; GitHub Actions commits the result and redeploys Pages.

## What is actually in it

- Zero install for readers — HTML, CSS and one JS file per surface
- Daily AI digest with a browsable day-by-day archive
- Public repo metadata swept into data/repos.json
- The Exaryn Brain: a real Obsidian vault, readable in the browser

## What it taught

> A static site that regenerates itself is the cheapest infrastructure there is. The cron job is the whole backend.

## Facts

| | |
| --- | --- |
| Status | available |
| Year | 2026 |
| Dev time | ongoing |
| Category | Infrastructure |
| Repository | [ChinmayGit8765/exaryn-studio](https://github.com/ChinmayGit8765/exaryn-studio) |
| Primary language | JavaScript |
| Size | 2.9 MB |
| Licence | none declared |
| Created | 2026-08-17 |
| Last push | 2026-09-22 |
| Visibility | public |
| Language mix | JavaScript 53.5%, HTML 22.5%, CSS 14.5%, Python 9.5% |

## Stack

[[Vanilla JS]] · CSS · [[Python]] · [[GitHub Actions]] · [[GitHub Pages]] · Obsidian

## Agents

[[Digest Bot]] · [[Brain Indexer]]

## Links

[Live](https://chinmaygit8765.github.io/exaryn-studio/) · [Source](https://github.com/ChinmayGit8765/exaryn-studio)

## Related

[[Projects Map]] · [[Home]]
