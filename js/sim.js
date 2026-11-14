// sim.js — the rules of Outpost Zero. Pure functions: no DOM, no Math.random (seeded rng only),
// so the same seed + same choices always give the same mission. Tested in tests/sim.test.js.

import {
  WORLDS, UPGRADES, CREW, CREW_SIZE, O2_PER_PERSON, FOOD_PER_PERSON,
  RAD_BUDGET, RAD_GREEN, MAX_DAYS, ROCKET_DAYS,
} from './data.js';
import { makeRng } from './rng.js';

export const AIR_NEED = CREW_SIZE;                       // 1 block per astronaut
export const O2_USE = CREW_SIZE * O2_PER_PERSON;         // ≈ 2.46 kg/day
export const FOOD_USE = CREW_SIZE * FOOD_PER_PERSON;     // 5.4 kg/day
export const GROW_DAYS = 3;                              // GAME: first harvest (real lettuce: 33–56 days)
export const scienceGoal = (mode) => (mode === 'commander' ? 8 : 6);
export const CADET_DAYS = 7;                            // GAME: same 7-day mission for every level
export const nightStartOf = (s) => { const W = WORLDS[s.world]; return W.nightStart == null ? null : W.nightStart; };

export function shieldFactor(blocks) {
  if (blocks >= 4) return 0.1;
  if (blocks === 3) return 0.3;
  if (blocks === 2) return 0.5;
  if (blocks === 1) return 0.75;
  return 1;
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const has = (s, id) => s.upgrades.includes(id);
const r1 = (x) => Math.round(x * 10) / 10;

export function newGame({ world = 'moon', mode = 'cadet', seed = 1, sky }) {
  const W = WORLDS[world];
  return {
    v: 1, seed, world, mode, day: 1, maxDays: mode === 'cadet' ? CADET_DAYS : MAX_DAYS,
    battery: W.startBattery, batteryMax: W.batteryMax,
    o2: W.startO2, o2Max: W.o2Max,
    food: mode === 'commander' ? r1(FOOD_USE * 4) : null, grow: 0,
    scienceBase: 0, scienceSent: 0,
    upgrades: [],
    crew: CREW.map((c) => ({ id: c.id, energy: 100, dose: 0 })),
    jobs: { eng: 'fix', bot: mode === 'commander' ? 'farm' : 'rest', sci: 'explore' },
    sky,
    active: { pumpBroken: false, leak: false, dust: 0, dirty: false },
    lastRadio: 1,           // the launch briefing counts as a radio call
    radioDays: 0, tiredEver: false, harvested: false, fixedSomething: false,
    stormsFaced: [], dustSeen: false,
    history: [], cards: [], badges: [],
    over: null, rngState: seed >>> 0, pendingRocket: null,
  };
}

// ---------- what today looks like (used by the UI before the player decides) ----------

export function isNight(s) {
  const n = nightStartOf(s);
  return n != null && s.day >= n;
}

export function solarToday(s) {
  const W = WORLDS[s.world];
  if (isNight(s)) return 0;
  if (s.world === 'mars' && s.active.dust > 0) return W.dustSolar + (has(s, 'panels') ? 1 : 0);
  let blocks = W.solar + (has(s, 'panels') ? 3 : 0);
  if (s.active.dirty) blocks -= 2;
  return Math.max(0, blocks);
}

export const reactorToday = (s) => (has(s, 'reactor') ? 5 : 0);
export const poolToday = (s) => s.battery + solarToday(s) + reactorToday(s);
export const todaySky = (s) => s.sky.schedule[s.day - 1];
export const maxDose = (s) => Math.max(...s.crew.map((c) => c.dose));
export const airDays = (s) => Math.max(0, s.o2 / O2_USE);
export const foodDays = (s) => (s.food == null ? null : Math.max(0, s.food / FOOD_USE));

/** What PIXEL can tell the player at the start of the day. */
export function briefing(s) {
  const W = WORLDS[s.world];
  const today = todaySky(s);
  const yesterday = s.day > 1 ? s.sky.schedule[s.day - 2] : null;
  const out = { warning: null, hint: null, late: null, nightSoon: null, flaresToday: today.flares };
  const bigFlash = yesterday && yesterday.flares.some((c) => c[0] === 'X' || (c[0] === 'M' && parseFloat(c.slice(1)) >= 5));
  if (bigFlash) out.hint = `Our sun-watcher saw a big flash (${yesterday.flares.join(', ')}) yesterday. Particles might be coming!`;
  if (s.world === 'moon') {
    if (s.lastRadio >= 1) {
      out.warning = today.particles
        ? { storm: true, size: today.size, estimated: today.estimated, text: `Mission Control: a ${today.size === 'big' ? 'BIG ' : ''}particle storm hits TODAY! Power the shield!` }
        : { storm: false, text: 'Mission Control: no particle storm today. Clear skies!' };
    }
  } else if (s.lastRadio >= 1 && yesterday) {
    out.late = yesterday.particles
      ? `Earth's warning just arrived — about yesterday's storm. Radio to Mars is slow (${W.radioDelay})!`
      : `Earth's message arrived late (${W.radioDelay}): "All quiet yesterday." Mars crews must often decide alone.`;
  }
  if (nightStartOf(s) != null) {
    const d = nightStartOf(s) - s.day;
    if (d > 0 && d <= 3) out.nightSoon = d;
  }
  return out;
}

/** Live preview text for each power slot, so kids see the effect before they commit. */
export function preview(s, plan) {
  const air = plan.air >= AIR_NEED
    ? (s.active.pumpBroken ? 'Pump is broken: air still drops a bit' : 'Air stays full ✓')
    : `Air will drop ${r1((AIR_NEED - plan.air) * O2_PER_PERSON)} kg`;
  const f = shieldFactor(plan.shield) * (has(s, 'soilroof') ? 0.5 : 1);
  const shield = plan.shield >= 4 ? 'Storm shelter! Blocks 90%' : plan.shield > 0 ? `Blocks ${Math.round((1 - f) * 100)}% of radiation` : (has(s, 'soilroof') ? 'Soil roof blocks 50%' : 'No protection');
  const radio = plan.radio >= 1 ? (s.world === 'moon' ? 'Get tomorrow\'s warning + send science' : 'Send science (warnings arrive late)') : 'No warnings, science stays here';
  const green = plan.green >= 1 ? (s.grow + 1 >= GROW_DAYS ? `Harvest ~${r1(plan.green * FOOD_PER_PERSON)} kg food` : `Growing: day ${s.grow + 1} of ${GROW_DAYS}`) : (s.grow > 0 ? 'Plants will wilt!' : 'No food grows');
  return { air, shield, radio, green };
}

// ---------- one day ----------

export function step(prev, plan) {
  const s = clone(prev);
  const W = WORLDS[s.world];
  const rng = makeRng(s.rngState);
  const story = [];
  const anim = { radio: plan.radio >= 1, storm: null, night: false, dust: false, harvest: false, praise: 0, fixed: [] };
  const newCards = [];
  const card = (id) => { if (id && !s.cards.includes(id) && !newCards.includes(id)) newCards.push(id); };
  const commander = s.mode === 'commander';
  const sky = todaySky(s);
  const planGreen = commander ? plan.green || 0 : 0;

  // 1. Power
  const pool = poolToday(s);
  const used = plan.air + plan.shield + plan.radio + planGreen;
  if (used > pool) throw new Error(`Plan uses ${used} blocks but only ${pool} available`);
  const left = pool - used;
  s.battery = Math.min(s.batteryMax, left);
  if (left > s.battery) story.push({ icon: '🔋', text: `Battery full! ${left - s.battery} spare blocks were wasted.`, tone: 'info' });
  if (isNight(s)) { anim.night = true; card('night'); }
  if (s.world === 'mars' && s.active.dust > 0) { anim.dust = true; s.dustSeen = true; card('dust'); }

  // 2. Jobs (tired astronauts rest)
  const jobs = {};
  for (const c of s.crew) {
    let j = plan.jobs[c.id] || 'rest';
    if (j === 'inside') j = 'rest';           // Cadet: "Stay inside" (fixing is automatic, below)
    if (j === 'farm' && !commander) j = 'rest';
    if (c.energy <= 20 && j !== 'rest') { j = 'rest'; s.tiredEver = true; }
    jobs[c.id] = j;
  }
  // Cadet: if something is broken, the first astronaut staying inside fixes it automatically
  if (!commander && (s.active.pumpBroken || s.active.leak || s.active.dirty) && !Object.values(jobs).includes('fix')) {
    const helper = s.crew.find((c) => jobs[c.id] === 'rest' && c.energy > 20);
    if (helper) jobs[helper.id] = 'fix';
  }
  const count = (j) => Object.values(jobs).filter((x) => x === j).length;

  // 3. Air (life support)
  const eff = plan.air * (s.active.pumpBroken ? 0.5 : 1);
  let o2Change = eff * O2_PER_PERSON - O2_USE;
  if (has(s, 'moxie')) o2Change += 1.0;
  if (commander && planGreen > 0) o2Change += 0.15 * planGreen;      // plants make a little oxygen
  if (s.active.leak) o2Change -= 1.0;
  s.o2 = r1(Math.min(s.o2Max, s.o2 + o2Change));
  if (plan.air >= AIR_NEED && !s.active.pumpBroken && !s.active.leak) {
    story.push({ icon: '💨', text: 'Air machine had full power. Everyone breathed easy.', tone: 'good' });
  } else if (plan.air < AIR_NEED) {
    story.push({ icon: '💨', text: `Air got only ${plan.air} of ${AIR_NEED} blocks → air tanks dropped to ${r1(airDays(s))} days.`, tone: 'bad', chain: [`💨 ${plan.air}/${AIR_NEED}`, '→', `📉 ${r1(o2Change)} kg`] });
    card('o2');
  } else {
    story.push({ icon: '💨', text: s.active.pumpBroken ? 'The broken pump wasted air. Send someone to Fix it!' : 'A tiny leak let air escape. Fix it!', tone: 'bad' });
  }
  if (plan.air >= AIR_NEED) card('recycle');

  // 4. Radiation
  const soil = has(s, 'soilroof') ? 0.5 : 1;
  const f = shieldFactor(plan.shield) * soil;
  const stormDose = sky.particles ? W.stormDose[sky.size] * (!commander && s.world === 'moon' ? 0.7 : 1) : 0; // GAME: gentler Moon storms for Cadets
  const explorers = [];
  for (const c of s.crew) {
    let d;
    if (jobs[c.id] === 'explore') { d = W.baseDose + W.exploreDose + stormDose; explorers.push(c.id); }
    else d = (W.baseDose + stormDose) * f;
    c.dose = r1(c.dose + d);
  }
  card(s.world === 'moon' ? 'moonrad' : 'marsrad');
  if (sky.particles) {
    const label = s.sky.kind === 'practice' ? 'practice storm (made-up)' : sky.estimated ? 'storm (estimated from a real flare)' : `REAL storm on ${sky.date}`;
    const safe = plan.shield >= 2 && explorers.length === 0;
    anim.storm = { size: sky.size, shield: plan.shield, safe };
    s.stormsFaced.push({ day: s.day, date: sky.date, size: sky.size, shield: plan.shield, safe, estimated: sky.estimated, kind: s.sky.kind });
    story.push({
      icon: '☀️', tone: safe ? 'good' : 'bad',
      text: safe
        ? `A ${sky.size === 'big' ? 'BIG ' : ''}particle storm hit — but your shield (${plan.shield} blocks) protected the crew!`
        : `A ${sky.size === 'big' ? 'BIG ' : ''}particle storm hit! ${explorers.length ? 'Someone was outside exploring. ' : ''}Shield had ${plan.shield} blocks.`,
      chain: [`🛡️ ${plan.shield}`, '+', `☀️ ${sky.size}`, '→', `☢️ +${r1((W.baseDose + stormDose) * f)} mSv inside`],
      real: s.sky.kind !== 'practice' && !sky.estimated ? { date: sky.date, kind: s.sky.kind } : null,
      label,
    });
    card('sep');
    if (s.sky.kind === 'archive') card('may2024');
    if (plan.shield > 0) card('soil');
    if (safe) anim.praise++;
  } else if (plan.shield > 0) {
    story.push({ icon: '🛡️', text: `No storm today. The shield (${plan.shield} blocks) still blocked a little everyday radiation.`, tone: 'info' });
  }
  if (explorers.length && !sky.particles) story.push({ icon: '🔭', text: `Explorers got a little extra radiation outside (+${W.exploreDose} mSv each).`, tone: 'info' });

  // 5. Radio
  if (plan.radio >= 1) {
    s.radioDays++;
    if (s.scienceBase > 0) story.push({ icon: '📡', text: `Radio sent ${s.scienceBase} science stars home to Earth! (${W.radioDelay} away)`, tone: 'good' });
    s.scienceSent += s.scienceBase; s.scienceBase = 0;
    card(s.world === 'moon' ? 'delaymoon' : 'delaymars');
  } else if (s.scienceBase > 0) {
    story.push({ icon: '📡', text: `Radio was off. ${s.scienceBase} science stars are waiting at the base.`, tone: 'info' });
  }
  s.lastRadio = plan.radio;

  // 6. Food (Commander)
  if (commander) {
    if (planGreen > 0) {
      s.grow += 1 + (count('farm') > 0 && s.grow + 1 < GROW_DAYS ? 1 : 0);
      if (s.grow >= GROW_DAYS) {
        const kg = r1(planGreen * FOOD_PER_PERSON + count('farm') * FOOD_PER_PERSON);
        s.food = r1(s.food + kg);
        anim.harvest = true;
        if (!s.harvested) { s.harvested = true; anim.praise++; }
        story.push({ icon: '🥬', text: `Harvest! The greenhouse grew ${kg} kg of fresh food.`, tone: 'good' });
        card('veggie');
      } else story.push({ icon: '🌱', text: `Plants are growing: day ${Math.min(s.grow, GROW_DAYS)} of ${GROW_DAYS}.`, tone: 'info' });
    } else if (s.grow > 0) {
      s.grow = 0; story.push({ icon: '🥀', text: 'No power for the grow lights — the plants wilted. They must start again.', tone: 'bad' });
    }
    s.food = r1(s.food - FOOD_USE);
    card('csafood');
  }

  // 7. Crew jobs
  for (const c of s.crew) {
    const j = jobs[c.id];
    if (j === 'rest') c.energy = Math.min(100, c.energy + 30);
    if (j === 'fix') c.energy -= 10;
    if (j === 'farm') c.energy -= 10;
    if (j === 'explore') { c.energy -= 20; s.scienceBase += 2; }
    c.energy = Math.max(0, c.energy);
  }
  if (count('explore')) story.push({ icon: '🔭', text: `Explorers found ${count('explore') * 2} science stars!`, tone: 'good' });
  if (count('fix')) {
    const fixed = [];
    if (s.active.pumpBroken) { s.active.pumpBroken = false; fixed.push('the air pump'); }
    if (s.active.leak) { s.active.leak = false; fixed.push('the air leak'); }
    if (s.active.dirty) { s.active.dirty = false; fixed.push('the dusty solar panels'); }
    if (fixed.length) { s.fixedSomething = true; anim.fixed = fixed; anim.praise++; story.push({ icon: '🔧', text: `Fixed ${fixed.join(' and ')}!`, tone: 'good' }); }
  }
  if (plan.air >= AIR_NEED && sky.particles && plan.shield >= 2) anim.praise++;
  if (count('explore') && sky.particles) card('body');

  // 8. Events for tomorrow (seeded)
  if (s.active.dust > 0) {
    s.active.dust -= 1;
    if (s.active.dust === 0) story.push({ icon: '🌤️', text: 'The dust storm is over. Sunshine is back!', tone: 'good' });
  } else if (s.world === 'mars' && s.day <= s.maxDays - 3 && rng() < 0.1) {
    s.active.dust = 3 + Math.floor(rng() * 3);
    story.push({ icon: '🌪️', text: `A dust storm is coming! Less sunlight for about ${s.active.dust} sols.`, tone: 'bad' });
  }
  if (s.world === 'mars' && !s.active.dirty && rng() < 0.12) { s.active.dirty = true; story.push({ icon: '🟫', text: 'Dust settled on the solar panels (−2 blocks). Send someone to Fix/clean them.', tone: 'bad' }); }
  if (!s.active.pumpBroken && rng() < 0.07) { s.active.pumpBroken = true; story.push({ icon: '⚙️', text: 'Uh-oh! The air pump broke. Send someone to Fix it.', tone: 'bad' }); }
  if (s.world === 'moon' && !s.active.leak && rng() < 0.04) { s.active.leak = true; s.o2 = r1(Math.max(0, s.o2 - 1)); story.push({ icon: '☄️', text: 'A tiny meteorite made a small air leak! Send someone to Fix it.', tone: 'bad' }); }
  if (commander && s.grow > 2 && rng() < 0.04) { s.grow = 1; story.push({ icon: '🐛', text: 'Some plants got sick. The botanist replanted them.', tone: 'bad' }); }
  s.rngState = rng.state();

  // 9. Night warning
  if (nightStartOf(s) != null && s.day + 1 === nightStartOf(s)) story.push({ icon: '🌙', text: 'The Sun is setting. The long lunar night starts tomorrow — no solar power!', tone: 'bad' });

  // 10. End checks
  s.history.push({ day: s.day, air: r1(airDays(s)), battery: s.battery, dose: maxDose(s), food: s.food == null ? null : r1(foodDays(s)), science: s.scienceSent });
  if (s.o2 <= 0) s.over = 'air';
  else if (commander && s.food <= 0) s.over = 'food';
  else if (maxDose(s) > RAD_BUDGET) s.over = 'radiation';
  else if (s.day >= s.maxDays) s.over = 'complete';

  // Supply rocket
  if (!s.over && ROCKET_DAYS.includes(s.day) && s.day < s.maxDays - 1) s.pendingRocket = rocketOffers(s, rng);
  s.rngState = rng.state();

  const newBadges = badgesEarned(s, { sky, plan, jobs, anim });
  s.badges.push(...newBadges);
  s.cards.push(...newCards);
  if (!s.over) s.day += 1;
  return { state: s, story, anim, newCards, newBadges };
}

export function rocketOffers(s, rng) {
  const avail = Object.values(UPGRADES).filter((u) => u.worlds.includes(s.world) && !s.upgrades.includes(u.id)).map((u) => u.id);
  const offers = [];
  if (s.world === 'moon' && avail.includes('reactor')) offers.push('reactor');
  if (s.world === 'mars' && avail.includes('moxie') && rng() < 0.6) offers.push('moxie');
  const rest = avail.filter((id) => !offers.includes(id));
  while (offers.length < 3 && rest.length) offers.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
  return offers;
}

export function applyUpgrade(prev, id) {
  const s = clone(prev);
  if (id && !s.upgrades.includes(id)) {
    s.upgrades.push(id);
    if (id === 'battery') s.batteryMax += 8;
    if (id === 'tanks') { s.o2Max += 6; s.o2 = r1(s.o2 + 6); }
    const c = UPGRADES[id].card; if (c && !s.cards.includes(c)) s.cards.push(c);
  }
  s.pendingRocket = null;
  return s;
}

export function badgesEarned(s, { sky, plan, jobs }) {
  const got = new Set(s.badges);
  const add = [];
  const give = (id) => { if (!got.has(id) && !add.includes(id)) add.push(id); };
  if (sky.particles && plan.shield >= 2 && !Object.values(jobs).includes('explore')) give('shield');
  if (s.fixedSomething) give('fixer');
  if (s.harvested) give('farmer');
  if (s.world === 'mars' && s.dustSeen && s.active.dust === 0 && !s.over) give('dust');
  if (s.scienceSent >= scienceGoal(s.mode)) give('science');
  if (s.over === 'complete') {
    give('complete');
    if (s.world === 'moon') give('night');
    if (s.radioDays >= s.maxDays) give('radio');
    if (!s.tiredEver) give('caring');
  }
  return add;
}

export function stars(s) {
  if (s.over !== 'complete') return { total: 0, home: false, green: false, science: false };
  const home = true;
  const green = maxDose(s) < RAD_GREEN;
  const science = s.scienceSent >= scienceGoal(s.mode);
  return { total: [home, green, science].filter(Boolean).length, home, green, science };
}

export { RAD_BUDGET, RAD_GREEN };
