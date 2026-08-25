---
title: Java
type: stack
aliases: [Spring Boot, Spring AI]
tags: [stack, java,jvm]
---

# Java

One project, thoroughly: [[QuantLens]]. Spring Boot 3.5 runs the quant engine, Spring AI runs tool-calling and RAG over [[pgvector]], and an embedded [[MCP]] server exposes the same engine to outside agents.

The interesting part is not the language, it is that the AI layer and the programmatic layer call identical code — see [[QuantLens Narrator]].

## Where it shows up

[[QuantLens]]
