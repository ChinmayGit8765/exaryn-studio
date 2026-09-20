---
title: Claude Work Manager
type: project
tags: [project, agents-tooling]
status: prototype
year: 2026
category: Agents & Tooling
generated: true
repo: ChinmayGit8765/claude-work-manager
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Claude Work Manager

*Self-hosted, mobile-first dashboard for concurrent Claude Code sessions across git worktrees.*

A personal Node dashboard that spawns the local claude CLI you already logged into — one isolated git worktree per session — then lets you chat, watch tool calls, iframe localhost previews, and commit or push from a phone. The public README calls this version 0.1.0: a working personal tool, not a product. No test suite yet. It should stay off the public internet.

## How it is put together

A Node server wraps the local `claude` CLI. One git worktree per agent means agents never fight over the working tree. The browser talks to the server; the server talks to the CLI you already authenticated.

## What is actually in it

- One git worktree per agent, matching Claude Code's wt/ convention
- Uses the local CLI login — no API keys stored in the repo
- Phone-first UI with git status, diff, commit and push
- Access-key gate before the instance leaves localhost

## What it taught

> Isolation is the whole trick. Once each agent owns a worktree, running several at once stops being a merge fight.

## Facts

| | |
| --- | --- |
| Status | prototype |
| Year | 2026 |
| Dev time | days, ongoing |
| Category | Agents & Tooling |
| Repository | [ChinmayGit8765/claude-work-manager](https://github.com/ChinmayGit8765/claude-work-manager) |
| Primary language | JavaScript |
| Size | 412 KB |
| Licence | MIT |
| Created | 2026-08-21 |
| Last push | 2026-09-17 |
| Visibility | public |
| Language mix | JavaScript 80.0%, CSS 16.8%, HTML 3.2% |

## Stack

[[Node.js]] · Claude Code CLI · Git worktrees · [[Vanilla JS]]

## Agents

[[Fleet Supervisor]]

## Links

[Source](https://github.com/ChinmayGit8765/claude-work-manager)

## Related

[[Projects Map]] · [[Home]]
