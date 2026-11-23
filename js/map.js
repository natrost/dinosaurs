// The "Where were its fossils found?" map. x = longitude, y = -latitude.
const WORLD_VIEW = { x: -180, y: -84, w: 360, h: 144 };

// A box around the dots, kept the same shape as the world view.
function zoomView(sites) {
  const ratio = WORLD_VIEW.w / WORLD_VIEW.h;
  const lats = sites.map(s => -s[0]), lngs = sites.map(s => s[1]);
  const minX = Math.min(...lngs), maxX = Math.max(...lngs), minY = Math.min(...lats), maxY = Math.max(...lats);
  const w = Math.min(WORLD_VIEW.w, Math.max(60, (maxX - minX) * 1.4, (maxY - minY) * 1.4 * ratio));
  const h = w / ratio;
  const keep = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  return {
    x: keep((minX + maxX) / 2 - w / 2, WORLD_VIEW.x, WORLD_VIEW.x + WORLD_VIEW.w - w),
    y: keep((minY + maxY) / 2 - h / 2, WORLD_VIEW.y, WORLD_VIEW.y + WORLD_VIEW.h - h),
    w, h
  };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function fossilMapHTML(d) {
  const f = FOSSILS[d.id];
  if (!f || !f.sites.length) return "";
  const places = f.countries.map(([name, n]) => `<li><strong>${name}</strong> ${n}</li>`).join("");
  return `
    <section class="panel">
      <h2>Where were its fossils found?</h2>
      <p class="muted">${plural(f.total, "fossil record")} from ${plural(f.countries.length, "country").replace("countrys", "countries")}. Bigger dots mean more records. One record can be a single tooth or a whole herd!</p>
      <div class="map-buttons" role="group" aria-label="Map view">
        <button type="button" data-view="world" aria-pressed="true">Whole world</button>
        <button type="button" data-view="zoom" aria-pressed="false">Zoom in</button>
      </div>
      <svg id="fossil-map" class="fossil-map" role="img" aria-label="World map of ${d.name} fossils: ${f.countries.map(c => c[0]).join(", ")}">
        <path class="land" d="${WORLD_PATH}"/>
        <g id="fossil-dots" style="--dot:${periodOf(d).color}"></g>
      </svg>
      <ul class="map-places">${places}</ul>
      <p class="small muted">This map shows Earth today. The continents were in different places when ${d.name} was alive! Data: <a href="https://paleobiodb.org/">Paleobiology Database</a>.</p>
      <p><a class="button" href="globe.html?d=${d.id}">See it on the ancient globe →</a></p>
    </section>`;
}

function startFossilMap(d) {
  const svg = document.getElementById("fossil-map");
  if (!svg) return;
  const { sites } = FOSSILS[d.id];
  const buttons = document.querySelectorAll(".map-buttons button");

  const show = name => {
    const v = name === "zoom" ? zoomView(sites) : WORLD_VIEW;
    svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
    const size = Math.max(0.0065, 5 / (svg.clientWidth || 800)); // at least 5 pixels, so dots show up on phones
    // Dots stay the same size on screen at any zoom; biggest drawn first so small ones stay visible.
    document.getElementById("fossil-dots").innerHTML = sites.slice().sort((a, b) => b[2] - a[2]).map(([lat, lng, n]) =>
      `<circle cx="${lng}" cy="${-lat}" r="${v.w * size * Math.min(2.2, Math.sqrt(n))}"><title>${plural(n, "record")}</title></circle>`).join("");
    buttons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === name)));
  };

  buttons.forEach(b => b.addEventListener("click", () => show(b.dataset.view)));
  show("world");
}
