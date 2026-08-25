---
title: Fleet Supervisor
type: agent
tier: 2
tags: [agent, claude, worktrees]
project: Claude Work Manager
repo: ChinmayGit8765/claude-work-manager
---

# Fleet Supervisor

The agent layer inside [[Claude Work Manager]]. Not one agent — a supervisor
over however many Claude Code sessions are running, each pinned to its own git
worktree.

## What it does

Spawns a Claude Code session per worktree, keeps their transcripts separate,
surfaces each one's dev server as a live preview, and lets a human steer any of
them from a phone. Commit and push happen per worktree.

## Why it works

The pattern is [[Agent Patterns|one worktree per agent]]. Five agents editing
one checkout is a merge nightmare; five agents editing five checkouts is just
five branches. The isolation is the product.

## Trust model

Tier 2 — model-in-the-loop, human-gated. Agents write freely inside their own
worktree; nothing reaches a shared branch without a human pressing push. No API
keys are stored: it rides the `claude` CLI session already authenticated on the
machine.

## Related

- [[Claude Work Manager]] · [[Worktree MCP Server]] · [[Worktree Workflow]] · [[Agent Structure]]
