// The globe page: labels, the list, time, and "Who lived near you". The globe itself is js/globe-core.js.
const labels = $("labels"), CAST = DINOS.map(castOf);
const isAlive = d => d.start >= ma && ma >= d.end;
let pin = null, playing = false;

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

function drawPin() {
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

for (const type of ["pointerover", "focusin"]) document.addEventListener(type, e => {
  if (type === "pointerover" && e.pointerType === "touch") return;
  const el = e.target.closest && e.target.closest("[data-pick], [data-over], #labels a");
  if (el) point(el.dataset.pick || el.dataset.over || el.dataset.id);
  else if (e.target !== canvas && hover) point(null);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && focus) pick(focus); });


// ── What the engine asks of this page ────────────────────────
hooks = {
  shown: () => ma === 0 ? CAST : CAST.filter(o => isAlive(o.d)),
  over(shown) {
    const lit = active();
    drawLabels(ma === 0 ? (lit ? CAST.filter(o => o.d.id === lit) : []) : shown);
    drawPin();
  },
  tapDot(spot) { pick(spot.o.d.id, false); if (focus) showTip(spot); },
  tapLand(hit) {
      // Find which land is there now, then where that spot is on today's map.
      let today = null;
      for (const p of LAND) {
        if (!existed(p)) continue;
        const v = turn(undo(plateTurn(p.plate, ma)), hit), [lat, lng] = latLng(v);
        if (inside(p, lat, lng)) { today = [lat, lng]; break; }
      }
      $("place").value = "";
      today ? setPin(today[0], today[1], "") : ($("near").innerHTML = "<p>That’s open ocean. Try some land.</p>");
  },
  tick(dt) {
    if (!playing) return;
    const t = Math.max(66, ma - dt * .0085);
    setTime(t); hideTip();
    if (t === 66) stop();
  }
};

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
ma = 67;
startGlobe();
idle = !calm;
say();
const ask = new URLSearchParams(location.search).get("d");
if (ask && findDino(ask)) { focus = ask; const o = CAST.find(x => x.d.id === ask); setTime(o.mid); idle = false; const [lat, lng] = latLng(placeNow(o.main.v, o.main.plate)); view = { lng, lat: Math.max(-70, Math.min(70, lat)) }; }
