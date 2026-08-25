---
title: ALFRED
type: project
tags: [project, agents-tooling]
status: in development
year: 2026
category: Agents & Tooling
repo: ChinmayGit8765/AlfredOpenSource
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# ALFRED

*Local-first multi-agent life-optimization system. Your hardware, your data, no cloud.*

Decomposes goals into weekly plans a Conductor reconciles against real capacity, delivers over Discord/Telegram, watches what happens, and adapts. Every tool call passes an allowlist, capability tier and audit trail. 529 offline tests in CI.

## How it is put together

Local models via Ollama, SQLite for state, Pydantic contracts between every agent. A Conductor reconciles specialist plans against real capacity before anything reaches you. Chat surfaces are Discord and Telegram.

## What is actually in it

- Runs entirely on your hardware — no cloud, no data leaving the house
- Conductor reconciles specialist plans against actual weekly capacity
- Every tool call checked against an allowlist and a capability tier, then audited
- Adapts from what actually happened, not what was planned
- 529 offline tests in CI — the whole suite runs with no network
- MIT licensed

## What it taught

> A planner that ignores capacity is a to-do list generator. The Conductor exists because the first version cheerfully planned 60-hour weeks.

## Facts

| | |
| --- | --- |
| Status | in development |
| Year | 2026 |
| Dev time | ~3 months, ongoing |
| Category | Agents & Tooling |
| Repository | [ChinmayGit8765/AlfredOpenSource](https://github.com/ChinmayGit8765/AlfredOpenSource) |
| Primary language | Python |
| Size | 598 KB |
| Licence | MIT |
| Created | 2026-06-11 |
| Last push | 2026-07-22 |
| Visibility | public |

## Stack

[[Python]] · [[Pydantic]] · [[Ollama]] · [[SQLite]] · [[discord.py]] · [[MCP]]

## Agents

[[ALFRED Conductor]] · [[Tool Safety]]

## Links

[Source](https://github.com/ChinmayGit8765/AlfredOpenSource)

## Related

[[Projects Map]] · [[Home]]
