// Robot players used by tests and for balance checks.
import { step, applyUpgrade, poolToday, briefing, AIR_NEED } from '../js/sim.js';

export function play(state, policy) {
  let s = state;
  while (!s.over) {
    const plan = policy(s);
    const r = step(s, plan);
    s = r.state;
    if (s.pendingRocket) s = applyUpgrade(s, policy.pick ? policy.pick(s) : s.pendingRocket[0]);
  }
  return s;
}

// A sensible kid: air first, shield on warned/hinted storm days, radio when possible, explore with one astronaut.
export function smart(s) {
  const pool = poolToday(s);
  const b = briefing(s);
  const stormKnown = (b.warning && b.warning.storm) || !!b.hint;
  let left = pool;
  const air = Math.min(AIR_NEED, left); left -= air;
  const shield = stormKnown ? Math.min(s.mode === 'commander' ? 2 : 4, left) : 0; left -= shield;
  const green = s.mode === 'commander' ? Math.min(3, Math.max(0, left - 1)) : 0; left -= green;
  const radio = Math.min(1, left); left -= radio;
  const tired = (id) => s.crew.find((c) => c.id === id).energy <= 40;
  const needFix = s.active.pumpBroken || s.active.leak || s.active.dirty;
  return {
    air, shield, radio, green,
    jobs: {
      eng: tired('eng') ? 'rest' : needFix ? 'fix' : 'rest',
      bot: s.mode === 'commander' ? (tired('bot') ? 'rest' : 'farm') : 'rest',
      sci: stormKnown || tired('sci') ? 'rest' : 'explore',
    },
  };
}
smart.pick = (s) => s.pendingRocket[0];

// A careless player: never shields, explores every day, no radio.
export function careless(s) {
  const pool = poolToday(s);
  const air = Math.min(AIR_NEED, pool);
  return { air, shield: 0, radio: 0, green: 0, jobs: { eng: 'explore', bot: 'explore', sci: 'explore' } };
}
