---
title: Run a Fleet of Coding Agents
type: guide
level: intermediate
time: 16 min
order: 4
stack: [Node.js, Git worktrees, Docker, Traefik]
built: Claude Work Manager
summary: Running five coding agents at once is a write-conflict problem, not a reasoning problem. Give each one its own checkout.
tags: [guide, agents, git, docker]
---

# Run a Fleet of Coding Agents

Everyone's first attempt at parallel coding agents fails the same way: two
agents edit the same file, one clobbers the other, and the session becomes an
archaeology exercise.

The instinct is to coordinate — locks, turn-taking, a supervisor that assigns
files. Don't. **Isolate instead.** [[Claude Work Manager]] and
[[Worktree Optimiser]] are the two halves of that idea.

## Worktrees, not clones

`git worktree` gives you a second working directory backed by the *same* object
store. Cheap, instant, and every worktree is a real checkout:

```sh
git worktree add ../work/fix-login -b fix-login
git worktree add ../work/refactor-api -b refactor-api
git worktree list
```

One agent per worktree means two agents editing the same file is *impossible*,
not merely discouraged. No locks, no coordination protocol, no supervisor
arbitrating writes.

```
repo/.git  ─┬─ repo/                 (you)
            ├─ work/fix-login/       (agent 1)
            ├─ work/refactor-api/    (agent 2)
            └─ work/flaky-test/      (agent 3)
```

## Spawn agents against the CLI you already authenticated

Don't build an API-key vault. If you have a coding CLI logged in on the
machine, wrap it:

```js
import { spawn } from "node:child_process";

function startAgent({ id, cwd, prompt }) {
  const proc = spawn("claude", ["-p", prompt], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  sessions.set(id, { proc, cwd, log: [] });
  proc.stdout.on("data", (d) => sessions.get(id).log.push(d.toString()));
  return id;
}
```

No keys are stored anywhere, and revoking access is `claude logout`.

> [!tip] Make it mobile-first
> Most fleet supervision is *reading* — checking whether an agent went sideways
> and nudging it. That is phone work. Build the read path for a 390px screen
> first and the desktop layout falls out for free.

## Give every branch a running environment

Isolation solves *who is editing what*. It doesn't solve *what is running
where* — three agents all trying to bind port 3000. Container per worktree,
routed by hostname:

```yaml
services:
  fix-login:
    build: ../work/fix-login
    labels:
      - "traefik.http.routers.fix-login.rule=Host(`fix-login.localhost`)"
```

Now `fix-login.localhost` and `refactor-api.localhost` are both live. Reviewing
a PR against your own branch is two browser tabs instead of a stash-and-swap —
which is, empirically, the most common way to lose an hour.

## Expose the lifecycle as tools, not just UI

The mistake worth avoiding: building the dashboard first and the agent
interface second. Everything a human can click should be callable:

```js
server.tool("worktree_start", { branch: z.string() }, async ({ branch }) => {
  await compose.up(branch);
  return { url: `http://${branch}.localhost` };
});
```

Now an agent working on `fix-login` can bring its own environment up, check it,
and tear it down without a human in the loop. See
[[Give Your Tool to Agents with MCP]] and [[Worktree MCP Server]].

## Merging back

Worktrees make the writes safe; they don't make the merges disappear. What
works:

- **Small branches.** An agent that touches four files merges cleanly. One that
  touches forty does not.
- **Merge the base in, don't rebase.** On a branch someone (or something) else
  may have checked out, a merge commit keeps every existing checkout valid.
- **Regenerate lockfiles with the tooling**, never resolve them by hand.
- **Review the diff, not the transcript.** The diff is what ships.

## The lesson

> The hard part of running several agents is not reasoning. It is write
> conflicts — and isolation deletes the problem instead of managing it.

Which is [[Studio Principles|principle 2]], and it generalises well past coding
agents.

## Related

[[Claude Work Manager]] · [[Worktree Optimiser]] · [[Worktree Workflow]] · [[Fleet Supervisor]] · [[Give Your Tool to Agents with MCP]]
