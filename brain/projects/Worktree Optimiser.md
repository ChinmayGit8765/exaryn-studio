---
title: Worktree Optimiser
type: project
tags: [project, agents-tooling]
status: in development
year: 2026
category: Agents & Tooling
generated: true
repo: ChinmayGit8765/worktree-optimiser
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Worktree Optimiser

*Every branch of a repo as its own containerised dev server, routed by hostname.*

Run worktrees at once — main.localhost, fix-login.localhost — each in its own Docker container behind Traefik, managed from one dashboard. Detection proposes a runnable config; you confirm. Ships an MCP server so coding agents can create, probe and diagnose environments. Public source is MIT-licensed. Not published to npm yet; run from a clone. Kubernetes backend is documented as planned, not implemented.

## How it is put together

Traefik does hostname routing; every worktree gets a container and a `<branch>.localhost` name. A dashboard drives the lifecycle, and an MCP server exposes the same lifecycle to coding agents as tools.

## What is actually in it

- Hostname and direct-port routing, no port juggling
- No database: git worktrees plus Docker labels are the state
- MCP tools for create, probe, diagnose; delete is off by default
- Doctor command names the fix for each environment failure

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
| Size | 819 KB |
| Licence | MIT |
| Created | 2026-08-12 |
| Last push | 2026-09-17 |
| Visibility | public |
| Language mix | TypeScript 91.4%, CSS 6.6%, JavaScript 1.9%, HTML 0.1% |

## Stack

[[Node.js]] · [[Docker]] · [[Traefik]] · [[MCP]] · Git worktrees · [[TypeScript]]

## Agents

[[Worktree MCP Server]]

## Links

[Source](https://github.com/ChinmayGit8765/worktree-optimiser)

## Related

[[Projects Map]] · [[Home]]
