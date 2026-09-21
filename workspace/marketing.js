/* Local marketing desk UI. Renders untrusted text through escapeHtml only. */
(function () {
  "use strict";

  const lib = window.MarketingStore;
  const store = lib.createStore();
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  const TABS = ["products", "projects", "assets", "reviews"];
  const statusEl = $("#live-status");
  const dialog = $("#record-dialog");
  const form = $("#record-form");
  const fields = $("#form-fields");
  const dialogTitle = $("#dialog-title");
  let currentKind = "product";
  let editingId = null;
  let activeTab = "products";
  let selected = { products: null, projects: null, assets: null, reviews: null };

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

  function channelOptions(selectedId) {
    return lib.CHANNELS.map(
      (channel) =>
        `<option value="${lib.escapeHtml(channel.id)}"${channel.id === selectedId ? " selected" : ""}>${lib.escapeHtml(channel.label)}</option>`
    ).join("");
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
    return `<div class="field"><label for="${id}">${lib.escapeHtml(cfg.label)}</label><input id="${id}" name="${lib.escapeHtml(cfg.name)}" type="${lib.escapeHtml(cfg.type || "text")}" value="${lib.escapeHtml(value)}"${required} /></div>`;
  }

  function productName(id, state) {
    return state.products.find((item) => item.id === id)?.name || "Unlinked";
  }

  function projectName(id, state) {
    return state.projects.find((item) => item.id === id)?.name || "Unlinked";
  }

  function assetName(id, state) {
    return state.assets.find((item) => item.id === id)?.name || "Unknown asset";
  }

  function metricLine(review) {
    if (!review.metricName && review.metricValue == null) return "Metric: unknown (not recorded)";
    if (review.metricValue == null) return `Metric ${review.metricName}: unknown`;
    return `Metric ${review.metricName}: ${review.metricValue} (${review.evidenceStatus})`;
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

  function setTab(tab, options) {
    const next = TABS.includes(tab) ? tab : "products";
    activeTab = next;
    $$(".desk-tab").forEach((button) => {
      const on = button.dataset.tab === next;
      button.setAttribute("aria-selected", on ? "true" : "false");
      button.tabIndex = on ? 0 : -1;
    });
    TABS.forEach((name) => {
      const panel = $(`#panel-${name}`);
      if (panel) panel.hidden = name !== next;
    });
    if (!options || options.updateHash !== false) {
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

  function renderOverview(state) {
    const summary = lib.summarizeWorkspace(state);
    const emptyEl = $("#overview-empty");
    const statsEl = $("#overview-stats");
    emptyEl.hidden = !summary.isEmpty;
    statsEl.hidden = summary.isEmpty;
    if (summary.isEmpty) return summary;
    const labels = [
      ["products", "Products"],
      ["projects", "Projects"],
      ["assets", "Assets"],
      ["reviews", "Reviews"],
    ];
    $("#stat-grid").innerHTML = labels
      .map(
        ([key, label]) =>
          `<li class="stat"><span class="n">${lib.escapeHtml(String(summary.counts[key]))}</span><span class="l mono">${lib.escapeHtml(label)}</span></li>`
      )
      .join("");
    $("#evidence-line").innerHTML = `Reviews by evidence status
      <span class="evidence-chips">
        <span class="badge observed">observed ${lib.escapeHtml(String(summary.evidence.observed))}</span>
        <span class="badge reported">reported ${lib.escapeHtml(String(summary.evidence.reported))}</span>
        <span class="badge unknown">unknown ${lib.escapeHtml(String(summary.evidence.unknown))}</span>
      </span>`;
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
            <p class="meta">${asset} · ${lib.escapeHtml(item.observationDate || "date unknown")} · evidence ${lib.escapeHtml(item.evidenceStatus)}</p>
            <p>${item.finding ? lib.escapeHtml(item.finding) : "Finding not recorded."}</p>
          </div>
          <button type="button" class="btn ghost" data-focus-review="${lib.escapeHtml(item.reviewId)}">Open review</button>
        </li>`;
      })
      .join("");
  }

  function renderDetail(kind, record, state) {
    const el = $(`#${kind}-detail`);
    if (!el) return;
    if (!record) {
      el.innerHTML = `<p class="meta">Select a record to read it. Keyboard: arrow keys move between desk tabs.</p>`;
      return;
    }
    if (kind === "product") {
      el.innerHTML = `<h3>${lib.escapeHtml(record.name)}</h3>${dl([
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
    if (kind === "asset") {
      el.innerHTML = `<h3>${lib.escapeHtml(record.name)}</h3>
        <span class="badge">${lib.escapeHtml(record.kind === "product_surface" ? "Product surface" : "Content")}</span>
        <span class="badge">${lib.escapeHtml(lib.channelLabel(record.channel))}</span>
        ${dl([
          { label: "Product", value: record.productId ? productName(record.productId, state) : "No product" },
          { label: "Project", value: record.projectId ? projectName(record.projectId, state) : "No project" },
          { label: "Format", value: record.format },
          { label: "Message", value: record.message },
          { label: "Source URL", value: record.sourceUrl || "Unknown" },
          { label: "Notes", value: record.notes },
        ])}${cardActions("asset", record.id)}`;
      return;
    }
    el.innerHTML = `<h3>${lib.escapeHtml(assetName(record.assetId, state))}</h3>
      <span class="badge note">Pre-publish evidence note</span>
      <span class="badge ${lib.escapeHtml(record.evidenceStatus)}">Evidence: ${lib.escapeHtml(record.evidenceStatus)}</span>
      <span class="badge">${lib.escapeHtml(lib.channelLabel(record.channel))}</span>
      ${dl([
        { label: "Observation date", value: record.observationDate },
        { label: "Audience", value: record.intendedAudience },
        { label: "Desired outcome / CTA", value: record.desiredOutcome },
        { label: "Source URL", value: record.sourceUrl || "None" },
        { label: "Source note", value: record.sourceNote },
        { label: "Metric", value: metricLine(record) },
        { label: "Finding", value: record.finding },
        { label: "Next action", value: record.nextAction || "Not recorded" },
      ])}${cardActions("review", record.id)}`;
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

    $("#filter-product").innerHTML = optionList(state.products, filters.productId, "All products");
    $("#filter-project").innerHTML = optionList(state.projects, filters.projectId, "All projects");

    const productSelected = view.products.some((item) => item.id === selected.products)
      ? selected.products
      : null;
    selected.products = productSelected;
    renderList(
      $("#product-list"),
      view.products,
      "No products yet. Create an ongoing offering to start the desk.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="product" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.name)}</h3>
          <p class="meta">Ongoing offering</p>
          <p>${lib.escapeHtml(item.audience || "Audience not recorded")}</p>
        </button>
      </li>`,
      productSelected
    );
    renderDetail("product", view.products.find((item) => item.id === productSelected) || null, state);

    const projectSelected = view.projects.some((item) => item.id === selected.projects)
      ? selected.projects
      : null;
    selected.projects = projectSelected;
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
      projectSelected
    );
    renderDetail("project", view.projects.find((item) => item.id === projectSelected) || null, state);

    const assetSelected = view.assets.some((item) => item.id === selected.assets)
      ? selected.assets
      : null;
    selected.assets = assetSelected;
    renderList(
      $("#asset-list"),
      view.assets,
      "No assets yet. Add a content asset or product surface linked to a product or project.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="asset" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(item.name)}</h3>
          <span class="badge">${lib.escapeHtml(item.kind === "product_surface" ? "Product surface" : "Content")}</span>
          <span class="badge">${lib.escapeHtml(lib.channelLabel(item.channel))}</span>
          <p class="meta">${lib.escapeHtml(item.productId ? productName(item.productId, state) : "No product")} · ${lib.escapeHtml(item.projectId ? projectName(item.projectId, state) : "No project")}</p>
        </button>
      </li>`,
      assetSelected
    );
    renderDetail("asset", view.assets.find((item) => item.id === assetSelected) || null, state);

    const reviewSelected = view.reviews.some((item) => item.id === selected.reviews)
      ? selected.reviews
      : null;
    selected.reviews = reviewSelected;
    renderList(
      $("#review-list"),
      view.reviews,
      "No reviews yet. Record an evidence-backed note. Missing metrics stay unknown.",
      (item, on) => `<li>
        <button type="button" class="card${on ? " is-selected" : ""}" data-select="review" data-id="${lib.escapeHtml(item.id)}">
          <h3>${lib.escapeHtml(assetName(item.assetId, state))}</h3>
          <span class="badge note">Pre-publish note</span>
          <span class="badge ${lib.escapeHtml(item.evidenceStatus)}">Evidence: ${lib.escapeHtml(item.evidenceStatus)}</span>
          <p class="meta">${lib.escapeHtml(item.observationDate)} · ${lib.escapeHtml(item.nextAction ? "Next action recorded" : "No next action")}</p>
          <p>${lib.escapeHtml(item.finding)}</p>
        </button>
      </li>`,
      reviewSelected
    );
    renderDetail("review", view.reviews.find((item) => item.id === reviewSelected) || null, state);
  }

  function fieldsFor(kind, record, state) {
    if (kind === "product") {
      return [
        { name: "name", label: "Product name", value: record?.name, required: true },
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
    if (kind === "asset") {
      return [
        { name: "name", label: "Asset name", value: record?.name, required: true },
        { name: "kind", label: "Asset kind", type: "select", options: `<option value="content"${record?.kind !== "product_surface" ? " selected" : ""}>Content</option><option value="product_surface"${record?.kind === "product_surface" ? " selected" : ""}>Product surface</option>` },
        { name: "productId", label: "Product", type: "select", options: optionList(state.products, record?.productId || "", "No product") },
        { name: "projectId", label: "Project", type: "select", options: optionList(state.projects, record?.projectId || "", "No project") },
        { name: "channel", label: "Channel", type: "select", required: true, options: channelOptions(record?.channel || "website_search") },
        { name: "format", label: "Format", value: record?.format },
        { name: "message", label: "Message", type: "textarea", value: record?.message },
        { name: "sourceUrl", label: "Source URL (http or https)", type: "url", value: record?.sourceUrl },
        { name: "notes", label: "Notes", type: "textarea", value: record?.notes },
      ];
    }
    return [
      { name: "assetId", label: "Asset", type: "select", required: true, options: optionList(state.assets, record?.assetId || "", "Select an asset") },
      { name: "channel", label: "Channel observed", type: "select", required: true, options: channelOptions(record?.channel || "website_search") },
      { name: "intendedAudience", label: "Intended audience", value: record?.intendedAudience },
      { name: "desiredOutcome", label: "Desired outcome / CTA", type: "textarea", value: record?.desiredOutcome },
      { name: "sourceUrl", label: "Source URL (http or https)", type: "url", value: record?.sourceUrl },
      { name: "sourceNote", label: "Source note", type: "textarea", value: record?.sourceNote },
      { name: "observationDate", label: "Observation date", type: "date", required: true, value: record?.observationDate },
      { name: "evidenceStatus", label: "Evidence status", type: "select", required: true, options: lib.EVIDENCE_STATUSES.map((status) => `<option value="${status}"${(record?.evidenceStatus || "unknown") === status ? " selected" : ""}>${status}</option>`).join("") },
      { name: "metricName", label: "Metric name (optional)", value: record?.metricName },
      { name: "metricValue", label: "Metric value (blank = unknown, never invent zero)", value: record?.metricValue == null ? "" : record.metricValue },
      { name: "finding", label: "Finding", type: "textarea", required: true, value: record?.finding },
      { name: "nextAction", label: "Next action", type: "textarea", value: record?.nextAction },
    ];
  }

  function openEditor(kind, id) {
    const state = store.getState();
    const listName = kind + "s";
    const record = id ? state[listName].find((item) => item.id === id) : null;
    if (id && !record) {
      showError("That record is no longer in this browser.");
      return;
    }
    currentKind = kind;
    editingId = id;
    const titles = {
      product: id ? "Edit product" : "Create product",
      project: id ? "Edit project" : "Create project",
      asset: id ? "Edit asset" : "Create asset",
      review: id ? "Edit review" : "Record review",
    };
    dialogTitle.textContent = titles[kind];
    fields.innerHTML = fieldsFor(kind, record, state).map(fieldHtml).join("");
    if (!dialog.open) dialog.showModal();
    const first = fields.querySelector("input, select, textarea");
    if (first) first.focus();
  }

  function readForm() {
    const data = {};
    $$("[name]", form).forEach((el) => {
      data[el.name] = el.value;
    });
    if (editingId) data.id = editingId;
    return data;
  }

  function saveForm(event) {
    event.preventDefault();
    const input = readForm();
    const writers = {
      product: (payload) => store.upsertProduct(payload),
      project: (payload) => store.upsertProject(payload),
      asset: (payload) => store.upsertAsset(payload),
      review: (payload) => store.upsertReview(payload),
    };
    const result = writers[currentKind](input);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    const savedId = result.record ? result.record.id : editingId;
    if (savedId) selected[currentKind + "s"] = savedId;
    setTab(currentKind + "s");
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
      selected = { products: null, projects: null, assets: null, reviews: null };
      announce("Import accepted after validation. Previous workspace in this browser was replaced.");
      render();
    };
    reader.readAsText(file);
  }

  function focusReview(id) {
    selected.reviews = id;
    setTab("reviews");
    render();
    const card = $(`[data-select="review"][data-id="${CSS.escape(id)}"]`);
    if (card) card.focus();
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      setTab(tab.dataset.tab);
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
        const list = remove.dataset.delete + "s";
        if (selected[list] === remove.dataset.id) selected[list] = null;
        announce("Record deleted from this browser.");
        render();
      }
    }
    const select = event.target.closest("[data-select]");
    if (select) {
      selected[select.dataset.select + "s"] = select.dataset.id;
      render();
    }
    const focus = event.target.closest("[data-focus-review]");
    if (focus) focusReview(focus.dataset.focusReview);
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
    selected = { products: null, projects: null, assets: null, reviews: null };
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
    selected = { products: null, projects: null, assets: null, reviews: null };
    announce("This browser workspace is empty.");
    render();
  });
  $("#filter-product").addEventListener("change", render);
  $("#filter-project").addEventListener("change", render);

  $("#desk-tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = TABS.indexOf(activeTab);
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % TABS.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABS.length - 1;
    setTab(TABS[next]);
    $(`#tab-${TABS[next]}`).focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.open) dialog.close();
  });

  window.addEventListener("hashchange", () => {
    const tab = location.hash.replace("#", "");
    if (TABS.includes(tab)) setTab(tab, { updateHash: false });
  });

  const hashTab = location.hash.replace("#", "");
  setTab(TABS.includes(hashTab) ? hashTab : "products", { updateHash: false });

  const loaded = store.load();
  if (!loaded.ok) showError(loaded.error);
  else announce("Workspace loaded from this browser. Nothing was sent anywhere.");
  render();
})();
