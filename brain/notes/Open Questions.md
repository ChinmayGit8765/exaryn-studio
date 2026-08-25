---
title: Open Questions
type: note
tags: [questions, unresolved]
---

# Open Questions

Things genuinely unresolved. Kept here so they stop being re-litigated from
scratch every few weeks.

## How autonomous should tier 3 get?

[[ALFRED Conductor]] is the only agent here allowed to plan across time and act
on its own schedule. The [[Tool Safety]] envelope makes that survivable, but the
honest answer to *how much should it decide alone* is still unknown. Every
increase in autonomy has so far been paid for with an increase in audit surface.

## Is the token meter measuring anything?

The number on the site's front page is hand-updated and the dollar figure is a
blended estimate. Either wire it to something real or label it more loudly than
"APPROX." — see [[Roadmap]].

## How much of the closed work should be visible?

Several projects have closed codebases — [[Prompterjack]] most obviously, and
the earlier attempts that led to [[Solo Strength Quest]]. Right now the site
names none of them: private repositories are excluded from `data/repos.json`
outright, and a project with a closed codebase simply says so and links to the
live product.

That is the right default. The open question is whether the *history* is worth
telling anyway — the three rewrites behind Solo Strength Quest are a genuinely
useful story — and how to tell it without turning [[Repos Map]] into an index
of things nobody can open.

## Should generated notes be committed at all?

`brain/projects/` and `brain/repos/` are generated but committed, so the vault
works in Obsidian straight out of a clone. The cost is noisy diffs on every
sweep. The alternative — generate on demand — breaks the offline vault.
Currently: committed, noise accepted.

## Where does the line sit between a project and an experiment?

[[JSON API Simplifier]] is forty lines and gets used constantly.
[[PDF Compiler]] is a weekend that went nowhere. Both are in the index; only one
of them is a project in any meaningful sense, and no rule currently separates
them.

## Related

- [[Studio Principles]] · [[Roadmap]] · [[Build Log]]
