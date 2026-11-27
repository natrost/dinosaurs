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
  <section class="panel" id="pictures">
    <h2>Pictures</h2>
    <p>Thank you to the photographers and artists who share their work through <a href="https://commons.wikimedia.org/">Wikimedia Commons</a>.
      We made the pictures smaller, and some are shown on our paper color. Each one is shared under the same license as its original.</p>
    ${DINOS.filter(d => (PHOTOS[d.id] || []).some(x => x.page)).sort((a, b) => a.name.localeCompare(b.name)).map(d => `
    <p class="picture-credits"><strong>${d.name}:</strong> ${PHOTOS[d.id].filter(x => x.page).map((x, i) => `<a href="${x.page}">${x.kind.toLowerCase()} ${i + 1}</a> by ${x.by} (${x.licurl ? `<a href="${x.licurl}">${x.lic}</a>` : x.lic})`).join("; ")}.</p>`).join("")}
  </section>
  <section class="panel">
    <h2>Fossils</h2>
    <p>Fossil locations come from the <a href="https://paleobiodb.org/">Paleobiology Database</a>
      (<a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>), downloaded in November 2026. We removed uncertain and out-of-date records.</p>
  </section>
  <section class="panel" id="globe">
    <h2>Globe</h2>
    <p>Ancient positions are from the <a href="https://gws.gplates.org/">GPlates Web Service</a>, using the plate model of
      <a href="https://doi.org/10.1016/j.earscirev.2020.103477">Merdith and others (2021)</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>). We simplified the coastlines and blended between 5-million-year steps.
      Today’s country borders are from <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain); dashed lines are disputed or not agreed.</p>
  </section>
  <section class="panel">
    <h2>Type, artwork and sound</h2>
    <p>Set in Bookmania, Gotham and Bulletin Typewriter, from <a href="https://fonts.adobe.com/">Adobe Fonts</a>, with <a href="https://fonts.google.com/specimen/Archivo">Archivo</a> as a backup (SIL Open Font License). The big T. rex picture, and the Eoraptor, Herrerasaurus, Coelophysis, Plateosaurus, Dilophosaurus, Stegosaurus, Allosaurus, Brachiosaurus, Diplodocus and Archaeopteryx artwork, were made for this site. Names are spoken by <a href="https://huggingface.co/hexgrad/Kokoro-82M">Kokoro</a>, an open computer voice (Apache 2.0).</p>
    <p>The dinosaur calls are best guesses: nobody has heard a dinosaur. We made them from <a href="https://www.nps.gov/subjects/sound/gallery.htm">National Park Service recordings</a> (public domain): an American alligator from Everglades, bison from Yellowstone and a common raven from Grand Teton. We cleaned them up, slowed them down and layered them. The Parasaurolophus horn is made by computer.</p>
  </section>`;
