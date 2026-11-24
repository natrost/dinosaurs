// Credits for every silhouette, built from js/silhouettes.js.
const LICENSES = {
  "CC0": { name: "Public domain (CC0 1.0)", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  "BY-SA-3.0": { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" }
};

document.getElementById("page").innerHTML = `
  <nav class="crumbs"><a href="index.html">← Back to the dig</a></nav>
  <section class="panel">
    <h1>Credits</h1>
    <p>Thank you to the artists who share their dinosaur silhouettes through
      <a href="https://www.phylopic.org/">PhyloPic</a>. We cropped, resized and recolored the drawings,
      and mirrored some so they all face the same way. Each changed drawing is shared under the same license as its original.</p>
    <div class="credits">${DINOS.filter(d => SILHOUETTES[d.id]).sort((a, b) => a.name.localeCompare(b.name)).map(d => {
      const s = SILHOUETTES[d.id], lic = LICENSES[s.license];
      return `
      <div class="credit" id="${d.id}">
        <div class="art" style="--tint:${periodOf(d).color}">${silhouetteSVG(d, "var(--ink)")}</div>
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
  </section>
  <section class="panel" id="globe">
    <h2>Globe</h2>
    <p>Ancient positions are from the <a href="https://gws.gplates.org/">GPlates Web Service</a>, using the plate model of
      <a href="https://doi.org/10.1016/j.earscirev.2020.103477">Merdith and others (2021)</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>). We simplified the coastlines and blended between 5-million-year steps.
      Today’s country borders are from <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain); dashed lines are disputed or not agreed.</p>
  </section>
  <section class="panel">
    <h2>Type and artwork</h2>
    <p>Set in <a href="https://fonts.google.com/specimen/Archivo">Archivo</a> and <a href="https://fonts.google.com/specimen/Reenie+Beanie">Reenie Beanie</a> (SIL Open Font License). The T. rex drawing was made for this site.</p>
  </section>`;
