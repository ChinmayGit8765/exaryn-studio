---
title: Python
type: stack
aliases: [NumPy, JAX, FastAPI, Pydantic, LightGBM, MLflow, Prefect, Streamlit, discord.py]
tags: [stack, python]
---

# Python

The studio default for anything that runs on a schedule. Every cron job in the [[Cron Ledger]] is Python, and every one of them is **stdlib only** — `urllib`, `xml.etree`, `json`, `pathlib`, `concurrent.futures`. No `pip install` step in CI means no dependency that can break on a Tuesday.

Also the language of the quant work: [[QuantFlex]] (NumPy, JAX) and [[VolForecast]] (LightGBM, MLflow, Prefect), and of [[ALFRED]] (Pydantic, SQLite, discord.py).

## Where it shows up

[[Digest Bot]] · [[Brain Indexer]] · [[Pirate Picker]] · [[Fan Suite Bot]] · [[QuantFlex]] · [[VolForecast]] · [[ALFRED]] · [[JSON API Simplifier]]
