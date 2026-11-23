// Compare two dinosaurs. The choice is kept in the address, so a comparison can be shared.
const page = document.getElementById("page");
const byName = DINOS.slice().sort((a, b) => a.name.localeCompare(b.name));

const MATCHUPS = [
  ["T. rex vs. Triceratops", "tyrannosaurus", "triceratops"],
  ["Allosaurus vs. Stegosaurus", "allosaurus", "stegosaurus"],
  ["Biggest vs. smallest", "argentinosaurus", "archaeopteryx"],
  ["Spinosaurus vs. T. rex", "spinosaurus", "tyrannosaurus"]
];

const params = new URLSearchParams(location.search);
let a = findDino(params.get("a")) || findDino("tyrannosaurus");
let b = findDino(params.get("b")) || findDino("stegosaurus");
if (a === b) b = findDino(a.id === "stegosaurus" ? "tyrannosaurus" : "stegosaurus");

// ── Words ────────────────────────────────────────────────────
const times = n => n >= 10 ? Math.round(n).toLocaleString() : String(Math.round(n * 10) / 10);

function versus(x, y, key, word) {
  const [big, small] = x[key] >= y[key] ? [x, y] : [y, x];
  const ratio = big[key] / small[key];
  if (ratio < 1.1) return `About the same ${word === "longer" ? "length" : "weight"}!`;
  const diff = Math.round((big[key] - small[key]) * 10) / 10;
  if (ratio < 1.95) return `${big.name} was ${word === "longer" ? fmtLength(diff) : fmtWeight(diff)} ${word}.`;
  return `${big.name} was about ${times(ratio)} times ${word === "longer" ? "as long" : "as heavy"}.`;
}

function meeting(x, y) {
  if (livedTogether(x, y)) {
    const shared = x.continents.filter(c => y.continents.includes(c));
    return shared.length
      ? { title: "Maybe!", text: `They lived at the same time, and fossils of both have been found in ${shared.join(" and ")}.` }
      : { title: "Probably not", text: `They lived at the same time, but ${x.name} fossils come from ${x.continents.join(" and ")} and ${y.name} fossils come from ${y.continents.join(" and ")}.` };
  }
  const [older, newer] = x.start > y.start ? [x, y] : [y, x];
  const gap = older.end - newer.start;
  const extra = gap > TIME_END
    ? ` That's longer than the ${TIME_END} million years between the last T. rex and you!` : "";
  const text = gap < 1
    ? `${older.name} died out at about the time ${newer.name} appeared.`
    : `${older.name} was gone about ${gap} million years before ${newer.name} appeared.${extra}`;
  return { title: "No way!", text };
}

function kinship(x, y) {
  const px = pathTo(FAMILY_TREE, x.group), py = pathTo(FAMILY_TREE, y.group);
  const names = {};
  (function walk(n) { names[n.id] = n.name; (n.children || []).forEach(walk); })(FAMILY_TREE);
  if (x.group === y.group) return `<strong>Close family.</strong> Both belong to: ${names[x.group]}.`;
  if (px[1] === py[1]) return `<strong>Cousins.</strong> Both are ${names[px[1]]}, but in different groups: ${names[x.group]} and ${names[y.group]}.`;
  return `<strong>Distant cousins.</strong> ${x.name} is one of the ${names[px[1]]}, and ${y.name} is one of the ${names[py[1]]}.`;
}

// ── The picture: nose to nose, with people in between ────────
function renderScene() {
  const kidM = getKidInches() * 0.0254;
  const size = (d, color) => {
    const art = silhouetteOf(d, color);
    const w = d.lengthM * art.span;
    return { art, w, h: (art.h * w) / 100 };
  };
  const A = size(a, "var(--a)"), B = size(b, "var(--b)");
  const gap = Math.max(0.3, Math.max(A.w, B.w) * 0.03);
  const adultW = 0.3 * ADULT_M, kidW = 0.3 * kidM;

  const xA = 0.2;
  const xAdult = xA + A.w + gap;
  const xKid = xAdult + adultW + 0.2;
  const xB = xKid + kidW + gap;
  const width = xB + B.w + 0.2;
  const tallest = Math.max(A.h, B.h, ADULT_M, kidM);
  const height = tallest * 1.15;
  const g = height;

  // A little arrow so a tiny dinosaur doesn't get lost.
  const pointer = (d, x, s) => {
    if (s.w > width * 0.06) return "";
    const t = width * 0.016, cx = x + s.w / 2, top = g - s.h - t * 0.6;
    return `<path class="pointer" d="M${cx - t / 2},${top - t} L${cx + t / 2},${top - t} L${cx},${top} Z"><title>${d.name} is here</title></path>`;
  };

  document.getElementById("size-scene").innerHTML = `
    <svg viewBox="0 0 ${width} ${height * 1.01}" role="img" aria-label="${a.name} and ${b.name} drawn to the same scale, with a grown-up and you in between">
      <g class="dino-a" transform="translate(${xA} ${g - A.h}) scale(${A.w / 100})">${A.art.shape}</g>
      <g class="dino-b" transform="translate(${xB + B.w} ${g - B.h}) scale(${-B.w / 100} ${B.w / 100})">${B.art.shape}</g>
      ${personSVG(xAdult, g, ADULT_M, "adult")}
      ${personSVG(xKid, g, kidM, "kid")}
      ${pointer(a, xA, A)}${pointer(b, xB, B)}
      <line class="ground" x1="0" y1="${g}" x2="${width}" y2="${g}"/>
    </svg>`;

  document.getElementById("size-legend").innerHTML = `
    <span><i class="key" style="background:var(--a)"></i>${a.name}</span>
    <span><i class="key" style="background:var(--b)"></i>${b.name}</span>
    <span><i class="key key-adult"></i>Grown-up: ${fmtHeight(ADULT_M)}</span>
    <span><i class="key key-kid"></i>You: ${fmtHeight(kidM)}</span>`;
}

// ── The results ──────────────────────────────────────────────
function statHTML(title, key, fmt, word, note) {
  const max = Math.max(a[key], b[key]);
  const row = (d, side) => `
    <div class="stat-row ${side}"><span class="stat-name">${d.name}</span>
      <div><div class="bar" style="width:${(d[key] / max) * 100}%"></div>${fmt(d[key])}${note ? `, ${note(d[key])}` : ""}</div></div>`;
  return `<div class="stat"><h3>${title}</h3>${row(a, "side-a")}${row(b, "side-b")}<p class="muted">${versus(a, b, key, word)}</p></div>`;
}

function render() {
  // Browsers limit how often the address can change; the page should carry on if so.
  try { history.replaceState(null, "", `compare.html?a=${a.id}&b=${b.id}`); } catch {}
  document.title = `${a.name} vs. ${b.name} · Dino Time Machine`;

  for (const [select, mine, other] of [["pick-a", a, b], ["pick-b", b, a]]) {
    const el = document.getElementById(select);
    el.value = mine.id;
    [...el.options].forEach(o => { o.disabled = o.value === other.id; });
  }

  const met = meeting(a, b);
  document.getElementById("headline").textContent = versus(a, b, "lengthM", "longer");
  document.getElementById("met").innerHTML = `<strong>${met.title}</strong>${met.text}`;
  const placeholder = [a, b].filter(d => !SILHOUETTES[d.id]).map(d => d.name);
  document.getElementById("scene-note").textContent = "Drawn to the same scale. Length is measured along the body." +
    (placeholder.length ? ` ${placeholder.join(" and ")}'s shape is a placeholder.` : "");

  document.getElementById("stats").innerHTML =
    statHTML("Length", "lengthM", fmtLength, "longer") +
    statHTML("Weight", "weightKg", fmtWeight, "heavier", weightCompare);

  const pair = (title, html) => `<div class="stat"><h3>${title}</h3><div class="pair">
    <div class="side-a"><span class="stat-name">${a.name}</span><br>${html(a)}</div>
    <div class="side-b"><span class="stat-name">${b.name}</span><br>${html(b)}</div></div></div>`;
  document.getElementById("more").innerHTML =
    pair("What it ate", d => `${DIETS[d.diet].icon} ${DIETS[d.diet].label}${d.dietNote ? ` (${d.dietNote})` : ""}`) +
    pair("Where its fossils were found", d => d.found) +
    pair("Fun fact", d => d.fact) +
    `<div class="stat"><h3>Are they related?</h3><p>${kinship(a, b)}</p></div>`;

  const oldest = Math.max(a.start, b.start), newest = Math.min(a.end, b.end);
  const pad = Math.max(8, (oldest - newest) * 0.25);
  renderTimeline(document.getElementById("pair-timeline"), [a, b], {
    from: Math.min(TIME_START, Math.ceil(oldest + pad)),
    to: Math.max(TIME_END, Math.floor(newest - pad))
  });

  document.getElementById("links").innerHTML = [a, b].map(d => `<a class="button" href="dino.html?id=${d.id}">All about ${d.name} →</a>`).join("");
  renderScene();
}

// ── The page ─────────────────────────────────────────────────
const options = byName.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
page.className = "compare";
page.innerHTML = `
  <section class="hero"><h1>Compare two dinosaurs</h1></section>

  <section class="panel">
    <div class="pickers">
      <div class="picker side-a"><label for="pick-a">First dinosaur</label><select id="pick-a">${options}</select></div>
      <button type="button" class="button" id="swap">⇄ Swap</button>
      <div class="picker side-b"><label for="pick-b">Second dinosaur</label><select id="pick-b">${options}</select></div>
    </div>
    <div class="matchups">
      <button type="button" class="button" id="surprise">🎲 Surprise me</button>
      ${MATCHUPS.map(([name], i) => `<button type="button" class="button" data-matchup="${i}">${name}</button>`).join("")}
    </div>
  </section>

  <section class="panel">
    <h2>Side by side</h2>
    <p id="headline" class="headline" aria-live="polite"></p>
    <div id="size-scene" class="size-scene"></div>
    <div id="size-legend" class="size-legend"></div>
    ${heightFormHTML()}
    <p id="scene-note" class="small muted"></p>
  </section>

  <section class="panel"><h2>Who was bigger?</h2><div id="stats"></div></section>

  <section class="panel">
    <h2>Could they have met?</h2>
    <p id="met" class="verdict"></p>
    <div id="pair-timeline" class="timeline"></div>
  </section>

  <section class="panel"><h2>More to compare</h2><div id="more"></div></section>
  <div id="links" class="compare-links"></div>`;

function choose(x, y) { a = x; b = y; render(); }

document.getElementById("pick-a").addEventListener("change", e => choose(findDino(e.target.value), b));
document.getElementById("pick-b").addEventListener("change", e => choose(a, findDino(e.target.value)));
document.getElementById("swap").addEventListener("click", () => choose(b, a));
document.querySelectorAll("[data-matchup]").forEach(btn => btn.addEventListener("click", () => {
  const [, x, y] = MATCHUPS[btn.dataset.matchup];
  choose(findDino(x), findDino(y));
}));
document.getElementById("surprise").addEventListener("click", () => {
  // Always a new pair.
  let x, y;
  do {
    x = DINOS[Math.floor(Math.random() * DINOS.length)];
    y = DINOS[Math.floor(Math.random() * DINOS.length)];
  } while (x === y || (x === a && y === b));
  choose(x, y);
});
startHeightForm(renderScene);
render();
