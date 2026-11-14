// fx.js — canvas particles (solar storm, dust, confetti, sparkles) and WebAudio sound effects.
// Particle counts are capped so it runs on school Chromebooks. No strobe flashing (photosensitive safety).
import { VIEW, SPOTS } from './art.js';

let canvas, ctx, parts = [], running = false, calm = false, scale = 1;
export function initFx(c) {
  canvas = c; ctx = c.getContext('2d');
  const resize = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    scale = canvas.width / VIEW.w;
  };
  resize(); window.addEventListener('resize', resize);
}
export const setFxCalm = (v) => { calm = !!v; };

function loop() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const now = performance.now();
  parts = parts.filter((p) => now < p.end);
  ctx.save(); ctx.translate(0, -VIEW.cy * scale);   // match the scene's visible window
  for (const p of parts) {
    p.update(p, now);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    if (p.shape === 'rect') { ctx.save(); ctx.translate(p.x * scale, p.y * scale); ctx.rotate(p.rot); ctx.fillRect(-p.r * scale, -p.r * 0.5 * scale, p.r * 2 * scale, p.r * scale); ctx.restore(); }
    else if (p.shape === 'star') { drawStar(p.x * scale, p.y * scale, p.r * scale); ctx.fill(); }
    else { ctx.arc(p.x * scale, p.y * scale, p.r * scale, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}
function drawStar(x, y, r) {
  ctx.moveTo(x, y - r);
  for (let i = 1; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}
function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
const cap = (n) => (calm ? Math.round(n / 4) : n);

/** Solar particle storm: streams from the Sun to the base. With a shield they bounce off the bubble. */
export function storm({ size = 'normal', shield = 0, ms = 3200 } = {}) {
  const [sx, sy] = SPOTS.sun, [hx, hy] = SPOTS.hab;
  const n = cap(size === 'big' ? 200 : 120), t0 = performance.now();
  const blocked = shield >= 4 ? 0.9 : shield >= 2 ? 0.6 : shield === 1 ? 0.25 : 0;
  for (let i = 0; i < n; i++) {
    const delay = Math.random() * (ms - 900), life = 900 + Math.random() * 500;
    const tx = hx + (Math.random() - 0.5) * 360, ty = hy + (Math.random() - 0.5) * 160;
    const bounce = Math.random() < blocked;
    const p = { x: sx, y: sy, r: 2 + Math.random() * 2.5, color: Math.random() < 0.5 ? '#ffe14d' : '#ff8a3d', alpha: 0, end: t0 + delay + life, shape: 'dot' };
    p.update = (q, now) => {
      const k = (now - t0 - delay) / life;
      if (k < 0) { q.alpha = 0; return; }
      q.alpha = 1 - Math.max(0, k - 0.8) * 5;
      if (bounce && k > 0.6) {
        const kk = (k - 0.6) / 0.4, bx = sx + (tx - sx) * 0.62, by = sy + (ty - sy) * 0.62;
        q.x = bx + (bx - sx) * -0.15 * kk + (Math.random() - 0.5) * 2; q.y = by - 120 * kk; q.color = '#9cf0ff';
      } else { q.x = sx + (tx - sx) * k; q.y = sy + (ty - sy) * k; }
    };
    parts.push(p);
  }
  start();
}

export function dust(ms = 2600) {
  const t0 = performance.now(), n = cap(160);
  for (let i = 0; i < n; i++) {
    const y = 120 + Math.random() * 440, v = 0.35 + Math.random() * 0.6, delay = Math.random() * 900;
    parts.push({ x: -20, y, r: 1.5 + Math.random() * 3, color: Math.random() < 0.5 ? '#f0a35e' : '#c46a35', alpha: 0.8, end: t0 + ms, shape: 'dot',
      update: (q, now) => { const t = now - t0 - delay; q.x = -20 + t * v; q.y = y + Math.sin(t / 180) * 8; q.alpha = t < 0 ? 0 : 0.8; } });
  }
  start();
}

export function confetti(ms = 3500, el = null) {
  const t0 = performance.now(), n = cap(160);
  const colors = ['#ffd23f', '#ff5c7a', '#46d9ff', '#5be36b', '#a77bff', '#ff8a3d'];
  for (let i = 0; i < n; i++) {
    const x = Math.random() * VIEW.w, vy = 0.12 + Math.random() * 0.25, vx = (Math.random() - 0.5) * 0.12, delay = Math.random() * 1200, rot = Math.random() * 6;
    parts.push({ x, y: -20, r: 5 + Math.random() * 5, color: colors[i % colors.length], alpha: 1, end: t0 + ms + delay, shape: i % 5 === 0 ? 'star' : 'rect', rot,
      update: (q, now) => { const t = now - t0 - delay; q.y = -20 + t * vy; q.x = x + t * vx + Math.sin(t / 200) * 12; q.rot = rot + t / 200; q.alpha = t < 0 ? 0 : 1; } });
  }
  start();
}

export function sparkle(x, y, n = 18) {
  const t0 = performance.now();
  for (let i = 0; i < cap(n); i++) {
    const a = (i / n) * Math.PI * 2, sp = 0.08 + Math.random() * 0.12;
    parts.push({ x, y, r: 4 + Math.random() * 4, color: i % 2 ? '#ffe14d' : '#fff', alpha: 1, end: t0 + 900, shape: 'star',
      update: (q, now) => { const t = now - t0; q.x = x + Math.cos(a) * t * sp; q.y = y + Math.sin(a) * t * sp; q.alpha = 1 - t / 900; } });
  }
  start();
}

// ---------- sound (synthesized; no licensed audio) ----------
let ac = null, muted = false, rumbleSrc = null;
export const setMuted = (v) => { muted = !!v; };
export const isMuted = () => muted;
function audio() {
  if (muted) return null;
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(freq, dur = 0.12, type = 'sine', vol = 0.18, when = 0, slideTo = null) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + when;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur = 0.4, vol = 0.12, filterFreq = 1200, when = 0) {
  const a = audio(); if (!a) return;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + when;
  f.type = 'bandpass'; f.frequency.value = filterFreq; g.gain.value = vol;
  src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start(t);
}

// ---------------------------------------------------------------- cartoon crowd voices ("woohoo!", "yaaay!")
// tiny formant synth: a buzzy voice source through three vowel filters that glide between vowels
const VOWEL = { i: [300, 2300, 3000], a: [800, 1250, 2600], e: [480, 2000, 2700], u: [330, 850, 2300], o: [480, 900, 2500] };
function syllable(a, t, { f0 = [380, 520, 440], dur = 0.6, vowels = ['i', 'a', 'e'], vol = 0.06, breath = 0 }) {
  const src = a.createOscillator(); src.type = 'sawtooth';
  const vib = a.createOscillator(), vibG = a.createGain(); vib.frequency.value = 5.5 + Math.random() * 2; vibG.gain.value = f0[1] * 0.025;
  vib.connect(vibG).connect(src.frequency);
  src.frequency.setValueAtTime(f0[0], t);
  src.frequency.exponentialRampToValueAtTime(f0[1], t + dur * 0.35);
  src.frequency.exponentialRampToValueAtTime(f0[2], t + dur);
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(vol, t + 0.05);
  out.gain.setValueAtTime(vol, t + dur * 0.7); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  [0, 1, 2].forEach((k) => {
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = k ? 9 : 6;
    const g = a.createGain(); g.gain.value = [1, 0.55, 0.25][k];
    vowels.forEach((v, j) => {
      const at = t + (dur * j) / Math.max(1, vowels.length - 1) * (j === 1 ? 0.25 : 1);
      if (j === 0) f.frequency.setValueAtTime(VOWEL[v][k], t); else f.frequency.linearRampToValueAtTime(VOWEL[v][k], Math.min(at, t + dur));
    });
    src.connect(f).connect(g).connect(out);
  });
  out.connect(a.destination);
  src.start(t); vib.start(t); src.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  if (breath) noise(0.12, breath, 1800, t - a.currentTime);
}
function claps(a, from, n, span) { for (let i = 0; i < n; i++) noise(0.05, 0.08 + Math.random() * 0.05, 1500 + Math.random() * 1200, from + Math.random() * span); }
// a few kid voices at slightly different pitches and times = a happy crowd
export function crowdYay({ big = true } = {}) {
  const a = audio(); if (!a) return;
  const voices = calm ? 2 : big ? 6 : 3, t0 = a.currentTime + 0.02;
  for (let v = 0; v < voices; v++) {
    const p = 300 + Math.random() * 240, dt = Math.random() * 0.12;
    if (big) {   // "woo-HOO!"
      syllable(a, t0 + dt, { f0: [p * 0.8, p * 1.05, p], dur: 0.32, vowels: ['u', 'u', 'u'], vol: 0.09 });
      syllable(a, t0 + dt + 0.36, { f0: [p * 1.1, p * 1.5, p * 1.1], dur: 0.5, vowels: ['u', 'o', 'u'], vol: 0.11, breath: 0.05 });
    }
    // "yaaaaay!"
    const ty = t0 + dt + (big ? 1.0 : 0);
    syllable(a, ty, { f0: [p, p * 1.45, p * 1.15], dur: big ? 1.1 : 0.8, vowels: ['i', 'a', 'a', 'e'], vol: 0.12 });
  }
  if (!calm) claps(a, big ? 0.9 : 0.2, big ? 26 : 12, big ? 1.6 : 1.0);
}

export const sfx = {
  click: () => tone(660, 0.07, 'triangle', 0.12),
  chirp: () => { const f = [880, 1175, 1568, 1319, 1760]; for (let i = 0; i < 3; i++) tone(f[Math.floor(Math.random() * f.length)], 0.06, 'square', 0.035, i * 0.07); },
  place: () => { tone(520, 0.08, 'triangle', 0.14); tone(780, 0.1, 'triangle', 0.12, 0.06); },
  remove: () => tone(420, 0.1, 'triangle', 0.12, 0, 260),
  nope: () => { tone(220, 0.12, 'square', 0.06); tone(180, 0.16, 'square', 0.06, 0.1); },
  beam: () => { for (let i = 0; i < 4; i++) tone(1200 + i * 120, 0.06, 'sine', 0.08, i * 0.12); },
  whoosh: () => noise(1.2, 0.18, 500),
  crackle: (n = 30) => { for (let i = 0; i < n; i++) noise(0.03, 0.25, 3000 + Math.random() * 2000, Math.random() * 2.5); },
  good: () => { tone(660, 0.1, 'triangle', 0.14); tone(880, 0.14, 'triangle', 0.14, 0.1); },
  bad: () => { tone(330, 0.18, 'sawtooth', 0.06); tone(262, 0.25, 'sawtooth', 0.06, 0.15); },
  cheer: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.15, i * 0.11)),
  yay: () => crowdYay({ big: false }),
  woohoo: () => crowdYay({ big: true }),
  fanfare: () => [523, 523, 523, 698, 880, 784, 1047].forEach((f, i) => tone(f, i === 6 ? 0.6 : 0.16, 'square', 0.07, [0, .15, .3, .45, .75, .95, 1.15][i])),
  badge: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, 'sine', 0.14, i * 0.08)),
  rocket: () => noise(2.5, 0.22, 300),
  tick: () => { tone(880, 0.09, 'square', 0.08); tone(440, 0.12, 'sine', 0.1); },
  boom: () => { tone(110, 1.2, 'sine', 0.5, 0, 28); tone(70, 1.6, 'triangle', 0.35, 0.02, 22); noise(1.4, 0.55, 180); noise(0.5, 0.4, 900); },
  thud: () => { tone(90, 0.5, 'sine', 0.4, 0, 40); noise(0.4, 0.3, 300); },
  rumble: (sec = 3) => {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, a.sampleRate * sec, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / (a.sampleRate * 0.2)) * (1 - i / d.length);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = 0.5;
    src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start();
    rumbleSrc = src;
  },
  stopRumble: () => { try { rumbleSrc && rumbleSrc.stop(); } catch (_) { /* already stopped */ } rumbleSrc = null; },
};

// ---------- music (original, synthesized in the browser — no licensed audio) ----------
// Three moods: 'base' (bouncy exploring), 'storm' (fast and tense), 'win' (victory, loops for the dance party).
// 16th-note step sequencer with drums, bass, chords, arpeggio and a catchy lead.
const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note → Hz
const SONGS = {
  base: { bpm: 112, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
    melody: [[72, 76, 79, 76, 77, 76, 74, 72], [71, 74, 79, 74, 76, 74, 71, 67], [72, 76, 81, 79, 77, 76, 74, 76], [77, 76, 74, 72, 74, null, 72, null]], vol: 0.85 },
  storm: { bpm: 140, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],
    melody: [[69, 72, 76, 72, 77, 76, 72, 69], [65, 69, 72, 69, 74, 72, 69, 65], [67, 71, 74, 71, 76, 74, 71, 67], [68, 71, 76, 71, 74, 71, 68, 64]], vol: 0.8 },
  win: { bpm: 128, chords: [[60, 64, 67], [53, 57, 60], [55, 59, 62], [60, 64, 67]],
    melody: [[72, 72, 76, 79, 84, null, 79, 84], [77, 81, 84, 81, 89, null, 84, 81], [79, 83, 86, 83, 91, null, 86, 83], [84, 79, 76, 79, 84, null, null, null]], vol: 0.9 },
};
let musicOn = true, song = null, timer = null, stepIdx = 0, nextTime = 0, master = null, noiseBuf = null;
export const isMusicOn = () => musicOn;
export function setMusicOn(v) { musicOn = !!v; if (!musicOn) stopMusic(); else if (song) playMusic(song, true); }

function bus(a) {
  if (master) return master;
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master = a.createGain(); master.gain.value = 0.0001;
  master.connect(comp).connect(a.destination);
  noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return master;
}
function note(a, freq, t, dur, type, vol, { detune = 0, cutoff = 0 } = {}) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq; o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out = g;
  if (cutoff) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; g.connect(f); out = f; }
  o.connect(g); out.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function kick(a, t) {
  const o = a.createOscillator(), g = a.createGain();
  o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.25);
}
function hit(a, t, type, vol, dur) {
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf; f.type = type === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = type === 'hat' ? 7000 : 1800;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur + 0.02);
}
export function playMusic(name, force = false) {
  if (song === name && timer && !force) return;
  song = name;
  if (!musicOn || muted) return;
  const a = audio(); if (!a) return;
  stopTimer();
  const S = SONGS[name]; bus(a);
  master.gain.cancelScheduledValues(a.currentTime);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), a.currentTime);
  master.gain.exponentialRampToValueAtTime(S.vol, a.currentTime + 0.6);
  const sixteenth = 60 / S.bpm / 4;
  stepIdx = 0; nextTime = a.currentTime + 0.08;
  timer = setInterval(() => {
    while (nextTime < a.currentTime + 0.6) {
      const bar = Math.floor(stepIdx / 16) % 4, st = stepIdx % 16, chord = S.chords[bar], t = nextTime;
      // drums
      if (st === 0 || st === 8 || (name === 'storm' && st === 10)) kick(a, t);
      if (st === 4 || st === 12) hit(a, t, 'snare', name === 'storm' ? 0.45 : 0.35, 0.16);
      if (st % 2 === 0) hit(a, t, 'hat', 0.12, 0.05);
      // bass (audible on laptop speakers: one octave below middle C, not two)
      if (st % 4 === 0 || (name === 'storm' && st % 2 === 0)) note(a, N(chord[0] - 12), t, sixteenth * 3, 'triangle', 0.32);
      // chords (soft, filtered)
      if (st === 0) chord.forEach((n) => note(a, N(n), t, sixteenth * 15, 'sine', 0.05));
      // arpeggio sparkle (8th notes only, to keep the browser relaxed)
      if (st % 4 === 2) note(a, N(chord[(st >> 2) % 3] + 12), t, sixteenth * 1.6, 'triangle', 0.05);
      // lead melody (8th notes), doubled and slightly detuned for a fuller sound
      if (st % 2 === 0) {
        const m = S.melody[bar][st / 2];
        if (m) note(a, N(m), t, sixteenth * 2.2, 'triangle', 0.13);
      }
      nextTime += sixteenth; stepIdx++;
    }
  }, 120);
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
export function stopMusic() {
  stopTimer();
  if (master && ac) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ac.currentTime); master.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4); }
}
// Browsers only allow sound after the first tap/click/key. Unlock audio on the very first one.
if (typeof window !== 'undefined') {
  const unlock = () => { const a = audio(); if (a && a.state === 'suspended') a.resume(); if (song && !timer && musicOn && !muted) playMusic(song, true); };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { once: false, passive: true }));
}
export const musicState = () => ({ ctx: ac ? ac.state : 'none', gain: master ? +master.gain.value.toFixed(3) : 0, playing: !!timer, song, musicOn, muted });

// Turn the music down while PIXEL talks, so the voice is clear.
let ducked = false;
export function duckMusic(on) {
  if (!master || !ac || !song || ducked === on) return;
  ducked = on;
  const v = on ? 0.18 : (SONGS[song] ? SONGS[song].vol : 0.8);
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ac.currentTime);
  master.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), ac.currentTime + 0.25);
}
