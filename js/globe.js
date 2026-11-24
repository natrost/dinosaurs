// The spinning globe. Land and plate movements come from js/earth.js, fossils from js/fossils.js.
const $ = id => document.getElementById(id);
const canvas = $("globe"), ctx = canvas.getContext("2d"), labels = $("labels");
const RAD = Math.PI / 180, MILES = 3959;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const INK = css("--ink"), SKY = css("--sky"), SAND = css("--sand"), RUST = "#b8402c";
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Vectors and rotations ────────────────────────────────────
const vec = (lat, lng) => [Math.cos(lat * RAD) * Math.cos(lng * RAD), Math.cos(lat * RAD) * Math.sin(lng * RAD), Math.sin(lat * RAD)];
const latLng = v => [Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD, Math.atan2(v[1], v[0]) / RAD];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const turn = ([w, x, y, z], [a, b, c]) => {
  const t = [2 * (y * c - z * b), 2 * (z * a - x * c), 2 * (x * b - y * a)];
  return [a + w * t[0] + y * t[2] - z * t[1], b + w * t[1] + z * t[0] - x * t[2], c + w * t[2] + x * t[1] - y * t[0]];
};
const undo = ([w, x, y, z]) => [w, -x, -y, -z];
// How far a plate has turned at a time, blended between the 5-million-year steps.
function plateTurn(k, ma) {
  const T = EARTH.times, p = EARTH.plates[k], n = p.length / 4;
  let i = 0;
  while (i < T.length - 2 && T[i + 1] <= ma) i++;
  i = Math.max(0, Math.min(i, n - 2));
  const u = Math.max(0, Math.min(1, (ma - T[i]) / (T[i + 1] - T[i])));
  const q = [0, 1, 2, 3].map(j => p[i * 4 + j] * (1 - u) + p[i * 4 + 4 + j] * u);
  const len = Math.hypot(...q);
  return q.map(x => x / len);
}

// Cuts every corner off a coastline (twice), so it curves instead of zigzagging.
function rounded(v) {
  const unit = p => { const n = Math.hypot(...p); return p.map(x => x / n); };
  for (let pass = 0; pass < 2 && v.length > 4; pass++) v = v.flatMap((p, i) => {
    const q = v[(i + 1) % v.length];
    return [unit(p.map((x, k) => x * .75 + q[k] * .25)), unit(p.map((x, k) => x * .25 + q[k] * .75))];
  });
  return v;
}

// ── Land ─────────────────────────────────────────────────────
const LAND = EARTH.land.map(([plate, oldest, flat]) => {
  const pts = [];
  let x = 0, y = 0, last = flat[0] / 100;
  for (let i = 0; i < flat.length; i += 2) {
    x += flat[i]; y += flat[i + 1];
    let lng = x / 100;
    while (lng - last > 180) lng -= 360;
    while (lng - last < -180) lng += 360;
    last = lng;
    pts.push([lng, y / 100]);
  }
  return { plate, oldest, pts, v: rounded(pts.map(p => vec(p[1], p[0]))), flat: null };
});
function inside(piece, lat, lng) {
  for (const off of [-360, 0, 360]) {
    const X = lng + off, r = piece.pts;
    let hit = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++)
      if ((r[i][1] > lat) !== (r[j][1] > lat) && X < (r[j][0] - r[i][0]) * (lat - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) hit = !hit;
    if (hit) return true;
  }
  return false;
}
// The piece of land a present-day spot rides on (or the nearest one, for spots just off a simplified coast).
function pieceAt(lat, lng, maxMiles = 1e9, ancient = false) {
  const land = ancient ? LAND.filter(p => p.oldest >= 65) : LAND;
  const on = land.find(p => p.oldest >= 65 && inside(p, lat, lng)) || land.find(p => inside(p, lat, lng));
  if (on) return on;
  const me = vec(lat, lng);
  let best = null, near = -2;
  for (const p of land) for (const v of p.v) { const d = dot(me, v); if (d > near) { near = d; best = p; } }
  return Math.acos(Math.min(1, near)) * MILES <= maxMiles ? best : null;
}

// ── Dinosaurs: where each one's fossils sit, and one spot to hang its label on ──
const CAST = DINOS.map(d => {
  const sites = FOSSILS[d.id].sites.map(([lat, lng, n]) => ({ v: vec(lat, lng), plate: pieceAt(lat, lng, 1e9, true).plate, n }));
  const crowd = s => sites.reduce((sum, o) => sum + (dot(s.v, o.v) > .985 ? o.n : 0), 0);
  return { d, sites, main: sites.slice().sort((a, b) => crowd(b) - crowd(a))[0], mid: Math.round((d.start + d.end) / 2) };
});
// The map data ends at 250 million years, so the slider's last two steps reuse that map.
const MAP_END = EARTH.times[EARTH.times.length - 1];
const existed = piece => Math.min(ma, MAP_END) <= piece.oldest;
const isAlive = d => d.start >= ma && ma >= d.end;

// ── State ────────────────────────────────────────────────────
// focus: the dinosaur picked from the list or a dot. hover: the one being pointed at.
let focus = null, hover = null, dots = [];
const active = () => hover || focus;
let ma = 67, view = { lng: -60, lat: 42 }, spin = { x: 0, y: 0 }, idle = !calm, dirty = true, pin = null, playing = false, tween = null;
// The canvas covers the whole colored section. The globe sits where .globe-wrap is and grows from there.
let W = 0, H = 0, cx = 0, cy = 0, base = 0, R = 0, zoom = 1, roomRight = 0;
const MAX_ZOOM = 5;

function toScreen(v) {
  // Turn the Earth so view.lng/view.lat faces us. Returns [x, y, depth]; depth > 0 is the near side.
  const a = view.lng * RAD, b = view.lat * RAD, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const x1 = ca * v[0] + sa * v[1], y1 = -sa * v[0] + ca * v[1];
  return [cx + R * y1, cy - R * (cb * v[2] - sb * x1), cb * x1 + sb * v[2]];
}
function fromScreen(px, py) {
  const y = (px - cx) / R, z = (cy - py) / R, r2 = y * y + z * z;
  if (r2 > 1) return null;
  const x = Math.sqrt(1 - r2), b = view.lat * RAD, a = view.lng * RAD;
  const x1 = Math.cos(b) * x - Math.sin(b) * z, z1 = Math.sin(b) * x + Math.cos(b) * z;
  return [Math.cos(a) * x1 - Math.sin(a) * y, Math.sin(a) * x1 + Math.cos(a) * y, z1];
}
const placeNow = (v, plate) => turn(plateTurn(plate, ma), v);

// ── Drawing ──────────────────────────────────────────────────
function resize() {
  const sky = $("sky"), stage = $("stage"), wrap = $("wrap"), words = $("words");
  sky.style.height = `${$("time-row").offsetTop}px`;
  W = canvas.clientWidth; H = canvas.clientHeight; base = wrap.clientWidth;
  const s = sky.getBoundingClientRect(), w = wrap.getBoundingClientRect(), t = words.getBoundingClientRect();
  cx = w.left - s.left + w.width / 2; cy = w.top - s.top + w.height / 2;
  // Labels stay clear of the words when they're side by side.
  roomRight = t.top < w.bottom && t.left > w.left ? t.left - s.left - 24 : W;
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  R = base * .475 * zoom;
  dirty = true;
}
const onGlobe = (x, y) => Math.hypot(x - cx, y - cy) < R;
const inView = (x, y) => x > -10 && x < W + 10 && y > -10 && y < H + 10;
function setZoom(z) {
  zoom = Math.max(1, Math.min(MAX_ZOOM, z));
  R = base * .475 * zoom;
  idle = false;
  $("stage").classList.toggle("is-zoomed", zoom > 1.01);
  // Zoomed in, a finger moves the globe in any direction; zoomed out, up and down still scroll the page.
  canvas.style.touchAction = zoom > 1.01 ? "none" : "pan-y";
  $("zoom-in").disabled = zoom >= MAX_ZOOM; $("zoom-out").disabled = zoom <= 1;
  dirty = true;
}
function zoomTo(z) { const from = zoom, to = Math.max(1, Math.min(MAX_ZOOM, z)); ease(calm ? 1 : 260, u => setZoom(from + (to - from) * u)); }
for (const p of LAND) p.flat = Float32Array.from(p.v.flat());
// One matrix per plate that does both turns at once: the plate's drift, then our view.
function plateMatrix(k) {
  const q = plateTurn(k, ma), a = view.lng * RAD, b = view.lat * RAD, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const rows = [[-sa, ca, 0], [-sb * ca, -sb * sa, cb], [cb * ca, cb * sa, sb]]; // right, up, toward us
  const cols = [turn(q, [1, 0, 0]), turn(q, [0, 1, 0]), turn(q, [0, 0, 1])];
  return rows.flatMap(r => cols.map(c => dot(r, c)));
}
function drawLand() {
  const mats = new Map(), TAU = 2 * Math.PI;
  // Points closer together on screen than this are merged.
  const step = .9, step2 = step * step;
  ctx.beginPath();
  for (const p of LAND) {
    if (!existed(p)) continue;
    let m = mats.get(p.plate);
    if (!m) mats.set(p.plate, m = plateMatrix(p.plate));
    const f = p.flat, n = f.length;
    let seen = false;
    for (let i = 0; i < n; i += 12) if (m[6] * f[i] + m[7] * f[i + 1] + m[8] * f[i + 2] > -.02) { seen = true; break; }
    if (!seen) continue;
    // Points behind the globe slide to its edge, following the curve.
    let first = true, edge = null, px = 0, py = 0;
    for (let i = 0; i <= n; i += 3) {
      const k = i === n ? 0 : i, a = f[k], b = f[k + 1], c = f[k + 2];
      const right = m[0] * a + m[1] * b + m[2] * c, up = m[3] * a + m[4] * b + m[5] * c, z = m[6] * a + m[7] * b + m[8] * c;
      let x, y;
      if (z > 0) { x = cx + R * right; y = cy - R * up; }
      else { const len = Math.hypot(right, up) || 1; x = cx + R * right / len; y = cy - R * up / len; }
      if (!first && i !== n && (x - px) ** 2 + (y - py) ** 2 < step2) continue;
      if (z > 0) edge = null;
      else {
        const ang = Math.atan2(y - cy, x - cx);
        if (edge !== null) {
          let by = ang - edge;
          while (by > Math.PI) by -= TAU;
          while (by < -Math.PI) by += TAU;
          const steps = Math.ceil(Math.abs(by) / .12);
          for (let q = 1; q < steps; q++) ctx.lineTo(cx + R * Math.cos(edge + by * q / steps), cy + R * Math.sin(edge + by * q / steps));
        }
        edge = ang;
      }
      if (first) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      first = false; px = x; py = y;
    }
    ctx.closePath();
  }
  // A soft sand edge the same color as the land seals the seams between neighboring plates.
  ctx.lineJoin = ctx.lineCap = "round";
  ctx.fillStyle = ctx.strokeStyle = SAND;
  ctx.lineWidth = Math.max(1.5, R * .0075);
  ctx.fill("nonzero"); ctx.stroke();
}
// ── Country borders, on today's map only ─────────────────────
const borderPaths = lines => lines.map(l => { const out = []; let x = 0, y = 0; for (let i = 0; i < l.length; i += 2) { x += l[i]; y += l[i + 1]; out.push(...vec(y / 100, x / 100)); } return Float32Array.from(out); });
const SETTLED = borderPaths(BORDERS.settled), UNSETTLED = borderPaths(BORDERS.unsettled), BROWN = "#b3976a";
function drawBorders() {
  // They appear as the continents arrive at today.
  const show = Math.max(0, 1 - ma / 6);
  if (!show) return;
  const m = plateMatrix(EARTH.plates.length - 1); // the last plate never moves, so this is just our view
  const trace = lines => {
    ctx.beginPath();
    for (const f of lines) {
      let pen = false;
      for (let i = 0; i < f.length; i += 3) {
        const a = f[i], b = f[i + 1], c = f[i + 2];
        if (m[6] * a + m[7] * b + m[8] * c <= 0) { pen = false; continue; }
        const x = cx + R * (m[0] * a + m[1] * b + m[2] * c), y = cy - R * (m[3] * a + m[4] * b + m[5] * c);
        if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        pen = true;
      }
    }
    ctx.stroke();
  };
  ctx.save();
  ctx.globalAlpha = show; ctx.strokeStyle = BROWN; ctx.lineJoin = ctx.lineCap = "round";
  ctx.lineWidth = Math.min(1.8, .9 + (zoom - 1) * .3);
  trace(SETTLED);
  ctx.setLineDash([4, 4]); trace(UNSETTLED);
  ctx.restore();
}
function drawGrid() {
  ctx.lineWidth = 1; ctx.strokeStyle = "rgba(31,50,44,.16)"; ctx.beginPath();
  const line = f => { let pen = false; for (let k = 0; k <= 72; k++) { const [x, y, z] = toScreen(f(k)); if (z > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; } };
  for (let lng = 0; lng < 360; lng += 30) line(k => vec(-90 + k * 2.5, lng));
  for (let lat = -60; lat <= 60; lat += 30) line(k => vec(lat, k * 5));
  ctx.stroke();
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = SKY; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
  drawGrid(); drawLand(); drawBorders();
  ctx.restore();

  // Fossil sites of everyone alive (or everyone, today)
  const shown = ma === 0 ? CAST : CAST.filter(o => isAlive(o.d));
  dots = [];
  const lit = active(), ivory = css("--ivory");
  // The active dinosaur is drawn last, on top of the faded ones.
  for (const o of shown.slice().sort((a, b) => (a.d.id === lit) - (b.d.id === lit))) for (const s of o.sites) {
    const [x, y, z] = toScreen(placeNow(s.v, s.plate));
    if (z <= .02 || !inView(x, y)) continue;
    const on = !lit || o.d.id === lit, r = on ? Math.min(9, (lit ? 3.6 : 2.8) + Math.sqrt(s.n)) : 2.4;
    dots.push({ x, y, r, o, s, on });
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
    if (on) { ctx.fillStyle = RUST; ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 1.2; ctx.strokeStyle = ivory; ctx.stroke(); }
    else { ctx.fillStyle = INK; ctx.globalAlpha = .22; ctx.fill(); ctx.globalAlpha = 1; }
  }
  drawLabels(ma === 0 ? (lit ? CAST.filter(o => o.d.id === lit) : []) : shown);

  if (pin && existed(pin)) {
    const [x, y, z] = toScreen(placeNow(pin.v, pin.plate));
    if (z > 0 && inView(x, y)) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 34); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 38, 10, 0, 7); ctx.fillStyle = css("--pink"); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
      ctx.font = `400 34px ${css("--pen")}`; ctx.fillStyle = INK; ctx.textAlign = x > cx ? "right" : "left";
      ctx.fillText("you", x + (x > cx ? -16 : 16), y - 34);
    }
  }
}
// Silhouettes beside the globe's busy spots, pushed apart so none overlap.
function drawLabels(shown) {
  const w = Math.max(70, base * .15), seen = [];
  for (const o of shown) {
    const [x, y, z] = toScreen(placeNow(o.main.v, o.main.plate));
    const far = Math.hypot(x - cx, y - cy), ux = far > base * .06 ? (x - cx) / far : -.8, uy = far > base * .06 ? (y - cy) / far : -.6;
    if (z > .12 && x > 0 && x < roomRight && y > 0 && y < H) seen.push({ o, ax: x, ay: y, x: x + ux * base * .19, y: y + uy * base * .16, h: w * (silhouetteOf(o.d, "").h / 100) + 22 });
  }
  seen.sort((a, b) => a.o.d.name.localeCompare(b.o.d.name));
  const fence = s => { s.x = Math.max(w / 2 + 8, Math.min(roomRight - w / 2, s.x)); s.y = Math.max(s.h / 2 + 8, Math.min(H - s.h / 2, s.y)); };
  for (let k = 0; k < 60; k++) for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
    const a = seen[i], b = seen[j], dx = b.x - a.x || .5 + i, dy = b.y - a.y || 1 + j;
    const ox = w * 1.12 - Math.abs(dx), oy = (a.h + b.h) / 2 + 6 - Math.abs(dy);
    if (ox > 0 && oy > 0) { if (ox < oy) { const m = Math.sign(dx) * ox / 2; a.x -= m; b.x += m; } else { const m = Math.sign(dy) * oy / 2; a.y -= m; b.y += m; } }
    fence(a); fence(b);
  }
  ctx.lineWidth = 2; ctx.strokeStyle = INK;
  const lit = active();
  for (const s of seen) {
    fence(s);
    ctx.globalAlpha = !lit || s.o.d.id === lit ? 1 : .15;
    ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.quadraticCurveTo((s.ax + s.x) / 2 + 8, (s.ay + s.y) / 2, s.x, s.y + s.h / 4); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const keep = new Set(seen.map(s => s.o.d.id));
  labels.querySelectorAll("a").forEach(a => { if (!keep.has(a.dataset.id)) a.remove(); });
  for (const s of seen) {
    let a = labels.querySelector(`[data-id="${s.o.d.id}"]`);
    if (!a) {
      a = document.createElement("a");
      a.dataset.id = s.o.d.id; a.href = `dino.html?id=${s.o.d.id}`; a.draggable = false;
      a.innerHTML = `${silhouetteSVG(s.o.d, "var(--ink)")}<span>${s.o.d.id === "tyrannosaurus" ? "T. rex" : s.o.d.name}</span>`;
      labels.append(a);
    }
    a.classList.toggle("is-faded", !!lit && s.o.d.id !== lit);
    a.style.width = `${w}px`;
    a.style.transform = `translate(${s.x - w / 2}px, ${s.y - s.h / 2}px)`;
  }
}

// ── Words beside the globe ───────────────────────────────────
function say() {
  $("time").value = 252 - Math.max(66, ma);
  const p = periodAt(ma), alive = CAST.filter(o => isAlive(o.d)), shownMa = Math.round(ma);
  $("stage").style.setProperty("--tint", ma < 66 || !p ? "var(--pink)" : p.color);
  $("ma").textContent = ma < 1 ? "Now" : shownMa;
  $("unit").textContent = ma < 1 ? "Every fossil site, on today's map" : `million years ago${p ? `, ${p.name}` : ""}`;
  $("blurb").textContent = ma < 66 ? "The continents have drifted to where you know them." : p ? p.blurb : "Just before the Triassic. No dinosaurs yet.";
  sayList(ma === 0 ? CAST : ma < 66 ? [] : alive);
}
let listKey = "";
function sayList(list) {
  if (focus && !list.some(o => o.d.id === focus)) focus = null;
  if (hover && !list.some(o => o.d.id === hover)) hover = null;
  const key = `${ma === 0}|${list.map(o => o.d.id)}|${focus}`;
  if (key === listKey) return; // nothing changed, so leave the buttons (and keyboard focus) alone
  listKey = key;
  const held = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.pick : null;
  $("alive").className = `globe-alive${ma === 0 ? " is-many" : ""}${focus ? " has-focus" : ""}`;
  $("alive").innerHTML = list.length
    ? list.map(o => `<li><button type="button" data-pick="${o.d.id}" aria-pressed="${o.d.id === focus}"><b>${o.d.name}</b>${ma === 0 ? "" : ` <span>${o.d.found}</span>`}</button>${ma === 0 ? "" : `<a class="go" data-over="${o.d.id}" href="dino.html?id=${o.d.id}" aria-label="All about ${o.d.name}" title="All about ${o.d.name}">→</a>`}</li>`).join("")
    : ma < 66 ? "" : "<li>None of our 19 at this moment. Keep sliding.</li>";
  if (held) { const b = $("alive").querySelector(`[data-pick="${held}"]`); if (b) b.focus({ preventScroll: true }); }
  const o = focus && CAST.find(x => x.d.id === focus), f = o && FOSSILS[focus], count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  $("detail").innerHTML = o
    ? `<p>${count(f.total, "fossil record", "fossil records")} from ${count(f.countries.length, "country", "countries")}.</p><p>${ma === 0 ? `<a class="button" href="dino.html?id=${focus}">All about ${o.d.name} →</a> ` : ""}<button type="button" class="button" id="show-all">Show everyone</button></p>`
    : list.length ? `<p class="small">Pick a name to see only where that one was found.</p>` : "";
}
function pick(id, look = true) {
  focus = focus === id ? null : id;
  hover = null; hideTip(); say(); dirty = true;
  const o = focus && CAST.find(x => x.d.id === focus);
  if (o && look) { const v = placeNow(o.main.v, o.main.plate), [x, y, z] = toScreen(v); if (z < .5 || !inView(x, y) || x > roomRight) faceTo(v); }
}
function setTime(t) { ma = t; say(); dirty = true; }
function faceTo(v, after) {
  idle = false; spin = { x: 0, y: 0 };
  const [lat, lng] = latLng(v), from = { ...view };
  const dl = ((lng - from.lng + 540) % 360 + 360) % 360 - 180, to = Math.max(-70, Math.min(70, lat));
  ease(calm ? 1 : 900, u => { view = { lng: from.lng + dl * u, lat: from.lat + (to - from.lat) * u }; dirty = true; }, after);
}
function ease(ms, step, after) {
  const t0 = performance.now();
  tween = now => { const k = Math.min(1, (now - t0) / ms), u = k < .5 ? 2 * k * k : 1 - (2 - 2 * k) ** 2 / 2; step(u); if (k === 1) { tween = null; if (after) after(); } };
}
function slideTo(t, after) { stop(); const from = ma; ease(calm ? 1 : Math.min(2600, 500 + Math.abs(t - from) * 18), u => setTime(u === 1 ? t : from + (t - from) * u), after); }
function showDino(id) {
  const o = CAST.find(x => x.d.id === id);
  slideTo(o.mid, () => { focus = id; say(); faceTo(placeNow(o.main.v, o.main.plate)); });
}
function stop() { playing = false; $("play").textContent = "Play"; tween = null; }

// ── Your place ───────────────────────────────────────────────
const miles = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * MILES;
const sayMiles = m => m < 20 ? "under 20 miles" : `about ${(m < 200 ? Math.round(m / 10) * 10 : Math.round(m / 50) * 50).toLocaleString("en-US")} miles`;
function setPin(lat, lng, name) {
  const piece = pieceAt(lat, lng, 120);
  if (!piece) {
    pin = null; dirty = true;
    $("near").innerHTML = name === "the middle of Hawaii"
      ? `<p class="near-head"><strong>Hawaii</strong> wasn’t there yet. Its islands are volcanoes that rose from the sea long after the last T. rex.</p>`
      : "<p>That’s open ocean. Try some land.</p>";
    return;
  }
  pin = { v: vec(lat, lng), plate: piece.plate, oldest: piece.oldest, name };
  const ranked = CAST.map(o => ({ o, m: Math.min(...o.sites.map(s => miles(s.v, pin.v))) })).sort((a, b) => a.m - b.m);
  const then = piece.oldest >= 68 ? latLng(turn(plateTurn(piece.plate, 68), pin.v)) : null;
  const top = ranked[0];
  $("near").innerHTML = `
    <p class="near-head"><strong>${top.o.d.name}</strong> is the closest of our 19 to ${name || "your pin"}: fossils were found ${sayMiles(top.m)} away.</p>
    ${then ? `<p>When T. rex was alive, that ground sat near latitude ${Math.abs(Math.round(then[0]))}° ${then[0] >= 0 ? "north" : "south"}. Today it’s at ${Math.abs(Math.round(lat))}° ${lat >= 0 ? "north" : "south"}. Slide back in time and watch your pin ride along.</p>` : `<p>The map model we use doesn’t trace this bit of land back that far, so your pin only shows on today’s globe.</p>`}
    <ol class="near-list">${ranked.slice(0, 8).map(({ o, m }) => `<li style="--tint:${periodOf(o.d).color}"><button type="button" data-go="${o.d.id}">${silhouetteSVG(o.d, "var(--ink)")}<span><b>${o.d.name}</b>${sayMiles(m)}<br>${o.d.start}–${o.d.end} million years ago</span></button></li>`).join("")}</ol>`;
  dirty = true;
}

// ── Dots: what's under the pointer ───────────────────────────
function dotAt(x, y) {
  let best = null, near = 11;
  for (const k of dots) {
    if (x > roomRight + 24) break;
    const d = Math.hypot(k.x - x, k.y - y) - (k.on ? k.r * .5 + 1 : 0); // prefer the lit ones
    if (d < near) { near = d; best = k; }
  }
  return best;
}
function showTip(k) {
  // Several dinosaurs can share a spot; name them all, with the one that's lit first.
  const here = dots.filter(o => Math.hypot(o.x - k.x, o.y - k.y) < 4).sort((a, b) => (b.o === k.o) - (a.o === k.o));
  const rows = [...new Map(here.map(h => [h.o.d.id, h])).values()].slice(0, 4);
  $("tip").innerHTML = rows.map(h => `<b>${h.o.d.name}</b> ${h.s.n} ${h.s.n === 1 ? "record" : "records"}`).join("<br>");
  $("tip").hidden = false;
  const w = $("tip").offsetWidth, h = $("tip").offsetHeight;
  const x = Math.max(6, Math.min(W - w - 6, k.x - w / 2)), y = k.y - h - 14 > 4 ? k.y - h - 14 : k.y + 16;
  $("tip").style.transform = `translate(${x}px, ${y}px)`;
}
function hideTip() { $("tip").hidden = true; }
function point(id) { if (hover !== id) { hover = id; dirty = true; } }
canvas.addEventListener("pointerleave", () => { if (!drag) { hideTip(); point(null); } });
for (const type of ["pointerover", "focusin"]) document.addEventListener(type, e => {
  if (type === "pointerover" && e.pointerType === "touch") return;
  const el = e.target.closest && e.target.closest("[data-pick], [data-over], #labels a");
  if (el) point(el.dataset.pick || el.dataset.over || el.dataset.id);
  else if (e.target !== canvas && hover) point(null);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && focus) pick(focus); });

// ── Hands ────────────────────────────────────────────────────
let drag = null, pinch = null;
const fingers = new Map();
const spread = () => { const [p, q] = [...fingers.values()]; return Math.hypot(p.x - q.x, p.y - q.y); };
canvas.addEventListener("pointerdown", e => {
  const box = canvas.getBoundingClientRect();
  if (!onGlobe(e.clientX - box.left, e.clientY - box.top) && !fingers.size) return;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  idle = false; spin = { x: 0, y: 0 };
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (fingers.size === 2) { pinch = { spread: spread(), zoom }; drag = null; tween = null; }
  else if (fingers.size === 1) drag = { x: e.clientX, y: e.clientY, moved: 0 };
});
canvas.addEventListener("pointermove", e => {
  if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && fingers.size === 2) return setZoom(pinch.zoom * spread() / Math.max(20, pinch.spread));
  if (!drag) {
    const box = canvas.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top;
    const hit = e.pointerType === "touch" ? null : dotAt(x, y);
    canvas.style.cursor = hit ? "pointer" : onGlobe(x, y) ? "grab" : "default";
    if (hit) showTip(hit); else hideTip();
    point(hit ? hit.o.d.id : null);
    return;
  }
  canvas.style.cursor = "grabbing";
  if (drag.moved > 4) { hideTip(); point(null); }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y, k = 57.3 / R;
  drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
  tween = drag.moved > 4 ? null : tween;
  spin = { x: -dx * k, y: dy * k };
  view.lng += spin.x; view.lat = Math.max(-85, Math.min(85, view.lat + spin.y)); dirty = true;
});
canvas.addEventListener("pointerup", e => {
  if (drag && drag.moved < 6) {
    spin = { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect(), spot = dotAt(e.clientX - r.left, e.clientY - r.top), hit = fromScreen(e.clientX - r.left, e.clientY - r.top);
    if (spot) { pick(spot.o.d.id, false); if (focus) showTip(spot); }
    else if (hit) {
      // Find which land is there now, then where that spot is on today's map.
      let today = null;
      for (const p of LAND) {
        if (!existed(p)) continue;
        const v = turn(undo(plateTurn(p.plate, ma)), hit), [lat, lng] = latLng(v);
        if (inside(p, lat, lng)) { today = [lat, lng]; break; }
      }
      $("place").value = "";
      today ? setPin(today[0], today[1], "") : ($("near").innerHTML = "<p>That’s open ocean. Try some land.</p>");
    }
  }
  if (calm) spin = { x: 0, y: 0 };
  lift(e);
});
function lift(e) { fingers.delete(e.pointerId); drag = null; if (fingers.size < 2) pinch = null; }
canvas.addEventListener("pointercancel", lift);
// Pinching on a trackpad arrives as ctrl + wheel. Ordinary scrolling is left alone.
canvas.addEventListener("wheel", e => {
  if (!e.ctrlKey) return;
  e.preventDefault(); tween = null;
  setZoom(zoom * Math.exp(-e.deltaY * .01));
}, { passive: false });
$("zoom-in").addEventListener("click", () => zoomTo(zoom * 1.6));
$("zoom-out").addEventListener("click", () => zoomTo(zoom / 1.6));
canvas.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "+" || e.key === "=") return zoomTo(zoom * 1.6);
  if (e.key === "-") return zoomTo(zoom / 1.6);
  if (e.key === "0") return zoomTo(1);
  const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
  if (!step) return;
  e.preventDefault(); idle = false;
  view.lng += step[0] * 10 / zoom; view.lat = Math.max(-85, Math.min(85, view.lat + step[1] * 10 / zoom)); dirty = true;
});
$("time").addEventListener("input", e => { stop(); setTime(252 - Number(e.target.value)); });
$("play").addEventListener("click", () => {
  if (playing) return stop();
  if (ma <= 72) setTime(252);
  tween = null; playing = true; $("play").textContent = "Pause";
});
document.querySelectorAll("[data-ma]").forEach(b => b.addEventListener("click", () => slideTo(Number(b.dataset.ma), turnToDinos)));
// Turn toward where the most dinosaurs are, unless they're already in plain view. On today's map, turn to your pin.
function turnToDinos() {
  const spots = ma === 0 ? (pin ? [placeNow(pin.v, pin.plate)] : []) : CAST.filter(o => isAlive(o.d)).map(o => placeNow(o.main.v, o.main.plate));
  if (!spots.length) return;
  const crowd = v => spots.filter(w => dot(v, w) > .8).length;
  const best = spots.slice().sort((a, b) => crowd(b) - crowd(a))[0];
  if (toScreen(best)[2] < .75) faceTo(best);
}
document.addEventListener("click", e => {
  const chosen = e.target.closest("[data-pick]");
  if (chosen) return pick(chosen.dataset.pick);
  if (e.target.id === "show-all") return pick(focus);
  const b = e.target.closest("[data-go]");
  if (b) { showDino(b.dataset.go); if (b.closest("#near")) $("stage").scrollIntoView({ behavior: calm ? "auto" : "smooth" }); }
});
$("place").innerHTML = `<option value="">Choose a place</option>` + Object.entries(PLACES).map(([g, list]) =>
  `<optgroup label="${g}">${list.map(([n]) => `<option>${n}</option>`).join("")}</optgroup>`).join("");
function choosePlace(name) {
  const hit = Object.values(PLACES).flat().find(p => p[0] === name);
  if (!hit) return;
  const state = PLACES["US states"].includes(hit);
  setPin(hit[1], hit[2], state ? `the middle of ${name}` : name);
  if (pin) faceTo(placeNow(pin.v, pin.plate));
}
$("place").addEventListener("change", e => choosePlace(e.target.value));

// ── Go ───────────────────────────────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(60, now - last); last = now;
  if (tween) tween(now);
  if (playing) { const t = Math.max(66, ma - dt * .0085); setTime(t); if (t === 66) stop(); }
  if (idle && !drag && !hover) { view.lng += dt * .006; dirty = true; }
  if (!drag && (Math.abs(spin.x) > .02 || Math.abs(spin.y) > .02)) {
    view.lng += spin.x; view.lat = Math.max(-85, Math.min(85, view.lat + spin.y)); spin.x *= .94; spin.y *= .9; dirty = true;
  }
  if (dirty) { dirty = false; draw(); if (tween || playing || Math.abs(spin.x) > .02) hideTip(); }
  requestAnimationFrame(frame);
}
addEventListener("resize", resize);
new ResizeObserver(resize).observe($("stage"));
resize(); setZoom(1); idle = !calm; say();
const ask = new URLSearchParams(location.search).get("d");
if (ask && findDino(ask)) { focus = ask; const o = CAST.find(x => x.d.id === ask); setTime(o.mid); idle = false; const [lat, lng] = latLng(placeNow(o.main.v, o.main.plate)); view = { lng, lat: Math.max(-70, Math.min(70, lat)) }; }
document.fonts.ready.then(() => { dirty = true; });
requestAnimationFrame(frame);
