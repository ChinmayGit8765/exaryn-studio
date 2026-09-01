# Exaryn ✳

The studio site — a portfolio of everything Exaryn has built, **The Daily
Signal** (a digest of AI news, papers and videos that rebuilds itself every
morning on a GitHub Actions cron), and **the Exaryn Brain**: an Obsidian vault
of markdown notes about every project, agent, system and repo, readable in the
browser with backlinks, tags, search and a graph.

Pure static site. No framework, no build step, no dependencies.

```
index.html              landing — hero + work + brain + feed teaser
projects.html           full project index (click a row to expand details)
agents.html             the agent struct — tiers, rules, everything built
brain.html              the Obsidian vault, rendered in the browser
feed.html               full daily signal with filters
play.html               One Piece Guess, embedded

assets/style.css        design system — paper, hairlines, serif, one accent
assets/app.js           projects + digest + token meter (page-aware)
assets/agents.js        the agent struct page
assets/brain.js         markdown renderer, wikilinks, backlinks, graph

brain/                  THE VAULT — real .md files, open it in Obsidian
data/projects.json      the portfolio — edit this to add/update projects
data/repos.json         generated: metadata swept from the GitHub API
data/brain.json         generated: the whole vault bundled for the browser
data/digest.json        generated daily, don't edit by hand

scripts/digest.py       feed puller (stdlib-only Python)
scripts/repos.py        GitHub metadata sweep
scripts/brain.py        vault generator + bundler
scripts/llms.py         llms.txt + llms-full.txt generator
.github/workflows/      daily cron + GitHub Pages deploy

llms.txt                generated: the site mapped for LLMs and agents
llms-full.txt           generated: the same, with everything inlined
```

## Run locally

```sh
npm run dev
# open http://localhost:3000
```

(Uses `npx serve` under the hood — no install step. `python -m http.server 8080`
works too. `fetch()` needs http, so opening `index.html` straight from disk
won't load data.)

Regenerate things:

```sh
npm run digest   # data/digest.json     — the daily signal
npm run repos    # data/repos.json      — GitHub metadata sweep (needs network)
npm run brain    # brain/** + data/brain.json — the vault and its bundle
npm run llms     # llms.txt + llms-full.txt — the site, mapped for machines
npm run build    # all four, in order
```

## The Exaryn Brain

`brain/` is a real [Obsidian](https://obsidian.md) vault — plain `.md` files
with YAML frontmatter and `[[wikilinks]]`, no plugins required. There are two
ways to read it:

- **In Obsidian** — *Open folder as vault* → pick `brain/`. Graph, backlinks
  and search work out of the box.
- **In the browser** — `brain.html`, linked from the **Agents** tab. Same
  notes, rendered from `data/brain.json`.

Start at [`brain/Home.md`](brain/Home.md); the hub everything hangs off is
[`brain/maps/Agent Structure.md`](brain/maps/Agent%20Structure.md), and the
studio's todo list is [`brain/notes/Roadmap.md`](brain/notes/Roadmap.md).

### Hand-written vs generated

Notes under `brain/projects/` and `brain/repos/`, plus `Projects Map`,
`Repos Map`, `Timeline` and `Agent Ledger`, carry `generated: true` and are
rewritten by `scripts/brain.py` from `data/projects.json` and
`data/repos.json` — **do not edit those by hand.** Everything else is
hand-written; edit it in Obsidian and run `npm run brain` to publish it.

### Adding a note

Drop a `.md` file anywhere under `brain/` with frontmatter:

```markdown
---
title: My Note
type: note          # note | map | agent | system | stack | project | repo
tags: [practice, agents]
aliases: [Another Name]
---

# My Note

Body text, with [[Home]] and [[Agent Structure]] wikilinks.
```

Then `npm run brain`. The bundler resolves the links, computes backlinks, and
the note appears in the browser view and the graph. `type` decides its colour;
`aliases` let other notes link to it by any of those names.

An `agents/` note with `type: agent` and a `tier:` of 1, 2 or 3 also shows up
automatically on `agents.html` and in the Agent Ledger.

## llms.txt

`llms.txt` and `llms-full.txt` are the site described for LLMs and agents, in the
[llmstxt.org](https://llmstxt.org) shape. The pages here are static HTML and
perfectly readable, so these files are a map rather than a substitute: every
page, all 17 projects with status and stack, the essays, the shape of the vault,
and — the part that is genuinely hard to discover by crawling — the fact that
all of it is available as plain JSON under `data/`.

`llms-full.txt` expands that with each project's full description, architecture
and lessons, plus every hand-written note in the brain. Generated notes are left
out; they are derived from `data/projects.json` and `data/repos.json`, which the
file already covers.

Both are built by `scripts/llms.py` from the same data the site reads, so they
cannot drift from it. The workflow regenerates them on **every** event, pushes
included, so a hand edit to `data/projects.json` can never deploy behind a stale
map. Neither file carries a timestamp — with a daily cron, a date line would
churn the history whether or not anything changed.

Run `npm run llms` after editing `data/projects.json` or `data/articles.json` if
you want to see the result before pushing.

## Add a project

Append an object to `data/projects.json`:

```json
{
  "name": "Thing",
  "slug": "thing",
  "tagline": "One line on what it does.",
  "description": "A paragraph for the expanded row and the brain note.",
  "tech": ["TypeScript", "Postgres"],
  "status": "shipped",
  "year": "2026",
  "devTime": "~2 weeks",
  "category": "Web & Product",
  "repo": "ChinmayGit8765/thing",
  "agents": ["Some Agent Note"],
  "architecture": "How it's put together, in two or three sentences.",
  "highlights": ["What's actually in it", "One bullet each"],
  "lessons": "The one thing it taught.",
  "links": { "live": "https://…", "repo": "https://github.com/…" }
}
```

`name`, `tagline`, `tech`, `status`, `year` and `links` drive the site index;
everything else enriches the generated brain note. Run `npm run brain` after
editing.

## Tune the digest

Edit the `FEEDS` list in `scripts/digest.py`. Any RSS or Atom URL works;
YouTube channels use `https://www.youtube.com/feeds/videos.xml?channel_id=…`
(channel ID is on the channel page → About → Share → Copy channel ID).
Caps and freshness windows are the constants right below the list.
A feed that dies just logs a warning — it never breaks the build.

## The repo sweep

`scripts/repos.py` pulls every repository on the account into
`data/repos.json` — language breakdown, topics, licence, sizes, timestamps and
a README blurb. It runs unauthenticated against the public search API, so it
works out of the box in CI. To include **private** repositories, add a personal
access token with `repo` scope as a repository secret and pass it as `GH_PAT`
in the workflow. Repos already recorded as private are kept across a run that
cannot see them, so a sweep without a PAT never deletes them.

## Ship it

1. Create a GitHub repo and push this to `main`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Done. Every push deploys; every morning (~7am Melbourne) the cron
   refreshes the digest, sweeps repo metadata, rebuilds the brain, commits
   whatever changed, and redeploys.
