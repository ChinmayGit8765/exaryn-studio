#!/usr/bin/env python3
"""Write llms.txt and llms-full.txt — the site, described for machines.

The site is static HTML, so a crawler can already read the pages. What it
cannot do is see the shape of the place: which of 17 projects are shipped and
which are in development, that the essays live under notes/, that there is a
101-note Obsidian vault behind agents.html, or that all of it is available as
plain JSON. That map is what these two files are for.

  llms.txt        the index — every page, every project, every essay, one line
                  each, plus where the machine-readable data lives
  llms-full.txt   the same, expanded: full project descriptions, architecture
                  notes and lessons, and the hand-written notes from the vault

Both are generated from the same data the site itself reads, so they cannot
drift from it. Deliberately no timestamp in either file: the daily cron runs
this on every build, and a date line would churn the git history whether or
not anything actually changed.

Stdlib only. Never touches the network.

Run:  python scripts/llms.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

BASE = "https://chinmaygit8765.github.io/exaryn-studio"

SUMMARY = (
    "Exaryn is a one-person R&D studio run by Chinmay Purohit from Melbourne, "
    "Australia — AI agents, quant engines, daily games and developer tooling, built "
    "and written up in public. This site is the portfolio, a daily digest of AI news "
    "that rebuilds itself every morning on a cron, and the Exaryn Brain: an Obsidian "
    "vault documenting every project, agent and system, readable in the browser."
)

# Static pages, in nav order. (path, title, description)
PAGES = [
    ("index.html", "Home", "Landing page — hero, featured work, the brain, and a teaser of the day's digest."),
    ("projects.html", "Work — project index", "Every project, filterable by category. Click a row to expand its details."),
    ("agents.html", "Agents — the agent struct", "The agent roster: tiers, the rules each one runs under, and everything built with them."),
    ("brain.html", "The Exaryn Brain", "The Obsidian vault rendered in the browser — wikilinks, backlinks, tags, search and a force-directed graph."),
    ("notes.html", "Field Notes", "Long-form essays from the workshop."),
    ("feed.html", "The Daily Signal", "The full AI digest with source and kind filters. Rebuilt every morning by a GitHub Actions cron."),
    ("play.html", "Play", "One Piece Guess, embedded and playable in the page."),
    ("about.html", "About", "Who runs this and how to get in touch."),
]

# Machine-readable data files. (path, description)
DATA_FILES = [
    ("data/projects.json", "The portfolio, hand-maintained. Name, tagline, description, tech, status, year, category, repo, architecture, highlights, lessons, links."),
    ("data/articles.json", "Essay index — slug, title, dek, tag, date, reading time."),
    ("data/brain.json", "The whole Obsidian vault bundled for the browser: every note's frontmatter, body, resolved links and backlinks."),
    ("data/repos.json", "Generated: a sweep of the GitHub account — language breakdown, topics, licence, sizes, timestamps, README blurb."),
    ("data/digest.json", "Generated daily: the AI news, papers and videos in the current digest."),
    ("data/stats.json", "The token meter shown on the site."),
]

STATUS_ORDER = {"shipped": 0, "in development": 1, "archived": 2}


def load(name):
    path = DATA / name
    try:
        with path.open(encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        sys.exit(f"llms: cannot read {path.relative_to(ROOT)} — {exc}")


def project_url(project):
    """Best public URL for a project: live site, else repo, else its brain note."""
    links = project.get("links") or {}
    return links.get("live") or links.get("repo") or f"{BASE}/projects.html"


def sort_projects(projects):
    """Shipped first, then newest, then alphabetical — the order a reader wants."""
    return sorted(
        projects,
        key=lambda p: (
            STATUS_ORDER.get(p.get("status"), 9),
            -int(p.get("year") or 0),
            p.get("name", ""),
        ),
    )


def inline_note_body(text, title, shift=2):
    """Prepare a vault note for inlining under an H2.

    Strips the generated-note callout, drops a leading H1 that just repeats the
    note title, and pushes every remaining heading down `shift` levels so the
    note's own outline nests under its heading here instead of colliding with
    it. Fenced code blocks are left alone — a `#` in there is a comment, not a
    heading.
    """
    text = re.sub(r"^> \[!\w+\].*?(?=\n\n|\Z)", "", text, flags=re.S | re.M).strip()
    text = re.sub(r"^#\s+" + re.escape(title) + r"\s*$", "", text, count=1, flags=re.M).strip()

    lines, in_fence = [], False
    for line in text.split("\n"):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
        elif not in_fence:
            heading = re.match(r"(#{1,6})(\s+)", line)
            if heading:
                level = min(len(heading.group(1)) + shift, 6)
                line = "#" * level + line[len(heading.group(1)):]
        lines.append(line)
    return "\n".join(lines).strip()


def render_index(projects, articles, brain, repos, digest):
    out = []
    add = out.append

    add("# Exaryn")
    add("")
    add(f"> {SUMMARY}")
    add("")
    add("This file follows the llms.txt convention (https://llmstxt.org). The site is")
    add("pure static HTML with no build step, so every page below is directly readable —")
    add("this file is a map of what is where, not a substitute for the pages. For the")
    add("same map with full project descriptions and the hand-written notes from the")
    add(f"vault inlined, see {BASE}/llms-full.txt.")
    add("")

    add("## Pages")
    add("")
    for path, title, desc in PAGES:
        add(f"- [{title}]({BASE}/{path}): {desc}")
    add("")

    shipped = sum(1 for p in projects if p.get("status") == "shipped")
    add("## Projects")
    add("")
    add(
        f"{len(projects)} projects, {shipped} of them shipped. Full details on each are in "
        f"llms-full.txt and in data/projects.json; each also has a note in the brain."
    )
    add("")
    for project in sort_projects(projects):
        bits = [
            project.get("status", "").strip(),
            project.get("year", "").strip(),
            project.get("category", "").strip(),
        ]
        meta = " · ".join(b for b in bits if b)
        tech = ", ".join(project.get("tech", [])[:4])
        tail = f" ({meta} — {tech})" if tech else f" ({meta})"
        add(f"- [{project['name']}]({project_url(project)}): {project.get('tagline', '').rstrip('.')}.{tail}")
    add("")

    add("## Field notes")
    add("")
    add("Newest first.")
    add("")
    for article in sorted(articles, key=lambda a: a.get("date", ""), reverse=True):
        minutes = article.get("minutes")
        mins = f" ({minutes} min read)" if minutes else ""
        add(f"- [{article['title']}]({BASE}/notes/{article['slug']}.html): {article.get('dek', '').strip()}{mins}")
    add("")

    add("## The Exaryn Brain")
    add("")
    add(
        f"An Obsidian vault of {brain.get('count', 0)} notes ({brain.get('words', 0):,} words, "
        f"{brain.get('edges', 0)} resolved wikilinks) documenting every project, agent, system and "
        "repo. Plain markdown with YAML frontmatter — clone the repo and open brain/ as a vault, "
        "or read it in the browser."
    )
    add("")
    add(f"- [Read it in the browser]({BASE}/brain.html): rendered from data/brain.json, with backlinks, tags, search and a graph.")
    folders = brain.get("folders", {})
    for folder in sorted(folders, key=lambda f: -folders[f]):
        if not folder:
            continue
        add(f"- `brain/{folder}/` — {folders[folder]} notes")
    add("")

    add("## Machine-readable data")
    add("")
    add("Every page on this site is rendered from these files. If you want the underlying")
    add("facts rather than the prose, read these instead of scraping the HTML.")
    add("")
    for path, desc in DATA_FILES:
        add(f"- [{path}]({BASE}/{path}): {desc}")
    add("")

    add("## Optional")
    add("")
    add("Secondary material — skip unless the question is specifically about it.")
    add("")
    add(
        f"- [The Daily Signal]({BASE}/feed.html): {len(digest.get('items', []))} items in the current "
        "digest, pulled from RSS and Atom feeds by scripts/digest.py each morning. The contents change "
        "daily; read data/digest.json for the live set rather than relying on anything cached here."
    )
    add(
        f"- [Repo metadata]({BASE}/data/repos.json): {repos.get('count', 0)} repositories swept from the "
        "GitHub API, refreshed on the same daily cron."
    )
    add(f"- [Interactive demos]({BASE}/demos/): recorded walkthroughs of QuantFlex, Prompterjack and Solo Strength Quest.")
    add(f"- [Source](https://github.com/{repos.get('owner', 'ChinmayGit8765')}/exaryn-studio): the site itself — static HTML, no framework, no build step.")
    add("")

    add("---")
    add("")
    add("Generated by scripts/llms.py from data/. Do not edit by hand.")
    return "\n".join(out) + "\n"


def render_full(projects, articles, brain):
    out = []
    add = out.append

    add("# Exaryn — full site content")
    add("")
    add(f"> {SUMMARY}")
    add("")
    add(f"The index version of this file, with links only, is at {BASE}/llms.txt.")
    add("")
    add("Contents: every project in full, the essays, and every hand-written note from")
    add("the Exaryn Brain. Generated notes (one per project and per repo, plus the map")
    add("tables) are omitted here — they are derived from the project data already")
    add("above, and reproducing them would only pad the file.")
    add("")

    add("---")
    add("")
    add("# Projects")
    add("")
    for project in sort_projects(projects):
        add(f"## {project['name']}")
        add("")
        meta = [
            f"Status: {project.get('status', 'unknown')}",
            f"Year: {project.get('year', '—')}",
            f"Category: {project.get('category', '—')}",
        ]
        if project.get("devTime"):
            meta.append(f"Build time: {project['devTime']}")
        if project.get("repo"):
            meta.append(f"Repo: https://github.com/{project['repo']}")
        links = project.get("links") or {}
        if links.get("live"):
            meta.append(f"Live: {links['live']}")
        add(" · ".join(meta))
        add("")
        if project.get("tech"):
            add(f"Built with: {', '.join(project['tech'])}.")
            add("")
        if project.get("tagline"):
            add(f"**{project['tagline'].strip()}**")
            add("")
        if project.get("description"):
            add(project["description"].strip())
            add("")
        if project.get("architecture"):
            add(f"Architecture — {project['architecture'].strip()}")
            add("")
        if project.get("highlights"):
            add("What is in it:")
            add("")
            for highlight in project["highlights"]:
                add(f"- {highlight}")
            add("")
        if project.get("lessons"):
            add(f"Lesson — {project['lessons'].strip()}")
            add("")
        if project.get("agents"):
            add(f"Agents involved: {', '.join(project['agents'])}.")
            add("")

    add("---")
    add("")
    add("# Field notes")
    add("")
    for article in sorted(articles, key=lambda a: a.get("date", ""), reverse=True):
        add(f"## {article['title']}")
        add("")
        minutes = article.get("minutes")
        add(
            f"{BASE}/notes/{article['slug']}.html · {article.get('date', '')}"
            + (f" · {minutes} min read" if minutes else "")
        )
        add("")
        add(article.get("dek", "").strip())
        add("")

    handwritten = [n for n in brain.get("notes", []) if not n.get("generated")]
    handwritten.sort(key=lambda n: (n.get("folder", ""), n.get("title", "")))
    add("---")
    add("")
    add("# The Exaryn Brain — hand-written notes")
    add("")
    add(
        f"{len(handwritten)} of the vault's {brain.get('count', 0)} notes are written by hand; "
        "the rest are generated from data/projects.json and data/repos.json. Wikilinks are left "
        "as [[Title]] — they resolve against the note titles in this section."
    )
    add("")
    for note in handwritten:
        add(f"## {note['title']}")
        add("")
        bits = [f"Path: {note.get('path', '')}", f"Type: {note.get('type', 'note')}"]
        if note.get("tags"):
            bits.append(f"Tags: {', '.join(note['tags'])}")
        add(" · ".join(bits))
        add("")
        add(inline_note_body(note.get("body", ""), note["title"]))
        add("")

    add("---")
    add("")
    add("Generated by scripts/llms.py from data/. Do not edit by hand.")
    return "\n".join(out) + "\n"


def main():
    projects = load("projects.json")
    articles = load("articles.json")
    brain = load("brain.json")
    repos = load("repos.json")
    digest = load("digest.json")

    for name, content in (
        ("llms.txt", render_index(projects, articles, brain, repos, digest)),
        ("llms-full.txt", render_full(projects, articles, brain)),
    ):
        (ROOT / name).write_text(content, encoding="utf-8")
        print(f"  wrote {name} ({len(content.encode('utf-8')) / 1024:.1f} KB)")

    print(f"  {len(projects)} projects, {len(articles)} essays, {brain.get('count', 0)} vault notes")


if __name__ == "__main__":
    main()
