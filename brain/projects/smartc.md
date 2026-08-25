---
title: smartc
type: project
tags: [project, web-product]
status: shipped
year: 2026
category: Web & Product
repo: ChinmayGit8765/SmartContract-Creator
generated: true
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# smartc

*CLI wizard that writes compile-verified smart contracts plus deploy docs.*

Single-binary Node CLI: short wizard in, one contract file plus a DEPLOY.md with copy-pasteable commands out. ERC-20/721/1155 and Solana SPL templates, every Solidity contract compiled in-process before it touches disk. Optional local-only AI patching via Ollama.

## How it is put together

One Node binary. Wizard collects intent, templates emit Solidity or Anchor, solc compiles in-process, and only verified output hits disk. Ollama patching is opt-in and local-only.

## What is actually in it

- ERC-20, ERC-721, ERC-1155 and Solana SPL templates
- Every Solidity contract compiled in-process before it's written out
- Emits a DEPLOY.md with copy-pasteable commands, not just a contract
- Optional AI patching runs locally through Ollama — nothing leaves your machine
- Published on npm; MIT licensed

## What it taught

> Refuse to write a file that doesn't compile. It turns a code generator into a tool you can trust half-asleep.

## Facts

| | |
| --- | --- |
| Status | shipped |
| Year | 2026 |
| Dev time | ~2 weeks |
| Category | Web & Product |
| Repository | [ChinmayGit8765/SmartContract-Creator](https://github.com/ChinmayGit8765/SmartContract-Creator) |
| Primary language | TypeScript |
| Size | 1016 KB |
| Licence | MIT |
| Created | 2026-05-14 |
| Last push | 2026-07-06 |
| Visibility | public |
| Language mix | TypeScript 99.0%, JavaScript 1.0%, Python 0.0% |

## Stack

[[TypeScript]] · [[Node.js]] · Solidity · OpenZeppelin · Anchor · [[Ollama]]

## Agents

[[smartc Patcher]]

## Links

[Live](https://www.npmjs.com/package/smartc) · [Source](https://github.com/ChinmayGit8765/SmartContract-Creator)

## Related

[[Projects Map]] · [[Home]]
