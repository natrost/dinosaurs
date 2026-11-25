// The homepage: the cover star with its dial, then the long walk.
{
const $ = id => document.getElementById(id);
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mid = d => (d.start + d.end) / 2;
const LINE = DINOS.slice().sort((a, b) => mid(b) - mid(a) || a.name.localeCompare(b.name)); // oldest first
const SHORT = { tyrannosaurus: "T. rex" };
const shortName = d => SHORT[d.id] || d.name;

// ── The cover star ───────────────────────────────────────────
let star = -1;
function showStar(i, from) {
  i = (i + LINE.length) % LINE.length;
  if (i === star) return;
  star = i;
  const d = LINE[i], p = periodOf(d);
  for (const el of [$("star"), $("dial")]) el.style.setProperty("--tint", p.color);
  $("star-period").textContent = p.name;
  $("star-when").textContent = ` ~ ${d.start} to ${d.end} million years ago`;
  $("star-name").textContent = d.name;
  $("star-name").style.setProperty("--len", Math.max(...d.name.split(" ").map(w => w.length)));
  $("star-say").textContent = d.say;
  $("star-meaning").textContent = `It means “${d.meaning}”.`;
  $("star-go").textContent = `Meet ${shortName(d)} →`;
  $("star-go").href = `dino.html?id=${d.id}`;
  $("star-art").innerHTML = heroArtHTML(d);
  $("star-art").style.setProperty("--from", from < 0 ? "-1" : "1");
  $("star-art").classList.toggle("is-in", from !== 0);
  document.querySelectorAll("#dial-dots button").forEach((b, n) => b.setAttribute("aria-pressed", String(n === i)));
  if (from) {
    $("star-live").textContent = `${d.name}, ${p.name}`;
    localStorage.setItem("dino-cover", d.id);
  }
}

const x = ma => (TIME_START - ma) / (TIME_START - TIME_END) * 100;
$("dial-bands").innerHTML = PERIODS.map(p => {
  const l = Math.max(0, x(p.start)), r = Math.min(100, x(p.end));
  return `<span style="left:${l}%;width:${r - l}%;background:${p.color}">${p.name}</span>`;
}).join("");
$("dial-dots").innerHTML = LINE.map(d => `<button type="button" aria-pressed="false" aria-label="${d.name}, ${d.start} to ${d.end} million years ago" style="--c:${periodOf(d).color}"><span>${shortName(d)}</span></button>`).join("");
const dots = [...$("dial-dots").children];
// Dots sit at their true date. Where several share a date, they pile up.
function pile() {
  const W = $("dial-dots").clientWidth, gap = 25, rows = [];
  dots.forEach((b, i) => {
    const at = x(mid(LINE[i])) / 100 * W;
    let r = 0;
    while (rows[r] !== undefined && at - rows[r] < gap) r++;
    rows[r] = at;
    b.style.left = `${Math.max(12, Math.min(W - 12, at))}px`;
    b.style.bottom = `${r * gap}px`;
  });
  $("dial-dots").style.height = `${rows.length * gap}px`;
}
dots.forEach((b, i) => b.addEventListener("click", () => showStar(i, i - star)));
$("star-prev").addEventListener("click", () => showStar(star - 1, -1));
$("star-next").addEventListener("click", () => showStar(star + 1, 1));
$("dial").addEventListener("keydown", e => {
  const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (!step) return;
  e.preventDefault();
  showStar(star + step, step);
  if (document.activeElement.closest("#dial-dots")) dots[star].focus();
});
// Dragging along the bands scrubs through time.
const scrub = e => {
  const r = $("dial-bands").getBoundingClientRect(), ma = TIME_START - (e.clientX - r.left) / r.width * (TIME_START - TIME_END);
  let best = 0;
  LINE.forEach((d, i) => { if (Math.abs(mid(d) - ma) < Math.abs(mid(LINE[best]) - ma)) best = i; });
  showStar(best, best - star);
};
$("dial-bands").addEventListener("pointerdown", e => { $("dial-bands").setPointerCapture(e.pointerId); scrub(e); });
$("dial-bands").addEventListener("pointermove", e => { if (e.buttons) scrub(e); });
// Swiping the picture works too.
let sx = null, sy = 0;
$("star").addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
$("star").addEventListener("touchend", e => {
  if (sx === null) return;
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  sx = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showStar(star + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
}, { passive: true });

// Opens on a dinosaur with finished art, and a different one next time.
const withArt = LINE.filter(d => HERO_ART[d.id]), last = localStorage.getItem("dino-cover");
const n = withArt.findIndex(d => d.id === last), first = last === null ? withArt.find(d => d.id === "tyrannosaurus") : withArt[(n + 1) % withArt.length];
showStar(LINE.indexOf(first), 0);
localStorage.setItem("dino-cover", first.id);
pile();
addEventListener("resize", pile);
$("door-compare").innerHTML = ["triceratops", "tyrannosaurus"].map(id => silhouetteSVG(findDino(id), "var(--ink)")).join("");

// ── The long walk ────────────────────────────────────────────
// Dinosaurs are evenly spaced, in order; the little map along the bottom is to scale.
function walkerHTML(d) {
  const art = HERO_ART[d.id], side = SIZE_ART[d.id], s = sizeArt(d, "var(--ink)");
  const tall = d.id === "tyrannosaurus" ? art.h / art.w * 100 : s.h;
  const wide = Math.min((30 + 12.5 * Math.sqrt(d.lengthM)) * (d.id === "tyrannosaurus" ? 1.12 : 1), 5800 / tall);
  const pic = d.id === "tyrannosaurus" ? `<img class="is-flipped" src="${art.src}" width="${art.w}" height="${art.h}" alt="" loading="lazy">`
    : side ? `<img src="${side.src}" width="${side.w}" height="${side.h}" alt="" loading="lazy">`
    : silhouetteSVG(d, "var(--ink)");
  const plant = plantsOf(d).slice(-1)[0];
  return `<a class="walker" href="dino.html?id=${d.id}" data-ma="${mid(d)}" style="--wide:${wide.toFixed(1)};--tall:${(wide * tall / 100).toFixed(1)}">
    <i class="walk-plant is-${plant}"></i><div class="walk-pic">${pic}</div>
    <span class="walk-label"><b>${d.name}</b>${d.start} to ${d.end} million years ago</span></a>`;
}
$("walk-track").innerHTML = PERIODS.map(p => `
  <section class="walk-bed" data-id="${p.id}" data-ma="${p.start}" style="--c:${p.color}" aria-label="${p.name}">
    <div class="walk-word" aria-hidden="true">${p.name}</div>
    ${LINE.filter(d => periodOf(d) === p).map(walkerHTML).join("")}
  </section>`).join("") + `
  <section class="walk-bed is-end" data-id="end" data-ma="66" aria-label="The asteroid">
    <i class="walk-rock" aria-hidden="true"></i>
    <div class="walk-say"><h2>Then an asteroid hit.</h2><p>About three out of every four kinds of living things died out. One group of dinosaurs made it: the birds.</p></div>
  </section>
  <section class="walk-bed is-now" data-id="now" data-ma="0" aria-label="Today">
    <div class="walk-word" aria-hidden="true">Today</div>
    <div class="walk-you"><p>You are here, 66 million years later.</p><svg viewBox="0 0 .3 1" aria-hidden="true"><circle cx=".15" cy=".09" r=".085"/><path d="${PERSON_PATH}"/></svg></div>
  </section>`;

const FULL = [...PERIODS, { id: "end", name: "Since then", start: 66, end: 0, color: "#fff" }];
$("walk-map").innerHTML = FULL.map(p => `<button type="button" data-to="${p.id}" style="flex:${p.start - p.end};background:${p.color}" aria-label="Go to: ${p.name}"><span>${p.name}</span></button>`).join("") + `<i id="walk-dot" aria-hidden="true"></i>`;

const view = $("walk-view"), track = $("walk-track"), walk = $("walk");
const SPEED = 1.6; // pixels walked for each pixel scrolled
let travel = 0, marks = [], words = [];
walk.classList.toggle("is-flat", calm);
const at = () => calm ? view.scrollLeft : Math.max(0, Math.min(travel, -walk.getBoundingClientRect().top * SPEED));
const left = el => { let n = 0; for (; el && el !== track; el = el.offsetParent) n += el.offsetLeft; return n; };
function measure() {
  travel = Math.max(0, track.scrollWidth - view.clientWidth);
  if (!calm) walk.style.height = `${travel / SPEED + view.clientHeight}px`;
  marks = [...track.querySelectorAll("[data-ma]")].map(el => [left(el) + (el.matches(".walker") ? el.offsetWidth / 2 : 0), Number(el.dataset.ma)]);
  marks.push([left(track.querySelector(".is-now")) - 1, 66]);
  marks.sort((a, b) => a[0] - b[0]);
  words = [...track.querySelectorAll(".walk-word")].map(el => ({ el, x: left(el.parentElement), w: el.parentElement.offsetWidth, own: el.offsetWidth }));
  move();
}
function move() {
  const now = at(), V = view.clientWidth, c = now + V / 2;
  if (!calm) track.style.transform = `translate3d(${-now}px,0,0)`;
  // The big words drift along with you, so each is on screen for its whole period.
  if (!calm) for (const { el, x, w, own } of words) {
    const t = Math.max(0, Math.min(1, (now + V - x) / (w + V)));
    el.style.transform = `translate3d(${(w - own) * t}px,0,0)`;
  }
  let ma = marks[0] ? marks[0][1] : 252;
  for (let i = 1; i < marks.length; i++) if (c < marks[i][0]) {
    const [a, A] = marks[i - 1], [b, B] = marks[i];
    ma = A + (B - A) * Math.max(0, (c - a) / (b - a || 1));
    break;
  } else ma = marks[i][1];
  $("walk-ma").textContent = Math.round(ma) || "Now";
  $("walk-ma").nextElementSibling.hidden = !Math.round(ma);
  const here = [...track.children].find(b => left(b) + b.offsetWidth > now + 60) || track.lastElementChild;
  view.dataset.in = here.dataset.id;
  $("walk-dot").style.left = `${(252 - ma) / 252 * 100}%`;
}
let queued = false;
const soon = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; move(); }); } };
addEventListener("scroll", soon, { passive: true });
view.addEventListener("scroll", () => { if (calm) soon(); else if (view.scrollLeft) view.scrollLeft = 0; }, { passive: true });
new ResizeObserver(measure).observe(view);
document.fonts.ready.then(measure);
measure();

// Brings a spot on the track to the middle (or left edge) of the screen.
function goTo(px, smooth) {
  const to = Math.max(0, Math.min(travel, px)), how = smooth && !calm ? "smooth" : "instant";
  if (calm) view.scrollTo({ left: to, behavior: "instant" });
  else scrollTo({ top: walk.getBoundingClientRect().top + scrollY + to / SPEED, behavior: how });
}
$("walk-map").addEventListener("click", e => {
  const b = e.target.closest("[data-to]");
  if (b) goTo(left(track.querySelector(`[data-id="${b.dataset.to}"]`)), true);
});
// Tabbing to a dinosaur that's off screen walks there.
track.addEventListener("focusin", e => {
  const w = e.target.closest(".walker");
  if (w && w.matches(":focus-visible")) goTo(left(w) + w.offsetWidth / 2 - view.clientWidth / 2, false);
});
}
