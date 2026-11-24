// The "Where were its fossils found?" section on dinosaur pages. The globe is started by js/globe-detail.js.
const plural = (n, word) => `${n} ${n === 1 ? word : word === "country" ? "countries" : `${word}s`}`;

function fossilMapHTML(d) {
  const f = FOSSILS[d.id];
  if (!f || !f.sites.length) return "";
  const then = Math.round((d.start + d.end) / 2);
  return `
    <section class="stage-globe stage-detail bleed" id="stage" style="--tint:${periodOf(d).color}">
      <div class="globe-sky" id="sky"><canvas id="globe" tabindex="0" role="img" aria-label="Globe showing where ${d.name} fossils were found: ${f.countries.map(c => c[0]).join(", ")}. Use the arrow keys to turn it, and plus and minus to zoom."></canvas><div id="tip" class="globe-tip" hidden></div></div>
      <div class="globe-wrap" id="wrap"><div class="globe-zoom"><button type="button" id="zoom-in" aria-label="Zoom in">+</button><button type="button" id="zoom-out" aria-label="Zoom out">−</button></div></div>
      <div class="globe-words" id="words">
        <h2>Where were its fossils found?</h2>
        <p>${plural(f.total, "fossil record")} from ${plural(f.countries.length, "country")}. One record can be a single tooth or a whole herd.</p>
        <ul class="map-places">${f.countries.map(([name, n]) => `<li><strong>${name}</strong> ${n}</li>`).join("")}</ul>
        <div class="map-buttons" role="group" aria-label="Which Earth to show">
          <button type="button" data-when="0" aria-pressed="true">Today</button>
          <button type="button" data-when="${then}" aria-pressed="false">${then} million years ago</button>
        </div>
        <p id="when" class="when" aria-live="polite"></p>
        <p><a class="button" href="globe.html?d=${d.id}">See who lived alongside it →</a></p>
      </div>
    </section>`;
}
