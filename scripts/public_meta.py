#!/usr/bin/env python3
"""Public-only publication helpers for the GitHub metadata sweep.

The studio site is a public GitHub Pages tree. Repository metadata, generated
vault notes and the browser bundle must never include private repositories or
retain them from an earlier authenticated sweep.

Stdlib only. Safe to import from tests without touching the network.
"""

from __future__ import annotations


def is_public_repo(repo: dict) -> bool:
    """True when a GitHub repo payload is safe to publish."""
    if not isinstance(repo, dict):
        return False
    if repo.get("private") is True:
        return False
    visibility = str(repo.get("visibility") or "").strip().lower()
    if visibility == "private":
        return False
    return True


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
