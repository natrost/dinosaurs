// The dig: brush the dirt off a buried skeleton. Skeletons are images/bones/<id>.webp, all facing left.
{
const $ = id => document.getElementById(id);
const DIGS = ["coelophysis", "eoraptor", "herrerasaurus", "dilophosaurus", "stegosaurus", "allosaurus"];
const DONE = .86; // how much of the skeleton has to show
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const site = $("dig-site"), bones = $("dig-bones"), dirt = $("dig-dirt"), dust = $("dig-dust");
const W = 1600, H = Math.round(W * site.clientHeight / site.clientWidth); // phones get a squarer dig
for (const c of [bones, dirt]) { c.width = W; c.height = H; }
dust.width = W / 2; dust.height = H / 2;
const B = bones.getContext("2d"), D = dirt.getContext("2d", { willReadFrequently: false }), P = dust.getContext("2d");
// A small copy, for measuring how much of the skeleton shows.
const SW = 160, SH = Math.round(SW * H / W), small = document.createElement("canvas"), sm = small.getContext("2d", { willReadFrequently: true });
small.width = SW; small.height = SH;
let found = [];
try { found = JSON.parse(localStorage.getItem("dino-dig")) || []; } catch {}
found = found.filter(id => DIGS.includes(id));
let now = null, mask = [], total = 1, ready = false, over = false, shown = 0;

// The same random numbers each time, so a dig looks the same if it's redrawn.
const dice = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function blob(c, x, y, r, rnd) {
  c.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * 6.283, q = r * (.72 + rnd() * .45);
    c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * q, y + Math.sin(a) * q * .8);
  }
  c.closePath(); c.fill();
}
function drawRock(rnd) {
  B.globalAlpha = 1; B.fillStyle = "#54392a"; B.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { B.globalAlpha = .1 + rnd() * .16; B.fillStyle = rnd() < .5 ? "#3f2a1e" : "#6d4c38"; blob(B, rnd() * W, rnd() * H, 14 + rnd() * 80, rnd); }
  for (let i = 0; i < 900; i++) { B.globalAlpha = .25 + rnd() * .3; B.fillStyle = rnd() < .5 ? "#2e1e15" : "#8a6448"; B.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 4, 2 + rnd() * 3); }
  B.globalAlpha = 1;
}
function drawDirt(rnd) {
  D.globalCompositeOperation = "source-over"; D.globalAlpha = 1; D.fillStyle = "#c08f58"; D.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) { D.globalAlpha = .12 + rnd() * .2; D.fillStyle = ["#a87743", "#d3a66f", "#b5824c", "#dcb684"][Math.floor(rnd() * 4)]; blob(D, rnd() * W, rnd() * H, 16 + rnd() * 90, rnd); }
  for (let i = 0; i < 5200; i++) { D.globalAlpha = .25 + rnd() * .45; D.fillStyle = rnd() < .5 ? "#8d6135" : "#e3c295"; D.fillRect(rnd() * W, rnd() * H, 1.5 + rnd() * 4, 1.5 + rnd() * 3); }
  D.globalAlpha = 1;
  for (let i = 0; i < 70; i++) { // pebbles
    const x = rnd() * W, y = rnd() * H, r = 6 + rnd() * 17;
    D.fillStyle = "rgba(70,44,22,.5)"; D.beginPath(); D.ellipse(x + 3, y + 5, r, r * .72, 0, 0, 7); D.fill();
    D.fillStyle = ["#9b7b5c", "#b39273", "#84674b", "#c4a685"][Math.floor(rnd() * 4)]; D.beginPath(); D.ellipse(x, y, r, r * .74, rnd(), 0, 7); D.fill();
    D.fillStyle = "rgba(255,240,215,.35)"; D.beginPath(); D.ellipse(x - r * .25, y - r * .28, r * .38, r * .2, 0, 0, 7); D.fill();
  }
}

function start(id) {
  now = id; ready = false; over = false; shown = 0;
  const rnd = dice(DIGS.indexOf(id) * 977 + 131), img = new Image();
  site.classList.remove("is-found"); $("dig-found").hidden = true; $("dig-all").hidden = false;
  drawRock(rnd); drawDirt(rnd);
  meter();
  $("dig-status").textContent = "Start brushing";
  img.onload = () => {
    if (now !== id) return;
    const w = W * (H > W * .8 ? .9 : .86), h = w * img.height / img.width, k = Math.min(1, H * .84 / h), turn = H > W * .8 ? -.5 + rnd() * .16 : (rnd() - .5) * .16;
    const place = c => { c.translate(c.canvas.width / 2, c.canvas.height / 2); c.scale(c.canvas.width / W, c.canvas.width / W); c.rotate(turn); c.drawImage(img, -w * k / 2, -h * k / 2, w * k, h * k); };
    B.save(); B.shadowColor = "rgba(0,0,0,.7)"; B.shadowBlur = 16; B.shadowOffsetY = 7; place(B); B.restore();
    sm.clearRect(0, 0, SW, SH); sm.save(); place(sm); sm.restore();
    const px = sm.getImageData(0, 0, SW, SH).data;
    mask = [];
    for (let i = 0; i < SW * SH; i++) if (px[i * 4 + 3] > 90) mask.push(i);
    total = mask.length || 1; ready = true;
  };
  img.src = `images/bones/${id}.webp`;
}
function meter() {
  $("dig-fill").style.width = `${Math.min(100, shown / DONE * 100)}%`;
}
function measure() {
  if (!ready || over) return;
  sm.clearRect(0, 0, SW, SH); sm.drawImage(dirt, 0, 0, SW, SH);
  const px = sm.getImageData(0, 0, SW, SH).data;
  let n = 0;
  for (const i of mask) if (px[i * 4 + 3] < 130) n++;
  shown = n / total;
  meter();
  const left = DONE - shown;
  $("dig-status").textContent = shown < .02 ? "Start brushing" : shown < .2 ? "I see something" : shown < .45 ? "Those are bones!" : left > .12 ? "Keep going" : "Almost there";
  if (shown >= DONE) reveal();
}
function reveal() {
  if (over || !ready) return;
  over = true; shown = DONE; meter();
  const d = findDino(now);
  site.classList.add("is-found"); site.classList.remove("is-brushing", "is-hover");
  $("dig-status").textContent = `You found ${d.name}!`;
  $("dig-name").textContent = d.name;
  $("dig-fact").textContent = d.fact;
  $("dig-go").textContent = `Meet ${d.name} →`; $("dig-go").href = `dino.html?id=${d.id}`;
  $("dig-found").hidden = false; $("dig-all").hidden = true;
  if (!found.includes(now)) { found.push(now); try { localStorage.setItem("dino-dig", JSON.stringify(found)); } catch {} }
  showCase();
}
function showCase() {
  $("dig-case").innerHTML = DIGS.map(id => {
    const got = found.includes(id);
    return `<li${got ? ` class="is-got"` : ""}><img src="images/bones/${id}.webp" width="1400" height="600" alt="" loading="lazy">${got ? findDino(id).name : "Not found yet"}</li>`;
  }).join("");
  $("dig-next").textContent = found.length === DIGS.length ? "Dig again" : "Dig somewhere else";
}
function next() {
  const rest = DIGS.filter(id => !found.includes(id) && id !== now), any = DIGS.filter(id => id !== now), from = rest.length ? rest : any;
  start(from[Math.floor(Math.random() * from.length)]);
}

// ── Brushing ─────────────────────────────────────────────────
// Each stroke is a fan of soft bristle marks, so it takes a couple of passes, like a real brush.
const bristles = Array.from({ length: 26 }, (_, i) => ({ a: i * 2.4, r: Math.sqrt(i / 26), s: .16 + (i * 37 % 10) / 40 }));
function dab(x, y, R) {
  D.globalCompositeOperation = "destination-out";
  for (const b of bristles) {
    const r = R * b.s * 1.5, bx = x + Math.cos(b.a) * b.r * R, by = y + Math.sin(b.a) * b.r * R * .85;
    D.globalAlpha = .2;
    D.beginPath(); D.arc(bx, by, r, 0, 7); D.fill();
  }
  D.globalAlpha = 1;
}
let last = null, specks = [], flying = false, due = 0;
const spot = e => { const r = dirt.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
const size = () => W / dirt.getBoundingClientRect().width * Math.max(22, dirt.getBoundingClientRect().width * .034);
function sweep(x0, y0, x1, y1) {
  const R = size(), far = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(far / (R * .32)));
  for (let i = 1; i <= n; i++) dab(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, R);
  if (!calm) {
    for (let i = 0; i < Math.min(10, 2 + far / 14) && specks.length < 260; i++) {
      const a = Math.random() * 6.283, v = 1 + Math.random() * 4;
      specks.push({ x: x1 / 2 + (Math.random() - .5) * R * .8, y: y1 / 2 + (Math.random() - .5) * R * .7, vx: Math.cos(a) * v + (x1 - x0) * .03, vy: Math.sin(a) * v - 1.5, r: 1 + Math.random() * 3.4, t: 1 });
    }
    if (!flying) { flying = true; requestAnimationFrame(fly); }
  }
  const t = performance.now();
  if (t > due) { due = t + 140; measure(); }
}
function fly() {
  P.clearRect(0, 0, dust.width, dust.height);
  specks = specks.filter(s => (s.t -= .03) > 0);
  for (const s of specks) {
    s.x += s.vx; s.y += s.vy; s.vy += .22; s.vx *= .97;
    P.globalAlpha = s.t * .9; P.fillStyle = "#e0bd8d";
    P.beginPath(); P.arc(s.x, s.y, s.r, 0, 7); P.fill();
  }
  P.globalAlpha = 1;
  flying = specks.length > 0;
  if (flying) requestAnimationFrame(fly);
}
function moveBrush(e) {
  const r = site.getBoundingClientRect(), b = $("dig-brush"), lean = last && !calm ? Math.sin(performance.now() / 60) * 7 : 0;
  // The tip of the bristles sits under the pointer.
  b.style.transform = `translate(${e.clientX - r.left - site.clientLeft - b.clientWidth * .1}px, ${e.clientY - r.top - site.clientTop - b.clientHeight * .92}px) rotate(${lean}deg)`;
}
dirt.addEventListener("pointerdown", e => {
  if (over || e.button) return;
  try { dirt.setPointerCapture(e.pointerId); } catch {}
  last = spot(e); site.classList.add("is-brushing"); moveBrush(e);
  sweep(...last, last[0] + .1, last[1]);
});
dirt.addEventListener("pointermove", e => {
  site.classList.toggle("is-hover", e.pointerType === "mouse");
  moveBrush(e);
  if (!last || over) return;
  for (const c of e.getCoalescedEvents ? [...e.getCoalescedEvents(), e] : [e]) { const p = spot(c); sweep(...last, ...p); last = p; }
});
const lift = () => { if (last) { last = null; measure(); } site.classList.remove("is-brushing"); };
for (const t of ["pointerup", "pointercancel"]) dirt.addEventListener(t, lift);
dirt.addEventListener("pointerleave", () => site.classList.remove("is-hover"));

$("dig-all").addEventListener("click", () => { reveal(); $("dig-go").focus({ preventScroll: true }); });
$("dig-next").addEventListener("click", () => { next(); $("dig-all").focus({ preventScroll: true }); });
showCase();
next();
}
