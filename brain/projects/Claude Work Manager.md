---
title: Claude Work Manager
type: project
tags: [project, agents-tooling]
status: shipped
year: 2026
category: Agents & Tooling
repo: ChinmayGit8765/claude-work-manager
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Claude Work Manager

*Run a fleet of Claude Code agents across git worktrees — from your phone.*

Self-hosted, mobile-first dashboard for concurrent Claude Code sessions: spawn an isolated git worktree per agent, chat with each one, watch localhost previews of their dev servers, and commit/push from the couch. Rides the claude CLI you're already logged into — no API keys stored anywhere.

## How it is put together

A Node server wraps the local `claude` CLI. One git worktree per agent means agents never fight over the working tree. The browser talks to the server; the server talks to the CLI you already authenticated.

## What is actually in it

- One isolated git worktree per agent — parallel work with no merge chaos
- Mobile-first: review, steer, and push from a phone
- Live localhost previews of each agent's dev server
- No API keys stored: it borrows the CLI session you already have
- Commit and push per worktree without leaving the dashboard

## What it taught

> Isolation is the whole trick. Once each agent owns a worktree, running five at once stops being scary.

## Facts

| | |
| --- | --- |
| Status | shipped |
| Year | 2026 |
| Dev time | days, ongoing |
| Category | Agents & Tooling |
| Repository | [ChinmayGit8765/claude-work-manager](https://github.com/ChinmayGit8765/claude-work-manager) |
| Primary language | JavaScript |
| Size | 44 KB |
| Licence | MIT |
| Created | 2026-08-21 |
| Last push | 2026-08-22 |
| Visibility | public |

## Stack

[[Node.js]] · Claude Code CLI · Git worktrees · [[Vanilla JS]]

## Agents

[[Fleet Supervisor]]

## Links

[Source](https://github.com/ChinmayGit8765/claude-work-manager)

## Related

[[Projects Map]] · [[Home]]
