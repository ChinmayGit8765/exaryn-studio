---
title: Publish an Obsidian Vault to a Static Site
type: guide
level: intermediate
time: 20 min
order: 3
stack: [Python, Vanilla JS, Obsidian]
built: Exaryn Studio
summary: Turn a folder of markdown notes into a browsable web vault with backlinks, tags, search and a graph — no static site generator.
tags: [guide, obsidian, markdown, static]
---

# Publish an Obsidian Vault to a Static Site

Obsidian's own publish product is excellent and costs money. If your vault is
already in a git repo next to a static site, you can serve it yourself for
nothing, and keep the vault fully usable in Obsidian at the same time.

This guide is how the brain on this site works — see [[Brain Pipeline]].

## The one hard constraint

**A static host has no directory listing.** The browser cannot walk `brain/` to
discover ninety markdown files, because there is nothing to walk. Any solution
starts by answering "how does the client learn what exists?"

Three options:

| Approach | Requests | Search | Graph |
| --- | --- | --- | --- |
| One file per note + a manifest | 1 + 1 per note | needs a search index | needs an edge list |
| Pre-render each note to HTML | 1 per note | needs an index | needs an edge list |
| **Bundle the whole vault into one JSON** | **1** | **free** | **free** |

For a vault under a few thousand notes, bundle. This one is 100 notes and
~200KB — smaller than a hero image, and it arrives before the first paint
finishes.

## 1. Parse the frontmatter

You do not need a YAML library for the subset Obsidian writes:

```python
def parse_note(text):
    """Split a markdown file into (frontmatter dict, body)."""
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    head, body = text[3:end], text[end + 4:]
    meta, key = {}, None
    for line in head.splitlines():
        if line.lstrip().startswith("- ") and key:      # block list
            meta.setdefault(key, []).append(line.lstrip()[2:].strip())
            continue
        if ":" not in line:
            continue
        key, _, raw = line.partition(":")
        meta[key.strip()] = fm_value(raw)               # inline list / bool / str
    return meta, body.lstrip("\n")
```

## 2. Resolve wikilinks the way Obsidian does

`[[Target]]`, `[[Target|alias]]` and `[[Target#heading]]` all point at a note by
**title first, then filename, then alias**. Build one lowercased index and
resolve against it:

```python
WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]")
CODE_RE = re.compile(r"```.*?```|`[^`\n]*`", re.S)

index = {}
for n in notes:
    index.setdefault(n["title"].lower(), n["id"])
    index.setdefault(Path(n["id"]).name.lower(), n["id"])
    for alias in n["aliases"]:
        index.setdefault(alias.lower(), n["id"])
```

> [!warning] Strip code before extracting links
> A guide that *documents* wikilink syntax contains `[[like this]]` inside
> backticks. Without `CODE_RE.sub("", body)` first, every such example becomes
> a broken link in your graph. This exact bug produced four phantom edges here.

## 3. Compute backlinks once, server side

Backlinks are just the reverse index, and computing them at build time means
the browser never has to:

```python
backlinks = {n["id"]: [] for n in notes}
for n in notes:
    prose = CODE_RE.sub("", n["body"])
    n["links"] = [index[m.group(1).strip().lower()]
                  for m in WIKILINK_RE.finditer(prose)
                  if m.group(1).strip().lower() in index]
    for target in n["links"]:
        backlinks[target].append(n["id"])
```

## 4. Never generate a broken link

If you also *generate* notes from data — one per project, one per repo — the
generator must only link things that exist:

```python
def maybe_link(name, vocab):
    """[[Name]] when a note exists for it, plain text when it does not."""
    return f"[[{name}]]" if name.lower() in vocab else name
```

Build `vocab` by scanning the vault before generating. Now `"FastAPI"` renders
as plain text until the day you write `stack/FastAPI.md`, at which point it
becomes a link everywhere, automatically.

## 5. Render markdown in the browser

You need less than you think. Headings, lists, tables, fenced code,
blockquotes, callouts and links cover a whole vault — about 180 lines, versus
40KB of library. The one subtlety is inline parsing order:

**Lift code spans out first**, then escape HTML, then handle wikilinks, then
emphasis. Otherwise `` `**not bold**` `` renders bold.

```js
const code = [];
let out = src.replace(/`([^`]+)`/g, (_, c) => {
  code.push(c);
  return `${code.length - 1}`;   // sentinel, not a bare number
});
// … escape, wikilinks, emphasis …
return out.replace(/(\d+)/g, (_, i) => `<code>${esc(code[+i])}</code>`);
```

Use a private-use sentinel, not `` ` 0 ` ``. A bare number placeholder will
happily eat "529 offline tests" out of your prose. Ask how I know.

## 6. The graph is 40 lines

Nodes are notes, edges are resolved links, and a naive O(n²) repulsion loop is
perfectly fine under a few hundred nodes:

```js
for (const a of nodes) {                          // pull toward centre
  a.vx += (cx - a.x) * 0.0016;
  a.vy += (cy - a.y) * 0.0016;
}
// … pairwise repulsion, then spring along each edge, then damp …
```

Run the simulation for a few seconds and stop. A graph that jitters forever
costs battery and adds nothing.

## Keep the vault a vault

The point of doing it this way is that `brain/` stays openable in Obsidian.
So: commit the generated notes, mark them `generated: true` with a visible
banner, and never introduce syntax that only your renderer understands.

## Related

[[Brain Pipeline]] · [[Brain Indexer]] · [[A Website That Updates Itself]] · [[Python]]
