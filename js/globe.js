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

// ── Land ─────────────────────────────────────────────────────
const LAND = EARTH.land.map(([plate, oldest, flat]) => {
  const pts = [], v = [];
  let last = flat[0] / 10;
  for (let i = 0; i < flat.length; i += 2) {
    let x = flat[i] / 10;
    while (x - last > 180) x -= 360;
    while (x - last < -180) x += 360;
    last = x;
    pts.push([x, flat[i + 1] / 10]);
    v.push(vec(flat[i + 1] / 10, x));
  }
  return { plate, oldest, pts, v };
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
const isAlive = d => d.start >= ma && ma >= d.end;

// ── State ────────────────────────────────────────────────────
let ma = 67, view = { lng: -60, lat: 42 }, spin = { x: 0, y: 0 }, idle = !calm, dirty = true, pin = null, playing = false, tween = null;
let size = 0, R = 0;

function toScreen(v) {
  // Turn the Earth so view.lng/view.lat faces us. Returns [x, y, depth]; depth > 0 is the near side.
  const a = view.lng * RAD, b = view.lat * RAD, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const x1 = ca * v[0] + sa * v[1], y1 = -sa * v[0] + ca * v[1];
  return [size / 2 + R * y1, size / 2 - R * (cb * v[2] - sb * x1), cb * x1 + sb * v[2]];
}
function fromScreen(px, py) {
  const y = (px - size / 2) / R, z = (size / 2 - py) / R, r2 = y * y + z * z;
  if (r2 > 1) return null;
  const x = Math.sqrt(1 - r2), b = view.lat * RAD, a = view.lng * RAD;
  const x1 = Math.cos(b) * x - Math.sin(b) * z, z1 = Math.sin(b) * x + Math.cos(b) * z;
  return [Math.cos(a) * x1 - Math.sin(a) * y, Math.sin(a) * x1 + Math.cos(a) * y, z1];
}
const placeNow = (v, plate) => turn(plateTurn(plate, ma), v);

// ── Drawing ──────────────────────────────────────────────────
function resize() {
  size = canvas.clientWidth;
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = canvas.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  R = size * .475;
  dirty = true;
}
function drawLand() {
  const turns = new Map(), c = size / 2;
  ctx.beginPath();
  for (const p of LAND) {
    if (ma > p.oldest) continue;
    if (!turns.has(p.plate)) turns.set(p.plate, plateTurn(p.plate, ma));
    const q = turns.get(p.plate), s = p.v.map(v => toScreen(turn(q, v)));
    if (!s.some(k => k[2] > 0)) continue;
    // Points behind the globe slide to its edge, following the curve.
    let first = true, edge = null;
    for (let i = 0; i <= s.length; i++) {
      const [x, y, z] = s[i % s.length];
      if (z > 0) { first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); edge = null; }
      else {
        const ang = Math.atan2(y - c, x - c);
        if (edge !== null) {
          let turnBy = ang - edge;
          while (turnBy > Math.PI) turnBy -= 2 * Math.PI;
          while (turnBy < -Math.PI) turnBy += 2 * Math.PI;
          const steps = Math.ceil(Math.abs(turnBy) / .12);
          for (let k = 1; k < steps; k++) ctx.lineTo(c + R * Math.cos(edge + turnBy * k / steps), c + R * Math.sin(edge + turnBy * k / steps));
        }
        const ex = c + R * Math.cos(ang), ey = c + R * Math.sin(ang);
        first ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey);
        edge = ang;
      }
      first = false;
    }
    ctx.closePath();
  }
  // Outline first, then fill, then a hair of sand on top, so seams between neighboring plates disappear.
  ctx.lineJoin = "round";
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = SAND; ctx.fill("nonzero");
  ctx.lineWidth = 1; ctx.strokeStyle = SAND; ctx.stroke();
}
function drawGrid() {
  ctx.lineWidth = 1; ctx.strokeStyle = "rgba(31,50,44,.16)"; ctx.beginPath();
  const line = f => { let pen = false; for (let k = 0; k <= 72; k++) { const [x, y, z] = toScreen(f(k)); if (z > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; } };
  for (let lng = 0; lng < 360; lng += 30) line(k => vec(-90 + k * 2.5, lng));
  for (let lat = -60; lat <= 60; lat += 30) line(k => vec(lat, k * 5));
  ctx.stroke();
}
function draw() {
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath(); ctx.arc(c, c, R, 0, 7); ctx.fillStyle = SKY; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(c, c, R, 0, 7); ctx.clip();
  drawGrid(); drawLand();
  ctx.restore();
  ctx.beginPath(); ctx.arc(c, c, R, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();

  // Fossil sites of everyone alive (or everyone, today)
  const shown = ma === 0 ? CAST : CAST.filter(o => isAlive(o.d));
  for (const o of shown) for (const s of o.sites) {
    const [x, y, z] = toScreen(placeNow(s.v, s.plate));
    if (z <= .02) continue;
    ctx.beginPath(); ctx.arc(x, y, Math.min(8, 2.6 + Math.sqrt(s.n)), 0, 7);
    ctx.fillStyle = RUST; ctx.globalAlpha = .85; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 1; ctx.strokeStyle = css("--ivory"); ctx.stroke();
  }
  drawLabels(ma === 0 ? [] : shown);

  if (pin && ma <= pin.oldest) {
    const [x, y, z] = toScreen(placeNow(pin.v, pin.plate));
    if (z > 0) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 34); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 38, 10, 0, 7); ctx.fillStyle = css("--pink"); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
      ctx.font = `400 34px ${css("--pen")}`; ctx.fillStyle = INK; ctx.textAlign = x > c ? "right" : "left";
      ctx.fillText("you", x + (x > c ? -16 : 16), y - 34);
    }
  }
}
// Silhouettes beside the globe's busy spots, pushed apart so none overlap.
function drawLabels(shown) {
  const c = size / 2, w = Math.max(70, size * .15), seen = [];
  for (const o of shown) {
    const [x, y, z] = toScreen(placeNow(o.main.v, o.main.plate));
    const far = Math.hypot(x - c, y - c), ux = far > size * .06 ? (x - c) / far : -.8, uy = far > size * .06 ? (y - c) / far : -.6;
    if (z > .12) seen.push({ o, ax: x, ay: y, x: x + ux * size * .19, y: y + uy * size * .16, h: w * (silhouetteOf(o.d, "").h / 100) + 22 });
  }
  seen.sort((a, b) => a.o.d.name.localeCompare(b.o.d.name));
  for (let k = 0; k < 60; k++) for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
    const a = seen[i], b = seen[j], dx = b.x - a.x || .5 + i, dy = b.y - a.y || 1 + j;
    const ox = w * 1.12 - Math.abs(dx), oy = (a.h + b.h) / 2 + 6 - Math.abs(dy);
    if (ox > 0 && oy > 0) { if (ox < oy) { const m = Math.sign(dx) * ox / 2; a.x -= m; b.x += m; } else { const m = Math.sign(dy) * oy / 2; a.y -= m; b.y += m; } }
  }
  ctx.lineWidth = 2; ctx.strokeStyle = INK;
  for (const s of seen) {
    s.x = Math.max(w / 2, Math.min(size - w / 2, s.x)); s.y = Math.max(s.h / 2, Math.min(size - s.h / 2, s.y));
    ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.quadraticCurveTo((s.ax + s.x) / 2 + 8, (s.ay + s.y) / 2, s.x, s.y + s.h / 4); ctx.stroke();
  }
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
    a.style.width = `${w}px`;
    a.style.transform = `translate(${s.x - w / 2}px, ${s.y - s.h / 2}px)`;
  }
}

// ── Words beside the globe ───────────────────────────────────
function say() {
  $("time").value = 252 - Math.max(66, ma);
  const p = periodAt(ma), alive = CAST.filter(o => isAlive(o.d)), shownMa = Math.round(ma);
  $("stage").style.setProperty("--tint", ma < 66 ? "var(--pink)" : p ? p.color : "var(--sand)");
  $("ma").textContent = ma < 1 ? "Now" : shownMa;
  $("unit").textContent = ma < 1 ? "Every fossil site, on today's map" : `million years ago${p ? `, ${p.name}` : ""}`;
  $("blurb").textContent = ma < 66 ? "The continents have drifted to where you know them." : p ? p.blurb : "Just before the Triassic. No dinosaurs yet.";
  if (ma < 66) { $("alive").innerHTML = ""; return; }
  $("alive").innerHTML = alive.length
    ? alive.map(o => `<li><button type="button" data-go="${o.d.id}">${o.d.name}</button> ${o.d.found}</li>`).join("")
    : "<li>None of our 19 at this moment. Keep sliding.</li>";
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
  slideTo(o.mid, () => faceTo(placeNow(o.main.v, o.main.plate)));
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

// ── Hands ────────────────────────────────────────────────────
let drag = null;
canvas.addEventListener("pointerdown", e => {
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  idle = false; spin = { x: 0, y: 0 }; drag = { x: e.clientX, y: e.clientY, moved: 0 };
});
canvas.addEventListener("pointermove", e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y, k = 57.3 / R;
  drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
  tween = drag.moved > 4 ? null : tween;
  spin = { x: -dx * k, y: dy * k };
  view.lng += spin.x; view.lat = Math.max(-85, Math.min(85, view.lat + spin.y)); dirty = true;
});
canvas.addEventListener("pointerup", e => {
  if (drag && drag.moved < 6) {
    spin = { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect(), hit = fromScreen(e.clientX - r.left, e.clientY - r.top);
    if (hit) {
      // Find which land is there now, then where that spot is on today's map.
      let today = null;
      for (const p of LAND) {
        if (ma > p.oldest) continue;
        const v = turn(undo(plateTurn(p.plate, ma)), hit), [lat, lng] = latLng(v);
        if (inside(p, lat, lng)) { today = [lat, lng]; break; }
      }
      $("place").value = "";
      today ? setPin(today[0], today[1], "") : ($("near").innerHTML = "<p>That’s open ocean. Try some land.</p>");
    }
  }
  if (calm) spin = { x: 0, y: 0 };
  drag = null;
});
canvas.addEventListener("pointercancel", () => { drag = null; });
canvas.addEventListener("keydown", e => {
  const step = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }[e.key];
  if (!step) return;
  e.preventDefault(); idle = false;
  view.lng += step[0]; view.lat = Math.max(-85, Math.min(85, view.lat + step[1])); dirty = true;
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
  if (idle && !drag) { view.lng += dt * .006; dirty = true; }
  if (!drag && (Math.abs(spin.x) > .02 || Math.abs(spin.y) > .02)) {
    view.lng += spin.x; view.lat = Math.max(-85, Math.min(85, view.lat + spin.y)); spin.x *= .94; spin.y *= .9; dirty = true;
  }
  if (dirty) { dirty = false; draw(); }
  requestAnimationFrame(frame);
}
addEventListener("resize", resize);
resize(); say();
const ask = new URLSearchParams(location.search).get("d");
if (ask && findDino(ask)) { const o = CAST.find(x => x.d.id === ask); setTime(o.mid); idle = false; const [lat, lng] = latLng(placeNow(o.main.v, o.main.plate)); view = { lng, lat: Math.max(-70, Math.min(70, lat)) }; }
document.fonts.ready.then(() => { dirty = true; });
requestAnimationFrame(frame);
