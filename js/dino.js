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
  const art = silhouetteOf(d, periodOf(d).color);
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
    <span><i class="key key-dino" style="background:${periodOf(d).color}"></i>${d.name}: ${fmtLength(L)} long</span>
    <span><i class="key key-adult"></i>Grown-up: ${fmtHeight(ADULT_M)}</span>
    <span><i class="key key-kid"></i>You: ${fmtHeight(kidM)}</span>
    ${showBus ? `<span><i class="key key-bus"></i>School bus: ${fmtLength(BUS_M.length)}</span>` : ""}`;
}

// ── The page ─────────────────────────────────────────────────
function renderPage(d) {
  document.title = `${d.name} · Dino Time Machine`;
  const p = periodOf(d);
  const diet = DIETS[d.diet];

  const neighbors = DINOS.filter(x => x.id !== d.id && livedTogether(d, x));
  const relatives = DINOS.filter(x => x.id !== d.id && x.group === d.group);
  const path = pathTo(FAMILY_TREE, d.group) || [];

  const ordered = DINOS.slice().sort((a, b) => b.start - a.start || a.name.localeCompare(b.name));
  const i = ordered.findIndex(x => x.id === d.id);
  const prev = ordered[i - 1], next = ordered[i + 1];

  page.innerHTML = `
    <nav class="crumbs"><a href="index.html">← Time machine</a></nav>

    <section class="dino-hero panel">
      <div class="art art-big" style="--tint:${p.color}">${silhouetteSVG(d, "rgba(255,255,255,.92)")}</div>
      <div>
        <h1>${d.name}</h1>
        <p class="say">Say it: <strong>${d.say}</strong></p>
        <p class="meaning">The name means <strong>"${d.meaning}"</strong></p>
        <div class="chips">${periodChip(p)}${dietChip(d)}</div>
        <p class="lived">Lived about <strong>${d.start} to ${d.end} million years ago</strong></p>
      </div>
    </section>

    <section class="facts">
      <div class="fact"><span class="fact-label">Length</span><span class="fact-value">${fmtLength(d.lengthM)}</span></div>
      <div class="fact"><span class="fact-label">Weight</span><span class="fact-value">${fmtWeight(d.weightKg)}</span>
        <span class="fact-note">${weightCompare(d.weightKg)}</span></div>
      <div class="fact"><span class="fact-label">Ate</span><span class="fact-value">${diet.icon} ${diet.label}</span>
        ${d.dietNote ? `<span class="fact-note">${d.dietNote}</span>` : ""}</div>
      <div class="fact"><span class="fact-label">Fossils found in</span><span class="fact-value">${d.found}</span></div>
    </section>

    <section class="funfact panel"><strong>Fun fact:</strong> ${d.fact}</section>

    <section class="panel">
      <h2>How big was it?</h2>
      <div id="size-scene" class="size-scene"></div>
      <div id="size-legend" class="size-legend"></div>
      ${heightFormHTML()}
      <p class="small muted">${SILHOUETTES[d.id]
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
            const note = shared.length ? `🤝 Also lived in ${shared.join(" & ")}` : `🌍 Lived in ${x.continents.join(" & ")}`;
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
  startFossilMap(d);

  startHeightForm(() => renderSize(d));
}

// ── Start ────────────────────────────────────────────────────
if (!dino) {
  page.innerHTML = `<section class="panel"><h1>Dinosaur not found</h1><p><a href="index.html">Back to the time machine</a></p></section>`;
} else {
  renderPage(dino);
}
