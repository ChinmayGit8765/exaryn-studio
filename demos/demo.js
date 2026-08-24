/* Exaryn demo player — a tiny timeline engine for simulated walkthroughs.
   A demo page provides a script: { duration, chapters, cues, reset }.
   Cues fire class-toggles / text changes; CSS transitions do the motion.
   Seeking replays every cue up to the target instantly (.no-anim). */

function initWalkthrough(script) {
  const $ = (s) => document.querySelector(s);
  const stage = $(".demo-stage");
  const subEl = $("#subtitle");
  const fillEl = $("#progress-fill");
  const timeEl = $("#demo-time");
  const playBtn = $("#btn-play");
  const chapWrap = $("#chapters");

  let t = 0;
  let playing = false;
  let next = 0; // index of next unapplied cue
  let last = 0;
  let raf = null;

  const cues = [...script.cues].sort((a, b) => a.at - b.at);

  const fmt = (s) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  /* ---------- chapters ---------- */

  chapWrap.innerHTML = script.chapters
    .map(
      (c, i) =>
        `<button class="chapter mono" data-at="${c.at}" data-i="${i}">
           <span class="ch-num">${i + 1}</span>${c.name}
         </button>`
    )
    .join("");

  chapWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".chapter");
    if (btn) seek(parseFloat(btn.dataset.at));
  });

  function markChapter() {
    let active = 0;
    script.chapters.forEach((c, i) => { if (t >= c.at) active = i; });
    chapWrap.querySelectorAll(".chapter").forEach((b, i) =>
      b.classList.toggle("active", i === active));
  }

  /* ---------- core ---------- */

  function applyCue(c, instant) {
    if (c.sub !== undefined) subEl.innerHTML = c.sub;
    if (c.do) c.do(instant);
  }

  function frame(now) {
    if (playing) {
      t += (now - last) / 1000;
      while (next < cues.length && cues[next].at <= t) applyCue(cues[next++], false);
      if (t >= script.duration) { t = script.duration; setPlaying(false, true); }
      paint();
    }
    last = now;
    raf = requestAnimationFrame(frame);
  }

  function paint() {
    fillEl.style.width = `${(t / script.duration) * 100}%`;
    timeEl.textContent = `${fmt(t)} / ${fmt(script.duration)}`;
    markChapter();
  }

  function setPlaying(on, ended = false) {
    playing = on;
    stage.classList.toggle("paused", !on);
    playBtn.textContent = ended ? "↻ REPLAY" : on ? "❚❚ PAUSE" : "▶ PLAY";
    playBtn.dataset.ended = ended ? "1" : "";
  }

  function seek(target) {
    stage.classList.add("no-anim");
    script.reset();
    subEl.innerHTML = "";
    next = 0;
    while (next < cues.length && cues[next].at <= target) applyCue(cues[next++], true);
    // force reflow so the jumped-to state doesn't animate
    void stage.offsetWidth;
    stage.classList.remove("no-anim");
    t = target;
    paint();
    if (!playing) setPlaying(true);
  }

  playBtn.addEventListener("click", () => {
    if (playBtn.dataset.ended) return seek(0);
    setPlaying(!playing);
  });

  $("#btn-restart").addEventListener("click", () => seek(0));

  $("#progress-bar").addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * script.duration);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === " " && !e.target.closest("button")) {
      e.preventDefault();
      playBtn.click();
    }
  });

  /* ---------- boot ---------- */

  script.reset();
  paint();
  setPlaying(true);
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

/* helpers shared by demo scripts */
const demoEl = (s) => document.querySelector(s);
const on = (sel, cls = "on") => demoEl(sel)?.classList.add(cls);
const off = (sel, cls = "on") => demoEl(sel)?.classList.remove(cls);
const setText = (sel, txt) => { const el = demoEl(sel); if (el) el.textContent = txt; };
