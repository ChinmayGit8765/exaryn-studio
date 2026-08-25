---
title: Studio Principles
type: note
tags: [principles, practice]
---

# Studio Principles

The handful of rules that survived contact with reality. Each one is here
because breaking it cost something.

## 1. The cron job is the backend

If a thing can be a scheduled script that commits JSON to a static site, it
should be. No server to keep alive, no database to back up, no bill when nobody
visits, and every run is a diffable git commit. Three unrelated products —
[[One Piece Guess]], [[Side by Side]], [[Exaryn Studio]] — run on the identical
mechanism. See [[Agent Patterns]].

## 2. Isolate, don't coordinate

The hard part of running several agents is not reasoning, it is write
conflicts. A worktree each, a container each, a local model each. Delete the
conflict instead of managing it. See [[Worktree Workflow]].

## 3. Gate before consequence

Compile before write. Allowlist before call. Human before push. It turns "the
model is usually right" into "the output is always valid", which is a different
product. See [[Tool Safety]] and [[smartc Patcher]].

## 4. Narrate, never calculate

A model may describe a number it was handed. It may not produce one. This is
the only reason [[QuantLens]] is safe to demo.

## 5. Write the oracle before the solver

[[QuantFlex]]'s analytic anchors caught more bugs than its unit tests did.
[[VolForecast]] built GARCH, EWMA and HAR baselines before the model it wanted
to ship — which is what made the result honest rather than flattering.

## 6. One command to run it

[[QuantLens]] and [[Contact Flow]] both come up with a single
`docker compose up`, seed data included. If someone needs a setup guide, the
project failed before they read any code.

## 7. Config over fork

Making the club swappable in [[Side by Side]] took an hour and turned a
personal page into something anyone can use. Ask what the one file is.

## 8. Keep the before-picture

[[PDF Compiler]] stays in the index unchanged. An index with nothing in it you
would write differently now is an index that is lying.

## Related

- [[Home]] · [[Agent Structure]] · [[Agent Patterns]] · [[Open Questions]]
