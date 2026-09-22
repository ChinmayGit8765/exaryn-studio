#!/usr/bin/env python3
"""Build data/repos.json — public repository metadata only.

Sweeps the GitHub REST API for public repos under OWNER, keeps the fields the
brain actually uses, and (unless --fast) enriches each one with its language
byte-breakdown and the first useful paragraph of its README.

Stdlib only, so CI needs no pip install.

Auth:
  GITHUB_TOKEN / GH_TOKEN / GH_PAT  — optional. Any of these only raise the
                  rate limit. Listing always uses the public search API with
                  `is:public`. Private repositories are never written, and a
                  previous private row is never retained.

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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from public_meta import is_public_repo, public_document, select_public_repos

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
    """Public repositories owned by OWNER.

    Always uses the public user-repos listing with `type=public`. A token, if
    present, only raises the rate limit — it never switches listing to the
    authenticated /user/repos endpoint (which can include private rows).
    """
    path = f"/users/{OWNER}/repos?type=public&per_page={PER_PAGE}&page="
    repos, page = [], 1
    while True:
        got = api(f"{path}{page}")
        batch = got if isinstance(got, list) else []
        if not batch:
            break
        repos.extend(
            r for r in batch
            if (r.get("owner") or {}).get("login") == OWNER and is_public_repo(r)
        )
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
    repos = select_public_repos(repos)
    print(f"  {len(repos)} public repos")

    if not fast:
        with ThreadPoolExecutor(max_workers=6) as pool:
            repos = list(pool.map(enrich, repos))

    # Keep language/README enrichment for public repos this run still sees.
    # Never retain a row that is private or that this public sweep omitted.
    previous = {}
    if OUT.exists():
        try:
            previous = {
                r["name"]: r
                for r in select_public_repos(json.loads(OUT.read_text())["repos"])
            }
        except Exception:
            pass

    rows = []
    for repo in repos:
        row = shrink(repo)
        if not is_public_repo(row):
            continue
        old = previous.get(row["name"], {})
        row["languages"] = row["languages"] or old.get("languages") or {}
        row["readme"] = row["readme"] or old.get("readme") or ""
        rows.append(row)

    rows.sort(key=lambda r: r["pushed_at"] or "", reverse=True)
    doc = public_document(
        {"repos": rows},
        datetime.now(timezone.utc).isoformat(timespec="seconds"),
        OWNER,
    )
    OUT.write_text(json.dumps(doc, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(OUT.parent.parent)} — {doc['count']} public repos")


if __name__ == "__main__":
    main()
