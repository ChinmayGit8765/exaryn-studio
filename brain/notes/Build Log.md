---
title: Build Log
type: note
tags: [log, history]
---

# Build Log

A running record of what changed and why. Newest first. Hand-maintained —
[[Timeline]] is the generated version built from repository dates.

## 2026-08 — the brain

Built the vault you are reading. Three moving parts: a GitHub API sweep into
`data/repos.json`, a generator that writes project and repo notes from JSON,
and a bundler that turns every `.md` in `brain/` into `data/brain.json` for the
browser. Added an **Agents** tab to the site as the front door. See
[[Brain Pipeline]] and [[Brain Indexer]].

Also: audited the project index against all 35 repositories and found several
real projects missing from it — [[TODO List]], [[Contact Flow]],
[[JSON API Simplifier]], [[PDF Compiler]] and the site itself. All now in
[[Projects Map]].

## 2026-08 — the daily machines

Three cron-driven products in quick succession: [[One Piece Guess]],
[[Side by Side]], and the daily signal on this site. All three landed on the
same skeleton, which is what turned it into a named pattern in
[[Agent Patterns]].

## 2026-08 — the fleet

[[Claude Work Manager]] and [[Worktree Optimiser]], built within weeks of each
other, both solving halves of the same problem: who is editing what, and what is
running where. Together they became [[Worktree Workflow]].

## 2026-06 → 2026-07 — the quant run

[[QuantLens]], [[VolForecast]] and [[QuantFlex]] overlapping. The through-line
was benchmarking honestly — analytic anchors in QuantFlex, GARCH/EWMA/HAR
baselines in VolForecast, tool-called numbers in QuantLens. Became principle 5
in [[Studio Principles]].

## 2026-02 → 2026-08 — Prompterjack

Six months, the longest single project. Started as prompt tooling, became agent
design once it was clear that topology mattered more than wording — see
[[Context Engineering]].

## 2025 — before the studio

[[PDF Compiler]], [[JSON API Simplifier]], and several gym-app attempts that
did not survive. Kept, because principle 8.

## Related

- [[Timeline]] · [[Roadmap]] · [[Studio Principles]] · [[Home]]
