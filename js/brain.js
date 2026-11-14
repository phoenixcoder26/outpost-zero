// brain.js — PIXEL's "brain": a small, explainable machine-learning model that runs in the browser.
//
// 1. A logistic-regression model predicts the chance that today's plan leads to a bad day
//    (air drops, a big radiation dose, or the mission ending early).
// 2. It is first trained on ~300 practice missions played by robot players using the real game rules (sim.js),
//    then keeps learning online from each child's own days (one gradient step per day).
// 3. Each prediction is explained: the feature that adds the most risk becomes PIXEL's tip.
// 4. A simple knowledge-tracing score per skill (shield, air, radio, night) shows what the child has mastered.
// Nothing leaves the device: the weights are saved in localStorage.

import { newGame, step, applyUpgrade, poolToday, briefing, airDays, maxDose, isNight, AIR_NEED } from './sim.js';
import { archiveSky, practiceSky } from './sky.js';
import { makeRng } from './rng.js';

export const FEATURES = [
  { id: 'bias',     tip: null },
  { id: 'shieldGap', icon: '🛡️', tip: 'The shield is too weak for the storm. Add blocks to the Shield!' },
  { id: 'airGap',    icon: '💨', tip: 'Air needs 3 blocks so everyone can breathe.' },
  { id: 'outInStorm', icon: '🔭', tip: 'Someone is exploring outside during a storm. Keep them inside!' },
  { id: 'lowAir',    icon: '💨', tip: 'The air tanks are low. Give Air all 3 blocks!' },
  { id: 'nightLow',  icon: '🌙', tip: 'Night is coming and the battery is low. Save some blocks!' },
  { id: 'darkNoPower', icon: '🔋', tip: 'It is dark and power is low. Use blocks carefully.' },
  { id: 'storm',     icon: '☀️', tip: 'A storm may be coming. Be careful today!' },
];

const sig = (z) => 1 / (1 + Math.exp(-z));

/** Turn what the player KNOWS today + their plan into numbers (features) for the model. */
export function features(s, plan) {
  const b = briefing(s);
  const storm = (b.warning && b.warning.storm) || b.hint ? 1 : 0;
  const explorers = Object.values(plan.jobs || {}).filter((j) => j === 'explore').length;
  const used = plan.air + plan.shield + plan.radio + (plan.green || 0);
  const left = Math.max(0, poolToday(s) - used);
  const batteryFrac = Math.min(1, left / s.batteryMax);
  return [
    1,
    storm * Math.max(0, 4 - plan.shield) / 4,
    Math.max(0, AIR_NEED - plan.air) / AIR_NEED,
    storm * explorers / 3,
    airDays(s) < 2 ? 1 : 0,
    b.nightSoon ? 1 - batteryFrac : 0,
    isNight(s) && !s.upgrades.includes('reactor') ? 1 - batteryFrac : 0,
    storm,
  ];
}

/** Did the day go badly? (the label the model learns to predict) */
export function badDay(before, after) {
  const doseJump = Math.max(...after.crew.map((c, i) => c.dose - before.crew[i].dose));
  return (after.o2 < before.o2 - 0.05) || doseJump > 10 || (after.over && after.over !== 'complete') ? 1 : 0;
}

export function predict(w, x) { return sig(x.reduce((a, xi, i) => a + xi * w[i], 0)); }

export function explain(w, x) {
  let best = null;
  x.forEach((xi, i) => {
    if (!FEATURES[i].tip) return;
    const c = xi * w[i];
    if (c > 0.15 && (!best || c > best.c)) best = { c, ...FEATURES[i] };
  });
  return best;
}

export function sgd(w, x, y, lr = 0.1) {
  const p = predict(w, x), g = p - y;
  return w.map((wi, i) => wi - lr * g * x[i]);
}

// A robot player that sometimes plays well and sometimes makes mistakes, so the model sees both.
function robotPlan(s, rng, skill) {
  const pool = poolToday(s);
  const b = briefing(s);
  const storm = (b.warning && b.warning.storm) || b.hint;
  let left = pool;
  const take = (want) => { const n = Math.max(0, Math.min(want, left)); left -= n; return n; };
  const good = rng() < skill;
  const air = take(good ? AIR_NEED : Math.floor(rng() * 4));
  const shield = take(good && storm ? 2 + Math.floor(rng() * 3) : Math.floor(rng() * 3));
  const radio = take(rng() < 0.7 ? 1 : 0);
  const green = s.mode === 'commander' ? take(Math.floor(rng() * 4)) : 0;
  const jobs = {};
  for (const id of ['eng', 'bot', 'sci']) jobs[id] = rng() < (good && storm ? 0.1 : 0.4) ? 'explore' : 'rest';
  return { air, shield, radio, green, jobs };
}

/** Train the starting model on practice missions. Returns { w, samples, accuracy }. */
export function trainBrain({ missions = 300, epochs = 30, seed = 7 } = {}) {
  const rng = makeRng(seed);
  const data = [];
  for (let m = 0; m < missions; m++) {
    const world = m % 2 ? 'mars' : 'moon', mode = m % 3 ? 'cadet' : 'commander';
    const sky = m % 4 === 0 ? archiveSky() : practiceSky(makeRng(seed * 1000 + m));
    let s = newGame({ world, mode, seed: seed * 7919 + m, sky });
    const skill = 0.3 + rng() * 0.7;
    while (!s.over) {
      const plan = robotPlan(s, rng, skill);
      const x = features(s, plan);
      const r = step(s, plan);
      data.push([x, badDay(s, r.state)]);
      s = r.state;
      if (s.pendingRocket) s = applyUpgrade(s, s.pendingRocket[Math.floor(rng() * s.pendingRocket.length)]);
    }
  }
  let w = FEATURES.map(() => 0);
  for (let e = 0; e < epochs; e++) {
    for (let i = data.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [data[i], data[j]] = [data[j], data[i]]; }
    const lr = 0.3 / (1 + e * 0.2);
    for (const [x, y] of data) w = sgd(w, x, y, lr);
  }
  const correct = data.filter(([x, y]) => (predict(w, x) > 0.5 ? 1 : 0) === y).length;
  return { w: w.map((v) => +v.toFixed(4)), samples: data.length, accuracy: correct / data.length };
}

// ---------- skills (simple knowledge tracing) ----------
export const SKILLS = {
  shield: { icon: '🛡️', name: 'Storm shield' },
  air: { icon: '💨', name: 'Air' },
  radio: { icon: '📡', name: 'Radio' },
  night: { icon: '🌙', name: 'Saving power' },
};
export function updateSkills(skills, s, plan) {
  const out = { ...skills };
  const nudge = (k, ok) => { out[k] = +(((out[k] ?? 0.5) + 0.3 * ((ok ? 1 : 0) - (out[k] ?? 0.5)))).toFixed(3); };
  const b = briefing(s);
  const storm = (b.warning && b.warning.storm) || b.hint;
  const explorers = Object.values(plan.jobs || {}).filter((j) => j === 'explore').length;
  if (storm) nudge('shield', plan.shield >= 2 && explorers === 0);
  nudge('air', plan.air >= AIR_NEED);
  nudge('radio', plan.radio >= 1);
  if (b.nightSoon || isNight(s)) {
    const used = plan.air + plan.shield + plan.radio + (plan.green || 0);
    nudge('night', s.upgrades.includes('reactor') || poolToday(s) - used >= 2);
  }
  return out;
}
export const weakest = (skills) => Object.entries(skills).sort((a, b) => a[1] - b[1])[0];
export { maxDose };
