"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const storeLib = require("./marketing-store.js");

function fresh() {
  return storeLib.createStore({
    storage: storeLib.memoryStorage(),
    now: () => "2026-09-20T12:00:00.000Z",
  });
}

function seedJourney(store) {
  const product = store.upsertProduct({
    name: "Harbor Lamp Co. (fictional)",
    audience: "Apartment renters",
  });
  assert.equal(product.ok, true);
  const project = store.upsertProject({
    name: "Spring landing rewrite (fictional)",
    productId: product.state.products[0].id,
    outcome: "Bounded page draft",
  });
  assert.equal(project.ok, true);
  const asset = store.upsertAsset({
    name: "Homepage hero draft (fictional)",
    kind: "content",
    productId: product.state.products[0].id,
    projectId: project.state.projects[0].id,
    channel: "website_search",
    sourceUrl: "https://example.com/fictional-hero",
  });
  assert.equal(asset.ok, true);
  const review = store.upsertReview({
    assetId: asset.state.assets[0].id,
    channel: "tiktok",
    intendedAudience: "Renters",
    desiredOutcome: "Understand the lamp",
    sourceNote: "Manual inspection of the draft.",
    observationDate: "2026-09-18",
    evidenceStatus: "unknown",
    finding: "No platform analytics adapter exists; reach stays unknown.",
    nextAction: "Keep the first sentence concrete.",
  });
  assert.equal(review.ok, true);
  return {
    productId: product.state.products[0].id,
    projectId: project.state.projects[0].id,
    assetId: asset.state.assets[0].id,
    reviewId: review.state.reviews[0].id,
    store,
  };
}

test("relationship validation: project cannot point at a missing product", () => {
  const store = fresh();
  const result = store.upsertProject({
    name: "Orphan project",
    productId: "missing-product-id",
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /unknown product/i);
  assert.equal(store.getState().projects.length, 0);
});

test("relationship validation: asset must link to a product or project", () => {
  const store = fresh();
  const result = store.upsertAsset({
    name: "Floating asset",
    channel: "other",
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /product or a project/i);
});

test("relationship validation: asset rejects an unknown project", () => {
  const store = fresh();
  const product = store.upsertProduct({ name: "Solo product" });
  const result = store.upsertAsset({
    name: "Bad link",
    productId: product.state.products[0].id,
    projectId: "missing-project-id",
    channel: "instagram_reels",
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /unknown project/i);
  assert.equal(store.getState().assets.length, 0);
});

test("relationship validation: review requires an existing asset", () => {
  const store = fresh();
  const result = store.upsertReview({
    assetId: "missing-asset-id",
    channel: "youtube_shorts",
    observationDate: "2026-09-18",
    evidenceStatus: "unknown",
    finding: "Nothing to attach.",
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /unknown asset/i);
});

test("relationship validation: project-linked asset may omit product", () => {
  const store = fresh();
  const project = store.upsertProject({ name: "Standalone effort" });
  assert.equal(project.ok, true);
  const asset = store.upsertAsset({
    name: "Project-only surface",
    kind: "product_surface",
    projectId: project.state.projects[0].id,
    channel: "other",
  });
  assert.equal(asset.ok, true);
});

test("missing metrics stay unknown and are never coerced to zero", () => {
  const seeded = seedJourney(fresh());
  const review = seeded.store.getState().reviews[0];
  assert.equal(review.metricValue, null);
  assert.notEqual(review.metricValue, 0);

  const withUnknownMetric = seeded.store.upsertReview({
    id: seeded.reviewId,
    assetId: seeded.assetId,
    channel: "website_search",
    observationDate: "2026-09-18",
    evidenceStatus: "unknown",
    finding: "Still no adapter.",
    metricName: "impressions",
    metricValue: "",
  });
  assert.equal(withUnknownMetric.ok, true);
  assert.equal(withUnknownMetric.state.reviews[0].metricValue, null);

  const invented = seeded.store.upsertReview({
    id: seeded.reviewId,
    assetId: seeded.assetId,
    channel: "website_search",
    observationDate: "2026-09-18",
    evidenceStatus: "unknown",
    finding: "Still no adapter.",
    metricName: "impressions",
    metricValue: 0,
  });
  assert.equal(invented.ok, false);
  assert.match(invented.error, /unknown/i);
  assert.equal(seeded.store.getState().reviews[0].metricValue, null);
});

test("reload persistence keeps the first-user-journey records", () => {
  const storage = storeLib.memoryStorage();
  const first = storeLib.createStore({
    storage,
    now: () => "2026-09-20T12:00:00.000Z",
  });
  const seeded = seedJourney(first);
  const exported = first.getState();

  const reloaded = storeLib.createStore({
    storage,
    now: () => "2026-09-20T13:00:00.000Z",
  });
  const loaded = reloaded.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.state.products[0].id, seeded.productId);
  assert.equal(loaded.state.projects[0].id, seeded.projectId);
  assert.equal(loaded.state.assets[0].id, seeded.assetId);
  assert.equal(loaded.state.reviews[0].id, seeded.reviewId);
  assert.deepEqual(
    loaded.state.products.map((item) => item.name),
    exported.products.map((item) => item.name)
  );
});

test("export/import round-trip restores the same records", () => {
  const original = seedJourney(fresh()).store;
  const json = original.exportJson();
  const incoming = JSON.parse(json);
  assert.equal(incoming.kind, storeLib.KIND);
  assert.equal(incoming.schemaVersion, 3);

  const other = fresh();
  other.upsertProduct({ name: "Temporary" });
  const imported = other.importJson(json);
  assert.equal(imported.ok, true);
  assert.deepEqual(imported.state.products, original.getState().products);
  assert.deepEqual(imported.state.projects, original.getState().projects);
  assert.deepEqual(imported.state.assets, original.getState().assets);
  assert.deepEqual(imported.state.reviews, original.getState().reviews);
  assert.deepEqual(imported.state.briefs, original.getState().briefs);
  assert.deepEqual(imported.state.campaigns, original.getState().campaigns);
  assert.deepEqual(imported.state.publications, original.getState().publications);
  assert.deepEqual(imported.state.observations, original.getState().observations);
  assert.deepEqual(imported.state.learnings, original.getState().learnings);
});

test("invalid import preserves existing data", () => {
  const seeded = seedJourney(fresh());
  const before = seeded.store.getState();

  const cases = [
    "{not json",
    JSON.stringify({ hello: "world" }),
    JSON.stringify({ kind: "other-app", schemaVersion: 2, products: [], projects: [], assets: [], reviews: [], briefs: [], jobs: [], publications: [], observations: [], learnings: [] }),
    JSON.stringify({
      kind: storeLib.KIND,
      schemaVersion: 1,
      products: [],
      projects: [{ id: "ex-project-orphan", name: "Broken", productId: "no-such-product" }],
      assets: [],
      reviews: [],
    }),
  ];

  for (const payload of cases) {
    const result = seeded.store.importJson(payload);
    assert.equal(result.ok, false, `expected failure for ${payload.slice(0, 40)}`);
    assert.match(result.error, /unchanged|unsupported|valid json|missing|unknown/i);
    assert.deepEqual(seeded.store.getState(), before);
  }
});

test("failed storage writes preserve current data", () => {
  const backing = storeLib.memoryStorage();
  const storage = {
    getItem: (key) => backing.getItem(key),
    setItem(key, value) {
      if (String(value).includes("Must not persist")) {
        throw new Error("quota exceeded");
      }
      backing.setItem(key, value);
    },
    removeItem: (key) => backing.removeItem(key),
  };
  const store = storeLib.createStore({ storage, now: () => "2026-09-20T12:00:00.000Z" });
  const first = store.upsertProduct({ name: "Kept product" });
  assert.equal(first.ok, true);
  const failed = store.upsertProduct({ name: "Must not persist" });
  assert.equal(failed.ok, false);
  assert.match(failed.error, /left unchanged/i);
  assert.equal(store.getState().products.length, 1);
  assert.equal(store.getState().products[0].name, "Kept product");
});

test("script and unsafe URLs are inert or rejected", () => {
  const store = fresh();
  const product = store.upsertProduct({
    name: `<script>alert("xss")</script>`,
    notes: `<img src=x onerror="alert(1)">`,
  });
  assert.equal(product.ok, true);
  const name = product.state.products[0].name;
  const notes = product.state.products[0].notes;
  assert.match(name, /script/i);
  assert.equal(storeLib.escapeHtml(name).includes("<script>"), false);
  assert.equal(storeLib.escapeHtml(name), "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  assert.equal(storeLib.escapeHtml(notes).includes("<img"), false);

  const rejected = [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "https://user:secret@example.com/path",
    "/relative-path",
    "example.com",
  ];
  for (const url of rejected) {
    const result = storeLib.sanitizeUrl(url);
    assert.equal(result.ok, false, `should reject ${url}`);
  }

  const asset = store.upsertAsset({
    name: "Unsafe source",
    productId: product.state.products[0].id,
    channel: "answer_engines",
    sourceUrl: "javascript:alert(1)",
  });
  assert.equal(asset.ok, false);
  assert.match(asset.error, /http/i);
  assert.equal(store.getState().assets.length, 0);

  const safe = storeLib.sanitizeUrl("https://example.com/review-notes");
  assert.equal(safe.ok, true);
  assert.equal(safe.url, "https://example.com/review-notes");
});

test("imported injection payload stays text and does not become a URL", () => {
  const seeded = seedJourney(fresh());
  const snapshot = seeded.store.getState();
  const payload = {
    kind: storeLib.KIND,
    schemaVersion: 1,
    products: [
      {
        id: "ex-product-inject",
        name: `<script>document.cookie</script>`,
        audience: "",
        problemOrExperience: "",
        intendedValue: "",
        notes: "",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    projects: [],
    assets: [
      {
        id: "ex-asset-inject",
        name: "Injected asset",
        kind: "content",
        productId: "ex-product-inject",
        projectId: null,
        channel: "other",
        format: "",
        message: "",
        sourceUrl: "javascript:alert(1)",
        notes: "",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    reviews: [],
  };
  const result = seeded.store.importJson(JSON.stringify(payload));
  assert.equal(result.ok, false);
  assert.deepEqual(seeded.store.getState(), snapshot);

  payload.assets[0].sourceUrl = "https://example.com/safe";
  const accepted = seeded.store.importJson(JSON.stringify(payload));
  assert.equal(accepted.ok, true);
  const rendered = storeLib.escapeHtml(accepted.state.products[0].name);
  assert.equal(rendered.includes("<script>"), false);
  assert.match(rendered, /&lt;script&gt;/);
});

test("opt-in fictional example validates and is labelled fictional", () => {
  const example = storeLib.fictionalExample();
  assert.equal(example.fictional, true);
  assert.match(example.label, /fictional/i);
  assert.match(example.products[0].name, /fictional/i);
  const checked = storeLib.validateWorkspace(example);
  assert.equal(checked.ok, true);
  const store = fresh();
  const loaded = store.loadFictionalExample();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.state.reviews[0].metricValue, null);
  assert.equal(loaded.state.reviews[0].evidenceStatus, "unknown");
});

test("dashboard overview counts records and evidence without inventing metrics", () => {
  const empty = storeLib.summarizeWorkspace(storeLib.emptyState());
  assert.equal(empty.isEmpty, true);
  assert.deepEqual(empty.counts, {
    clients: 0,
    products: 0,
    projects: 0,
    assets: 0,
    reviews: 0,
    briefs: 0,
    campaigns: 0,
    publications: 0,
    observations: 0,
    learnings: 0,
    calendarItems: 0,
  });
  assert.deepEqual(empty.evidence, { observed: 0, reported: 0, unknown: 0 });
  assert.equal(empty.nextActions.length, 0);
  assert.equal(empty.attention.length, 0);
  assert.equal(empty.lastExportedAt, "");
  assert.equal(empty.lastUpdatedAt, "");

  const store = fresh();
  const loaded = store.loadFictionalExample();
  assert.equal(loaded.ok, true);
  const summary = storeLib.summarizeWorkspace(loaded.state, { today: "2026-09-21" });
  assert.equal(summary.isEmpty, false);
  assert.equal(summary.fictional, true);
  assert.deepEqual(summary.counts, {
    clients: 1,
    products: 1,
    projects: 1,
    assets: 4,
    reviews: 4,
    briefs: 1,
    campaigns: 5,
    publications: 2,
    observations: 1,
    learnings: 1,
    calendarItems: 3,
  });
  assert.equal(summary.evidence.unknown, 3);
  assert.equal(summary.evidence.reported, 1);
  assert.equal(summary.evidence.observed, 0);
  assert.equal(summary.campaignStages.learning, 1);
  assert.equal(summary.campaignStages.qc, 1);
  assert.equal(summary.campaignStages.drafting, 1);
  assert.equal(summary.campaignStages.approved, 1);
  assert.equal(summary.campaignStages.published, 1);
  assert.equal(summary.lastUpdatedAt, "2026-09-18T00:00:00.000Z");
  assert.equal(summary.lastExportedAt, "");
  assert.equal(summary.nextActions.length, 4);
  assert.equal(summary.jackets.traffic[0].campaignId, "ex-campaign-window-copy");
  assert.equal(summary.jackets.qc[0].campaignId, "ex-campaign-reel-caption");
  assert.equal(summary.jackets.unpublished[0].campaignId, "ex-campaign-shop-path");
  assert.equal(summary.jackets.awaitingObservation[0].campaignId, "ex-campaign-evening-still");
  assert.ok(summary.jackets.qc[0].reasons.includes("qc"));
  assert.ok(summary.jackets.qc[0].reasons.includes("blocked"));
  assert.ok(summary.jackets.qc[0].reasons.includes("due_soon"));
});

test("next-action queue stays empty when the field is missing", () => {
  const seeded = seedJourney(fresh());
  seeded.store.upsertReview({
    id: seeded.reviewId,
    assetId: seeded.assetId,
    channel: "website_search",
    observationDate: "2026-09-18",
    evidenceStatus: "unknown",
    finding: "A finding without a next step.",
    nextAction: "",
  });
  const summary = storeLib.summarizeWorkspace(seeded.store.getState());
  assert.equal(summary.counts.reviews, 1);
  assert.equal(summary.nextActions.length, 0);
});

test("export records lastExportedAt and import restores it", () => {
  const original = seedJourney(fresh()).store;
  const json = original.exportJson();
  const parsed = JSON.parse(json);
  assert.equal(parsed.exportedAt, "2026-09-20T12:00:00.000Z");
  assert.equal(original.getState().lastExportedAt, "2026-09-20T12:00:00.000Z");
  const summary = storeLib.summarizeWorkspace(original.getState());
  assert.equal(summary.lastExportedAt, "2026-09-20T12:00:00.000Z");

  const other = fresh();
  const imported = other.importJson(json);
  assert.equal(imported.ok, true);
  assert.equal(imported.state.lastExportedAt, "2026-09-20T12:00:00.000Z");
});

test("desk markup keeps skip link, noindex, and overview landmarks", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "marketing.html"), "utf8");
  assert.match(html, /noindex/);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /id="overview"/);
  assert.match(html, /id="jacket-board"/);
  assert.match(html, /id="view-home"/);
  assert.match(html, /id="view-pipeline"/);
  assert.match(html, /id="view-records"/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /Internal QC then Approval/);
  assert.match(html, /data-tab="briefs"/);
  assert.match(html, /data-tab="campaigns"/);
  assert.match(html, /data-tab="clients"/);
  assert.match(html, /data-tab="calendarItems"/);
  assert.match(html, /data-tab="publications"/);
  assert.match(html, /data-tab="observations"/);
  assert.match(html, /data-tab="learnings"/);
  assert.doesNotMatch(html, /data-tab="jobs"/);
  const css = fs.readFileSync(path.join(__dirname, "marketing.css"), "utf8");
  assert.match(css, /\.view\[hidden\]/);
  assert.match(css, /display:\s*none\s*!important/);
  assert.doesNotMatch(html, /googletagmanager|gtag\(|google-analytics/i);
  assert.doesNotMatch(html, /src="https?:\/\//i);
  assert.doesNotMatch(html, /href="\.\.\/index\.html"|site-nav/);
});

test("filters by product and project keep related records only", () => {
  const store = fresh();
  const a = store.upsertProduct({ name: "Product A" }).state.products.find((item) => item.name === "Product A");
  const b = store.upsertProduct({ name: "Product B" }).state.products.find((item) => item.name === "Product B");
  const pa = store.upsertProject({ name: "Project A", productId: a.id }).state.projects[0];
  store.upsertProject({ name: "Project B", productId: b.id });
  const assetA = store.upsertAsset({
    name: "Asset A",
    productId: a.id,
    projectId: pa.id,
    channel: "tiktok",
  }).state.assets[0];
  store.upsertAsset({
    name: "Asset B",
    productId: b.id,
    channel: "instagram_reels",
  });
  store.upsertReview({
    assetId: assetA.id,
    channel: "tiktok",
    observationDate: "2026-09-10",
    evidenceStatus: "reported",
    sourceNote: "Operator note from a fictional screenshot.",
    finding: "Caption is readable.",
  });

  const byProduct = store.filterRecords({ productId: a.id });
  assert.equal(byProduct.products.length, 1);
  assert.equal(byProduct.projects.length, 1);
  assert.equal(byProduct.assets.length, 1);
  assert.equal(byProduct.reviews.length, 1);

  const byProject = store.filterRecords({ projectId: pa.id });
  assert.equal(byProject.projects[0].id, pa.id);
  assert.equal(byProject.assets.length, 1);
});

test("schema v1 localStorage migrates to v3 and preserves records", () => {
  const v1 = {
    kind: storeLib.KIND,
    schemaVersion: 1,
    fictional: false,
    products: [
      {
        id: "ex-product-harbor-lamp",
        name: "Harbor Lamp Co. (fictional)",
        audience: "Apartment renters",
        problemOrExperience: "",
        intendedValue: "",
        notes: "",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    projects: [],
    assets: [
      {
        id: "ex-asset-hero-draft",
        name: "Homepage hero draft (fictional)",
        kind: "content",
        productId: "ex-product-harbor-lamp",
        projectId: null,
        channel: "website_search",
        format: "",
        message: "A lamp for the hour after work.",
        sourceUrl: "https://example.com/fictional-harbor-lamp-hero",
        notes: "",
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      },
    ],
    reviews: [
      {
        id: "ex-review-hero-unknown",
        assetId: "ex-asset-hero-draft",
        productId: "ex-product-harbor-lamp",
        projectId: null,
        channel: "website_search",
        intendedAudience: "",
        desiredOutcome: "",
        sourceUrl: "https://example.com/fictional-harbor-lamp-hero",
        sourceNote: "Manual read.",
        observationDate: "2026-09-04",
        evidenceStatus: "unknown",
        metricName: "",
        metricValue: null,
        finding: "Reach stays unknown.",
        nextAction: "Name the lamp.",
        createdAt: "2026-09-04T00:00:00.000Z",
        updatedAt: "2026-09-04T00:00:00.000Z",
      },
    ],
  };
  const storage = storeLib.memoryStorage();
  storage.setItem(storeLib.STORAGE_KEY, JSON.stringify(v1));
  const store = storeLib.createStore({
    storage,
    now: () => "2026-09-21T12:00:00.000Z",
  });
  const loaded = store.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.migratedFrom, 1);
  assert.equal(loaded.state.schemaVersion, 3);
  assert.equal(loaded.state.products[0].id, "ex-product-harbor-lamp");
  assert.equal(loaded.state.assets[0].creativeStatus, "draft");
  assert.equal(loaded.state.assets[0].versionLabel, "");
  assert.equal(loaded.state.assets[0].copyBody, "");
  assert.equal(loaded.state.reviews[0].recommendDecision, "unset");
  assert.equal(loaded.state.reviews[0].claimTruthOk, "unknown");
  assert.equal(loaded.state.reviews[0].channelFitOk, "unknown");
  assert.equal(loaded.state.reviews[0].ctaClearOk, "unknown");
  assert.equal(loaded.state.reviews[0].gate, "internal_qc");
  assert.equal(loaded.state.reviews[0].round, 1);
  assert.equal(loaded.state.briefs.length, 0);
  assert.equal(loaded.state.campaigns.length, 0);
  assert.equal(loaded.state.publications.length, 0);
  const persisted = JSON.parse(storage.getItem(storeLib.STORAGE_KEY));
  assert.equal(persisted.schemaVersion, 3);
  assert.equal(persisted.products[0].name, "Harbor Lamp Co. (fictional)");
});

test("v1 import migrates and invalid v2 import preserves data", () => {
  const seeded = seedJourney(fresh());
  const before = seeded.store.getState();
  const v1ok = {
    kind: storeLib.KIND,
    schemaVersion: 1,
    products: [
      {
        id: "ex-product-kept",
        name: "Kept from v1",
        audience: "",
        problemOrExperience: "",
        intendedValue: "",
        notes: "",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    projects: [],
    assets: [],
    reviews: [],
  };
  const migrated = seeded.store.importJson(JSON.stringify(v1ok));
  assert.equal(migrated.ok, true);
  assert.equal(migrated.migratedFrom, 1);
  assert.equal(migrated.state.schemaVersion, 3);
  assert.equal(migrated.state.products[0].name, "Kept from v1");

  const afterMigrate = seeded.store.getState();
  const bad = JSON.stringify({
    kind: storeLib.KIND,
    schemaVersion: 99,
    products: [],
    projects: [],
    assets: [],
    reviews: [],
  });
  const failed = seeded.store.importJson(bad);
  assert.equal(failed.ok, false);
  assert.match(failed.error, /unsupported|unchanged/i);
  assert.deepEqual(seeded.store.getState(), afterMigrate);
  assert.notDeepEqual(before.products, afterMigrate.products);
});

test("new entity relationships reject missing links", () => {
  const store = fresh();
  const product = store.upsertProduct({ name: "Solo product" });
  assert.equal(product.ok, true);
  const productId = product.state.products[0].id;

  const badBrief = store.upsertBrief({
    name: "Orphan brief",
    productId: "missing-product-id",
  });
  assert.equal(badBrief.ok, false);
  assert.match(badBrief.error, /unknown product/i);

  const brief = store.upsertBrief({ name: "Spring brief", productId });
  assert.equal(brief.ok, true);
  const briefId = brief.state.briefs[0].id;

  const badJob = store.upsertCampaign({
    name: "Orphan jacket",
    briefId: "missing-brief-id",
  });
  assert.equal(badJob.ok, false);
  assert.match(badJob.error, /unknown brief/i);

  const job = store.upsertCampaign({
    name: "Traffic packet",
    briefId,
    productId,
    stage: "drafting",
    owner: "Traffic",
    dueDate: "2026-09-24",
  });
  assert.equal(job.ok, true);

  const asset = store.upsertAsset({
    name: "Draft",
    productId,
    channel: "website_search",
    versionLabel: "v1",
    copyBody: "Post-ready line.",
    creativeStatus: "draft",
  });
  assert.equal(asset.ok, true);
  const assetId = asset.state.assets[0].id;

  const badPub = store.upsertPublication({
    assetId: "missing-asset-id",
    channel: "website_search",
  });
  assert.equal(badPub.ok, false);
  assert.match(badPub.error, /unknown asset/i);

  const publication = store.upsertPublication({
    assetId,
    channel: "website_search",
    assetVersion: "v1",
    publishedAt: "2026-09-08",
    authorizationNote: "Manual note only.",
  });
  assert.equal(publication.ok, true);
  const publicationId = publication.state.publications[0].id;

  const badObs = store.upsertObservation({
    metricName: "sessions",
    metricValue: "",
  });
  assert.equal(badObs.ok, false);
  assert.match(badObs.error, /publication or an asset/i);

  const observation = store.upsertObservation({
    publicationId,
    assetId,
    metricName: "sessions",
    metricValue: "",
    sourceNote: "No adapter.",
  });
  assert.equal(observation.ok, true);
  assert.equal(observation.state.observations[0].metricValue, null);

  const badLearn = store.upsertLearning({
    hypothesis: "A guess with no link.",
  });
  assert.equal(badLearn.ok, false);
  assert.match(badLearn.error, /campaign or a publication/i);

  const learning = store.upsertLearning({
    campaignId: job.state.campaigns[0].id,
    publicationId,
    hypothesis: "Naming the object helps.",
    cannotShow: "Reach stays unknown.",
  });
  assert.equal(learning.ok, true);
});

test("pipeline attention: traffic, qc, unpublished, awaiting observation", () => {
  const store = fresh();
  store.upsertCampaign({ name: "Quiet jacket", stage: "briefed", dueDate: "2026-12-01" });
  store.upsertCampaign({
    name: "Blocked drafting",
    stage: "drafting",
    dueDate: "2026-12-01",
    blocker: "Waiting on legal.",
  });
  store.upsertCampaign({ name: "In QC", stage: "qc", dueDate: "2026-12-01" });
  store.upsertCampaign({ name: "Approved unpublished", stage: "approved", dueDate: "2026-12-01" });
  store.upsertCampaign({ name: "Due soon", stage: "briefed", dueDate: "2026-09-24" });
  store.upsertCampaign({ name: "Overdue", stage: "drafting", dueDate: "2026-09-10" });
  store.upsertCampaign({ name: "Already published", stage: "published", dueDate: "2026-09-10" });
  store.upsertCampaign({ name: "Killed", stage: "killed", dueDate: "2026-09-10", blocker: "Dead" });

  const jackets = storeLib.jacketsNeedingAttention(store.getState(), "2026-09-21");
  assert.deepEqual(
    jackets.traffic.map((item) => item.name).sort(),
    ["Blocked drafting", "Due soon", "Overdue", "Quiet jacket"]
  );
  assert.deepEqual(
    jackets.qc.map((item) => item.name),
    ["In QC"]
  );
  assert.deepEqual(
    jackets.unpublished.map((item) => item.name),
    ["Approved unpublished"]
  );
  assert.deepEqual(
    jackets.awaitingObservation.map((item) => item.name),
    ["Already published"]
  );
  const approved = jackets.unpublished[0];
  assert.ok(approved.reasons.includes("unpublished"));
  const due = jackets.traffic.find((item) => item.name === "Due soon");
  assert.ok(due.reasons.includes("due_soon"));
  const overdue = jackets.traffic.find((item) => item.name === "Overdue");
  assert.ok(overdue.reasons.includes("overdue"));
});

test("review Go does not auto-approve the asset or create a publication", () => {
  const seeded = seedJourney(fresh());
  assert.equal(seeded.store.getState().assets[0].creativeStatus, "draft");
  const reviewed = seeded.store.upsertReview({
    id: seeded.reviewId,
    assetId: seeded.assetId,
    channel: "website_search",
    observationDate: "2026-09-18",
    evidenceStatus: "unknown",
    finding: "Copy names the object.",
    recommendDecision: "go",
    claimTruthOk: "yes",
    channelFitOk: "unknown",
    ctaClearOk: "unknown",
  });
  assert.equal(reviewed.ok, true);
  assert.equal(reviewed.state.reviews[0].recommendDecision, "go");
  assert.equal(reviewed.state.assets[0].creativeStatus, "draft");
  assert.equal(reviewed.state.publications.length, 0);

  const approved = seeded.store.upsertAsset({
    id: seeded.assetId,
    name: "Homepage hero draft (fictional)",
    kind: "content",
    productId: seeded.productId,
    projectId: seeded.projectId,
    channel: "website_search",
    sourceUrl: "https://example.com/fictional-hero",
    creativeStatus: "approved",
    versionLabel: "v2",
  });
  assert.equal(approved.ok, true);
  assert.equal(approved.state.assets[0].creativeStatus, "approved");
  assert.equal(approved.state.publications.length, 0);
});

test("observation blank metric stays unknown and QC flags default to unknown", () => {
  const seeded = seedJourney(fresh());
  const review = seeded.store.getState().reviews[0];
  assert.equal(review.recommendDecision, "unset");
  assert.equal(review.claimTruthOk, "unknown");
  assert.equal(review.channelFitOk, "unknown");
  assert.equal(review.ctaClearOk, "unknown");

  const publication = seeded.store.upsertPublication({
    assetId: seeded.assetId,
    channel: "website_search",
    publishedAt: "2026-09-08",
  });
  assert.equal(publication.ok, true);
  const observation = seeded.store.upsertObservation({
    publicationId: publication.state.publications[0].id,
    assetId: seeded.assetId,
    metricName: "landing_sessions",
    metricValue: "",
    limitations: "No adapter.",
  });
  assert.equal(observation.ok, true);
  assert.equal(observation.state.observations[0].metricValue, null);
  assert.notEqual(observation.state.observations[0].metricValue, 0);
});

test("opt-in fictional example walks one campaign jacket through publication and learning", () => {
  const example = storeLib.fictionalExample();
  assert.equal(example.schemaVersion, 3);
  const checked = storeLib.validateWorkspace(example);
  assert.equal(checked.ok, true);
  const hero = example.assets.find((item) => item.id === "ex-asset-hero-draft");
  assert.equal(hero.creativeStatus, "approved");
  assert.equal(hero.versionLabel, "v2");
  const qc = example.reviews.find((item) => item.id === "ex-review-hero-unknown");
  assert.equal(qc.recommendDecision, "go");
  assert.equal(qc.gate, "internal_qc");
  assert.equal(qc.ctaClearOk, "unknown");
  const approval = example.reviews.find((item) => item.id === "ex-review-hero-approval");
  assert.equal(approval.gate, "approval");
  assert.equal(approval.recommendDecision, "go");
  assert.equal(example.publications[0].assetId, "ex-asset-hero-draft");
  assert.equal(example.observations[0].metricValue, null);
  assert.match(example.learnings[0].cannotShow, /unknown/i);
  assert.equal(example.learnings[0].campaignId, "ex-campaign-landing-hero");
  assert.equal(example.clients[0].name.includes("Exaryn Studio"), true);
  assert.equal(example.briefs[0].locked, true);
  const store = fresh();
  const loaded = store.loadFictionalExample();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.state.campaigns.length, 5);
});

test("schema v2 jobs migrate to campaign jackets and persist as v3", () => {
  const v2 = {
    kind: storeLib.KIND,
    schemaVersion: 2,
    fictional: false,
    products: [
      {
        id: "ex-product-harbor-lamp",
        name: "Harbor Lamp Co. (fictional)",
        audience: "",
        problemOrExperience: "",
        intendedValue: "",
        notes: "",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    projects: [],
    assets: [],
    reviews: [],
    briefs: [
      {
        id: "ex-brief-spring-landing",
        name: "Spring landing brief (fictional)",
        productId: "ex-product-harbor-lamp",
        projectId: null,
        audience: "Apartment renters",
        problemOrInsight: "Harsh overhead lighting.",
        messageHypothesis: "Name the lamp.",
        mandatoryClaims: "Portable.",
        outOfScope: "Paid social.",
        successDefinition: "A reader can name the object.",
        notes: "",
        createdAt: "2026-09-02T12:00:00.000Z",
        updatedAt: "2026-09-02T12:00:00.000Z",
      },
    ],
    jobs: [
      {
        id: "ex-job-landing-hero",
        name: "Landing hero packet (fictional)",
        briefId: "ex-brief-spring-landing",
        productId: "ex-product-harbor-lamp",
        projectId: null,
        stage: "qc",
        owner: "Traffic",
        dueDate: "2026-09-24",
        blocker: "Waiting on object name.",
        notes: "",
        createdAt: "2026-09-02T15:00:00.000Z",
        updatedAt: "2026-09-06T00:00:00.000Z",
      },
    ],
    publications: [],
    observations: [],
    learnings: [],
  };
  const storage = storeLib.memoryStorage();
  storage.setItem(storeLib.STORAGE_KEY, JSON.stringify(v2));
  const store = storeLib.createStore({
    storage,
    now: () => "2026-09-21T12:00:00.000Z",
  });
  const loaded = store.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.migratedFrom, 2);
  assert.equal(loaded.state.schemaVersion, 3);
  assert.equal(loaded.state.campaigns.length, 1);
  assert.equal(loaded.state.campaigns[0].id, "ex-job-landing-hero");
  assert.equal(loaded.state.campaigns[0].stage, "qc");
  assert.equal(loaded.state.campaigns[0].approvalsPresent, "unknown");
  assert.equal(loaded.state.campaigns[0].assetApproved, "unknown");
  assert.equal(loaded.state.briefs[0].targetAudience, "Apartment renters");
  assert.equal(loaded.state.briefs[0].proposition, "Name the lamp.");
  assert.equal(loaded.state.briefs[0].locked, false);
  const persisted = JSON.parse(storage.getItem(storeLib.STORAGE_KEY));
  assert.equal(persisted.schemaVersion, 3);
  assert.equal(persisted.campaigns[0].name, "Landing hero packet (fictional)");
});

test("brief lock rejects edits until unlocked, and claims keep unknown unless marked", () => {
  const store = fresh();
  const created = store.upsertBrief({
    name: "Harbor brief",
    whereWeAreNow: "Harsh light.",
    proposition: "Name the lamp.",
    claimsText: "Harbor Lamp is a portable light for a rented room.\nThe v2 hero names the object | supported",
    locked: true,
  });
  assert.equal(created.ok, true);
  const brief = created.state.briefs[0];
  assert.equal(brief.locked, true);
  assert.equal(brief.claims.length, 2);
  assert.equal(brief.claims[0].evidenceStatus, "unknown");
  assert.equal(brief.claims[1].evidenceStatus, "supported");

  const blocked = store.upsertBrief({
    id: brief.id,
    name: "Should not save",
    locked: true,
  });
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /locked/i);
  assert.equal(store.getState().briefs[0].name, "Harbor brief");

  const unlocked = store.upsertBrief({
    id: brief.id,
    name: "Harbor brief revised",
    proposition: "Name the hour, then the lamp.",
    claimsText: "Harbor Lamp is a portable light for a rented room. | unsupported",
    locked: false,
  });
  assert.equal(unlocked.ok, true);
  assert.equal(unlocked.state.briefs[0].locked, false);
  assert.equal(unlocked.state.briefs[0].name, "Harbor brief revised");
  assert.equal(unlocked.state.briefs[0].claims[0].evidenceStatus, "unsupported");
});

test("claim text containing a pipe survives the edit-form round trip", () => {
  const store = fresh();
  const created = store.upsertBrief({
    name: "Pipe brief",
    claims: [{ text: "Warm | dimmable light", evidenceStatus: "supported" }],
  });
  assert.equal(created.ok, true);
  const brief = created.state.briefs[0];
  const resaved = store.upsertBrief({
    id: brief.id,
    name: brief.name,
    claimsText: storeLib.formatClaimsText(brief.claims),
  });
  assert.equal(resaved.ok, true);
  assert.deepEqual(resaved.state.briefs[0].claims, [
    { text: "Warm | dimmable light", evidenceStatus: "supported" },
  ]);
});

test("review gates distinguish internal QC from approval and keep round", () => {
  const seeded = seedJourney(fresh());
  const qc = seeded.store.upsertReview({
    id: seeded.reviewId,
    assetId: seeded.assetId,
    channel: "website_search",
    observationDate: "2026-09-18",
    evidenceStatus: "unknown",
    finding: "Internal read only.",
    gate: "internal_qc",
    round: 1,
    recommendDecision: "edit",
  });
  assert.equal(qc.ok, true);
  assert.equal(qc.state.reviews[0].gate, "internal_qc");
  assert.equal(qc.state.reviews[0].round, 1);
  assert.equal(qc.state.reviews[0].recommendDecision, "edit");

  const approval = seeded.store.upsertReview({
    assetId: seeded.assetId,
    channel: "website_search",
    observationDate: "2026-09-19",
    evidenceStatus: "unknown",
    sourceNote: "Studio Go note.",
    finding: "Studio Go. No live publish.",
    gate: "approval",
    round: 2,
    recommendDecision: "go",
  });
  assert.equal(approval.ok, true);
  const go = approval.state.reviews.find((item) => item.gate === "approval");
  assert.equal(go.round, 2);
  assert.equal(go.recommendDecision, "go");
  assert.equal(approval.state.assets[0].creativeStatus, "draft");
  assert.equal(approval.state.publications.length, 0);

  const badGate = seeded.store.upsertReview({
    assetId: seeded.assetId,
    channel: "website_search",
    observationDate: "2026-09-19",
    evidenceStatus: "unknown",
    finding: "Bad gate.",
    gate: "client_portal",
  });
  assert.equal(badGate.ok, false);
  assert.match(badGate.error, /internal_qc or approval/i);
});

test("launch checklist stays unknown unless marked, and calendar items validate", () => {
  const store = fresh();
  const campaign = store.upsertCampaign({ name: "Window copy" });
  assert.equal(campaign.ok, true);
  const jacket = campaign.state.campaigns[0];
  assert.equal(jacket.approvalsPresent, "unknown");
  assert.equal(jacket.assetApproved, "unknown");
  assert.equal(jacket.destinationSet, "unknown");
  assert.equal(jacket.authorizationNoted, "unknown");
  assert.notEqual(jacket.approvalsPresent, "yes");

  const slot = store.upsertCalendarItem({
    title: "Reel hold",
    date: "2026-09-26",
    campaignId: jacket.id,
    channel: "instagram_reels",
  });
  assert.equal(slot.ok, true);
  assert.equal(slot.state.calendarItems[0].campaignId, jacket.id);

  const badSlot = store.upsertCalendarItem({
    title: "Orphan slot",
    date: "2026-09-26",
    campaignId: "missing-campaign-id",
  });
  assert.equal(badSlot.ok, false);
  assert.match(badSlot.error, /unknown campaign/i);
});
