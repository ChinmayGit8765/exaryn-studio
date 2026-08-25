---
title: Rust
type: stack
aliases: [Axum, SQLx]
tags: [stack, rust]
---

# Rust

Used exactly where its guarantees pay for its friction: the [[Solo Strength Quest]] API, where all gamification maths lives server-side and a client must never be able to mint XP. Axum for HTTP, SQLx for a checked-at-compile-time relationship with [[PostgreSQL]].

Two earlier versions of that app died partly because game logic drifted into the client. Putting it in Rust made "the server decides" structural rather than a convention.

## Where it shows up

[[Solo Strength Quest]]
