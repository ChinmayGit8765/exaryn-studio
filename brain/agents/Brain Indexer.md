---
title: Brain Indexer
type: agent
tier: 1
tags: [agent, cron, meta]
project: Exaryn Studio
repo: ChinmayGit8765/exaryn-studio
---

# Brain Indexer

The newest bot, and the one that makes this vault readable on the web.
Two scripts, run in order by the morning cron.

## `scripts/repos.py`

Sweeps the GitHub API for every repository under the account, keeps the fields
that matter (language breakdown, topics, licence, sizes, timestamps, README
blurb) and writes `data/repos.json`. Anything a run cannot reach keeps its
previous values rather than being blanked.

## `scripts/brain.py`

Two jobs:

1. **Generate** — writes one note per project into `brain/projects/` and one
   per repository into `brain/repos/`, from `data/projects.json` and
   `data/repos.json`. Those files are marked `generated: true`; hand edits get
   overwritten.
2. **Bundle** — walks every `.md` in `brain/`, parses frontmatter, resolves
   `[[wikilinks]]` into a real link graph with backlinks, and writes
   `data/brain.json`. That single file is what `brain.html` reads.

## Why bundle instead of fetching files

GitHub Pages has no directory listing, so a browser cannot discover the vault
by walking it. One bundle means one request, instant search across every note,
and a graph that already knows every edge before the first render.

## Related

- [[Brain Pipeline]] · [[Exaryn Studio]] · [[Agent Patterns]] · [[Python]]
