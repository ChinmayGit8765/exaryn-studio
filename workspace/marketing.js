/* Local marketing desk UI. Renders untrusted text through escapeHtml only. */
(function () {
  "use strict";

  const lib = window.MarketingStore;
  const store = lib.createStore();
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  const VIEWS = ["home", "pipeline", "records"];
  const RECORD_TABS = [
    "campaigns",
    "briefs",
    "calendarItems",
    "clients",
    "products",
    "projects",
    "assets",
    "reviews",
    "publications",
    "observations",
    "learnings",
  ];
  const KIND_TO_LIST = {
    client: "clients",
    campaign: "campaigns",
    brief: "briefs",
    calendarItem: "calendarItems",
    product: "products",
    project: "projects",
    asset: "assets",
    review: "reviews",
    publication: "publications",
    observation: "observations",
    learning: "learnings",
  };
  const LIST_TO_KIND = Object.fromEntries(Object.entries(KIND_TO_LIST).map(([kind, list]) => [list, kind]));
  const statusEl = $("#live-status");
  const dialog = $("#record-dialog");
  const form = $("#record-form");
  const fields = $("#form-fields");
  const dialogTitle = $("#dialog-title");
  let currentKind = "campaign";
  let editingId = null;
  let activeView = "home";
  let activeTab = "campaigns";
  let selected = emptySelected();
  let pipelineCampaignId = null;

  function emptySelected() {
    return {
      campaigns: null,
      briefs: null,
      calendarItems: null,
      clients: null,
      products: null,
      projects: null,
      assets: null,
      reviews: null,
      publications: null,
      observations: null,
      learnings: null,
    };
  }

  function announce(message, kind) {
    statusEl.dataset.kind = kind || "ok";
    statusEl.textContent = message;
  }

  function showError(message) {
    announce(message, "error");
  }

  function optionList(items, selectedId, blankLabel) {
    const blank = `<option value="">${lib.escapeHtml(blankLabel)}</option>`;
    return (
      blank +
      items
        .map(
          (item) =>
            `<option value="${lib.escapeHtml(item.id)}"${item.id === selectedId ? " selected" : ""}>${lib.escapeHtml(item.name)}</option>`
        )
        .join("")
    );
  }

  function optionListByLabel(items, selectedId, blankLabel, labelFn) {
    const blank = `<option value="">${lib.escapeHtml(blankLabel)}</option>`;
    return (
      blank +
      items
        .map((item) => {
          const label = labelFn(item);
          return `<option value="${lib.escapeHtml(item.id)}"${item.id === selectedId ? " selected" : ""}>${lib.escapeHtml(label)}</option>`;
        })
        .join("")
    );
  }

  function channelOptions(selectedId, includeBlank) {
    const blank = includeBlank ? `<option value="">${includeBlank}</option>` : "";
    return (
      blank +
      lib.CHANNELS.map(
        (channel) =>
          `<option value="${lib.escapeHtml(channel.id)}"${channel.id === selectedId ? " selected" : ""}>${lib.escapeHtml(channel.label)}</option>`
      ).join("")
    );
  }

  function enumOptions(values, selectedId, labels) {
    return values
      .map((value) => {
        const label = labels && labels[value] ? labels[value] : value;
        return `<option value="${lib.escapeHtml(value)}"${value === selectedId ? " selected" : ""}>${lib.escapeHtml(label)}</option>`;
      })
      .join("");
  }

  function fieldHtml(cfg) {
    const id = `field-${cfg.name}`;
    const value = cfg.value == null ? "" : String(cfg.value);
    const required = cfg.required ? " required" : "";
    if (cfg.type === "select") {
      return `<div class="field"><label for="${id}">${lib.escapeHtml(cfg.label)}</label><select id="${id}" name="${lib.escapeHtml(cfg.name)}"${required}>${cfg.options}</select></div>`;
    }
    if (cfg.type === "textarea") {
      return `<div class="field"><label for="${id}">${lib.escapeHtml(cfg.label)}</label><textarea id="${id}" name="${lib.escapeHtml(cfg.name)}"${required}>${lib.escapeHtml(value)}</textarea></div>`;
    }
    if (cfg.type === "checkbox") {
      return `<div class="field check"><label><input id="${id}" name="${lib.escapeHtml(cfg.name)}" type="checkbox"${cfg.checked ? " checked" : ""} /> ${lib.escapeHtml(cfg.label)}</label></div>`;
    }
    return `<div class="field"><label for="${id}">${lib.escapeHtml(cfg.label)}</label><input id="${id}" name="${lib.escapeHtml(cfg.name)}" type="${lib.escapeHtml(cfg.type || "text")}" value="${lib.escapeHtml(value)}"${required} /></div>`;
  }

  function named(list, id, fallback) {
    return list.find((item) => item.id === id)?.name || fallback;
  }

  function clientName(id, state) {
    return named(state.clients, id, "No client");
  }

  function productName(id, state) {
    return named(state.products, id, "Unlinked");
  }

  function projectName(id, state) {
    return named(state.projects, id, "Unlinked");
  }

  function briefName(id, state) {
    return named(state.briefs, id, "No brief");
  }

  function campaignName(id, state) {
    return named(state.campaigns, id, "No campaign");
  }

  function assetName(id, state) {
    return named(state.assets, id, "Unknown asset");
  }

  function publicationLabel(item, state) {
    const asset = assetName(item.assetId, state);
    const when = item.publishedAt || "date unknown";
    return `${asset} · ${lib.channelLabel(item.channel) || item.channel} · ${when}`;
  }

  function metricLine(record) {
    if (!record.metricName && record.metricValue == null) return "Metric: unknown (not recorded)";
    if (record.metricValue == null) return `Metric ${record.metricName}: unknown`;
    return `Metric ${record.metricName}: ${record.metricValue}`;
  }

  function stampLabel(value, emptyText) {
    if (!value) return emptyText;
    return value.replace("T", " ").replace(/\.\d+Z$/, " UTC");
  }

  function stampHtml(value, emptyText) {
    const label = stampLabel(value, emptyText);
    if (!value) return lib.escapeHtml(label);
    return `<time datetime="${lib.escapeHtml(value)}">${lib.escapeHtml(label)}</time>`;
  }

  function reasonLabel(code) {
    const labels = {
      blocked: "Blocked",
      qc: "In QC",
      unpublished: "Approved, unpublished",
      due_soon: "Due soon",
      overdue: "Overdue",
      traffic: "Traffic",
      awaiting_observation: "Awaiting observation",
    };
    return labels[code] || code;
  }

  function checklistRows(record) {
    return [
      { label: "Approvals present", value: lib.checklistLabel(record.approvalsPresent) },
      { label: "Asset approved", value: lib.checklistLabel(record.assetApproved) },
      { label: "Destination set", value: lib.checklistLabel(record.destinationSet) },
      { label: "Authorization noted", value: lib.checklistLabel(record.authorizationNoted) },
    ];
  }

  function checklistFields(record) {
    const tri = (selectedValue) =>
      enumOptions(lib.TRI_STATES, selectedValue || "unknown", { unknown: "unknown", yes: "yes", no: "no" });
    return [
      { name: "approvalsPresent", label: "Approvals present?", type: "select", options: tri(record?.approvalsPresent) },
      { name: "assetApproved", label: "Asset approved?", type: "select", options: tri(record?.assetApproved) },
      { name: "destinationSet", label: "Link / destination set?", type: "select", options: tri(record?.destinationSet) },
      { name: "authorizationNoted", label: "Authorization noted?", type: "select", options: tri(record?.authorizationNoted) },
    ];
  }

  function claimsHtml(claims) {
    if (!Array.isArray(claims) || !claims.length) {
      return `<p class="meta">No claims mapped. Evidence stays unknown until you mark it.</p>`;
    }
    return `<ul class="claim-list">${claims
      .map(
        (claim) =>
          `<li><strong>${lib.escapeHtml(claim.text)}</strong> · evidence ${lib.escapeHtml(claim.evidenceStatus || "unknown")}</li>`
      )
      .join("")}</ul>`;
  }

  function hashForState() {
    if (activeView === "home") return "#home";
    if (activeView === "pipeline") return "#pipeline";
    return `#${activeTab}`;
  }

  function applyHash(hash, options) {
    const token = String(hash || "").replace("#", "");
    if (token === "pipeline") {
      setView("pipeline", options);
      return;
    }
    if (token === "jobs") {
      setView("records", { ...options, tab: "campaigns" });
      return;
    }
    if (RECORD_TABS.includes(token)) {
      setView("records", { ...options, tab: token });
      return;
    }
    setView("home", options);
  }

  function setView(view, options) {
    const next = VIEWS.includes(view) ? view : "home";
    activeView = next;
    if (next === "records") {
      const tab = options && options.tab && RECORD_TABS.includes(options.tab) ? options.tab : activeTab;
      setRecordTab(tab, { updateHash: false });
    }
    $$(".app-tab").forEach((button) => {
      const on = button.dataset.view === next;
      button.setAttribute("aria-selected", on ? "true" : "false");
      button.tabIndex = on ? 0 : -1;
    });
    VIEWS.forEach((name) => {
      const panel = $(`#view-${name}`);
      if (panel) panel.hidden = name !== next;
    });
    if (!options || options.updateHash !== false) {
      const hash = hashForState();
      if (location.hash !== hash) history.replaceState(null, "", hash);
    }
  }

  function setRecordTab(tab, options) {
    const next = RECORD_TABS.includes(tab) ? tab : "campaigns";
    activeTab = next;
    $$(".desk-tab").forEach((button) => {
      const on = button.dataset.tab === next;
      button.setAttribute("aria-selected", on ? "true" : "false");
      button.tabIndex = on ? 0 : -1;
    });
    RECORD_TABS.forEach((name) => {
      const panel = $(`#panel-${name}`);
      if (panel) panel.hidden = name !== next;
    });
    if (activeView === "records" && (!options || options.updateHash !== false)) {
      const hash = `#${next}`;
      if (location.hash !== hash) history.replaceState(null, "", hash);
    }
  }

  function cardActions(kind, id) {
    return `<div class="card-actions">
      <button type="button" class="btn secondary" data-edit="${lib.escapeHtml(kind)}" data-id="${lib.escapeHtml(id)}">Edit</button>
      <button type="button" class="btn danger" data-delete="${lib.escapeHtml(kind)}" data-id="${lib.escapeHtml(id)}">Delete</button>
    </div>`;
  }

  function renderList(el, items, emptyText, toCard, selectedId) {
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<li class="empty">${lib.escapeHtml(emptyText)}</li>`;
      return;
    }
    el.innerHTML = items.map((item) => toCard(item, item.id === selectedId)).join("");
  }

  function dl(rows) {
    return `<dl>${rows
      .map(
        (row) =>
          `<div><dt>${lib.escapeHtml(row.label)}</dt><dd>${row.html ? row.html : lib.escapeHtml(row.value || "Not recorded")}</dd></div>`
      )
      .join("")}</dl>`;
  }

  function pickSelected(items, currentId) {
    return items.some((item) => item.id === currentId) ? currentId : null;
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function jacketItemHtml(item) {
    const reasons = item.reasons.map((code) => `<span class="badge">${lib.escapeHtml(reasonLabel(code))}</span>`).join("");
    return `<li class="queue-item">
      <div>
        <h3>${lib.escapeHtml(item.name)}</h3>
        <p class="meta">${lib.escapeHtml(lib.stageLabel(item.stage))} · ${lib.escapeHtml(item.owner || "Owner not recorded")} · due ${lib.escapeHtml(item.dueDate || "not recorded")}</p>
        <div>${reasons}</div>
        <p>${item.blocker ? lib.escapeHtml(item.blocker) : ""}</p>
      </div>
      <button type="button" class="btn ghost" data-focus-campaign="${lib.escapeHtml(item.campaignId)}">Open jacket</button>
    </li>`;
  }

  function renderOverview(state) {
    const summary = lib.summarizeWorkspace(state, { today: todayIso() });
    const emptyEl = $("#overview-empty");
    const statsEl = $("#overview-stats");
    emptyEl.hidden = !summary.isEmpty;
    statsEl.hidden = summary.isEmpty;
    if (summary.isEmpty) {
      $("#jacket-board").innerHTML = "";
      $("#stage-strip").innerHTML = "";
      $("#calendar-line").textContent = "";
      $("#stamp-line").textContent = "";
      $("#fictional-line").hidden = true;
      return summary;
    }
    const buckets = [
      ["traffic", "Needs traffic", "Briefed or drafting jackets."],
      ["qc", "In QC", "Internal QC gate."],
      ["unpublished", "Approved, unpublished", "Studio Go recorded; no publication yet."],
      ["awaitingObservation", "Published, awaiting observation", "Placement exists. Metric stays unknown until recorded."],
    ];
    $("#jacket-board").innerHTML = buckets
      .map(([key, title, hint]) => {
        const items = summary.jackets[key] || [];
        const body = items.length
          ? `<ol class="queue-list">${items.map(jacketItemHtml).join("")}</ol>`
          : `<p class="empty">None.</p>`;
        return `<section class="jacket-bucket" data-bucket="${lib.escapeHtml(key)}">
          <h2>${lib.escapeHtml(title)} <span class="count">${items.length}</span></h2>
          <p class="meta">${lib.escapeHtml(hint)}</p>
          ${body}
        </section>`;
      })
      .join("");
    $("#stage-strip").innerHTML = lib.CAMPAIGN_STAGES.map(
      (stage) =>
        `<div class="stage-chip"><span class="n">${lib.escapeHtml(String(summary.campaignStages[stage]))}</span><span class="l mono">${lib.escapeHtml(lib.stageLabel(stage))}</span></div>`
    ).join("");
    const upcoming = summary.upcomingCalendar || [];
    $("#calendar-line").innerHTML = upcoming.length
      ? `Upcoming slots: ${upcoming
          .map((item) => `${lib.escapeHtml(item.date)} ${lib.escapeHtml(item.title)}`)
          .join(" · ")}`
      : "No upcoming calendar slots recorded.";
    $("#stamp-line").innerHTML = `Last updated ${stampHtml(summary.lastUpdatedAt, "not recorded")} · Last export ${stampHtml(summary.lastExportedAt, "not recorded in this browser")}`;
    $("#fictional-line").hidden = !summary.fictional;
    return summary;
  }

  function renderQueue(summary, state) {
    const el = $("#queue-list");
    if (!summary.nextActions.length) {
      el.innerHTML = `<li class="empty">No next actions recorded. Findings without a next-action field do not become tasks.</li>`;
      return;
    }
    el.innerHTML = summary.nextActions
      .map((item) => {
        const asset = lib.escapeHtml(assetName(item.assetId, state));
        return `<li class="queue-item">
          <div>
            <h3>${lib.escapeHtml(item.nextAction)}</h3>
            <p class="meta">${asset} · ${lib.escapeHtml(lib.gateLabel(item.gate))} r${lib.escapeHtml(String(item.round || 1))} · ${lib.escapeHtml(item.observationDate || "date unknown")} · ${lib.escapeHtml(item.recommendDecision)}</p>
            <p>${item.finding ? lib.escapeHtml(item.finding) : "Finding not recorded."}</p>
          </div>
          <button type="button" class="btn ghost" data-focus-review="${lib.escapeHtml(item.reviewId)}">Open review</button>
        </li>`;
      })
      .join("");
  }

  function campaignDetailHtml(record, state) {
    return `<h3>${lib.escapeHtml(record.name)}</h3>
      <span class="badge">${lib.escapeHtml(lib.stageLabel(record.stage))}</span>
      ${record.blocker ? `<span class="badge">Blocked</span>` : ""}
      ${dl([
        { label: "Client", value: record.clientId ? clientName(record.clientId, state) : "None" },
        { label: "Brief", value: record.briefId ? briefName(record.briefId, state) : "None" },
        { label: "Product", value: record.productId ? productName(record.productId, state) : "None" },
        { label: "Project", value: record.projectId ? projectName(record.projectId, state) : "None" },
        { label: "Owner", value: record.owner },
        { label: "Due date", value: record.dueDate },
        { label: "Blocker", value: record.blocker },
        ...checklistRows(record),
        { label: "Notes", value: record.notes },
      ])}${cardActions("campaign", record.id)}`;
  }

  function renderPipeline(state, view) {
    const campaigns = view.campaigns.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (pipelineCampaignId && !campaigns.some((item) => item.id === pipelineCampaignId)) pipelineCampaignId = null;
    $("#pipeline-board").innerHTML = lib.CAMPAIGN_STAGES.map((stage) => {
      const column = campaigns.filter((item) => item.stage === stage);
      const cards = column.length
        ? column
            .map((item) => {
              const on = item.id === pipelineCampaignId;
              return `<button type="button" class="card pipeline-card${on ? " is-selected" : ""}" data-select-campaign="${lib.escapeHtml(item.id)}">
                <h3>${lib.escapeHtml(item.name)}</h3>
                <p class="meta">${lib.escapeHtml(item.owner || "Owner not recorded")}${item.dueDate ? ` · ${lib.escapeHtml(item.dueDate)}` : ""}</p>
                ${item.blocker ? `<span class="badge">Blocked</span>` : ""}
              </button>`;
            })
            .join("")
        : `<p class="empty">None</p>`;
      return `<section class="pipeline-col" data-stage="${lib.escapeHtml(stage)}">
        <h3>${lib.escapeHtml(lib.stageLabel(stage))} <span class="count">${column.length}</span></h3>
        ${cards}
      </section>`;
    }).join("");
    const selectedCampaign = campaigns.find((item) => item.id === pipelineCampaignId) || null;
    const detail = $("#pipeline-detail");
    if (!selectedCampaign) {
      detail.innerHTML = `<p class="meta">Select a campaign jacket on the board. Stage changes are an explicit save. Publication is a separate record.</p>`;
      return;
    }
    detail.innerHTML = campaignDetailHtml(selectedCampaign, state);
  }

  function renderDetail(kind, record, state) {
    const el = $(`#${kind}-detail`);
    if (!el) return;
    if (!record) {
      el.innerHTML = `<p class="meta">Select a record to read it. Keyboard: arrow keys move between record tabs.</p>`;
      return;
    }
    if (kind === "client") {
      el.innerHTML = `<h3>${lib.escapeHtml(record.name)}</h3>${dl([
        { label: "Notes", value: record.notes },
      ])}${cardActions("client", record.id)}`;
      return;
    }
    if (kind === "product") {
      el.innerHTML = `<h3>${lib.escapeHtml(record.name)}</h3>${dl([
        { label: "Client", value: record.clientId ? clientName(record.clientId, state) : "None" },
        { label: "Type", value: "Ongoing offering" },
        { label: "Audience", value: record.audience },
        { label: "Problem or experience", value: record.problemOrExperience },
        { label: "Intended value", value: record.intendedValue },
        { label: "Notes", value: record.notes },
      ])}${cardActions("product", record.id)}`;
      return;
    }
    if (kind === "project") {
      el.innerHTML = `<h3>${lib.escapeHtml(record.name)}</h3>${dl([
        { label: "Product", value: record.productId ? productName(record.productId, state) : "None" },
        { label: "Bounded outcome", value: record.outcome },
        { label: "Owner", value: record.owner },
        { label: "Notes", value: record.notes },
      ])}${cardActions("project", record.id)}`;
      return;
    }
    if (kind === "brief") {
      el.innerHTML = `<h3>${lib.escapeHtml(record.name)}</h3>
        ${record.locked ? `<span class="badge">Locked</span>` : `<span class="badge">Unlocked</span>`}
        ${dl([
          { label: "Client", value: record.clientId ? clientName(record.clientId, state) : "None" },
          { label: "Product", value: record.productId ? productName(record.productId, state) : "None" },
          { label: "Project", value: record.projectId ? projectName(record.projectId, state) : "None" },
          { label: "Where we are now", value: record.whereWeAreNow },
          { label: "Where we want to be", value: record.whereWeWantToBe },
          { label: "Target audience", value: record.targetAudience },
          { label: "Proposition / message", value: record.proposition },
          { label: "Reasons to believe", value: record.reasonsToBelieve },
          { label: "Tone", value: record.tone },
          { label: "Mandatories / legal", value: record.mandatoriesLegal },
          { label: "How we'll know", value: record.successDefinition },
          { label: "Claim → evidence", html: claimsHtml(record.claims) },
          { label: "Notes", value: record.notes },
        ])}${cardActions("brief", record.id)}`;
      return;
    }
    if (kind === "campaign") {
      el.innerHTML = campaignDetailHtml(record, state);
      return;
    }
    if (kind === "calendarItem") {
      el.innerHTML = `<h3>${lib.escapeHtml(record.title)}</h3>${dl([
        { label: "Date", value: record.date },
        { label: "Campaign", value: record.campaignId ? campaignName(record.campaignId, state) : "None" },
        { label: "Channel", value: record.channel ? lib.channelLabel(record.channel) : "None" },
        { label: "Notes", value: record.notes },
      ])}${cardActions("calendarItem", record.id)}`;
      return;
    }
    if (kind === "asset") {
      el.innerHTML = `<h3>${lib.escapeHtml(record.name)}</h3>
        <span class="badge">${lib.escapeHtml(record.kind === "product_surface" ? "Product surface" : "Content")}</span>
        <span class="badge">${lib.escapeHtml(lib.channelLabel(record.channel))}</span>
        <span class="badge">${lib.escapeHtml(lib.creativeStatusLabel(record.creativeStatus))}</span>
        ${record.versionLabel ? `<span class="badge">${lib.escapeHtml(record.versionLabel)}</span>` : ""}
        ${dl([
          { label: "Campaign", value: record.campaignId ? campaignName(record.campaignId, state) : "None" },
          { label: "Product", value: record.productId ? productName(record.productId, state) : "No product" },
          { label: "Project", value: record.projectId ? projectName(record.projectId, state) : "No project" },
          { label: "Format", value: record.format },
          { label: "Message", value: record.message },
          { label: "Copy body", value: record.copyBody },
          { label: "Source URL", value: record.sourceUrl || "Unknown" },
          { label: "Notes", value: record.notes },
        ])}${cardActions("asset", record.id)}`;
      return;
    }
    if (kind === "review") {
      el.innerHTML = `<h3>${lib.escapeHtml(assetName(record.assetId, state))}</h3>
        <span class="badge note">${lib.escapeHtml(lib.gateLabel(record.gate))}</span>
        <span class="badge">Round ${lib.escapeHtml(String(record.round || 1))}</span>
        <span class="badge ${lib.escapeHtml(record.evidenceStatus)}">Evidence: ${lib.escapeHtml(record.evidenceStatus)}</span>
        <span class="badge">${lib.escapeHtml(record.recommendDecision)}</span>
        <span class="badge">${lib.escapeHtml(lib.channelLabel(record.channel))}</span>
        ${dl([
          { label: "Campaign", value: record.campaignId ? campaignName(record.campaignId, state) : "None" },
          { label: "Observation date", value: record.observationDate },
          { label: "Audience", value: record.intendedAudience },
          { label: "Desired outcome / CTA", value: record.desiredOutcome },
          { label: "Claim truth", value: record.claimTruthOk },
          { label: "Channel fit", value: record.channelFitOk },
          { label: "CTA clear", value: record.ctaClearOk },
          { label: "Recommend", value: record.recommendDecision },
          { label: "Source URL", value: record.sourceUrl || "None" },
          { label: "Source note", value: record.sourceNote },
          { label: "Metric", value: metricLine(record) },
          { label: "Finding", value: record.finding },
          { label: "Next action", value: record.nextAction || "Not recorded" },
        ])}${cardActions("review", record.id)}`;
      return;
    }
    if (kind === "publication") {
      el.innerHTML = `<h3>${lib.escapeHtml(assetName(record.assetId, state))}</h3>
        <span class="badge">${lib.escapeHtml(lib.channelLabel(record.channel))}</span>
        ${record.assetVersion ? `<span class="badge">${lib.escapeHtml(record.assetVersion)}</span>` : ""}
        ${dl([
          { label: "Campaign", value: record.campaignId ? campaignName(record.campaignId, state) : "None" },
          { label: "Account label", value: record.accountLabel },
          { label: "Public URL", value: record.publicUrl || "Unknown" },
          { label: "Platform id", value: record.platformId },
          { label: "Published date", value: record.publishedAt },
          { label: "Authorization note", value: record.authorizationNote },
          ...checklistRows(record),
          { label: "Notes", value: record.notes },
        ])}${cardActions("publication", record.id)}`;
      return;
    }
    if (kind === "observation") {
      el.innerHTML = `<h3>${lib.escapeHtml(record.metricName || "Observation")}</h3>
        <span class="badge unknown">${record.metricValue == null ? "Metric unknown" : "Metric recorded"}</span>
        ${dl([
          { label: "Campaign", value: record.campaignId ? campaignName(record.campaignId, state) : "None" },
          { label: "Publication", value: record.publicationId ? publicationLabel(state.publications.find((item) => item.id === record.publicationId) || { assetId: "", channel: "", publishedAt: "" }, state) : "None" },
          { label: "Asset", value: record.assetId ? assetName(record.assetId, state) : "None" },
          { label: "Metric", value: metricLine(record) },
          { label: "Window", value: [record.windowStart, record.windowEnd].filter(Boolean).join(" → ") || "Not recorded" },
          { label: "Captured at", value: stampLabel(record.capturedAt, "Not recorded") },
          { label: "Source note", value: record.sourceNote },
          { label: "Limitations", value: record.limitations },
          { label: "Notes", value: record.notes },
        ])}${cardActions("observation", record.id)}`;
      return;
    }
    el.innerHTML = `<h3>${lib.escapeHtml(record.campaignId ? campaignName(record.campaignId, state) : "Learning")}</h3>
      ${dl([
        { label: "Campaign", value: record.campaignId ? campaignName(record.campaignId, state) : "None" },
        { label: "Publication", value: record.publicationId || "None" },
        { label: "Hypothesis", value: record.hypothesis },
        { label: "Evidence supports", value: record.evidenceSupports },
        { label: "Cannot show", value: record.cannotShow },
        { label: "Next action", value: record.nextAction },
        { label: "Notes", value: record.notes },
      ])}${cardActions("learning", record.id)}`;
  }

  function renderRecordLists(state, view) {
    selected.campaigns = pickSelected(view.campaigns, selected.campaigns);
    renderList(
      $("#campaign-list"),
      view.campaigns,
      "No campaign jackets yet. A campaign is the gated jacket: brief, stages, launch checklist.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="campaign" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.name)}</h3>
          <span class="badge">${lib.escapeHtml(lib.stageLabel(item.stage))}</span>
          ${item.blocker ? `<span class="badge">Blocked</span>` : ""}
          <p class="meta">${lib.escapeHtml(item.owner || "Owner not recorded")} · due ${lib.escapeHtml(item.dueDate || "not recorded")}</p>
        </button>
      </li>`,
      selected.campaigns
    );
    renderDetail("campaign", view.campaigns.find((item) => item.id === selected.campaigns) || null, state);

    selected.briefs = pickSelected(view.briefs, selected.briefs);
    renderList(
      $("#brief-list"),
      view.briefs,
      "No briefs yet. Lock after the jacket is set.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="brief" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.name)}</h3>
          ${item.locked ? `<span class="badge">Locked</span>` : ""}
          <p class="meta">${lib.escapeHtml(item.productId ? productName(item.productId, state) : "No product")}</p>
          <p>${lib.escapeHtml(item.proposition || "Proposition not recorded")}</p>
        </button>
      </li>`,
      selected.briefs
    );
    renderDetail("brief", view.briefs.find((item) => item.id === selected.briefs) || null, state);

    selected.calendarItems = pickSelected(view.calendarItems, selected.calendarItems);
    renderList(
      $("#calendarItem-list"),
      view.calendarItems,
      "No calendar slots yet. Add a flighting or editorial date without a media plan.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="calendarItem" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.title)}</h3>
          <p class="meta">${lib.escapeHtml(item.date)}${item.channel ? ` · ${lib.escapeHtml(lib.channelLabel(item.channel))}` : ""}</p>
          <p>${lib.escapeHtml(item.campaignId ? campaignName(item.campaignId, state) : "No campaign")}</p>
        </button>
      </li>`,
      selected.calendarItems
    );
    renderDetail("calendarItem", view.calendarItems.find((item) => item.id === selected.calendarItems) || null, state);

    selected.clients = pickSelected(view.clients, selected.clients);
    renderList(
      $("#client-list"),
      view.clients,
      "No clients yet. Hobby default in the example is Exaryn Studio.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="client" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.name)}</h3>
          <p>${lib.escapeHtml(item.notes || "Notes not recorded")}</p>
        </button>
      </li>`,
      selected.clients
    );
    renderDetail("client", view.clients.find((item) => item.id === selected.clients) || null, state);

    selected.products = pickSelected(view.products, selected.products);
    renderList(
      $("#product-list"),
      view.products,
      "No products yet. Create an ongoing offering to start the desk.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="product" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.name)}</h3>
          <p class="meta">${lib.escapeHtml(item.clientId ? clientName(item.clientId, state) : "No client")}</p>
          <p>${lib.escapeHtml(item.audience || "Audience not recorded")}</p>
        </button>
      </li>`,
      selected.products
    );
    renderDetail("product", view.products.find((item) => item.id === selected.products) || null, state);

    selected.projects = pickSelected(view.projects, selected.projects);
    renderList(
      $("#project-list"),
      view.projects,
      "No projects yet. A project is a bounded effort, optionally linked to a product.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="project" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.name)}</h3>
          <p class="meta">Product: ${lib.escapeHtml(item.productId ? productName(item.productId, state) : "None")}</p>
          <p>${lib.escapeHtml(item.outcome || "Outcome not recorded")}</p>
        </button>
      </li>`,
      selected.projects
    );
    renderDetail("project", view.projects.find((item) => item.id === selected.projects) || null, state);

    selected.assets = pickSelected(view.assets, selected.assets);
    renderList(
      $("#asset-list"),
      view.assets,
      "No assets yet. Add a content asset or product surface linked to a product or project.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="asset" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.name)}</h3>
          <span class="badge">${lib.escapeHtml(lib.creativeStatusLabel(item.creativeStatus))}</span>
          <span class="badge">${lib.escapeHtml(lib.channelLabel(item.channel))}</span>
          <p class="meta">${lib.escapeHtml(item.versionLabel || "No version label")} · ${lib.escapeHtml(item.campaignId ? campaignName(item.campaignId, state) : "No campaign")}</p>
        </button>
      </li>`,
      selected.assets
    );
    renderDetail("asset", view.assets.find((item) => item.id === selected.assets) || null, state);

    selected.reviews = pickSelected(view.reviews, selected.reviews);
    renderList(
      $("#review-list"),
      view.reviews,
      "No reviews yet. Record an Internal QC or Approval note. Missing metrics stay unknown.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="review" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(assetName(item.assetId, state))}</h3>
          <span class="badge note">${lib.escapeHtml(lib.gateLabel(item.gate))}</span>
          <span class="badge">r${lib.escapeHtml(String(item.round || 1))}</span>
          <span class="badge">${lib.escapeHtml(item.recommendDecision)}</span>
          <p class="meta">${lib.escapeHtml(item.observationDate)} · ${lib.escapeHtml(item.nextAction ? "Next action recorded" : "No next action")}</p>
          <p>${lib.escapeHtml(item.finding)}</p>
        </button>
      </li>`,
      selected.reviews
    );
    renderDetail("review", view.reviews.find((item) => item.id === selected.reviews) || null, state);

    selected.publications = pickSelected(view.publications, selected.publications);
    renderList(
      $("#publication-list"),
      view.publications,
      "No publications yet. Publication is separate from the asset and is never created automatically.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="publication" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(assetName(item.assetId, state))}</h3>
          <span class="badge">${lib.escapeHtml(lib.channelLabel(item.channel))}</span>
          <p class="meta">${lib.escapeHtml(item.publishedAt || "Date unknown")} · ${lib.escapeHtml(item.accountLabel || "Account not recorded")}</p>
        </button>
      </li>`,
      selected.publications
    );
    renderDetail("publication", view.publications.find((item) => item.id === selected.publications) || null, state);

    selected.observations = pickSelected(view.observations, selected.observations);
    renderList(
      $("#observation-list"),
      view.observations,
      "No observations yet. Blank metric values stay unknown.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="observation" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.metricName || "Observation")}</h3>
          <span class="badge unknown">${item.metricValue == null ? "Unknown" : "Recorded"}</span>
          <p class="meta">${lib.escapeHtml(item.windowStart || "No window start")} → ${lib.escapeHtml(item.windowEnd || "No window end")}</p>
          <p>${lib.escapeHtml(item.sourceNote || item.limitations || "No source note")}</p>
        </button>
      </li>`,
      selected.observations
    );
    renderDetail("observation", view.observations.find((item) => item.id === selected.observations) || null, state);

    selected.learnings = pickSelected(view.learnings, selected.learnings);
    renderList(
      $("#learning-list"),
      view.learnings,
      "No learnings yet. A debrief records what evidence can and cannot show.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="learning" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.campaignId ? campaignName(item.campaignId, state) : "Learning")}</h3>
          <p class="meta">${lib.escapeHtml(item.nextAction ? "Next action recorded" : "No next action")}</p>
          <p>${lib.escapeHtml(item.hypothesis)}</p>
        </button>
      </li>`,
      selected.learnings
    );
    renderDetail("learning", view.learnings.find((item) => item.id === selected.learnings) || null, state);
  }

  function render() {
    const state = store.getState();
    const filters = {
      productId: $("#filter-product").value,
      projectId: $("#filter-project").value,
    };
    const view = store.filterRecords(filters);
    const summary = renderOverview(state);
    renderQueue(summary, state);
    renderPipeline(state, view);

    $("#filter-product").innerHTML = optionList(state.products, filters.productId, "All products");
    $("#filter-project").innerHTML = optionList(state.projects, filters.projectId, "All projects");
    renderRecordLists(state, view);
  }

  function fieldsFor(kind, record, state) {
    const tri = (selectedValue) =>
      enumOptions(lib.TRI_STATES, selectedValue || "unknown", { unknown: "unknown", yes: "yes", no: "no" });
    const stageOptions = enumOptions(lib.CAMPAIGN_STAGES, record?.stage || "briefed", {
      briefed: "Briefed",
      drafting: "Drafting",
      qc: "QC",
      approved: "Approved",
      published: "Published",
      learning: "Learning",
      killed: "Killed",
    });
    if (kind === "client") {
      return [
        { name: "name", label: "Client name", value: record?.name, required: true },
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
      ];
    }
    if (kind === "product") {
      return [
        { name: "name", label: "Product name", value: record?.name, required: true },
        { name: "clientId", label: "Client (optional)", type: "select", options: optionList(state.clients, record?.clientId || "", "No client") },
        { name: "audience", label: "Intended audience", value: record?.audience },
        { name: "problemOrExperience", label: "Problem or experience", type: "textarea", value: record?.problemOrExperience },
        { name: "intendedValue", label: "Intended value", type: "textarea", value: record?.intendedValue },
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
      ];
    }
    if (kind === "project") {
      return [
        { name: "name", label: "Project name", value: record?.name, required: true },
        { name: "productId", label: "Linked product (optional)", type: "select", options: optionList(state.products, record?.productId || "", "No product") },
        { name: "outcome", label: "Bounded outcome", type: "textarea", value: record?.outcome },
        { name: "owner", label: "Owner", value: record?.owner },
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
      ];
    }
    if (kind === "brief") {
      return [
        { name: "name", label: "Brief name", value: record?.name, required: true },
        { name: "clientId", label: "Client (optional)", type: "select", options: optionList(state.clients, record?.clientId || "", "No client") },
        { name: "productId", label: "Product (optional)", type: "select", options: optionList(state.products, record?.productId || "", "No product") },
        { name: "projectId", label: "Project (optional)", type: "select", options: optionList(state.projects, record?.projectId || "", "No project") },
        { name: "whereWeAreNow", label: "Where we are now", type: "textarea", value: record?.whereWeAreNow },
        { name: "whereWeWantToBe", label: "Where we want to be", type: "textarea", value: record?.whereWeWantToBe },
        { name: "targetAudience", label: "Target audience", value: record?.targetAudience },
        { name: "proposition", label: "Single-minded proposition / message", type: "textarea", value: record?.proposition },
        { name: "reasonsToBelieve", label: "Reasons to believe / mandatory claims", type: "textarea", value: record?.reasonsToBelieve },
        { name: "tone", label: "Tone", value: record?.tone },
        { name: "mandatoriesLegal", label: "Mandatories / legal", type: "textarea", value: record?.mandatoriesLegal },
        { name: "successDefinition", label: "How we'll know (qualitative OK)", type: "textarea", value: record?.successDefinition },
        { name: "claimsText", label: "Claim → evidence (one per line: claim | supported|unsupported|unknown)", type: "textarea", value: lib.formatClaimsText(record?.claims || []) },
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
        { name: "locked", label: "Locked (uncheck to edit a locked brief)", type: "checkbox", checked: record?.locked === true },
      ];
    }
    if (kind === "campaign") {
      return [
        { name: "name", label: "Campaign / jacket name", value: record?.name, required: true },
        { name: "briefId", label: "Brief (optional)", type: "select", options: optionList(state.briefs, record?.briefId || "", "No brief") },
        { name: "clientId", label: "Client (optional)", type: "select", options: optionList(state.clients, record?.clientId || "", "No client") },
        { name: "productId", label: "Product (optional)", type: "select", options: optionList(state.products, record?.productId || "", "No product") },
        { name: "projectId", label: "Project (optional)", type: "select", options: optionList(state.projects, record?.projectId || "", "No project") },
        { name: "stage", label: "Stage", type: "select", required: true, options: stageOptions },
        { name: "owner", label: "Owner", value: record?.owner },
        { name: "dueDate", label: "Due date", type: "date", value: record?.dueDate },
        { name: "blocker", label: "Blocker (blank = none)", type: "textarea", value: record?.blocker },
        ...checklistFields(record),
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
      ];
    }
    if (kind === "calendarItem") {
      return [
        { name: "title", label: "Slot title", value: record?.title, required: true },
        { name: "date", label: "Date", type: "date", required: true, value: record?.date },
        { name: "campaignId", label: "Campaign (optional)", type: "select", options: optionList(state.campaigns, record?.campaignId || "", "No campaign") },
        { name: "channel", label: "Channel (optional)", type: "select", options: channelOptions(record?.channel || "", "No channel") },
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
      ];
    }
    if (kind === "asset") {
      return [
        { name: "name", label: "Asset name", value: record?.name, required: true },
        { name: "kind", label: "Asset kind", type: "select", options: `<option value="content"${record?.kind !== "product_surface" ? " selected" : ""}>Content</option><option value="product_surface"${record?.kind === "product_surface" ? " selected" : ""}>Product surface</option>` },
        { name: "campaignId", label: "Campaign (optional)", type: "select", options: optionList(state.campaigns, record?.campaignId || "", "No campaign") },
        { name: "productId", label: "Product", type: "select", options: optionList(state.products, record?.productId || "", "No product") },
        { name: "projectId", label: "Project", type: "select", options: optionList(state.projects, record?.projectId || "", "No project") },
        { name: "channel", label: "Channel", type: "select", required: true, options: channelOptions(record?.channel || "website_search") },
        { name: "format", label: "Format", value: record?.format },
        { name: "versionLabel", label: "Version label", value: record?.versionLabel },
        {
          name: "creativeStatus",
          label: "Creative status (approved only by this save — not auto-publish)",
          type: "select",
          required: true,
          options: enumOptions(lib.CREATIVE_STATUSES, record?.creativeStatus || "draft", {
            draft: "Draft",
            ready_for_qc: "Ready for QC",
            approved: "Approved",
            killed: "Killed",
          }),
        },
        { name: "message", label: "Message", type: "textarea", value: record?.message },
        { name: "copyBody", label: "Copy body (post-ready text)", type: "textarea", value: record?.copyBody },
        { name: "sourceUrl", label: "Source URL (http or https)", type: "url", value: record?.sourceUrl },
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
      ];
    }
    if (kind === "review") {
      return [
        { name: "assetId", label: "Asset", type: "select", required: true, options: optionList(state.assets, record?.assetId || "", "Select an asset") },
        { name: "campaignId", label: "Campaign (optional)", type: "select", options: optionList(state.campaigns, record?.campaignId || "", "No campaign") },
        { name: "channel", label: "Channel observed", type: "select", required: true, options: channelOptions(record?.channel || "website_search") },
        {
          name: "gate",
          label: "Gate",
          type: "select",
          required: true,
          options: enumOptions(lib.REVIEW_GATES, record?.gate || "internal_qc", {
            internal_qc: "Internal QC",
            approval: "Approval (studio Go)",
          }),
        },
        { name: "round", label: "Round", type: "number", value: record?.round || 1 },
        { name: "intendedAudience", label: "Intended audience", value: record?.intendedAudience },
        { name: "desiredOutcome", label: "Desired outcome / CTA", type: "textarea", value: record?.desiredOutcome },
        { name: "sourceUrl", label: "Source URL (http or https)", type: "url", value: record?.sourceUrl },
        { name: "sourceNote", label: "Source note", type: "textarea", value: record?.sourceNote },
        { name: "observationDate", label: "Observation date", type: "date", required: true, value: record?.observationDate },
        { name: "evidenceStatus", label: "Evidence status", type: "select", required: true, options: lib.EVIDENCE_STATUSES.map((status) => `<option value="${status}"${(record?.evidenceStatus || "unknown") === status ? " selected" : ""}>${status}</option>`).join("") },
        { name: "claimTruthOk", label: "Claim truth (unknown unless you checked)", type: "select", options: tri(record?.claimTruthOk) },
        { name: "channelFitOk", label: "Channel fit (unknown unless you checked)", type: "select", options: tri(record?.channelFitOk) },
        { name: "ctaClearOk", label: "CTA clear (unknown unless you checked)", type: "select", options: tri(record?.ctaClearOk) },
        {
          name: "recommendDecision",
          label: "Recommend decision (does not auto-approve or publish the asset)",
          type: "select",
          required: true,
          options: enumOptions(lib.RECOMMEND_DECISIONS, record?.recommendDecision || "unset", {
            unset: "unset",
            go: "go",
            edit: "edit",
            kill: "kill",
          }),
        },
        { name: "metricName", label: "Metric name (optional)", value: record?.metricName },
        { name: "metricValue", label: "Metric value (blank = unknown, never invent zero)", value: record?.metricValue == null ? "" : record.metricValue },
        { name: "finding", label: "Finding", type: "textarea", required: true, value: record?.finding },
        { name: "nextAction", label: "Next action", type: "textarea", value: record?.nextAction },
      ];
    }
    if (kind === "publication") {
      return [
        { name: "assetId", label: "Asset", type: "select", required: true, options: optionList(state.assets, record?.assetId || "", "Select an asset") },
        { name: "campaignId", label: "Campaign (optional)", type: "select", options: optionList(state.campaigns, record?.campaignId || "", "No campaign") },
        { name: "assetVersion", label: "Asset version", value: record?.assetVersion },
        { name: "channel", label: "Channel", type: "select", required: true, options: channelOptions(record?.channel || "website_search") },
        { name: "accountLabel", label: "Account label", value: record?.accountLabel },
        { name: "publicUrl", label: "Public URL (http or https)", type: "url", value: record?.publicUrl },
        { name: "platformId", label: "Platform id", value: record?.platformId },
        { name: "publishedAt", label: "Published date", type: "date", value: record?.publishedAt },
        { name: "authorizationNote", label: "Authorization note", type: "textarea", value: record?.authorizationNote },
        ...checklistFields(record),
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
      ];
    }
    if (kind === "observation") {
      return [
        {
          name: "publicationId",
          label: "Publication",
          type: "select",
          options: optionListByLabel(state.publications, record?.publicationId || "", "No publication", (item) => publicationLabel(item, state)),
        },
        { name: "assetId", label: "Asset", type: "select", options: optionList(state.assets, record?.assetId || "", "No asset") },
        { name: "campaignId", label: "Campaign (optional)", type: "select", options: optionList(state.campaigns, record?.campaignId || "", "No campaign") },
        { name: "metricName", label: "Metric name (optional)", value: record?.metricName },
        { name: "metricValue", label: "Metric value (blank = unknown, never invent zero)", value: record?.metricValue == null ? "" : record.metricValue },
        { name: "windowStart", label: "Window start", type: "date", value: record?.windowStart },
        { name: "windowEnd", label: "Window end", type: "date", value: record?.windowEnd },
        { name: "sourceNote", label: "Source note", type: "textarea", value: record?.sourceNote },
        { name: "limitations", label: "Limitations", type: "textarea", value: record?.limitations },
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
      ];
    }
    return [
      { name: "campaignId", label: "Campaign", type: "select", options: optionList(state.campaigns, record?.campaignId || "", "No campaign") },
      {
        name: "publicationId",
        label: "Publication",
        type: "select",
        options: optionListByLabel(state.publications, record?.publicationId || "", "No publication", (item) => publicationLabel(item, state)),
      },
      { name: "hypothesis", label: "Hypothesis", type: "textarea", required: true, value: record?.hypothesis },
      { name: "evidenceSupports", label: "What evidence supports", type: "textarea", value: record?.evidenceSupports },
      { name: "cannotShow", label: "What it cannot show", type: "textarea", value: record?.cannotShow },
      { name: "nextAction", label: "Next action", type: "textarea", value: record?.nextAction },
      { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
    ];
  }

  function openEditor(kind, id) {
    const state = store.getState();
    const listName = KIND_TO_LIST[kind];
    const record = id ? state[listName].find((item) => item.id === id) : null;
    if (id && !record) {
      showError("That record is no longer in this browser.");
      return;
    }
    currentKind = kind;
    editingId = id;
    const titles = {
      client: id ? "Edit client" : "Create client",
      campaign: id ? "Edit campaign jacket" : "Create campaign jacket",
      product: id ? "Edit product" : "Create product",
      project: id ? "Edit project" : "Create project",
      brief: id ? "Edit brief" : "Create brief",
      calendarItem: id ? "Edit calendar slot" : "Create calendar slot",
      asset: id ? "Edit asset" : "Create asset",
      review: id ? "Edit review" : "Record review",
      publication: id ? "Edit publication" : "Record publication",
      observation: id ? "Edit observation" : "Record observation",
      learning: id ? "Edit learning" : "Record learning",
    };
    dialogTitle.textContent = titles[kind] || "Record";
    fields.innerHTML = fieldsFor(kind, record, state).map(fieldHtml).join("");
    if (!dialog.open) dialog.showModal();
    const first = fields.querySelector("input, select, textarea");
    if (first) first.focus();
  }

  function readForm() {
    const data = {};
    $$("[name]", form).forEach((el) => {
      if (el.type === "checkbox") data[el.name] = el.checked;
      else data[el.name] = el.value;
    });
    if (editingId) data.id = editingId;
    return data;
  }

  function saveForm(event) {
    event.preventDefault();
    const input = readForm();
    const writers = {
      client: (payload) => store.upsertClient(payload),
      campaign: (payload) => store.upsertCampaign(payload),
      product: (payload) => store.upsertProduct(payload),
      project: (payload) => store.upsertProject(payload),
      brief: (payload) => store.upsertBrief(payload),
      calendarItem: (payload) => store.upsertCalendarItem(payload),
      asset: (payload) => store.upsertAsset(payload),
      review: (payload) => store.upsertReview(payload),
      publication: (payload) => store.upsertPublication(payload),
      observation: (payload) => store.upsertObservation(payload),
      learning: (payload) => store.upsertLearning(payload),
    };
    const result = writers[currentKind](input);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    const savedId = result.record ? result.record.id : editingId;
    const list = KIND_TO_LIST[currentKind];
    if (savedId && list) selected[list] = savedId;
    if (currentKind === "campaign" && savedId) pipelineCampaignId = savedId;
    if (list) {
      setView("records", { tab: list });
    }
    dialog.close();
    announce(`${currentKind} saved in this browser only.`);
    render();
  }

  function downloadExport() {
    const blob = new Blob([store.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exaryn-marketing-workspace.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    announce("Exported a local JSON file. Do not commit private studio data.");
    render();
  }

  function importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => showError("Could not read that file. Existing records were left unchanged.");
    reader.onload = () => {
      const result = store.importJson(String(reader.result || ""));
      if (!result.ok) {
        showError(result.error);
        return;
      }
      selected = emptySelected();
      pipelineCampaignId = null;
      announce("Import accepted after validation. Previous workspace in this browser was replaced.");
      render();
    };
    reader.readAsText(file);
  }

  function focusReview(id) {
    selected.reviews = id;
    setView("records", { tab: "reviews" });
    render();
    const card = $(`[data-select="review"][data-id="${CSS.escape(id)}"]`);
    if (card) card.focus();
  }

  function focusCampaign(id) {
    selected.campaigns = id;
    pipelineCampaignId = id;
    setView("pipeline");
    render();
    const card = $(`[data-select-campaign="${CSS.escape(id)}"]`);
    if (card) card.focus();
  }

  document.addEventListener("click", (event) => {
    const viewTab = event.target.closest("[data-view]");
    if (viewTab && viewTab.closest("#app-nav")) {
      setView(viewTab.dataset.view);
      viewTab.focus();
      return;
    }
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      setView("records", { tab: tab.dataset.tab });
      tab.focus();
      return;
    }
    const create = event.target.closest("[data-create]");
    if (create) openEditor(create.dataset.create, null);
    const edit = event.target.closest("[data-edit]");
    if (edit) {
      event.stopPropagation();
      openEditor(edit.dataset.edit, edit.dataset.id);
    }
    const remove = event.target.closest("[data-delete]");
    if (remove) {
      event.stopPropagation();
      const result = store.deleteRecord(remove.dataset.delete, remove.dataset.id);
      if (!result.ok) showError(result.error);
      else {
        const list = KIND_TO_LIST[remove.dataset.delete];
        if (list && selected[list] === remove.dataset.id) selected[list] = null;
        if (remove.dataset.delete === "campaign" && pipelineCampaignId === remove.dataset.id) pipelineCampaignId = null;
        announce("Record deleted from this browser.");
        render();
      }
    }
    const select = event.target.closest("[data-select]");
    if (select) {
      const list = KIND_TO_LIST[select.dataset.select] || `${select.dataset.select}s`;
      selected[list] = select.dataset.id;
      if (select.dataset.select === "campaign") pipelineCampaignId = select.dataset.id;
      render();
    }
    const selectCampaign = event.target.closest("[data-select-campaign]");
    if (selectCampaign) {
      pipelineCampaignId = selectCampaign.dataset.selectCampaign;
      selected.campaigns = pipelineCampaignId;
      render();
    }
    const focus = event.target.closest("[data-focus-review]");
    if (focus) focusReview(focus.dataset.focusReview);
    const focusCampaignBtn = event.target.closest("[data-focus-campaign]");
    if (focusCampaignBtn) focusCampaign(focusCampaignBtn.dataset.focusCampaign);
  });

  form.addEventListener("submit", saveForm);
  $("#cancel-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    editingId = null;
    form.reset();
    fields.innerHTML = "";
  });

  $("#export-json").addEventListener("click", downloadExport);
  $("#import-json").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    importFile(file);
    event.target.value = "";
  });
  $("#load-example").addEventListener("click", () => {
    const confirmed = window.confirm(
      "Load the clearly labelled fictional example? This replaces the workspace stored in this browser. It is not studio or account data."
    );
    if (!confirmed) return;
    const result = store.loadFictionalExample();
    if (!result.ok) {
      showError(result.error);
      return;
    }
    selected = emptySelected();
    pipelineCampaignId = null;
    announce("Loaded opt-in fictional example records. Not real studio data.");
    render();
  });
  $("#clear-workspace").addEventListener("click", () => {
    const confirmed = window.confirm("Clear every marketing record stored in this browser?");
    if (!confirmed) return;
    const result = store.clearAll();
    if (!result.ok) {
      showError(result.error);
      return;
    }
    selected = emptySelected();
    pipelineCampaignId = null;
    announce("This browser workspace is empty.");
    render();
  });
  $("#filter-product").addEventListener("change", render);
  $("#filter-project").addEventListener("change", render);

  $("#app-nav").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = VIEWS.indexOf(activeView);
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % VIEWS.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + VIEWS.length) % VIEWS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = VIEWS.length - 1;
    setView(VIEWS[next]);
    $(`#view-tab-${VIEWS[next]}`).focus();
  });

  $("#desk-tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = RECORD_TABS.indexOf(activeTab);
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % RECORD_TABS.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + RECORD_TABS.length) % RECORD_TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = RECORD_TABS.length - 1;
    setView("records", { tab: RECORD_TABS[next] });
    $(`#tab-${RECORD_TABS[next]}`).focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.open) dialog.close();
  });

  window.addEventListener("hashchange", () => {
    applyHash(location.hash, { updateHash: false });
  });

  applyHash(location.hash, { updateHash: false });

  const loaded = store.load();
  if (!loaded.ok) showError(loaded.error);
  else if (loaded.migratedFrom === 1 || loaded.migratedFrom === 2) {
    announce(`Workspace migrated from schema v${loaded.migratedFrom} to v3 in this browser. Nothing was sent anywhere.`);
  } else announce("Workspace loaded from this browser. Nothing was sent anywhere.");
  render();
})();
