// The globe on a dinosaur page: one dinosaur's fossil sites, today or when it lived.
if ($("globe") && dino) {
  const me = castOf(dino), then = me.mid;
  focus = dino.id;
  hooks = {
    hover: false,
    shown: () => [me],
    tapDot(spot) { showTip(spot); },
    tapLand() { hideTip(); }
  };
  const say = () => {
    const now = ma < 33;
    $("when").textContent = now
      ? "Today’s map. Drag to spin it, and point at a dot to see what was found."
      : `The same spots, carried back with the land to where it sat when ${dino.name} lived. Shorelines then were different, and the older the map, the less certain it is.`;
    document.querySelectorAll("[data-when]").forEach(b => b.setAttribute("aria-pressed", String((Number(b.dataset.when) === 0) === now)));
  };
  const facing = () => { const [lat, lng] = latLng(placeNow(me.main.v, me.main.plate)); return { lng, lat: Math.max(-70, Math.min(70, lat)) }; };
  // Going back or forward in time, the view follows this dinosaur's ground so its dots never leave sight.
  function goTo(t) {
    const from = ma, was = facing(), off = { lng: view.lng - was.lng, lat: view.lat - was.lat };
    off.lng = ((off.lng + 540) % 360 + 360) % 360 - 180;
    spin = { x: 0, y: 0 }; hideTip();
    ease(calm ? 1 : 1800, u => {
      ma = u === 1 ? t : from + (t - from) * u;
      const f = facing();
      view = { lng: f.lng + off.lng * (1 - u), lat: f.lat + off.lat * (1 - u) };
      say(); dirty = true;
    });
  }
  document.querySelectorAll("[data-when]").forEach(b => b.addEventListener("click", () => goTo(Number(b.dataset.when))));
  ma = 0;
  view = facing();
  startGlobe();
  say();
}
