# Marketing desk (draft, local only)

This folder is a **manual agency notebook** for EXA-42. It is a gated **campaign jacket**, not a file bin and not an analytics home: lockable brief → traffic → draft → internal QC → studio Go → publication → calendar slot → empty observation → learning. It is not part of the public site navigation, not authenticated hosting, and not ExarynEngine.

Open `workspace/marketing.html` from a local static server. Do not treat a file:// open as the supported path if your browser blocks `localStorage` or downloads.

## Classic stages → UI

| Classic stage | Desk surface |
| --- | --- |
| Intake / account | **Records → Clients** (minimal name + notes). Products may belong to a client. Hobby example uses **Exaryn Studio**. |
| Creative brief | **Records → Briefs** (IPA headings, claim→evidence, `locked`) |
| Traffic | **Home** four exclusive jacket buckets + **Pipeline** (campaign stages) |
| Creative / production | **Records → Assets** (`versionLabel`, `copyBody`, `creativeStatus`) |
| Internal QC | **Records → Reviews** with `gate: internal_qc`, `round`, `recommendDecision` |
| Approval (Go / edit / kill) | Review `gate: approval`. Asset `creativeStatus: approved` only via an explicit asset save — never auto-publish |
| Publication | **Records → Publications** (separate record + launch checklist of unknown/yes/no) |
| Calendar / flighting | **Records → Calendar** (title, date, optional campaign + channel). Not a media buyer. |
| Observation | **Records → Observations** (`metricValue` blank = unknown) |
| Learning / debrief | **Records → Learnings** |

Home answers four questions: jackets that need traffic, jackets in QC, jackets approved but unpublished, jackets published awaiting observation. Missing metrics stay **unknown**. There are no campaign charts and no invented KPIs.

## First journey

1. From the repository root: `npm run dev` or `python3 -m http.server 8080`.
2. Open `/workspace/marketing.html`.
3. Load the labelled fictional example, or create a **brief**, lock it when ready, then a **campaign jacket** on the pipeline.
4. Draft an **asset** (version + copy body). Set creative status to `ready_for_qc` when you mean it.
5. Record a **review**: Internal QC first, then Approval. Checklist is unknown / yes / no — never invent yes. Recommend Go / edit / kill. Saving Go does **not** approve or publish the asset.
6. If you approve, edit the asset and set `creativeStatus` to `approved` in that save. Mark the jacket launch checklist only when those facts are true.
7. Record a **publication** only after an actual placement exists. Add a calendar slot if you are flighting. Then an **observation** (blank metric stays unknown) and a **learning**.
8. Reload. Records stay in this browser. Export JSON. Keep private studio data off the public repository.

## Privacy boundary

- Storage key: `exaryn.studio.marketing.workspace.v1` in this browser only.
- Schema version: `3`. Version `1` and `2` payloads migrate in place (v2 **jobs** become **campaigns**; IPA brief fields are copied from the older names; review `gate` defaults to `internal_qc` and `round` to `1`; launch checklist defaults to `unknown`).
- Import is validated before any existing records change. Invalid JSON, unknown relations, unsafe URLs, and failed writes leave the current workspace in place and explain the failure.
- Only `http:` and `https:` URLs are accepted. Untrusted text is escaped before it is rendered.
- **Load fictional example** is opt-in and labelled fictional. It is not QuantFlex, Looking Up, or any studio account.
- No analytics, remote upload, credentials, live social APIs, or cloud sync. AI/code must never invent metric values.

## Checks

```sh
node --test workspace/marketing.test.js
```

Do not run `npm run digest`, `npm run repos`, `npm run brain`, or `npm run build` merely to try this page.

## Limits

This slice does not publish a public nav link, deploy a production marketing host, claim automated SEO/AEO/GEO scores, connect Engine/Dispatcher, or sync to Linear/Notion/Buffer. Independent review and owner acceptance are still required.
