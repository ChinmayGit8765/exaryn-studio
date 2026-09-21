/* ExarynStudio marketing workspace — local, versioned records.
   Browser or Node. No remote upload, analytics, or Engine dependency. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MarketingStore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const KIND = "exaryn-studio-marketing-workspace";
  const STORAGE_KEY = "exaryn.studio.marketing.workspace.v1";

  const CHANNELS = Object.freeze([
    { id: "website_search", label: "Website / search" },
    { id: "answer_engines", label: "Answer engines" },
    { id: "tiktok", label: "TikTok" },
    { id: "instagram_reels", label: "Instagram Reels" },
    { id: "youtube_shorts", label: "YouTube Shorts" },
    { id: "other", label: "Other" },
  ]);

  const CHANNEL_IDS = new Set(CHANNELS.map((c) => c.id));
  const EVIDENCE_STATUSES = Object.freeze(["observed", "reported", "unknown"]);
  const ASSET_KINDS = Object.freeze(["content", "product_surface"]);
  const ID_RE = /^[a-z0-9][a-z0-9-]{7,63}$/i;
  const SAFE_URL_RE = /^(https?:)\/\//i;

  function emptyState() {
    return {
      kind: KIND,
      schemaVersion: SCHEMA_VERSION,
      lastExportedAt: "",
      fictional: false,
      products: [],
      projects: [],
      assets: [],
      reviews: [],
    };
  }

  function optionalIsoStamp(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(raw)) return "";
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return "";
    return raw;
  }

  function summarizeWorkspace(state) {
    const snapshot = state && typeof state === "object" ? state : emptyState();
    const products = Array.isArray(snapshot.products) ? snapshot.products : [];
    const projects = Array.isArray(snapshot.projects) ? snapshot.projects : [];
    const assets = Array.isArray(snapshot.assets) ? snapshot.assets : [];
    const reviews = Array.isArray(snapshot.reviews) ? snapshot.reviews : [];
    const evidence = { observed: 0, reported: 0, unknown: 0 };
    for (const review of reviews) {
      if (Object.prototype.hasOwnProperty.call(evidence, review.evidenceStatus)) {
        evidence[review.evidenceStatus] += 1;
      }
    }
    const stamps = [];
    for (const collection of [products, projects, assets, reviews]) {
      for (const item of collection) {
        const stamp = optionalIsoStamp(item?.updatedAt) || optionalIsoStamp(item?.createdAt);
        if (stamp) stamps.push(stamp);
      }
    }
    const lastUpdatedAt = stamps.length ? stamps.reduce((latest, stamp) => (stamp > latest ? stamp : latest)) : "";
    const nextActions = reviews
      .filter((review) => String(review.nextAction || "").trim())
      .slice()
      .sort((a, b) => String(b.observationDate || "").localeCompare(String(a.observationDate || "")))
      .map((review) => ({
        reviewId: review.id,
        assetId: review.assetId,
        nextAction: String(review.nextAction).trim(),
        finding: String(review.finding || "").trim(),
        evidenceStatus: review.evidenceStatus,
        observationDate: review.observationDate || "",
        intendedAudience: String(review.intendedAudience || "").trim(),
        desiredOutcome: String(review.desiredOutcome || "").trim(),
      }));
    return {
      counts: {
        products: products.length,
        projects: projects.length,
        assets: assets.length,
        reviews: reviews.length,
      },
      evidence,
      lastUpdatedAt,
      lastExportedAt: optionalIsoStamp(snapshot.lastExportedAt),
      fictional: snapshot.fictional === true,
      isEmpty: products.length + projects.length + assets.length + reviews.length === 0,
      nextActions,
    };
  }

  function channelLabel(id) {
    return CHANNELS.find((c) => c.id === id)?.label || "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch]
    );
  }

  function trimText(value, max) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > max ? text.slice(0, max) : text;
  }

  function trimMultiline(value, max) {
    const text = String(value ?? "").replace(/\r\n/g, "\n").trim();
    if (!text) return "";
    return text.length > max ? text.slice(0, max) : text;
  }

  function sanitizeUrl(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return { ok: true, url: "" };
    if (/[\s<>]/.test(raw) || raw.length > 2000) {
      return { ok: false, error: "Source URL is not a safe http(s) address." };
    }
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return { ok: false, error: "Source URL is not a safe http(s) address." };
    }
    if (!SAFE_URL_RE.test(parsed.protocol + "//")) {
      return { ok: false, error: "Only http and https URLs are allowed." };
    }
    if (parsed.username || parsed.password) {
      return { ok: false, error: "URLs must not include credentials." };
    }
    return { ok: true, url: parsed.href };
  }

  function makeId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function resolveId(inputId, existing, label) {
    if (existing && existing.id) return { ok: true, id: existing.id };
    if (inputId) return asId(inputId, label);
    return { ok: true, id: makeId() };
  }

  function nowIso(clock) {
    return clock();
  }

  function asId(value, label) {
    const id = String(value ?? "").trim();
    if (!id) return { ok: false, error: `${label} is required.` };
    if (!ID_RE.test(id)) return { ok: false, error: `${label} is not a valid id.` };
    return { ok: true, id };
  }

  function optionalId(value, label) {
    const raw = String(value ?? "").trim();
    if (!raw) return { ok: true, id: null };
    return asId(raw, label);
  }

  function isoDate(value, label, required) {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return required
        ? { ok: false, error: `${label} is required.` }
        : { ok: true, value: "" };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return { ok: false, error: `${label} must be an ISO date (YYYY-MM-DD).` };
    }
    const dt = new Date(`${raw}T00:00:00Z`);
    if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== raw) {
      return { ok: false, error: `${label} is not a real calendar date.` };
    }
    return { ok: true, value: raw };
  }

  function normalizeMetricValue(raw, evidenceStatus) {
    if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
    if (evidenceStatus === "unknown") {
      return {
        ok: false,
        error: "A metric value cannot be stored while evidence status is unknown. Leave the metric blank.",
      };
    }
    if (typeof raw === "number") {
      if (!Number.isFinite(raw)) return { ok: false, error: "Metric value must be a finite number or blank (unknown)." };
      return { ok: true, value: raw };
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed || /^unknown$/i.test(trimmed)) return { ok: true, value: null };
      if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return { ok: false, error: "Metric value must be a number or left blank for unknown." };
      }
      return { ok: true, value: Number(trimmed) };
    }
    return { ok: false, error: "Metric value must be a number or left blank for unknown." };
  }

  function uniqueById(items, label) {
    const seen = new Set();
    for (const item of items) {
      if (!item || typeof item !== "object") return `${label} entries must be objects.`;
      const id = String(item.id ?? "").trim();
      if (!id || !ID_RE.test(id)) return `Each ${label} needs a valid id.`;
      if (seen.has(id)) return `Duplicate ${label} id: ${id}.`;
      seen.add(id);
    }
    return null;
  }

  function indexById(items) {
    const map = new Map();
    for (const item of items) map.set(item.id, item);
    return map;
  }

  function validateRelations(state) {
    const products = indexById(state.products);
    const projects = indexById(state.projects);
    const assets = indexById(state.assets);

    for (const project of state.projects) {
      if (project.productId && !products.has(project.productId)) {
        return `Project "${project.id}" links to unknown product "${project.productId}".`;
      }
    }

    for (const asset of state.assets) {
      if (!asset.productId && !asset.projectId) {
        return `Asset "${asset.id}" must link to a product or a project.`;
      }
      if (asset.productId && !products.has(asset.productId)) {
        return `Asset "${asset.id}" links to unknown product "${asset.productId}".`;
      }
      if (asset.projectId && !projects.has(asset.projectId)) {
        return `Asset "${asset.id}" links to unknown project "${asset.projectId}".`;
      }
      if (asset.productId && asset.projectId) {
        const project = projects.get(asset.projectId);
        if (project.productId && project.productId !== asset.productId) {
          return `Asset "${asset.id}" product does not match its project's product.`;
        }
      }
    }

    for (const review of state.reviews) {
      if (!review.assetId) return `Review "${review.id}" must attach to an asset.`;
      if (!assets.has(review.assetId)) {
        return `Review "${review.id}" links to unknown asset "${review.assetId}".`;
      }
      const asset = assets.get(review.assetId);
      if (review.productId && review.productId !== (asset.productId || null)) {
        const project = asset.projectId ? projects.get(asset.projectId) : null;
        const inherited = asset.productId || project?.productId || null;
        if (review.productId !== inherited) {
          return `Review "${review.id}" product does not match its asset.`;
        }
      }
      if (review.projectId && review.projectId !== (asset.projectId || null)) {
        return `Review "${review.id}" project does not match its asset.`;
      }
    }
    return null;
  }

  function normalizeProduct(input, existing, clock) {
    const name = trimText(input.name, 120);
    if (!name) return { ok: false, error: "Product name is required." };
    const id = resolveId(input.id, existing, "Product id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        name,
        audience: trimText(input.audience, 240),
        problemOrExperience: trimMultiline(input.problemOrExperience, 800),
        intendedValue: trimMultiline(input.intendedValue, 800),
        notes: trimMultiline(input.notes, 800),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function normalizeProject(input, existing, clock) {
    const name = trimText(input.name, 120);
    if (!name) return { ok: false, error: "Project name is required." };
    const product = optionalId(input.productId, "Product");
    if (!product.ok) return product;
    const id = resolveId(input.id, existing, "Project id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        name,
        productId: product.id,
        outcome: trimMultiline(input.outcome, 800),
        owner: trimText(input.owner, 80),
        notes: trimMultiline(input.notes, 800),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function normalizeAsset(input, existing, clock) {
    const name = trimText(input.name, 160);
    if (!name) return { ok: false, error: "Asset name is required." };
    const kind = String(input.kind ?? "content").trim();
    if (!ASSET_KINDS.includes(kind)) {
      return { ok: false, error: "Asset kind must be content or product_surface." };
    }
    const product = optionalId(input.productId, "Product");
    if (!product.ok) return product;
    const project = optionalId(input.projectId, "Project");
    if (!project.ok) return project;
    if (!product.id && !project.id) {
      return { ok: false, error: "An asset must link to a product or a project." };
    }
    const channel = String(input.channel ?? "").trim();
    if (!CHANNEL_IDS.has(channel)) {
      return { ok: false, error: "Choose a known channel for the asset." };
    }
    const url = sanitizeUrl(input.sourceUrl);
    if (!url.ok) return url;
    const id = resolveId(input.id, existing, "Asset id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        name,
        kind,
        productId: product.id,
        projectId: project.id,
        channel,
        format: trimText(input.format, 80),
        message: trimMultiline(input.message, 800),
        sourceUrl: url.url,
        notes: trimMultiline(input.notes, 800),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function normalizeReview(input, existing, clock, assets, projects) {
    const asset = asId(input.assetId, "Asset");
    if (!asset.ok) return asset;
    const channel = String(input.channel ?? "").trim();
    if (!CHANNEL_IDS.has(channel)) {
      return { ok: false, error: "Choose a known channel for the review." };
    }
    const evidenceStatus = String(input.evidenceStatus ?? "unknown").trim();
    if (!EVIDENCE_STATUSES.includes(evidenceStatus)) {
      return { ok: false, error: "Evidence status must be observed, reported, or unknown." };
    }
    const finding = trimMultiline(input.finding, 1600);
    if (!finding) return { ok: false, error: "Review finding is required." };
    const date = isoDate(input.observationDate, "Observation date", true);
    if (!date.ok) return date;
    const url = sanitizeUrl(input.sourceUrl);
    if (!url.ok) return url;
    const sourceNote = trimMultiline(input.sourceNote, 800);
    if ((evidenceStatus === "observed" || evidenceStatus === "reported") && !url.url && !sourceNote) {
      return {
        ok: false,
        error: "Observed or reported evidence needs a source URL or a source note.",
      };
    }
    const metricName = trimText(input.metricName, 80);
    const metric = normalizeMetricValue(input.metricValue, evidenceStatus);
    if (!metric.ok) return metric;
    if (metric.value !== null && !metricName) {
      return { ok: false, error: "Name the metric before storing a numeric value." };
    }
    const assetRecord = assets.get(asset.id);
    const inheritedProject = assetRecord?.projectId || null;
    const inheritedProduct =
      assetRecord?.productId ||
      (inheritedProject ? projects.get(inheritedProject)?.productId || null : null);
    const id = resolveId(input.id, existing, "Review id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        assetId: asset.id,
        productId: inheritedProduct,
        projectId: inheritedProject,
        channel,
        intendedAudience: trimText(input.intendedAudience, 240),
        desiredOutcome: trimMultiline(input.desiredOutcome, 800),
        sourceUrl: url.url,
        sourceNote,
        observationDate: date.value,
        evidenceStatus,
        metricName,
        metricValue: metric.value,
        finding,
        nextAction: trimMultiline(input.nextAction, 800),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function validateWorkspace(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "Import must be a JSON object." };
    }
    if (raw.kind != null && raw.kind !== KIND) {
      return { ok: false, error: "File is not an ExarynStudio marketing workspace export." };
    }
    if (raw.schemaVersion !== SCHEMA_VERSION) {
      return { ok: false, error: `Unsupported schema version. This workspace reads version ${SCHEMA_VERSION}.` };
    }
    const collections = ["products", "projects", "assets", "reviews"];
    for (const key of collections) {
      if (!Array.isArray(raw[key])) {
        return { ok: false, error: `Import is missing a ${key} array.` };
      }
    }
    const dupe =
      uniqueById(raw.products, "product") ||
      uniqueById(raw.projects, "project") ||
      uniqueById(raw.assets, "asset") ||
      uniqueById(raw.reviews, "review");
    if (dupe) return { ok: false, error: dupe };

    const state = emptyState();
    const clock = () => "1970-01-01T00:00:00.000Z";

    for (const item of raw.products) {
      const next = normalizeProduct(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      if (item.createdAt) next.record.createdAt = String(item.createdAt);
      if (item.updatedAt) next.record.updatedAt = String(item.updatedAt);
      next.record.id = String(item.id);
      state.products.push(next.record);
    }
    for (const item of raw.projects) {
      const next = normalizeProject(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      if (item.createdAt) next.record.createdAt = String(item.createdAt);
      if (item.updatedAt) next.record.updatedAt = String(item.updatedAt);
      next.record.id = String(item.id);
      state.projects.push(next.record);
    }
    for (const item of raw.assets) {
      const next = normalizeAsset(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      if (item.createdAt) next.record.createdAt = String(item.createdAt);
      if (item.updatedAt) next.record.updatedAt = String(item.updatedAt);
      next.record.id = String(item.id);
      state.assets.push(next.record);
    }
    const assets = indexById(state.assets);
    const projects = indexById(state.projects);
    for (const item of raw.reviews) {
      const next = normalizeReview(
        item,
        item.id ? { id: String(item.id), createdAt: item.createdAt } : null,
        clock,
        assets,
        projects
      );
      if (!next.ok) return next;
      if (item.createdAt) next.record.createdAt = String(item.createdAt);
      if (item.updatedAt) next.record.updatedAt = String(item.updatedAt);
      next.record.id = String(item.id);
      state.reviews.push(next.record);
    }

    const relationError = validateRelations(state);
    if (relationError) return { ok: false, error: relationError };
    state.lastExportedAt =
      optionalIsoStamp(raw.lastExportedAt) || optionalIsoStamp(raw.exportedAt);
    state.fictional = raw.fictional === true;
    return { ok: true, state };
  }

  function memoryStorage() {
    const map = new Map();
    return {
      getItem(key) {
        return map.has(key) ? map.get(key) : null;
      },
      setItem(key, value) {
        map.set(key, String(value));
      },
      removeItem(key) {
        map.delete(key);
      },
    };
  }

  function browserStorage() {
    if (typeof localStorage === "undefined") return memoryStorage();
    return localStorage;
  }

  function fictionalExample() {
    return {
      kind: KIND,
      schemaVersion: SCHEMA_VERSION,
      fictional: true,
      label: "Fictional example — not studio, product, or account data",
      products: [
        {
          id: "ex-product-harbor-lamp",
          name: "Harbor Lamp Co. (fictional)",
          audience: "Apartment renters who want warmer evening light",
          problemOrExperience: "Harsh overhead lighting makes a rented room feel unfinished.",
          intendedValue: "A portable lamp that makes the room feel settled.",
          notes: "FICTIONAL EXAMPLE. Not an Exaryn offering.",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      projects: [
        {
          id: "ex-project-spring-landing",
          name: "Spring landing rewrite (fictional)",
          productId: "ex-product-harbor-lamp",
          outcome: "A bounded draft of the product page, not a live campaign.",
          owner: "Example reviewer",
          notes: "FICTIONAL EXAMPLE. No real publication.",
          createdAt: "2026-09-02T00:00:00.000Z",
          updatedAt: "2026-09-02T00:00:00.000Z",
        },
      ],
      assets: [
        {
          id: "ex-asset-hero-draft",
          name: "Homepage hero draft (fictional)",
          kind: "content",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          channel: "website_search",
          format: "Landing page copy",
          message: "A lamp for the hour after work.",
          sourceUrl: "https://example.com/fictional-harbor-lamp-hero",
          notes: "FICTIONAL EXAMPLE. URL is an example.com placeholder.",
          createdAt: "2026-09-03T00:00:00.000Z",
          updatedAt: "2026-09-03T00:00:00.000Z",
        },
        {
          id: "ex-asset-reel-caption",
          name: "Reel caption draft (fictional)",
          kind: "content",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          channel: "instagram_reels",
          format: "Short caption",
          message: "Plug it in. The room stops looking temporary.",
          sourceUrl: "https://example.com/fictional-harbor-lamp-reel-caption",
          notes: "FICTIONAL EXAMPLE. No real Instagram account.",
          createdAt: "2026-09-05T00:00:00.000Z",
          updatedAt: "2026-09-05T00:00:00.000Z",
        },
      ],
      reviews: [
        {
          id: "ex-review-hero-unknown",
          assetId: "ex-asset-hero-draft",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          channel: "website_search",
          intendedAudience: "Renters comparing a first lamp purchase",
          desiredOutcome: "Understand the product enough to open the shop path",
          sourceUrl: "https://example.com/fictional-harbor-lamp-hero",
          sourceNote: "Manual read of the fictional draft page.",
          observationDate: "2026-09-04",
          evidenceStatus: "unknown",
          metricName: "",
          metricValue: null,
          finding:
            "The first line names the hour, not the lamp. No search or answer-engine sample was collected, so discovery reach stays unknown — not zero.",
          nextAction: "Write a second sentence that states what the lamp is before any claim about mood.",
          createdAt: "2026-09-04T00:00:00.000Z",
          updatedAt: "2026-09-04T00:00:00.000Z",
        },
        {
          id: "ex-review-reel-reported",
          assetId: "ex-asset-reel-caption",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          channel: "instagram_reels",
          intendedAudience: "Renters scrolling for apartment lighting ideas",
          desiredOutcome: "Pause long enough to read what the lamp is",
          sourceUrl: "https://example.com/fictional-harbor-lamp-reel-caption",
          sourceNote: "Operator read of the fictional caption draft. Not a live post.",
          observationDate: "2026-09-06",
          evidenceStatus: "reported",
          metricName: "",
          metricValue: null,
          finding:
            "The caption assumes the viewer already knows it is a lamp. Pre-publish note only; no reach or watch-time figure exists.",
          nextAction: "Name the object in the first five words, then keep the rented-room line.",
          createdAt: "2026-09-06T00:00:00.000Z",
          updatedAt: "2026-09-06T00:00:00.000Z",
        },
      ],
    };
  }

  function createStore(options) {
    const opts = options || {};
    const storage = opts.storage || browserStorage();
    const clock = opts.now || (() => new Date().toISOString());
    let state = emptyState();
    let loadError = "";

    function persist(next) {
      const payload = JSON.stringify(next);
      try {
        storage.setItem(STORAGE_KEY, payload);
      } catch (err) {
        const message =
          err && err.message
            ? `Could not save in this browser: ${err.message}. Current records were left unchanged.`
            : "Could not save in this browser. Current records were left unchanged.";
        return { ok: false, error: message };
      }
      const written = storage.getItem(STORAGE_KEY);
      if (written !== payload) {
        return {
          ok: false,
          error: "Storage write did not stick. Current records were left unchanged.",
        };
      }
      state = next;
      loadError = "";
      return { ok: true, state: cloneState(state) };
    }

    function load() {
      loadError = "";
      let raw;
      try {
        raw = storage.getItem(STORAGE_KEY);
      } catch (err) {
        loadError = "This browser blocked reading local workspace storage.";
        state = emptyState();
        return { ok: false, error: loadError, state: cloneState(state) };
      }
      if (raw == null || raw === "") {
        state = emptyState();
        return { ok: true, state: cloneState(state) };
      }
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        loadError = "Saved workspace JSON is damaged. Nothing was overwritten; start a new export after fixing storage.";
        state = emptyState();
        return { ok: false, error: loadError, state: cloneState(state) };
      }
      const checked = validateWorkspace(parsed);
      if (!checked.ok) {
        loadError = checked.error;
        state = emptyState();
        return { ok: false, error: checked.error, state: cloneState(state) };
      }
      state = checked.state;
      return { ok: true, state: cloneState(state) };
    }

    function commit(mutator) {
      const draft = cloneState(state);
      const result = mutator(draft);
      if (!result.ok) return result;
      const relationError = validateRelations(result.state);
      if (relationError) return { ok: false, error: relationError };
      const saved = persist(result.state);
      if (!saved.ok) return saved;
      if (result.record) saved.record = result.record;
      return saved;
    }

    function upsert(listName, id, normalize) {
      return commit((draft) => {
        const list = draft[listName];
        const index = id ? list.findIndex((item) => item.id === id) : -1;
        const existing = index >= 0 ? list[index] : null;
        if (id && !existing) return { ok: false, error: `That ${listName.slice(0, -1)} was not found.` };
        const next = normalize(existing, draft);
        if (!next.ok) return next;
        if (existing) list[index] = next.record;
        else list.push(next.record);
        return { ok: true, state: draft, record: next.record };
      });
    }

    return {
      load,
      getState() {
        return cloneState(state);
      },
      getLoadError() {
        return loadError;
      },
      upsertProduct(input) {
        return upsert("products", input.id, (existing) => normalizeProduct(input, existing, clock));
      },
      upsertProject(input) {
        return upsert("projects", input.id, (existing) => normalizeProject(input, existing, clock));
      },
      upsertAsset(input) {
        return upsert("assets", input.id, (existing) => normalizeAsset(input, existing, clock));
      },
      upsertReview(input) {
        return upsert("reviews", input.id, (existing, draft) =>
          normalizeReview(input, existing, clock, indexById(draft.assets), indexById(draft.projects))
        );
      },
      deleteRecord(kind, id) {
        return commit((draft) => {
          if (kind === "product") {
            if (draft.projects.some((item) => item.productId === id)) {
              return { ok: false, error: "Unlink or delete projects that use this product first." };
            }
            if (draft.assets.some((item) => item.productId === id)) {
              return { ok: false, error: "Unlink or delete assets that use this product first." };
            }
            draft.products = draft.products.filter((item) => item.id !== id);
          } else if (kind === "project") {
            if (draft.assets.some((item) => item.projectId === id)) {
              return { ok: false, error: "Unlink or delete assets that use this project first." };
            }
            draft.projects = draft.projects.filter((item) => item.id !== id);
          } else if (kind === "asset") {
            if (draft.reviews.some((item) => item.assetId === id)) {
              return { ok: false, error: "Delete reviews of this asset first." };
            }
            draft.assets = draft.assets.filter((item) => item.id !== id);
          } else if (kind === "review") {
            draft.reviews = draft.reviews.filter((item) => item.id !== id);
          } else {
            return { ok: false, error: "Unknown record type." };
          }
          return { ok: true, state: draft };
        });
      },
      exportJson() {
        const exportedAt = nowIso(clock);
        const exported = cloneState(state);
        exported.kind = KIND;
        exported.schemaVersion = SCHEMA_VERSION;
        exported.exportedAt = exportedAt;
        exported.lastExportedAt = exportedAt;
        exported.privacy =
          "Local browser workspace only. This file may contain whatever you typed; do not commit private studio data.";
        const json = JSON.stringify(exported, null, 2);
        const next = cloneState(state);
        next.lastExportedAt = exportedAt;
        persist(next);
        return json;
      },
      importJson(text) {
        const previous = cloneState(state);
        let parsed;
        try {
          parsed = JSON.parse(String(text ?? ""));
        } catch {
          return { ok: false, error: "That file is not valid JSON. Existing records were left unchanged." };
        }
        const checked = validateWorkspace(parsed);
        if (!checked.ok) {
          return { ok: false, error: `${checked.error} Existing records were left unchanged.` };
        }
        const saved = persist(checked.state);
        if (!saved.ok) {
          state = previous;
          return saved;
        }
        return saved;
      },
      loadFictionalExample() {
        const checked = validateWorkspace(fictionalExample());
        if (!checked.ok) return checked;
        return persist(checked.state);
      },
      clearAll() {
        return persist(emptyState());
      },
      filterRecords(filters) {
        const productId = String(filters?.productId ?? "").trim();
        const projectId = String(filters?.projectId ?? "").trim();
        const projects = state.projects.filter((item) => {
          if (projectId && item.id !== projectId) return false;
          if (productId && item.productId !== productId) return false;
          return true;
        });
        const projectIds = new Set(projects.map((item) => item.id));
        const assets = state.assets.filter((item) => {
          if (projectId && item.projectId !== projectId) return false;
          if (productId) {
            const viaProject = item.projectId && projectIds.has(item.projectId);
            if (item.productId !== productId && !viaProject) return false;
          }
          return true;
        });
        const assetIds = new Set(assets.map((item) => item.id));
        const reviews = state.reviews.filter((item) => {
          if (projectId && item.projectId !== projectId) return false;
          if (productId && item.productId !== productId) return false;
          return assetIds.has(item.assetId) || (!projectId && !productId);
        });
        const products = state.products.filter((item) => {
          if (productId) return item.id === productId;
          if (projectId) {
            const project = state.projects.find((row) => row.id === projectId);
            return project?.productId === item.id;
          }
          return true;
        });
        return { products, projects, assets, reviews };
      },
    };
  }

  return {
    SCHEMA_VERSION,
    KIND,
    STORAGE_KEY,
    CHANNELS,
    CHANNEL_IDS,
    EVIDENCE_STATUSES,
    ASSET_KINDS,
    emptyState,
    escapeHtml,
    sanitizeUrl,
    validateWorkspace,
    summarizeWorkspace,
    memoryStorage,
    fictionalExample,
    channelLabel,
    createStore,
  };
});
