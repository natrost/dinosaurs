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
// sure: out of 5. Nobody has ever heard a dinosaur, so nothing scores higher than 3.
const LEVELS = ["", "A guess", "An educated guess", "Some real evidence"];
const BOOM = "Alligators and ostriches make deep calls with their mouths closed, and some big dinosaurs may have too. A movie-style roar is less likely.";
const SMALL = "A small relative of birds, so we guessed at something between a coo and a hiss. No trace of its voice has been found.";
const BULKY = "No trace of its voice has been found. We guessed at a low, closed-mouth call, because bigger animals tend to sound deeper.";
const CALLS = {
  eoraptor:           { kind: "coo", f: 260, sure: 1, why: SMALL },
  herrerasaurus:      { kind: "coo", f: 130, sure: 1, why: "An early meat-eater on two legs. No trace of its voice has been found, so this is a guess at a rough, low coo." },
  coelophysis:        { kind: "coo", f: 230, sure: 1, why: SMALL },
  plateosaurus:       { kind: "bellow", f: 92, sure: 1, why: BULKY },
  dilophosaurus:      { kind: "boom", f: 84, sure: 1, why: BOOM },
  stegosaurus:        { kind: "bellow", f: 78, sure: 1, why: BULKY },
  allosaurus:         { kind: "boom", f: 66, sure: 2, why: BOOM },
  brachiosaurus:      { kind: "rumble", f: 38, sure: 1, why: BULKY },
  diplodocus:         { kind: "rumble", f: 44, sure: 1, why: BULKY },
  archaeopteryx:      { kind: "croak", f: 520, sure: 1, why: "It had feathers and wings, but no one has found the birds’ voice organ in a dinosaur. We guessed at a rough croak rather than a song." },
  iguanodon:          { kind: "bellow", f: 105, sure: 1, why: BULKY },
  spinosaurus:        { kind: "boom", f: 58, sure: 2, why: BOOM },
  argentinosaurus:    { kind: "rumble", f: 32, sure: 1, why: BULKY },
  parasaurolophus:    { kind: "horn", f: 74, sure: 3, why: "Its long, hollow crest could have worked like a horn. Scientists scanned one and modeled its sound in 1997.", link: ["Read about the 1997 model", "https://newsreleases.sandia.gov/scientists-use-digital-paleontology-to-produce-voice-of-parasaurolophus-dinosaur/"] },
  velociraptor:       { kind: "coo", f: 190, sure: 2, why: "Feathered and close to birds, so we guessed at something between a coo and a hiss. No trace of its voice has been found." },
  ankylosaurus:       { kind: "chirrup", f: 120, sure: 2, why: "A voice box from a close relative, Pinacosaurus, hints that armored dinosaurs may have made more birdlike sounds.", link: ["Read the 2023 study", "https://pmc.ncbi.nlm.nih.gov/articles/PMC9932143"] },
  pachycephalosaurus: { kind: "bellow", f: 150, sure: 1, why: "No trace of its voice has been found. We guessed at a short, throaty call." },
  triceratops:        { kind: "bellow", f: 70, sure: 1, why: BULKY },
  tyrannosaurus:      { kind: "boom", f: 46, sure: 2, why: BOOM }
};
const LENGTH = { boom: 3.4, horn: 3.6, rumble: 4.4, bellow: 2.6, coo: 2.2, croak: 1.5, chirrup: 2.4 };

// Builds one call in an audio context and returns the node it comes out of.
function buildCall(ac, call, t0) {
  const out = ac.createGain(), f = call.f, len = LENGTH[call.kind];
  const gain = (v = 0) => { const g = ac.createGain(); g.gain.value = v; return g; };
  const curve = (param, points) => { param.setValueAtTime(points[0][1], t0 + points[0][0]); for (const [t, v] of points.slice(1)) param.linearRampToValueAtTime(v, t0 + t); };
  const filter = (type, hz, q = .7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = hz; b.Q.value = q; return b; };
  // A tone made of harmonics, so even very low notes can be heard on a small speaker.
  const tone = (amps, pitch, shape, to = out) => {
    const osc = ac.createOscillator(), n = amps.length + 1, real = new Float32Array(n), imag = new Float32Array(n);
    amps.forEach((a, i) => { imag[i + 1] = a; });
    osc.setPeriodicWave(ac.createPeriodicWave(real, imag));
    curve(osc.frequency, pitch);
    const g = gain(); curve(g.gain, shape);
    osc.connect(g).connect(to); osc.start(t0); osc.stop(t0 + len + .1);
    return osc;
  };
  const wobble = (param, hz, depth) => { const o = ac.createOscillator(), g = gain(depth); o.frequency.value = hz; o.connect(g).connect(param); o.start(t0); o.stop(t0 + len + .1); };
  // Breath and throat noise. Seeded, so a dinosaur always sounds the same.
  const noise = (shape, band, q = .8, type = "bandpass") => {
    const n = Math.ceil(ac.sampleRate * (len + .1)), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    let s = Math.round(f * 977) % 2147483647;
    for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    const src = ac.createBufferSource(), b = filter(type, band, q), g = gain();
    src.buffer = buf; curve(g.gain, shape); src.connect(b).connect(g).connect(out); src.start(t0);
    return b;
  };
  if (call.kind === "boom") {
    // Two closed-mouth booms, the second longer.
    const swell = [[0, 0], [.12, .55], [.55, .8], [.95, 0], [1.25, 0], [1.45, .6], [2.2, .95], [3.3, 0]];
    tone([1, .8, .55, .42, .3, .2, .13, .08], [[0, f * .92], [.5, f * 1.06], [.95, f * .9], [1.25, f * .95], [2.1, f * 1.1], [3.3, f * .8]], swell);
    tone([.6, .4, .3], [[0, f * 1.5], [2.1, f * 1.62], [3.3, f * 1.2]], swell.map(([t, v]) => [t, v * .3]));
    noise(swell.map(([t, v]) => [t, v * .35]), f * 4, .9);
  } else if (call.kind === "horn") {
    // A long tube: mostly odd harmonics, sliding up and settling, with echoes of the crest.
    const shape = [[0, 0], [.25, .6], [1.1, .85], [1.6, .7], [2.6, .8], [3.5, 0]], pipe = filter("peaking", 310, 1.4), bell = filter("lowpass", 1200, .5);
    pipe.gain.value = 9; pipe.connect(bell).connect(out);
    tone([1, .25, .75, .2, .55, .15, .4, .12, .28, .1, .18], [[0, f * .82], [.35, f], [1.2, f * 1.12], [1.7, f * .98], [2.5, f * 1.34], [3.5, f * .9]], shape, pipe);
    noise(shape.map(([t, v]) => [t, v * .12]), 620, 1.2);
  } else if (call.kind === "rumble") {
    const shape = [[0, 0], [.5, .7], [1.7, .6], [2.3, .9], [3.3, .7], [4.3, 0]];
    const o = tone([1, .95, .85, .7, .55, .42, .32, .24, .17, .12, .08], [[0, f * .9], [1.2, f * 1.08], [2.4, f], [3.2, f * 1.15], [4.3, f * .85]], shape);
    wobble(o.frequency, 5.5, f * .035);
    noise(shape.map(([t, v]) => [t, v * .3]), f * 5, .7);
  } else if (call.kind === "bellow") {
    const shape = [[0, 0], [.18, .7], [.7, .9], [1.5, .75], [2.5, 0]], throat = filter("lowpass", f * 9, 2);
    curve(throat.frequency, [[0, f * 4], [.7, f * 9], [2.5, f * 3]]); throat.connect(out);
    const o = tone([1, .7, .55, .42, .33, .26, .2, .15, .11, .08], [[0, f * .85], [.5, f * 1.18], [1.4, f * 1.05], [2.5, f * .7]], shape, throat);
    wobble(o.frequency, 9, f * .03);
    noise(shape.map(([t, v]) => [t, v * .28]), f * 6, .8);
  } else if (call.kind === "coo") {
    // Three soft notes and a hiss of breath.
    const notes = [[0, 0], [.08, .7], [.3, 0], [.45, 0], [.55, .85], [.9, 0], [1.02, 0], [1.12, .6], [1.5, 0]];
    tone([1, .35, .18, .08], [[0, f * .9], [.15, f * 1.15], [.3, f], [.45, f], [.65, f * 1.28], [.9, f * .95], [1.02, f], [1.2, f * 1.1], [1.5, f * .8]], notes);
    noise(notes.map(([t, v]) => [t, v * .12]), f * 6, 1);
    noise([[0, 0], [1.45, 0], [1.65, .28], [2.1, 0]], 2600, .6);
  } else if (call.kind === "croak") {
    const shape = [[0, 0], [.04, .75], [.28, .5], [.36, 0], [.55, 0], [.6, .85], [1.05, .5], [1.25, 0]];
    const o = tone([1, .8, .7, .5, .4, .3, .2], [[0, f * 1.1], [.3, f * .85], [.55, f * 1.2], [1.2, f * .7]], shape);
    wobble(o.frequency, 46, f * .16);
    noise(shape.map(([t, v]) => [t, v * .5]), f * 3, .9);
  } else if (call.kind === "chirrup") {
    // A low, rolling trill.
    const shape = [[0, 0], [.1, .7], [.8, .85], [1.1, 0], [1.3, 0], [1.4, .8], [2.1, .6], [2.35, 0]];
    const o = tone([1, .75, .5, .4, .28, .2, .12], [[0, f], [.5, f * 1.5], [1.05, f * 1.15], [1.3, f * 1.1], [1.8, f * 1.7], [2.35, f]], shape);
    wobble(o.frequency, 17, f * .2);
    noise(shape.map(([t, v]) => [t, v * .2]), f * 7, 1);
  }
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
  setTimeout(() => p.gain.disconnect(), 250);
  p.done();
}
function playCall(d, canvas, done) {
  hushName(); stopCall();
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  const call = CALLS[d.id], gain = finish(audio, buildCall(audio, call, audio.currentTime + .05)), look = audio.createAnalyser();
  look.fftSize = 2048; gain.connect(look); look.connect(audio.destination);
  const p = { gain, done, raf: 0 };
  p.timer = setTimeout(() => { if (playingCall === p) stopCall(); }, (LENGTH[call.kind] + .25) * 1000);
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
        <p class="sure"><span class="dots-row" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= call.sure ? "on" : ""}"></i>`).join("")}</span> ${LEVELS[call.sure]} <span class="vh">(${call.sure} out of 5 for evidence)</span></p>
      </div>
      <div class="call-play">
        <canvas id="wave" aria-hidden="true"></canvas>
        <button type="button" class="button call-button" id="call">Hear our best guess</button>
        ${call.f < 110 ? `<p class="small">It’s a low one, so headphones help.</p>` : ""}
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
