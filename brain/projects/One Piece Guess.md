---
title: One Piece Guess
type: project
tags: [project, games-play]
status: shipped
year: 2026
category: Games & Play
repo: ChinmayGit8765/one-piece-guess-game
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# One Piece Guess

*Wordle, but for One Piece — a daily character riddle picked by a cron job.*

Guess the daily character: eight attribute clues per guess (crew, bounty, haki, fruit, debut saga…), hints that unlock as you struggle, a shareable emoji grid. A GitHub Actions cron picks a new pirate every morning; the README doubles as a guide to building your own daily-anything game.

## How it is put together

Entirely static. A GitHub Actions cron runs a Python picker each morning, commits the day's character, and Pages redeploys. No backend to keep alive.

## What is actually in it

- Eight attribute clues per guess: crew, bounty, haki, devil fruit, debut saga and more
- Hints unlock as you struggle; shareable emoji grid at the end
- New pirate every morning, chosen by a cron job
- README doubles as a how-to for building your own daily-anything game
- Embedded and playable on this site's Play tab

## What it taught

> The whole 'daily game' genre is one cron job and a committed JSON file. Everything else is decoration.

## Facts

| | |
| --- | --- |
| Status | shipped |
| Year | 2026 |
| Dev time | a weekend |
| Category | Games & Play |
| Repository | [ChinmayGit8765/one-piece-guess-game](https://github.com/ChinmayGit8765/one-piece-guess-game) |
| Primary language | JavaScript |
| Size | 22 KB |
| Licence | none declared |
| Created | 2026-08-24 |
| Last push | 2026-08-28 |
| Visibility | public |
| Language mix | JavaScript 46.6%, CSS 31.1%, HTML 13.5%, Python 8.8% |

## Stack

[[Vanilla JS]] · [[Python]] · [[GitHub Actions]] · [[GitHub Pages]]

## Agents

[[Pirate Picker]]

## Links

[Live](https://chinmaygit8765.github.io/one-piece-guess-game/) · [Source](https://github.com/ChinmayGit8765/one-piece-guess-game)

## Related

[[Projects Map]] · [[Home]]
