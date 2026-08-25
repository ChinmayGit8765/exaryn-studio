---
title: Let an LLM Narrate Numbers
type: guide
level: intermediate
time: 15 min
order: 6
stack: [Java, Spring AI, pgvector, PostgreSQL]
built: QuantLens
summary: How to put an AI narration layer over a real engine so that every figure in the prose is one you can point at.
tags: [guide, agents, rag, finance]
---

# Let an LLM Narrate Numbers

A hallucinated sentence is embarrassing. A hallucinated Sharpe ratio is
actionable and wrong.

If you are putting an AI layer over anything numeric — a portfolio, a
dashboard, an analytics product — you need one architectural rule, and
[[QuantLens]] is built entirely around it:

> **Narrate, never calculate.** The model chooses what to *say* about a number.
> It never chooses the number.

## The split

```
        question
            │
            ▼
     model decides which tools to call
            │
   ┌────────┴────────┐
   ▼                 ▼
quant engine     RAG over docs
(the numbers)    (the context)
   └────────┬────────┘
            ▼
   model writes prose about
   values it did not invent
```

Everything numeric comes back from a tool call. The model's job is selection
and explanation.

## 1. Make the engine callable, not promptable

Do not put your metrics in the system prompt. Expose them as tools with typed
arguments:

```java
@Bean
public FunctionCallback riskMetrics(PortfolioService portfolios) {
  return FunctionCallbackWrapper.builder(
      (RiskRequest req) -> portfolios.riskMetrics(req.portfolioId(), req.window()))
    .withName("risk_metrics")
    .withDescription("Sharpe, Sortino, max drawdown and 95% VaR for a portfolio "
                   + "over a window. Use whenever the user asks how risky "
                   + "something is or how it performed.")
    .build();
}
```

Numbers in the prompt go stale, get truncated and get averaged by the model.
Numbers from a tool call are current and traceable.

## 2. RAG for context, tools for values

These are different jobs and mixing them is the usual failure:

| Question | Answered by |
| --- | --- |
| "What is my VaR?" | tool call |
| "What does VaR mean here?" | retrieval over docs |
| "Why did drawdown spike in March?" | tool call **and** retrieval |

Embeddings retrieve *explanations*. They must never be the source of a figure —
a nearest-neighbour match on last quarter's report will confidently return last
quarter's number.

Keeping vectors in [[pgvector]] rather than a separate vector database means
retrieval and the engine share one connection, one backup, and one
`docker compose up`.

## 3. Constrain the narration prompt

```
You explain portfolio analytics to an informed but non-expert reader.

RULES
- Every figure you state must come from a tool result in this conversation.
- If you need a figure you do not have, call the tool. Never estimate.
- If a tool fails, say the figure is unavailable. Do not substitute.
- Round for readability, but never restate a rounded figure as exact.
```

That fourth rule matters more than it looks. Without it a model handed a failed
call will reach for something plausible from context.

## 4. Show your working in the UI

Render each figure with its provenance — which tool, which window, what time.
It costs a tooltip and it converts "the AI said" into "the engine said, and
here is the call".

It also makes the failure mode loud instead of silent: a number with no
provenance is a bug you can see.

## 5. Test the refusals

Your test suite should assert the model **declines**:

- Ask for a metric with the tool stubbed to fail → must say unavailable.
- Ask about a portfolio that doesn't exist → must not invent one.
- Ask for a figure outside the available window → must say so.

Anyone can test the happy path. The refusals are the product.

## 6. Seed a demo that runs offline

[[QuantLens]] ships three seeded personas and comes up with one
`docker compose up`, no API keys. If a reviewer needs a setup guide, the
project failed before they read a line of code — and a demo that can't run
without live market data can't run at all in six months.

## Related

[[QuantLens]] · [[QuantLens Narrator]] · [[Agent Patterns]] · [[pgvector]] · [[Java]]
