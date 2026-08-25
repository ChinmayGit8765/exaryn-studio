---
title: Solo Strength Quest
type: project
tags: [project, games-play]
status: in development
year: 2026
category: Games & Play
repo: ChinmayGit8765/strength-quest
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Solo Strength Quest

*A fitness RPG — every workout is a quest, every PR is a boss kill.*

Gamified training app: workouts become quests, progressive overload becomes XP, and your profile is a character sheet that levels up because you did. Rust/Axum API with server-side gamification math, Flutter app with a custom design system, Postgres + Redis underneath.

## How it is put together

Rust/Axum API owns all gamification maths server-side — the client never decides what an XP award is. SQLx over Postgres, Redis for hot state, Flutter client with its own design system.

## What is actually in it

- Workouts become quests; progressive overload becomes XP
- Personal records land as boss kills and level-ups
- All gamification maths server-side — clients can't mint XP
- Flutter client with a hand-built design system
- Playable web demo published separately

## What it taught

> Third attempt at this app. The two rewrites before it died of client-side game logic and no schema discipline.

## Facts

| | |
| --- | --- |
| Status | in development |
| Year | 2026 |
| Dev time | ongoing |
| Category | Games & Play |
| Repository | [ChinmayGit8765/strength-quest](https://github.com/ChinmayGit8765/strength-quest) |
| Primary language | — |
| Size | 156 KB |
| Licence | none declared |
| Created | 2026-08-24 |
| Last push | 2026-08-24 |
| Visibility | public |

## Stack

[[Rust]] · [[Axum]] · [[SQLx]] · [[Flutter]] · [[PostgreSQL]] · [[Redis]]

## Links

[Live](https://chinmaygit8765.github.io/solo-strength-quest-play/) · [Source](https://github.com/ChinmayGit8765/strength-quest) · [Demo](demos/strength-quest.html)

## Related repositories

- [[solo-strength-quest-play]]
- [[solo_strength-quest]]

## Related

[[Projects Map]] · [[Home]]
