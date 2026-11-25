// The photo carousel on the dinosaur pages. Pictures and credits are in js/photos.js.
// Placeholders, in the shapes real photos tend to come in. zoom, x and y: how the animal is framed.
const PLACEHOLDERS = [
  { name: "The whole animal", w: 300, h: 200, sky: "var(--tint)", ground: "var(--ink)", art: "var(--ink)", zoom: .84 },
  { name: "Face close-up", w: 160, h: 200, sky: "var(--sand)", art: "var(--ink)", zoom: 2.5, focus: "head" },
  { name: "Museum skeleton", w: 300, h: 200, sky: "var(--ink)", ground: "var(--ivory)", art: "var(--ivory)", zoom: .8 },
  { name: "With the family", w: 360, h: 200, sky: "var(--sky)", ground: "var(--ink)", art: "var(--ink)", zoom: .46, herd: true },
  { name: "Tail close-up", w: 200, h: 200, sky: "var(--pink)", art: "var(--ink)", zoom: 2.2, focus: "tail" }
];
// How far down the head and the tail tip are in each silhouette, when the drawing is 100 wide.
const ENDS = { eoraptor: [12, 2], herrerasaurus: [30, 2], coelophysis: [2, 33], plateosaurus: [3, 9], dilophosaurus: [5, 13], stegosaurus: [25, 21], allosaurus: [6, 7], brachiosaurus: [3, 51], diplodocus: [6, 20], archaeopteryx: [5, 16], iguanodon: [4, 36], spinosaurus: [4, 40], argentinosaurus: [3, 20], parasaurolophus: [16, 9], velociraptor: [4, 13], ankylosaurus: [11, 14], pachycephalosaurus: [7, 45], triceratops: [15, 31], tyrannosaurus: [7, 7] };
function placeholderSVG(d, x) {
  const s = silhouetteOf(d, x.art), floor = x.h * .84;
  const animal = (cx, size) => {
    const w = Math.min(x.w * size, x.h * .68 * size / PLACEHOLDERS[0].zoom * 100 / s.h), h = w * s.h / 100;
    return `<svg x="${cx - w / 2}" y="${floor - h}" width="${w}" height="${h}" viewBox="0 0 100 ${s.h}" overflow="visible">${s.shape}</svg>`;
  };
  let art;
  if (x.focus) {
    // Silhouettes face right, so the head is at the right-hand end.
    const w = x.h * x.zoom, h = w * s.h / 100, [head, tail] = ENDS[d.id] || [s.h * .2, s.h * .4];
    const left = x.focus === "head" ? x.w * .9 - w : x.w * .12, y = (x.focus === "head" ? head : tail) * w / 100;
    art = `<svg x="${left}" y="${x.h * .5 - y}" width="${w}" height="${h}" viewBox="0 0 100 ${s.h}" overflow="visible">${s.shape}</svg>`;
  } else {
    art = (x.herd ? animal(x.w * .13, .2) + animal(x.w * .88, .24) : "") + animal(x.w * .5, x.zoom);
  }
  return `<svg class="placeholder" viewBox="0 0 ${x.w} ${x.h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Placeholder picture: ${x.name.toLowerCase()}">
    <rect width="${x.w}" height="${x.h}" fill="${x.sky}"/>${art}${x.ground ? `<path d="M0 ${floor}H${x.w}" stroke="${x.ground}" stroke-width="1.4"/>` : ""}</svg>`;
}
function photosHTML(d) {
  const real = PHOTOS[d.id] || [], list = real.length ? real : PLACEHOLDERS;
  // So the row can go round and round, the set is there three times. The outer two are copies, hidden from screen readers and the Tab key.
  const slide = (x, i, copy) => `
        <figure class="photo" ${copy ? `aria-hidden="true"` : `role="group" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}"`} style="--ratio:${(x.w / x.h).toFixed(4)}">
          ${real.length
            ? `<img${x.cut ? ` class="cut"` : ""} src="images/photos/${x.file}" width="${x.w}" height="${x.h}" alt="${copy ? "" : x.alt}" ${copy || i > 1 ? `loading="lazy"` : ""} draggable="false">
          <figcaption>${x.kind}: ${x.alt} <span class="by">${x.by}${x.page ? ` · <a href="${x.licurl || x.page}"${copy ? ` tabindex="-1"` : ""}>${x.lic}</a> · <a href="${x.page}"${copy ? ` tabindex="-1"` : ""}>Source</a>` : ""}</span></figcaption>`
            : `${placeholderSVG(d, x)}
          <figcaption>${x.name} <span class="by">Photo to come</span></figcaption>`}
        </figure>`;
  const set = copy => list.map((x, i) => slide(x, i, copy)).join("");
  return `
    <section class="photos bleed" style="--tint:${periodOf(d).color}" aria-roledescription="carousel" aria-label="Pictures of ${d.name}">
      <div class="photo-track" id="photo-track" tabindex="0">${list.length > 1 ? set(true) + set(false) + set(true) : set(false)}</div>
      ${list.length > 1 ? `<div class="photo-nav">
        <button type="button" id="photo-prev" aria-label="Previous picture"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M37 21 26 32 37 43"/></svg></button>
        <span class="photo-total">${list.length} ${real.length && real.every(x => x.page && x.kind !== "Artwork") ? "Photos" : "Pictures"}</span>
        <button type="button" id="photo-next" aria-label="Next picture"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M27 21 38 32 27 43"/></svg></button>
        <span id="photo-count" class="unseen" aria-live="polite"></span>
      </div>` : ""}
    </section>`;
}
function startPhotos() {
  const track = document.getElementById("photo-track"), prev = document.getElementById("photo-prev"), next = document.getElementById("photo-next"), count = document.getElementById("photo-count");
  if (!track || !next) return;
  const slides = [...track.children], n = slides.length / 3;
  let at = -1, timer = 0, frame = 0, touching = false;
  const spot = i => slides[i].offsetLeft + slides[i].offsetWidth / 2 - track.clientWidth / 2;
  // Snapping is only on while someone swipes; otherwise the browser tugs the row back when it hops.
  const snap = on => { track.style.scrollSnapType = on ? "" : "none"; };
  const show = i => {
    if (i === at) return;
    at = i;
    count.textContent = `${i % n + 1} of ${n}`;
    slides.forEach((s, j) => s.classList.toggle("is-on", j === i));
  };
  // On a copy? Hop to the same picture in the middle set. Everything around it is identical, so nothing seems to move.
  const recenter = () => {
    const hop = at < n ? n : at >= 2 * n ? -n : 0;
    if (!hop) return;
    track.scrollLeft += Math.sign(hop) * (slides[n].offsetLeft - slides[0].offsetLeft);
    show(at + hop);
  };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };
  const go = step => {
    stop(); clearTimeout(timer); snap(false); recenter();
    show(at + step);
    const from = track.scrollLeft, far = spot(at) - from, t0 = performance.now(), time = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 480;
    const tick = now => {
      const t = time ? Math.max(0, Math.min(1, (now - t0) / time)) : 1;
      track.scrollLeft = from + far * (1 - (1 - t) ** 3);
      frame = t < 1 ? requestAnimationFrame(tick) : 0;
      if (!frame) recenter();
    };
    frame = requestAnimationFrame(tick);
  };
  // After a swipe, the picture nearest the middle is the current one.
  const settle = () => {
    if (touching || frame) return;
    let best = 0;
    slides.forEach((s, j) => { if (Math.abs(spot(j) - track.scrollLeft) < Math.abs(spot(best) - track.scrollLeft)) best = j; });
    show(best);
    snap(false); recenter();
    if (Math.abs(spot(at) - track.scrollLeft) > 2) go(0);
  };
  const later = () => { if (!frame) { clearTimeout(timer); timer = setTimeout(settle, 160); } };
  track.addEventListener("wheel", e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { stop(); snap(true); } }, { passive: true });
  track.addEventListener("touchstart", () => { stop(); snap(true); touching = true; }, { passive: true });
  for (const e of ["touchend", "touchcancel"]) track.addEventListener(e, () => { touching = false; later(); }, { passive: true });
  track.addEventListener("scroll", later, { passive: true });
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  track.addEventListener("click", e => { const s = e.target.closest(".photo"); if (s && !e.target.closest("a") && !s.classList.contains("is-on")) go(slides.indexOf(s) - at); });
  track.addEventListener("keydown", e => {
    if (e.target !== track) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, Home: -(at % n), End: n - 1 - at % n }[e.key];
    if (step !== undefined) { e.preventDefault(); if (step) go(step); }
  });
  addEventListener("resize", () => { stop(); snap(false); track.scrollLeft = spot(at); });
  // Fetch the rest as soon as someone starts browsing, so no card is blank when the row wraps around.
  const fetchAll = () => track.querySelectorAll("img").forEach(img => { img.loading = "eager"; });
  for (const el of [track, prev, next]) for (const e of ["pointerdown", "keydown"]) el.addEventListener(e, fetchAll, { once: true, passive: true });
  snap(false);
  show(n);
  track.scrollLeft = spot(n);
}
