---
title: holdem-ml
type: project
tags: [project, games-play]
status: in development
year: 2026
category: Games & Play
repo: ChinmayGit8765/holdem-ml
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# holdem-ml

*Texas Hold'em vs bots trained from scratch — no PyTorch, every gradient hand-checked.*

Full no-limit Hold'em (terminal + browser multiplayer) against a from-scratch poker AI: hand-written NN framework, Monte-Carlo CFR blueprint distilled into a self-play RL policy, online opponent modelling that learns your specific leaks, card vision that reads table photos, and an analyser that grades every decision in big blinds.

## How it is put together

Everything from scratch in NumPy: a hand-written NN framework (gradients checked against finite differences to 1e-6), external-sampling Monte-Carlo CFR over an engineered abstraction, REINFORCE self-play on the real engine, and a two-headed rank/suit CNN for card vision. Multiplayer table served on the Python standard library.

## What is actually in it

- Hand evaluator exact over all 2,598,960 five-card hands; ~450k evals/sec in pure NumPy
- Trained bot beats every baseline; the difficulty ladder is real — novice loses where pro crushes
- Opponent model learns you mid-game from public info only, then bluffs you exactly as often as you deserve
- 98.9% end-to-end card reading on rendered tables, validated on deck styles it never trained on
- Every README number produced by benchmark code in the repo, honest-limitations section included

## What it taught

> Measuring beats guessing: sweeping the blueprint blend weight found the strong bot played better with none of it — so the textbook-but-exploitable blueprint became the personality of the easy levels instead.

## Facts

| | |
| --- | --- |
| Status | in development |
| Year | 2026 |
| Dev time | days, ongoing |
| Category | Games & Play |
| Repository | `ChinmayGit8765/holdem-ml` |

## Stack

[[Python]] · [[NumPy]] · CFR · Self-play RL · Computer vision

## Links

[Source](https://github.com/ChinmayGit8765/holdem-ml)

## Related

[[Projects Map]] · [[Home]]
