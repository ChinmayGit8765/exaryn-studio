---
title: Prompterjack Crew Designer
type: agent
tier: 2
tags: [agent, prompts, codegen]
project: Prompterjack
source: private
---

# Prompterjack Crew Designer

The engine inside [[Prompterjack]]: it turns a crew you drew on a canvas into
code that runs in five different agent frameworks.

## What it exports to

Strands · OpenAI Agents · LangChain · LangGraph · LlamaIndex.

## Why one canvas can serve five frameworks

Because they only disagree about surface. Lifecycle names, state containers and
decorators differ; the topology — who supervises whom, who routes to what, what
the output contract is — is the same graph in all five. Model the graph once,
generate the framework. See [[Agent Patterns]].

## The linter

Every design gets scored for maintainability, not cleverness: distinct roles,
explicit output contracts, one owner per decision. The score is the part people
argue with, which means they are reading it.

## Codebase awareness

Point it at a repository and generated prompts reference the actual types in
that repo instead of invented ones — the difference between a prompt that
survives a refactor and one that silently rots. More in [[Context Engineering]].

## Related

- [[Prompterjack]] · [[Context Engineering]] · [[Agent Structure]] · [[TypeScript]]
