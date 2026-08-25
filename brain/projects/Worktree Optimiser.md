---
title: Worktree Optimiser
type: project
tags: [project, agents-tooling]
status: in development
year: 2026
category: Agents & Tooling
repo: ChinmayGit8765/worktree-optimiser
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Worktree Optimiser

*Every branch of a repo as its own containerised dev server, routed by hostname.*

Run all your worktrees at once — main.localhost, fix-login.localhost — each in its own Docker container behind Traefik, managed from one dashboard. Review a PR and your own work side by side in two tabs. Ships an MCP server so coding agents can drive it too.

## How it is put together

Traefik does hostname routing; every worktree gets a container and a `<branch>.localhost` name. A dashboard drives the lifecycle, and an MCP server exposes the same lifecycle to coding agents as tools.

## What is actually in it

- `main.localhost`, `fix-login.localhost` — every branch live at once
- Container per worktree, routed by Traefik, no port juggling
- Review a PR and your own branch side by side in two tabs
- MCP server so Claude Code can spin environments up and down itself
- MIT licensed

## What it taught

> Anything a human clicks in a dashboard, an agent should be able to call as a tool. Building the MCP layer second was a mistake worth not repeating.

## Facts

| | |
| --- | --- |
| Status | in development |
| Year | 2026 |
| Dev time | ~2 weeks, ongoing |
| Category | Agents & Tooling |
| Repository | [ChinmayGit8765/worktree-optimiser](https://github.com/ChinmayGit8765/worktree-optimiser) |
| Primary language | TypeScript |
| Size | 303 KB |
| Licence | MIT |
| Created | 2026-08-12 |
| Last push | 2026-08-20 |
| Visibility | public |

## Stack

[[Node.js]] · [[Docker]] · [[Traefik]] · [[MCP]] · Git worktrees · [[TypeScript]]

## Agents

[[Worktree MCP Server]]

## Links

[Source](https://github.com/ChinmayGit8765/worktree-optimiser)

## Related

[[Projects Map]] · [[Home]]
