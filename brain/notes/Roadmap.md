---
title: Roadmap
type: note
tags: [todo, roadmap, planning]
pinned: true
---

# Roadmap — the todo list

The studio's actual todo list. Hand-maintained: edit this file in Obsidian and
it shows up on the site the next time [[Brain Indexer]] runs. Checked boxes
render as checked in the browser.

> [!note] Not the same thing as the [[TODO List]] project
> [[TODO List]] is a .NET + Angular app in the index. *This* note is the list of
> what the studio is doing next.

## Now — in flight

- [ ] **[[Solo Strength Quest]]** — third attempt; Rust/Axum API and Flutter client both moving
- [ ] **[[QuantFlex]]** — keep the live workbench honest: show the checks that ran, don't over-claim JAX on the live API
- [ ] **[[holdem-ml]]** — public home is documentation-only until source lands
- [ ] **[[ALFRED]]** — Conductor tuning against real capacity data
- [ ] **[[Worktree Optimiser]]** — round out the [[Worktree MCP Server]] tool surface
- [ ] **[[Gartic Hands]]** — semester project, round state machine hardening

## Next — queued

- [x] Give [[QuantFlex]] a public workbench (`app.quantflex.dev`) and a landing page with recorded engine output
- [ ] Publish the [[Claude Work Manager]] setup as a one-command install
- [ ] Backfill READMEs on the older repos in [[Repos Map]] so the sweep has something to quote
- [ ] Add per-project dev-time tracking to [[Build Log]] instead of estimating after the fact

## Brain / site

- [x] Build the brain as a real Obsidian vault under `brain/`
- [x] Sweep public repository metadata into `data/repos.json` (private rows are not published)
- [x] Label the home-page token figure as an unmeasured estimate
- [x] Publish the vault in the browser with backlinks, tags, search and a graph
- [x] Add an **Agents** tab to the site linking into the brain
- [x] Put every project in the index, including the ones that were missing
- [ ] Wire the token meter to something measured rather than hand-updated, or keep it labelled unmeasured
- [ ] Per-note "last touched" dates from git history rather than frontmatter

## Ideas — new projects, now that concurrency is down pat

- [ ] **Foreman** — one step above [[Claude Work Manager]]: point a fleet at a
      *backlog* instead of a prompt. Issues go in a queue, agents claim one each
      in their own worktree, a reviewer agent gates the PRs, a human merges.
      The dashboard already exists; this is the pipeline on top.
- [ ] **One Piece Guess — duel mode** — realtime head-to-head daily riddle
      (same character, race to fewer guesses) on Cloudflare Durable Objects.
      Concurrency in product form, and a live case study for the
      Cloudflare-vs-AWS note.
- [ ] **QuantFlex parallel pricing farm** — fan a Monte Carlo run out across
      worker processes/machines and aggregate over SSE; the anchor tests make
      distributed-vs-single equivalence *provable*, which is the whole trick.
- [ ] **Solo Strength Quest live raids** — shared boss fights: a weekly
      community lift target hammered concurrently by every hunter's logged
      sets, over websockets on the Rust/Axum side.

## Someday / maybe

- [ ] A written post-mortem note for archived public work — [[PDF Compiler]] first
- [ ] Let the brain graph filter by tag, not just by note type

## Related

- [[Home]] · [[Build Log]] · [[Open Questions]] · [[Projects Map]]
