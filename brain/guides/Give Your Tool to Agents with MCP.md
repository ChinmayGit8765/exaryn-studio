---
title: Give Your Tool to Agents with MCP
type: guide
level: intermediate
time: 14 min
order: 5
stack: [TypeScript, MCP, Node.js]
built: Worktree Optimiser
summary: If a human can click it, an agent should be able to call it. How to wrap an existing tool in a Model Context Protocol server without rewriting it.
tags: [guide, agents, mcp, protocol]
---

# Give Your Tool to Agents with MCP

You built a dev tool with a dashboard. An agent now wants to use it, and its
only options are driving your browser UI or shelling out to your CLI and
parsing stdout. Both are bad.

MCP is the fix: describe your operations as typed tools, and any MCP-speaking
agent can call them. [[Worktree Optimiser]] does this for container lifecycle;
[[QuantLens]] embeds one so external agents query the same quant engine the UI
does.

## Design the lifecycle once, expose it twice

The mistake — the one made here, and worth not repeating — is building the UI
first and retrofitting tools onto it. UI-shaped code leaks UI assumptions:
optimistic updates, implicit "current selection", multi-step wizards.

Extract a plain service layer first. Then both front doors are thin:

```
              ┌─ dashboard (HTTP)
  lifecycle ──┤
              └─ MCP server (tools)
```

```ts
// The only place that knows how a worktree becomes a running container.
export const lifecycle = {
  async start(branch: string): Promise<{ url: string }> { … },
  async stop(branch: string): Promise<void> { … },
  async list(): Promise<Worktree[]> { … },
  async logs(branch: string, lines: number): Promise<string> { … },
};
```

## A minimal server

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "worktree-optimiser", version: "1.0.0" });

server.tool(
  "worktree_start",
  "Start the dev container for a branch and return the URL it is served at.",
  { branch: z.string().describe("Branch name, e.g. fix-login") },
  async ({ branch }) => {
    const { url } = await lifecycle.start(branch);
    return { content: [{ type: "text", text: `Running at ${url}` }] };
  },
);

await server.connect(new StdioServerTransport());
```

## Write descriptions for the model, not the docs site

The tool description **is** the prompt. It is the only thing the model sees when
deciding whether to call you. Two rules:

- Say what it does *and when to use it*. `"Start the dev container for a branch"`
  beats `"Starts a container"`.
- Say what it costs. If a call takes 40 seconds or spends money, put that in
  the description. Models route around expensive tools sensibly when told.

```ts
{ branch: z.string().describe("Branch name as shown by `git branch`, e.g. fix-login") }
```

Zod `.describe()` calls become the JSON Schema the model reads. Fill them in.

## Return text the model can act on

Returning `{"ok": true}` is a dead end — the model learns nothing. Return the
next useful fact:

```ts
return { content: [{ type: "text", text:
  `fix-login is running at http://fix-login.localhost (started 2.1s ago). ` +
  `Logs: worktree_logs({branch:"fix-login"}).` }] };
```

Errors especially. `"Branch 'fix-logon' not found. Existing: fix-login,
refactor-api, main."` turns a dead end into a self-correction.

## Keep tools coarse

One tool per *intent*, not per HTTP endpoint. `worktree_start` that creates the
worktree, builds and routes it beats three tools the model has to sequence.
Every tool boundary is a chance for the model to stop halfway.

## Gate the dangerous ones

An MCP server is an execution surface. Anything destructive gets the treatment
in [[Tool Safety]] — allowlist, capability tier, audit trail:

```ts
const TIER = { worktree_list: "read", worktree_logs: "read",
               worktree_start: "write", worktree_destroy: "destructive" };
```

Reads flow freely; destructive calls justify themselves. A flat permission list
makes everything look equally serious, so it gets approved in bulk and stops
meaning anything.

## Test it without an agent

The transport is JSON-RPC over stdio, so it is scriptable:

```sh
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/mcp.js
```

If `tools/list` returns descriptions you would be happy to read cold, the
server is done.

## Related

[[Worktree MCP Server]] · [[Worktree Optimiser]] · [[MCP]] · [[Tool Safety]] · [[Run a Fleet of Coding Agents]]
