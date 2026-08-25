#!/usr/bin/env python3
"""Build data/repos.json — metadata for every repo the studio owns.

Sweeps the GitHub REST API for all repos under OWNER, keeps the fields the
brain actually uses, and (unless --fast) enriches each one with its language
byte-breakdown and the first useful paragraph of its README.

Stdlib only, so CI needs no pip install.

Auth:
  GITHUB_TOKEN  — raises the rate limit from 60 to 5000 req/h. GitHub Actions
                  injects one for free, but it is scoped to a single repo, so
                  listing still goes through the public search API.
  GH_PAT        — a personal access token with `repo` scope. Only this can
                  enumerate private repositories. Optional.

Private repos already recorded in data/repos.json are kept across a run that
cannot see them, so a sweep without a PAT never silently deletes them.

Run:  python scripts/repos.py            # full sweep, needs network
      python scripts/repos.py --fast     # skip languages + READMEs
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "repos.json"

OWNER = "ChinmayGit8765"
API = "https://api.github.com"
TIMEOUT = 20
PER_PAGE = 100

# Fields worth keeping. Everything else in the API payload is URL noise.
KEEP = [
    "name", "full_name", "html_url", "description", "language", "topics",
    "homepage", "size", "stargazers_count", "forks_count",
    "open_issues_count", "watchers_count", "created_at", "updated_at",
    "pushed_at", "default_branch", "visibility", "private", "fork",
    "archived", "has_pages", "has_issues", "has_wiki", "has_discussions",
]

BADGE_RE = re.compile(r"^\s*[\[!]*\[!\[.*$")      # badge-only lines
HEADING_RE = re.compile(r"^\s*#")
HTML_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def auth_token() -> str:
    """Any usable token, PAT first. 'proxy-injected' is a sandbox placeholder."""
    for name in ("GH_PAT", "GITHUB_TOKEN", "GH_TOKEN"):
        value = os.environ.get(name, "")
        if value and value != "proxy-injected":
            return value
    return ""


def api(path: str, raw: bool = False):
    """GET an API path. Returns parsed JSON, or bytes when raw. None on 404."""
    url = path if path.startswith("http") else f"{API}{path}"
    headers = {
        "User-Agent": "exaryn-brain",
        "Accept": "application/vnd.github.raw+json" if raw else "application/vnd.github+json",
    }
    token = auth_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            body = res.read()
            return body if raw else json.loads(body)
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        raise


def list_repos() -> list[dict]:
    """Every repo we can see.

    A personal access token enumerates the account directly, private repos
    included. Anything else — including the single-repo token GitHub Actions
    injects — falls back to the public search API.
    """
    pat = os.environ.get("GH_PAT", "")
    path = (f"/user/repos?per_page={PER_PAGE}&affiliation=owner&page=" if pat
            else f"/search/repositories?q=user:{OWNER}&per_page={PER_PAGE}&page=")
    repos, page = [], 1
    while True:
        got = api(f"{path}{page}")
        batch = got if isinstance(got, list) else (got or {}).get("items", [])
        if not batch:
            break
        repos.extend(r for r in batch if (r.get("owner") or {}).get("login") == OWNER)
        if len(batch) < PER_PAGE:
            break
        page += 1
    return repos


def readme_blurb(repo: str, chars: int = 400) -> str:
    """First real prose paragraph of the README — no badges, no headings."""
    try:
        body = api(f"/repos/{OWNER}/{repo}/readme", raw=True)
    except Exception:
        return ""
    if not body:
        return ""
    text = body.decode("utf-8", "replace")
    for para in text.split("\n\n"):
        lines = [
            ln for ln in para.strip().splitlines()
            if ln.strip() and not BADGE_RE.match(ln) and not HEADING_RE.match(ln)
        ]
        if not lines:
            continue
        blurb = WS_RE.sub(" ", HTML_RE.sub("", " ".join(lines))).strip()
        if len(blurb) > 60:
            return blurb[:chars].rstrip() + ("…" if len(blurb) > chars else "")
    return ""


def enrich(repo: dict) -> dict:
    """Attach the language breakdown and README blurb for one repo."""
    name = repo["name"]
    try:
        langs = api(f"/repos/{OWNER}/{name}/languages") or {}
    except Exception as err:
        print(f"  ! languages {name}: {err}", file=sys.stderr)
        langs = {}
    total = sum(langs.values()) or 1
    repo["languages"] = {k: round(100 * v / total, 1) for k, v in
                         sorted(langs.items(), key=lambda kv: -kv[1])}
    repo["readme"] = readme_blurb(name)
    return repo


def shrink(repo: dict) -> dict:
    out = {k: repo.get(k) for k in KEEP}
    out["license"] = (repo.get("license") or {}).get("spdx_id")
    out["topics"] = repo.get("topics") or []
    out["description"] = repo.get("description") or ""
    out["homepage"] = repo.get("homepage") or ""
    out["languages"] = repo.get("languages") or {}
    out["readme"] = repo.get("readme") or ""
    return out


def main() -> None:
    fast = "--fast" in sys.argv
    print(f"sweeping repos for {OWNER}…")
    repos = list_repos()
    if not repos:
        print("no repos returned — check network/token; leaving data/repos.json alone",
              file=sys.stderr)
        sys.exit(1)
    print(f"  {len(repos)} repos")

    if not fast:
        with ThreadPoolExecutor(max_workers=6) as pool:
            repos = list(pool.map(enrich, repos))

    # Keep whatever the previous run learned about repos this run couldn't reach.
    previous = {}
    if OUT.exists():
        try:
            previous = {r["name"]: r for r in json.loads(OUT.read_text())["repos"]}
        except Exception:
            pass

    rows = []
    for repo in repos:
        row = shrink(repo)
        old = previous.get(row["name"], {})
        row["languages"] = row["languages"] or old.get("languages") or {}
        row["readme"] = row["readme"] or old.get("readme") or ""
        rows.append(row)

    # A sweep without a PAT cannot see private repos — keep the ones we already
    # know about rather than deleting them from the record.
    seen = {r["name"] for r in rows}
    kept = [r for name, r in previous.items()
            if name not in seen and r.get("private")]
    if kept:
        print(f"  keeping {len(kept)} private repos this run could not see")
    rows.extend(kept)
    rows.sort(key=lambda r: r["pushed_at"] or "", reverse=True)

    OUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "owner": OWNER,
        "count": len(rows),
        "source": "GitHub REST API",
        "repos": rows,
    }, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(OUT.parent.parent)} — {len(rows)} repos")


if __name__ == "__main__":
    main()
