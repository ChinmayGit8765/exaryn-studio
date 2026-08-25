---
title: MCP
type: stack
tags: [stack, agents,protocol]
---

# MCP

Model Context Protocol — the way tools get handed to agents here rather than to humans only.

Three places: [[Worktree MCP Server]] exposes container lifecycle to coding agents; [[QuantLens]] embeds an MCP server so external agents query the same quant engine the UI does; [[ALFRED]] uses it on the tool side of its safety envelope.

The rule it enforces: **anything a human clicks should be callable**.

## Where it shows up

[[Worktree Optimiser]] · [[QuantLens]] · [[ALFRED]] · [[Agent Structure]]
