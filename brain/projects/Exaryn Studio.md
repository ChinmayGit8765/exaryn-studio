---
title: Exaryn Studio
type: project
tags: [project, infrastructure]
status: shipped
year: 2026
category: Infrastructure
repo: ChinmayGit8765/exaryn-studio
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Exaryn Studio

*This site — portfolio, daily AI signal digest, and the Obsidian brain.*

The studio's own site: a pure static portfolio with no framework and no build step, a self-updating daily AI digest rebuilt every morning by a GitHub Actions cron, and the Exaryn Brain — an Obsidian vault of markdown notes about everything built here, browsable in-page with backlinks and a graph view.

## How it is put together

No framework, no build step. HTML pages fetch JSON out of `/data`; Python scripts in `/scripts` regenerate that JSON on a cron; GitHub Actions commits the result and redeploys Pages.

## What is actually in it

- Zero dependencies — the whole site is HTML, CSS and one JS file per surface
- Daily AI digest with a browsable day-by-day archive
- Repo metadata swept from the GitHub API into `data/repos.json`
- The Exaryn Brain: a real Obsidian vault, readable in the browser
- Everything regenerates on one morning cron

## What it taught

> A static site that regenerates itself is the cheapest infrastructure there is. The cron job is the whole backend.

## Facts

| | |
| --- | --- |
| Status | shipped |
| Year | 2026 |
| Dev time | ongoing |
| Category | Infrastructure |
| Repository | [ChinmayGit8765/exaryn-studio](https://github.com/ChinmayGit8765/exaryn-studio) |
| Primary language | HTML |
| Size | 769 KB |
| Licence | none declared |
| Created | 2026-08-17 |
| Last push | 2026-08-26 |
| Visibility | public |
| Language mix | HTML 41.3%, CSS 22.2%, JavaScript 19.0%, Python 17.4% |

## Stack

[[Vanilla JS]] · CSS · [[Python]] · [[GitHub Actions]] · [[GitHub Pages]] · Obsidian

## Agents

[[Digest Bot]] · [[Brain Indexer]]

## Links

[Live](https://chinmaygit8765.github.io/exaryn-studio/) · [Source](https://github.com/ChinmayGit8765/exaryn-studio)

## Related

[[Projects Map]] · [[Home]]
