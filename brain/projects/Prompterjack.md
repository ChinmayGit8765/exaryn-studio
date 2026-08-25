---
title: Prompterjack
type: project
tags: [project, agents-tooling]
status: shipped
year: 2026
category: Agents & Tooling
repo: 
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Prompterjack

*Design multi-agent AI systems visually, export runnable code for five frameworks.*

Full-stack prompt-engineering and agent-design platform: pick an architecture style, design multi-agent systems visually, export production-ready code for Strands, OpenAI Agents, LangChain/LangGraph and LlamaIndex. Codebase-aware prompt generation, maintainability scoring, marketplace, real-time co-editing.

## How it is put together

Turborepo monorepo. React SPA on the edge, Hono API on Cloudflare Workers, Neon Postgres for state, Stripe for billing. The canvas is the source of truth: a crew graph compiles down to whichever framework you export to.

## What is actually in it

- Visual canvas for supervisor/worker, router, and pipeline crew shapes
- One graph exports to five agent frameworks — Strands, OpenAI Agents, LangChain, LangGraph, LlamaIndex
- Prompt linter scores maintainability and flags ambiguity before you ship
- Codebase-aware generation: point it at a repo, get prompts that know your types
- Real-time co-editing and a marketplace for published crews

## What it taught

> Agent frameworks disagree about everything except the shape of the graph. Model the graph, generate the framework.

## Facts

| | |
| --- | --- |
| Status | shipped |
| Year | 2026 |
| Dev time | ~6 months |
| Category | Agents & Tooling |
| Repository | closed source — the live product is linked below |

## Stack

[[React]] · [[TypeScript]] · [[Cloudflare Workers]] · [[Hono]] · [[Neon Postgres]] · Stripe · [[Turborepo]]

## Agents

[[Prompterjack Crew Designer]]

## Links

[Live](https://prompterjack.com) · [Demo](demos/prompterjack.html)

## Related

[[Projects Map]] · [[Home]]
