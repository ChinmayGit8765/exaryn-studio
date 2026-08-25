---
title: Exaryn Brain
type: meta
tags: [meta, vault]
---

# Exaryn Brain

This folder is a real [Obsidian](https://obsidian.md) vault. Every note is a
plain `.md` file with YAML frontmatter and `[[wikilinks]]` — no plugins
required, no proprietary format, nothing that stops working if Obsidian does.

## Two ways to read it

| Where | How |
| --- | --- |
| **In Obsidian** | *Open folder as vault* → pick this `brain/` directory. Graph view, backlinks and search all work out of the box. |
| **In the browser** | [`/brain.html`](../brain.html) on the site — the same notes, with backlinks, tags, search and a graph, rendered from `data/brain.json`. |

## Layout

```
brain/
  Home.md            entry point — start here
  maps/              maps of content: the hubs everything hangs off
  agents/            the agent structure — every autonomous thing built here
  projects/          one note per project        (generated from data/projects.json)
  repos/             one note per GitHub repo    (generated from data/repos.json)
  systems/           the pipelines and cron jobs that keep the studio running
  stack/             one note per technology, backlinked to what uses it
  notes/             principles, roadmap, build log, glossary, open questions
```

## Generated vs hand-written

Notes under `projects/` and `repos/`, plus a few maps, carry
`generated: true` in their frontmatter and a banner at the top. **Do not edit
those by hand** — they are rebuilt from `data/projects.json` and
`data/repos.json` by `scripts/brain.py`, and your edits will be overwritten.

Everything else is hand-written and safe to edit in Obsidian.

## Rebuilding

```sh
npm run repos    # refresh data/repos.json from the GitHub API
npm run brain    # regenerate the generated notes + bundle data/brain.json
```

`npm run brain` is what makes the vault visible on the site: it walks every
`.md` file here, resolves the wikilinks into a graph, and writes one
`data/brain.json` the browser reads. The morning cron runs both.

See [[Brain Pipeline]] for how that works, and [[Home]] to start reading.
