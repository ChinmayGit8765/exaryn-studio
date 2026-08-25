---
title: Agent Patterns
type: note
tags: [agents, architecture, patterns]
---

# Agent Patterns

The shapes that keep reappearing. Each one is named here so notes elsewhere can
just point at it.

## Cron → script → commit → deploy

The cheapest autonomous system that exists. A GitHub Actions cron runs a
stdlib-only Python script, the script writes JSON into `data/`, the workflow
commits it, Pages redeploys. No server, no database, no bill.

Used by [[Digest Bot]], [[Pirate Picker]], [[Fan Suite Bot]], [[Brain Indexer]].

**Why it holds up:** the output is a git commit. Every run is diffable, every
regression is bisectable, and a failed run leaves yesterday's data standing.

## One worktree per agent

Concurrency without coordination. Each agent gets its own git worktree, so two
agents editing the same file is impossible rather than merely discouraged.

Used by [[Fleet Supervisor]], [[Worktree MCP Server]].

**Why it holds up:** the hard problem in multi-agent coding is not reasoning,
it is write conflicts. Worktrees delete the problem instead of managing it.

## Narrate, never calculate

The model gets tool access to a real engine and is allowed to describe the
numbers it gets back. It is never allowed to produce a number itself.

Used by [[QuantLens Narrator]], and it is the reason QuantLens output can be
checked line by line against the engine.

## Gate before write

Nothing reaches disk, or a user, until a deterministic check passes. `solc`
compiles the contract before [[smartc Patcher]] writes it. The allowlist clears
the call before [[ALFRED Conductor]] makes it.

**Why it holds up:** it converts "the model is usually right" into "the output
is always valid", which is a different product.

## Model the graph, generate the framework

Agent frameworks disagree about naming, lifecycle and state, and agree about
topology. [[Prompterjack Crew Designer]] models the topology once and emits
five frameworks from it.

## Plan against capacity, not against ambition

A planner with no capacity model produces a fantasy. [[ALFRED Conductor]]
reconciles every specialist's plan against real available hours before anything
is delivered.

## Related

- [[Agent Structure]] · [[Agent Ledger]] · [[Tool Safety]] · [[Context Engineering]]
