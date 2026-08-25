---
title: Worktree Workflow
type: system
tags: [system, git, agents]
---

# Worktree Workflow

How parallel work actually happens here — the human half and the agent half of
the same idea.

## The rule

**One worktree per unit of work.** A branch you are reviewing, a branch you are
writing, and each agent in the fleet all get their own checkout. Nothing shares
a working tree.

## The two tools

- [[Claude Work Manager]] — a worktree per Claude Code agent, steerable from a
  phone. Solves *who is editing what*.
- [[Worktree Optimiser]] — a container and a `<branch>.localhost` hostname per
  worktree, routed by Traefik. Solves *what is running where*.

Together: every branch is simultaneously checked out, running, and addressable.
Reviewing a PR against your own work is two browser tabs, not a stash-and-swap.

## Why it is worth the disk

Stashing is the single most common way to lose an hour. Disk is cheaper than
that, by a lot.

## Related

- [[Fleet Supervisor]] · [[Worktree MCP Server]] · [[Docker]] · [[Agent Patterns]]
