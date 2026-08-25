---
title: Pirate Picker
type: agent
tier: 1
tags: [agent, cron, games]
project: One Piece Guess
repo: ChinmayGit8765/one-piece-guess-game
---

# Pirate Picker

The cron job behind [[One Piece Guess]]. It picks one character each morning,
commits it, and that is the entire backend.

## Why this is the whole game

A daily puzzle needs exactly one thing: everyone must see the same answer on
the same day, and nobody may see tomorrow's. A committed file plus a date does
that with no server, no auth and no database. Everything else — the eight
attribute clues, the unlocking hints, the shareable emoji grid — is front-end
decoration on top.

## The reusable part

The repo's README is deliberately written as a how-to for building your own
daily-anything game, because the mechanism generalises far past One Piece. See
[[Agent Patterns|cron → script → commit → deploy]].

## Related

- [[One Piece Guess]] · [[Fan Suite Bot]] · [[Cron Ledger]] · [[GitHub Actions]]
