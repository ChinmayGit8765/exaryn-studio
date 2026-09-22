---
title: PDF Compiler
type: project
tags: [project, web-product]
status: archived
year: 2025
category: Web & Product
generated: true
repo: ChinmayGit8765/PDFCompiler
---

> [!warning] Generated note
> Written by `scripts/brain.py` from `data/projects.json`. Hand edits are overwritten — change the data instead.

# PDF Compiler

*Merge a zip of PDFs into one file — CLI or a two-field Tkinter window.*

An early utility: drop in a .zip of scanned pages (PDFs, including nested folders), sort by path, and write one merged PDF with PyPDF2. Two entry points — PDFCompiler.py and a Tkinter GUI — plus committed Windows executables in dist/. No requirements.txt, no tests, no page-order control beyond filename sort. Kept in the index as early work, described as it actually is.

## How it is put together

Extract the zip into a TemporaryDirectory, os.walk for *.pdf, sort paths, feed PyPDF2.PdfMerger. The GUI is a file picker and save dialog over the same function.

## What is actually in it

- CLI: python PDFCompiler.py <zip> <output.pdf>
- Tkinter GUI with Browse / Compile and a save dialog
- Prebuilt Windows executables committed in dist/

## What it taught

> Left in the index on purpose. The timeline should include the beginning, described accurately.

## Facts

| | |
| --- | --- |
| Status | archived |
| Year | 2025 |
| Dev time | a weekend |
| Category | Web & Product |
| Repository | [ChinmayGit8765/PDFCompiler](https://github.com/ChinmayGit8765/PDFCompiler) |
| Primary language | HTML |
| Size | 18.4 MB |
| Licence | none declared |
| Created | 2025-05-26 |
| Last push | 2026-09-17 |
| Visibility | public |
| Language mix | HTML 74.5%, TeX 25.3%, Python 0.3% |

## Stack

[[Python]] · PyPDF2 · Tkinter

## Links

[Source](https://github.com/ChinmayGit8765/PDFCompiler)

## Related

[[Projects Map]] · [[Home]]
