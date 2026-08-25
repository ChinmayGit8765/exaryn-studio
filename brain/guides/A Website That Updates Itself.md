---
title: A Website That Updates Itself
type: guide
level: beginner
time: 18 min
order: 2
stack: [Python, GitHub Actions, GitHub Pages]
built: Exaryn Studio
summary: A content site that rebuilds from live sources every morning, costs nothing, and has no server to keep alive.
tags: [guide, cron, static, feeds]
---

# A Website That Updates Itself

A site with fresh content usually implies a server, a database and a bill. It
doesn't have to. If content changes on a *schedule* rather than on a *request*,
you can regenerate it in CI and serve plain files.

This is how the [[Daily Signal Pipeline]] on this site works: ~20 feeds swept
every morning into a JSON file the page fetches.

## Why not fetch the feeds in the browser

Three reasons, and they all bite immediately:

1. **CORS.** Most feeds don't send permissive headers. You can't read them.
2. **Speed.** Twenty sequential fetches per visitor is a slow page.
3. **Fragility.** A source that is down breaks the page for everyone, live.

Fetching at build time fixes all three: one machine pays the cost once a day,
and visitors get a single fast JSON file.

## 1. Normalise everything into one shape

RSS and Atom disagree about nearly every field name. Flatten them at the door
so nothing downstream has to care:

```python
{
  "title": "...",
  "url": "https://...",
  "source": "Hacker News",
  "kind": "news",           # news | video | paper
  "published": "2026-08-25T02:14:00Z",
  "summary": "...",
}
```

One normalised record type means the renderer is a single function, and adding
a source later is a one-line change to a list.

## 2. Fetch in parallel, fail softly

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def pull(source, url, kind):
    try:
        return parse_feed(fetch(url), source, kind)
    except Exception as err:
        print(f"  ! {source}: {err}", file=sys.stderr)
        return []          # a dead feed is a warning, never a build failure

items = []
with ThreadPoolExecutor(max_workers=8) as pool:
    futures = [pool.submit(pull, *feed) for feed in FEEDS]
    for future in as_completed(futures):
        items.extend(future.result())
```

> [!tip] The failure policy is the whole design
> One dead source must never take the site down. It logs, it's skipped, and
> yesterday's file stays live until a good run replaces it. Degrade to *slightly
> stale*, never to *broken*.

## 3. Cap per source, not just overall

Without per-source caps one prolific feed eats the page. arXiv will publish
forty papers while The Verge publishes two:

```python
MAX_PER_SOURCE = {"news": 6, "video": 3, "paper": 5}
MAX_AGE_DAYS   = {"news": 7, "video": 21, "paper": 7}
```

Different content types have genuinely different half-lives. A three-week-old
explainer video is still worth watching; a three-week-old news item is not.

## 4. Archive every run

Write today's file *and* a dated copy:

```python
OUT.write_text(payload)
(ARCHIVE / f"{today}.json").write_text(payload)
```

A few KB per day buys you a browsable history for free. This site's day-by-day
archive is literally just a directory listing written to `index.json`.

## 5. One workflow, two behaviours

Let the trigger decide whether to regenerate:

```yaml
on:
  push: { branches: [main] }
  schedule: [{ cron: "0 21 * * *" }]
  workflow_dispatch:

# …
      - name: Refresh
        if: github.event_name != 'push'
        run: python3 scripts/digest.py
```

A plain push deploys exactly what you committed — which keeps rollbacks
honest. A cron or manual run regenerates first, commits with `[skip ci]`, then
deploys.

## 6. Keep the script dependency-free

The digest script here is stdlib only: `urllib`, `xml.etree`, `json`. No
`pip install` step in CI means no transitive dependency that can break your
Tuesday morning. For feed parsing, the stdlib genuinely is enough:

```python
import xml.etree.ElementTree as ET

def local(tag):                      # strip the namespace Atom insists on
    return tag.rsplit("}", 1)[-1]
```

## What you get

No server. No database. No cold starts. A CDN-served page that is as fast as a
static site because it *is* one — and every daily update is a git commit you
can diff, bisect and revert.

## Related

[[Build a Daily Anything Game]] · [[Daily Signal Pipeline]] · [[Digest Bot]] · [[Cron Ledger]] · [[Python]]
