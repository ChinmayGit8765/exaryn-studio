---
title: Stack Map
type: map
tags: [moc, stack]
---

# Stack Map

What gets used, and the reason it was picked. Each note lists the projects that
lean on it.

## Languages

- [[Python]] — everything scheduled, and all the quant work
- [[TypeScript]] — everything with a UI or a published package
- [[Rust]] — exactly where its guarantees pay for its friction
- [[Java]] — one project, thoroughly
- [[Flutter]] — the mobile client
- [[C Sharp and .NET]] — the deliberately boring reference codebase

## Front ends

- [[Vue]] — dense data dashboards
- [[React]] — direct-manipulation interfaces
- Vanilla JS — the static sites, on purpose: no framework, no build step

## Data

- [[PostgreSQL]] — the default when state must be relational and correct
- [[pgvector]] — RAG without a second datastore

## Agents & models

- [[Claude]] — the model the studio builds with
- [[Ollama]] — local serving, where "no cloud" has to be a real claim
- [[MCP]] — how tools get handed to agents, not just to humans

## Infrastructure

- [[GitHub Actions]] — the studio backend
- [[Docker]] — isolation, and the one-command demo contract
- [[Cloudflare Workers]] — the edge runtime under Prompterjack

## The bias

Boring by default, exotic only where a specific guarantee is needed. Stdlib
Python because CI dependencies rot. Vanilla JS on static sites because a build
step is a thing that can break between you and a page that was already working.

## Related

- [[Projects Map]] · [[Systems Map]] · [[Studio Principles]] · [[Home]]
