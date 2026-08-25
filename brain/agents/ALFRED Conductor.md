---
title: ALFRED Conductor
type: agent
tier: 3
tags: [agent, local-first, planning]
project: ALFRED
repo: ChinmayGit8765/AlfredOpenSource
---

# ALFRED Conductor

The only tier-3 agent in the studio: it plans across time, acts on its own
schedule, and adapts from what actually happened.

## The loop

```
goal ──► specialists decompose ──► Conductor reconciles vs capacity
                                          │
                            delivered over Discord / Telegram
                                          │
                        observe outcomes ──┘  (and re-plan)
```

## The Conductor's actual job

Specialists are optimists. Each one produces a plan that is reasonable in
isolation, and the sum of them is a 60-hour week. The Conductor's only job is
to reconcile those plans against real capacity and refuse the surplus — see
[[Agent Patterns|plan against capacity, not ambition]].

## Safety envelope

Every tool call passes the allowlist, capability tier and audit trail described
in [[Tool Safety]]. Models run locally through [[Ollama]]; nothing leaves the
machine. 529 tests run offline in CI, envelope included.

## Related

- [[ALFRED]] · [[Tool Safety]] · [[Agent Structure]] · [[Python]] · [[MCP]]
