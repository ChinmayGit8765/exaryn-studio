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
  const visit = p.links?.live || p.links?.repo || "";
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
    const { claudeTokens = 0, tokenBudget = 0, goalNote = "" } = await res.json();

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
      // number counts up alongside
      const valueEl = $("#token-value");
      const dur = 40 * lit + 300;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        valueEl.textContent = `≈ ${compact(claudeTokens * (1 - Math.pow(1 - p, 3)))}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      $$("i", cellsEl).forEach((cell, idx) => idx < lit && cell.classList.add("on"));
      $("#token-value").textContent = `≈ ${compact(claudeTokens)}`;
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
