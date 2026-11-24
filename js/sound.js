// Sounds for the dinosaur pages: saying the name, and a best guess at the animal's call.
// Nothing plays until someone presses a button.

// ── Saying the name ──────────────────────────────────────────
// Dinosaurs with a clip in audio/names/<id>.m4a. Any of them can be swapped for a new recording with the same name.
const CLIPS = ["eoraptor", "herrerasaurus", "coelophysis", "plateosaurus", "dilophosaurus", "stegosaurus", "allosaurus", "brachiosaurus", "diplodocus", "archaeopteryx", "iguanodon", "spinosaurus", "argentinosaurus", "parasaurolophus", "velociraptor", "ankylosaurus", "pachycephalosaurus", "triceratops", "tyrannosaurus"];
let nameClip = null;
function hushName() {
  if (!nameClip) return;
  const { clip, done } = nameClip;
  nameClip = null;
  clip.pause();
  done();
}
function sayName(d, done) {
  stopCall(); hushName();
  const clip = new Audio(`audio/names/${d.id}.m4a`), mine = nameClip = { clip, done };
  const end = () => { if (nameClip === mine) hushName(); };
  clip.onended = clip.onerror = end;
  clip.play().catch(end);
}

// ── Best-guess calls ─────────────────────────────────────────
// The calls are in audio/calls/<id>.m4a, mixed from real animals (see the README there). A call with a kind is made here instead.
// sure: out of 5. Nobody has ever heard a dinosaur, so nothing scores higher than 3.
// low: has notes a small speaker can struggle with.
const LEVELS = ["", "A guess", "An educated guess", "Some real evidence"];
const BOOM = "Alligators and ostriches make deep calls with their mouths closed, and some big dinosaurs may have too. A movie-style roar is less likely.";
const SMALL = "No trace of its voice has been found. Birds are living dinosaurs, so we started with a bird.";
const BULKY = "No trace of its voice has been found. We guessed at a low, heavy call, because bigger animals tend to sound deeper. The bison is our artistic choice: it isn’t related to dinosaurs.";
const GATOR = "an alligator, slowed down", GRAZER = "a bison and an alligator, slowed down", GIANT = "an alligator and a little bison, slowed right down", BIRD = "a raven and an alligator’s hiss, slowed down";
const CALLS = {
  eoraptor:           { sure: 1, why: SMALL, from: BIRD },
  herrerasaurus:      { sure: 1, why: "An early meat-eater on two legs. No trace of its voice has been found, so this is a guess at a rough, low call.", from: GATOR, low: true },
  coelophysis:        { sure: 1, why: SMALL, from: BIRD },
  plateosaurus:       { sure: 1, why: BULKY, from: GRAZER, low: true },
  dilophosaurus:      { sure: 1, why: BOOM, from: GATOR, low: true },
  stegosaurus:        { sure: 1, why: BULKY, from: GRAZER, low: true },
  allosaurus:         { sure: 2, why: BOOM, from: GATOR, low: true },
  brachiosaurus:      { sure: 1, why: BULKY, from: GIANT, low: true },
  diplodocus:         { sure: 1, why: BULKY, from: GIANT, low: true },
  archaeopteryx:      { sure: 1, why: "It had feathers and wings, but no one has found the birds’ voice organ in a dinosaur. We guessed at a rough croak rather than a song.", from: "a raven, slowed down" },
  iguanodon:          { sure: 1, why: BULKY, from: GRAZER, low: true },
  spinosaurus:        { sure: 2, why: BOOM, from: GATOR, low: true },
  argentinosaurus:    { sure: 1, why: BULKY, from: GIANT, low: true },
  parasaurolophus:    { kind: "horn", f: 74, sure: 3, why: "Its long, hollow crest could have worked like a horn. Scientists scanned one and modeled its sound in 1997.", link: ["Read about the 1997 model", "https://newsreleases.sandia.gov/scientists-use-digital-paleontology-to-produce-voice-of-parasaurolophus-dinosaur/"], low: true },
  velociraptor:       { sure: 2, why: "Feathered and close to birds, so we started with a bird. No trace of its voice has been found.", from: BIRD },
  ankylosaurus:       { sure: 2, why: "A voice box from a close relative, Pinacosaurus, hints that armored dinosaurs may have made more birdlike sounds.", link: ["Read the 2023 study", "https://pmc.ncbi.nlm.nih.gov/articles/PMC9932143"], from: "a raven and an alligator, slowed down", low: true },
  pachycephalosaurus: { sure: 1, why: "No trace of its voice has been found. We guessed at a short, throaty call. The bison is our artistic choice: it isn’t related to dinosaurs.", from: GRAZER, low: true },
  triceratops:        { sure: 1, why: BULKY, from: GRAZER, low: true },
  tyrannosaurus:      { sure: 2, why: BOOM, from: GATOR, low: true }
};
const HORN = 3.6; // seconds

// Parasaurolophus: builds the crest horn in an audio context and returns the node it comes out of.
function buildHorn(ac, f, t0) {
  const out = ac.createGain();
  const gain = (v = 0) => { const g = ac.createGain(); g.gain.value = v; return g; };
  const curve = (param, points) => { param.setValueAtTime(points[0][1], t0 + points[0][0]); for (const [t, v] of points.slice(1)) param.linearRampToValueAtTime(v, t0 + t); };
  const filter = (type, hz, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = hz; b.Q.value = q; return b; };
  // A long tube: mostly odd harmonics, sliding up and settling, with echoes of the crest.
  const shape = [[0, 0], [.25, .6], [1.1, .85], [1.6, .7], [2.6, .8], [3.5, 0]], pipe = filter("peaking", 310, 1.4), bell = filter("lowpass", 1200, .5);
  pipe.gain.value = 9; pipe.connect(bell).connect(out);
  const amps = [1, .25, .75, .2, .55, .15, .4, .12, .28, .1, .18], imag = new Float32Array(amps.length + 1);
  imag.set(amps, 1);
  const osc = ac.createOscillator(), body = gain();
  osc.setPeriodicWave(ac.createPeriodicWave(new Float32Array(imag.length), imag));
  curve(osc.frequency, [[0, f * .82], [.35, f], [1.2, f * 1.12], [1.7, f * .98], [2.5, f * 1.34], [3.5, f * .9]]);
  curve(body.gain, shape);
  osc.connect(body).connect(pipe); osc.start(t0); osc.stop(t0 + HORN + .1);
  // Breath. Seeded, so it always sounds the same.
  const n = Math.ceil(ac.sampleRate * (HORN + .1)), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0), src = ac.createBufferSource(), breath = gain();
  let s = Math.round(f * 977) % 2147483647;
  for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
  src.buffer = buf; curve(breath.gain, shape.map(([t, v]) => [t, v * .12]));
  src.connect(filter("bandpass", 620, 1.2)).connect(breath).connect(out); src.start(t0);
  return out;
}
// Evens out the loudness and keeps anything from blasting.
function finish(ac, node, level = .5) {
  const safe = ac.createDynamicsCompressor(), g = ac.createGain(), cut = ac.createBiquadFilter();
  cut.type = "highpass"; cut.frequency.value = 28;
  safe.threshold.value = -16; safe.ratio.value = 8; safe.attack.value = .004; safe.release.value = .18;
  g.gain.value = level;
  node.connect(cut).connect(safe).connect(g);
  return g;
}

let audio = null, playingCall = null;
function stopCall() {
  if (!playingCall) return;
  const p = playingCall; playingCall = null;
  clearTimeout(p.timer); cancelAnimationFrame(p.raf);
  p.gain.gain.setTargetAtTime(0, audio.currentTime, .03);
  setTimeout(() => { if (p.src) p.src.stop(); p.gain.disconnect(); }, 250);
  p.done();
}
const loaded = {};
function loadCall(id) {
  return loaded[id] = loaded[id] || fetch(`audio/calls/${id}.m4a`)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(data => new Promise((ok, fail) => audio.decodeAudioData(data, ok, fail)))
    .catch(e => { delete loaded[id]; throw e; });
}
function playCall(d, canvas, done) {
  hushName(); stopCall();
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  const call = CALLS[d.id], look = audio.createAnalyser(), p = { done, raf: 0 };
  const end = () => { if (playingCall === p) stopCall(); };
  if (call.kind === "horn") {
    p.gain = finish(audio, buildHorn(audio, call.f, audio.currentTime + .05));
    p.timer = setTimeout(end, (HORN + .25) * 1000);
  } else {
    // Decoded first rather than played as a media file: browsers can pause media files of five seconds or more.
    p.gain = audio.createGain();
    loadCall(d.id).then(sound => {
      if (playingCall !== p) return;
      p.src = audio.createBufferSource();
      p.src.buffer = sound; p.src.onended = end;
      p.src.connect(p.gain); p.src.start();
    }).catch(end);
  }
  look.fftSize = 2048; p.gain.connect(look); look.connect(audio.destination);
  playingCall = p;
  const data = new Uint8Array(look.fftSize);
  const tick = () => { look.getByteTimeDomainData(data); drawWave(canvas, data); p.raf = requestAnimationFrame(tick); };
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) tick();
}
// The wavy line: flat at rest, moving with the sound.
function drawWave(canvas, data) {
  const dpr = Math.min(2, devicePixelRatio || 1), w = canvas.clientWidth, h = canvas.clientHeight, c = canvas.getContext("2d");
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  c.beginPath();
  const n = 160;
  for (let i = 0; i <= n; i++) {
    const edge = Math.sin(Math.PI * i / n), v = data ? (data[Math.floor(i / n * (data.length - 1))] - 128) / 128 : Math.sin(i * .9) * .012;
    c.lineTo(w * i / n, h / 2 + v * edge * h * 1.5);
  }
  c.lineWidth = 4; c.lineJoin = c.lineCap = "round"; c.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink"); c.stroke();
}

// ── The parts of a dinosaur page ─────────────────────────────
function callHTML(d) {
  const call = CALLS[d.id];
  if (!call) return "";
  return `
    <section class="call bleed" style="--tint:${periodOf(d).color}">
      <div class="call-words">
        <h2>What did it sound like?</h2>
        <p><strong>Nobody knows.</strong> ${call.why}${call.link ? ` <a href="${call.link[1]}">${call.link[0]}</a>.` : ""}</p>
        <p class="made">${call.from ? `Made from ${call.from}.` : "Made by computer, with no animal recordings."}</p>
        <p class="sure"><span class="dots-row" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= call.sure ? "on" : ""}"></i>`).join("")}</span> ${LEVELS[call.sure]} <span class="vh">(${call.sure} out of 5 for evidence)</span></p>
      </div>
      <div class="call-play">
        <canvas id="wave" aria-hidden="true"></canvas>
        <button type="button" class="button call-button" id="call">Hear our best guess</button>
        ${call.low ? `<p class="small">It’s a low one, so headphones help.</p>` : ""}
      </div>
    </section>`;
}
function startSounds(d) {
  const nameBtn = document.getElementById("say-name"), callBtn = document.getElementById("call"), wave = document.getElementById("wave");
  if (nameBtn) {
    nameBtn.hidden = !CLIPS.includes(d.id);
    nameBtn.addEventListener("click", () => {
      sayName(d, () => nameBtn.classList.remove("is-playing"));
      nameBtn.classList.add("is-playing");
    });
  }
  if (!callBtn) return;
  if (!(window.AudioContext || window.webkitAudioContext)) { callBtn.closest(".call-play").hidden = true; return; }
  const rest = () => { callBtn.textContent = "Hear our best guess"; callBtn.classList.remove("is-playing"); drawWave(wave); };
  callBtn.addEventListener("click", () => {
    if (playingCall) return stopCall();
    callBtn.textContent = "Stop"; callBtn.classList.add("is-playing");
    playCall(d, wave, rest);
  });
  addEventListener("resize", () => { if (!playingCall) drawWave(wave); });
  addEventListener("pagehide", () => { stopCall(); hushName(); });
  drawWave(wave);
}
