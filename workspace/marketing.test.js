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
  assert.equal(incoming.schemaVersion, 1);

  const other = fresh();
  other.upsertProduct({ name: "Temporary" });
  const imported = other.importJson(json);
  assert.equal(imported.ok, true);
  assert.deepEqual(imported.state.products, original.getState().products);
  assert.deepEqual(imported.state.projects, original.getState().projects);
  assert.deepEqual(imported.state.assets, original.getState().assets);
  assert.deepEqual(imported.state.reviews, original.getState().reviews);
});

test("invalid import preserves existing data", () => {
  const seeded = seedJourney(fresh());
  const before = seeded.store.getState();

  const cases = [
    "{not json",
    JSON.stringify({ hello: "world" }),
    JSON.stringify({ kind: "other-app", schemaVersion: 1, products: [], projects: [], assets: [], reviews: [] }),
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
