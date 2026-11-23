const slider = document.getElementById("slider");
const timelineEl = document.getElementById("timeline");

renderTimeline(timelineEl, DINOS);
document.getElementById("all").innerHTML =
  DINOS.slice().sort((a, b) => a.name.localeCompare(b.name)).map(d => dinoCard(d)).join("");

function distanceInTime(d, ma) {
  if (ma > d.start) return ma - d.start;
  if (ma < d.end) return d.end - ma;
  return 0;
}

function update() {
  const ma = TIME_START - Number(slider.value);
  document.getElementById("ma").textContent = ma;

  const p = periodAt(ma);
  document.querySelector(".machine").style.setProperty("--tint", p ? p.color : "var(--sand)");
  document.getElementById("period-chip").innerHTML = p ? periodChip(p) : `<span class="chip chip-plain">Before the dinosaurs</span>`;
  document.getElementById("period-blurb").textContent = p ? p.blurb : "This is the very end of the Permian, just before the Triassic began. There were no dinosaurs yet.";

  const alive = DINOS.filter(d => d.start >= ma && ma >= d.end);
  const aliveEl = document.getElementById("alive");
  const titleEl = document.getElementById("alive-title");

  if (alive.length) {
    titleEl.textContent = `Alive right now (${alive.length})`;
    aliveEl.innerHTML = alive.map(d => dinoCard(d)).join("");
  } else {
    const closest = DINOS.slice().sort((a, b) => distanceInTime(a, ma) - distanceInTime(b, ma)).slice(0, 3);
    titleEl.textContent = "Nobody from our list was alive at this moment. Closest in time:";
    aliveEl.innerHTML = closest.map(d => {
      const gap = Math.round(distanceInTime(d, ma));
      const when = ma > d.start ? `${gap} million years later` : `${gap} million years earlier`;
      return dinoCard(d, `<p class="small muted">Lived ${when}</p>`);
    }).join("");
  }

  const aliveIds = new Set(alive.map(d => d.id));
  timelineEl.querySelectorAll(".tl-row[data-id]").forEach(row => {
    const on = aliveIds.has(row.dataset.id);
    row.classList.toggle("is-alive", on);
    row.classList.toggle("is-dim", !on);
  });
  timelineEl.querySelectorAll(".tl-now").forEach(line => {
    line.hidden = false;
    line.style.left = `${pct(ma)}%`;
  });
}

slider.addEventListener("input", update);
document.querySelectorAll(".jump button").forEach(btn => {
  btn.addEventListener("click", () => {
    slider.value = TIME_START - Number(btn.dataset.ma);
    update();
  });
});

update();
