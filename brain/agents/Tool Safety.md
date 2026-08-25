---
title: Tool Safety
type: note
tags: [agents, safety, architecture]
project: ALFRED
---

# Tool Safety

The envelope every tool call in [[ALFRED]] passes through, and the model the
rest of the studio borrows when an agent gets to touch anything real.

## Three checks, in order

1. **Allowlist.** Is this tool callable at all, in this context? Default deny.
   An unknown tool name is a failure, not a fallback.
2. **Capability tier.** What class of consequence does this call carry — read,
   write, notify, spend? Tiers are assigned to the tool, not inferred from the
   arguments.
3. **Audit trail.** Every call, its arguments, its tier and its result are
   recorded before the result is used. Unrecorded means unexecuted.

## Why tiers and not permissions

A flat permission list makes every call look equally serious, so it gets
approved in bulk and stops meaning anything. Tiers let reads flow freely and
force writes and spends to justify themselves.

## Local-first is part of the envelope

[[ALFRED]] runs its models through Ollama on the user's own hardware. The
strongest guarantee about data that never leaves the machine is architectural,
not contractual — the same reasoning applies to the optional local patching in
[[smartc]].

## Testing it offline

ALFRED's 529 CI tests run with no network at all. A safety envelope you can
only exercise against live services is one you will stop exercising.

## Related

- [[Agent Structure]] · [[Agent Patterns]] · [[ALFRED Conductor]] · [[Studio Principles]]
