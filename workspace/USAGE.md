# Marketing desk (draft, local only)

This folder is a **manual agency notebook** for EXA-42: brief → traffic → draft → QC → approval → publication → observation → learning. It is not part of the public site navigation, not authenticated hosting, and not ExarynEngine.

Open `workspace/marketing.html` from a local static server. Do not treat a file:// open as the supported path if your browser blocks `localStorage` or downloads.

## Classic stages → UI

| Classic stage | Desk surface |
| --- | --- |
| Intake / account | Product + project, then a **Brief** |
| Creative brief | **Records → Briefs** |
| Traffic | **Pipeline** (job stages) and **Home** (jobs needing attention) |
| Creative / production | **Records → Assets** (`versionLabel`, `copyBody`, `creativeStatus`) |
| Internal QC | **Records → Reviews** (checklist + evidence status) |
| Approval (Go / edit / kill) | Review `recommendDecision`. Asset `creativeStatus: approved` only via an explicit asset save — never auto-publish |
| Publication | **Records → Publications** (separate from the asset) |
| Observation | **Records → Observations** (`metricValue` blank = unknown) |
| Learning / debrief | **Records → Learnings** |

Home shows job-stage counts, attention (due soon, blocked, in QC, approved-unpublished), review evidence chips, and review next-actions. Missing metrics stay **unknown**. There are no campaign charts and no invented KPIs.

## First journey

1. From the repository root: `npm run dev` or `python3 -m http.server 8080`.
2. Open `/workspace/marketing.html`.
3. Load the labelled fictional example, or create a **brief**, then a **job** on the pipeline.
4. Draft an **asset** (version + copy body). Set creative status to `ready_for_qc` when you mean it.
5. Record a **review**: QC checklist (unknown / yes / no — never invent yes), recommend Go / edit / kill. Saving Go does **not** approve or publish the asset.
6. If you approve, edit the asset and set `creativeStatus` to `approved` in that save.
7. Record a **publication** only after an actual placement exists. Then an **observation** (blank metric stays unknown) and a **learning**.
8. Reload. Records stay in this browser. Export JSON. Keep private studio data off the public repository.

## Privacy boundary

- Storage key: `exaryn.studio.marketing.workspace.v1` in this browser only.
- Schema version: `2`. Version `1` payloads migrate in place (existing products, projects, assets, and reviews are kept; new collections start empty; asset creative status defaults to `draft`; review decision/checklist default to `unset` / `unknown`).
- Import is validated before any existing records change. Invalid JSON, unknown relations, unsafe URLs, and failed writes leave the current workspace in place and explain the failure.
- Only `http:` and `https:` URLs are accepted. Untrusted text is escaped before it is rendered.
- **Load fictional example** is opt-in and labelled fictional. It is not QuantFlex, Looking Up, or any studio account.
- No analytics, remote upload, credentials, live social APIs, or cloud sync.

## Checks

```sh
node --test workspace/marketing.test.js
```

Do not run `npm run digest`, `npm run repos`, `npm run brain`, or `npm run build` merely to try this page.

## Limits

This slice does not publish a public nav link, deploy a production marketing host, claim automated SEO/AEO/GEO scores, connect Engine/Dispatcher, or sync to Linear/Notion/Buffer. Independent review and owner acceptance are still required.
