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
- [ ] **[[QuantFlex]]** — exotics and basket coverage, keep every Greek triple-verified
- [ ] **[[ALFRED]]** — Conductor tuning against real capacity data
- [ ] **[[Worktree Optimiser]]** — round out the [[Worktree MCP Server]] tool surface
- [ ] **[[Gartic Hands]]** — semester project, round state machine hardening

## Next — queued

- [ ] Give [[QuantFlex]] a stable public deploy rather than a landing page with sampled output
- [ ] Publish the [[Claude Work Manager]] setup as a one-command install
- [ ] Backfill READMEs on the public repos in [[Repos Map]] so the sweep has something to quote
- [ ] Add per-project dev-time tracking to [[Build Log]] instead of estimating after the fact

## Brain / site

- [x] Build the brain as a real Obsidian vault under `brain/`
- [x] Sweep metadata from the public repos into `data/repos.json`
- [x] Keep private repositories out of everything published
- [x] Publish the vault in the browser with backlinks, tags, search and a graph
- [x] Add an **Agents** tab to the site linking into the brain
- [x] Put every project in the index, including the ones that were missing
- [x] Demote the token figure — the front page now leads with counted numbers
- [ ] **Wire the token figure to something measured, or drop it.** Still the only
      hand-updated number on the site. Nothing reports Claude usage back, so the
      options are: log it per session from the CLI into `data/stats.json`, replace
      it with a genuinely measured proxy (commits, or lines changed across the
      public repos), or cut it. Until then it carries an `EST.` flag and the date
      it was last touched — see [[Open Questions]].
- [ ] Per-note "last touched" dates from git history rather than frontmatter

## Someday / maybe

- [ ] Write up the three rewrites behind [[Solo Strength Quest]] as a story, without naming closed repos
- [ ] A written post-mortem note for each archived repo — [[PDF Compiler]] first
- [ ] Let the brain graph filter by tag, not just by note type

## Related

- [[Home]] · [[Build Log]] · [[Open Questions]] · [[Projects Map]]
