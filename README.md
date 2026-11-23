# The Dino Landing

A dinosaur site with a time slider, a timeline, and a page for every dinosaur.
Plain HTML, CSS and JavaScript: no build step.

## Run it
From this folder:

    python3 -m http.server 8766

then open http://localhost:8766

## Where things are
- `js/data.js`: **all the content.** Periods, the family tree, and every dinosaur. Add a dinosaur by copying an entry.
- `css/tokens.css`: **colors and fonts for every page.** Figma values go here. (Period colors are also in `js/data.js`.)
- `css/home.css`, `css/style.css`: the homepage, and all the other pages.
- `images/art/trex-pencil.png`: the T. rex on the homepage. Replace it with another transparent drawing of the same shape (1227 × 661).
- `index.html` + `js/dig.js`, `js/color-in.js`, `js/mix.js`: homepage (the dig, coloring in, mixed-up bones). `js/paths.js` holds the outlines it needs.
- `timemachine.html` + `js/timemachine.js`: time machine, timeline, all dinosaurs.
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
