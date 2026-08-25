---
title: Build a Daily Anything Game
type: guide
level: beginner
time: 15 min
order: 1
stack: [Python, GitHub Actions, Vanilla JS]
built: One Piece Guess
summary: Wordle-style daily puzzles need no server, no database and no auth — just a cron job and a committed JSON file.
tags: [guide, games, cron, static]
---

# Build a Daily Anything Game

Wordle spawned a genre, and the genre has one mechanical requirement: **everyone
must see the same answer on the same day, and nobody may see tomorrow's.**

That is it. Every daily game is that sentence plus decoration. And you can
satisfy it with a cron job and a file in git — no server, no database, no auth,
no bill. [[One Piece Guess]] and [[Side by Side]] both run this way.

## The shape

```
GitHub Actions cron ──► picker script ──► today.json ──► git commit ──► Pages
                                                                          │
                                                     browser fetches ─────┘
```

The site is static. The "backend" is a scheduled workflow that writes a file.

## 1. Model the answer as data

Start with the answer set, not the UI. For a character-guessing game each entry
needs the attributes you will compare against:

```json
{
  "name": "Nico Robin",
  "crew": "Straw Hat Pirates",
  "bounty": 930000000,
  "haki": ["Armament"],
  "fruit": "Hana Hana no Mi",
  "debut": "Arabasta"
}
```

Every clue in the game is a comparison between two of these objects. Get the
schema right and the game logic is twenty lines.

## 2. Pick deterministically, not randomly

The picker runs once a day and commits its choice. Seed it on the date so a
re-run of the same day produces the same answer:

```python
import hashlib, json, datetime
from pathlib import Path

DATA = Path("data/characters.json")
OUT = Path("data/today.json")

def pick(day: str, pool: list) -> dict:
    # Deterministic: the same date always yields the same character, so a
    # re-run or a retried workflow can never change today's answer.
    seed = int(hashlib.sha256(day.encode()).hexdigest()[:8], 16)
    return pool[seed % len(pool)]

day = datetime.date.today().isoformat()
pool = json.loads(DATA.read_text())
OUT.write_text(json.dumps({"date": day, **pick(day, pool)}, indent=2))
```

> [!warning] Don't use `random` without a seed
> A workflow that retries — and they do retry — would silently change the
> answer halfway through the day, invalidating everyone's in-progress board.

Keep a `recent.json` of the last N picks and exclude them from the pool if you
want to avoid repeats.

## 3. Commit it from CI

```yaml
name: daily pick
on:
  schedule:
    - cron: "0 21 * * *"   # 21:00 UTC ≈ 7am Melbourne
  workflow_dispatch:
permissions:
  contents: write
jobs:
  pick:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python3 scripts/pick.py
      - run: |
          git config user.name "pick-bot"
          git config user.email "actions@users.noreply.github.com"
          git add data/
          git diff --cached --quiet || git commit -m "pick: $(date -u +%F) [skip ci]"
          git push
```

`[skip ci]` matters — without it the commit triggers your deploy workflow,
which commits again, forever.

## 4. Client side: compare and colour

The browser fetches `today.json` once and every guess is a local comparison.
No round trip, so it feels instant:

```js
const clue = (guess, answer, key) => {
  if (guess[key] === answer[key]) return "exact";
  if (typeof guess[key] === "number")
    return guess[key] < answer[key] ? "higher" : "lower";
  if (Array.isArray(guess[key]) && guess[key].some(v => answer[key].includes(v)))
    return "partial";
  return "miss";
};
```

Store progress in `localStorage`, keyed by the date. Returning mid-game
restores the board; a new day starts clean because the key changed.

## 5. The share grid

The single feature that makes these games spread. Turn the board into emoji and
copy it to the clipboard — no link, no image, nothing that needs hosting:

```js
const GRID = { exact: "🟩", partial: "🟨", higher: "⬆️", lower: "⬇️", miss: "⬛" };
const share = rows.map(r => r.map(c => GRID[c]).join("")).join("\n");
navigator.clipboard.writeText(`Guess #${dayNumber}\n${share}`);
```

## The traps

- **Timezones.** Pick one and put it in the UI. "New pirate every morning" is
  fine; silently rolling over at UTC midnight while your players are at dinner
  is not.
- **Spoilers in the payload.** If you ship the whole answer set to the client,
  someone will read `today.json`. Ship only today's answer, or hash it.
- **A pool that is too small.** Repeats within a fortnight feel broken. Aim for
  at least 150 entries before launch.

## Where to look

The [[One Piece Guess]] repo is deliberately written as a template for this —
its README is a how-to, not just docs. [[Pirate Picker]] is the note on the
cron side, and [[Agent Patterns]] covers why this shape keeps reappearing.

## Related

[[A Website That Updates Itself]] · [[One Piece Guess]] · [[Side by Side]] · [[GitHub Actions]]
