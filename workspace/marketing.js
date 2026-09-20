/* Local marketing workspace UI. Renders untrusted text through escapeHtml only. */
(function () {
  "use strict";

  const lib = window.MarketingStore;
  const store = lib.createStore();
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  const statusEl = $("#live-status");
  const dialog = $("#record-dialog");
  const form = $("#record-form");
  const fields = $("#form-fields");
  const dialogTitle = $("#dialog-title");
  let currentKind = "product";
  let editingId = null;

  function announce(message, kind) {
    statusEl.dataset.kind = kind || "ok";
    statusEl.textContent = message;
  }

  function showError(message) {
    announce(message, "error");
  }

  function optionList(items, selected, blankLabel) {
    const blank = `<option value="">${lib.escapeHtml(blankLabel)}</option>`;
    return (
      blank +
      items
        .map(
          (item) =>
            `<option value="${lib.escapeHtml(item.id)}"${item.id === selected ? " selected" : ""}>${lib.escapeHtml(item.name)}</option>`
        )
        .join("")
    );
  }

  function channelOptions(selected) {
    return lib.CHANNELS.map(
      (channel) =>
        `<option value="${lib.escapeHtml(channel.id)}"${channel.id === selected ? " selected" : ""}>${lib.escapeHtml(channel.label)}</option>`
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

  function cardActions(kind, id) {
    return `<div class="card-actions">
      <button type="button" class="btn secondary" data-edit="${lib.escapeHtml(kind)}" data-id="${lib.escapeHtml(id)}">Edit</button>
      <button type="button" class="btn danger" data-delete="${lib.escapeHtml(kind)}" data-id="${lib.escapeHtml(id)}">Delete</button>
    </div>`;
  }

  function renderList(el, items, emptyText, toCard) {
    if (!items.length) {
      el.innerHTML = `<li class="empty">${lib.escapeHtml(emptyText)}</li>`;
      return;
    }
    el.innerHTML = items.map(toCard).join("");
  }

  function render() {
    const state = store.getState();
    const filters = {
      productId: $("#filter-product").value,
      projectId: $("#filter-project").value,
    };
    const view = store.filterRecords(filters);

    $("#filter-product").innerHTML = optionList(state.products, filters.productId, "All products");
    $("#filter-project").innerHTML = optionList(state.projects, filters.projectId, "All projects");

    renderList(
      $("#product-list"),
      view.products,
      "No products yet. Create an ongoing offering to start the workspace.",
      (item) => `<li class="card">
        <h3>${lib.escapeHtml(item.name)}</h3>
        <p class="meta">Ongoing offering</p>
        <p>${lib.escapeHtml(item.audience || "Audience not recorded")}</p>
        ${cardActions("product", item.id)}
      </li>`
    );

    renderList(
      $("#project-list"),
      view.projects,
      "No projects yet. A project is a bounded effort, optionally linked to a product.",
      (item) => `<li class="card">
        <h3>${lib.escapeHtml(item.name)}</h3>
        <p class="meta">Product: ${lib.escapeHtml(item.productId ? productName(item.productId, state) : "None")}</p>
        <p>${lib.escapeHtml(item.outcome || "Outcome not recorded")}</p>
        ${cardActions("project", item.id)}
      </li>`
    );

    renderList(
      $("#asset-list"),
      view.assets,
      "No assets yet. Add a content asset or product surface linked to a product or project.",
      (item) => `<li class="card">
        <h3>${lib.escapeHtml(item.name)}</h3>
        <span class="badge">${lib.escapeHtml(item.kind === "product_surface" ? "Product surface" : "Content")}</span>
        <span class="badge">${lib.escapeHtml(lib.channelLabel(item.channel))}</span>
        <p class="meta">${lib.escapeHtml(item.productId ? productName(item.productId, state) : "No product")} · ${lib.escapeHtml(item.projectId ? projectName(item.projectId, state) : "No project")}</p>
        <p>${item.sourceUrl ? `Source: ${lib.escapeHtml(item.sourceUrl)}` : "Source URL unknown"}</p>
        ${cardActions("asset", item.id)}
      </li>`
    );

    renderList(
      $("#review-list"),
      view.reviews,
      "No reviews yet. Record an evidence-backed note. Missing metrics stay unknown.",
      (item) => `<li class="card">
        <h3>${lib.escapeHtml(assetName(item.assetId, state))}</h3>
        <span class="badge ${lib.escapeHtml(item.evidenceStatus)}">Evidence: ${lib.escapeHtml(item.evidenceStatus)}</span>
        <span class="badge">${lib.escapeHtml(lib.channelLabel(item.channel))}</span>
        <p class="meta">${lib.escapeHtml(item.observationDate)} · ${lib.escapeHtml(metricLine(item))}</p>
        <p><strong>Audience.</strong> ${lib.escapeHtml(item.intendedAudience || "Not recorded")}</p>
        <p><strong>Desired outcome.</strong> ${lib.escapeHtml(item.desiredOutcome || "Not recorded")}</p>
        <p><strong>Finding.</strong> ${lib.escapeHtml(item.finding)}</p>
        <p><strong>Next action.</strong> ${lib.escapeHtml(item.nextAction || "Not recorded")}</p>
        ${cardActions("review", item.id)}
      </li>`
    );
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
      { name: "desiredOutcome", label: "Desired outcome", type: "textarea", value: record?.desiredOutcome },
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
      announce("Import accepted after validation. Previous workspace in this browser was replaced.");
      render();
    };
    reader.readAsText(file);
  }

  document.addEventListener("click", (event) => {
    const create = event.target.closest("[data-create]");
    if (create) openEditor(create.dataset.create, null);
    const edit = event.target.closest("[data-edit]");
    if (edit) openEditor(edit.dataset.edit, edit.dataset.id);
    const remove = event.target.closest("[data-delete]");
    if (remove) {
      const result = store.deleteRecord(remove.dataset.delete, remove.dataset.id);
      if (!result.ok) showError(result.error);
      else {
        announce("Record deleted from this browser.");
        render();
      }
    }
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
    announce("This browser workspace is empty.");
    render();
  });
  $("#filter-product").addEventListener("change", render);
  $("#filter-project").addEventListener("change", render);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.open) dialog.close();
  });

  const loaded = store.load();
  if (!loaded.ok) showError(loaded.error);
  else announce("Workspace loaded from this browser. Nothing was sent anywhere.");
  render();
})();
