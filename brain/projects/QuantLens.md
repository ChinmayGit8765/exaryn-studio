---
title: QuantLens
type: project
tags: [project, quant-finance]
status: shipped
year: 2026
category: Quant & Finance
repo: ChinmayGit8765/FinancialServicesDashboard
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# QuantLens

*AI-narrated portfolio dashboard — Sharpe, VaR, Monte Carlo, factors, RAG Q&A.*

Quant-finance Spring Boot backend plus Vue 3 SPA: P&L, risk metrics, Fama-French factors and cointegration pairs, narrated by Spring AI with RAG over pgvector. One docker compose up, no API keys, three seeded demo personas.

## How it is put together

Spring Boot 3.5 runs the quant engine; Spring AI runs tool-calling and RAG over pgvector, with an embedded MCP server. Vue 3 on the front. `docker compose up` brings the whole thing, seed data included.

## What is actually in it

- P&L, Sharpe, VaR, Monte Carlo, Fama-French factors, cointegration pairs
- The AI narrates real engine output — it calls tools, it does not hallucinate numbers
- RAG over pgvector for portfolio Q&A
- Embedded MCP server so external agents can query the same engine
- One `docker compose up`, no API keys, three seeded demo personas

## What it taught

> Let the model narrate, never calculate. Every number in the prose comes from a tool call you can point at.

## Facts

| | |
| --- | --- |
| Status | shipped |
| Year | 2026 |
| Dev time | ~3 weeks |
| Category | Quant & Finance |
| Repository | [ChinmayGit8765/FinancialServicesDashboard](https://github.com/ChinmayGit8765/FinancialServicesDashboard) |
| Primary language | Java |
| Size | 1.9 MB |
| Licence | none declared |
| Created | 2026-06-06 |
| Last push | 2026-06-10 |
| Visibility | public |

## Stack

[[Java]] · [[Spring Boot]] · [[Spring AI]] · [[pgvector]] · [[Vue 3]] · [[Docker]]

## Agents

[[QuantLens Narrator]]

## Links

[Source](https://github.com/ChinmayGit8765/FinancialServicesDashboard)

## Related

[[Projects Map]] · [[Home]]
