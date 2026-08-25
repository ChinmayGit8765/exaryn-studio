/* Exaryn Brain — renders the Obsidian vault in the browser.

   Reads one bundle (data/brain.json) written by scripts/brain.py: every note's
   frontmatter and body, plus a pre-resolved link graph. GitHub Pages has no
   directory listing, so one bundle is how the whole vault arrives at once —
   which also makes search instant and the graph free.

   No framework, no markdown library. The renderer below covers exactly the
   subset of markdown this vault uses, wikilinks and callouts included. */

/* Wrapped in an IIFE: assets/app.js loads alongside this for the clock and
   shares the global scope, so $ / esc / vault state stay private here. */
(() => {

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let VAULT = null;          // the parsed bundle
let BY_ID = new Map();     // id -> note
let INDEX = new Map();     // lowercased title / filename / alias -> id
let current = null;        // the note on screen
let filter = { text: "", tag: null, folder: null };

/* ================= markdown ================= */

/* Inline: code spans first (so nothing inside them is touched), then
   wikilinks, then the ordinary emphasis/link syntax. */
function inline(src) {
  const code = [];
  let out = String(src).replace(/`([^`]+)`/g, (_, c) => {
    code.push(c);
    return `\uE000${code.length - 1}\uE000`;
  });

  out = esc(out);

  // [[Target|alias]] and [[Target#heading]]
  out = out.replace(/\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, target, hash, alias) => {
    const id = resolve(target.trim());
    const label = esc(alias || target.trim());
    if (!id) return `<span class="wl broken" title="No note called “${esc(target.trim())}” yet">${label}</span>`;
    return `<a class="wl" href="#/${encodeURI(id)}">${label}</a>`;
  });

  out = out
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "")                     // images: the vault has none
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) =>
      /^https?:/i.test(href)
        ? `<a href="${href}" target="_blank" rel="noopener">${text} <span class="ext">↗</span></a>`
        : `<a href="${href}">${text}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,;:!?])/g, "$1<em>$2</em>");

  return out.replace(/\uE000(\d+)\uE000/g, (_, i) => `<code>${esc(code[+i])}</code>`);
}

const CALLOUT = /^\[!(\w+)\]\s*(.*)$/;

function renderTable(rows) {
  // rows[1] is the |---|---| separator; drop it.
  const cells = (row) => row.replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const headHTML = head.some((h) => h)
    ? `<thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`
    : "";
  return `<div class="table-wrap"><table>${headHTML}<tbody>${body
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function markdown(src) {
  const lines = String(src).replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // fenced code
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre class="code"${lang ? ` data-lang="${esc(lang)}"` : ""}><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = inline(heading[2]);
      const slug = heading[2].toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
      out.push(`<h${level} id="h-${slug}">${text}</h${level}>`);
      i++;
      continue;
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line)) { out.push("<hr />"); i++; continue; }

    // table
    if (/^\|/.test(line) && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1] || "")) {
      const buf = [];
      while (i < lines.length && /^\|/.test(lines[i])) buf.push(lines[i++]);
      out.push(renderTable(buf));
      continue;
    }

    // blockquote / Obsidian callout
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      const callout = CALLOUT.exec(buf[0] || "");
      if (callout) {
        const kind = callout[1].toLowerCase();
        const title = callout[2] || kind;
        out.push(`<div class="callout ${esc(kind)}"><p class="callout-title mono">${inline(title)}</p>${markdown(buf.slice(1).join("\n"))}</div>`);
      } else {
        out.push(`<blockquote>${markdown(buf.join("\n"))}</blockquote>`);
      }
      continue;
    }

    // lists (task lists included)
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        let text = lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, "");
        i++;
        // continuation lines belong to the item above
        while (i < lines.length && lines[i].trim() && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
               !/^(#{1,6}\s|>|\||```)/.test(lines[i])) {
          text += " " + lines[i++].trim();
        }
        const task = /^\[([ xX])\]\s+(.*)$/.exec(text);
        if (task) {
          const done = task[1].toLowerCase() === "x";
          items.push(`<li class="task${done ? " done" : ""}"><span class="box mono" aria-hidden="true">${done ? "×" : ""}</span>${inline(task[2])}</li>`);
        } else {
          items.push(`<li>${inline(text)}</li>`);
        }
      }
      const tag = ordered ? "ol" : "ul";
      const cls = items.some((it) => it.includes('class="task')) ? ' class="tasks"' : "";
      out.push(`<${tag}${cls}>${items.join("")}</${tag}>`);
      continue;
    }

    // paragraph
    const buf = [];
    while (i < lines.length && lines[i].trim() &&
           !/^(#{1,6}\s|>|\||```|---|\s*([-*+]|\d+\.)\s)/.test(lines[i])) {
      buf.push(lines[i++]);
    }
    if (buf.length) out.push(`<p>${inline(buf.join(" "))}</p>`);
  }

  return out.join("\n");
}

/* ================= vault ================= */

function resolve(name) {
  return INDEX.get(String(name).toLowerCase()) || null;
}

function buildIndex(notes) {
  BY_ID = new Map(notes.map((n) => [n.id, n]));
  INDEX = new Map();
  const add = (key, id) => {
    const k = String(key).toLowerCase();
    if (!INDEX.has(k)) INDEX.set(k, id);
  };
  for (const n of notes) {
    add(n.title, n.id);
    add(n.id.split("/").pop(), n.id);
    add(n.id, n.id);
    (n.aliases || []).forEach((a) => add(a, n.id));
  }
}

const FOLDER_LABEL = {
  "": "Root",
  maps: "Maps of content",
  agents: "Agents",
  projects: "Projects",
  repos: "Repositories",
  systems: "Systems",
  stack: "Stack",
  notes: "Notes",
};

const FOLDER_ORDER = ["", "maps", "agents", "systems", "projects", "stack", "notes", "repos"];

/* ================= sidebar ================= */

function matches(note) {
  if (filter.folder !== null && note.folder !== filter.folder) return false;
  if (filter.tag && !(note.tags || []).includes(filter.tag)) return false;
  if (filter.text) {
    const hay = (note.title + " " + note.tags.join(" ") + " " + note.body).toLowerCase();
    if (!hay.includes(filter.text)) return false;
  }
  return true;
}

function renderTree() {
  const wrap = $("#note-tree");
  const notes = VAULT.notes.filter(matches);
  $("#tree-count").textContent = `${notes.length} / ${VAULT.notes.length}`;

  if (!notes.length) {
    wrap.innerHTML = `<p class="tree-empty mono">NO NOTES MATCH.</p>`;
    return;
  }

  const groups = new Map();
  for (const n of notes) {
    if (!groups.has(n.folder)) groups.set(n.folder, []);
    groups.get(n.folder).push(n);
  }
  const rank = (f) => (FOLDER_ORDER.indexOf(f) === -1 ? 99 : FOLDER_ORDER.indexOf(f));
  const order = [...groups.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  wrap.innerHTML = order
    .map((folder) => {
      const items = groups.get(folder).sort((a, b) => a.title.localeCompare(b.title));
      return `
      <section class="tree-group">
        <h3 class="tree-folder mono">${esc(FOLDER_LABEL[folder] || folder)}<span>${items.length}</span></h3>
        <ul>
          ${items.map((n) => `
            <li>
              <a class="tree-item${current && n.id === current.id ? " active" : ""}"
                 href="#/${encodeURI(n.id)}" data-id="${esc(n.id)}">
                <span class="dot t-${esc(n.type)}" aria-hidden="true"></span>
                <span class="tree-title">${esc(n.title)}</span>
              </a>
            </li>`).join("")}
        </ul>
      </section>`;
    })
    .join("");
}

function renderTags() {
  const el = $("#tag-cloud");
  const entries = Object.entries(VAULT.tags).slice(0, 26);
  el.innerHTML = entries
    .map(([tag, n]) =>
      `<button class="tag mono${filter.tag === tag ? " active" : ""}" data-tag="${esc(tag)}">${esc(tag)}<span>${n}</span></button>`)
    .join("");
}

/* ================= note pane ================= */

function noteLink(id) {
  const n = BY_ID.get(id);
  if (!n) return "";
  return `<a class="rel-item" href="#/${encodeURI(id)}">
      <span class="dot t-${esc(n.type)}" aria-hidden="true"></span>
      <span>${esc(n.title)}</span>
      <span class="rel-folder mono">${esc(n.folder || "root")}</span>
    </a>`;
}

function renderNote(note) {
  current = note;
  const pane = $("#note-pane");

  const metaRows = Object.entries(note.meta || {})
    .filter(([, v]) => v !== "" && v !== null && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(Array.isArray(v) ? v.join(", ") : v)}</dd></div>`)
    .join("");

  pane.innerHTML = `
    <article class="note">
      <div class="note-head">
        <p class="note-crumb mono">
          <span class="dot t-${esc(note.type)}" aria-hidden="true"></span>
          ${esc(note.folder || "root")} / ${esc(note.type)}
          ${note.generated ? `<span class="gen-flag">GENERATED</span>` : ""}
        </p>
        <div class="note-tags mono">
          ${(note.tags || []).map((t) => `<button class="tag mini" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}
        </div>
      </div>
      <div class="note-body">${markdown(note.body)}</div>
      <footer class="note-foot mono">
        <span>${note.words} WORDS</span>
        <span>${note.links.length} OUT · ${note.backlinks.length} IN</span>
        <a href="https://github.com/ChinmayGit8765/exaryn-studio/blob/main/${encodeURI(note.path)}"
           target="_blank" rel="noopener">${esc(note.path)} ↗</a>
      </footer>
    </article>`;

  $("#rel-pane").innerHTML = `
    ${metaRows ? `<section class="rel-block"><h3 class="rel-head mono">Frontmatter</h3><dl class="rel-meta">${metaRows}</dl></section>` : ""}
    <section class="rel-block">
      <h3 class="rel-head mono">Links out <span>${note.links.length}</span></h3>
      ${note.links.length ? note.links.map(noteLink).join("") : `<p class="rel-empty mono">NONE.</p>`}
    </section>
    <section class="rel-block">
      <h3 class="rel-head mono">Backlinks <span>${note.backlinks.length}</span></h3>
      ${note.backlinks.length ? note.backlinks.map(noteLink).join("") : `<p class="rel-empty mono">NOTHING LINKS HERE YET.</p>`}
    </section>`;

  document.title = `${note.title} — Exaryn Brain`;
  $(".brain-pane")?.scrollTo({ top: 0 });
  renderTree();
  if (graphOpen) drawGraph();
}

function open(id) {
  const note = BY_ID.get(id) || BY_ID.get(resolve(id));
  if (note) renderNote(note);
}

/* ================= graph ================= */

let graphOpen = false;
let nodes = [];
let edges = [];
let raf = null;

const TYPE_COLOR = {
  map: "#ff4d00",
  agent: "#171512",
  project: "#3d6b4a",
  repo: "#8a8378",
  system: "#8a5a2b",
  stack: "#4a5b8a",
  note: "#57524b",
  meta: "#57524b",
};

function seedGraph() {
  const visible = VAULT.notes.filter(matches);
  const ids = new Set(visible.map((n) => n.id));
  const canvas = $("#graph");
  const w = canvas.width, h = canvas.height;

  nodes = visible.map((n, idx) => {
    const angle = (idx / visible.length) * Math.PI * 2;
    const radius = Math.min(w, h) * (n.type === "map" ? 0.16 : 0.36);
    return {
      id: n.id, title: n.title, type: n.type,
      deg: n.links.length + n.backlinks.length,
      x: w / 2 + Math.cos(angle) * radius,
      y: h / 2 + Math.sin(angle) * radius,
      vx: 0, vy: 0,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  edges = [];
  for (const n of visible) {
    for (const target of n.links) {
      if (ids.has(target)) edges.push([byId.get(n.id), byId.get(target)]);
    }
  }
}

function stepGraph() {
  const canvas = $("#graph");
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;

  for (const a of nodes) {
    a.vx += (cx - a.x) * 0.0016;
    a.vy += (cy - a.y) * 0.0016;
  }
  // repulsion — O(n²), fine at ~100 nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d2 = dx * dx + dy * dy || 0.01;
      if (d2 > 90000) continue;
      const f = 900 / d2;
      const d = Math.sqrt(d2);
      dx /= d; dy /= d;
      a.vx -= dx * f; a.vy -= dy * f;
      b.vx += dx * f; b.vy += dy * f;
    }
  }
  for (const [a, b] of edges) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 0.01;
    const f = (d - 90) * 0.0035;
    a.vx += (dx / d) * f; a.vy += (dy / d) * f;
    b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
  }
  for (const n of nodes) {
    n.vx *= 0.86; n.vy *= 0.86;
    n.x = Math.max(14, Math.min(w - 14, n.x + n.vx));
    n.y = Math.max(14, Math.min(h - 14, n.y + n.vy));
  }
}

function drawGraph() {
  const canvas = $("#graph");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const focus = current?.id;
  const near = new Set();
  if (focus) {
    near.add(focus);
    (BY_ID.get(focus)?.links || []).forEach((id) => near.add(id));
    (BY_ID.get(focus)?.backlinks || []).forEach((id) => near.add(id));
  }

  ctx.lineWidth = 1;
  for (const [a, b] of edges) {
    const hot = focus && (a.id === focus || b.id === focus);
    ctx.strokeStyle = hot ? "rgba(255,77,0,.75)" : "rgba(23,21,18,.13)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const n of nodes) {
    const r = Math.min(11, 3.2 + n.deg * 0.42);
    const dim = focus && !near.has(n.id);
    ctx.globalAlpha = dim ? 0.28 : 1;
    ctx.fillStyle = TYPE_COLOR[n.type] || "#57524b";
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (n.id === focus) {
      ctx.strokeStyle = "#ff4d00";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (!dim && (n.deg > 7 || n.id === focus)) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#57524b";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(n.title.slice(0, 22), n.x, n.y - r - 6);
    }
    ctx.globalAlpha = 1;
  }
}

function animate() {
  stepGraph();
  drawGraph();
  raf = requestAnimationFrame(animate);
}

function sizeCanvas() {
  const canvas = $("#graph");
  const box = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.max(320, box.width);
  canvas.height = Math.max(280, box.height);
}

function toggleGraph(force) {
  graphOpen = force ?? !graphOpen;
  $("#graph-wrap").hidden = !graphOpen;
  $("#graph-toggle").classList.toggle("active", graphOpen);
  $("#graph-toggle").textContent = graphOpen ? "CLOSE GRAPH ×" : "GRAPH VIEW ◈";
  if (graphOpen) {
    sizeCanvas();
    seedGraph();
    cancelAnimationFrame(raf);
    animate();
    setTimeout(() => cancelAnimationFrame(raf), 6000); // settle, then stop burning frames
  } else {
    cancelAnimationFrame(raf);
  }
}

/* ================= wiring ================= */

function route() {
  const id = decodeURI(location.hash.replace(/^#\/?/, ""));
  if (!id) return open(VAULT.home || "Home");
  open(id);
}

async function boot() {
  const status = $("#brain-status");
  try {
    const res = await fetch("data/brain.json");
    if (!res.ok) throw new Error(res.status);
    VAULT = await res.json();
  } catch {
    status.innerHTML = `<p class="brain-error mono">
      COULDN'T LOAD THE VAULT. IF YOU'RE ON file://, RUN <code>npm run dev</code>.
      IF data/brain.json IS MISSING, RUN <code>npm run brain</code>.</p>`;
    return;
  }

  buildIndex(VAULT.notes);
  status.hidden = true;
  $("#brain-shell").hidden = false;

  $("#stat-notes").textContent = VAULT.count;
  $("#stat-links").textContent = VAULT.edges;
  $("#stat-words").textContent = VAULT.words.toLocaleString();
  $("#stat-built").textContent = (VAULT.generated_at || "").slice(0, 10);

  renderTags();
  renderTree();
  route();
  window.addEventListener("hashchange", route);

  $("#brain-search").addEventListener("input", (e) => {
    filter.text = e.target.value.trim().toLowerCase();
    renderTree();
    if (graphOpen) { seedGraph(); drawGraph(); }
  });

  $("#tag-cloud").addEventListener("click", (e) => {
    const btn = e.target.closest(".tag");
    if (!btn) return;
    filter.tag = filter.tag === btn.dataset.tag ? null : btn.dataset.tag;
    renderTags();
    renderTree();
    if (graphOpen) { seedGraph(); drawGraph(); }
  });

  $("#note-pane").addEventListener("click", (e) => {
    const btn = e.target.closest(".tag.mini");
    if (!btn) return;
    filter.tag = btn.dataset.tag;
    $("#brain-search").value = "";
    filter.text = "";
    renderTags();
    renderTree();
  });

  $("#graph-toggle").addEventListener("click", () => toggleGraph());

  $("#graph").addEventListener("click", (e) => {
    const box = e.target.getBoundingClientRect();
    const x = e.clientX - box.left, y = e.clientY - box.top;
    let best = null, bestD = 26;
    for (const n of nodes) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bestD) { bestD = d; best = n; }
    }
    if (best) location.hash = `#/${encodeURI(best.id)}`;
  });

  window.addEventListener("resize", () => {
    if (!graphOpen) return;
    sizeCanvas();
    seedGraph();
    drawGraph();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== $("#brain-search")) {
      e.preventDefault();
      $("#brain-search").focus();
    }
    if (e.key === "Escape") {
      if (graphOpen) toggleGraph(false);
      else { $("#brain-search").value = ""; filter.text = ""; filter.tag = null; renderTags(); renderTree(); }
    }
  });
}

boot();

})();
