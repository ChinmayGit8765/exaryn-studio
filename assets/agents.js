/* Exaryn — the Agent Struct page.

   Everything here is derived, never typed twice: the tiers come out of the
   brain bundle's agent notes, the scoreboard and the built-everything table
   come from data/projects.json and data/repos.json. Add an agent note to the
   vault and it shows up on this page on the next build. */

const A = (sel) => document.querySelector(sel);
const escA = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TIERS = {
  1: {
    name: "Scheduled bots",
    blurb:
      "No reasoning. A cron fires, a script runs, JSON is committed, a site redeploys. If one dies, nothing else notices.",
  },
  2: {
    name: "Model-in-the-loop",
    blurb:
      "A model does real work, but a human sees the output before it counts. Freedom inside a sandbox, a gate on the way out.",
  },
  3: {
    name: "Autonomous, enveloped",
    blurb:
      "Plans and acts across time. The only tier that needs an allowlist, capability tiers and an audit trail on every call.",
  },
};

/* Pull the first sentence-ish of a note body for the card summary. */
function summarise(body) {
  const text = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#.*$/gm, " ")
    .replace(/^>.*$/gm, " ")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, t, a) => a || t)
    .replace(/[*`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const stop = text.indexOf(". ");
  return stop > 40 ? text.slice(0, stop + 1) : text.slice(0, 220);
}

function noteHref(id) {
  return `brain.html#/${encodeURI(id)}`;
}

function renderTiers(vault) {
  const agents = vault.notes
    .filter((n) => n.type === "agent")
    .map((n) => ({ ...n, tier: Number(n.meta?.tier) || 0 }))
    .sort((a, b) => a.tier - b.tier || a.title.localeCompare(b.title));

  A("#n-agents").textContent = agents.length;
  A("#lede-agents").textContent = agents.length;

  A("#tier-grid").innerHTML = [1, 2, 3]
    .map((tier) => {
      const inTier = agents.filter((a) => a.tier === tier);
      if (!inTier.length) return "";
      return `
      <section class="tier">
        <header class="tier-head">
          <span class="tier-badge mono">TIER ${tier}</span>
          <h3 class="tier-name">${escA(TIERS[tier].name)}</h3>
          <p class="tier-blurb">${escA(TIERS[tier].blurb)}</p>
          <span class="tier-count mono">${inTier.length} ${inTier.length === 1 ? "SYSTEM" : "SYSTEMS"}</span>
        </header>
        <ul class="agent-list">
          ${inTier
            .map(
              (a) => `
            <li class="agent-card">
              <a href="${noteHref(a.id)}">
                <span class="agent-name">${escA(a.title)}</span>
                <span class="agent-project mono">${escA(a.meta?.project || "—")}</span>
                <p class="agent-desc">${escA(summarise(a.body))}</p>
                <span class="agent-go mono">READ THE NOTE →</span>
              </a>
            </li>`
            )
            .join("")}
        </ul>
      </section>`;
    })
    .join("");
}

function renderScoreboard(vault, projects, repos) {
  A("#n-projects").textContent = projects.length;
  A("#lede-projects").textContent = projects.length;
  A("#n-repos").textContent = repos.length;
  A("#lede-repos").textContent = repos.length;
  A("#repo-link-count").textContent = repos.length;
  A("#n-notes").textContent = vault.count;
  A("#n-systems").textContent = vault.notes.filter((n) => n.type === "system").length;

  const langs = new Set(repos.map((r) => r.language).filter(Boolean));
  A("#n-langs").textContent = langs.size;

  A("#door-meta").textContent =
    `${vault.count} NOTES · ${vault.edges} LINKS · ${vault.words.toLocaleString()} WORDS`;
}

function renderBuilt(vault, projects, repos) {
  const byFull = new Map(repos.map((r) => [r.full_name, r]));
  const noteFor = new Map(
    vault.notes.filter((n) => n.type === "project").map((n) => [n.title, n.id])
  );

  const rows = projects
    .map((p) => {
      const repo = byFull.get(p.repo);
      const noteId = noteFor.get(p.name);
      const name = noteId
        ? `<a href="${noteHref(noteId)}">${escA(p.name)}</a>`
        : escA(p.name);
      const agents = (p.agents || []).length
        ? p.agents
            .map((a) => {
              const id = vault.notes.find((n) => n.title === a)?.id;
              return id ? `<a href="${noteHref(id)}">${escA(a)}</a>` : escA(a);
            })
            .join(", ")
        : "—";
      // A project with a closed codebase says so; it never names a private repo.
      const repoCell = repo
        ? `<a href="${escA(repo.html_url)}" target="_blank" rel="noopener">${escA(repo.name)} ↗</a>`
        : p.source === "private"
          ? `<span class="built-private">private</span>`
          : p.repo
            ? escA(p.repo.split("/").pop())
            : "—";
      return `
      <tr>
        <td class="built-name">${name}</td>
        <td class="mono">${escA(p.category || "—")}</td>
        <td class="built-tech">${escA((p.tech || []).slice(0, 4).join(" / "))}</td>
        <td class="built-agents">${agents}</td>
        <td class="mono">${repoCell}</td>
        <td class="mono">${escA((repo?.pushed_at || "").slice(0, 10) || "—")}</td>
        <td class="mono built-status" data-status="${escA(p.status || "")}">${escA(p.status || "—")}</td>
      </tr>`;
    })
    .join("");

  A("#built-table").querySelector("tbody").innerHTML = rows;
}

async function boot() {
  let vault, projects, repos;
  try {
    const [v, p, r] = await Promise.all([
      fetch("data/brain.json").then((res) => res.json()),
      fetch("data/projects.json").then((res) => res.json()),
      fetch("data/repos.json").then((res) => res.json()),
    ]);
    vault = v;
    projects = p;
    repos = r.repos || [];
  } catch {
    A("#tier-grid").innerHTML =
      `<p class="index-empty mono">COULDN'T LOAD THE STRUCTURE — IF YOU'RE ON file://, RUN: npm run dev</p>`;
    return;
  }

  renderScoreboard(vault, projects, repos);
  renderTiers(vault);
  renderBuilt(vault, projects, repos);
}

boot();
