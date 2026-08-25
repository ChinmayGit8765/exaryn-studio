---
title: Glossary
type: note
tags: [reference]
---

# Glossary

The vocabulary this vault assumes.

**Agent tier** — the supervision level a system needs. Tier 1 is a scheduled
script, tier 2 is model-in-the-loop with a human gate, tier 3 plans and acts
across time. Defined in [[Agent Structure]].

**Backlink** — a note that links *to* the one you are reading. The browser view
and Obsidian both compute these from `[[wikilinks]]`; the bundle in
`data/brain.json` ships them pre-resolved.

**Bundle** — `data/brain.json`. Every note in this vault, its frontmatter, and
the full link graph, in one file so a static host can serve the whole vault in
one request. Built by [[Brain Indexer]].

**Capability tier** — what class of consequence a tool call carries: read,
write, notify, spend. Assigned to the tool, not inferred from arguments. See
[[Tool Safety]].

**Generated note** — a note written by `scripts/brain.py` from JSON rather than
by hand. Carries `generated: true`. Everything in `projects/` and `repos/`.

**MOC** — map of content. A hub note that exists to link outward: [[Home]],
[[Agent Structure]], [[Projects Map]], [[Systems Map]], [[Stack Map]].

**QLIKE** — the loss function [[VolForecast]] gates model promotion on. Chosen
because it penalises under-forecasting volatility, which is the error that
actually hurts.

**Worktree** — a second checkout of the same git repository. The unit of
isolation for everything in [[Worktree Workflow]].

## Related

- [[Home]] · [[Agent Structure]] · [[Studio Principles]]
