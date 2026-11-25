const page = document.getElementById("page");
const id = new URLSearchParams(location.search).get("id");
const dino = findDino(id);
// (the page is drawn at the bottom of this file, once everything is defined)

// ── Family tree helpers ──────────────────────────────────────
function treeHTML(node, path, current) {
  const onPath = path.includes(node.id);
  const members = DINOS.filter(x => x.group === node.id);
  return `
    <li class="${onPath ? "on-path" : ""}">
      <span class="node">${node.name}${node.note ? ` <small>${node.note}</small>` : ""}</span>
      ${node.children ? `<ul>${node.children.map(c => treeHTML(c, path, current)).join("")}</ul>` : ""}
      ${members.length ? `<div class="members">${members.map(x =>
        x.id === current.id
          ? `<span class="member me">${x.name}</span>`
          : `<a class="member" href="dino.html?id=${x.id}">${x.name}</a>`).join("")}</div>` : ""}
    </li>`;
}

// ── Size comparison ──────────────────────────────────────────
function renderSize(d) {
  const kidM = getKidInches() * 0.0254;
  const art = sizeArt(d, periodOf(d).color);
  const L = d.lengthM;
  const W = L * art.span; // how much ground it covers; less than its length if curved
  const H = (art.h * W) / 100;
  const showBus = L >= 4;

  const adultW = 0.3 * ADULT_M, kidW = 0.3 * kidM;
  const xAdult = 0.2;
  const xKid = xAdult + adultW + 0.25;
  const xDino = xKid + kidW + Math.max(0.5, L * 0.05);
  const width = xDino + Math.max(W, showBus ? BUS_M.length : 0) + 0.3;
  const height = Math.max(H, ADULT_M, showBus ? BUS_M.height : 0) * 1.12;
  const ground = height;

  const bus = showBus ? `
    <g class="bus">
      <rect x="${xDino}" y="${ground - BUS_M.height}" width="${BUS_M.length}" height="${BUS_M.height - 0.45}" rx="0.3"/>
      <circle cx="${xDino + 2.2}" cy="${ground - 0.45}" r="0.45"/>
      <circle cx="${xDino + BUS_M.length - 2.2}" cy="${ground - 0.45}" r="0.45"/>
    </g>` : "";

  document.getElementById("size-scene").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${d.name} compared with a grown-up, you${showBus ? " and a school bus" : ""}">
      ${bus}
      <g transform="translate(${xDino} ${ground - H}) scale(${W / 100})">
        ${art.shape}
      </g>
      ${personSVG(xAdult, ground, ADULT_M, "adult")}
      ${personSVG(xKid, ground, kidM, "kid")}
      <line class="ground" x1="0" y1="${ground}" x2="${width}" y2="${ground}"/>
    </svg>`;

  document.getElementById("size-legend").innerHTML = `
    <span>${SIZE_ART[d.id] ? "" : `<i class="key key-dino" style="background:${periodOf(d).color}"></i>`}${d.name}: ${fmtLength(L)} long</span>
    <span><i class="key key-adult"></i>Grown-up: ${fmtHeight(ADULT_M)}</span>
    <span><i class="key key-kid"></i>You: ${fmtHeight(kidM)}</span>
    ${showBus ? `<span><i class="key key-bus"></i>School bus: ${fmtLength(BUS_M.length)}</span>` : ""}`;
}

// ── The page ─────────────────────────────────────────────────
const shortLength = m => m < 1 ? `${Math.round(m * 39.37)} in` : `${Math.round(m * 3.281)} ft`;

// Scrolls down to a section slowly enough to see the page go by. Scrolling, tapping or pressing a key takes over.
function glideTo(e) {
  const to = document.querySelector(e.currentTarget.hash);
  if (!to || e.metaKey || e.ctrlKey || e.shiftKey || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  e.preventDefault();
  if (location.hash !== e.currentTarget.hash) history.pushState(null, "", e.currentTarget.hash);
  const from = scrollY, t0 = performance.now(), time = Math.max(1000, Math.min(2200, Math.abs(to.getBoundingClientRect().top) * .65));
  const takeOver = ["wheel", "touchstart", "pointerdown", "keydown"];
  let going = true;
  const done = () => { going = false; takeOver.forEach(x => removeEventListener(x, done)); };
  takeOver.forEach(x => addEventListener(x, done, { passive: true }));
  const tick = now => {
    if (!going) return;
    const t = Math.max(0, Math.min(1, (now - t0) / time)), ease = (1 - Math.cos(Math.PI * t)) / 2;
    const end = Math.min(to.getBoundingClientRect().top + scrollY, document.documentElement.scrollHeight - innerHeight);
    scrollTo({ top: from + (end - from) * ease, behavior: "instant" });
    if (t < 1) return requestAnimationFrame(tick);
    done();
    const h = to.querySelector("h2");
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  };
  requestAnimationFrame(tick);
}

function renderPage(d) {
  document.title = `${d.name} · The Dino Field Club`;
  const p = periodOf(d);
  const diet = DIETS[d.diet];
  const art = HERO_ART[d.id];

  const neighbors = DINOS.filter(x => x.id !== d.id && livedTogether(d, x));
  const relatives = DINOS.filter(x => x.id !== d.id && x.group === d.group);
  const path = pathTo(FAMILY_TREE, d.group) || [];

  const ordered = DINOS.slice().sort((a, b) => b.start - a.start || a.name.localeCompare(b.name));
  const i = ordered.findIndex(x => x.id === d.id);
  const prev = ordered[i - 1], next = ordered[i + 1];

  page.innerHTML = `
    <section class="club-hero" style="--tint:${p.color}">
      <p class="club-time"><i></i><b>${p.name}</b> ~ ${d.start} to ${d.end} million years ago</p>
      <h1 class="club-name" style="--len:${Math.max(...d.name.split(" ").map(w => w.length))}">${d.name}</h1>
      <div class="club-say"><button type="button" id="say-name" aria-label="Hear how to say ${d.name}" hidden><img src="images/hero/audio.svg" width="32" height="32" alt=""></button><span>${d.say}</span></div>
      <p class="club-meaning">It means “${d.meaning}”.</p>
      <div class="club-art" aria-hidden="true">${heroArtHTML(d)}
      </div>
    </section>

    <section class="club-facts" aria-label="Quick facts">
      <div class="club-row">
        <div class="club-fact"><h2>Length</h2><p>${shortLength(d.lengthM)}</p></div>
        <div class="club-fact"><h2>Weight</h2><p>${Math.round(d.weightKg * 2.205).toLocaleString()} lb</p></div>
        <div class="club-fact"><h2>Food</h2><p>${diet.label}</p>${d.dietNote ? `<p class="note">${d.dietNote}</p>` : ""}</div>
        <a class="club-fact" href="#stage"><h2>Fossils found in</h2><p>${d.found}</p></a>
      </div>
      <a class="club-globe" id="fact-globe" href="#stage" tabindex="-1" aria-hidden="true">${art && art.globe ? `<img src="${art.globe}" width="225" height="221" alt="">` : ""}</a>
    </section>

    ${typeof photosHTML === "function" ? photosHTML(d) : ""}

    <section class="club-fun${d.fact.length > 90 ? " is-long" : d.fact.length > 65 ? " is-medium" : ""}"><h2>Fun fact</h2><p>${d.fact}</p></section>

    ${callHTML(d)}

    <section class="panel">
      <h2>How big was it?</h2>
      <p>${fmtLength(d.lengthM)} long and ${fmtWeight(d.weightKg)}: ${weightCompare(d.weightKg)}.</p>
      <div id="size-scene" class="size-scene"></div>
      <div id="size-legend" class="size-legend"></div>
      ${heightFormHTML()}
      <p class="small muted">${SIZE_ART[d.id]
        ? "Length is measured along the body, from nose to tail tip. The colors are a guess."
        : SILHOUETTES[d.id]
        ? `Length is measured along the body, from nose to tail tip. <a href="credits.html#${d.id}">Who drew this?</a>`
        : "This dinosaur's shape is a placeholder, so only its length is right."}</p>
      <p><a class="button" href="compare.html?a=${d.id}">Compare with another dinosaur →</a></p>
    </section>

    ${fossilMapHTML(d)}

    <section class="panel">
      <h2>When did it live?</h2>
      <p class="muted">${neighbors.length ? `${d.name} is highlighted. The others on this chart were alive at the same time.` : `${d.name} is the only dinosaur on our site from this time.`}</p>
      <div id="mini-timeline" class="timeline"></div>
    </section>

    <section class="panel">
      <h2>Who else was around?</h2>
      ${neighbors.length
        ? `<div class="grid">${neighbors.map(x => {
            const shared = x.continents.filter(c => d.continents.includes(c));
            const note = shared.length ? `Also lived in ${shared.join(" & ")}` : `Lived in ${x.continents.join(" & ")}`;
            return dinoCard(x, `<p class="small muted">${note}</p>`);
          }).join("")}</div>`
        : `<p>None of the other dinosaurs on our site lived at the same time as ${d.name}. As we add more dinosaurs, its neighbors will show up here.</p>`}
    </section>

    <section class="panel">
      <h2>Family tree</h2>
      <p class="muted">${relatives.length
        ? `Its closest relatives on this site: ${relatives.map(x => `<a href="dino.html?id=${x.id}">${x.name}</a>`).join(", ")}.`
        : `It's the only member of its group on this site so far.`}</p>
      <ul class="tree">${treeHTML(FAMILY_TREE, path, d)}</ul>
    </section>

    <nav class="prevnext">
      ${prev ? `<a href="dino.html?id=${prev.id}">← Older: ${prev.name}</a>` : "<span></span>"}
      ${next ? `<a href="dino.html?id=${next.id}">Newer: ${next.name} →</a>` : "<span></span>"}
    </nav>`;

  const shown = [d, ...neighbors];
  const oldest = Math.max(...shown.map(x => x.start));
  const newest = Math.min(...shown.map(x => x.end));
  const pad = Math.max(8, (oldest - newest) * 0.25);
  renderTimeline(document.getElementById("mini-timeline"), shown, {
    currentId: d.id,
    from: Math.min(TIME_START, Math.ceil(oldest + pad)),
    to: Math.max(TIME_END, Math.floor(newest - pad))
  });
  renderSize(d);
  startSounds(d);
  fitGiant();
  document.fonts.ready.then(fitGiant);

  document.querySelectorAll('.club-facts a[href="#stage"]').forEach(a => a.addEventListener("click", glideTo));

  startHeightForm(() => renderSize(d));
  if (typeof startPhotos === "function") startPhotos();
}

// ── Start ────────────────────────────────────────────────────
if (!dino) {
  page.innerHTML = `<section class="panel"><h1>Dinosaur not found</h1><p><a href="index.html">Back to the dig</a></p></section>`;
} else {
  renderPage(dino);
}
