---
title: Contact Flow
type: project
tags: [project, web-product]
status: shipped
year: 2026
category: Web & Product
repo: ChinmayGit8765/ContactUsPage
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# Contact Flow

*A production-shaped contact and lead-capture stack, one docker compose up.*

Contact/lead-capture done the way a real product would do it: NestJS + TypeORM + PostgreSQL API, Next.js 14 + Tailwind frontend, validation implemented properly on both sides rather than trusted from the client. Whole stack comes up with one docker compose command.

## How it is put together

NestJS + TypeORM over Postgres on the API side, Next.js 14 App Router with Tailwind on the front. Validation schemas run in both places; the server never trusts the client's word for it.

## What is actually in it

- Validation done properly on both sides — the server re-checks everything
- NestJS + TypeORM + PostgreSQL API with real layering
- Next.js 14 + Tailwind frontend
- One `docker compose up` brings the whole stack

## What it taught

> 'Simple CRUD form' is the best place to practise the boring parts — layering, validation, migrations — where nothing exotic hides the mistakes.

## Facts

| | |
| --- | --- |
| Status | shipped |
| Year | 2026 |
| Dev time | ~2 weeks |
| Category | Web & Product |
| Repository | [ChinmayGit8765/ContactUsPage](https://github.com/ChinmayGit8765/ContactUsPage) |
| Primary language | TypeScript |
| Size | 311 KB |
| Licence | none declared |
| Created | 2026-06-13 |
| Last push | 2026-08-24 |
| Visibility | public |

## Stack

[[TypeScript]] · [[NestJS]] · [[TypeORM]] · [[PostgreSQL]] · [[Next.js]] · [[Tailwind]] · [[Docker]]

## Links

[Source](https://github.com/ChinmayGit8765/ContactUsPage)

## Related

[[Projects Map]] · [[Home]]
