#!/usr/bin/env python3
"""Build data/digest.json — the studio's daily signal.

Pulls from public RSS/Atom feeds (news, papers, YouTube channels),
normalizes everything into one sorted list, and writes JSON the
static site renders. Stdlib only, so CI needs no pip install.

Run:  python scripts/digest.py
"""

import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "digest.json"

# (source label, feed url, kind)  — kind: news | video | paper
FEEDS = [
    # -------- news / blogs --------
    ("Hacker News", "https://hnrss.org/frontpage?points=100", "news"),
    ("Hacker News · AI", "https://hnrss.org/newest?q=AI%20OR%20LLM&points=60", "news"),
    ("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/", "news"),
    ("The Verge AI", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "news"),
    ("VentureBeat AI", "https://venturebeat.com/category/ai/feed/", "news"),
    ("MIT Tech Review", "https://www.technologyreview.com/topic/artificial-intelligence/feed", "news"),
    ("Hugging Face", "https://huggingface.co/blog/feed.xml", "news"),
    ("Google AI", "https://blog.google/technology/ai/rss/", "news"),
    ("OpenAI", "https://openai.com/news/rss.xml", "news"),
    ("Simon Willison", "https://simonwillison.net/atom/everything/", "news"),
    # -------- papers --------
    ("arXiv cs.AI", "https://rss.arxiv.org/rss/cs.AI", "paper"),
    ("arXiv cs.LG", "https://rss.arxiv.org/rss/cs.LG", "paper"),
    # -------- videos (YouTube channel feeds) --------
    ("Fireship", "https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA", "video"),
    ("Two Minute Papers", "https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg", "video"),
    ("AI Explained", "https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw", "video"),
    ("3Blue1Brown", "https://www.youtube.com/feeds/videos.xml?channel_id=UCYO_jab_esuFRV4b17AJtAw", "video"),
    ("Andrej Karpathy", "https://www.youtube.com/feeds/videos.xml?channel_id=UCXUPKJO5MZQN11PqgIvyuvQ", "video"),
    ("Computerphile", "https://www.youtube.com/feeds/videos.xml?channel_id=UC9-y-6csu5WGm29I7JiwpnA", "video"),
    ("ThePrimeagen", "https://www.youtube.com/feeds/videos.xml?channel_id=UC8ENHE5xdFSwx71u3fDH5Xw", "video"),
    ("Theo", "https://www.youtube.com/feeds/videos.xml?channel_id=UCbRP3c757lWg9M-U7TyEkXA", "video"),
]

MAX_PER_SOURCE = {"news": 6, "video": 3, "paper": 5}
MAX_AGE_DAYS = {"news": 7, "video": 21, "paper": 7}
MAX_TOTAL = 100
TIMEOUT = 20

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(
        url, headers={"User-Agent": "ExarynDigest/1.0 (+static site feed builder)"}
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
        return res.read()


def local(tag: str) -> str:
    """Strip XML namespace from a tag name."""
    return tag.rsplit("}", 1)[-1]


def text_of(node) -> str:
    return html.unescape((node.text or "").strip()) if node is not None else ""


def clean_summary(raw: str) -> str:
    txt = WS_RE.sub(" ", TAG_RE.sub(" ", html.unescape(raw))).strip()
    return txt[:220].rsplit(" ", 1)[0] + "…" if len(txt) > 220 else txt


def parse_date(raw: str):
    if not raw:
        return None
    for parser in (
        lambda s: parsedate_to_datetime(s),
        lambda s: datetime.fromisoformat(s.replace("Z", "+00:00")),
    ):
        try:
            dt = parser(raw)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except (ValueError, TypeError):
            continue
    return None


def parse_feed(xml_bytes: bytes, source: str, kind: str) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    items = []

    for node in root.iter():
        if local(node.tag) not in ("item", "entry"):
            continue

        title, url, published, summary, thumb = "", "", None, "", ""
        for child in node:
            name = local(child.tag)
            if name == "title":
                title = text_of(child)
            elif name == "link":
                # RSS: text content; Atom: href attribute
                url = url or text_of(child) or child.get("href", "")
            elif name in ("pubDate", "published", "updated", "date"):
                published = published or parse_date(text_of(child))
            elif name in ("description", "summary"):
                summary = summary or text_of(child)
            elif name == "group":  # media:group (YouTube)
                for m in child.iter():
                    if local(m.tag) == "thumbnail":
                        thumb = m.get("url", "")

        if not title or not url:
            continue
        items.append(
            {
                "title": title,
                "url": url.strip(),
                "source": source,
                "kind": kind,
                "published": (published or datetime.now(timezone.utc)).isoformat(),
                **({"summary": clean_summary(summary)} if summary and kind != "video" else {}),
                **({"thumbnail": thumb} if thumb else {}),
            }
        )
    return items


def pull(source: str, url: str, kind: str) -> list[dict]:
    try:
        items = parse_feed(fetch(url), source, kind)
        cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS[kind])
        fresh = [
            i for i in items if datetime.fromisoformat(i["published"]) >= cutoff
        ]
        fresh.sort(key=lambda i: i["published"], reverse=True)
        kept = fresh[: MAX_PER_SOURCE[kind]]
        print(f"  ok   {source}: {len(kept)} kept ({len(items)} in feed)")
        return kept
    except Exception as e:  # a dead feed must never kill the digest
        print(f"  FAIL {source}: {type(e).__name__}: {e}", file=sys.stderr)
        return []


def main() -> None:
    print(f"building digest from {len(FEEDS)} feeds…")
    all_items: list[dict] = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(pull, *feed) for feed in FEEDS]
        for f in as_completed(futures):
            all_items.extend(f.result())

    # dedupe by URL, newest first
    seen, unique = set(), []
    all_items.sort(key=lambda i: i["published"], reverse=True)
    for item in all_items:
        key = item["url"].rstrip("/")
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)

    digest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "items": unique[:MAX_TOTAL],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(digest, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {len(digest['items'])} items → {OUT}")

    if not digest["items"]:
        sys.exit(1)  # all feeds failing means something is broken — fail loudly


if __name__ == "__main__":
    main()
