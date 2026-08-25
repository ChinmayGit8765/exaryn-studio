/* Exaryn — the tech guides.

   Guides are notes in the vault (brain/guides/*.md) with `type: guide`. This
   page reads the same data/brain.json the brain does and gives them a proper
   long-form reading surface: index with filters at #, one guide at #/slug.

   Adding a guide is adding a markdown file and running `npm run brain`.

   Wrapped in an IIFE — assets/app.js loads alongside for the clock and shares
   the global scope. */

(() => {

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = ExarynMD.esc;

let GUIDES = [];        // guide notes, in author order
let NOTES = new Map();  // id -> note, for wikilink resolution
let INDEX = new Map();  // lowercased name -> id
let filter = { level: "all", stack: null };

const slugOf = (note) => note.id.split("/").pop().toLowerCase().replace(/\s+/g, "-");
const bySlug = (slug) => GUIDES.find((g) => slugOf(g) === slug);

const LEVEL_RANK = { beginner: 1, intermediate: 2, advanced: 3 };

/* Wikilinks inside a guide: another guide stays on this page, anything else
   opens in the brain. */
function hrefFor(id) {
  const note = NOTES.get(id);
  if (note && note.folder === "guides") return `#/${slugOf(note)}`;
  return `brain.html#/${encodeURI(id)}`;
}

const resolve = (name) => INDEX.get(String(name).toLowerCase()) || null;

/* ================= index view ================= */

function stackVocabulary() {
  const counts = new Map();
  for (const g of GUIDES) {
    for (const tech of g.meta.stack || []) counts.set(tech, (counts.get(tech) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)          // a chip that matches one guide isn't a filter
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function renderStackFilter() {
  const row = $("#stack-filter");
  row.innerHTML =
    `<span class="filter-label">STACK</span>` +
    `<button class="chip${filter.stack ? "" : " active"}" data-stack="">ALL</button>` +
    stackVocabulary()
      .map(([tech, n]) =>
        `<button class="chip${filter.stack === tech ? " active" : ""}" data-stack="${esc(tech)}">${esc(tech)}<span>${n}</span></button>`)
      .join("");
}

function visible() {
  return GUIDES.filter((g) => {
    if (filter.level !== "all" && g.meta.level !== filter.level) return false;
    if (filter.stack && !(g.meta.stack || []).includes(filter.stack)) return false;
    return true;
  });
}

function renderIndex() {
  const list = visible();
  const grid = $("#guide-grid");

  if (!list.length) {
    grid.innerHTML = `<li class="index-empty mono">NOTHING MATCHES THAT COMBINATION.</li>`;
    return;
  }

  grid.innerHTML = list
    .map((g, i) => {
      const m = g.meta;
      const built = m.built
        ? `<span class="guide-built mono">FROM <b>${esc(m.built)}</b></span>`
        : "";
      return `
      <li class="guide-card" data-level="${esc(m.level || "")}">
        <a href="#/${slugOf(g)}">
          <span class="guide-num mono">${String(i + 1).padStart(2, "0")}</span>
          <span class="guide-meta-row mono">
            <span class="level level-${esc(m.level || "")}">${esc(m.level || "guide")}</span>
            <span class="guide-time">${esc(m.time || "")}</span>
          </span>
          <h2 class="guide-card-title">${esc(g.title)}</h2>
          <p class="guide-card-desc">${esc(m.summary || "")}</p>
          <span class="guide-stack mono">${(m.stack || []).map((s) => `<span>${esc(s)}</span>`).join("")}</span>
          <span class="guide-card-foot mono">${built}<span class="guide-go">READ →</span></span>
        </a>
      </li>`;
    })
    .join("");
}

/* ================= reader view ================= */

function renderGuide(guide) {
  const m = guide.meta;
  const { html, headings } = ExarynMD.render(guide.body, { resolve, hrefFor });

  // The note body opens with its own H1; the page header already shows it.
  $("#guide-body").innerHTML = html.replace(/^<h1[^>]*>.*?<\/h1>\n?/, "");

  $("#guide-kicker").textContent = `${m.level || "GUIDE"} · ${m.time || ""}`.toUpperCase();
  $("#guide-title").textContent = guide.title;
  $("#guide-summary").textContent = m.summary || "";

  const facts = [
    ["LEVEL", m.level],
    ["TIME", m.time],
    ["STACK", (m.stack || []).join(" · ")],
    ["BUILT FROM", m.built],
  ].filter(([, v]) => v);
  $("#guide-facts").innerHTML = facts
    .map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`)
    .join("");

  $("#guide-toc-list").innerHTML = headings
    .map((h, i) => `<li class="lvl-${h.level}"><a class="${i ? "" : "active"}" href="#h-${esc(h.slug)}">${esc(h.text)}</a></li>`)
    .join("");
  $("#guide-in-brain").href = `brain.html#/${encodeURI(guide.id)}`;

  const idx = GUIDES.indexOf(guide);
  const prev = GUIDES[idx - 1];
  const next = GUIDES[idx + 1];
  $("#guide-nav").innerHTML = `
    ${prev ? `<a class="guide-prev" href="#/${slugOf(prev)}">
        <span class="mono">← PREVIOUS</span><span class="guide-nav-name">${esc(prev.title)}</span></a>` : "<span></span>"}
    ${next ? `<a class="guide-next" href="#/${slugOf(next)}">
        <span class="mono">NEXT →</span><span class="guide-nav-name">${esc(next.title)}</span></a>` : "<span></span>"}`;

  document.title = `${guide.title} — Exaryn Guides`;
}

/* Highlight the contents entry for whatever section is on screen. */
function watchHeadings() {
  const targets = $$("#guide-body h2[id], #guide-body h3[id]");
  if (!targets.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        $$("#guide-toc-list a").forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
      }
    },
    { rootMargin: "-80px 0px -70% 0px" }
  );
  targets.forEach((t) => io.observe(t));
}

/* ================= routing ================= */

function route() {
  const slug = decodeURI(location.hash.replace(/^#\/?/, "")).trim();
  const guide = slug && bySlug(slug);

  if (guide) {
    $("#guide-index").hidden = true;
    $("#guide-reader").hidden = false;
    renderGuide(guide);
    watchHeadings();
    window.scrollTo({ top: 0 });
    return;
  }

  $("#guide-reader").hidden = true;
  $("#guide-index").hidden = false;
  document.title = "Guides — Exaryn";
  // A stale #/unknown-slug shouldn't leave the reader half-open.
  if (slug) history.replaceState(null, "", location.pathname);
}

async function boot() {
  let vault;
  try {
    const res = await fetch("data/brain.json");
    if (!res.ok) throw new Error(res.status);
    vault = await res.json();
  } catch {
    $("#guide-grid").innerHTML =
      `<li class="index-empty mono">COULDN'T LOAD THE GUIDES — IF YOU'RE ON file://, RUN: npm run dev</li>`;
    return;
  }

  NOTES = new Map(vault.notes.map((n) => [n.id, n]));
  INDEX = new Map();
  for (const n of vault.notes) {
    const add = (k) => { const key = String(k).toLowerCase(); if (!INDEX.has(key)) INDEX.set(key, n.id); };
    add(n.title);
    add(n.id.split("/").pop());
    add(n.id);
    (n.aliases || []).forEach(add);
  }

  GUIDES = vault.notes
    .filter((n) => n.type === "guide")
    .sort((a, b) =>
      (Number(a.meta.order) || 99) - (Number(b.meta.order) || 99) ||
      (LEVEL_RANK[a.meta.level] || 9) - (LEVEL_RANK[b.meta.level] || 9) ||
      a.title.localeCompare(b.title));

  $("#lede-count").textContent = GUIDES.length;
  renderStackFilter();
  renderIndex();
  route();
  window.addEventListener("hashchange", route);

  $("#level-filter").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    filter.level = chip.dataset.level;
    $$("#level-filter .chip").forEach((c) => c.classList.toggle("active", c === chip));
    renderIndex();
  });

  $("#stack-filter").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    filter.stack = chip.dataset.stack || null;
    renderStackFilter();
    renderIndex();
  });
}

boot();

})();
