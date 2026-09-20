# Marketing workspace (draft, local only)

This folder is a **manual evidence notebook** for EXA-42. It is not part of the public site navigation, not authenticated hosting, and not ExarynEngine.

Open `workspace/marketing.html` from a local static server. Do not treat a file:// open as the supported path if your browser blocks `localStorage` or downloads.

## First journey

1. From the repository root: `npm run dev` or `python3 -m http.server 8080`.
2. Open `/workspace/marketing.html`.
3. Create a **product** (ongoing offering).
4. Create a **project** and optionally link it to that product.
5. Create an **asset** (content or product surface) linked to the product or project, and choose a channel: website/search, answer engines, TikTok, Instagram Reels, YouTube Shorts, or other.
6. Record a **review**: audience, desired outcome, source URL or note, observation date, evidence status (`observed` / `reported` / `unknown`), finding, next action.
7. Reload the page. Records stay in this browser.
8. Export JSON. Keep private studio data off the public repository.

## Privacy boundary

- Storage key: `exaryn.studio.marketing.workspace.v1` in this browser only.
- Schema version: `1`.
- Import is validated before any existing records change. Invalid JSON, unknown relations, unsafe URLs, and failed writes leave the current workspace in place and explain the failure.
- Only `http:` and `https:` URLs are accepted. Untrusted text is escaped before it is rendered.
- **Load fictional example** is opt-in and labelled fictional. It is not QuantFlex, Looking Up, or any studio account.
- No analytics, remote upload, credentials, or live social APIs.

## Checks

```sh
node --test workspace/marketing.test.js
```

Do not run `npm run digest`, `npm run repos`, `npm run brain`, or `npm run build` merely to try this page.

## Limits

This slice does not publish a public nav link, deploy a production marketing host, claim automated SEO/AEO/GEO scores, or connect Engine/Dispatcher. Independent review and owner acceptance are still required.
