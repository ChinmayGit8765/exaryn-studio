---
title: Agent Structure
type: map
tags: [moc, agents, architecture]
---

# Agent Structure

The spine of the vault. Ten autonomous or semi-autonomous systems have been
built here. They fall into three tiers, and the tier decides how much
supervision each one needs.

## The three tiers

### Tier 1 — Scheduled bots
No reasoning. A cron fires, a script runs, JSON is committed, a site
redeploys. If one dies, nothing else notices.

- [[Digest Bot]] — sweeps ~20 feeds every morning into the daily signal
- [[Pirate Picker]] — chooses the day's One Piece character
- [[Fan Suite Bot]] — pulls fixtures, ladder and news for the footy suite
- [[Brain Indexer]] — rebuilds this vault's bundle and repo metadata

### Tier 2 — Model-in-the-loop, human-gated
A model does real work but a human sees the output before it counts.

- [[Fleet Supervisor]] — the Claude Work Manager dashboard: many Claude Code agents, one worktree each
- [[Prompterjack Crew Designer]] — designs and exports agent crews, human presses export
- [[QuantLens Narrator]] — narrates real engine output via tool calls, never invents a number
- [[smartc Patcher]] — optional local model patching, compile-gated before anything is written
- [[Worktree MCP Server]] — hands the container lifecycle to coding agents as tools

### Tier 3 — Autonomous with a safety envelope
Plans and acts across time. This is the only tier that needs [[Tool Safety]].

- [[ALFRED Conductor]] — decomposes goals, reconciles against real capacity, adapts from outcomes

## The control surface

Everything in tiers 2 and 3 is reachable as tools, not just as UI. That is
deliberate — see [[Worktree MCP Server]], which exposes the same lifecycle to
Claude Code that the dashboard exposes to a human.

```
        human ──────┐                    ┌────── coding agent
                    ▼                    ▼
              dashboard UI  ─── same ───  MCP tools
                    │        surface           │
                    └──────────┬──────────────┘
                               ▼
                    worktrees · containers · git
```

## What every agent here has in common

1. **An isolation boundary.** A worktree, a container, a local model, a
   committed file. Nothing shares mutable state with anything else.
2. **A gate before consequence.** Compile before write, human before merge,
   allowlist before tool call. See [[Tool Safety]].
3. **A written trail.** Committed JSON, audit logs, git history. If it cannot
   be reconstructed afterwards it did not happen.

Those three rules are the whole architecture. [[Agent Patterns]] has the
recurring shapes; [[Agent Ledger]] is the full table.

## Related

- [[Context Engineering]] — how prompts and context are actually built here
- [[Systems Map]] — the scheduled half of the picture
- [[Studio Principles]] — why any of this is shaped the way it is
