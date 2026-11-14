// main.js — screens, controls, PIXEL, prizes. The rules live in sim.js; the art in art.js.
/* global gsap */
import * as D from './data.js';
import {
  newGame, step, applyUpgrade, poolToday, solarToday, reactorToday, briefing, preview, isNight,
  airDays, foodDays, maxDose, stars, scienceGoal, AIR_NEED, GROW_DAYS, O2_USE, FOOD_USE, nightStartOf,
} from './sim.js';
import { archiveSky, practiceSky, liveSky, sepRecordUrl, ARCHIVE_MAY2024 } from './sky.js';
import { makeRng } from './rng.js';
import * as Art from './art.js';
import * as Fx from './fx.js';
import { playLaunch } from './launch.js';
import * as Brain from './brain.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch (_) { /* */ } },
};

const profile = Object.assign({ name: '', badges: [], cards: [], best: {}, voice: true, music: true, sound: true, calm: false, missions: 0 }, store.get('oz-profile', {}));
const saveProfile = () => store.set('oz-profile', profile);
// PIXEL's brain (machine learning, on this device only)
function ensureBrain() {
  if (profile.brain && profile.brain.v === 4 && profile.brain.w?.length === Brain.FEATURES.length) return;
  const t = Brain.trainBrain();
  profile.brain = { v: 4, w: t.w, practice: 300, samples: t.samples, accuracy: +t.accuracy.toFixed(3), learnedDays: 0 };
  profile.skills = profile.skills || {};
  saveProfile();
}
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion && store.get('oz-profile', null) == null) profile.calm = true;

let G = null;                 // game state (from sim.js)
let plan = null;              // today's choices
const setup = { world: 'moon', sky: 'archive', mode: 'cadet' };
let airWarnDay = 0, busy = false, current = 'title', prevScreen = 'title', skipping = false, fxReady = false, tutorialStep = 0;

const W = () => D.WORLDS[G.world];
const dayWord = () => (G && G.world === 'mars' ? 'Sol' : 'Day');
const nameOr = () => profile.name || 'Commander';

// ---------------------------------------------------------------- PIXEL & voice
let voices = [];
if ('speechSynthesis' in window) { const lv = () => { voices = speechSynthesis.getVoices(); }; lv(); speechSynthesis.onvoiceschanged = lv; }
const clean = (t) => t.replace(/<[^>]+>/g, ' ').replace(/\[\[(\w+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();
// PIXEL's voice: picks the most natural voice on this device, then "acts" each sentence by mood.
const VOICE_RANK = [/natural/i, /neural/i, /online/i, /enhanced|premium/i, /google us english/i, /google uk english female/i,
  /aria|jenny|ana|emma|michelle|libby|sonia|natasha/i, /samantha|karen|moira|tessa|serena|ava|allison|susan|nicky/i, /zira|female/i];
function rankVoice(v) {
  if (!/^en/i.test(v.lang)) return -1;
  let score = 0;
  VOICE_RANK.forEach((re, i) => { if (re.test(v.name)) score += (VOICE_RANK.length - i) * 10; });
  if (/en[-_]US/i.test(v.lang)) score += 3;
  if (/male|david|mark|daniel|fred|alex/i.test(v.name) && !/female/i.test(v.name)) score -= 25;
  return score;
}
const englishVoices = () => voices.filter((v) => /^en/i.test(v.lang)).sort((a, b) => rankVoice(b) - rankVoice(a));
function pixelVoice() {
  const list = englishVoices();
  return list.find((v) => v.name === profile.voiceName) || list[0] || null;
}
// mood → how PIXEL "performs" the line
// Gentle settings: a very high pitch makes many computer voices wobble and "shake",
// so PIXEL stays close to the voice's natural pitch and lets the words carry the emotion.
const DELIVERY = {
  star:    { rate: 0.97, pitch: 1.12 },
  happy:   { rate: 0.96, pitch: 1.1 },
  wow:     { rate: 0.95, pitch: 1.1 },
  talk:    { rate: 0.95, pitch: 1.05 },
  worried: { rate: 0.9,  pitch: 1.0 },
};
const PEP = ['Woohoo!', 'Yes!', 'Awesome!', 'Whoa!', 'Yay!'];
let speakMood = 'talk', speakTimer = null, lastSpoken = '', speakDone = null;
let spokenStickers = new Set();   // day-report stickers PIXEL has already read aloud this mission
// speak() returns a promise that resolves when PIXEL has finished the line (or it was replaced / voice is off)
function speak(text, mood = speakMood) {
  if (speakDone) { speakDone(); speakDone = null; }          // an older line that never started counts as done
  if (!profile.voice || !('speechSynthesis' in window)) return Promise.resolve();
  let t = clean(text).replace(/\.\.\./g, '…');
  if (!t) return Promise.resolve();
  if (mood === 'star' && !/^(woohoo|yes|awesome|whoa|yay|wow|super|high five)/i.test(t)) t = `${pick(PEP)} ${t}`;
  return new Promise((resolve) => {
    let finished = false;
    const done = () => { if (!finished) { finished = true; if (speakDone === done) speakDone = null; resolve(); } };
    speakDone = done;
    // wait a moment so quick back-to-back messages don't chop each other; only the latest is spoken
    clearTimeout(speakTimer);
    speakTimer = setTimeout(() => {
      try {
        speechSynthesis.cancel();
        const base = DELIVERY[mood] || DELIVERY.talk;
        const v = pixelVoice();
        const natural = v && /natural|neural|online|enhanced|premium/i.test(v.name);
        // An excited opener ("Woohoo!", "Amazing!") is spoken as a short, bright burst, then the rest in PIXEL's steady voice.
        // Short bursts can go higher without the wobble that long high-pitched sentences get.
        const parts = [];
        const m = (mood === 'star' || mood === 'wow') && t.match(/^((?:[A-Za-z']+[ ,]*){1,3}!+)\s+(.+)$/);
        if (m) parts.push({ text: m[1].replace(/o{2,}/gi, 'oooo').replace(/a{1,}y\b/gi, 'aaay'), pitch: natural ? 1.25 : 1.45, rate: 1.05 }, { text: m[2], pitch: natural ? 1 : base.pitch, rate: base.rate });
        else parts.push({ text: t, pitch: natural ? 1 : base.pitch, rate: base.rate });
        const us = parts.map((p) => {
          const u = new SpeechSynthesisUtterance(p.text);
          if (v) { u.voice = v; u.lang = v.lang; }
          u.pitch = p.pitch; u.rate = p.rate;
          return u;
        });
        us[0].onstart = () => Fx.duckMusic(true);
        us.forEach((u, i) => { u.onerror = () => { Fx.duckMusic(false); done(); }; if (i === us.length - 1) u.onend = () => { Fx.duckMusic(false); done(); }; });
        if (profile.sound) Fx.sfx.chirp();
        setTimeout(() => us.forEach((u) => speechSynthesis.speak(u)), profile.sound ? 180 : 0);
        setTimeout(done, 1500 + t.length * 110);           // safety net if a browser never fires onend
        lastSpoken = t;
      } catch (_) { done(); /* no voice on this device */ }
    }, 250);
  });
}
// stop PIXEL right away (e.g. when the kid presses Launch)
function hush() {
  clearTimeout(speakTimer);
  if (speakDone) { speakDone(); speakDone = null; }
  try { speechSynthesis.cancel(); } catch (_) { /* no voice */ }
  Fx.duckMusic(false);
}
function voiceDialog() {
  const list = englishVoices();
  const cur = pixelVoice();
  $('#dlgBody').innerHTML = `<h2>🎙️ PIXEL's voice</h2>
    <p style="font-size:18px">Pick the voice you like best! Voices marked ✨ sound the most natural. (Different computers have different voices. Microsoft Edge has great "Natural" voices.)</p>
    ${list.length ? `<div style="display:grid;gap:8px;max-height:46vh;overflow:auto">${list.slice(0, 24).map((v) => `
      <button class="choice" data-voice="${esc(v.name)}" aria-pressed="${cur && cur.name === v.name}" style="padding:10px 14px;font-size:17px">
        ${/natural|neural|online|enhanced|premium/i.test(v.name) ? '✨ ' : ''}${esc(v.name)} <span class="small">${esc(v.lang)}</span></button>`).join('')}</div>`
      : '<p>No voices found on this device yet. Try again in a moment, or try another browser.</p>'}
    <p class="center" style="margin-top:14px"><button class="btn" id="btnTestVoice">▶ Test the voice</button> <button class="btn secondary" id="btnVoiceDone">Done</button></p>`;
  $('#dlg').showModal();
  $$('#dlgBody [data-voice]').forEach((b) => (b.onclick = () => {
    profile.voiceName = b.dataset.voice; profile.voice = true; saveProfile(); syncToggles();
    $$('#dlgBody [data-voice]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    speak('Hi! I am PIXEL! Is this voice awesome? Let\'s go to space!', 'star');
  }));
  $('#btnTestVoice').onclick = () => speak('Hi! I am PIXEL, your robot helper! You are amazing! Ready for a mission?', 'star');
  $('#btnVoiceDone').onclick = () => $('#dlg').close();
}
const terms = (s) => s.replace(/\[\[(\w+)\|?([^\]]*)\]\]/g, (_, t, label) => `<button class="term" data-term="${t}">${label || t}</button>`);
let lastSaid = '';
function say(html, mood = 'talk', tone = '', { voice = true } = {}) {
  lastSaid = html;
  $('#bubbleText').innerHTML = terms(html);
  const b = $('#bubble'); b.className = `bubble ${tone}`;
  Art.pixelReact(mood);
  if (window.gsap) gsap.fromTo(b, { scale: 0.92 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
  speakMood = mood;
  return voice ? speak(html, mood) : Promise.resolve();
}
// ---------------------------------------------------------------- screens
function show(id) {
  if (id !== current && !['notebook', 'about'].includes(current)) prevScreen = current;
  current = id;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${id}`));
  const inGame = id === 'base';
  $('#dayPill').classList.toggle('hidden', !inGame);
  $('#skyBadge').classList.toggle('hidden', !(G && (inGame || id === 'report')));
  if (inGame) { $('#pixelDock').append($('#pixelArt'), $('#bubble')); $('#pixel').classList.add('hidden'); }
  else { $('#pixel').append($('#pixelArt'), $('#bubble')); $('#pixel').classList.toggle('hidden', id === 'report'); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------------------------------------------------------------- settings
function syncToggles() {
  $('#btnVoice').setAttribute('aria-pressed', profile.voice);
  $('#btnMusic').setAttribute('aria-pressed', profile.music);
  $('#btnSound').setAttribute('aria-pressed', profile.sound);
  $('#btnCalm').setAttribute('aria-pressed', profile.calm);
  Fx.setMuted(!profile.sound); Fx.setMusicOn(profile.music && profile.sound);
  Art.setCalm(profile.calm); Fx.setFxCalm(profile.calm);
}
$('#btnVoice').onclick = () => { profile.voice = !profile.voice; if (!profile.voice) speechSynthesis?.cancel(); saveProfile(); syncToggles(); };
$('#btnMusic').onclick = () => { profile.music = !profile.music; if (profile.music) profile.sound = true; saveProfile(); syncToggles(); if (profile.music) Fx.playMusic(current === 'report' && G && G.over === 'complete' ? 'win' : 'base', true); say(profile.music ? 'Music on! 🎵 Let\'s groove!' : 'Music off.', 'happy'); };
$('#btnSound').onclick = () => { profile.sound = !profile.sound; saveProfile(); syncToggles(); };
$('#btnCalm').onclick = () => { profile.calm = !profile.calm; saveProfile(); syncToggles(); say(profile.calm ? 'Calm mode on: gentler, quicker animations.' : 'Calm mode off. Full cartoon power!', 'happy'); };
$('#btnSay').onclick = () => speak(lastSaid, speakMood);
// Full screen: bigger game, no browser bars. (Some embedded previews block this; it works on the real website.)
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
async function goFull(on = true) {
  try {
    if (on && !isFull()) await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
    else if (!on && isFull()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } catch (_) { if (on) say('Full screen is blocked here. Open the game from its own website to play full screen!', 'talk', '', { voice: false }); }
}
$('#btnFull').onclick = () => goFull(!isFull());
document.addEventListener('fullscreenchange', () => { $('#btnFull').setAttribute('aria-pressed', isFull()); document.body.classList.toggle('full', isFull()); window.dispatchEvent(new Event('resize')); });
$('#btnVoicePick').onclick = voiceDialog;
$('#btnNotebook').onclick = $('#btnNotebook2').onclick = () => { renderNotebook(); show('notebook'); };
$('#btnAbout').onclick = $('#btnAbout2').onclick = $('#skyBadge').onclick = () => { renderAbout(); show('about'); };
document.addEventListener('click', (e) => {
  const t = e.target.closest('.term');
  if (t) { Fx.sfx.click(); say(D.GLOSSARY[t.dataset.term] || '', 'wow'); }
  if (e.target.closest('.back')) show(prevScreen === 'base' && G && !G.over ? 'base' : prevScreen || 'title');
});

// ---------------------------------------------------------------- title
function initTitle() {
  $('#pixelArt').innerHTML = Art.pixelSVG();
  Art.flagAstronaut($('#tAstro'), D.CREW[0]);
  Art.pixelFace('happy'); Art.animatePixel();
  $('#playerName').value = profile.name;
  $('#playerName').oninput = (e) => { profile.name = e.target.value.trim().slice(0, 20); saveProfile(); };
  $('#btnContinue').classList.toggle('hidden', !store.get('oz-save', null));
  if (window.gsap) {
    gsap.to('#tMoon', { y: -14, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to('#tMars', { y: 12, rotation: 10, duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to('#tRocket', { x: 30, y: -24, rotation: 8, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  say(`Hi! I'm PIXEL, your robot helper. Type your name, then press <b>New Mission</b>!`, 'happy');
}
$('#btnNew').onclick = () => { Fx.sfx.click(); Fx.playMusic('base'); renderSetup(); show('world'); say('Where do you want to build your outpost? The Moon or Mars? Each one is tricky in a different way!', 'talk'); };
$('#btnContinue').onclick = () => { const s = store.get('oz-save', null); if (s) { G = s; Fx.playMusic('base'); enterBase(); } };

// ---------------------------------------------------------------- setup
function renderSetup() {
  const wp = $('#worldPick');
  wp.innerHTML = Object.values(D.WORLDS).map((w) => `
    <button class="choice" data-world="${w.id}" aria-pressed="${setup.world === w.id}">
      <span class="big">${w.emoji}</span><h3>${w.name}</h3>
      <ul>${w.facts.map(([i, t]) => `<li>${i} ${t}</li>`).join('')}</ul>
    </button>`).join('');
  $$('#worldPick .choice').forEach((b) => (b.onclick = () => { setup.world = b.dataset.world; Fx.sfx.place(); renderSetup(); say(setup.world === 'moon' ? 'The Moon! Close to Earth, but the night lasts 14 days and radiation is strong.' : 'Mars! Far away — messages take minutes — and dust storms can hide the Sun.', 'wow'); }));
  const skies = [
    { id: 'archive', icon: '🌞', name: 'Real Superstorm', text: 'The REAL May 2024 solar storms, from NASA data. Recommended!', tag: 'Real data' },
    { id: 'live', icon: '📡', name: 'Live NASA Sky', text: 'The last 7 days of the real Sun, fetched from NASA (needs internet).', tag: 'Live' },
    { id: 'practice', icon: '🎲', name: 'Practice Sky', text: 'Made-up storms for practice. Different every time.', tag: 'Not real' },
  ];
  $('#skyPick').innerHTML = skies.map((k) => `<button class="choice" data-sky="${k.id}" aria-pressed="${setup.sky === k.id}"><span class="tag">${k.tag}</span><span class="big">${k.icon}</span><h3>${k.name}</h3><p>${k.text}</p></button>`).join('');
  $$('#skyPick .choice').forEach((b) => (b.onclick = () => { setup.sky = b.dataset.sky; Fx.sfx.place(); renderSetup(); }));
  const modes = [
    { id: 'cadet', icon: miniAstro(D.CREW[2], 'mode-cadet'), name: 'Cadet (ages 7–9)', text: '3 meters: Power, Air, Radiation. Extra hints from PIXEL.' },
    { id: 'commander', icon: miniAstro(D.CREW[0], 'mode-cmd') + '<small class="star">⭐</small>', name: 'Commander (ages 10–12)', text: 'Adds a greenhouse and food. Harder choices!' },
  ];
  $('#modePick').innerHTML = modes.map((m) => `<button class="choice" data-mode="${m.id}" aria-pressed="${setup.mode === m.id}"><span class="big">${m.icon}</span><h3>${m.name}</h3><p>${m.text}</p></button>`).join('');
  $$('#modePick .choice').forEach((b) => (b.onclick = () => { setup.mode = b.dataset.mode; Fx.sfx.place(); renderSetup(); }));
}
$('#btnToCrew').onclick = () => {
  Fx.sfx.click();
  $('#crewIntro').innerHTML = D.CREW.filter((c) => setup.mode === 'commander' || c.id !== 'zz').map((c) => `
    <div class="crewcard"><svg viewBox="-60 -136 120 146">${Art.astronautSVG(c.id, c.color, c.dark, { idPrefix: 'intro', skin: c.skin, hair: c.hair, style: c.style })}</svg>
    <h3>${c.name}</h3><div>${c.role}</div><div class="small">${{ eng: 'Loves fixing machines 🔧', bot: 'Grows space plants 🌱', sci: 'Hunts for science 🔭' }[c.id]}</div></div>`).join('');
  show('crew');
  if (window.gsap) $$('#crewIntro .astro').forEach((el, i) => {
    gsap.from(el, { y: 60, opacity: 0, duration: 0.6, delay: i * 0.2, ease: 'back.out(2)' });
    gsap.to(el.querySelector('.arm-r'), { rotation: -150, transformOrigin: '50% 8%', duration: 0.35, yoyo: true, repeat: -1, repeatDelay: 1 + i * 0.4 });
  });
  say(`Meet Ava, Leo and Mia! They trust you${profile.name ? ', ' + esc(profile.name) : ''}. Three tips! One: give Air 3 blocks. Two: exploring finds science stars, but inside is safer. Three: storm coming? Use the Shield and stay inside! Ready? Press Launch!`, 'happy');
};
$('#btnLaunch').onclick = async () => {
  hush();                                      // PIXEL stops talking the moment the rocket goes
  Fx.sfx.click(); Fx.stopMusic();
  goFull(true);
  const skyP = loadSky();                     // fetch NASA data while the rocket flies
  await playLaunch(setup.world);
  profile.cards = [...new Set([...profile.cards, 'sls', 'jwst'])]; saveProfile();
  await startGame(await skyP);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let gameSeed = 0;
async function loadSky() {
  gameSeed = (Date.now() % 1e9) | 0;
  if (setup.sky === 'live') {
    const sky = await liveSky(makeRng(gameSeed));
    if (sky) return sky;
    return archiveSky();
  }
  return setup.sky === 'practice' ? practiceSky(makeRng(gameSeed)) : archiveSky();
}
async function startGame(sky) {
  if (!sky) sky = await loadSky();
  G = newGame({ world: setup.world, mode: setup.mode, seed: gameSeed, sky });
  spokenStickers = new Set();
  tutorialStep = setup.mode === 'cadet' && profile.missions === 0 ? 1 : 0;
  enterBase();
}

// ---------------------------------------------------------------- base
function enterBase() {
  ensureBrain();
  show('base');
  const svg = $('#scene');
  Art.buildScene(svg, G.world);
  Art.placeCrew(D.CREW);
  if (!fxReady) { Fx.initFx($('#fx')); fxReady = true; }
  Art.setUpgrades(G.upgrades);
  const sb = $('#skyBadge'); sb.textContent = (G.sky.kind === 'practice' ? '🎲 ' : G.sky.kind === 'live' ? '📡 ' : '🌞 ') + G.sky.label; sb.className = `skybadge ${G.sky.kind}`;
  Fx.playMusic('base');
  startDay();
}

function startDay() {
  busy = false;
  const total = poolToday(G);
  const prevPlan = G.uiPlan;
  plan = { air: 0, shield: 0, radio: 0, green: 0, jobs: { ...G.jobs } };
  if (prevPlan && G.day > 1) {
    // keep yesterday's choices if we can afford them (kids can change anything)
    for (const k of ['air', 'radio', 'green', 'shield']) {
      const want = k === 'green' && G.mode !== 'commander' ? 0 : prevPlan[k] || 0;
      const used = plan.air + plan.shield + plan.radio + plan.green;
      plan[k] = Math.max(0, Math.min(want, total - used));
    }
    plan.shield = 0; // the shield is a fresh decision every day
  }
  if (isCadet()) for (const id of Object.keys(plan.jobs)) if (plan.jobs[id] !== 'explore') plan.jobs[id] = 'inside';
  for (const c of G.crew) if (c.energy <= 20) plan.jobs[c.id] = isCadet() ? 'inside' : 'rest';
  $('#dayPill').textContent = `${dayWord()} ${G.day} / ${G.maxDays}`;
  Art.setNight(isNight(G), G.world);
  Art.setDust(G.active.dust > 0, G.active.dirty);
  Art.setShield(0);
  Art.setBattery(G.battery / G.batteryMax);
  Art.setGreenhouse(G.grow, false, GROW_DAYS);
  $('#scene').style.opacity = 1;
  renderAll();
  briefPixel();
  lockBoard(false);
}

const isCadet = () => G && G.mode === 'cadet';

function stormAlert() {
  const b = briefing(G);
  const on = (b.warning && b.warning.storm) || !!b.hint;
  const el = $('#alert');
  if (!el) return on;
  el.classList.toggle('hidden', !on);
  if (on) {
    el.innerHTML = b.warning && b.warning.storm ? `☀️ STORM TODAY! Put blocks in the 🛡️ SHIELD and stay inside!` : `☀️ Big flash on the Sun! A storm might come. Use the 🛡️ SHIELD!`;
    if (window.gsap) gsap.fromTo(el, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(3)' });
    Fx.sfx.bad();
  }
  return on;
}

function briefCadet() {
  const b = briefing(G);
  const name = profile.name ? `, ${esc(profile.name)}` : '';
  if (tutorialStep === 1) return say(`Hi${name}! 👉 Press <b>+</b> on <b>Air</b> 3 times. One block for each astronaut!`, 'happy');
  if (b.warning && b.warning.storm) return say('☀️ Storm today! Add blocks to the 🛡️ Shield. Keep everyone inside! 🏠', 'worried', 'danger');
  if (b.hint) return say('☀️ The Sun made a big flash! A storm might come. Use the 🛡️ Shield!', 'worried', 'danger');
  if (airDays(G) < 2) return say('💨 Air is low! Give Air all 3 blocks!', 'worried', 'danger');
  if (b.nightSoon) return say(`🌙 Night is coming in ${b.nightSoon} ${b.nightSoon === 1 ? 'day' : 'days'}! No sun at night. Save power!`, 'worried', 'warn');
  if (isNight(G)) return say('🌙 It is night. No sun! Power comes from the battery' + (G.upgrades.includes('reactor') ? ' and the reactor.' : '.'), 'talk');
  if (G.active.dust > 0) return say('🌪️ Dust storm! Not much sun today.', 'worried', 'warn');
  if (G.active.pumpBroken || G.active.leak || G.active.dirty) return say('🔧 Something broke! Someone who stays inside will fix it.', 'talk', 'warn');
  if (b.late) return say('🐢 A message from Earth just arrived. It was slow! Mars is far away.', 'wow');
  const wk = profile.skills && Object.keys(profile.skills).length ? Brain.weakest(profile.skills) : null;
  if (wk && wk[1] < 0.45) {
    const tips = { shield: '🧠 I noticed storms are tricky for you. When the Sun flashes, use the 🛡️ Shield!', air: '🧠 Remember: 💨 Air needs 3 blocks every day!', radio: '🧠 Tip: turn on the 📡 Radio to send your science home!', night: '🧠 Tip: before night comes, save blocks in the battery!' };
    return say(tips[wk[0]], 'talk');
  }
  return say(pick([
    'Good morning, space team! ☀️', 'Rise and shine, Commander! 🚀', 'A sunny day! Explore and find science! 🔭',
    'Tip: the 📡 radio sends your science stars to Earth!', 'Tip: tired astronauts need rest. 😴',
  ]), 'happy');
}

function briefPixel() {
  stormAlert();
  if (isCadet()) return briefCadet();
  const b = briefing(G);
  const parts = []; let mood = 'talk', tone = '';
  const sky = G.sky.schedule[G.day - 1];
  if (G.day === 1) parts.push(`Welcome to ${W().name}, ${profile.name ? 'Commander ' + esc(profile.name) : 'Commander'}! ${G.sky.kind === 'archive' ? 'Our storms come from REAL NASA records of May 2024.' : G.sky.kind === 'live' ? 'Our storms come from the REAL Sun, last 7 days!' : 'This is a practice sky with made-up storms.'}`);
  if (b.warning) { parts.push(b.warning.text); if (b.warning.storm) { mood = 'worried'; tone = 'danger'; } }
  if (b.hint) { parts.push(`☀️ ${b.hint} Think about the [[shield]]!`); mood = 'worried'; tone = tone || 'warn'; }
  if (b.late) parts.push(`🐢 ${b.late}`);
  if (sky.date && G.sky.kind !== 'practice' && sky.flares.length) parts.push(`(Real flares on ${sky.date}: ${sky.flares.join(', ')})`);
  if (b.nightSoon) { parts.push(`🌙 Night begins in ${b.nightSoon} ${b.nightSoon === 1 ? 'day' : 'days'}! No sunlight for a long time — what will power the base?`); tone = tone || 'warn'; mood = 'worried'; }
  if (isNight(G)) parts.push('🌙 It is night: the solar panels are asleep. Power comes from the battery' + (G.upgrades.includes('reactor') ? ' and the reactor.' : '.'));
  if (G.active.pumpBroken) { parts.push('⚙️ The air pump is broken — give someone the 🔧 Fix job!'); tone = tone || 'warn'; }
  if (G.active.leak) { parts.push('☄️ We have an air leak — 🔧 Fix it!'); tone = tone || 'warn'; }
  if (G.active.dirty) parts.push('🟫 Dusty solar panels make less power. 🔧 Fix (clean) them!');
  if (G.active.dust > 0) { parts.push('🌪️ Dust storm! Very little sunlight today.'); tone = tone || 'warn'; }
  if (airDays(G) < 2) { parts.push('💨 Air is getting low! Give the Air slot all 3 blocks.'); tone = 'danger'; mood = 'worried'; }
  if (tutorialStep === 1) parts.push('👉 First, drag 3 yellow ⚡ blocks into <b>Air</b> (or press +). One for each astronaut!');
  if (G.day > 1 && tone !== 'danger') parts.unshift(pick(['Good morning, space team!', 'Rise and shine, Commander!', `A brand new ${dayWord().toLowerCase()} on ${W().name}!`, 'Beep boop! Morning report!', 'Wakey wakey, astronauts!']));
  if (parts.length === (G.day === 1 ? 1 : 1)) parts.push(pick([
    'Quiet day. Explore for science, or save power in the battery!',
    'Tip: unused power blocks charge the battery for later.',
    'Tip: the radio sends your science stars home to Earth.',
    `Tip: tap any purple word, like [[dose]], and I will explain it!`,
    'Tip: tired astronauts work better after a rest. 😴',
  ]));
  say(parts.join(' '), mood, tone);
}

const SLOTS = [
  { id: 'air', icon: '💨', name: 'Air', max: AIR_NEED, term: 'lifesupport' },
  { id: 'shield', icon: '🛡️', name: 'Shield', max: 4, term: 'shield' },
  { id: 'radio', icon: '📡', name: 'Radio', max: 1, term: null },
  { id: 'green', icon: '🌱', name: 'Greenhouse', max: 3, term: null, commander: true },
];
const used = () => plan.air + plan.shield + plan.radio + (G.mode === 'commander' ? plan.green : 0);
const left = () => poolToday(G) - used();

function renderAll() { renderPool(); renderSlots(); renderJobs(); renderMeters(); renderRisk(); }

function renderRisk() {
  const box = $('#riskBox'); if (!box || !G || !profile.brain) return;
  const x = Brain.features(G, plan);
  const p = Brain.predict(profile.brain.w, x);
  const why = Brain.explain(profile.brain.w, x);
  const lvl = p < 0.3 ? ['Low', '🟢', 'var(--green)'] : p < 0.6 ? ['Medium', '🟡', 'var(--amber)'] : ['High', '🔴', 'var(--red)'];
  box.dataset.tip = why ? why.tip : 'This plan looks safe! 👍';
  box.title = `PIXEL's guess: ${lvl[0]} risk (${Math.round(p * 100)}%). ${box.dataset.tip}`;
  box.innerHTML = `<span class="hi">🧠</span><span class="hv">${lvl[1]} ${lvl[0]}</span>${why ? `<span class="hi">${why.icon}</span>` : ''}`;
  box.className = `hudpill risk ${p >= 0.6 ? 'crit' : ''}`;
}

function renderPool() {
  const n = left();
  $('#poolCount').textContent = n;
  const shown = Math.min(n, 15);
  $('#pool').innerHTML = (Array.from({ length: shown }, (_, i) => `<button class="eblock sun" data-i="${i}" aria-label="Energy block. Drag it to a slot."></button>`).join('') + (n > shown ? `<span class="small" style="align-self:center">+${n - shown}</span>` : '')) || '<span class="small">All blocks used!</span>';
  const sun = solarToday(G), rx = reactorToday(G);
  $('#poolNote').innerHTML = isCadet() ? (sun === 0 ? '🌙 No sun today' : `☀️ Sun gave ${sun}`) : `☀️ Sun ${sun}${rx ? ` · ⚛️ Reactor ${rx}` : ''} · 🔋 Battery ${G.battery}<br>Unused blocks charge the battery (max ${G.batteryMax}).`;
  $$('#pool .eblock').forEach(enableDrag);
}


// ---------- power slots as pictures: each machine comes alive as blocks are added ----------
const INKC = '#23263a';
function sockets(id, n, max) {
  const w = 26, gap = 8, total = max * w + (max - 1) * gap, x0 = (170 - total) / 2;
  return Array.from({ length: max }, (_, i) => {
    const on = i < n, x = x0 + i * (w + gap);
    return `<g class="sock ${on ? 'on' : ''}" data-slot="${id}" data-i="${i}">
      <rect x="${x}" y="76" width="${w}" height="20" rx="6" fill="${on ? '#ffd23f' : '#eef0f6'}" stroke="${INKC}" stroke-width="2.5" ${on ? '' : 'stroke-dasharray="4 3"'}/>
      ${on ? `<text x="${x + w / 2}" y="91" text-anchor="middle" font-size="13">⚡</text>` : `<circle cx="${x + w / 2 - 4}" cy="86" r="2" fill="#b8bdd0"/><circle cx="${x + w / 2 + 4}" cy="86" r="2" fill="#b8bdd0"/>`}</g>`;
  }).join('');
}
function slotPicture(id, n, max) {
  const lit = n > 0;
  if (id === 'air') {
    const speed = n >= 3 ? 0.45 : n === 2 ? 0.9 : n === 1 ? 1.8 : 0;
    return `<rect x="38" y="6" width="94" height="64" rx="16" fill="${lit ? '#c9f1ff' : '#e6e9f2'}" stroke="${INKC}" stroke-width="3"/>
      <circle cx="85" cy="38" r="26" fill="#fff" stroke="${INKC}" stroke-width="3"/>
      <g class="fan" style="transform-origin:85px 38px;${speed ? `animation:spin ${speed}s linear infinite` : ''}">
        ${[0, 120, 240].map((r) => `<path d="M85 38 Q75 18 85 14 Q95 18 85 38Z" fill="${lit ? '#46d9ff' : '#b8bdd0'}" stroke="${INKC}" stroke-width="2" transform="rotate(${r} 85 38)"/>`).join('')}
      </g><circle cx="85" cy="38" r="5" fill="${INKC}"/>
      ${n >= 3 ? [0, 1, 2].map((i) => `<circle class="puff" cx="140" cy="${24 + i * 14}" r="5" fill="#bff4ff" stroke="${INKC}" stroke-width="1.5" style="animation-delay:${i * 0.3}s"/>`).join('') : ''}
      ${n < 3 ? `<text x="20" y="44" font-size="22">${n === 0 ? '😵' : '😮‍💨'}</text>` : '<text x="12" y="44" font-size="22">😊</text>'}`;
  }
  if (id === 'shield') {
    return `<rect x="45" y="52" width="80" height="18" rx="5" fill="#cfd6e6" stroke="${INKC}" stroke-width="2.5"/>
      <path d="M68 52 V40 Q85 26 102 40 V52Z" fill="#f2f4fa" stroke="${INKC}" stroke-width="2.5"/><circle cx="85" cy="44" r="4" fill="#2a3566"/>
      ${[0, 1, 2, 3].map((i) => `<path d="M${50 - i * 9} 70 Q85 ${8 - i * 2} ${120 + i * 9} 70" fill="none" stroke="${i < n ? '#46d9ff' : '#d7dbe8'}" stroke-width="${i < n ? 6 : 3}" ${i < n ? '' : 'stroke-dasharray="5 5"'} opacity="${i < n ? 0.95 : 0.8}" class="${i < n ? 'shieldon' : ''}"/>`).join('')}
      ${n >= 2 ? '<text x="140" y="26" font-size="20">💪</text>' : n === 0 ? '<text x="140" y="26" font-size="20">😬</text>' : ''}`;
  }
  if (id === 'radio') {
    return `<path d="M85 70 V40" stroke="${INKC}" stroke-width="5"/><path d="M70 70 H100" stroke="${INKC}" stroke-width="5" stroke-linecap="round"/>
      <g transform="translate(85 38) rotate(-30)"><path d="M-26 0 Q0 22 26 0Z" fill="#e9edf6" stroke="${INKC}" stroke-width="3"/><line x1="0" y1="8" x2="0" y2="-12" stroke="${INKC}" stroke-width="2.5"/><circle cy="-13" r="3.5" fill="${lit ? '#ff5c7a' : '#b8bdd0'}"/></g>
      ${lit ? [0, 1, 2].map((i) => `<path class="wave" d="M${104 + i * 12} ${18 - i * 6} q${10 + i * 4} ${10 + i * 6} 0 ${22 + i * 10}" fill="none" stroke="#46d9ff" stroke-width="4" stroke-linecap="round" style="animation-delay:${i * 0.25}s"/>`).join('') + '<text x="140" y="70" font-size="18">🌍</text>' : '<text x="125" y="40" font-size="20">💤</text>'}`;
  }
  // greenhouse
  const grow = Math.min(1, (G.grow || 0) / GROW_DAYS);
  return `<path d="M40 10 H130" stroke="${INKC}" stroke-width="4"/>
    ${[0, 1, 2].map((i) => `<g><circle cx="${60 + i * 25}" cy="16" r="7" fill="${i < n ? '#d27bff' : '#e6e9f2'}" stroke="${INKC}" stroke-width="2"/>${i < n ? `<circle class="lampglow" cx="${60 + i * 25}" cy="16" r="16" fill="#d27bff" opacity=".25"/>` : ''}</g>`).join('')}
    <path d="M66 70 L70 50 H100 L104 70Z" fill="#c8743a" stroke="${INKC}" stroke-width="2.5"/>
    <g style="transform-origin:85px 50px;transform:scale(${0.35 + grow * 0.65})">
      <path d="M85 50 V30" stroke="#2f9e5b" stroke-width="4"/><path d="M85 40 Q70 34 68 24 Q80 26 85 38Z" fill="#46c46f" stroke="${INKC}" stroke-width="1.8"/><path d="M85 36 Q100 30 102 20 Q90 22 85 34Z" fill="#5fd884" stroke="${INKC}" stroke-width="1.8"/>
      ${grow >= 1 ? '<circle cx="85" cy="26" r="6" fill="#c43c6b" stroke="#23263a" stroke-width="1.8"/>' : ''}</g>
    ${n === 0 && G.grow > 0 ? '<text x="125" y="50" font-size="20">🥀</text>' : ''}`;
}

function renderSlots() {
  const pv = isCadet() ? {
    air: plan.air >= AIR_NEED ? '✅ Everyone can breathe!' : '⚠️ Air will go down!',
    shield: plan.shield >= 4 ? '💪 SUPER strong!' : plan.shield >= 2 ? '🛡️ Strong shield!' : plan.shield === 1 ? '🙂 A little bit' : '❌ No shield',
    radio: plan.radio ? '📡 Talking to Earth!' : '🔇 Radio off',
    green: '',
  } : preview(G, plan);
  $('#slots').innerHTML = SLOTS.filter((s) => !s.commander || G.mode === 'commander').map((s) => {
    const n = plan[s.id];
    const pic = `<svg class="slotpic" viewBox="0 0 170 100" role="button" tabindex="0" aria-label="${s.name}: ${n} of ${s.max} power blocks. Tap to add one." data-pic="${s.id}">${slotPicture(s.id, n, s.max)}${sockets(s.id, n, s.max)}</svg>`;
    const good = (s.id === 'air' && n >= AIR_NEED) || (s.id === 'shield' && n >= 2) || (s.id === 'radio' && n >= 1) || (s.id === 'green' && n >= 1);
    const bad = (s.id === 'air' && n < AIR_NEED) || (s.id === 'green' && n === 0 && G.grow > 0);
    const stormy = s.id === 'shield' && plan.shield < 2 && (briefing(G).hint || briefing(G).warning?.storm);
    return `<div class="slot slot-${s.id} ${(tutorialStep === 1 && s.id === 'air') || stormy ? 'pulse' : ''}" data-id="${s.id}">
      <h4>${s.icon} ${s.name} ${s.term ? `<button class="qbtn term" data-term="${s.term}" aria-label="What is this?">?</button>` : ''}</h4>
      ${pic}
      <div class="ctrl"><button class="pm" data-minus="${s.id}" aria-label="Remove a block from ${s.name}">−</button><button class="pm" data-plus="${s.id}" aria-label="Add a block to ${s.name}">+</button><span class="small">${n}/${s.max}</span></div>
      <div class="preview ${good ? 'good' : bad ? 'bad' : ''}">${pv[s.id]}</div></div>`;
  }).join('');
  $$('[data-plus]').forEach((b) => (b.onclick = () => addBlock(b.dataset.plus)));
  $$('[data-minus]').forEach((b) => (b.onclick = () => removeBlock(b.dataset.minus)));
  $$('#slots .slotpic').forEach((svg) => {
    svg.onclick = (e) => { const sock = e.target.closest('.sock.on'); if (sock) removeBlock(sock.dataset.slot); else addBlock(svg.dataset.pic); };
    svg.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addBlock(svg.dataset.pic); } };
  });
  if (window.gsap) $$('#slots .sock.on').forEach((el) => { if (el.dataset.i == String(plan[el.dataset.slot] - 1) && lastAdded === el.dataset.slot) gsap.from(el, { scale: 1.8, transformOrigin: '50% 50%', duration: 0.35, ease: 'back.out(3)' }); });
  lastAdded = null;
}
let lastAdded = null;

function addBlock(id) {
  if (busy) return;
  const s = SLOTS.find((x) => x.id === id);
  if (left() <= 0) { Fx.sfx.nope(); say('No power blocks left! Take one from another slot, or save some in the battery tomorrow.', 'worried', 'warn'); return; }
  if (plan[id] >= s.max) { Fx.sfx.nope(); say(`${s.name} is full (${s.max} blocks).`, 'talk', '', { voice: false }); return; }
  plan[id]++; lastAdded = id; Fx.sfx.place();
  afterPlanChange(id);
}
function removeBlock(id) {
  if (busy || plan[id] <= 0) return;
  plan[id]--; Fx.sfx.remove();
  afterPlanChange(id);
}
function afterPlanChange(id) {
  if (id === 'shield') Art.setShield(plan.shield);
  if (id === 'green') Art.setGreenhouse(G.grow, plan.green > 0, GROW_DAYS);
  if (tutorialStep === 1 && plan.air >= AIR_NEED) { tutorialStep = 2; say(isCadet() ? 'Super! You are a star! ⭐ Now press the big green <b>Next Day</b> button!' : 'Super! You are a star! ⭐ Now give each astronaut a job card below, then press <b>Next Day</b>.', 'star', 'yay'); Fx.sfx.good(); }
  renderPool(); renderSlots(); renderMeters(); renderRisk();
}

// drag & drop for energy blocks (mouse, touch, pen)
function enableDrag(el) {
  el.addEventListener('pointerdown', (e) => {
    if (busy) return;
    e.preventDefault();
    const ghost = el.cloneNode(true); ghost.classList.add('ghost'); document.body.append(ghost);
    let over = null, moved = false;
    const move = (ev) => {
      moved = true;
      ghost.style.left = `${ev.clientX - 15}px`; ghost.style.top = `${ev.clientY - 17}px`;
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      const slot = t && t.closest('.slot');
      if (over && over !== slot) over.classList.remove('drop');
      over = slot; if (slot) slot.classList.add('drop');
    };
    const up = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      ghost.remove();
      if (over) { over.classList.remove('drop'); addBlock(over.dataset.id); }
      else if (!moved) { const first = plan.air < AIR_NEED ? 'air' : null; if (first) addBlock(first); else say('Drag me into a slot, or press its + button!', 'talk'); }
    };
    move(e);
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  });
}

function miniAstro(c, prefix) { return `<svg class="mini" viewBox="-40 -132 80 137" aria-hidden="true">${Art.astronautSVG(c.id, c.color, c.dark, { idPrefix: prefix, skin: c.skin, hair: c.hair, style: c.style })}</svg>`; }

function renderJobsCadet() {
  $('#jobs').innerHTML = D.CREW.map((c) => {
    const st = G.crew.find((x) => x.id === c.id);
    const tired = st.energy <= 20;
    const out = plan.jobs[c.id] === 'explore';
    return `<div class="jobcard cadet">
      <div class="who">${miniAstro(c, 'job')}<div>${c.name}</div></div>
      <div class="energy" title="Energy"><i style="width:${st.energy}%;background:${st.energy <= 20 ? 'var(--red)' : st.energy <= 50 ? 'var(--amber)' : 'var(--green)'}"></i></div>
      <div class="jbtns big">
        <button data-crew="${c.id}" data-job="inside" aria-pressed="${!out}">🏠 Stay in</button>
        <button data-crew="${c.id}" data-job="explore" aria-pressed="${out}" ${tired ? 'disabled' : ''}>🔭 Explore</button>
      </div>
      ${tired ? '<div class="tiny">😴 Too tired!</div>' : ''}</div>`;
  }).join('');
  $$('#jobs [data-job]').forEach((b) => (b.onclick = () => {
    if (busy) return;
    plan.jobs[b.dataset.crew] = b.dataset.job; Fx.sfx.click();
    Art.previewJob(b.dataset.crew, b.dataset.job === 'inside' ? 'rest' : b.dataset.job, D.CREW.findIndex((c) => c.id === b.dataset.crew));
    const n = D.CREW.find((c) => c.id === b.dataset.crew).name;
    if (b.dataset.job === 'explore' && (briefing(G).hint || briefing(G).warning?.storm)) say(`Careful! Outside, the shield can't protect ${n}! 😬`, 'worried', 'warn');
    else say(b.dataset.job === 'explore' ? `${n} will explore and find science! 🔭` : `${n} stays safe inside. 🏠`, 'happy', '', { voice: false });
    renderJobsCadet(); renderRisk();
  }));
}

function renderJobs() {
  if (isCadet()) return renderJobsCadet();
  const jobs = G.mode === 'commander' ? ['fix', 'explore', 'farm', 'rest'] : ['fix', 'explore', 'rest'];
  $('#jobs').innerHTML = D.CREW.map((c) => {
    const st = G.crew.find((x) => x.id === c.id);
    const tired = st.energy <= 20;
    return `<div class="jobcard">
      <div class="who">${miniAstro(c, 'job')}<div>${c.name}<div class="tiny">${c.role}</div></div></div>
      <div class="energy" title="Energy"><i style="width:${st.energy}%;background:${st.energy <= 20 ? 'var(--red)' : st.energy <= 50 ? 'var(--amber)' : 'var(--green)'}"></i></div>
      <div class="tiny">${tired ? 'Too tired! 😴 Must rest' : `Energy ${st.energy}% · ☢️ ${st.dose} mSv`}</div>
      <div class="jbtns" role="radiogroup" aria-label="Job for ${c.name}">${jobs.map((j) => `<button data-crew="${c.id}" data-job="${j}" aria-pressed="${plan.jobs[c.id] === j}" title="${D.JOBS[j].name}: ${D.JOBS[j].tip}" ${tired && j !== 'rest' ? 'disabled' : ''}>${D.JOBS[j].icon}</button>`).join('')}</div>
      <div class="tiny">${D.JOBS[plan.jobs[c.id]].name}</div></div>`;
  }).join('');
  $$('#jobs [data-job]').forEach((b) => (b.onclick = () => {
    if (busy) return;
    plan.jobs[b.dataset.crew] = b.dataset.job; Fx.sfx.click();
    Art.previewJob(b.dataset.crew, b.dataset.job, D.CREW.findIndex((c) => c.id === b.dataset.crew));
    if (b.dataset.job === 'explore' && (briefing(G).hint || briefing(G).warning?.storm)) say('Careful! Exploring OUTSIDE during a particle storm means no shield protection. 😬', 'worried', 'warn');
    else say(`${D.CREW.find((c) => c.id === b.dataset.crew).name}: ${D.JOBS[b.dataset.job].tip}.`, 'talk', '', { voice: false });
    renderJobs(); renderRisk();
  }));
}

function bar(frac, color) { return `<i style="width:${Math.max(2, Math.min(100, frac * 100))}%;background:${color}"></i>`; }
function renderMeters(bounce = false) {
  const ad = airDays(G), maxAirDays = G.o2Max / O2_USE, md = maxDose(G);
  const doseColor = md < D.RAD_GREEN ? 'var(--green)' : md < 130 ? 'var(--amber)' : 'var(--red)';
  const fd = foodDays(G);
  const sent = G.scienceSent, goal = scienceGoal(G.mode);
  const pill = (icon, val, frac, color, title, cls = '') => `<div class="hudpill ${cls}" title="${esc(title)}" tabindex="0">
      <span class="hi">${icon}</span><span class="hv">${val}</span><span class="hb"><i style="width:${Math.max(3, Math.min(100, frac * 100))}%;background:${color}"></i></span></div>`;
  $('#meters').innerHTML = [
    pill('⚡', `${G.battery}/${G.batteryMax}`, G.battery / G.batteryMax, 'var(--yellow)', `Battery: ${G.battery} of ${G.batteryMax} power blocks saved`),
    pill('💨', isCadet() ? `${Math.floor(ad)}d` : `${ad.toFixed(1)}d`, ad / maxAirDays, ad < 2 ? 'var(--red)' : 'var(--teal)', `Air: ${ad.toFixed(1)} days left (${G.o2.toFixed(1)} kg of oxygen)`, ad < 1 ? 'crit low' : ad < 2 ? 'low' : ''),
    pill(md < D.RAD_GREEN ? '😊' : md < 130 ? '😐' : '😟', isCadet() ? '☢️' : `☢️${Math.round(md)}`, md / D.RAD_BUDGET, doseColor, `Radiation: highest crew dose ${md.toFixed(1)} of ${D.RAD_BUDGET} mSv. Stay under ${D.RAD_GREEN} for a star.`, md >= 130 ? 'crit' : ''),
    G.mode === 'commander' ? pill('🥕', `${fd.toFixed(1)}d`, fd / 12, fd < 2 ? 'var(--red)' : 'var(--coral)', `Food: ${fd.toFixed(1)} days left. Greenhouse ${G.grow >= GROW_DAYS ? 'harvesting' : `growing ${G.grow}/${GROW_DAYS}`}`, fd < 2 ? 'low crit' : '') : '',
    pill('⭐', `${sent}/${goal}`, sent / goal, 'var(--yellow)', `Science sent to Earth: ${sent} of ${goal}${G.scienceBase ? ` (${G.scienceBase} waiting for the radio)` : ''}`),
  ].join('');
  $$('#meters .hudpill').forEach((el) => (el.onclick = () => say(el.title, 'talk')));
  if (bounce && window.gsap) gsap.from('#meters .hudpill', { scale: 1.25, duration: 0.4, stagger: 0.05, ease: 'back.out(3)' });
}

function lockBoard(lock) {
  busy = lock;
  $('#btnNext').disabled = lock;
  $('.board').style.pointerEvents = lock ? 'none' : '';
  $('.board').style.opacity = lock ? 0.75 : 1;
}

// ---------------------------------------------------------------- one day plays out
let skipFns = [];
const tlDone = (tl) => new Promise((r) => { if (!tl) return r(); tl.eventCallback('onComplete', r); skipFns.push(() => { tl.progress(1); r(); }); });
const waitSkippable = (ms) => new Promise((r) => { const t = setTimeout(r, profile.calm ? ms / 3 : ms); skipFns.push(() => { clearTimeout(t); r(); }); });
$('#btnSkip').onclick = () => { skipping = true; skipFns.forEach((f) => f()); skipFns = []; };

$('#btnNext').onclick = nextDay;
async function nextDay() {
  if (busy) return;
  if (plan.air < AIR_NEED && airWarnDay !== G.day) {
    airWarnDay = G.day; Fx.sfx.nope();
    say(isCadet() ? `Wait! 💨 Air needs ${AIR_NEED} blocks! Press <b>Next Day</b> again if you are sure.` : `Wait! Air only has ${plan.air} of ${AIR_NEED} blocks, so the air tanks will go down. Press <b>Next Day</b> again if you are sure.`, 'worried', 'warn');
    return;
  }
  lockBoard(true); skipping = false; skipFns = [];
  $('#alert').classList.add('hidden');
  if (tutorialStep) tutorialStep = 0;
  Fx.sfx.click();
  const before = G;
  const effJobs = {};
  for (const c of before.crew) effJobs[c.id] = c.energy <= 20 || plan.jobs[c.id] === 'inside' ? 'rest' : plan.jobs[c.id];
  const effPlan = { ...plan, jobs: effJobs };
  const x = profile.brain ? Brain.features(before, effPlan) : null;
  const r = step(before, plan);
  if (profile.brain && x) {
    profile.brain.w = Brain.sgd(profile.brain.w, x, Brain.badDay(before, r.state), 0.05).map((v) => +v.toFixed(4));
    profile.brain.learnedDays = (profile.brain.learnedDays || 0) + 1;
  }
  profile.skills = Brain.updateSkills(profile.skills || {}, before, effPlan);
  saveProfile();
  G = r.state; G.jobs = { ...plan.jobs }; G.uiPlan = { ...plan, jobs: { ...plan.jobs } };
  store.set('oz-save', G);
  $('#btnSkip').classList.remove('hidden');

  await tlDone(Art.moveCrew(effJobs, D.CREW.map((c) => c.id)));
  Art.setShield(plan.shield);
  if (plan.radio >= 1) { Fx.sfx.beam(); await tlDone(Art.radioBeam(before.world, W().radioDelay)); }
  if (r.anim.dust) { Fx.dust(); await waitSkippable(1600); }
  if (r.anim.storm) {
    Fx.playMusic('storm');
    const s = r.anim.storm;
    say(`☀️ ${s.size === 'big' ? 'BIG ' : ''}particle storm! ${s.safe ? 'Shield up — hold on!' : 'Oh no — not enough protection!'}`, 'worried', 'danger');
    Art.sunPulse(s.size === 'big'); Fx.sfx.crackle(s.shield >= 2 ? 10 : 35);
    Fx.storm({ size: s.size, shield: s.shield }); Art.setShield(s.shield, true);
    if (!s.safe) Art.worryCrew();
    await waitSkippable(3400);
    Art.sunCalm(); Fx.playMusic('base');
    if (s.safe) { Art.cheerCrew(); Fx.sfx.cheer(); Fx.sfx.yay(); }
  }
  if (r.anim.harvest) { Art.harvest(); Fx.sparkle(905, 420); Fx.sfx.good(); }
  else if ((plan.green || 0) === 0 && before.grow > 0) Art.wiltPlants();
  if (r.anim.fixed.length) { Fx.sparkle(330, 400); Fx.sfx.good(); }
  Art.setGreenhouse(G.grow, (plan.green || 0) > 0, GROW_DAYS);
  Art.setBattery(G.battery / G.batteryMax);
  renderMeters(true);
  $('#btnSkip').classList.add('hidden'); skipFns = [];

  for (const b of r.newBadges) await celebrateBadge(b);
  profile.cards = [...new Set([...profile.cards, ...r.newCards])]; saveProfile();
  await storyDialog(before, r);
  if (G.pendingRocket) await rocketDialog();
  store.set('oz-save', G);
  if (G.over) return finish();
  // move crew back toward the door for the morning
  Art.moveCrew(Object.fromEntries(D.CREW.map((c) => [c.id, 'door'])), D.CREW.map((c) => c.id));
  startDay();
}

// Short sticker label for each story event (picture-first day report)
function sticker(it) {
  const n = (it.text.match(/(\d+(?:\.\d+)?)/) || [])[1];
  const t = it.text;
  switch (it.icon) {
    case '🔋': return { icon: '🔋', label: 'Battery full!' };
    case '💨': return it.tone === 'good' ? { icon: '💨', label: 'Air OK!' } : { icon: '💨', label: 'Air went down' };
    case '☀️': return it.tone === 'good' ? { icon: '🛡️', label: 'Storm blocked!' } : { icon: '☀️', label: 'Storm hit us!' };
    case '🛡️': return { icon: '🛡️', label: 'Shield on' };
    case '🔭': return /found/.test(t) ? { icon: '🔭', label: `Found +${n} ⭐` } : null;
    case '📡': return /sent/.test(t) ? { icon: '📡', label: `Sent ${n} ⭐ home` } : { icon: '📡', label: 'Radio off' };
    case '🥬': return { icon: '🥬', label: 'Harvest!' };
    case '🌱': return { icon: '🌱', label: 'Plants growing' };
    case '🥀': return { icon: '🥀', label: 'Plants wilted' };
    case '🔧': return { icon: '🔧', label: 'Fixed it!' };
    case '🌤️': return { icon: '🌤️', label: 'Dust is gone' };
    case '🌪️': return { icon: '🌪️', label: 'Dust storm coming' };
    case '🟫': return { icon: '🟫', label: 'Dusty panels' };
    case '⚙️': return { icon: '⚙️', label: 'Pump broke!' };
    case '☄️': return { icon: '☄️', label: 'Air leak!' };
    case '🐛': return { icon: '🐛', label: 'Sick plants' };
    case '🌙': return { icon: '🌙', label: 'Night tomorrow!' };
    default: return { icon: it.icon, label: t.split(/[.!]/)[0].split(' ').slice(0, 3).join(' ') };
  }
}

function storyDialog(before, r) {
  return new Promise((resolve) => {
    const sky = before.sky.schedule[before.day - 1];
    const praise = r.anim.praise > 0 ? pick(D.PRAISE) : null;
    const last = !!G.over;
    // meter tiles: before → after
    const tiles = [
      { icon: '💨', name: 'Air', a: airDays(before), b: airDays(G), unit: 'days', good: 1, max: G.o2Max / O2_USE, dec: isCadet() ? 0 : 1, color: 'var(--teal)' },
      { icon: '⚡', name: 'Battery', a: before.battery, b: G.battery, unit: 'blocks', good: 1, max: G.batteryMax, dec: 0, color: 'var(--yellow)' },
      { icon: '☢️', name: 'Radiation', a: maxDose(before), b: maxDose(G), unit: isCadet() ? '' : 'mSv', good: -1, max: D.RAD_BUDGET, dec: isCadet() ? 0 : 1, color: maxDose(G) < D.RAD_GREEN ? 'var(--green)' : maxDose(G) < 130 ? 'var(--amber)' : 'var(--red)', face: maxDose(G) < D.RAD_GREEN ? '😊' : maxDose(G) < 130 ? '😐' : '😟' },
      { icon: '⭐', name: 'Science', a: before.scienceSent, b: G.scienceSent, unit: `/ ${scienceGoal(G.mode)}`, good: 1, max: scienceGoal(G.mode), dec: 0, color: 'var(--yellow)' },
      ...(G.mode === 'commander' ? [{ icon: '🥕', name: 'Food', a: foodDays(before), b: foodDays(G), unit: 'days', good: 1, max: 12, dec: 1, color: 'var(--coral)' }] : []),
    ];
    const tileHTML = tiles.map((t, i) => {
      const d = t.b - t.a, up = d > 0.05, down = d < -0.05;
      const better = (up && t.good > 0) || (down && t.good < 0), worse = (down && t.good > 0) || (up && t.good < 0);
      return `<div class="itile ${better ? 'better' : worse ? 'worse' : ''}">
        <div class="ibig">${t.face || t.icon}</div>
        <div class="iname">${t.name}</div>
        <div class="inum"><span class="count" data-i="${i}">${t.a.toFixed(t.dec)}</span> <small>${t.unit}</small></div>
        <div class="ibar"><i data-from="${Math.min(100, (t.a / t.max) * 100)}" data-to="${Math.min(100, (t.b / t.max) * 100)}" style="width:${Math.min(100, (t.a / t.max) * 100)}%;background:${t.color}"></i></div>
        <div class="iarrow">${up ? (better ? '▲' : '▲') : down ? '▼' : '='} ${Math.abs(d) >= 0.05 ? (d > 0 ? '+' : '−') + Math.abs(d).toFixed(t.dec) : ''}</div></div>`;
    }).join('');
    // event stickers
    const stickers = r.story.map(sticker).filter(Boolean);
    const seen = new Set();
    const uniq = stickers.filter((x) => (seen.has(x.label) ? false : seen.add(x.label)));
    const stickerHTML = uniq.slice(0, isCadet() ? 4 : 6).map((x, i) => {
      const it = r.story.find((s) => sticker(s) && sticker(s).label === x.label);
      return `<div class="sticker ${it ? it.tone : ''}" style="--r:${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg"><span>${x.icon}</span>${esc(x.label)}</div>`;
    }).join('');
    // the "why" chain for the main cause (storm or air)
    const main = r.story.find((x) => x.chain);
    const chainHTML = main ? `<div class="whychain">${main.chain.filter((c) => c !== '→' && c !== '+').map((c, i, arr) => `<div class="wnode">${esc(c)}</div>${i < arr.length - 1 ? '<div class="warrow">➜</div>' : ''}`).join('')}</div>` : '';
    const cards = r.newCards.map((id) => { const c = D.CARDS[id]; return c ? `<button class="cardchip" data-card="${id}">${c.icon} ${esc(c.title)}</button>` : ''; }).join('');
    const more = r.story.map((it) => `<li class="${it.tone}"><span class="ic">${it.icon}</span><div>${esc(it.text)}</div></li>`).join('');
    $('#dlgBody').innerHTML = `
      <h2 class="center">${dayWord()} ${before.day} ${sky.date && before.sky.kind !== 'practice' && !isCadet() ? `<span class="small">· real date ${sky.date}</span>` : ''}</h2>
      ${praise ? `<div class="praise">${esc(praise)}</div>` : ''}
      <div class="itiles">${tileHTML}</div>
      ${stickerHTML ? `<div class="stickers">${stickerHTML}</div>` : ''}
      ${chainHTML ? `<h3 class="center" style="margin:8px 0 2px">Why? 🤔</h3>${chainHTML}` : ''}
      ${cards ? `<div class="cardchips">📓 New card${r.newCards.length > 1 ? 's' : ''}: ${cards}</div>` : ''}
      <details class="readmore"><summary>📖 Read more</summary><ul class="story">${more || '<li class="info">A calm day.</li>'}</ul></details>
      <p class="center" style="margin-top:12px"><button class="btn green" id="dlgOk">${last ? 'See my prize 🏆' : `Start ${dayWord()} ${G.day} ▶`}</button></p>`;
    const dlg = $('#dlg');
    dlg.showModal();
    // animate: tiles pop, numbers count, bars slide, stickers slap on, chain lights up
    if (window.gsap) {
      gsap.from('#dlgBody .itile', { y: 30, scale: 0.6, opacity: 0, stagger: 0.1, duration: 0.45, ease: 'back.out(2.5)' });
      $$('#dlgBody .count').forEach((el) => {
        const t = tiles[+el.dataset.i], o = { v: t.a };
        gsap.to(o, { v: t.b, duration: 1.1, delay: 0.4, ease: 'power2.out', onUpdate: () => { el.textContent = o.v.toFixed(t.dec); } });
      });
      $$('#dlgBody .ibar i').forEach((el) => gsap.to(el, { width: `${el.dataset.to}%`, duration: 1.1, delay: 0.4, ease: 'power2.out' }));
      gsap.from('#dlgBody .iarrow', { scale: 0, opacity: 0, delay: 1.3, stagger: 0.08, duration: 0.4, ease: 'back.out(3)' });
      gsap.from('#dlgBody .sticker', { scale: 2.2, opacity: 0, rotation: 25, delay: 0.9, stagger: 0.18, duration: 0.4, ease: 'back.out(2)', onStart: () => Fx.sfx.place() });
      gsap.from('#dlgBody .wnode, #dlgBody .warrow', { x: -20, opacity: 0, delay: 1.6, stagger: 0.25, duration: 0.35 });
      gsap.to('#dlgBody .warrow', { x: 6, duration: 0.5, yoyo: true, repeat: -1, delay: 2.6 });
      gsap.from('#dlgBody .cardchip', { y: 20, opacity: 0, delay: 2, stagger: 0.1 });
    }
    $$('#dlgBody [data-card]').forEach((b) => (b.onclick = () => { const c = D.CARDS[b.dataset.card]; say(`${c.title}: ${c.text}`, 'wow'); }));
    // read the stickers one at a time, with a full stop between them so PIXEL pauses instead of rushing
    // each sticker ("Battery full", "Air OK", "Storm hit us"…) is read aloud only the FIRST time it shows up in a mission
    const labels = uniq.slice(0, 3).map((x) => x.label.replace(/[!.\s]+$/, ''));
    const fresh = labels.filter((l) => !spokenStickers.has(l.replace(/[+\d]+/g, '').trim()));
    fresh.forEach((l) => spokenStickers.add(l.replace(/[+\d]+/g, '').trim()));
    const top = labels.join('. '), news = fresh.join('. ');
    const bad = r.story.find((x) => x.tone === 'bad');
    if (praise) { say(news ? `${praise} ${news}.` : praise, 'happy', 'yay'); Fx.sfx.cheer(); Fx.sfx.yay(); Art.cheerCrew(); }
    else if (news) say(`${news}.`, bad ? 'worried' : 'happy');
    else say(top ? `${top}.` : 'A calm day!', bad ? 'worried' : 'happy', '', { voice: false });   // shown in the bubble, not spoken again
    $('#dlgOk').onclick = () => { Fx.sfx.click(); dlg.close(); resolve(); };
    dlg.oncancel = (e) => { e.preventDefault(); };
  });
}

function rocketDialog() {
  return new Promise((resolve) => {
    const night = G.world === 'moon' && !G.upgrades.includes('reactor') && G.day < nightStartOf(G);
    $('#dlgBody').innerHTML = `
      <h2>🚀 A supply rocket landed!</h2>
      <p style="font-size:18px">Earth sent a gift. You can pick <b>ONE</b>. Which one helps your outpost most?</p>
      ${night ? '<p class="bubble warn" style="margin:0 0 12px 14px">PIXEL: The long lunar night is coming. Solar panels won\'t work in the dark… 🤔</p>' : ''}
      <div class="rocketgrid">${G.pendingRocket.map((id) => { const u = D.UPGRADES[id]; return `<button class="choice" data-up="${id}"><span class="big">${u.icon}</span><h3 style="font-size:20px">${u.name}</h3><p>${u.text}</p></button>`; }).join('')}</div>`;
    const dlg = $('#dlg'); dlg.showModal();
    if (profile.sound) { Fx.sfx.rocket(); setTimeout(() => Fx.sfx.yay(), 400); }
    say(night ? 'Woohoo! A supply rocket landed! Earth sent you a gift. Pick one! The long lunar night is coming. Solar panels will not work in the dark. Which gift helps?'
      : 'Woohoo! A supply rocket landed! Earth sent you a gift. Pick one! Think about what is coming next.', 'star');
    if (window.gsap) gsap.from('#dlgBody .choice', { y: 40, opacity: 0, stagger: 0.15, duration: 0.6, ease: 'back.out(2)', clearProps: 'transform,opacity' });
    $$('#dlgBody [data-up]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.up;
      G = applyUpgrade(G, id);
      profile.cards = [...new Set([...profile.cards, ...G.cards])]; saveProfile();
      dlg.close();
      Fx.sfx.rocket(); Art.setUpgrades(G.upgrades); Art.popUpgrade(id); Fx.sparkle(600, 300, 24);
      // let PIXEL finish the cheer before the next day starts talking (at most 7 s)
      const talking = say(`${D.UPGRADES[id].name}! ${pick(D.PRAISE)}`, 'star', 'yay');
      const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
      Promise.race([Promise.all([talking.then(() => wait(500)), wait(profile.calm ? 300 : 1500)]), wait(7000)]).then(resolve);
    }));
    dlg.oncancel = (e) => e.preventDefault();
  });
}

function celebrateBadge(id) {
  const b = D.BADGES[id]; if (!b) return Promise.resolve();
  if (!profile.badges.includes(id)) { profile.badges.push(id); saveProfile(); }
  const pop = $('#badgePop');
  pop.innerHTML = `<div class="badgecoin" role="button" tabindex="0" aria-label="New badge: ${esc(b.name)}. Tap to continue"><div><div class="ic">${b.icon}</div><b>${esc(b.name)}</b><small>${esc(b.text)}</small></div></div>
    <p class="badgetap">✨ Tap the badge to keep going ✨</p>`;
  pop.classList.remove('hidden');
  Fx.sfx.badge(); Fx.confetti(3500);
  if (profile.sound) setTimeout(() => Fx.sfx.woohoo(), 350);   // the crowd cheers "woo-hoo! yaaay!"
  // PIXEL talks after the cheer, so the two don't talk over each other
  const talking = new Promise((ok) => setTimeout(ok, profile.sound && !profile.calm ? 1900 : 300))
    .then(() => say(`New badge: ${b.name}! ${pick(D.PRAISE)}`, 'star', 'yay'));
  const coin = $('.badgecoin', pop);
  if (window.gsap) {
    // slow, friendly entrance, then a gentle float while PIXEL talks
    gsap.fromTo(coin, { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: profile.calm ? 0.6 : 1.4, ease: 'elastic.out(1, 0.6)' });
    gsap.to(coin, { y: -10, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.4 });
  }
  const minShow = profile.calm ? 2500 : 4500;               // long enough for a 7-year-old to read it
  return new Promise((r) => {
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      coin.onclick = coin.onkeydown = null;
      if (window.gsap) { gsap.killTweensOf(coin); gsap.to(coin, { scale: 0, opacity: 0, duration: 0.5, ease: 'back.in(1.6)', onComplete: () => { pop.classList.add('hidden'); r(); } }); }
      else { pop.classList.add('hidden'); r(); }
    };
    // stay until PIXEL finishes speaking (plus a breath), at least minShow, at most 12 s — or until the kid taps
    const shown = new Promise((ok) => setTimeout(ok, minShow));
    Promise.all([shown, talking.then(() => new Promise((ok) => setTimeout(ok, 1200)))]).then(close);
    setTimeout(close, 12000);
    setTimeout(() => { coin.onclick = close; coin.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') close(); }; }, 1200);
  });
}

// ---------------------------------------------------------------- end of mission: prizes!
function trophySVG(medal) {
  const ink = '#23263a';
  if (medal === 'gold') return `<svg viewBox="0 0 300 320"><g id="trophy">
    <circle cx="150" cy="130" r="120" fill="#fff3a6" opacity=".55" class="shine"/>
    <path d="M70 60 H230 V110 Q230 190 150 200 Q70 190 70 110Z" fill="#ffcf2e" stroke="${ink}" stroke-width="8"/>
    <path d="M70 80 Q20 80 30 120 Q40 160 90 160" fill="none" stroke="${ink}" stroke-width="10"/><path d="M230 80 Q280 80 270 120 Q260 160 210 160" fill="none" stroke="${ink}" stroke-width="10"/>
    <rect x="132" y="198" width="36" height="44" fill="#ffcf2e" stroke="${ink}" stroke-width="8"/>
    <rect x="92" y="240" width="116" height="40" rx="10" fill="#b8860b" stroke="${ink}" stroke-width="8"/>
    <path d="M150 88 l14 28 31 4 -23 21 6 31 -28 -15 -28 15 6 -31 -23 -21 31 -4z" fill="#fff" stroke="${ink}" stroke-width="5"/>
    <path d="M90 72 Q95 130 120 170" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".6"/>
    <text x="150" y="268" text-anchor="middle" font-size="20" font-weight="700" fill="#fff" font-family="Fredoka">COMMANDER</text></g></svg>`;
  const col = { silver: ['#e9edf6', '#aeb6c8'], bronze: ['#ffbe8a', '#c8743a'], ribbon: ['#c9b6ff', '#8e6cf0'] }[medal];
  return `<svg viewBox="0 0 300 320"><g id="trophy">
    <circle cx="150" cy="190" r="125" fill="#fff" opacity=".3" class="shine"/>
    <path d="M100 0 L140 120 L160 120 L200 0 Z" fill="#ff5c7a" stroke="${ink}" stroke-width="7"/><path d="M130 0 L150 90 L170 0" fill="#46d9ff" stroke="${ink}" stroke-width="5"/>
    <circle cx="150" cy="200" r="${medal === 'ribbon' ? 70 : 88}" fill="${col[0]}" stroke="${ink}" stroke-width="9"/>
    <circle cx="150" cy="200" r="${medal === 'ribbon' ? 50 : 66}" fill="${col[1]}" stroke="${ink}" stroke-width="5"/>
    ${medal === 'ribbon' ? '<text x="150" y="216" text-anchor="middle" font-size="50">🚀</text><path d="M110 260 L95 315 L125 295 L140 320 L150 265Z M190 260 L205 315 L175 295 L160 320 L150 265Z" fill="#a77bff" stroke="#23263a" stroke-width="5"/>'
      : `<path d="M150 158 l13 26 29 4 -21 20 5 29 -26 -14 -26 14 5 -29 -21 -20 29 -4z" fill="#fff" stroke="${ink}" stroke-width="5"/>`}
    <path d="M100 170 Q110 140 140 130" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" opacity=".7"/></g></svg>`;
}

function finish() {
  Fx.stopMusic();
  store.del('oz-save');
  const st = stars(G);
  const trophy = D.TROPHIES[st.total];
  profile.missions = (profile.missions || 0) + 1;
  const key = `${G.world}-${G.mode}`;
  profile.best[key] = Math.max(profile.best[key] || 0, st.total);
  profile.cards = [...new Set([...profile.cards, ...G.cards])];
  saveProfile();
  show('report');
  $('#repWords').textContent = G.over === 'complete' ? pick(['You are amazing!', 'You are a star! ⭐', 'Mission accomplished, superstar!', 'WOW! What a commander!']) : 'Great try, space hero! 💖';
  $('#trophyArt').innerHTML = trophySVG(trophy.medal);
  $('#trophyName').textContent = trophy.name;
  $('#starsRow').innerHTML = [st.home, st.green, st.science].map((on) => `<span class="${on ? '' : 'off'}">⭐</span>`).join('');
  $('#starsWhy').innerHTML = `${st.home ? '⭐' : '☆'} Crew finished the mission · ${st.green ? '⭐' : '☆'} Radiation in the green (under ${D.RAD_GREEN} mSv) · ${st.science ? '⭐' : '☆'} Sent ${scienceGoal(G.mode)} science stars home`;
  const reasons = {
    complete: ['Mission complete! 🎉', `All ${G.maxDays} ${G.world === 'mars' ? 'sols' : 'days'} on ${W().name}. ${trophy.words}`],
    air: ['The air ran low — the crew flew home safely 🚀', `${pick(D.COMFORT)} Tip: give Air all 3 blocks every day${G.world === 'moon' ? ', and choose the reactor before the long night' : ''}.`],
    radiation: ['Too much radiation — the crew flew home safely 🚀', `${pick(D.COMFORT)} Tip: when PIXEL sees a big flash on the Sun, power the shield (2–4 blocks) and keep everyone inside.`],
    food: ['The food ran out — the crew flew home safely 🚀', `${pick(D.COMFORT)} Tip: keep the greenhouse lights on every day so the plants don't wilt.`],
  };
  const [title, text] = reasons[G.over];
  $('#repTitle').textContent = title;
  $('#repText').textContent = text;
  const all = Object.values(D.BADGES);
  $('#repBadges').innerHTML = G.badges.length
    ? G.badges.map((id) => { const b = D.BADGES[id]; return `<div class="badge"><div class="coin">${b.icon}</div>${esc(b.name)}</div>`; }).join('') + `<div class="badge small" style="align-self:center">Collection: ${profile.badges.length}/${all.length}</div>`
    : '<p>No badges this time — they are waiting for you next mission! 💪</p>';
  const sk = profile.skills || {};
  $('#repBrain').innerHTML = `<div class="skills">${Object.entries(Brain.SKILLS).map(([k, v]) => {
      const m = sk[k] ?? 0.5, st = m >= 0.8 ? 3 : m >= 0.55 ? 2 : 1;
      return `<div class="skill"><span class="sic">${v.icon}</span><b>${v.name}</b><span class="sst">${'⭐'.repeat(st)}${'☆'.repeat(3 - st)}</span><div class="bar"><i style="width:${m * 100}%;background:var(--purple)"></i></div></div>`;
    }).join('')}</div>
    <p class="small">PIXEL's brain is a small machine-learning model on this device. It practiced ${profile.brain?.practice || 300} robot missions, then learned from ${profile.brain?.learnedDays || 0} of your days. ${(() => { const w = Brain.weakest(sk); return w && w[1] < 0.55 ? `Next time, practice: ${Brain.SKILLS[w[0]].icon} ${Brain.SKILLS[w[0]].name}!` : 'You are great at everything! 🌟'; })()}</p>`;
  $('#repStorms').innerHTML = G.stormsFaced.length ? G.stormsFaced.map((s) => `<li>${dayWord()} ${s.day}${s.date && s.kind !== 'practice' ? ` (${s.date})` : ''}: ${s.size === 'big' ? 'BIG ' : ''}particle storm · shield ${s.shield} ${s.safe ? '✅ safe' : '⚠️ crew got a big dose'}
    ${s.kind !== 'practice' && !s.estimated && s.date ? ` · <a href="${sepRecordUrl(s.date)}" target="_blank" rel="noopener">NASA DONKI record ↗</a>` : s.estimated ? ' · (estimated from a real flare)' : ' · (practice)'}</li>`).join('') : '<li>No particle storms this time. The Sun was calm!</li>';

  // celebration
  if (window.gsap) {
    gsap.from('#trophy', { scale: 0, rotation: -25, transformOrigin: '50% 60%', duration: 1, ease: 'elastic.out(1, .5)' });
    gsap.to('#trophy', { y: -10, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1 });
    gsap.to('#trophy .shine', { scale: 1.12, opacity: 0.9, transformOrigin: '50% 50%', duration: 0.9, yoyo: true, repeat: -1 });
    gsap.from('#starsRow span', { scale: 0, rotation: 180, stagger: 0.35, delay: 0.6, duration: 0.6, ease: 'back.out(3)' });
    gsap.from('#repBadges .badge', { y: 30, opacity: 0, stagger: 0.12, delay: 1.2 });
    gsap.from('#repWords', { scale: 0.3, opacity: 0, duration: 0.8, ease: 'back.out(2.5)' });
  }
  Art.danceParty($('#danceFloor'), D.CREW, G.over === 'complete' ? 'dance' : 'wave');
  pageConfetti(G.over === 'complete' ? 5000 : 2200);
  if (G.over === 'complete') { Fx.sfx.fanfare(); setTimeout(() => Fx.sfx.woohoo(), 900); setTimeout(() => Fx.playMusic('win', true), 1800); }
  else Fx.sfx.good();
  [0, 1, 2].forEach((i) => setTimeout(() => { if ([st.home, st.green, st.science][i]) Fx.sfx.badge(); }, 700 + i * 350));
  $('#skyBadge').classList.remove('hidden');
  speak(`${$('#repWords').textContent} ${title}. You won the ${trophy.name}! ${trophy.words}`, G.over === 'complete' ? 'star' : 'happy');
}

let pageCanvas = null;
function pageConfetti(ms) {
  if (!pageCanvas) {
    pageCanvas = document.createElement('canvas');
    Object.assign(pageCanvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 70 });
    document.body.append(pageCanvas);
  }
  Fx.initFx(pageCanvas); Fx.confetti(ms);
  setTimeout(() => { fxReady = false; }, 50); // the stage canvas re-inits next mission
}

function chartSVG(h) {
  if (!h.length) return '';
  const Wd = 600, H = 170, pad = 30, n = h.length;
  const x = (i) => pad + (i / Math.max(1, n - 1)) * (Wd - pad * 2);
  const yAir = (v) => H - pad - (Math.min(v, 7) / 7) * (H - pad * 2);
  const yDose = (v) => H - pad - (Math.min(v, 150) / 150) * (H - pad * 2);
  const line = (f, key) => h.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${f(p[key]).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Air days and radiation dose over the mission">
    <line x1="${pad}" y1="${yDose(100)}" x2="${Wd - pad}" y2="${yDose(100)}" stroke="#3ccf6e" stroke-dasharray="6 6"/>
    <text x="${Wd - pad}" y="${yDose(100) - 4}" text-anchor="end" font-size="11" fill="#148a46">green line 100 mSv</text>
    <path d="${line(yAir, 'air')}" fill="none" stroke="#1fa6d6" stroke-width="4" stroke-linejoin="round"/>
    <path d="${line(yDose, 'dose')}" fill="none" stroke="#ff7a59" stroke-width="4" stroke-linejoin="round"/>
    <text x="${pad}" y="16" font-size="13" font-weight="700" fill="#1fa6d6">💨 Air (days left)</text>
    <text x="${pad + 150}" y="16" font-size="13" font-weight="700" fill="#ff7a59">☢️ Radiation (mSv)</text>
    <text x="${pad}" y="${H - 8}" font-size="11">${dayWord()} 1</text><text x="${Wd - pad}" y="${H - 8}" font-size="11" text-anchor="end">${dayWord()} ${n}</text></svg>`;
}

$('#btnAgain').onclick = () => { Fx.sfx.click(); setup.world = G.world; setup.mode = G.mode; renderSetup(); show('world'); Fx.playMusic('base', true); };
$('#btnOther').onclick = () => { Fx.sfx.click(); setup.world = G.world === 'moon' ? 'mars' : 'moon'; setup.mode = G.mode; renderSetup(); show('world'); Fx.playMusic('base', true); say(`Let's try ${D.WORLDS[setup.world].name}! It has different problems to solve.`, 'wow'); };
$('#btnHome').onclick = () => { Fx.sfx.click(); show('title'); $('#btnContinue').classList.toggle('hidden', !store.get('oz-save', null)); say(`Welcome back${profile.name ? ', ' + esc(profile.name) : ''}! Ready for another mission?`, 'happy'); };
$('#btnCert').onclick = () => {
  const st = stars(G), trophy = D.TROPHIES[st.total];
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const cert = `<div class="cert"><div style="font-size:60px">🚀🏅🌙</div><h2>Junior Astronaut Certificate</h2>
    <p>This certifies that</p><div class="who">${esc(profile.name || 'Space Commander')}</div>
    <p style="font-size:20px">commanded <b>Outpost Zero</b> on <b>${W().name}</b> for ${G.history.length} ${G.world === 'mars' ? 'sols' : 'days'}<br>and earned the <b>${trophy.name}</b> ${'⭐'.repeat(st.total)}</p>
    <p>${G.badges.map((b) => D.BADGES[b].icon + ' ' + D.BADGES[b].name).join(' · ')}</p>
    <p style="font-size:22px;font-weight:700">You are amazing. You are a star! ⭐</p>
    <p class="small">${today} · Storm data: ${esc(G.sky.label)}</p></div>`;
  $('#dlgBody').innerHTML = `${cert}<p class="center" style="margin-top:14px"><label>Name on certificate: <input id="certName" value="${esc(profile.name)}" style="font:inherit;font-size:18px;border:3px solid #23263a;border-radius:10px;padding:4px 8px"></label></p>
    <p class="center"><button class="btn" id="btnPrint">🖨️ Print it</button> <button class="btn secondary" id="btnCloseCert">Close</button></p>`;
  $('#dlg').showModal();
  Fx.sfx.fanfare();
  $('#certName').oninput = (e) => { profile.name = e.target.value.trim().slice(0, 20); saveProfile(); $('#dlgBody .cert .who').textContent = profile.name || 'Space Commander'; };
  $('#btnPrint').onclick = () => { $('#printArea').innerHTML = $('#dlgBody .cert').outerHTML; $('#dlg').close(); setTimeout(() => { try { window.print(); } catch (_) { say('Printing is blocked here. Open the game from its own web address to print!', 'worried'); } }, 100); };
  $('#btnCloseCert').onclick = () => $('#dlg').close();
};

// ---------------------------------------------------------------- notebook & about
function renderNotebook() {
  const have = new Set([...profile.cards, ...(G ? G.cards : [])]);
  const ids = Object.keys(D.CARDS);
  const got = ids.filter((i) => have.has(i)).length;
  $('#nbCount').textContent = '';
  $('#nbTop').innerHTML = `
    <div class="nbprogress"><div class="nbbar"><i style="width:${(got / ids.length) * 100}%"></i></div>
    <b>${got} of ${ids.length} stickers ⭐</b></div>
    <p class="nbhint">👆 Tap a sticker to flip it!</p>`;
  $('#nbCards').innerHTML = D.CARD_GROUPS.map((g) => {
    const list = ids.filter((id) => D.CARDS[id].cat === g.id);
    return `<div class="nbgroup"><h3 class="nbgtitle" style="background:${g.color}">${g.icon} ${g.name} <span>${list.filter((i) => have.has(i)).length}/${list.length}</span></h3>
      <div class="nbgrid">${list.map((id) => {
        const c = D.CARDS[id];
        if (!have.has(id)) return '<div class="sticker2 locked" aria-label="Locked sticker"><div class="face front"><div class="sbig">❓</div><div class="skid">Play to unlock!</div></div></div>';
        return `<button class="sticker2" data-card="${id}" aria-label="${esc(c.title)}. ${esc(c.kid)}" style="--c:${g.color}">
          <div class="face front"><div class="sicon">${c.icon}</div><div class="sbig">${esc(c.big)}</div><div class="skid">${esc(c.kid)}</div></div>
          <div class="face back"><div class="stitle">${c.icon} ${esc(c.title)}</div><div class="stext">${esc(c.text)}</div>
            <a class="ssrc" href="${c.url}" target="_blank" rel="noopener">🔎 Where we learned this ↗</a></div></button>`;
      }).join('')}</div></div>`;
  }).join('');
  $('#allBadges').innerHTML = Object.values(D.BADGES).map((b) => `<div class="badge ${profile.badges.includes(b.id) ? '' : 'off'}"><div class="coin">${profile.badges.includes(b.id) ? b.icon : '❓'}</div>${profile.badges.includes(b.id) ? esc(b.name) : '???'}</div>`).join('');
  $$('#nbCards .sticker2[data-card]').forEach((el) => (el.onclick = (e) => {
    if (e.target.closest('a')) return;
    el.classList.toggle('flipped'); Fx.sfx.place();
    const c = D.CARDS[el.dataset.card];
    if (el.classList.contains('flipped')) say(`${c.title}! ${c.text}`, 'wow'); else say(c.kid, 'happy');
  }));
  if (window.gsap) gsap.from('#nbCards .sticker2', { scale: 0.5, opacity: 0, rotation: () => (Math.random() - 0.5) * 30, stagger: 0.03, duration: 0.4, ease: 'back.out(2)' });
  say(got ? `You have ${got} space stickers! Tap one to flip it. ⭐` : 'Play a mission to win your first space sticker! 🚀', 'happy');
}

function renderAbout() {
  const a = ARCHIVE_MAY2024;
  $('#aboutBody').innerHTML = `
    <h2>🛰️ The real NASA data in this game</h2>
    <p style="font-size:18px">Outpost Zero uses real space science. Numbers marked <span class="realtag">REAL</span> come from NASA and partner measurements. Numbers marked <span class="realtag game">GAME</span> are game rules we chose to make it fun — we always tell you which is which.</p>
    ${G ? `<p><b>This mission's sky:</b> ${esc(G.sky.label)}. ${esc(G.sky.note || '')}</p>` : ''}
    <h3>Datasets we use, and why</h3>
    <table><tr><th>Dataset</th><th>How the game uses it</th><th>Real or stored?</th></tr>
      <tr><td><a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener">NASA DONKI</a> (space weather)</td><td>Solar flares and particle storms decide when storms hit your outpost. The "Real Superstorm" mission uses the ${a.seps.length} real particle-storm records from May 9–13, 2024; "Live NASA Sky" downloads the last 7 days.</td><td>Archive: stored copy (retrieved Nov 13, 2026). Live: fetched when you play, with the date shown.</td></tr>
      <tr><td><a href="https://visualization.osdr.nasa.gov/radlab/gui/data-api/" target="_blank" rel="noopener">NASA OSDR RadLab</a></td><td>"Compare with the Space Station" Notebook card about real ISS radiation readings.</td><td>Reference</td></tr>
      <tr><td><a href="https://osdr.nasa.gov/bio/repo/" target="_blank" rel="noopener">NASA OSDR</a></td><td>Why rest matters: space changes bones, muscles and sleep.</td><td>Reference</td></tr>
      <tr><td>Chang'e 4 LND (CNSA) — <a href="https://www.science.org/doi/10.1126/sciadv.aaz1334" target="_blank" rel="noopener">Science Advances 2020</a></td><td>Moon radiation: 1.37 mSv/day</td><td><span class="realtag">REAL</span></td></tr>
      <tr><td>NASA Curiosity RAD — <a href="https://swri.org/node/9079" target="_blank" rel="noopener">SwRI 2013</a></td><td>Mars radiation: 0.67 mSv/day</td><td><span class="realtag">REAL</span></td></tr>
      <tr><td><a href="https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf" target="_blank" rel="noopener">NASA radiation standard</a></td><td>600 mSv career limit (our 150 mSv mission budget is a game rule)</td><td><span class="realtag">REAL</span> + <span class="realtag game">GAME</span></td></tr>
      <tr><td>NASA Life Support Baseline Values</td><td>0.82 kg of oxygen and 1.8 kg of food per astronaut per day</td><td><span class="realtag">REAL</span></td></tr>
      <tr><td><a href="https://www.nasa.gov/?p=602427" target="_blank" rel="noopener">NASA Fission Surface Power</a></td><td>The 40 kW reactor and the 14.5-day lunar night</td><td><span class="realtag">REAL</span></td></tr>
      <tr><td><a href="https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/" target="_blank" rel="noopener">NASA MOXIE</a></td><td>Mars oxygen maker upgrade</td><td><span class="realtag">REAL</span> idea, <span class="realtag game">GAME</span> amount</td></tr>
      <tr><td><a href="https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/" target="_blank" rel="noopener">Canadian Space Agency food toolkit</a></td><td>Growing food far from home (Commander greenhouse)</td><td>Reference</td></tr>
      <tr><td>Radio delay</td><td>Moon 1.3 s; Mars 3–22 min one way → Mars warnings arrive a day late in the game</td><td><span class="realtag">REAL</span> delay, <span class="realtag game">GAME</span> turns</td></tr>
    </table>
    <h3 style="margin-top:14px">🧠 PIXEL's brain (machine learning)</h3>
    <p>PIXEL uses a small <b>logistic regression</b> model that runs only in your browser. First it practices ${profile.brain?.practice || 300} robot missions using the game's rules (${profile.brain?.samples || 'about 3,500'} days, about ${Math.round((profile.brain?.accuracy || 0.81) * 100)}% correct at guessing bad days). Then it keeps learning from your own choices, one small step per day. It looks at 7 clues — like "storm coming but shield is weak" — and the clue that adds the most risk becomes PIXEL's tip. It also tracks your skills (shield, air, radio, saving power) to choose which tip to give. Nothing is sent anywhere.</p>
    <h3 style="margin-top:14px">Game rules (not real data)</h3>
    <p>Energy blocks, the 7-day mission, the 150 mSv budget, storm sizes in the game, the 3-day harvest, upgrades and random events like broken pumps are game rules. The <b>Practice Sky</b> is made up and says so.</p>
    <h3>Credits</h3>
    <p>Made for the NASA Space Apps Challenge 2026 (Junior Astronaut Mission Trainer). Art, music and sound are made in code, written with AI assistance (see below). Animation: <a href="https://gsap.com" target="_blank" rel="noopener">GSAP</a> (free license). Font: Fredoka (SIL Open Font License). Built with help from Claude (Anthropic), an AI assistant: code, code-drawn art and code-made music are AI-assisted, and our team reviewed and tested all of it. No accounts, no ads, no tracking: progress is saved only in this browser.</p>
    <p><button class="btn secondary back">◀ Back</button></p>`;
}

// ---------------------------------------------------------------- boot
syncToggles();
initTitle();
setTimeout(ensureBrain, 400);   // PIXEL practices ~300 robot missions (about 0.2 s), once per device
$('#riskBox').onclick = () => { Fx.sfx.click(); say(`🧠 ${$('#riskBox').dataset.tip} I learned this from ${profile.brain?.practice || 300} practice missions${profile.brain?.learnedDays ? ` and ${profile.brain.learnedDays} of your days` : ''}!`, 'wow'); };
document.addEventListener('pointerdown', () => { if (profile.music) Fx.playMusic(current === 'report' ? 'win' : 'base'); }, { once: true });
window.__oz = { get G() { return G; }, setup, startGame, nextDay, show, finish, celebrateBadge }; // for testing
