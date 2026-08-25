---
title: PostgreSQL
type: stack
aliases: [Postgres, Neon Postgres, Redis, SQLite]
tags: [stack, database]
---

# PostgreSQL

The default store when state has to be relational and correct: [[Solo Strength Quest]] (via SQLx), [[Contact Flow]] (via TypeORM), [[QuantLens]] (with the [[pgvector]] extension), and Neon-hosted for [[Prompterjack]].

Redis sits in front of it in Solo Strength Quest for hot state, and nowhere else — caching before there is a measured problem is how you get two sources of truth.

## Where it shows up

[[Solo Strength Quest]] · [[Contact Flow]] · [[QuantLens]] · [[Prompterjack]]
