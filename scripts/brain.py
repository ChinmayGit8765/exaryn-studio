#!/usr/bin/env python3
"""Build the Exaryn Brain — the Obsidian vault under brain/, and the bundle
the website reads.

Two jobs:

  1. GENERATE  one note per project (from data/projects.json) and one per repo
     (from data/repos.json), plus the maps that are really just tables:
     Projects Map, Repos Map, Timeline, Agent Ledger. These carry
     `generated: true` and are overwritten on every run.

  2. BUNDLE    walk every .md in brain/ — generated or hand-written — parse its
     frontmatter, resolve [[wikilinks]] into a real link graph with backlinks,
     and write data/brain.json. GitHub Pages has no directory listing, so the
     browser needs one file to read the whole vault from.

Stdlib only. Never touches the network — run scripts/repos.py first if the repo
metadata needs refreshing.

Run:  python scripts/brain.py
      python scripts/brain.py --bundle-only    # skip generation
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VAULT = ROOT / "brain"
DATA = ROOT / "data"
BUNDLE = DATA / "brain.json"

BANNER = "> [!warning] Generated note\n> Written by `scripts/brain.py` from `data/{src}`. Hand edits are overwritten — change the data instead.\n"

WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]")
FM_LIST_RE = re.compile(r"^\[(.*)\]$")
CODE_RE = re.compile(r"```.*?```|`[^`\n]*`", re.S)


# ----------------------------------------------------------------- utilities

def slugify(name: str) -> str:
    """Filename-safe note name that still reads like a title in Obsidian."""
    return re.sub(r"[\\/:*?\"<>|]", "-", name).strip()


def fm_value(raw: str):
    """Parse one frontmatter scalar: inline list, bool, int, or string."""
    raw = raw.strip()
    listed = FM_LIST_RE.match(raw)
    if listed:
        inner = listed.group(1).strip()
        return [p.strip().strip("\"'") for p in inner.split(",") if p.strip()] if inner else []
    if raw.lower() in ("true", "false"):
        return raw.lower() == "true"
    if raw.isdigit():
        return int(raw)
    return raw.strip("\"'")


def parse_note(text: str) -> tuple[dict, str]:
    """Split a markdown file into (frontmatter dict, body)."""
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    head, body = text[3:end], text[end + 4:]
    meta, key = {}, None
    for line in head.splitlines():
        if not line.strip():
            continue
        if line.lstrip().startswith("- ") and key:
            meta.setdefault(key, [])
            if isinstance(meta[key], list):
                meta[key].append(line.lstrip()[2:].strip().strip("\"'"))
            continue
        if ":" not in line:
            continue
        key, _, raw = line.partition(":")
        key = key.strip()
        meta[key] = fm_value(raw) if raw.strip() else []
    return meta, body.lstrip("\n")


def write_note(path: Path, meta: dict, body: str) -> None:
    lines = ["---"]
    for key, value in meta.items():
        if isinstance(value, list):
            lines.append(f"{key}: [{', '.join(str(v) for v in value)}]")
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n\n" + body.strip() + "\n")


def link(name: str) -> str:
    return f"[[{name}]]"


def vocabulary() -> set[str]:
    """Every name a [[wikilink]] can currently resolve to, lowercased.

    Generated notes use it to link a technology only when a note for it exists,
    so generation can never manufacture a broken link.
    """
    names = set()
    for path in VAULT.rglob("*.md"):
        meta, _ = parse_note(path.read_text())
        names.add(path.stem.lower())
        if meta.get("title"):
            names.add(str(meta["title"]).lower())
        for alias in (meta.get("aliases") or []):
            names.add(str(alias).lower())
    return names


def maybe_link(name: str, vocab: set[str]) -> str:
    """[[Name]] when a note exists for it, plain text when it does not."""
    return link(name) if name.lower() in vocab else name


def day(iso: str) -> str:
    return (iso or "")[:10] or "—"


def human_size(kb) -> str:
    if not kb:
        return "—"
    return f"{kb / 1024:.1f} MB" if kb >= 1024 else f"{kb} KB"


# ---------------------------------------------------------------- generation

def project_note(p: dict, repos_by_name: dict, vocab: set[str]) -> tuple[Path, dict, str]:
    name = p["name"]
    repo_full = p.get("repo") or ""
    repo = repos_by_name.get(repo_full.split("/")[-1], {})

    tags = ["project", (p.get("category") or "").lower().replace(" & ", "-").replace(" ", "-")]
    meta = {
        "title": name,
        "type": "project",
        "tags": [t for t in tags if t],
        "status": p.get("status", ""),
        "year": p.get("year", ""),
        "category": p.get("category", ""),
        "repo": repo_full,
        "generated": "true",
    }

    out = [BANNER.format(src="projects.json"), f"# {name}", "", f"*{p.get('tagline','')}*", ""]
    out += [p.get("description", ""), ""]

    if p.get("architecture"):
        out += ["## How it is put together", "", p["architecture"], ""]

    if p.get("highlights"):
        out += ["## What is actually in it", ""]
        out += [f"- {h}" for h in p["highlights"]] + [""]

    if p.get("lessons"):
        out += ["## What it taught", "", f"> {p['lessons']}", ""]

    out += ["## Facts", "", "| | |", "| --- | --- |"]
    out += [
        f"| Status | {p.get('status','—')} |",
        f"| Year | {p.get('year','—')} |",
        f"| Dev time | {p.get('devTime','—')} |",
        f"| Category | {p.get('category','—')} |",
    ]
    if repo:
        out += [
            f"| Repository | [{repo_full}]({repo.get('html_url','')}) |",
            f"| Primary language | {repo.get('language') or '—'} |",
            f"| Size | {human_size(repo.get('size'))} |",
            f"| Licence | {repo.get('license') or 'none declared'} |",
            f"| Created | {day(repo.get('created_at'))} |",
            f"| Last push | {day(repo.get('pushed_at'))} |",
            f"| Visibility | {repo.get('visibility') or '—'} |",
        ]
        if repo.get("languages"):
            mix = ", ".join(f"{k} {v}%" for k, v in list(repo["languages"].items())[:5])
            out.append(f"| Language mix | {mix} |")
    elif repo_full:
        out.append(f"| Repository | `{repo_full}` |")
    out.append("")

    if p.get("tech"):
        out += ["## Stack", "", " · ".join(maybe_link(t, vocab) for t in p["tech"]), ""]

    if p.get("agents"):
        out += ["## Agents", "", " · ".join(maybe_link(a, vocab) for a in p["agents"]), ""]

    links = p.get("links") or {}
    labelled = [
        ("Live", links.get("live")),
        ("Source", links.get("repo")),
        ("Demo", links.get("demo")),
    ]
    shown = [f"[{lab}]({url})" for lab, url in labelled if url]
    if shown:
        out += ["## Links", "", " · ".join(shown), ""]

    if p.get("relatedRepos"):
        out += ["## Related repositories", ""]
        out += [f"- {maybe_link(r.split(chr(47))[-1], vocab)}" for r in p["relatedRepos"]] + [""]

    out += ["## Related", "", " · ".join([link("Projects Map"), link("Home")]) + "", ""]
    return VAULT / "projects" / f"{slugify(name)}.md", meta, "\n".join(out)


def repo_note(r: dict, project_by_repo: dict) -> tuple[Path, dict, str]:
    name = r["name"]
    project = project_by_repo.get(r.get("full_name", ""))

    state = "archived" if r.get("archived") else ("private" if r.get("private") else "public")
    meta = {
        "title": name,
        "type": "repo",
        "tags": ["repo", state] + [t for t in (r.get("topics") or [])][:6],
        "language": r.get("language") or "",
        "pushed": day(r.get("pushed_at")),
        "generated": "true",
    }

    out = [BANNER.format(src="repos.json"), f"# {name}", ""]
    if r.get("description"):
        out += [f"*{r['description']}*", ""]
    if project:
        out += [f"Project note: {link(project)}", ""]
    if r.get("readme"):
        out += ["> " + r["readme"].replace("\n", " "), ""]

    out += ["## Metadata", "", "| | |", "| --- | --- |"]
    out += [
        f"| Full name | [{r.get('full_name','')}]({r.get('html_url','')}) |",
        f"| Visibility | {r.get('visibility') or ('private' if r.get('private') else 'public')} |",
        f"| Primary language | {r.get('language') or '—'} |",
        f"| Size | {human_size(r.get('size'))} |",
        f"| Licence | {r.get('license') or 'none declared'} |",
        f"| Default branch | {r.get('default_branch') or '—'} |",
        f"| Created | {day(r.get('created_at'))} |",
        f"| Last push | {day(r.get('pushed_at'))} |",
        f"| Stars | {r.get('stargazers_count', 0)} |",
        f"| Open issues | {r.get('open_issues_count', 0)} |",
        f"| GitHub Pages | {'yes' if r.get('has_pages') else 'no'} |",
        f"| Archived | {'yes' if r.get('archived') else 'no'} |",
    ]
    if r.get("homepage"):
        out.append(f"| Homepage | {r['homepage']} |")
    out.append("")

    if r.get("languages"):
        out += ["## Language mix", "", "| Language | Share |", "| --- | --- |"]
        out += [f"| {k} | {v}% |" for k, v in r["languages"].items()]
        out.append("")

    if r.get("topics"):
        out += ["## Topics", "", " ".join(f"`{t}`" for t in r["topics"]), ""]

    out += ["## Related", "", " · ".join([link("Repos Map"), link("Home")]), ""]
    return VAULT / "repos" / f"{slugify(name)}.md", meta, "\n".join(out)


def projects_map(projects: list) -> tuple[Path, dict, str]:
    by_cat: dict[str, list] = {}
    for p in projects:
        by_cat.setdefault(p.get("category", "Other"), []).append(p)

    out = [BANNER.format(src="projects.json"), "# Projects Map", "",
           f"Every project in the index — {len(projects)} of them, grouped by what kind of "
           "thing it is. The full repository list, dead ends included, is in "
           f"{link('Repos Map')}.", ""]
    for cat in sorted(by_cat):
        out += [f"## {cat}", "", "| Project | What it is | Status | Year |", "| --- | --- | --- | --- |"]
        for p in by_cat[cat]:
            out.append(f"| {link(p['name'])} | {p.get('tagline','')} | {p.get('status','—')} | {p.get('year','—')} |")
        out.append("")
    out += ["## Related", "", " · ".join([link("Agent Structure"), link("Stack Map"),
                                          link("Timeline"), link("Home")]), ""]
    meta = {"title": "Projects Map", "type": "map", "tags": ["moc", "projects"], "generated": "true"}
    return VAULT / "maps" / "Projects Map.md", meta, "\n".join(out)


def repos_map(repos: list, project_by_repo: dict) -> tuple[Path, dict, str]:
    live = [r for r in repos if not r.get("archived") and not r.get("private")]
    private = [r for r in repos if r.get("private")]
    out = [BANNER.format(src="repos.json"), "# Repos Map", "",
           f"All {len(repos)} repositories on the account — including the ones that went "
           f"nowhere. {len(live)} public and active, {len(private)} private. "
           f"The curated subset is {link('Projects Map')}.", ""]

    def table(rows):
        lines = ["| Repo | Language | Last push | Size | Project |", "| --- | --- | --- | --- | --- |"]
        for r in rows:
            proj = link(project_by_repo[r["full_name"]]) if r["full_name"] in project_by_repo else "—"
            lines.append(f"| {link(r['name'])} | {r.get('language') or '—'} | "
                         f"{day(r.get('pushed_at'))} | {human_size(r.get('size'))} | {proj} |")
        return lines

    out += ["## Public", ""] + table(live) + [""]
    if private:
        out += ["## Private", "",
                "Visible here because the sweep runs authenticated. Mostly superseded "
                "attempts — see the note on them in " + link("Open Questions") + ".", ""]
        out += table(private) + [""]
    archived = [r for r in repos if r.get("archived")]
    if archived:
        out += ["## Archived", ""] + table(archived) + [""]

    out += ["## Related", "", " · ".join([link("Projects Map"), link("Timeline"), link("Home")]), ""]
    meta = {"title": "Repos Map", "type": "map", "tags": ["moc", "repos"], "generated": "true"}
    return VAULT / "maps" / "Repos Map.md", meta, "\n".join(out)


def timeline(repos: list, project_by_repo: dict) -> tuple[Path, dict, str]:
    by_year: dict[str, list] = {}
    for r in sorted(repos, key=lambda r: r.get("created_at") or ""):
        by_year.setdefault(day(r.get("created_at"))[:4], []).append(r)

    out = [BANNER.format(src="repos.json"), "# Timeline", "",
           "What got built when, by repository creation date. The narrative version — "
           f"why any of it happened — is {link('Build Log')}.", ""]
    for year in sorted(by_year, reverse=True):
        rows = by_year[year]
        out += [f"## {year}", "", f"{len(rows)} repositories created.", "",
                "| Created | Repo | Language | Project |", "| --- | --- | --- | --- |"]
        for r in rows:
            proj = link(project_by_repo[r["full_name"]]) if r["full_name"] in project_by_repo else "—"
            out.append(f"| {day(r.get('created_at'))} | {link(r['name'])} | "
                       f"{r.get('language') or '—'} | {proj} |")
        out.append("")
    out += ["## Related", "", " · ".join([link("Build Log"), link("Repos Map"), link("Home")]), ""]
    meta = {"title": "Timeline", "type": "map", "tags": ["moc", "history"], "generated": "true"}
    return VAULT / "maps" / "Timeline.md", meta, "\n".join(out)


def guides_map() -> tuple[Path, dict, str]:
    """Index of every guide, read back out of the hand-written guide files."""
    rows = []
    for path in sorted((VAULT / "guides").glob("*.md")):
        meta, _ = parse_note(path.read_text())
        if meta.get("type") != "guide":
            continue
        rows.append((int(meta.get("order", 99)), meta.get("title", path.stem), meta))
    rows.sort()

    by_level: dict[str, list] = {}
    for _, title, meta in rows:
        by_level.setdefault(str(meta.get("level", "unsorted")), []).append((title, meta))

    out = [BANNER.format(src="../brain/guides/*.md"), "# Guides Map", "",
           f"{len(rows)} guides to building the things in {link('Projects Map')} — "
           "written from the projects rather than about them, so every one of them "
           "has shipping code behind it.", ""]
    for level in ("beginner", "intermediate", "advanced"):
        items = by_level.get(level, [])
        if not items:
            continue
        out += [f"## {level.title()}", "",
                "| Guide | What it covers | Built from | Time |",
                "| --- | --- | --- | --- |"]
        for title, meta in items:
            built = meta.get("built", "")
            out.append(f"| {link(title)} | {meta.get('summary','')} | "
                       f"{link(built) if built else '—'} | {meta.get('time','—')} |")
        out.append("")
    out += ["## Related", "", " · ".join([link("Projects Map"), link("Stack Map"),
                                          link("Home")]), ""]
    meta = {"title": "Guides Map", "type": "map", "tags": ["moc", "guides"], "generated": "true"}
    return VAULT / "maps" / "Guides Map.md", meta, "\n".join(out)


def agent_ledger(projects: list) -> tuple[Path, dict, str]:
    """Table of every agent note, read back out of the hand-written agent files."""
    rows = []
    for path in sorted((VAULT / "agents").glob("*.md")):
        meta, _ = parse_note(path.read_text())
        if meta.get("type") != "agent":
            continue
        rows.append((int(meta.get("tier", 0)), meta.get("title", path.stem),
                     meta.get("project", "—"), meta.get("repo", "—")))
    rows.sort()

    tier_note = {
        1: "Scheduled. No reasoning — a cron fires and a script runs.",
        2: "Model-in-the-loop. A human sees the output before it counts.",
        3: "Autonomous inside a safety envelope. Plans and acts across time.",
    }
    out = [BANNER.format(src="../brain/agents/*.md"), "# Agent Ledger", "",
           f"Every autonomous or semi-autonomous system built here — {len(rows)} of them. "
           f"The architecture behind the tiers is in {link('Agent Structure')}.", ""]
    for tier in (1, 2, 3):
        tier_rows = [r for r in rows if r[0] == tier]
        if not tier_rows:
            continue
        out += [f"## Tier {tier}", "", tier_note[tier], "",
                "| Agent | Project | Repository |", "| --- | --- | --- |"]
        for _, title, project, repo in tier_rows:
            proj = link(project) if project != "—" else "—"
            out.append(f"| {link(title)} | {proj} | `{repo}` |")
        out.append("")
    out += ["## Related", "", " · ".join([link("Agent Structure"), link("Agent Patterns"),
                                          link("Tool Safety"), link("Home")]), ""]
    meta = {"title": "Agent Ledger", "type": "map", "tags": ["moc", "agents"], "generated": "true"}
    return VAULT / "agents" / "Agent Ledger.md", meta, "\n".join(out)


def generate() -> int:
    projects = json.loads((DATA / "projects.json").read_text())
    repos_doc = json.loads((DATA / "repos.json").read_text())
    repos = repos_doc["repos"]

    repos_by_name = {r["name"]: r for r in repos}
    project_by_repo = {}
    for p in projects:
        for full in [p.get("repo")] + list(p.get("relatedRepos") or []):
            if full:
                project_by_repo[full] = p["name"]

    vocab = vocabulary() | {p["name"].lower() for p in projects} | {r["name"].lower() for r in repos}

    written = 0
    for p in projects:
        write_note(*project_note(p, repos_by_name, vocab))
        written += 1
    for r in repos:
        write_note(*repo_note(r, project_by_repo))
        written += 1
    for maker in (
        lambda: projects_map(projects),
        lambda: repos_map(repos, project_by_repo),
        lambda: timeline(repos, project_by_repo),
        lambda: agent_ledger(projects),
        guides_map,
    ):
        write_note(*maker())
        written += 1

    # Drop generated notes whose source row has disappeared.
    keep = {slugify(p["name"]) for p in projects} | {slugify(r["name"]) for r in repos}
    for folder in ("projects", "repos"):
        for path in (VAULT / folder).glob("*.md"):
            if path.stem not in keep:
                path.unlink()
                print(f"  - removed stale {folder}/{path.name}")
    return written


# ------------------------------------------------------------------ bundling

def bundle() -> dict:
    notes = []
    for path in sorted(VAULT.rglob("*.md")):
        meta, body = parse_note(path.read_text())
        rel = path.relative_to(VAULT)
        notes.append({
            "id": rel.with_suffix("").as_posix(),
            "title": str(meta.get("title") or path.stem),
            "path": f"brain/{rel.as_posix()}",
            "folder": rel.parent.as_posix() if rel.parent.as_posix() != "." else "",
            "type": str(meta.get("type") or "note"),
            "tags": meta.get("tags") if isinstance(meta.get("tags"), list) else [],
            "aliases": meta.get("aliases") if isinstance(meta.get("aliases"), list) else [],
            "meta": {k: v for k, v in meta.items() if k not in ("title", "type", "tags")},
            "generated": str(meta.get("generated", "")).lower() == "true",
            "body": body,
            "words": len(body.split()),
        })

    # Resolve [[wikilinks]] by title first, then by filename — Obsidian's rule.
    index = {}
    for n in notes:
        index.setdefault(n["title"].lower(), n["id"])
        index.setdefault(Path(n["id"]).name.lower(), n["id"])
        index.setdefault(n["id"].lower(), n["id"])
        for alias in n["aliases"]:
            index.setdefault(str(alias).lower(), n["id"])

    backlinks: dict[str, list] = {n["id"]: [] for n in notes}
    unresolved: dict[str, int] = {}
    for n in notes:
        seen, missing = [], []
        prose = CODE_RE.sub("", n["body"])  # `[[like this]]` is an example, not a link
        for match in WIKILINK_RE.finditer(prose):
            target = match.group(1).strip()
            hit = index.get(target.lower())
            if not hit:
                missing.append(target)
                unresolved[target] = unresolved.get(target, 0) + 1
            elif hit != n["id"] and hit not in seen:
                seen.append(hit)
        n["links"] = seen
        n["unresolved"] = sorted(set(missing))
        for target in seen:
            if n["id"] not in backlinks[target]:
                backlinks[target].append(n["id"])
    for n in notes:
        n["backlinks"] = backlinks[n["id"]]

    tags: dict[str, int] = {}
    for n in notes:
        for tag in n["tags"]:
            tags[tag] = tags.get(tag, 0) + 1

    folders: dict[str, int] = {}
    for n in notes:
        folders[n["folder"]] = folders.get(n["folder"], 0) + 1

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "vault": "brain",
        "home": "Home",
        "count": len(notes),
        "words": sum(n["words"] for n in notes),
        "edges": sum(len(n["links"]) for n in notes),
        "folders": dict(sorted(folders.items())),
        "tags": dict(sorted(tags.items(), key=lambda kv: (-kv[1], kv[0]))),
        "unresolved": dict(sorted(unresolved.items(), key=lambda kv: -kv[1])),
        "notes": notes,
    }


def main() -> None:
    if "--bundle-only" not in sys.argv:
        print("generating notes…")
        print(f"  {generate()} notes written")

    print("bundling vault…")
    doc = bundle()
    BUNDLE.write_text(json.dumps(doc, indent=1) + "\n")
    print(f"wrote data/brain.json — {doc['count']} notes, {doc['edges']} links, "
          f"{doc['words']:,} words")
    if doc["unresolved"]:
        print("  broken wikilinks:", ", ".join(f"{k} ({v})" for k, v in
                                               list(doc["unresolved"].items())[:10]))


if __name__ == "__main__":
    main()
