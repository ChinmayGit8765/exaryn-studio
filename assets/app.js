/* Exaryn — renders the project index and the daily signal feed.
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

/* ---------- projects ---------- */

async function loadProjects() {
  const list = $("#project-index");
  try {
    const res = await fetch("data/projects.json");
    if (!res.ok) throw new Error(res.status);
    const projects = await res.json();

    $("#project-count").textContent = String(projects.length).padStart(2, "0");
    list.innerHTML = projects
      .map((p) => {
        const href = p.links?.live || p.links?.repo || "";
        const tech = (p.tech || []).slice(0, 4).join(" / ");
        const status =
          p.status && p.status !== "shipped"
            ? `<span class="status">[${esc(p.status)}]</span>`
            : "";
        const inner = `
          <span class="num" aria-hidden="true"></span>
          <span class="project-name">${esc(p.name)}</span>
          <span class="project-desc">${esc(p.tagline || p.description || "")}</span>
          <span class="project-tech">${esc(tech)}<span class="year"> · ${esc(p.year || "")}</span>${status}</span>
          <span class="arrow" aria-hidden="true">${href ? "↗" : "·"}</span>`;
        return `<li class="project-row">${
          href
            ? `<a href="${esc(href)}" target="_blank" rel="noopener">${inner}</a>`
            : `<div class="row-inner">${inner}</div>`
        }</li>`;
      })
      .join("");
  } catch (err) {
    list.innerHTML = `<li class="index-empty mono">COULDN'T LOAD PROJECTS — IF YOU'RE ON file://, RUN A LOCAL SERVER: python -m http.server</li>`;
  }
}

/* ---------- daily signal feed ---------- */

let feedItems = [];
let activeKind = "all";

function renderFeed() {
  const list = $("#feed-list");
  const items =
    activeKind === "all" ? feedItems : feedItems.filter((i) => i.kind === activeKind);

  if (!items.length) {
    list.innerHTML = `<li class="feed-empty mono">NOTHING HERE YET.</li>`;
    return;
  }

  list.innerHTML = items
    .map((i) => {
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
    })
    .join("");
}

async function loadFeed() {
  const list = $("#feed-list");
  try {
    const res = await fetch("data/digest.json");
    if (!res.ok) throw new Error(res.status);
    const digest = await res.json();
    feedItems = digest.items || [];

    const updated = $("#feed-updated");
    if (digest.generated_at) {
      updated.textContent = `UPDATED ${ago(digest.generated_at).toUpperCase()}`;
    }

    const counts = { all: feedItems.length, news: 0, video: 0, paper: 0 };
    for (const i of feedItems) counts[i.kind] = (counts[i.kind] || 0) + 1;
    $$("[data-count]").forEach((el) => {
      el.textContent = counts[el.dataset.count] ?? 0;
    });

    renderFeed();
  } catch (err) {
    list.innerHTML = `<li class="feed-empty mono">NO SIGNAL — RUN scripts/digest.py TO GENERATE data/digest.json, OR WAIT FOR THE MORNING CRON.</li>`;
  }
}

$("#feed-filters")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  activeKind = btn.dataset.kind;
  $$(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
  renderFeed();
  $(".feed-pane")?.scrollTo({ top: 0 });
});

/* ---------- reveal on scroll ---------- */

function setupReveals() {
  const targets = $$(".hero-title, .hero-lede, .hero-meta, .section-head, .feed-rail, .footer-title");
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
setupReveals();
