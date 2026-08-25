---
title: smartc Patcher
type: agent
tier: 2
tags: [agent, local-first, solidity]
project: smartc
repo: ChinmayGit8765/SmartContract-Creator
---

# smartc Patcher

The optional AI layer in [[smartc]]. Opt-in, local-only, and gated behind a
compiler.

## The gate

`solc` compiles every Solidity contract **in process, before anything touches
disk**. If the patched contract does not compile, it is not written. The model
gets to propose; the compiler decides. See [[Agent Patterns|gate before write]].

## Local only

Patching runs through [[Ollama]] on your own machine. Contract source — often
the most sensitive thing in the repo — never goes to a third party.

## Why the wizard is not AI

The templates (ERC-20, ERC-721, ERC-1155, Solana SPL) are deterministic on
purpose. The model is there for the deltas nobody templated, not for the
standard path where a template is simply more trustworthy.

## Related

- [[smartc]] · [[Agent Structure]] · [[TypeScript]] · [[Ollama]]
