/* Exaryn — renders the project index and the daily signal feed.
   Page-aware: index.html gets compact snippets, projects.html gets the
   expandable index, feed.html gets the full filterable feed.
   All data lives in /data as JSON; no framework, no build step. */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- clock (Melbourne time) ---------- */

function tickClock() {
  const el = $("#clock");
  if (!el) return;
  const t = new Date().toLocaleTimeString("en-AU", {
    timeZone: "Australia/Melbourne",
    hour12: false,
  });
  el.textContent = `MEL ${t}`;
}
tickClock();
setInterval(tickClock, 1000);
$("#year") && ($("#year").textContent = new Date().getFullYear());

/* ---------- relative time ---------- */

function ago(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/* ================= PROJECTS ================= */

async function fetchProjects() {
  const res = await fetch("data/projects.json");
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

function projectRow(p, { expandable }) {
  const visit = p.links?.live || p.links?.demo || p.links?.repo || "";
  const status =
    p.status && p.status !== "shipped" ? ` <span class="status">[${esc(p.status)}]</span>` : "";

  const head = `
    <span class="num" aria-hidden="true"></span>
    <span class="project-name">${esc(p.name)}</span>
    <span class="project-desc">${esc(p.tagline || "")}</span>
    <span class="project-tech">${esc((p.tech || []).slice(0, 3).join(" / "))}${status}</span>
    ${
      visit
        ? `<a class="visit mono" href="${esc(visit)}" target="_blank" rel="noopener"
             aria-label="Visit ${esc(p.name)}" title="Open ${esc(p.name)}">VISIT&nbsp;↗</a>`
        : `<span class="visit mono empty">—</span>`
    }
    ${expandable ? `<span class="toggle" aria-hidden="true">+</span>` : ""}`;

  if (!expandable) {
    return `<li class="project-row compact">${
      visit
        ? `<a class="row-head" href="${esc(visit)}" target="_blank" rel="noopener">${head}</a>`
        : `<div class="row-head">${head}</div>`
    }</li>`;
  }

  const linkBtns = [
    p.links?.demo ? `<a href="${esc(p.links.demo)}" target="_blank" rel="noopener">WATCH DEMO ▶</a>` : "",
    p.links?.live ? `<a href="${esc(p.links.live)}" target="_blank" rel="noopener">LIVE SITE ↗</a>` : "",
    p.links?.repo ? `<a href="${esc(p.links.repo)}" target="_blank" rel="noopener">SOURCE ↗</a>` : "",
  ].join("");

  return `
  <li class="project-row">
    <div class="row-head" role="button" tabindex="0" aria-expanded="false">${head}</div>
    <div class="row-detail">
      <div class="detail-inner">
        <p class="detail-desc">${esc(p.description || p.tagline || "")}</p>
        <dl class="detail-meta">
          <div><dt class="mono">STACK</dt><dd>${esc((p.tech || []).join(", "))}</dd></div>
          <div><dt class="mono">DEV TIME</dt><dd>${esc(p.devTime || "—")}</dd></div>
          <div><dt class="mono">STATUS</dt><dd>${esc(p.status || "—")} · ${esc(p.year || "")}</dd></div>
        </dl>
        ${linkBtns ? `<div class="detail-links mono">${linkBtns}</div>` : ""}
      </div>
    </div>
  </li>`;
}

function wireAccordion(list) {
  list.addEventListener("click", (e) => {
    if (e.target.closest("a")) return; // VISIT / detail links navigate, never toggle
    const head = e.target.closest(".row-head");
    if (!head) return;
    const row = head.closest(".project-row");
    const open = row.classList.toggle("open");
    head.setAttribute("aria-expanded", open);
  });
  list.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const head = e.target.closest('.row-head[role="button"]');
    if (!head) return;
    e.preventDefault();
    head.click();
  });
}

async function loadProjects() {
  const full = $("#project-index");
  const snippet = $("#project-snippet");
  if (!full && !snippet) return;
  try {
    const projects = await fetchProjects();
    const count = String(projects.length).padStart(2, "0");
    $("#project-count") && ($("#project-count").textContent = count);
    $("#snippet-total") && ($("#snippet-total").textContent = count);

    if (full) {
      full.innerHTML = projects.map((p) => projectRow(p, { expandable: true })).join("");
      wireAccordion(full);
    }
    if (snippet) {
      snippet.innerHTML = projects
        .slice(0, 4)
        .map((p) => projectRow(p, { expandable: false }))
        .join("");
    }
  } catch (err) {
    const msg = `<li class="index-empty mono">COULDN'T LOAD PROJECTS — IF YOU'RE ON file://, RUN: npm run dev</li>`;
    full && (full.innerHTML = msg);
    snippet && (snippet.innerHTML = msg);
  }
}

/* ================= DAILY SIGNAL ================= */

let feedItems = [];
let activeKind = "all";
let liveDigest = null;

function fmtDay(iso) {
  return new Date(iso + "T00:00:00Z")
    .toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .toUpperCase();
}

function applyDigest(digest, dayLabel) {
  feedItems = digest.items || [];
  const updated = $("#feed-updated");
  if (updated) {
    updated.textContent = dayLabel
      ? `VIEWING ${dayLabel}`
      : digest.generated_at
        ? `UPDATED ${ago(digest.generated_at).toUpperCase()}`
        : "UPDATED —";
  }
  const counts = { all: feedItems.length, news: 0, video: 0, paper: 0 };
  for (const i of feedItems) counts[i.kind] = (counts[i.kind] || 0) + 1;
  $$("[data-count]").forEach((el) => {
    el.textContent = counts[el.dataset.count] ?? 0;
  });
  renderFeed();
}

function feedItemHTML(i) {
  const tag = i.kind === "video" ? "▶ " : i.kind === "paper" ? "§ " : "";
  const thumb =
    i.kind === "video" && i.thumbnail
      ? `<img class="thumb" src="${esc(i.thumbnail)}" alt="" loading="lazy" />`
      : "";
  const summary = i.summary ? `<span class="summary">${esc(i.summary)}</span>` : "";
  return `
  <li class="feed-item">
    <a href="${esc(i.url)}" target="_blank" rel="noopener">
      <span class="when">${ago(i.published)}</span>
      <span class="body">
        <span class="src"><span class="tag">${tag}</span>${esc(i.source)}</span>
        <span class="title">${esc(i.title)}</span>
        ${summary}
        ${thumb}
      </span>
      <span class="go" aria-hidden="true">↗</span>
    </a>
  </li>`;
}

function renderFeed() {
  const list = $("#feed-list");
  if (!list) return;
  const items =
    activeKind === "all" ? feedItems : feedItems.filter((i) => i.kind === activeKind);
  list.innerHTML = items.length
    ? items.map(feedItemHTML).join("")
    : `<li class="feed-empty mono">NOTHING HERE YET.</li>`;
}

async function loadFeed() {
  const list = $("#feed-list");
  const snippet = $("#feed-snippet");
  if (!list && !snippet) return;
  try {
    const res = await fetch("data/digest.json");
    if (!res.ok) throw new Error(res.status);
    const digest = await res.json();
    liveDigest = digest;
    feedItems = digest.items || [];

    const updated = $("#feed-updated");
    if (updated && digest.generated_at) {
      updated.textContent = `UPDATED ${ago(digest.generated_at).toUpperCase()}`;
    }

    if (list) {
      applyDigest(digest, null);
      loadArchive();
    }
    if (snippet) {
      snippet.innerHTML = feedItems
        .filter((i) => i.kind !== "paper") // landing teaser: headlines + videos only
        .slice(0, 6)
        .map(feedItemHTML)
        .join("");
    }
  } catch (err) {
    const msg = `<li class="feed-empty mono">NO SIGNAL — RUN npm run digest, OR WAIT FOR THE MORNING CRON.</li>`;
    list && (list.innerHTML = msg);
    snippet && (snippet.innerHTML = msg);
  }
}

async function loadArchive() {
  const wrap = $("#feed-archive");
  const listEl = $("#archive-list");
  if (!wrap || !listEl) return;
  try {
    const res = await fetch("data/archive/index.json");
    if (!res.ok) return;
    const { days = [] } = await res.json();
    if (!days.length) return;
    wrap.hidden = false;
    listEl.innerHTML =
      `<button class="day-btn mono active" data-day="latest">LATEST</button>` +
      days
        .map(
          (d) =>
            `<button class="day-btn mono" data-day="${esc(d.date)}">${fmtDay(d.date)}
             <span class="count">${d.count}</span></button>`
        )
        .join("");
  } catch {
    /* no archive yet — section stays hidden */
  }
}

$("#archive-list")?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".day-btn");
  if (!btn) return;
  $$(".day-btn").forEach((b) => b.classList.toggle("active", b === btn));
  const day = btn.dataset.day;
  try {
    if (day === "latest") {
      applyDigest(liveDigest || { items: [] }, null);
    } else {
      const res = await fetch(`data/archive/${day}.json`);
      if (!res.ok) throw new Error(res.status);
      applyDigest(await res.json(), fmtDay(day));
    }
    $(".feed-pane")?.scrollTo({ top: 0 });
  } catch {
    $("#feed-list").innerHTML = `<li class="feed-empty mono">COULDN'T LOAD THAT DAY.</li>`;
  }
});

$("#feed-filters")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  activeKind = btn.dataset.kind;
  $$(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
  renderFeed();
  $(".feed-pane")?.scrollTo({ top: 0 });
});

/* ================= TOKEN METER ================= */

const compact = (n) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

async function loadTokenMeter() {
  const section = $("#token-meter");
  const cellsEl = $("#meter-cells");
  if (!section || !cellsEl) return;
  try {
    const res = await fetch("data/stats.json");
    if (!res.ok) throw new Error(res.status);
    const {
      claudeTokens = 0,
      tokenBudget = 0,
      goalNote = "",
      blendedRatePerMTok = 0,
    } = await res.json();
    const dollars = (claudeTokens / 1e6) * blendedRatePerMTok;

    const CELLS = 30;
    const pct = tokenBudget ? Math.min(1, claudeTokens / tokenBudget) : 0;
    const lit = Math.max(1, Math.round(pct * CELLS));
    cellsEl.innerHTML = "<i></i>".repeat(CELLS);
    $("#token-sub").textContent = tokenBudget
      ? `/ ${compact(tokenBudget)} ${goalNote} · APPROX.`.replace("  ", " ")
      : "· APPROX.";

    const animate = () => {
      // cells light up left to right
      $$("i", cellsEl).forEach((cell, idx) => {
        if (idx < lit) setTimeout(() => cell.classList.add("on"), 40 * idx);
      });
      // numbers count up alongside
      const valueEl = $("#token-value");
      const dollarsEl = $("#token-dollars");
      const dur = 40 * lit + 300;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        valueEl.textContent = `≈ ${compact(claudeTokens * eased)}`;
        if (dollars && dollarsEl) {
          dollarsEl.textContent = `≈ $${compact(dollars * eased)} API-EQUIV THIS YEAR`;
        }
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      $$("i", cellsEl).forEach((cell, idx) => idx < lit && cell.classList.add("on"));
      $("#token-value").textContent = `≈ ${compact(claudeTokens)}`;
      if (dollars) {
        $("#token-dollars").textContent = `≈ $${compact(dollars)} API-EQUIV THIS YEAR`;
      }
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          animate();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(section);
  } catch {
    section.hidden = true;
  }
}

/* ---------- reveal on scroll ---------- */

function setupReveals() {
  const targets = $$(".hero-title, .hero-lede, .hero-meta, .section-head, .page-hero, .feed-rail, .footer-title");
  targets.forEach((t) => t.classList.add("reveal"));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.1 }
  );
  targets.forEach((t) => io.observe(t));
}

loadProjects();
loadFeed();
loadTokenMeter();
setupReveals();

/* ---------- brain teaser (landing page) ---------- */

async function loadBrainTeaser() {
  const el = $("#brain-teaser-meta");
  if (!el) return;
  try {
    const res = await fetch("data/brain.json");
    if (!res.ok) throw new Error(res.status);
    const { count, edges, words } = await res.json();
    el.textContent = `${count} NOTES · ${edges} LINKS · ${words.toLocaleString()} WORDS`;
  } catch {
    el.textContent = "RUN npm run brain TO BUILD THE VAULT";
  }
}

loadBrainTeaser();

/* ================= FIELD NOTES ================= */

function noteRow(a) {
  const day = new Date(a.date + "T00:00:00Z")
    .toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .toUpperCase();
  return `
  <li class="note-row">
    <a href="notes/${esc(a.slug)}.html">
      <span class="note-meta mono"><span class="note-tag">${esc(a.tag)}</span>${day} · ${a.minutes} MIN</span>
      <span class="note-title">${esc(a.title)}</span>
      <span class="note-dek">${esc(a.dek)}</span>
      <span class="note-go mono" aria-hidden="true">READ →</span>
    </a>
  </li>`;
}

async function loadNotes() {
  const index = $("#notes-index");
  const snippet = $("#notes-snippet");
  if (!index && !snippet) return;
  try {
    const res = await fetch("data/articles.json");
    if (!res.ok) throw new Error(res.status);
    const articles = await res.json();
    index && (index.innerHTML = articles.map(noteRow).join(""));
    snippet && (snippet.innerHTML = articles.slice(0, 5).map(noteRow).join(""));
  } catch {
    const msg = `<li class="index-empty mono">COULDN'T LOAD NOTES — IF YOU'RE ON file://, RUN: npm run dev</li>`;
    index && (index.innerHTML = msg);
    snippet && (snippet.innerHTML = msg);
  }
}

loadNotes();

/* ================= THE MACHINES (landing telemetry) ================= */
/* Every self-updating system, reporting in. Same-origin: all the studio's
   sites live on the one github.io host. */

async function loadMachines() {
  if (!$("#m-signal")) return;
  const cell = (id, val, dead = false) => {
    const el = $(id);
    if (!el) return;
    el.querySelector(".m-val").textContent = val;
    if (dead) el.classList.add("dead");
  };
  try {
    const d = await (await fetch("data/digest.json")).json();
    cell("#m-signal", `UPDATED ${ago(d.generated_at).toUpperCase()} · ${(d.items || []).length} ITEMS`);
  } catch { cell("#m-signal", "OFFLINE", true); }
  try {
    const p = await (await fetch("/one-piece-guess-game/data/daily.json")).json();
    cell("#m-pirate", `RIDDLE #${p.number} LIVE · ${p.date}`);
  } catch { cell("#m-pirate", "OFFLINE", true); }
  try {
    const f = await (await fetch("/collingwood-fan-suite/data/footy.json")).json();
    if (f.nextGame) {
      const ms = new Date(f.nextGame.date) - Date.now();
      const when = ms > 0 ? `IN ${Math.floor(ms / 864e5)}D ${Math.floor((ms % 864e5) / 36e5)}H` : "GAME ON";
      const opp = f.nextGame.home === f.club ? f.nextGame.away : f.nextGame.home;
      cell("#m-footy", `PIES V ${opp.toUpperCase()} ${when}`);
    } else {
      cell("#m-footy", `SEASON DONE · RANK ${f.clubRow?.rank ?? "—"}`);
    }
  } catch { cell("#m-footy", "OFFLINE", true); }
  try {
    const b = await (await fetch("data/brain.json")).json();
    cell("#m-brain", `${b.count} NOTES · ${b.edges} LINKS`);
  } catch { cell("#m-brain", "OFFLINE", true); }
}

loadMachines();

/* ================= ROADMAP (projects page) ================= */

function roadmapItem(it) {
  const name = it.link
    ? `<a class="rm-name" href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.name)} ↗</a>`
    : `<span class="rm-name">${esc(it.name)}</span>`;
  const bar =
    typeof it.progress === "number"
      ? `<div class="rm-track" role="img" aria-label="${it.progress}% complete">
           <i class="rm-fill" style="--p:${Math.max(0, Math.min(100, it.progress))}%"></i>
         </div>
         <span class="rm-pct mono">${it.progress}%</span>`
      : `<span class="rm-idea mono">IDEA</span>`;
  return `
  <div class="rm-item">
    <div class="rm-head">${name}${bar}</div>
    <p class="rm-note">${esc(it.note || "")}</p>
  </div>`;
}

async function loadRoadmap() {
  const wrap = $("#roadmap-lanes");
  if (!wrap) return;
  try {
    const res = await fetch("data/roadmap.json");
    if (!res.ok) throw new Error(res.status);
    const map = await res.json();
    $("#roadmap-updated") &&
      ($("#roadmap-updated").textContent = new Date(map.updated + "T00:00:00Z")
        .toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" })
        .toUpperCase());
    wrap.innerHTML = map.lanes
      .map(
        (lane) => `
      <div class="rm-lane">
        <div class="rm-lane-head">
          <h3 class="rm-lane-name">${esc(lane.name)}</h3>
          <span class="rm-lane-note mono">${esc(lane.note || "")}</span>
        </div>
        ${lane.items.map(roadmapItem).join("")}
      </div>`
      )
      .join("");
    // bars animate in when scrolled into view
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("go"); io.unobserve(e.target); }
      }),
      { threshold: 0.4 }
    );
    $$(".rm-track", wrap).forEach((t) => io.observe(t));
  } catch {
    wrap.innerHTML = `<div class="index-empty mono">COULDN'T LOAD THE ROADMAP.</div>`;
  }
}

loadRoadmap();

/* ================= COMMAND PALETTE (⌘K / CTRL+K) ================= */

const PALETTE_PAGES = [
  ["Home", "the front page", "index.html"],
  ["Work", "the full project index", "projects.html"],
  ["Roadmap", "what's being built, with progress bars", "projects.html#roadmap"],
  ["Agents", "the studio's agent structure", "agents.html"],
  ["The Brain", "obsidian vault, in the browser", "brain.html"],
  ["Notes", "essays & guides", "notes.html"],
  ["Feed", "the daily AI signal", "feed.html"],
  ["Play", "one piece guess, embedded", "play.html"],
  ["About", "the human behind the ✳", "about.html"],
];

const PALETTE_DEMOS = [
  ["QuantFlex walkthrough", "price an american put under heston", "demos/quantflex.html"],
  ["Prompterjack walkthrough", "wire an agent crew, export code", "demos/prompterjack.html"],
  ["Solo Strength Quest walkthrough", "boss kills on real app screens", "demos/strength-quest.html"],
];

let paletteData = null;
let paletteIdx = 0;

function paletteInject() {
  if ($("#palette-overlay")) return;
  const wrap = document.createElement("div");
  wrap.id = "palette-overlay";
  wrap.hidden = true;
  wrap.innerHTML = `
    <div class="palette" role="dialog" aria-label="Command palette">
      <input id="palette-input" class="palette-input" type="text" autocomplete="off"
             spellcheck="false" placeholder="Jump to a project, note, demo, page…" />
      <ol class="palette-list" id="palette-list"></ol>
      <div class="palette-foot mono">
        <span>↑↓ NAVIGATE</span><span>↵ OPEN</span><span>ESC CLOSE</span>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener("click", (e) => { if (e.target === wrap) paletteClose(); });
  $("#palette-input").addEventListener("input", paletteRender);
  $("#palette-list").addEventListener("click", (e) => {
    const row = e.target.closest("[data-href]");
    if (row) paletteGo(row);
  });
  const hint = document.createElement("button");
  hint.className = "palette-hint mono";
  hint.type = "button";
  hint.title = "Command palette";
  hint.textContent = navigator.platform.startsWith("Mac") ? "⌘K" : "CTRL K";
  hint.addEventListener("click", paletteOpen);
  const header = $(".site-header");
  header && header.insertBefore(hint, $(".clock"));
}

async function paletteLoad() {
  if (paletteData) return paletteData;
  const grab = async (p) => { try { return await (await fetch(p)).json(); } catch { return []; } };
  const [projects, articles] = await Promise.all([grab("data/projects.json"), grab("data/articles.json")]);
  paletteData = [
    ...PALETTE_PAGES.map(([t, s, h]) => ({ type: "PAGE", t, s, h })),
    ...projects.map((p) => ({
      type: "PROJECT", t: p.name, s: p.tagline || "",
      h: p.links?.live || p.links?.demo || p.links?.repo || "projects.html",
    })),
    ...articles.map((a) => ({ type: "NOTE", t: a.title, s: a.dek || "", h: `notes/${a.slug}.html` })),
    ...PALETTE_DEMOS.map(([t, s, h]) => ({ type: "DEMO", t, s, h })),
    { type: "TOY", t: "Side by Side", s: "the collingwood super-fan suite", h: "https://chinmaygit8765.github.io/collingwood-fan-suite/" },
  ];
  return paletteData;
}

function paletteMatches(q) {
  if (!q) return paletteData.slice(0, 9);
  const score = (it) => {
    const t = it.t.toLowerCase(), s = it.s.toLowerCase();
    if (t.startsWith(q)) return 0;
    if (t.includes(q)) return 1;
    if (s.includes(q)) return 2;
    return -1;
  };
  return paletteData
    .map((it) => [score(it), it])
    .filter(([sc]) => sc >= 0)
    .sort((a, b) => a[0] - b[0])
    .slice(0, 9)
    .map(([, it]) => it);
}

function paletteRender() {
  const q = $("#palette-input").value.trim().toLowerCase();
  const hits = paletteMatches(q);
  paletteIdx = Math.min(paletteIdx, Math.max(0, hits.length - 1));
  $("#palette-list").innerHTML = hits.length
    ? hits.map((it, i) => `
      <li><button data-href="${esc(it.h)}" ${it.h.startsWith("http") ? 'data-ext="1"' : ""}
                  class="${i === paletteIdx ? "active" : ""}">
        <span class="pk-type mono">${it.type}</span>
        <span class="pk-title">${esc(it.t)}</span>
        <span class="pk-sub">${esc(it.s)}</span>
      </button></li>`).join("")
    : `<li class="palette-empty mono">NOTHING IN THE STUDIO MATCHES THAT.</li>`;
}

function paletteGo(row) {
  paletteClose(); // close BEFORE navigating so no overlay is left in any snapshot
  if (row.dataset.ext) {
    window.open(row.dataset.href, "_blank", "noopener");
  } else {
    // let the close paint first, then navigate
    requestAnimationFrame(() => requestAnimationFrame(() => {
      location.href = row.dataset.href;
    }));
  }
}

// a page restored from the back/forward cache must never wake up with the
// palette still covering it
window.addEventListener("pageshow", () => paletteClose());

async function paletteOpen() {
  paletteInject();
  await paletteLoad();
  paletteIdx = 0;
  const overlay = $("#palette-overlay");
  overlay.hidden = false;
  const input = $("#palette-input");
  input.value = "";
  paletteRender();
  input.focus();
}

function paletteClose() {
  const overlay = $("#palette-overlay");
  if (overlay) overlay.hidden = true;
}

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    const overlay = $("#palette-overlay");
    overlay && !overlay.hidden ? paletteClose() : paletteOpen();
    return;
  }
  const overlay = $("#palette-overlay");
  if (!overlay || overlay.hidden) return;
  const rows = $$("#palette-list [data-href]");
  if (e.key === "Escape") { paletteClose(); }
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!rows.length) return;
    paletteIdx = e.key === "ArrowDown"
      ? (paletteIdx + 1) % rows.length
      : (paletteIdx - 1 + rows.length) % rows.length;
    rows.forEach((r, i) => r.classList.toggle("active", i === paletteIdx));
    rows[paletteIdx].scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter" && rows[paletteIdx]) {
    e.preventDefault();
    paletteGo(rows[paletteIdx]);
  }
});

paletteInject();
