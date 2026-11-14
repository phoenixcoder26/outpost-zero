// node tests/balance.mjs — win rates for the robot players across seeds/skies.
import { newGame } from '../js/sim.js';
import { archiveSky, practiceSky } from '../js/sky.js';
import { makeRng } from '../js/rng.js';
import { play, smart, careless } from './bots.js';
const maxD = (s) => Math.max(...s.crew.map((c) => c.dose));
for (const world of ['moon', 'mars']) for (const mode of ['cadet', 'commander']) for (const skyKind of ['archive', 'practice']) {
  const res = { complete: 0, air: 0, food: 0, radiation: 0 }; let dose = 0, sci = 0, cres = { complete: 0 };
  const N = 200;
  for (let seed = 1; seed <= N; seed++) {
    const sky = skyKind === 'archive' ? archiveSky() : practiceSky(makeRng(seed * 99));
    const e = play(newGame({ world, mode, seed, sky }), smart); res[e.over]++; dose += maxD(e); sci += e.scienceSent;
    const c = play(newGame({ world, mode, seed, sky }), careless); cres[c.over] = (cres[c.over] || 0) + 1;
  }
  console.log(world, mode, skyKind, 'smart:', JSON.stringify(res), 'avgDose', (dose / N).toFixed(0), 'avgSci', (sci / N).toFixed(1), '| careless:', JSON.stringify(cres));
}
