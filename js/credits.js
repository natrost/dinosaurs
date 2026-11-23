// Credits for every silhouette, built from js/silhouettes.js.
const LICENSES = {
  "CC0": { name: "Public domain (CC0 1.0)", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  "BY-SA-3.0": { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" }
};

document.getElementById("page").innerHTML = `
  <nav class="crumbs"><a href="index.html">← Time machine</a></nav>
  <section class="panel">
    <h1>Credits</h1>
    <p>Thank you to the artists who share their dinosaur silhouettes through
      <a href="https://www.phylopic.org/">PhyloPic</a>. We cropped, resized and recolored the drawings,
      and mirrored some so they all face the same way. Each changed drawing is shared under the same license as its original.</p>
    <div class="credits">${DINOS.filter(d => SILHOUETTES[d.id]).sort((a, b) => a.name.localeCompare(b.name)).map(d => {
      const s = SILHOUETTES[d.id], lic = LICENSES[s.license];
      return `
      <div class="credit" id="${d.id}">
        <div class="art" style="--tint:${periodOf(d).color}">${silhouetteSVG(d, "rgba(255,255,255,.92)")}</div>
        <p><strong>${d.name}</strong> (<em>${s.species}</em>)<br>
          <a href="${s.source}">Drawing</a> by ${s.by} · <a href="${lic.url}">${lic.name}</a>${s.mirrored ? " · mirrored" : ""}</p>
      </div>`;
    }).join("")}</div>
  </section>
  <section class="panel">
    <h2>Fossil map</h2>
    <p>Fossil locations come from the <a href="https://paleobiodb.org/">Paleobiology Database</a>
      (<a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>), downloaded in November 2026. We removed uncertain and out-of-date records.
      Coastlines are from <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain).</p>
  </section>`;
