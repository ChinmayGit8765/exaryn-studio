---
title: Context Engineering
type: note
tags: [agents, prompts, practice]
---

# Context Engineering

How prompts are actually built here, as opposed to how prompt guides say they
should be.

## Structure beats wording

[[Prompterjack]] exists because of this. Rewording a prompt moves quality a
little; changing the topology of who-asks-whom moves it a lot. The canvas
edits topology; the linter nags about wording.

## Give the model the shape, not the sample

The single most reused tool in the index is [[JSON API Simplifier]] — it strips
values out of a JSON response and leaves the structure. That habit generalises:
show the model the schema, not one example row it will overfit to.

## Score maintainability, not cleverness

Prompterjack's linter scores prompts on whether the next person can change
them: are the roles distinct, is the output contract explicit, is there exactly
one place that decides each thing. A clever prompt nobody can edit is technical
debt with better prose.

## Codebase-aware or nothing

Prompts written against imagined types drift the moment the code moves.
Generating prompts from the actual repo is more work up front and less work
forever after.

## Related

- [[Prompterjack Crew Designer]] · [[Agent Patterns]] · [[Claude]] · [[Studio Principles]]
