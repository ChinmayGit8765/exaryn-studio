---
title: Docker
type: stack
aliases: [Traefik, Cloud Run]
tags: [stack, infra]
---

# Docker

Two distinct uses.

**As a demo contract.** [[QuantLens]] and [[Contact Flow]] both come up with one `docker compose up`, seed data included, no API keys. If a reviewer needs a setup guide, the project has failed before they read a line of code.

**As isolation.** [[Worktree Optimiser]] gives every git worktree its own container behind Traefik, so every branch runs at once at its own hostname. See [[Worktree Workflow]].

## Where it shows up

[[QuantLens]] · [[Contact Flow]] · [[Worktree Optimiser]] · [[Gartic Hands]]
