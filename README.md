# Dino Time Machine (prototype)

A dinosaur site with a time slider, a timeline, and a page for every dinosaur.
Plain HTML, CSS and JavaScript: no build step.

## Run it
From this folder:

    python3 -m http.server 8766

then open http://localhost:8766

## Where things are
- `js/data.js`: **all the content.** Periods, the family tree, and every dinosaur. Add a dinosaur by copying an entry.
- `css/style.css`: the look. The colors and fonts at the top (`:root`) are where Figma design tokens will go.
- `index.html` + `js/home.js`: home page (time machine, timeline, all dinosaurs).
- `dino.html` + `js/dino.js`: the detail page, e.g. `dino.html?id=triceratops`.
- `compare.html` + `js/compare.js`: compare two dinosaurs, e.g. `compare.html?a=tyrannosaurus&b=stegosaurus`.
- `js/size.js`: the people in size charts and the height box.
- `js/common.js`: shared pieces (timeline, cards, fallback silhouettes).
- `images/silhouettes/` + `js/silhouettes.js`: PhyloPic drawings, with their scale and license.
- `js/map.js`, `js/fossils.js`, `js/worldmap.js`: fossil map, its PaleobioDB data, and the coastlines.
- `credits.html` + `js/credits.js`: credits, built from `js/silhouettes.js`. Keep this: two drawings require it.
- `_silhouette-options.html`, `_refence_image/`: working files. Leave off the live site.

## Next up
- Argentinosaurus still needs a drawing
- Main artwork for each dinosaur page
- Apply the Figma design
- Domain + hosting
- 3D world
