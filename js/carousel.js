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
  return `
    <section class="photos bleed" style="--tint:${periodOf(d).color}" aria-roledescription="carousel" aria-label="Pictures of ${d.name}">
      <div class="photo-track" id="photo-track" tabindex="0">${list.map((x, i) => `
        <figure class="photo${i ? "" : " is-on"}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}" style="--ratio:${(x.w / x.h).toFixed(4)}">
          ${real.length
            ? `<img${x.cut ? ` class="cut"` : x.w / x.h > 1.75 ? ` class="whole"` : ""} src="images/photos/${x.file}" width="${x.w}" height="${x.h}" alt="${x.alt}" ${i > 1 ? `loading="lazy"` : ""} decoding="async" draggable="false">
          <figcaption><strong>${x.kind}</strong> ${x.alt} <span class="by">${x.by}${x.page ? ` · <a href="${x.licurl || x.page}">${x.lic}</a> · <a href="${x.page}">Source</a>` : ""}</span></figcaption>`
            : `${placeholderSVG(d, x)}
          <figcaption><strong>${x.name}</strong> Photo to come</figcaption>`}
        </figure>`).join("")}</div>
      ${list.length > 1 ? `<div class="photo-nav">
        <button type="button" class="button" id="photo-prev" aria-label="Previous picture">←</button>
        <button type="button" class="button" id="photo-next" aria-label="Next picture">→</button>
        <span id="photo-count" aria-live="polite"></span>
      </div>` : ""}
    </section>`;
}
function startPhotos() {
  const track = document.getElementById("photo-track"), prev = document.getElementById("photo-prev"), next = document.getElementById("photo-next"), count = document.getElementById("photo-count");
  if (!track || !next) return;
  const slides = [...track.children];
  let at = -1, aim = -1, timer = 0;
  const middle = el => el.offsetLeft + el.offsetWidth / 2;
  const show = i => {
    if (i === at) return;
    at = i;
    count.textContent = `${i + 1} of ${slides.length}`;
    prev.disabled = i === 0; next.disabled = i === slides.length - 1;
    slides.forEach((s, j) => s.classList.toggle("is-on", j === i));
  };
  const go = i => {
    aim = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: middle(slides[aim]) - track.clientWidth / 2, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    show(aim);
  };
  // After a swipe, the picture nearest the middle is the current one.
  const settle = () => {
    if (aim >= 0) { aim = -1; return; }
    const c = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    slides.forEach((s, j) => { if (Math.abs(middle(s) - c) < Math.abs(middle(slides[best]) - c)) best = j; });
    show(best);
  };
  for (const e of ["pointerdown", "touchstart", "wheel"]) track.addEventListener(e, () => { aim = -1; }, { passive: true });
  track.addEventListener("scroll", () => { clearTimeout(timer); timer = setTimeout(settle, 120); }, { passive: true });
  prev.addEventListener("click", () => go(at - 1));
  next.addEventListener("click", () => go(at + 1));
  track.addEventListener("click", e => { const s = e.target.closest(".photo"); if (s && !e.target.closest("a") && !s.classList.contains("is-on")) go(slides.indexOf(s)); });
  track.addEventListener("keydown", e => {
    if (e.target !== track) return;
    const to = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: slides.length - 1 }[e.key];
    if (to !== undefined) { e.preventDefault(); go(to); }
  });
  addEventListener("resize", () => { const i = at; at = -1; track.scrollLeft = middle(slides[i]) - track.clientWidth / 2; show(i); });
  show(0);
}
