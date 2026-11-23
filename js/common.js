// Shared helpers used by both pages.

const TIME_START = 252; // left edge of the timeline (millions of years ago)
const TIME_END = 66;    // right edge: the asteroid

// Where a date sits on the timeline, as a percentage from the left.
function pct(ma) {
  return ((TIME_START - ma) / (TIME_START - TIME_END)) * 100;
}

function periodAt(ma) {
  return PERIODS.find(p => ma <= p.start && ma >= p.end) || null;
}

function periodOf(d) {
  return periodAt((d.start + d.end) / 2) || PERIODS[2];
}

function findDino(id) {
  return DINOS.find(d => d.id === id);
}

function livedTogether(a, b) {
  return a.start > b.end && b.start > a.end;
}

// The groups a dinosaur belongs to, from the top of the family tree down.
function pathTo(node, groupId, trail = []) {
  const here = [...trail, node.id];
  if (node.id === groupId) return here;
  for (const child of node.children || []) {
    const found = pathTo(child, groupId, here);
    if (found) return found;
  }
  return null;
}

// ── Formatting ───────────────────────────────────────────────
function fmtLength(m) {
  if (m < 1) return `${Math.round(m * 100)} cm (${Math.round(m * 39.37)} in)`;
  return `${m} m (${Math.round(m * 3.281)} ft)`;
}

function fmtWeight(kg) {
  return `${kg.toLocaleString()} kg (${Math.round(kg * 2.205).toLocaleString()} lb)`;
}

const WEIGHT_REFS = [
  { one: "African elephant", many: "African elephants", kg: 6000 },
  { one: "car", many: "cars", kg: 1500 },
  { one: "horse", many: "horses", kg: 500 },
  { one: "grown-up", many: "grown-ups", kg: 70 },
  { one: "big dog", many: "big dogs", kg: 30 },
  { one: "house cat", many: "house cats", kg: 4 },
  { one: "chicken", many: "chickens", kg: 2 }
];

function weightCompare(kg) {
  const ref = WEIGHT_REFS.find(r => kg >= r.kg);
  if (!ref) return "lighter than a chicken";
  const n = Math.round(kg / ref.kg);
  return n <= 1 ? `about as heavy as ${/^[aeiou]/i.test(ref.one) ? "an" : "a"} ${ref.one}` : `as heavy as about ${n} ${ref.many}`;
}

function fmtAgo(ma) {
  return `${ma} million years ago`;
}

// ── Placeholder silhouettes ──────────────────────────────────
// Real drawings live in images/silhouettes/<id>.svg and are listed in
// js/silhouettes.js. These rough shapes are the fallback for any dinosaur
// without one. Each is drawn in a box 100 units long; h is how tall the shape is in those units.
const SHAPES = {
  biped: {
    h: 36,
    d: "M0,17 Q22,13 42,12 Q58,9 70,11 L80,5 Q90,2 99,6 L100,11 Q93,14 84,13 L76,17 Q68,24 58,24 L57,30 L60,36 L55,36 L51,29 L47,25 L46,31 L49,36 L44,36 L40,26 Q22,22 0,19 Z"
  },
  longneck: {
    h: 40,
    d: "M0,20 Q15,16 30,14 Q45,8 60,12 Q70,6 80,2 L90,1 Q94,3 90,5 L82,6 Q74,12 70,20 Q68,24 64,26 L64,40 L58,40 L57,28 L44,28 L43,40 L37,40 L36,27 Q30,26 26,22 Q12,21 0,22 Z"
  },
  quad: {
    h: 34,
    d: "M0,18 Q20,12 40,8 Q55,5 70,9 Q80,12 86,15 L96,16 Q100,20 96,24 L86,25 Q80,26 76,24 L74,34 L68,34 L67,26 L42,26 L40,34 L34,34 L33,24 Q20,22 0,20 Z"
  }
};

// The drawing for a dinosaur: its height when 100 wide, how wide it is compared
// with the animal's real length, and the shape itself.
function silhouetteOf(d, color) {
  const real = SILHOUETTES[d.id];
  if (real) return { real: true, h: real.h, span: real.span, shape: `<use href="images/silhouettes/${d.id}.svg#shape" fill="${color}"/>` };
  // The long-neck shape only fills 92 of its 100 units, so stretch it to the true length.
  const s = SHAPES[d.body] || SHAPES.biped;
  return { real: false, h: s.h, span: d.body === "longneck" ? 100 / 92 : 1, shape: `<path d="${s.d}" fill="${color}"/>` };
}

function silhouetteSVG(d, color) {
  const s = silhouetteOf(d, color);
  return `<svg class="silhouette" viewBox="0 0 100 ${s.h}" aria-hidden="true">${s.shape}</svg>`;
}

// ── Small building blocks ────────────────────────────────────
function periodChip(p) {
  return `<span class="chip" style="--chip:${p.color}">${p.name}</span>`;
}

function dietChip(d) {
  const diet = DIETS[d.diet];
  return `<span class="chip chip-plain">${diet.icon} ${diet.label}</span>`;
}

function dinoCard(d, extra = "") {
  const p = periodOf(d);
  return `
    <a class="card" href="dino.html?id=${d.id}">
      <div class="art" style="--tint:${p.color}">${silhouetteSVG(d, "rgba(255,255,255,.92)")}</div>
      <div class="card-body">
        <h3>${d.name}</h3>
        <div class="chips">${periodChip(p)}${dietChip(d)}</div>
        ${extra}
      </div>
    </a>`;
}

// ── The timeline ─────────────────────────────────────────────
// opts.from / opts.to zoom the chart into part of the timeline.
function renderTimeline(el, dinos, opts = {}) {
  const from = opts.from ?? TIME_START;
  const to = opts.to ?? TIME_END;
  const x = ma => ((from - ma) / (from - to)) * 100;
  const clamp = v => Math.min(100, Math.max(0, v));
  const span = (start, end) => {
    const l = clamp(x(start)), r = clamp(x(end));
    return `left:${l}%;width:${r - l}%`;
  };

  const bands = PERIODS.map(p => `<span class="band" style="${span(p.start, p.end)};background:${p.color}"></span>`).join("");

  const head = `
    <div class="tl-row tl-head">
      <span class="tl-label"></span>
      <span class="tl-track">${PERIODS.filter(p => p.start > to && p.end < from).map(p =>
        `<span class="band-label" style="${span(p.start, p.end)};background:${p.color}">${p.name}</span>`
      ).join("")}</span>
    </div>`;

  const rows = dinos.slice().sort((a, b) => b.start - a.start || a.name.localeCompare(b.name)).map(d => {
    // Anchored on the right so very short bars never spill off the end.
    const right = 100 - x(d.end);
    const width = Math.max(x(d.end) - x(d.start), 0.6);
    return `
      <a class="tl-row ${opts.currentId === d.id ? "is-current" : ""}" href="dino.html?id=${d.id}" data-id="${d.id}"
         title="${d.name}: ${d.start} to ${d.end} million years ago">
        <span class="tl-label">${d.name}</span>
        <span class="tl-track">${bands}
          <span class="tl-bar" style="right:${right}%;width:${width}%;background:${periodOf(d).color}"></span>
          <span class="tl-now" hidden></span>
        </span>
      </a>`;
  }).join("");

  const range = from - to;
  const step = range <= 30 ? 5 : range <= 80 ? 10 : 25;
  const ticks = [];
  for (let ma = Math.floor(from / step) * step; ma > to + step * 0.6; ma -= step) ticks.push(ma);
  const endLabel = to === TIME_END ? "66 💥" : to;
  const axis = `
    <div class="tl-row tl-axis">
      <span class="tl-label">million years ago</span>
      <span class="tl-track">${ticks.map(ma => `<span class="tick" style="left:${x(ma)}%">${ma}</span>`).join("")}
        <span class="tick tick-end" style="left:100%">${endLabel}</span>
      </span>
    </div>`;

  el.innerHTML = head + rows + axis;
}
