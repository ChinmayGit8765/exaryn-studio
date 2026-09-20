---
title: QuantFlex
type: project
tags: [project, quant-finance]
status: available
year: 2026
category: Quant & Finance
generated: true
repo: ChinmayGit8765/quantflex
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# QuantFlex

*Pricing workbench: see how an option price was made, then reproduce it.*

The public landing page and live app are the product you can use today. Closed form, Monte Carlo, Crank–Nicolson PDE and Longstaff–Schwartz across GBM, Merton and Heston; Greeks from a reverse-mode AAD tape shown against finite differences. The landing page's engine snapshot is recorded output, not a live market quote. The live API's JAX column is n/a — JAX appears on the snapshot when that machine had it, not as a standing live-API claim. The GitHub engine home is still landing source. Planned Excel workbooks, live Excel refresh and portfolio VaR are listed as coming soon, not shipped.

## How it is put together

Public workbench at app.quantflex.dev, with methodology and a recorded engine snapshot on the GitHub Pages landing. Hand-rolled numerics (Monte Carlo, PDE, AAD) sit behind a documented HTTP API. JAX is an optional snapshot check, not the live-API verifier.

## What is actually in it

- Live app plus a landing page with recorded engine output you can inspect
- Methods and payoffs listed on the public landing, including American exercise and path-dependent options
- Greeks panel shows AAD against finite differences with per-Greek tolerance
- CSV/JSON export carries inputs, seed, engine version and request hash
- Daily public headline feed on the landing page — not market data, not advice

## What it taught

> Show the checks that actually ran. A missing column beats a borrowed triple-verify slogan.

## Facts

| | |
| --- | --- |
| Status | available |
| Year | 2026 |
| Dev time | ~2 months, ongoing |
| Category | Quant & Finance |
| Repository | [ChinmayGit8765/quantflex](https://github.com/ChinmayGit8765/quantflex) |
| Primary language | — |
| Size | 237 KB |
| Licence | none declared |
| Created | 2026-08-24 |
| Last push | 2026-09-17 |
| Visibility | public |

## Stack

[[Python]] · [[NumPy]] · [[JAX]] · [[FastAPI]] · [[Vue 3]] · [[Cloud Run]]

## Links

[Live](https://app.quantflex.dev) · [Source](https://github.com/ChinmayGit8765/quantflex) · [Demo](demos/quantflex.html)

## Related repositories

- [[quantflex-site]]

## Related

[[Projects Map]] · [[Home]]
