import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, step, poolToday, solarToday } from '../js/sim.js';
import { archiveSky, practiceSky, buildSchedule } from '../js/sky.js';
import { makeRng } from '../js/rng.js';
import { play, smart, careless } from './bots.js';

const game = (o = {}) => newGame({ world: 'moon', mode: 'cadet', seed: 7, sky: archiveSky(), ...o });

test('archive sky has the real DONKI particle storms on May 9, 10, 11 (big), 13', () => {
  const sky = archiveSky();
  const storms = sky.schedule.filter((d) => d.particles).map((d) => `${d.date}:${d.size}`);
  assert.deepEqual(storms, ['2024-05-09:normal', '2024-05-10:normal', '2024-05-11:big', '2024-05-13:normal']);
});

test('same seed + same choices = same mission', () => {
  const a = play(game(), smart), b = play(game(), smart);
  assert.deepEqual(a.history, b.history);
});

test('cannot spend more power than you have', () => {
  const s = game();
  assert.throws(() => step(s, { air: poolToday(s) + 1, shield: 0, radio: 0, green: 0, jobs: {} }));
});

test('a careless player ends early (radiation or air)', () => {
  const end = play(game(), careless);
  assert.notEqual(end.over, 'complete');
});

test('the lunar night gives no solar power', () => {
  let s = game();
  s.day = 5;
  assert.equal(solarToday(s), 0);
});

test('a smart player completes the archive mission on Moon and Mars', () => {
  for (const world of ['moon', 'mars']) {
    const end = play(game({ world }), smart);
    assert.equal(end.over, 'complete', world);
  }
});

test('powering the shield on storm days keeps radiation in budget', () => {
  const end = play(game(), smart);
  assert.ok(Math.max(...end.crew.map((c) => c.dose)) < 150);
});

test('estimated particles only appear when flagged', () => {
  const sched = buildSchedule({ start: '2026-01-01', flares: [{ time: '2026-01-02T10:00Z', cls: 'X9.0' }], seps: [], estimate: true, rng: () => 0 });
  assert.equal(sched[2].particles, true);
  assert.equal(sched[2].estimated, true);
});

test('practice sky is labeled as not real', () => {
  assert.match(practiceSky(makeRng(1)).label, /not real/);
});

import { trainBrain, FEATURES, predict, features } from '../js/brain.js';
test("PIXEL's brain learns that weak shields in storms are risky", () => {
  const b = trainBrain({ missions: 120 });
  assert.ok(b.accuracy > 0.7, `accuracy ${b.accuracy}`);
  const w = Object.fromEntries(FEATURES.map((f, i) => [f.id, b.w[i]]));
  assert.ok(w.shieldGap > 0 && w.airGap > 0, JSON.stringify(w));
});
