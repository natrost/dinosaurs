// The globe engine, shared by the globe page and the dinosaur pages.
// Land and plate movements come from js/earth.js, today's borders from js/borders.js, fossils from js/fossils.js.
// A page sets `hooks` to say what to show and what taps do, then calls startGlobe().
let hooks = { shown: () => [], tapDot() {} };
const $ = id => document.getElementById(id);
const canvas = $("globe") || document.createElement("canvas"), ctx = canvas.getContext("2d");
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
function castOf(d) {
  const sites = FOSSILS[d.id].sites.map(([lat, lng, n]) => ({ v: vec(lat, lng), plate: pieceAt(lat, lng, 1e9, true).plate, n }));
  const crowd = s => sites.reduce((sum, o) => sum + (dot(s.v, o.v) > .985 ? o.n : 0), 0);
  return { d, sites, main: sites.slice().sort((a, b) => crowd(b) - crowd(a))[0], mid: Math.round((d.start + d.end) / 2) };
}
// The map data ends at 250 million years, so the slider's last two steps reuse that map.
const MAP_END = EARTH.times[EARTH.times.length - 1];
const existed = piece => Math.min(ma, MAP_END) <= piece.oldest;

// ── State ────────────────────────────────────────────────────
// focus: the dinosaur picked from a list or a dot. hover: the one being pointed at.
let focus = null, hover = null, dots = [];
const active = () => hover || focus;
let ma = 0, view = { lng: -60, lat: 42 }, spin = { x: 0, y: 0 }, idle = false, dirty = true, tween = null;
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
  sky.style.height = `${$("time-row") ? $("time-row").offsetTop : stage.clientHeight}px`;
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

  // Fossil sites of the dinosaurs this page wants shown
  const shown = hooks.shown();
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
  if (hooks.over) hooks.over(shown);
}

// ── Moving ───────────────────────────────────────────────────
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
function point(id) { if (hooks.hover === false) return; if (hover !== id) { hover = id; dirty = true; } }
canvas.addEventListener("pointerleave", () => { if (!drag) { hideTip(); point(null); } });

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
    if (spot) hooks.tapDot(spot);
    else if (hit && hooks.tapLand) hooks.tapLand(hit);
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
if ($("zoom-in")) {
  $("zoom-in").addEventListener("click", () => zoomTo(zoom * 1.6));
  $("zoom-out").addEventListener("click", () => zoomTo(zoom / 1.6));
}
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

// ── Go ───────────────────────────────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(60, now - last); last = now;
  if (tween) tween(now);
  if (hooks.tick) hooks.tick(dt);
  if (idle && !drag && !hover) { view.lng += dt * .006; dirty = true; }
  if (!drag && (Math.abs(spin.x) > .02 || Math.abs(spin.y) > .02)) {
    view.lng += spin.x; view.lat = Math.max(-85, Math.min(85, view.lat + spin.y)); spin.x *= .94; spin.y *= .9; dirty = true;
  }
  if (dirty) { dirty = false; draw(); if (tween || Math.abs(spin.x) > .02) hideTip(); }
  requestAnimationFrame(frame);
}
function startGlobe() {
  addEventListener("resize", resize);
  new ResizeObserver(resize).observe($("stage"));
  resize(); setZoom(1);
  document.fonts.ready.then(() => { dirty = true; });
  requestAnimationFrame(frame);
}
