// People for the size charts, and the "How tall are you?" box.
const PERSON_PATH = "M0.06,0.2 L0.24,0.2 Q0.27,0.2 0.27,0.24 L0.27,0.52 L0.23,0.52 L0.22,1 L0.16,1 L0.15,0.6 L0.14,1 L0.08,1 L0.07,0.52 L0.03,0.52 L0.03,0.24 Q0.03,0.2 0.06,0.2 Z";
const ADULT_M = 1.75;
const BUS_M = { length: 12, height: 3.2 };

// Side views, drawn facing right. span: how much ground it covers for each meter of length along the body.
const SIZE_ART = {
  eoraptor: { src: "images/side/eoraptor.webp", w: 1200, h: 481, span: .96 },
  herrerasaurus: { src: "images/side/herrerasaurus.webp", w: 1200, h: 457, span: .96 },
  coelophysis: { src: "images/side/coelophysis.webp", w: 1200, h: 389, span: .96 }
};
function sizeArt(d, color) {
  const art = SIZE_ART[d.id];
  if (!art) return silhouetteOf(d, color);
  const h = (art.h / art.w) * 100;
  return { real: true, h, span: art.span, shape: `<image href="${art.src}" width="100" height="${h}" preserveAspectRatio="none"/>` };
}

function personSVG(x, ground, heightM, cls) {
  return `<g class="${cls}" transform="translate(${x} ${ground - heightM}) scale(${heightM})">
    <circle cx="0.15" cy="0.09" r="0.085"/><path d="${PERSON_PATH}"/></g>`;
}

function getKidInches() {
  const saved = Number(localStorage.getItem("dino-kid-height-in"));
  return saved > 0 ? saved : 48;
}

function fmtHeight(m) {
  const inches = Math.round(m * 39.37);
  return `${Math.round(m * 100) / 100} m (${Math.floor(inches / 12)} ft ${inches % 12} in)`;
}

function heightFormHTML() {
  const inches = getKidInches();
  return `
    <form class="height-form" onsubmit="return false">
      How tall are you?
      <input id="ft" type="number" min="2" max="7" value="${Math.floor(inches / 12)}" aria-label="Your height, feet"> ft
      <input id="in" type="number" min="0" max="11" value="${inches % 12}" aria-label="Your height, inches"> in
    </form>`;
}

// Saves the height on this device and calls onChange when it's a sensible number.
function startHeightForm(onChange) {
  const ft = document.getElementById("ft"), inch = document.getElementById("in");
  const update = () => {
    const total = (Number(ft.value) || 0) * 12 + (Number(inch.value) || 0);
    if (total >= 24 && total <= 90) {
      localStorage.setItem("dino-kid-height-in", String(total));
      onChange();
    }
  };
  ft.addEventListener("input", update);
  inch.addEventListener("input", update);
}
