---
title: VolForecast
type: project
tags: [project, quant-finance]
status: shipped
year: 2026
category: Quant & Finance
repo: ChinmayGit8765/VolatilityModel
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# VolForecast

*MLOps platform forecasting short-horizon volatility, benchmarked honestly vs GARCH.*

Realized-volatility forecasting for crypto and equities wrapped in a full MLOps lifecycle: leak-free walk-forward evaluation against GARCH/EWMA/HAR baselines, champion/challenger registry in MLflow, QLIKE-gated promotion, drift detection and automated retraining.

## How it is put together

Prefect orchestrates the lifecycle; MLflow holds the champion/challenger registry; LightGBM does the forecasting; FastAPI serves and Streamlit inspects. Promotion is gated on QLIKE against the baselines.

## What is actually in it

- Leak-free walk-forward evaluation — no peeking, ever
- Benchmarked against GARCH, EWMA and HAR instead of a strawman
- Champion/challenger registry with QLIKE-gated promotion
- Drift detection triggers automated retraining
- Covers both crypto and equities

## What it taught

> A vol model that can't beat HAR isn't a model, it's a plot. Building the baselines first made the whole project honest.

## Facts

| | |
| --- | --- |
| Status | shipped |
| Year | 2026 |
| Dev time | ~1 month |
| Category | Quant & Finance |
| Repository | [ChinmayGit8765/VolatilityModel](https://github.com/ChinmayGit8765/VolatilityModel) |
| Primary language | Python |
| Size | 2.5 MB |
| Licence | none declared |
| Created | 2026-06-10 |
| Last push | 2026-07-19 |
| Visibility | public |

## Stack

[[Python]] · [[LightGBM]] · [[MLflow]] · [[Prefect]] · [[FastAPI]] · [[Streamlit]]

## Links

[Source](https://github.com/ChinmayGit8765/VolatilityModel)

## Related

[[Projects Map]] · [[Home]]
