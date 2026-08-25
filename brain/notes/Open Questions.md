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

## Is the token figure measuring anything?

No, and it is now the only number on the site that isn't.

It used to be the boldest thing on the front page: a full-width meter, a
progress bar against an invented end-of-year goal, and an "API-equivalent"
dollar figure that multiplied one estimate by another and read as a
measurement. That has been cut back. The front page now leads with figures
counted from `data/` at load time — projects, public repos, agents, guides,
brain notes — and the token estimate sits after them, smaller, flagged `EST.`
and stamped with the date it was last touched, so a stale number looks stale.

The question that remains is whether to keep it at all. Three honest options:

1. **Measure it.** Log usage per session from the CLI into `data/stats.json`.
   Real, but it is a build step and a habit, and habits lapse.
2. **Replace it** with a measured proxy — commits, or lines changed across the
   public repos. Weaker as a claim, but true without anyone remembering to
   update it.
3. **Cut it.** "AI-native studio" is already evidenced by the work itself.

Currently: option zero, honestly labelled. See [[Roadmap]].

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
