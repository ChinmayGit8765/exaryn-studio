/* Exaryn — the markdown renderer.

   Covers exactly the subset of markdown the vault uses: headings, lists (task
   lists included), tables, fenced code, blockquotes, Obsidian callouts, and
   [[wikilinks]]. No library — this is ~180 lines against a 40KB dependency,
   and it means the site still has no build step.

   Shared by assets/brain.js and assets/guides.js. Both pass their own link
   resolver, so the same note body can link into the brain from one page and
   between guides from the other.

     ExarynMD.render(src, {
       resolve: (name) => noteId | null,      // wikilink target -> note id
       hrefFor: (noteId) => "…",              // note id -> a URL for this page
     })

   Returns { html, headings } — headings are the h2/h3s, for a contents rail. */

(() => {

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CALLOUT = /^\[!(\w+)\]\s*(.*)$/;

const slugify = (text) =>
  text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");

/* Inline: code spans are lifted out first so nothing inside them is touched,
   then wikilinks, then the ordinary emphasis/link syntax. */
function inline(src, opts) {
  const code = [];
  let out = String(src).replace(/`([^`]+)`/g, (_, c) => {
    code.push(c);
    return `\uE000${code.length - 1}\uE000`; // sentinel: never collides with prose
  });

  out = esc(out);

  // [[Target|alias]] and [[Target#heading]]
  out = out.replace(/\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, target, hash, alias) => {
    const id = opts.resolve ? opts.resolve(target.trim()) : null;
    const label = esc(alias || target.trim());
    if (!id) return `<span class="wl broken" title="No note called “${esc(target.trim())}” yet">${label}</span>`;
    return `<a class="wl" href="${esc(opts.hrefFor(id))}">${label}</a>`;
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
  return out.replace(/(\d+)/g, (_, i) => `<code>${esc(code[+i])}</code>`);
}

function renderTable(rows, opts) {
  // rows[1] is the |---|---| separator; drop it.
  const cells = (row) => row.replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim(), opts));
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const headHTML = head.some((h) => h)
    ? `<thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`
    : "";
  return `<div class="table-wrap"><table>${headHTML}<tbody>${body
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function blocks(src, opts, headings) {
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
      const slug = slugify(heading[2]);
      if (headings && (level === 2 || level === 3)) {
        headings.push({ level, slug, text: heading[2].replace(/[`*]/g, "") });
      }
      out.push(`<h${level} id="h-${slug}">${inline(heading[2], opts)}</h${level}>`);
      i++;
      continue;
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line)) { out.push("<hr />"); i++; continue; }

    // table
    if (/^\|/.test(line) && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1] || "")) {
      const buf = [];
      while (i < lines.length && /^\|/.test(lines[i])) buf.push(lines[i++]);
      out.push(renderTable(buf, opts));
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
        out.push(`<div class="callout ${esc(kind)}"><p class="callout-title mono">${inline(title, opts)}</p>${blocks(buf.slice(1).join("\n"), opts)}</div>`);
      } else {
        out.push(`<blockquote>${blocks(buf.join("\n"), opts)}</blockquote>`);
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
          items.push(`<li class="task${done ? " done" : ""}"><span class="box mono" aria-hidden="true">${done ? "×" : ""}</span>${inline(task[2], opts)}</li>`);
        } else {
          items.push(`<li>${inline(text, opts)}</li>`);
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
    if (buf.length) out.push(`<p>${inline(buf.join(" "), opts)}</p>`);
  }

  return out.join("\n");
}

function render(src, opts = {}) {
  const options = { resolve: () => null, hrefFor: (id) => `#/${encodeURI(id)}`, ...opts };
  const headings = [];
  return { html: blocks(src, options, headings), headings };
}

window.ExarynMD = { render, inline, esc, slugify };

})();
