#!/usr/bin/env python3
"""Public-only publication helpers for the GitHub metadata sweep.

The studio site is a public GitHub Pages tree. Repository metadata, generated
vault notes and the browser bundle must never include private repositories or
retain them from an earlier authenticated sweep.

A row is publishable only with affirmative public evidence:
  * visibility is exactly "public", or
  * private is exactly False and visibility is absent/blank (not a conflicting
    value such as internal, private, or unknown junk).

Internal, unknown, malformed, and private rows are rejected.

Stdlib only. Safe to import from tests without touching the network.
"""

from __future__ import annotations

PUBLIC = "public"
BLOCKED_VISIBILITY = {"private", "internal"}


def is_public_repo(repo: dict) -> bool:
    """True when a GitHub repo payload is safe to publish."""
    if not isinstance(repo, dict):
        return False

    private = repo.get("private")
    if private is True:
        return False

    raw_vis = repo.get("visibility", None)
    if raw_vis is None:
        visibility = ""
    elif isinstance(raw_vis, str):
        visibility = raw_vis.strip().lower()
    else:
        return False

    if visibility in BLOCKED_VISIBILITY:
        return False
    if visibility == PUBLIC:
        return True
    if private is False and visibility == "":
        return True
    return False


def select_public_repos(repos) -> list[dict]:
    """Keep public rows only, preserving input order."""
    if not isinstance(repos, list):
        return []
    return [repo for repo in repos if is_public_repo(repo)]


def public_document(doc: dict, generated_at: str, owner: str) -> dict:
    """Return a publishable repos.json document with private rows removed."""
    repos = select_public_repos((doc or {}).get("repos") or [])
    return {
        "generated_at": generated_at,
        "owner": owner,
        "count": len(repos),
        "source": "GitHub REST API (public repositories only)",
        "repos": repos,
    }
