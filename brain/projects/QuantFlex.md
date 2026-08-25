---
title: QuantFlex
type: project
tags: [project, quant-finance]
status: in development
year: 2026
category: Quant & Finance
repo: ChinmayGit8765/quantflex
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# QuantFlex

*Free web derivatives pricing engine with hand-rolled Monte Carlo, PDE and autodiff.*

Prices vanillas, American options, exotics and baskets under GBM, Merton and Heston with hand-rolled solvers and Greeks from a custom autodiff tape. Every price validated against analytic anchors; every Greek triple-verified against JAX.

## How it is put together

Hand-rolled numerics in NumPy — Monte Carlo, finite-difference PDE, and a custom reverse-mode autodiff tape for Greeks. FastAPI in front, Vue 3 SPA on top, Cloud Run underneath. JAX is used only as an oracle in tests.

## What is actually in it

- Vanillas, Americans, exotics and baskets under GBM, Merton jump-diffusion and Heston
- Greeks from a custom autodiff tape, not bumped finite differences
- Every price anchored to a closed-form or published benchmark
- Every Greek triple-verified: tape vs bump vs JAX
- Separate landing site with live engine output and a daily market feed

## What it taught

> Write the oracle before the solver. The analytic anchors caught more bugs than the unit tests did.

## Facts

| | |
| --- | --- |
| Status | in development |
| Year | 2026 |
| Dev time | ~2 months, ongoing |
| Category | Quant & Finance |
| Repository | [ChinmayGit8765/quantflex](https://github.com/ChinmayGit8765/quantflex) |
| Primary language | — |
| Size | 2 KB |
| Licence | none declared |
| Created | 2026-08-24 |
| Last push | 2026-08-24 |
| Visibility | public |

## Stack

[[Python]] · [[NumPy]] · [[JAX]] · [[FastAPI]] · [[Vue 3]] · [[Cloud Run]]

## Links

[Live](https://chinmaygit8765.github.io/quantflex-site/) · [Source](https://github.com/ChinmayGit8765/quantflex) · [Demo](demos/quantflex.html)

## Related repositories

- [[quantflex-site]]

## Related

[[Projects Map]] · [[Home]]
