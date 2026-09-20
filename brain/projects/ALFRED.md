---
title: ALFRED
type: project
tags: [project, agents-tooling]
status: in development
year: 2026
category: Agents & Tooling
generated: true
repo: ChinmayGit8765/AlfredOpenSource
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# ALFRED

*Local-first multi-agent life-optimisation system. Your hardware, your data, no cloud.*

Turns a goal into small wins a Conductor keeps inside one capacity budget, then delivers over CLI, Discord, Telegram or local HTTP. Every tool call passes an allowlist, capability tier and audit trail. Models stay local. The public README reports 578 offline tests across 34 files — not a live hosted product.

## How it is put together

Local models via Ollama, SQLite for state, Pydantic contracts between every agent. A Conductor reconciles specialist plans against real capacity before anything reaches you. Chat surfaces are Discord and Telegram.

## What is actually in it

- Runs on hardware you own — SQLite, local models, no cloud requirement
- Conductor reconciles specialist plans against actual capacity
- Every tool call checked against an allowlist and a capability tier, then audited
- 578 offline tests in CI against in-memory fakes
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
| Size | 949 KB |
| Licence | MIT |
| Created | 2026-06-11 |
| Last push | 2026-09-17 |
| Visibility | public |
| Language mix | Python 100.0% |

## Stack

[[Python]] · [[Pydantic]] · [[Ollama]] · [[SQLite]] · [[discord.py]] · [[MCP]]

## Agents

[[ALFRED Conductor]] · [[Tool Safety]]

## Links

[Source](https://github.com/ChinmayGit8765/AlfredOpenSource)

## Related

[[Projects Map]] · [[Home]]
