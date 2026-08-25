---
title: pgvector
type: stack
tags: [stack, database,rag]
---

# pgvector

The Postgres extension that lets [[QuantLens]] do RAG without adding a second datastore. Portfolio documents get embedded alongside the relational data they describe, so retrieval and the quant engine share one connection, one backup and one `docker compose up`.

A separate vector database would have been one more thing to run for a project whose whole promise is *one command*.

## Where it shows up

[[QuantLens]] · [[QuantLens Narrator]] · [[PostgreSQL]]
