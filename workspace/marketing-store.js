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

  const SCHEMA_VERSION = 3;
  const KIND = "exaryn-studio-marketing-workspace";
  const STORAGE_KEY = "exaryn.studio.marketing.workspace.v1";
  const DUE_SOON_DAYS = 7;

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
  const CAMPAIGN_STAGES = Object.freeze([
    "briefed",
    "drafting",
    "qc",
    "approved",
    "published",
    "learning",
    "killed",
  ]);
  const JOB_STAGES = CAMPAIGN_STAGES;
  const CREATIVE_STATUSES = Object.freeze(["draft", "ready_for_qc", "approved", "killed"]);
  const RECOMMEND_DECISIONS = Object.freeze(["go", "edit", "kill", "unset"]);
  const REVIEW_GATES = Object.freeze(["internal_qc", "approval"]);
  const CLAIM_EVIDENCE = Object.freeze(["supported", "unsupported", "unknown"]);
  const TRI_STATES = Object.freeze(["unknown", "yes", "no"]);
  const LAUNCH_CHECKS = Object.freeze([
    "approvalsPresent",
    "assetApproved",
    "destinationSet",
    "authorizationNoted",
  ]);
  const COLLECTION_KEYS = Object.freeze([
    "clients",
    "products",
    "projects",
    "assets",
    "reviews",
    "briefs",
    "campaigns",
    "publications",
    "observations",
    "learnings",
    "calendarItems",
  ]);
  const ID_RE = /^[a-z0-9][a-z0-9-]{7,63}$/i;
  const SAFE_URL_RE = /^(https?:)\/\//i;

  function emptyState() {
    return {
      kind: KIND,
      schemaVersion: SCHEMA_VERSION,
      lastExportedAt: "",
      fictional: false,
      clients: [],
      products: [],
      projects: [],
      assets: [],
      reviews: [],
      briefs: [],
      campaigns: [],
      publications: [],
      observations: [],
      learnings: [],
      calendarItems: [],
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

  function emptyCampaignStages() {
    return {
      briefed: 0,
      drafting: 0,
      qc: 0,
      approved: 0,
      published: 0,
      learning: 0,
      killed: 0,
    };
  }

  function addCalendarDays(isoDate, days) {
    const dt = new Date(`${isoDate}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  }

  function asLockedFlag(value, fallback) {
    if (value === true || value === "true" || value === "yes" || value === "on") return true;
    if (value === false || value === "false" || value === "no" || value === "off" || value === "") return false;
    return fallback === true;
  }

  function campaignHasObservation(state, campaign) {
    const observations = Array.isArray(state.observations) ? state.observations : [];
    const assets = (Array.isArray(state.assets) ? state.assets : []).filter((item) => item.campaignId === campaign.id);
    const assetIds = new Set(assets.map((item) => item.id));
    const pubs = (Array.isArray(state.publications) ? state.publications : []).filter(
      (item) => item.campaignId === campaign.id || assetIds.has(item.assetId)
    );
    const pubIds = new Set(pubs.map((item) => item.id));
    return observations.some(
      (item) =>
        item.campaignId === campaign.id ||
        (item.publicationId && pubIds.has(item.publicationId)) ||
        (item.assetId && assetIds.has(item.assetId))
    );
  }

  function jacketCard(campaign, extraReasons) {
    return {
      campaignId: campaign.id,
      jobId: campaign.id,
      name: String(campaign.name || "").trim(),
      stage: campaign.stage,
      owner: String(campaign.owner || "").trim(),
      dueDate: String(campaign.dueDate || "").trim(),
      blocker: String(campaign.blocker || "").trim(),
      reasons: extraReasons || [],
    };
  }

  function jacketsNeedingAttention(state, todayIso) {
    const snapshot = state && typeof state === "object" ? state : emptyState();
    const campaigns = Array.isArray(snapshot.campaigns) ? snapshot.campaigns : [];
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(todayIso || ""))
      ? String(todayIso)
      : "1970-01-01";
    const soonEnd = addCalendarDays(today, DUE_SOON_DAYS);
    const buckets = { traffic: [], qc: [], unpublished: [], awaitingObservation: [] };
    for (const campaign of campaigns) {
      if (!campaign || campaign.stage === "killed") continue;
      const due = String(campaign.dueDate || "").trim();
      const reasons = [];
      if (String(campaign.blocker || "").trim()) reasons.push("blocked");
      const openStages =
        campaign.stage === "briefed" ||
        campaign.stage === "drafting" ||
        campaign.stage === "qc" ||
        campaign.stage === "approved";
      if (due && openStages && due <= soonEnd) {
        reasons.push(due < today ? "overdue" : "due_soon");
      }
      if (campaign.stage === "qc") {
        buckets.qc.push(jacketCard(campaign, reasons.concat(["qc"])));
        continue;
      }
      if (campaign.stage === "approved") {
        buckets.unpublished.push(jacketCard(campaign, reasons.concat(["unpublished"])));
        continue;
      }
      if (campaign.stage === "published") {
        if (!campaignHasObservation(snapshot, campaign)) {
          buckets.awaitingObservation.push(jacketCard(campaign, ["awaiting_observation"]));
        }
        continue;
      }
      if (campaign.stage === "learning") continue;
      if (campaign.stage === "briefed" || campaign.stage === "drafting") {
        buckets.traffic.push(jacketCard(campaign, reasons.concat(["traffic"])));
      }
    }
    const byDue = (a, b) => {
      const dueA = a.dueDate || "9999-12-31";
      const dueB = b.dueDate || "9999-12-31";
      if (dueA !== dueB) return dueA.localeCompare(dueB);
      return String(a.name).localeCompare(String(b.name));
    };
    buckets.traffic.sort(byDue);
    buckets.qc.sort(byDue);
    buckets.unpublished.sort(byDue);
    buckets.awaitingObservation.sort(byDue);
    return buckets;
  }

  function jobsNeedingAttention(state, todayIso) {
    const buckets = jacketsNeedingAttention(state, todayIso);
    return [...buckets.traffic, ...buckets.qc, ...buckets.unpublished, ...buckets.awaitingObservation];
  }

  function summarizeWorkspace(state, options) {
    const snapshot = state && typeof state === "object" ? state : emptyState();
    const clients = Array.isArray(snapshot.clients) ? snapshot.clients : [];
    const products = Array.isArray(snapshot.products) ? snapshot.products : [];
    const projects = Array.isArray(snapshot.projects) ? snapshot.projects : [];
    const assets = Array.isArray(snapshot.assets) ? snapshot.assets : [];
    const reviews = Array.isArray(snapshot.reviews) ? snapshot.reviews : [];
    const briefs = Array.isArray(snapshot.briefs) ? snapshot.briefs : [];
    const campaigns = Array.isArray(snapshot.campaigns) ? snapshot.campaigns : [];
    const publications = Array.isArray(snapshot.publications) ? snapshot.publications : [];
    const observations = Array.isArray(snapshot.observations) ? snapshot.observations : [];
    const learnings = Array.isArray(snapshot.learnings) ? snapshot.learnings : [];
    const calendarItems = Array.isArray(snapshot.calendarItems) ? snapshot.calendarItems : [];
    const evidence = { observed: 0, reported: 0, unknown: 0 };
    for (const review of reviews) {
      if (Object.prototype.hasOwnProperty.call(evidence, review.evidenceStatus)) {
        evidence[review.evidenceStatus] += 1;
      }
    }
    const campaignStages = emptyCampaignStages();
    for (const campaign of campaigns) {
      if (Object.prototype.hasOwnProperty.call(campaignStages, campaign.stage)) campaignStages[campaign.stage] += 1;
    }
    const stamps = [];
    for (const collection of [
      clients,
      products,
      projects,
      assets,
      reviews,
      briefs,
      campaigns,
      publications,
      observations,
      learnings,
      calendarItems,
    ]) {
      for (const item of collection) {
        const stamp = optionalIsoStamp(item?.updatedAt) || optionalIsoStamp(item?.createdAt);
        if (stamp) stamps.push(stamp);
      }
    }
    const lastUpdatedAt = stamps.length ? stamps.reduce((latest, stamp) => (stamp > latest ? stamp : latest)) : "";
    const today =
      (options && options.today) ||
      (typeof options?.now === "function" ? String(options.now()).slice(0, 10) : "") ||
      lastUpdatedAt.slice(0, 10) ||
      "";
    const jackets = jacketsNeedingAttention(snapshot, today);
    const attention = jobsNeedingAttention(snapshot, today);
    const upcomingCalendar = calendarItems
      .filter((item) => item.date)
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .filter((item) => !today || item.date >= today)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        date: item.date,
        campaignId: item.campaignId || null,
        channel: item.channel || "",
        notes: item.notes || "",
      }));
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
        gate: review.gate || "internal_qc",
        round: review.round || 1,
        recommendDecision: review.recommendDecision || "unset",
      }));
    const totalRecords =
      clients.length +
      products.length +
      projects.length +
      assets.length +
      reviews.length +
      briefs.length +
      campaigns.length +
      publications.length +
      observations.length +
      learnings.length +
      calendarItems.length;
    return {
      counts: {
        clients: clients.length,
        products: products.length,
        projects: projects.length,
        assets: assets.length,
        reviews: reviews.length,
        briefs: briefs.length,
        campaigns: campaigns.length,
        publications: publications.length,
        observations: observations.length,
        learnings: learnings.length,
        calendarItems: calendarItems.length,
      },
      campaignStages,
      jobStages: campaignStages,
      jackets,
      attention,
      upcomingCalendar,
      evidence,
      lastUpdatedAt,
      lastExportedAt: optionalIsoStamp(snapshot.lastExportedAt),
      fictional: snapshot.fictional === true,
      isEmpty: totalRecords === 0,
      nextActions,
    };
  }

  function channelLabel(id) {
    return CHANNELS.find((c) => c.id === id)?.label || "";
  }

  function stageLabel(id) {
    const labels = {
      briefed: "Briefed",
      drafting: "Drafting",
      qc: "QC",
      approved: "Approved",
      published: "Published",
      learning: "Learning",
      killed: "Killed",
    };
    return labels[id] || "";
  }

  function gateLabel(id) {
    const labels = {
      internal_qc: "Internal QC",
      approval: "Approval",
    };
    return labels[id] || "";
  }

  function checklistLabel(value) {
    if (value === "yes") return "yes";
    if (value === "no") return "no";
    return "unknown";
  }

  function formatClaimsText(claims) {
    return (Array.isArray(claims) ? claims : [])
      .map((claim) => `${claim.text} | ${claim.evidenceStatus || "unknown"}`)
      .join("\n");
  }

  function creativeStatusLabel(id) {
    const labels = {
      draft: "Draft",
      ready_for_qc: "Ready for QC",
      approved: "Approved",
      killed: "Killed",
    };
    return labels[id] || "";
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

  function triState(value, label) {
    if (value === true) return { ok: true, value: "yes" };
    if (value === false) return { ok: true, value: "no" };
    const raw = String(value ?? "").trim().toLowerCase();
    if (!raw) return { ok: true, value: "unknown" };
    if (TRI_STATES.includes(raw)) return { ok: true, value: raw };
    return { ok: false, error: `${label} must be unknown, yes, or no.` };
  }

  function asRound(value) {
    if (value === undefined || value === null || value === "") return { ok: true, value: 1 };
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 99) {
      return { ok: false, error: "Review round must be an integer from 1 to 99." };
    }
    return { ok: true, value: n };
  }

  function normalizeClaims(raw) {
    if (raw == null || raw === "") return { ok: true, value: [] };
    let items = raw;
    if (typeof raw === "string") {
      items = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split("|").map((part) => part.trim());
          const text = parts[0] || "";
          const status = parts[1] || "unknown";
          return { text, evidenceStatus: CLAIM_EVIDENCE.includes(status) ? status : "unknown" };
        });
    }
    if (!Array.isArray(items)) return { ok: false, error: "Claims must be a list." };
    const claims = [];
    for (const item of items) {
      if (typeof item === "string") {
        const text = trimText(item, 240);
        if (text) claims.push({ text, evidenceStatus: "unknown" });
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const text = trimText(item.text, 240);
      if (!text) continue;
      const status = String(item.evidenceStatus ?? "unknown").trim();
      if (!CLAIM_EVIDENCE.includes(status)) {
        return { ok: false, error: "Claim evidence must be supported, unsupported, or unknown." };
      }
      claims.push({ text, evidenceStatus: status });
    }
    return { ok: true, value: claims.slice(0, 12) };
  }

  function launchChecklist(input, existing) {
    const out = {};
    for (const key of LAUNCH_CHECKS) {
      const next = triState(input[key] ?? existing?.[key], key);
      if (!next.ok) return next;
      out[key] = next.value;
    }
    return { ok: true, value: out };
  }

  function normalizeMetricValue(raw, evidenceStatus) {
    if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
    if (evidenceStatus === "unknown") {
      return {
        ok: false,
        error: "A metric value cannot be stored while evidence status is unknown. Leave the metric blank.",
      };
    }
    return parseMetricNumber(raw);
  }

  function parseMetricNumber(raw) {
    if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
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

  function productProjectMatch(entity, products, projects, label) {
    if (entity.productId && !products.has(entity.productId)) {
      return `${label} "${entity.id}" links to unknown product "${entity.productId}".`;
    }
    if (entity.projectId && !projects.has(entity.projectId)) {
      return `${label} "${entity.id}" links to unknown project "${entity.projectId}".`;
    }
    if (entity.productId && entity.projectId) {
      const project = projects.get(entity.projectId);
      if (project.productId && project.productId !== entity.productId) {
        return `${label} "${entity.id}" product does not match its project's product.`;
      }
    }
    return null;
  }

  function validateRelations(state) {
    const clients = indexById(state.clients || []);
    const products = indexById(state.products);
    const projects = indexById(state.projects);
    const assets = indexById(state.assets);
    const briefs = indexById(state.briefs);
    const campaigns = indexById(state.campaigns || []);
    const publications = indexById(state.publications);

    for (const product of state.products) {
      if (product.clientId && !clients.has(product.clientId)) {
        return `Product "${product.id}" links to unknown client "${product.clientId}".`;
      }
    }

    for (const project of state.projects) {
      if (project.productId && !products.has(project.productId)) {
        return `Project "${project.id}" links to unknown product "${project.productId}".`;
      }
    }

    for (const brief of state.briefs) {
      const mismatch = productProjectMatch(brief, products, projects, "Brief");
      if (mismatch) return mismatch;
      if (brief.clientId && !clients.has(brief.clientId)) {
        return `Brief "${brief.id}" links to unknown client "${brief.clientId}".`;
      }
    }

    for (const campaign of state.campaigns || []) {
      const mismatch = productProjectMatch(campaign, products, projects, "Campaign");
      if (mismatch) return mismatch;
      if (campaign.briefId && !briefs.has(campaign.briefId)) {
        return `Campaign "${campaign.id}" links to unknown brief "${campaign.briefId}".`;
      }
      if (campaign.clientId && !clients.has(campaign.clientId)) {
        return `Campaign "${campaign.id}" links to unknown client "${campaign.clientId}".`;
      }
    }

    for (const asset of state.assets) {
      if (!asset.productId && !asset.projectId) {
        return `Asset "${asset.id}" must link to a product or a project.`;
      }
      const mismatch = productProjectMatch(asset, products, projects, "Asset");
      if (mismatch) return mismatch;
      if (asset.campaignId && !campaigns.has(asset.campaignId)) {
        return `Asset "${asset.id}" links to unknown campaign "${asset.campaignId}".`;
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
      if (review.campaignId && !campaigns.has(review.campaignId)) {
        return `Review "${review.id}" links to unknown campaign "${review.campaignId}".`;
      }
    }

    for (const publication of state.publications) {
      if (!publication.assetId) return `Publication "${publication.id}" must attach to an asset.`;
      if (!assets.has(publication.assetId)) {
        return `Publication "${publication.id}" links to unknown asset "${publication.assetId}".`;
      }
      if (publication.campaignId && !campaigns.has(publication.campaignId)) {
        return `Publication "${publication.id}" links to unknown campaign "${publication.campaignId}".`;
      }
    }

    for (const observation of state.observations) {
      if (!observation.publicationId && !observation.assetId) {
        return `Observation "${observation.id}" must link to a publication or an asset.`;
      }
      if (observation.publicationId && !publications.has(observation.publicationId)) {
        return `Observation "${observation.id}" links to unknown publication "${observation.publicationId}".`;
      }
      if (observation.assetId && !assets.has(observation.assetId)) {
        return `Observation "${observation.id}" links to unknown asset "${observation.assetId}".`;
      }
      if (observation.publicationId && observation.assetId) {
        const publication = publications.get(observation.publicationId);
        if (publication.assetId && publication.assetId !== observation.assetId) {
          return `Observation "${observation.id}" asset does not match its publication.`;
        }
      }
      if (observation.campaignId && !campaigns.has(observation.campaignId)) {
        return `Observation "${observation.id}" links to unknown campaign "${observation.campaignId}".`;
      }
    }

    for (const learning of state.learnings) {
      const campaignId = learning.campaignId || learning.jobId;
      if (!campaignId && !learning.publicationId) {
        return `Learning "${learning.id}" must link to a campaign or a publication.`;
      }
      if (campaignId && !campaigns.has(campaignId)) {
        return `Learning "${learning.id}" links to unknown campaign "${campaignId}".`;
      }
      if (learning.publicationId && !publications.has(learning.publicationId)) {
        return `Learning "${learning.id}" links to unknown publication "${learning.publicationId}".`;
      }
    }

    for (const item of state.calendarItems || []) {
      if (item.campaignId && !campaigns.has(item.campaignId)) {
        return `Calendar item "${item.id}" links to unknown campaign "${item.campaignId}".`;
      }
    }
    return null;
  }

  function normalizeClient(input, existing, clock) {
    const name = trimText(input.name, 120);
    if (!name) return { ok: false, error: "Client name is required." };
    const id = resolveId(input.id, existing, "Client id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        name,
        notes: trimMultiline(input.notes, 800),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function normalizeProduct(input, existing, clock) {
    const name = trimText(input.name, 120);
    if (!name) return { ok: false, error: "Product name is required." };
    const client = optionalId(input.clientId, "Client");
    if (!client.ok) return client;
    const id = resolveId(input.id, existing, "Product id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        name,
        clientId: client.id,
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

  function normalizeBrief(input, existing, clock) {
    const wantLocked = asLockedFlag(input.locked, existing?.locked === true);
    if (existing?.locked && wantLocked) {
      return { ok: false, error: "Brief is locked. Unlock it before editing." };
    }
    const name = trimText(input.name, 160);
    if (!name) return { ok: false, error: "Brief name is required." };
    const product = optionalId(input.productId, "Product");
    if (!product.ok) return product;
    const project = optionalId(input.projectId, "Project");
    if (!project.ok) return project;
    const client = optionalId(input.clientId, "Client");
    if (!client.ok) return client;
    const claims = normalizeClaims(input.claims ?? input.claimsText);
    if (!claims.ok) return claims;
    const id = resolveId(input.id, existing, "Brief id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        name,
        clientId: client.id,
        productId: product.id,
        projectId: project.id,
        whereWeAreNow: trimMultiline(input.whereWeAreNow || input.problemOrInsight, 800),
        whereWeWantToBe: trimMultiline(input.whereWeWantToBe, 800),
        targetAudience: trimText(input.targetAudience || input.audience, 240),
        proposition: trimMultiline(input.proposition || input.messageHypothesis, 800),
        reasonsToBelieve: trimMultiline(input.reasonsToBelieve || input.mandatoryClaims, 800),
        tone: trimText(input.tone, 160),
        mandatoriesLegal: trimMultiline(input.mandatoriesLegal || input.outOfScope, 800),
        successDefinition: trimMultiline(input.successDefinition, 800),
        claims: claims.value,
        locked: wantLocked,
        notes: trimMultiline(input.notes, 800),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function normalizeCampaign(input, existing, clock) {
    const name = trimText(input.name, 160);
    if (!name) return { ok: false, error: "Campaign name is required." };
    const stage = String(input.stage ?? existing?.stage ?? "briefed").trim();
    if (!CAMPAIGN_STAGES.includes(stage)) {
      return { ok: false, error: "Campaign stage must be briefed, drafting, qc, approved, published, learning, or killed." };
    }
    const brief = optionalId(input.briefId, "Brief");
    if (!brief.ok) return brief;
    const client = optionalId(input.clientId, "Client");
    if (!client.ok) return client;
    const product = optionalId(input.productId, "Product");
    if (!product.ok) return product;
    const project = optionalId(input.projectId, "Project");
    if (!project.ok) return project;
    const due = isoDate(input.dueDate, "Due date", false);
    if (!due.ok) return due;
    const checks = launchChecklist(input, existing);
    if (!checks.ok) return checks;
    const id = resolveId(input.id, existing, "Campaign id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        name,
        briefId: brief.id,
        clientId: client.id,
        productId: product.id,
        projectId: project.id,
        stage,
        owner: trimText(input.owner, 80),
        dueDate: due.value,
        blocker: trimMultiline(input.blocker, 800),
        notes: trimMultiline(input.notes, 800),
        approvalsPresent: checks.value.approvalsPresent,
        assetApproved: checks.value.assetApproved,
        destinationSet: checks.value.destinationSet,
        authorizationNoted: checks.value.authorizationNoted,
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function normalizeCalendarItem(input, existing, clock) {
    const title = trimText(input.title, 160);
    if (!title) return { ok: false, error: "Calendar title is required." };
    const date = isoDate(input.date, "Calendar date", true);
    if (!date.ok) return date;
    const campaign = optionalId(input.campaignId, "Campaign");
    if (!campaign.ok) return campaign;
    const channel = String(input.channel ?? "").trim();
    if (channel && !CHANNEL_IDS.has(channel)) {
      return { ok: false, error: "Choose a known channel for the calendar item, or leave it blank." };
    }
    const id = resolveId(input.id, existing, "Calendar id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        title,
        date: date.value,
        campaignId: campaign.id,
        channel,
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
    const campaign = optionalId(input.campaignId, "Campaign");
    if (!campaign.ok) return campaign;
    if (!product.id && !project.id) {
      return { ok: false, error: "An asset must link to a product or a project." };
    }
    const channel = String(input.channel ?? "").trim();
    if (!CHANNEL_IDS.has(channel)) {
      return { ok: false, error: "Choose a known channel for the asset." };
    }
    const url = sanitizeUrl(input.sourceUrl);
    if (!url.ok) return url;
    const creativeStatus = String(input.creativeStatus ?? existing?.creativeStatus ?? "draft").trim();
    if (!CREATIVE_STATUSES.includes(creativeStatus)) {
      return { ok: false, error: "Creative status must be draft, ready_for_qc, approved, or killed." };
    }
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
        campaignId: campaign.id,
        channel,
        format: trimText(input.format, 80),
        message: trimMultiline(input.message, 800),
        copyBody: trimMultiline(input.copyBody, 4000),
        versionLabel: trimText(input.versionLabel, 40),
        creativeStatus,
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
    const recommendDecision = String(input.recommendDecision ?? existing?.recommendDecision ?? "unset").trim();
    if (!RECOMMEND_DECISIONS.includes(recommendDecision)) {
      return { ok: false, error: "Recommend decision must be go, edit, kill, or unset." };
    }
    const gate = String(input.gate ?? existing?.gate ?? "internal_qc").trim();
    if (!REVIEW_GATES.includes(gate)) {
      return { ok: false, error: "Review gate must be internal_qc or approval." };
    }
    const round = asRound(input.round ?? existing?.round);
    if (!round.ok) return round;
    const campaign = optionalId(input.campaignId, "Campaign");
    if (!campaign.ok) return campaign;
    const claimTruthOk = triState(input.claimTruthOk, "Claim truth");
    if (!claimTruthOk.ok) return claimTruthOk;
    const channelFitOk = triState(input.channelFitOk, "Channel fit");
    if (!channelFitOk.ok) return channelFitOk;
    const ctaClearOk = triState(input.ctaClearOk, "CTA clarity");
    if (!ctaClearOk.ok) return ctaClearOk;
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
        campaignId: campaign.id || assetRecord?.campaignId || null,
        productId: inheritedProduct,
        projectId: inheritedProject,
        channel,
        gate,
        round: round.value,
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
        recommendDecision,
        claimTruthOk: claimTruthOk.value,
        channelFitOk: channelFitOk.value,
        ctaClearOk: ctaClearOk.value,
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function normalizePublication(input, existing, clock) {
    const asset = asId(input.assetId, "Asset");
    if (!asset.ok) return asset;
    const campaign = optionalId(input.campaignId, "Campaign");
    if (!campaign.ok) return campaign;
    const channel = String(input.channel ?? "").trim();
    if (!CHANNEL_IDS.has(channel)) {
      return { ok: false, error: "Choose a known channel for the publication." };
    }
    const url = sanitizeUrl(input.publicUrl);
    if (!url.ok) return url;
    const publishedAt = isoDate(input.publishedAt, "Published date", false);
    if (!publishedAt.ok) return publishedAt;
    const checks = launchChecklist(input, existing);
    if (!checks.ok) return checks;
    const id = resolveId(input.id, existing, "Publication id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        assetId: asset.id,
        campaignId: campaign.id,
        assetVersion: trimText(input.assetVersion, 40),
        channel,
        accountLabel: trimText(input.accountLabel, 120),
        publicUrl: url.url,
        platformId: trimText(input.platformId, 120),
        publishedAt: publishedAt.value,
        authorizationNote: trimMultiline(input.authorizationNote, 800),
        approvalsPresent: checks.value.approvalsPresent,
        assetApproved: checks.value.assetApproved,
        destinationSet: checks.value.destinationSet,
        authorizationNoted: checks.value.authorizationNoted,
        notes: trimMultiline(input.notes, 800),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function normalizeObservation(input, existing, clock) {
    const publication = optionalId(input.publicationId, "Publication");
    if (!publication.ok) return publication;
    const asset = optionalId(input.assetId, "Asset");
    if (!asset.ok) return asset;
    const campaign = optionalId(input.campaignId, "Campaign");
    if (!campaign.ok) return campaign;
    if (!publication.id && !asset.id) {
      return { ok: false, error: "An observation must link to a publication or an asset." };
    }
    const metricName = trimText(input.metricName, 80);
    const metric = parseMetricNumber(input.metricValue);
    if (!metric.ok) return metric;
    if (metric.value !== null && !metricName) {
      return { ok: false, error: "Name the metric before storing a numeric value." };
    }
    const windowStart = isoDate(input.windowStart, "Window start", false);
    if (!windowStart.ok) return windowStart;
    const windowEnd = isoDate(input.windowEnd, "Window end", false);
    if (!windowEnd.ok) return windowEnd;
    if (windowStart.value && windowEnd.value && windowEnd.value < windowStart.value) {
      return { ok: false, error: "Observation window end cannot be before its start." };
    }
    const capturedAt = optionalIsoStamp(input.capturedAt) || existing?.capturedAt || nowIso(clock);
    const id = resolveId(input.id, existing, "Observation id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        publicationId: publication.id,
        assetId: asset.id,
        campaignId: campaign.id,
        metricName,
        metricValue: metric.value,
        windowStart: windowStart.value,
        windowEnd: windowEnd.value,
        sourceNote: trimMultiline(input.sourceNote, 800),
        limitations: trimMultiline(input.limitations, 800),
        capturedAt,
        notes: trimMultiline(input.notes, 800),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function normalizeLearning(input, existing, clock) {
    const campaign = optionalId(input.campaignId || input.jobId, "Campaign");
    if (!campaign.ok) return campaign;
    const publication = optionalId(input.publicationId, "Publication");
    if (!publication.ok) return publication;
    if (!campaign.id && !publication.id) {
      return { ok: false, error: "A learning must link to a campaign or a publication." };
    }
    const hypothesis = trimMultiline(input.hypothesis, 800);
    if (!hypothesis) return { ok: false, error: "Learning hypothesis is required." };
    const id = resolveId(input.id, existing, "Learning id");
    if (!id.ok) return id;
    return {
      ok: true,
      record: {
        id: id.id,
        campaignId: campaign.id,
        publicationId: publication.id,
        hypothesis,
        evidenceSupports: trimMultiline(input.evidenceSupports, 800),
        cannotShow: trimMultiline(input.cannotShow, 800),
        nextAction: trimMultiline(input.nextAction, 800),
        notes: trimMultiline(input.notes, 800),
        createdAt: existing?.createdAt || nowIso(clock),
        updatedAt: nowIso(clock),
      },
    };
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function migrateV1ToV2(raw) {
    const next = {
      kind: KIND,
      schemaVersion: 2,
      lastExportedAt: raw.lastExportedAt || "",
      fictional: raw.fictional === true,
      products: Array.isArray(raw.products) ? raw.products : [],
      projects: Array.isArray(raw.projects) ? raw.projects : [],
      assets: (Array.isArray(raw.assets) ? raw.assets : []).map((asset) => ({
        ...asset,
        versionLabel: asset.versionLabel ?? "",
        copyBody: asset.copyBody ?? "",
        creativeStatus: CREATIVE_STATUSES.includes(asset.creativeStatus) ? asset.creativeStatus : "draft",
      })),
      reviews: (Array.isArray(raw.reviews) ? raw.reviews : []).map((review) => ({
        ...review,
        recommendDecision: RECOMMEND_DECISIONS.includes(review.recommendDecision)
          ? review.recommendDecision
          : "unset",
        claimTruthOk: TRI_STATES.includes(review.claimTruthOk) ? review.claimTruthOk : "unknown",
        channelFitOk: TRI_STATES.includes(review.channelFitOk) ? review.channelFitOk : "unknown",
        ctaClearOk: TRI_STATES.includes(review.ctaClearOk) ? review.ctaClearOk : "unknown",
      })),
      briefs: Array.isArray(raw.briefs) ? raw.briefs : [],
      jobs: Array.isArray(raw.jobs) ? raw.jobs : [],
      publications: Array.isArray(raw.publications) ? raw.publications : [],
      observations: Array.isArray(raw.observations) ? raw.observations : [],
      learnings: Array.isArray(raw.learnings) ? raw.learnings : [],
    };
    if (raw.exportedAt) next.exportedAt = raw.exportedAt;
    if (raw.label) next.label = raw.label;
    if (raw.privacy) next.privacy = raw.privacy;
    return next;
  }

  function migrateJobToCampaign(job) {
    return {
      ...job,
      clientId: job.clientId || null,
      approvalsPresent: TRI_STATES.includes(job.approvalsPresent) ? job.approvalsPresent : "unknown",
      assetApproved: TRI_STATES.includes(job.assetApproved) ? job.assetApproved : "unknown",
      destinationSet: TRI_STATES.includes(job.destinationSet) ? job.destinationSet : "unknown",
      authorizationNoted: TRI_STATES.includes(job.authorizationNoted) ? job.authorizationNoted : "unknown",
    };
  }

  function migrateV2ToV3(raw) {
    const jobs = Array.isArray(raw.jobs) ? raw.jobs : [];
    const campaigns = Array.isArray(raw.campaigns) && raw.campaigns.length
      ? raw.campaigns
      : jobs.map(migrateJobToCampaign);
    return {
      kind: KIND,
      schemaVersion: SCHEMA_VERSION,
      lastExportedAt: raw.lastExportedAt || "",
      fictional: raw.fictional === true,
      clients: Array.isArray(raw.clients) ? raw.clients : [],
      products: (Array.isArray(raw.products) ? raw.products : []).map((item) => ({
        ...item,
        clientId: item.clientId || null,
      })),
      projects: Array.isArray(raw.projects) ? raw.projects : [],
      assets: (Array.isArray(raw.assets) ? raw.assets : []).map((asset) => ({
        ...asset,
        campaignId: asset.campaignId || asset.jobId || null,
        versionLabel: asset.versionLabel ?? "",
        copyBody: asset.copyBody ?? "",
        creativeStatus: CREATIVE_STATUSES.includes(asset.creativeStatus) ? asset.creativeStatus : "draft",
      })),
      reviews: (Array.isArray(raw.reviews) ? raw.reviews : []).map((review) => ({
        ...review,
        campaignId: review.campaignId || review.jobId || null,
        gate: REVIEW_GATES.includes(review.gate) ? review.gate : "internal_qc",
        round: Number.isInteger(review.round) && review.round >= 1 ? review.round : 1,
        recommendDecision: RECOMMEND_DECISIONS.includes(review.recommendDecision)
          ? review.recommendDecision
          : "unset",
        claimTruthOk: TRI_STATES.includes(review.claimTruthOk) ? review.claimTruthOk : "unknown",
        channelFitOk: TRI_STATES.includes(review.channelFitOk) ? review.channelFitOk : "unknown",
        ctaClearOk: TRI_STATES.includes(review.ctaClearOk) ? review.ctaClearOk : "unknown",
      })),
      briefs: (Array.isArray(raw.briefs) ? raw.briefs : []).map((brief) => ({
        ...brief,
        clientId: brief.clientId || null,
        targetAudience: brief.targetAudience || brief.audience || "",
        whereWeAreNow: brief.whereWeAreNow || brief.problemOrInsight || "",
        whereWeWantToBe: brief.whereWeWantToBe || "",
        proposition: brief.proposition || brief.messageHypothesis || "",
        reasonsToBelieve: brief.reasonsToBelieve || brief.mandatoryClaims || "",
        tone: brief.tone || "",
        mandatoriesLegal: brief.mandatoriesLegal || brief.outOfScope || "",
        locked: brief.locked === true,
        claims: Array.isArray(brief.claims) ? brief.claims : [],
      })),
      campaigns,
      publications: (Array.isArray(raw.publications) ? raw.publications : []).map((item) => ({
        ...item,
        campaignId: item.campaignId || item.jobId || null,
        approvalsPresent: TRI_STATES.includes(item.approvalsPresent) ? item.approvalsPresent : "unknown",
        assetApproved: TRI_STATES.includes(item.assetApproved) ? item.assetApproved : "unknown",
        destinationSet: TRI_STATES.includes(item.destinationSet) ? item.destinationSet : "unknown",
        authorizationNoted: TRI_STATES.includes(item.authorizationNoted) ? item.authorizationNoted : "unknown",
      })),
      observations: (Array.isArray(raw.observations) ? raw.observations : []).map((item) => ({
        ...item,
        campaignId: item.campaignId || item.jobId || null,
      })),
      learnings: (Array.isArray(raw.learnings) ? raw.learnings : []).map((item) => ({
        ...item,
        campaignId: item.campaignId || item.jobId || null,
      })),
      calendarItems: Array.isArray(raw.calendarItems) ? raw.calendarItems : [],
      exportedAt: raw.exportedAt,
      label: raw.label,
      privacy: raw.privacy,
    };
  }

  function prepareIncoming(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "Import must be a JSON object." };
    }
    if (raw.kind != null && raw.kind !== KIND) {
      return { ok: false, error: "File is not an ExarynStudio marketing workspace export." };
    }
    if (raw.schemaVersion === 1) return { ok: true, raw: migrateV2ToV3(migrateV1ToV2(raw)), migratedFrom: 1 };
    if (raw.schemaVersion === 2) return { ok: true, raw: migrateV2ToV3(raw), migratedFrom: 2 };
    if (raw.schemaVersion === SCHEMA_VERSION) {
      const copy = { ...raw };
      for (const key of COLLECTION_KEYS) {
        if (!Array.isArray(copy[key])) copy[key] = [];
      }
      copy.schemaVersion = SCHEMA_VERSION;
      return { ok: true, raw: copy, migratedFrom: null };
    }
    return {
      ok: false,
      error: `Unsupported schema version. This workspace reads version ${SCHEMA_VERSION} and migrates versions 1 and 2.`,
    };
  }

  function validateWorkspace(raw) {
    const prepared = prepareIncoming(raw);
    if (!prepared.ok) return prepared;
    const incoming = prepared.raw;
    for (const key of COLLECTION_KEYS) {
      if (!Array.isArray(incoming[key])) {
        return { ok: false, error: `Import is missing a ${key} array.` };
      }
    }
    const dupe =
      uniqueById(incoming.clients, "client") ||
      uniqueById(incoming.products, "product") ||
      uniqueById(incoming.projects, "project") ||
      uniqueById(incoming.assets, "asset") ||
      uniqueById(incoming.reviews, "review") ||
      uniqueById(incoming.briefs, "brief") ||
      uniqueById(incoming.campaigns, "campaign") ||
      uniqueById(incoming.publications, "publication") ||
      uniqueById(incoming.observations, "observation") ||
      uniqueById(incoming.learnings, "learning") ||
      uniqueById(incoming.calendarItems, "calendar item");
    if (dupe) return { ok: false, error: dupe };

    const state = emptyState();
    const clock = () => "1970-01-01T00:00:00.000Z";

    const push = (listName, item, next) => {
      if (item.createdAt) next.record.createdAt = String(item.createdAt);
      if (item.updatedAt) next.record.updatedAt = String(item.updatedAt);
      next.record.id = String(item.id);
      state[listName].push(next.record);
    };

    for (const item of incoming.clients) {
      const next = normalizeClient(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      push("clients", item, next);
    }
    for (const item of incoming.products) {
      const next = normalizeProduct(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      push("products", item, next);
    }
    for (const item of incoming.projects) {
      const next = normalizeProject(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      push("projects", item, next);
    }
    for (const item of incoming.briefs) {
      const next = normalizeBrief(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      push("briefs", item, next);
    }
    for (const item of incoming.campaigns) {
      const next = normalizeCampaign(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      push("campaigns", item, next);
    }
    for (const item of incoming.assets) {
      const next = normalizeAsset(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      push("assets", item, next);
    }
    const assets = indexById(state.assets);
    const projects = indexById(state.projects);
    for (const item of incoming.reviews) {
      const next = normalizeReview(
        item,
        item.id ? { id: String(item.id), createdAt: item.createdAt } : null,
        clock,
        assets,
        projects
      );
      if (!next.ok) return next;
      push("reviews", item, next);
    }
    for (const item of incoming.publications) {
      const next = normalizePublication(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      push("publications", item, next);
    }
    for (const item of incoming.observations) {
      const next = normalizeObservation(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      if (item.capturedAt && optionalIsoStamp(item.capturedAt)) next.record.capturedAt = optionalIsoStamp(item.capturedAt);
      push("observations", item, next);
    }
    for (const item of incoming.learnings) {
      const next = normalizeLearning(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      push("learnings", item, next);
    }
    for (const item of incoming.calendarItems) {
      const next = normalizeCalendarItem(item, item.id ? { id: String(item.id), createdAt: item.createdAt } : null, clock);
      if (!next.ok) return next;
      push("calendarItems", item, next);
    }

    const relationError = validateRelations(state);
    if (relationError) return { ok: false, error: relationError };
    state.lastExportedAt =
      optionalIsoStamp(incoming.lastExportedAt) || optionalIsoStamp(incoming.exportedAt);
    state.fictional = incoming.fictional === true;
    return { ok: true, state, migratedFrom: prepared.migratedFrom };
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
      clients: [
        {
          id: "ex-client-exaryn-studio",
          name: "Exaryn Studio (fictional hobby client)",
          notes: "FICTIONAL. Default hobby client for this desk — not a live account.",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      products: [
        {
          id: "ex-product-harbor-lamp",
          name: "Harbor Lamp Co. (fictional)",
          clientId: "ex-client-exaryn-studio",
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
      briefs: [
        {
          id: "ex-brief-spring-landing",
          name: "Spring landing brief (fictional)",
          clientId: "ex-client-exaryn-studio",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          whereWeAreNow: "Harsh overhead lighting makes a rented room feel unfinished.",
          whereWeWantToBe: "A reader can say what the object is after two sentences, without a traffic KPI.",
          targetAudience: "Apartment renters who want warmer evening light",
          proposition: "Name the hour after work, then name the lamp, before any mood claim.",
          reasonsToBelieve: "Portable. For rented rooms. No false performance numbers.",
          tone: "Quiet, concrete, rented-room honest.",
          mandatoriesLegal: "No paid social, live ads, influencer seeding, or invented traffic KPIs.",
          successDefinition: "A reader can say what the object is after the first two sentences. No traffic KPI is claimed.",
          claims: [
            { text: "Harbor Lamp is a portable light for a rented room.", evidenceStatus: "unknown" },
            { text: "The v2 hero names the object in sentence two.", evidenceStatus: "supported" },
          ],
          locked: true,
          notes: "FICTIONAL. Locked after the landing jacket shipped to learning.",
          createdAt: "2026-09-02T12:00:00.000Z",
          updatedAt: "2026-09-08T00:00:00.000Z",
        },
      ],
      campaigns: [
        {
          id: "ex-campaign-landing-hero",
          name: "Landing hero jacket (fictional)",
          briefId: "ex-brief-spring-landing",
          clientId: "ex-client-exaryn-studio",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          stage: "learning",
          owner: "Example traffic",
          dueDate: "2026-09-08",
          blocker: "",
          notes: "Jacket walk: locked Brief → Campaign → Asset v2 → internal QC Go → approval Go → Publication → Observation (unknown) → Learning.",
          approvalsPresent: "yes",
          assetApproved: "yes",
          destinationSet: "yes",
          authorizationNoted: "yes",
          createdAt: "2026-09-02T15:00:00.000Z",
          updatedAt: "2026-09-14T00:00:00.000Z",
        },
        {
          id: "ex-campaign-reel-caption",
          name: "Reel caption jacket (fictional)",
          briefId: "ex-brief-spring-landing",
          clientId: "ex-client-exaryn-studio",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          stage: "qc",
          owner: "Example reviewer",
          dueDate: "2026-09-24",
          blocker: "Waiting on a first-line object name before any publish attempt.",
          notes: "FICTIONAL. Internal QC gate. Not published.",
          approvalsPresent: "unknown",
          assetApproved: "unknown",
          destinationSet: "unknown",
          authorizationNoted: "unknown",
          createdAt: "2026-09-05T00:00:00.000Z",
          updatedAt: "2026-09-06T00:00:00.000Z",
        },
        {
          id: "ex-campaign-shop-path",
          name: "Shop path jacket (fictional)",
          briefId: "ex-brief-spring-landing",
          clientId: "ex-client-exaryn-studio",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          stage: "approved",
          owner: "Example traffic",
          dueDate: "2026-09-22",
          blocker: "",
          notes: "FICTIONAL. Approved, unpublished. No publication record yet.",
          approvalsPresent: "yes",
          assetApproved: "unknown",
          destinationSet: "unknown",
          authorizationNoted: "unknown",
          createdAt: "2026-09-10T00:00:00.000Z",
          updatedAt: "2026-09-12T00:00:00.000Z",
        },
        {
          id: "ex-campaign-evening-still",
          name: "Evening still jacket (fictional)",
          briefId: "ex-brief-spring-landing",
          clientId: "ex-client-exaryn-studio",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          stage: "published",
          owner: "Example traffic",
          dueDate: "2026-09-16",
          blocker: "",
          notes: "FICTIONAL. Published placeholder; no observation captured yet. Metric stays unknown.",
          approvalsPresent: "yes",
          assetApproved: "yes",
          destinationSet: "yes",
          authorizationNoted: "yes",
          createdAt: "2026-09-12T00:00:00.000Z",
          updatedAt: "2026-09-16T00:00:00.000Z",
        },
        {
          id: "ex-campaign-window-copy",
          name: "Window copy jacket (fictional)",
          briefId: "ex-brief-spring-landing",
          clientId: "ex-client-exaryn-studio",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          stage: "drafting",
          owner: "Example traffic",
          dueDate: "2026-09-28",
          blocker: "",
          notes: "FICTIONAL. Traffic is still writing. No QC yet.",
          approvalsPresent: "unknown",
          assetApproved: "unknown",
          destinationSet: "unknown",
          authorizationNoted: "unknown",
          createdAt: "2026-09-18T00:00:00.000Z",
          updatedAt: "2026-09-18T00:00:00.000Z",
        },
      ],
      assets: [
        {
          id: "ex-asset-hero-draft",
          name: "Homepage hero draft (fictional)",
          kind: "content",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          campaignId: "ex-campaign-landing-hero",
          channel: "website_search",
          format: "Landing page copy",
          message: "A lamp for the hour after work.",
          copyBody:
            "A lamp for the hour after work. Harbor Lamp is a portable light for a rented room that still looks temporary after dark.",
          versionLabel: "v2",
          creativeStatus: "approved",
          sourceUrl: "https://example.com/fictional-harbor-lamp-hero",
          notes: "FICTIONAL EXAMPLE. URL is an example.com placeholder. Approved via explicit asset save, not auto-publish.",
          createdAt: "2026-09-03T00:00:00.000Z",
          updatedAt: "2026-09-07T00:00:00.000Z",
        },
        {
          id: "ex-asset-reel-caption",
          name: "Reel caption draft (fictional)",
          kind: "content",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          campaignId: "ex-campaign-reel-caption",
          channel: "instagram_reels",
          format: "Short caption",
          message: "Plug it in. The room stops looking temporary.",
          copyBody: "Plug it in. The room stops looking temporary.",
          versionLabel: "v1",
          creativeStatus: "ready_for_qc",
          sourceUrl: "https://example.com/fictional-harbor-lamp-reel-caption",
          notes: "FICTIONAL EXAMPLE. No real Instagram account.",
          createdAt: "2026-09-05T00:00:00.000Z",
          updatedAt: "2026-09-05T00:00:00.000Z",
        },
        {
          id: "ex-asset-shop-path",
          name: "Shop path line (fictional)",
          kind: "content",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          campaignId: "ex-campaign-shop-path",
          channel: "website_search",
          format: "Inline CTA",
          message: "Open the shop path after the object is named.",
          copyBody: "Harbor Lamp is a portable light. Open the shop path when you want the hour after work to look finished.",
          versionLabel: "v1",
          creativeStatus: "approved",
          sourceUrl: "https://example.com/fictional-harbor-lamp-shop-path",
          notes: "FICTIONAL. Approved, unpublished. Destination not recorded as set.",
          createdAt: "2026-09-11T00:00:00.000Z",
          updatedAt: "2026-09-12T00:00:00.000Z",
        },
        {
          id: "ex-asset-evening-still",
          name: "Evening still caption (fictional)",
          kind: "content",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          campaignId: "ex-campaign-evening-still",
          channel: "other",
          format: "Still caption",
          message: "The hour after work, named.",
          copyBody: "Harbor Lamp is a portable light for the hour after work.",
          versionLabel: "v1",
          creativeStatus: "approved",
          sourceUrl: "https://example.com/fictional-harbor-lamp-evening-still",
          notes: "FICTIONAL. Published placeholder. No observation yet.",
          createdAt: "2026-09-14T00:00:00.000Z",
          updatedAt: "2026-09-16T00:00:00.000Z",
        },
      ],
      reviews: [
        {
          id: "ex-review-hero-unknown",
          assetId: "ex-asset-hero-draft",
          campaignId: "ex-campaign-landing-hero",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          channel: "website_search",
          gate: "internal_qc",
          round: 1,
          intendedAudience: "Renters comparing a first lamp purchase",
          desiredOutcome: "Understand the product enough to open the shop path",
          sourceUrl: "https://example.com/fictional-harbor-lamp-hero",
          sourceNote: "Manual read of the fictional draft page.",
          observationDate: "2026-09-04",
          evidenceStatus: "unknown",
          metricName: "",
          metricValue: null,
          finding:
            "The first line names the hour, then v2 names the lamp. No search or answer-engine sample was collected, so discovery reach stays unknown — not zero.",
          nextAction: "Keep the object-name sentence. Do not treat unknown reach as a KPI.",
          recommendDecision: "go",
          claimTruthOk: "yes",
          channelFitOk: "yes",
          ctaClearOk: "unknown",
          createdAt: "2026-09-04T00:00:00.000Z",
          updatedAt: "2026-09-07T00:00:00.000Z",
        },
        {
          id: "ex-review-hero-approval",
          assetId: "ex-asset-hero-draft",
          campaignId: "ex-campaign-landing-hero",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          channel: "website_search",
          gate: "approval",
          round: 1,
          intendedAudience: "Renters comparing a first lamp purchase",
          desiredOutcome: "Studio Go to record a publication identity, not a live ads push.",
          sourceUrl: "https://example.com/fictional-harbor-lamp-hero",
          sourceNote: "Fictional studio Go. Not a client portal.",
          observationDate: "2026-09-07",
          evidenceStatus: "unknown",
          metricName: "",
          metricValue: null,
          finding: "Studio Go for the locked brief's object-name sentence. No traffic KPI is claimed.",
          nextAction: "Record publication identity by hand. Do not invent sessions.",
          recommendDecision: "go",
          claimTruthOk: "yes",
          channelFitOk: "yes",
          ctaClearOk: "unknown",
          createdAt: "2026-09-07T12:00:00.000Z",
          updatedAt: "2026-09-07T12:00:00.000Z",
        },
        {
          id: "ex-review-reel-reported",
          assetId: "ex-asset-reel-caption",
          campaignId: "ex-campaign-reel-caption",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          channel: "instagram_reels",
          gate: "internal_qc",
          round: 1,
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
          recommendDecision: "edit",
          claimTruthOk: "unknown",
          channelFitOk: "unknown",
          ctaClearOk: "no",
          createdAt: "2026-09-06T00:00:00.000Z",
          updatedAt: "2026-09-06T00:00:00.000Z",
        },
        {
          id: "ex-review-shop-approval",
          assetId: "ex-asset-shop-path",
          campaignId: "ex-campaign-shop-path",
          productId: "ex-product-harbor-lamp",
          projectId: "ex-project-spring-landing",
          channel: "website_search",
          gate: "approval",
          round: 1,
          intendedAudience: "Readers who already know it is a lamp",
          desiredOutcome: "Open the shop path without a traffic claim",
          sourceUrl: "https://example.com/fictional-harbor-lamp-shop-path",
          sourceNote: "Fictional studio Go. Destination still unmarked.",
          observationDate: "2026-09-12",
          evidenceStatus: "unknown",
          metricName: "",
          metricValue: null,
          finding: "Copy is approved. Launch checklist still has destination unknown — do not invent a URL.",
          nextAction: "Set destination on the jacket only after a real path exists.",
          recommendDecision: "go",
          claimTruthOk: "yes",
          channelFitOk: "unknown",
          ctaClearOk: "yes",
          createdAt: "2026-09-12T00:00:00.000Z",
          updatedAt: "2026-09-12T00:00:00.000Z",
        },
      ],
      publications: [
        {
          id: "ex-pub-hero",
          assetId: "ex-asset-hero-draft",
          campaignId: "ex-campaign-landing-hero",
          assetVersion: "v2",
          channel: "website_search",
          accountLabel: "Fictional example.com draft host",
          publicUrl: "https://example.com/fictional-harbor-lamp-hero",
          platformId: "",
          publishedAt: "2026-09-08",
          authorizationNote: "Manual placeholder only. No live CMS or ads API publish.",
          approvalsPresent: "yes",
          assetApproved: "yes",
          destinationSet: "yes",
          authorizationNoted: "yes",
          notes: "FICTIONAL. Not a real site.",
          createdAt: "2026-09-08T00:00:00.000Z",
          updatedAt: "2026-09-08T00:00:00.000Z",
        },
        {
          id: "ex-pub-evening-still",
          assetId: "ex-asset-evening-still",
          campaignId: "ex-campaign-evening-still",
          assetVersion: "v1",
          channel: "other",
          accountLabel: "Fictional still placement",
          publicUrl: "https://example.com/fictional-harbor-lamp-evening-still",
          platformId: "",
          publishedAt: "2026-09-16",
          authorizationNote: "Manual placeholder. No live platform.",
          approvalsPresent: "yes",
          assetApproved: "yes",
          destinationSet: "yes",
          authorizationNoted: "yes",
          notes: "FICTIONAL. Published, awaiting an observation. Metric stays unknown.",
          createdAt: "2026-09-16T00:00:00.000Z",
          updatedAt: "2026-09-16T00:00:00.000Z",
        },
      ],
      observations: [
        {
          id: "ex-obs-hero",
          publicationId: "ex-pub-hero",
          assetId: "ex-asset-hero-draft",
          campaignId: "ex-campaign-landing-hero",
          metricName: "landing_sessions",
          metricValue: null,
          windowStart: "2026-09-08",
          windowEnd: "2026-09-14",
          sourceNote: "No analytics adapter. Sessions stay unknown.",
          limitations: "This desk cannot read Search Console or a live host. Unknown is not zero.",
          capturedAt: "2026-09-14T00:00:00.000Z",
          notes: "FICTIONAL observation. No invented KPI.",
          createdAt: "2026-09-14T00:00:00.000Z",
          updatedAt: "2026-09-14T00:00:00.000Z",
        },
      ],
      learnings: [
        {
          id: "ex-learn-hero",
          campaignId: "ex-campaign-landing-hero",
          publicationId: "ex-pub-hero",
          hypothesis: "Naming the object in sentence two makes the hero understandable without a mood claim.",
          evidenceSupports: "Internal QC could check claim wording. Publication identity was recorded by hand.",
          cannotShow: "Discovery reach, sessions, and conversion stay unknown — no adapter, no invented KPI.",
          nextAction: "Keep the object-name sentence. Do not treat unknown sessions as zero.",
          notes: "FICTIONAL debrief for the landing-hero jacket.",
          createdAt: "2026-09-14T12:00:00.000Z",
          updatedAt: "2026-09-14T12:00:00.000Z",
        },
      ],
      calendarItems: [
        {
          id: "ex-cal-hero-slot",
          title: "Hero flight (fictional)",
          date: "2026-09-08",
          campaignId: "ex-campaign-landing-hero",
          channel: "website_search",
          notes: "Editorial slot for the landing jacket. Not a media buy.",
          createdAt: "2026-09-07T00:00:00.000Z",
          updatedAt: "2026-09-07T00:00:00.000Z",
        },
        {
          id: "ex-cal-evening-slot",
          title: "Evening still slot (fictional)",
          date: "2026-09-16",
          campaignId: "ex-campaign-evening-still",
          channel: "other",
          notes: "Published placeholder date. Observation not captured.",
          createdAt: "2026-09-15T00:00:00.000Z",
          updatedAt: "2026-09-15T00:00:00.000Z",
        },
        {
          id: "ex-cal-reel-hold",
          title: "Reel hold (fictional)",
          date: "2026-09-26",
          campaignId: "ex-campaign-reel-caption",
          channel: "instagram_reels",
          notes: "Held until internal QC names the object. Not a live schedule.",
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
      if (checked.migratedFrom === 1 || checked.migratedFrom === 2) {
        persist(state);
      }
      return { ok: true, state: cloneState(state), migratedFrom: checked.migratedFrom };
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
      upsertClient(input) {
        return upsert("clients", input.id, (existing) => normalizeClient(input, existing, clock));
      },
      upsertBrief(input) {
        return upsert("briefs", input.id, (existing) => normalizeBrief(input, existing, clock));
      },
      upsertCampaign(input) {
        return upsert("campaigns", input.id, (existing) => normalizeCampaign(input, existing, clock));
      },
      upsertJob(input) {
        return upsert("campaigns", input.id, (existing) => normalizeCampaign(input, existing, clock));
      },
      upsertCalendarItem(input) {
        return upsert("calendarItems", input.id, (existing) => normalizeCalendarItem(input, existing, clock));
      },
      upsertAsset(input) {
        return upsert("assets", input.id, (existing) => normalizeAsset(input, existing, clock));
      },
      upsertReview(input) {
        return upsert("reviews", input.id, (existing, draft) =>
          normalizeReview(input, existing, clock, indexById(draft.assets), indexById(draft.projects))
        );
      },
      upsertPublication(input) {
        return upsert("publications", input.id, (existing) => normalizePublication(input, existing, clock));
      },
      upsertObservation(input) {
        return upsert("observations", input.id, (existing) => normalizeObservation(input, existing, clock));
      },
      upsertLearning(input) {
        return upsert("learnings", input.id, (existing) => normalizeLearning(input, existing, clock));
      },
      deleteRecord(kind, id) {
        return commit((draft) => {
          if (kind === "client") {
            if (draft.products.some((item) => item.clientId === id)) {
              return { ok: false, error: "Unlink or delete products that use this client first." };
            }
            if (draft.briefs.some((item) => item.clientId === id)) {
              return { ok: false, error: "Unlink or delete briefs that use this client first." };
            }
            if (draft.campaigns.some((item) => item.clientId === id)) {
              return { ok: false, error: "Unlink or delete campaigns that use this client first." };
            }
            draft.clients = draft.clients.filter((item) => item.id !== id);
          } else if (kind === "product") {
            if (draft.projects.some((item) => item.productId === id)) {
              return { ok: false, error: "Unlink or delete projects that use this product first." };
            }
            if (draft.assets.some((item) => item.productId === id)) {
              return { ok: false, error: "Unlink or delete assets that use this product first." };
            }
            if (draft.briefs.some((item) => item.productId === id)) {
              return { ok: false, error: "Unlink or delete briefs that use this product first." };
            }
            if (draft.campaigns.some((item) => item.productId === id)) {
              return { ok: false, error: "Unlink or delete campaigns that use this product first." };
            }
            draft.products = draft.products.filter((item) => item.id !== id);
          } else if (kind === "project") {
            if (draft.assets.some((item) => item.projectId === id)) {
              return { ok: false, error: "Unlink or delete assets that use this project first." };
            }
            if (draft.briefs.some((item) => item.projectId === id)) {
              return { ok: false, error: "Unlink or delete briefs that use this project first." };
            }
            if (draft.campaigns.some((item) => item.projectId === id)) {
              return { ok: false, error: "Unlink or delete campaigns that use this project first." };
            }
            draft.projects = draft.projects.filter((item) => item.id !== id);
          } else if (kind === "brief") {
            if (draft.campaigns.some((item) => item.briefId === id)) {
              return { ok: false, error: "Unlink or delete campaigns that use this brief first." };
            }
            draft.briefs = draft.briefs.filter((item) => item.id !== id);
          } else if (kind === "campaign" || kind === "job") {
            if (draft.assets.some((item) => item.campaignId === id)) {
              return { ok: false, error: "Unlink or delete assets that use this campaign first." };
            }
            if (draft.reviews.some((item) => item.campaignId === id)) {
              return { ok: false, error: "Unlink or delete reviews that use this campaign first." };
            }
            if (draft.publications.some((item) => item.campaignId === id)) {
              return { ok: false, error: "Unlink or delete publications that use this campaign first." };
            }
            if (draft.observations.some((item) => item.campaignId === id)) {
              return { ok: false, error: "Unlink or delete observations that use this campaign first." };
            }
            if (draft.learnings.some((item) => item.campaignId === id || item.jobId === id)) {
              return { ok: false, error: "Delete learnings that use this campaign first." };
            }
            if (draft.calendarItems.some((item) => item.campaignId === id)) {
              return { ok: false, error: "Delete calendar items that use this campaign first." };
            }
            draft.campaigns = draft.campaigns.filter((item) => item.id !== id);
          } else if (kind === "calendarItem") {
            draft.calendarItems = draft.calendarItems.filter((item) => item.id !== id);
          } else if (kind === "asset") {
            if (draft.reviews.some((item) => item.assetId === id)) {
              return { ok: false, error: "Delete reviews of this asset first." };
            }
            if (draft.publications.some((item) => item.assetId === id)) {
              return { ok: false, error: "Delete publications of this asset first." };
            }
            if (draft.observations.some((item) => item.assetId === id)) {
              return { ok: false, error: "Delete observations of this asset first." };
            }
            draft.assets = draft.assets.filter((item) => item.id !== id);
          } else if (kind === "review") {
            draft.reviews = draft.reviews.filter((item) => item.id !== id);
          } else if (kind === "publication") {
            if (draft.observations.some((item) => item.publicationId === id)) {
              return { ok: false, error: "Delete observations of this publication first." };
            }
            if (draft.learnings.some((item) => item.publicationId === id)) {
              return { ok: false, error: "Delete learnings that use this publication first." };
            }
            draft.publications = draft.publications.filter((item) => item.id !== id);
          } else if (kind === "observation") {
            draft.observations = draft.observations.filter((item) => item.id !== id);
          } else if (kind === "learning") {
            draft.learnings = draft.learnings.filter((item) => item.id !== id);
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
        saved.migratedFrom = checked.migratedFrom;
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
        const briefs = state.briefs.filter((item) => {
          if (projectId && item.projectId !== projectId) return false;
          if (productId && item.productId !== productId) return false;
          return true;
        });
        const campaigns = state.campaigns.filter((item) => {
          if (projectId && item.projectId !== projectId) return false;
          if (productId && item.productId !== productId) return false;
          return true;
        });
        const campaignIds = new Set(campaigns.map((item) => item.id));
        const publications = state.publications.filter((item) => assetIds.has(item.assetId) || (!projectId && !productId));
        const publicationIds = new Set(publications.map((item) => item.id));
        const observations = state.observations.filter((item) => {
          if (item.publicationId && publicationIds.has(item.publicationId)) return true;
          if (item.assetId && assetIds.has(item.assetId)) return true;
          return !projectId && !productId;
        });
        const learnings = state.learnings.filter((item) => {
          if (item.campaignId && campaignIds.has(item.campaignId)) return true;
          if (item.jobId && campaignIds.has(item.jobId)) return true;
          if (item.publicationId && publicationIds.has(item.publicationId)) return true;
          return !projectId && !productId;
        });
        const calendarItems = state.calendarItems.filter((item) => {
          if (!productId && !projectId) return true;
          return item.campaignId && campaignIds.has(item.campaignId);
        });
        const clients = state.clients.filter((item) => {
          if (!productId && !projectId) return true;
          return products.some((product) => product.clientId === item.id);
        });
        return {
          clients,
          products,
          projects,
          assets,
          reviews,
          briefs,
          campaigns,
          jobs: campaigns,
          publications,
          observations,
          learnings,
          calendarItems,
        };
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
    CAMPAIGN_STAGES,
    JOB_STAGES,
    CREATIVE_STATUSES,
    RECOMMEND_DECISIONS,
    REVIEW_GATES,
    CLAIM_EVIDENCE,
    TRI_STATES,
    LAUNCH_CHECKS,
    DUE_SOON_DAYS,
    emptyState,
    escapeHtml,
    sanitizeUrl,
    validateWorkspace,
    summarizeWorkspace,
    jacketsNeedingAttention,
    jobsNeedingAttention,
    migrateV1ToV2,
    migrateV2ToV3,
    memoryStorage,
    fictionalExample,
    channelLabel,
    stageLabel,
    gateLabel,
    checklistLabel,
    formatClaimsText,
    creativeStatusLabel,
    createStore,
  };
});
