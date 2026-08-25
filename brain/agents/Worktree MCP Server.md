---
title: Worktree MCP Server
type: agent
tier: 2
tags: [agent, mcp, infra]
project: Worktree Optimiser
repo: ChinmayGit8765/worktree-optimiser
---

# Worktree MCP Server

The [[MCP]] surface of [[Worktree Optimiser]]. Everything the dashboard lets a
human do — start a worktree's container, stop it, route it, inspect it — is
exposed to coding agents as tools.

## The principle

**Anything a human clicks should be callable.** A dashboard-only tool forces an
agent to drive a browser, which is slow and fragile. A tools-only tool forces a
human to read JSON. Building both over one lifecycle costs very little if you
do it from the start.

## What it lets an agent do

Give a Claude Code session working on `fix-login` the ability to bring
`fix-login.localhost` up, check it, and tear it down again — without a human in
the loop for any of it. Combined with [[Fleet Supervisor]], each agent in the
fleet can own a running environment as well as a worktree.

## The regret

This was built second, after the dashboard. Retrofitting a tool surface onto a
UI-shaped lifecycle is meaningfully harder than designing one lifecycle with
two front doors.

## Related

- [[Worktree Optimiser]] · [[Fleet Supervisor]] · [[MCP]] · [[Docker]] · [[Agent Structure]]
