"""Regression: published GitHub metadata must stay public-only."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import public_meta  # noqa: E402
import repos as repos_mod  # noqa: E402
import brain as brain_mod  # noqa: E402


FIXTURE_PRIVATE = {
    "name": "fixture-private-example",
    "full_name": "example/fixture-private-example",
    "html_url": "https://github.com/example/fixture-private-example",
    "description": "must not be published",
    "language": "Python",
    "topics": ["secret"],
    "homepage": "",
    "size": 12,
    "stargazers_count": 0,
    "forks_count": 0,
    "open_issues_count": 0,
    "watchers_count": 0,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-02T00:00:00Z",
    "pushed_at": "2026-01-02T00:00:00Z",
    "default_branch": "main",
    "visibility": "private",
    "private": True,
    "fork": False,
    "archived": False,
    "has_pages": False,
    "has_issues": True,
    "has_wiki": False,
    "has_discussions": False,
    "license": None,
    "languages": {"Python": 100.0},
    "readme": "internal only",
}

FIXTURE_PUBLIC = {
    "name": "fixture-public-example",
    "full_name": "example/fixture-public-example",
    "html_url": "https://github.com/example/fixture-public-example",
    "description": "ok to publish",
    "language": "HTML",
    "topics": ["portfolio"],
    "homepage": "https://example.com",
    "size": 40,
    "stargazers_count": 0,
    "forks_count": 0,
    "open_issues_count": 0,
    "watchers_count": 0,
    "created_at": "2026-02-01T00:00:00Z",
    "updated_at": "2026-02-02T00:00:00Z",
    "pushed_at": "2026-02-02T00:00:00Z",
    "default_branch": "main",
    "visibility": "public",
    "private": False,
    "fork": False,
    "archived": False,
    "has_pages": True,
    "has_issues": True,
    "has_wiki": False,
    "has_discussions": False,
    "license": None,
    "languages": {"HTML": 100.0},
    "readme": "a public readme paragraph that is long enough to keep",
}


class PublicFilterTests(unittest.TestCase):
    def test_private_flag_is_not_public(self):
        self.assertFalse(public_meta.is_public_repo(FIXTURE_PRIVATE))
        self.assertTrue(public_meta.is_public_repo(FIXTURE_PUBLIC))

    def test_visibility_private_without_flag_is_dropped(self):
        row = dict(FIXTURE_PUBLIC)
        row["private"] = False
        row["visibility"] = "private"
        self.assertFalse(public_meta.is_public_repo(row))

    def test_select_public_drops_private_rows(self):
        kept = public_meta.select_public_repos([FIXTURE_PRIVATE, FIXTURE_PUBLIC])
        self.assertEqual([r["name"] for r in kept], ["fixture-public-example"])

    def test_previous_private_metadata_is_not_retained(self):
        doc = public_meta.public_document(
            {"repos": [FIXTURE_PRIVATE, FIXTURE_PUBLIC]},
            "2026-09-20T00:00:00+00:00",
            "example",
        )
        self.assertEqual(doc["count"], 1)
        self.assertEqual(doc["repos"][0]["name"], "fixture-public-example")
        blob = json.dumps(doc)
        self.assertNotIn("fixture-private-example", blob)
        self.assertIn("public repositories only", doc["source"])

    def test_list_repos_never_uses_user_repos_even_with_pat(self):
        captured = []

        def fake_api(path, raw=False):
            captured.append(path)
            return {"items": []}

        with mock.patch.dict("os.environ", {"GH_PAT": "fake-token"}, clear=False):
            with mock.patch.object(repos_mod, "api", fake_api):
                repos_mod.list_repos()
        self.assertTrue(captured)
        self.assertTrue(all("/users/" in path and "type=public" in path for path in captured))
        self.assertFalse(any(path.startswith("/user/repos") or "/user/repos?" in path for path in captured))

    def test_brain_repos_map_has_no_private_section(self):
        path, meta, body = brain_mod.repos_map([FIXTURE_PUBLIC], {})
        self.assertIn("Repos Map", meta["title"])
        self.assertNotIn("## Private", body)
        self.assertNotIn("fixture-private-example", body)
        self.assertIn("Public repositories", body)

    def test_committed_publication_files_are_public_only(self):
        repos_doc = json.loads((ROOT / "data" / "repos.json").read_text(encoding="utf-8"))
        private = [r for r in repos_doc.get("repos", []) if not public_meta.is_public_repo(r)]
        self.assertEqual(private, [], "data/repos.json must not retain private rows")
        self.assertNotIn("## Private", (ROOT / "brain" / "maps" / "Repos Map.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
