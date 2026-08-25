---
title: QuantLens Narrator
type: agent
tier: 2
tags: [agent, rag, finance]
project: QuantLens
repo: ChinmayGit8765/FinancialServicesDashboard
---

# QuantLens Narrator

The Spring AI layer inside [[QuantLens]]. It explains a portfolio in prose, and
it is structurally incapable of making a number up.

## The rule

**Narrate, never calculate.** Every figure in the narration comes back from a
tool call into the Java quant engine. The model chooses what to say about a
number; it never chooses the number.

## How it answers questions

RAG over [[pgvector]] for the documents, tool-calling for the live metrics —
Sharpe, VaR, Monte Carlo paths, Fama-French factor loadings, cointegration
pairs. An embedded MCP server exposes the same engine to outside agents, so the
narration path and the programmatic path use identical numbers.

## Why this matters more in finance

A hallucinated sentence is embarrassing. A hallucinated Sharpe ratio is
actionable and wrong. Splitting narration from calculation is the only version
of this that is safe to demo.

## Related

- [[QuantLens]] · [[Agent Patterns]] · [[Java]] · [[MCP]] · [[Agent Structure]]
