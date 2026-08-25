---
title: Gartic Hands
type: project
tags: [project, games-play]
status: in development
year: 2026
category: Games & Play
repo: Monash-FIT3170/2026W2-GarticHands
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Gartic Hands

*Multiplayer draw-and-guess where you draw with webcam hand tracking.*

Gartic Phone, except players draw with their hands in front of a webcam via MediaPipe hand tracking. Server-held round state machine drives the full party loop. Built with a Monash FIT3170 team.

## How it is put together

MediaPipe hand tracking in the browser turns a webcam into a brush. Round state lives on an Express + Socket.IO server so no client can desync the party loop. Dockerised for the team.

## What is actually in it

- Draw with your hands in front of a webcam — no mouse, no stylus
- Server-held round state machine drives the full Gartic-style loop
- Real-time multiplayer over Socket.IO
- Built with a Monash FIT3170 team — the only group project in the index

## What it taught

> Hand tracking is the easy half. Keeping eight browsers agreed on whose turn it is was the actual project.

## Facts

| | |
| --- | --- |
| Status | in development |
| Year | 2026 |
| Dev time | semester project |
| Category | Games & Play |
| Repository | `Monash-FIT3170/2026W2-GarticHands` |

## Stack

[[React]] · [[TypeScript]] · [[MediaPipe]] · [[Express]] · [[Socket.IO]] · [[Docker]]

## Links

[Source](https://github.com/Monash-FIT3170/2026W2-GarticHands)

## Related

[[Projects Map]] · [[Home]]
