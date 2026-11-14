// launch.js — the opening cutscene: Earth launch pad → BOOM → space → landing on the Moon or Mars.
// Original cartoon art, animated with GSAP. Skippable, and short in Calm Mode.
/* global gsap */
import * as Fx from './fx.js';
import { earthSVG, animateEarth } from './art.js';

const INK = '#23263a';

function stars(n) {
  let a = 42, out = '';
  const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) out += `<circle cx="${(r() * 1200).toFixed(0)}" cy="${(r() * 700).toFixed(0)}" r="${(r() * 1.8 + 0.5).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  return out;
}

function flagSVG(x, y, w) {
  const h = w * 0.57, sh = h / 13;
  let st = '';
  for (let i = 0; i < 13; i++) st += `<rect x="${x}" y="${(y + i * sh).toFixed(2)}" width="${w}" height="${sh.toFixed(2)}" fill="${i % 2 ? '#fff' : '#d62839'}"/>`;
  return `${st}<rect x="${x}" y="${y}" width="${w * 0.42}" height="${sh * 7}" fill="#1c3f94"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
}

// NASA Space Launch System (SLS)-style rocket: orange core stage, two white boosters, Orion + abort tower.
// Drawn from public reference shapes; no agency logos (Space Apps branding rules).
function slsSVG() {
  const booster = (x) => `<g>
      <path d="M${x - 12} -168 Q${x} -205 ${x + 12} -168 Z" fill="#f2f2f2" stroke="${INK}" stroke-width="3"/>
      <rect x="${x - 12}" y="-168" width="24" height="258" fill="#f2f2f2" stroke="${INK}" stroke-width="3"/>
      ${[-120, -70, -20, 30, 70].map((y) => `<rect x="${x - 12}" y="${y}" width="24" height="5" fill="#3a3f55"/>`).join('')}
      <path d="M${x - 9} 90 L${x - 13} 104 L${x + 13} 104 L${x + 9} 90 Z" fill="#6b7187" stroke="${INK}" stroke-width="2.5"/></g>`;
  return `<g id="lrocket">
    <g id="lflame" opacity="0">
      <path d="M-50 100 Q-46 300 -34 100 Z" fill="#ff7a1a"/><path d="M34 100 Q46 300 50 100 Z" fill="#ff7a1a"/>
      <path d="M-47 100 Q-46 210 -37 100 Z" fill="#fff3a6"/><path d="M37 100 Q46 210 47 100 Z" fill="#fff3a6"/>
      <path d="M-22 108 Q0 260 22 108 Z" fill="#ffb02e"/><path d="M-12 108 Q0 190 12 108 Z" fill="#fff8d0"/>
    </g>
    <rect x="-26" y="-200" width="52" height="292" fill="#e0782a" stroke="${INK}" stroke-width="4"/>
    <path d="M-16 -195 V88 M-4 -195 V88 M10 -195 V88" stroke="#c65f18" stroke-width="2" opacity=".7"/>
    <rect x="-26" y="-60" width="52" height="5" fill="#b8540f"/><rect x="-26" y="40" width="52" height="5" fill="#b8540f"/>
    <g transform="translate(-13 -150)">${flagSVG(0, 0, 26)}</g>
    <path d="M-24 92 L-28 108 L-14 108 L-12 92 Z M24 92 L28 108 L14 108 L12 92 Z M-9 92 L-11 110 L-1 110 L-1 92Z M9 92 L11 110 L1 110 L1 92Z" fill="#555b70" stroke="${INK}" stroke-width="2"/>
    ${booster(-40)}${booster(40)}
    <path d="M-26 -200 L-20 -236 L20 -236 L26 -200 Z" fill="#e9ecf3" stroke="${INK}" stroke-width="3.5"/>
    <rect x="-17" y="-262" width="34" height="26" fill="#f6f7fb" stroke="${INK}" stroke-width="3"/>
    <rect x="-17" y="-254" width="34" height="4" fill="#9aa5bf"/>
    <path d="M-17 -262 L-11 -292 L11 -292 L17 -262 Z" fill="#e3e6ee" stroke="${INK}" stroke-width="3"/>
    <line x1="0" y1="-292" x2="0" y2="-334" stroke="${INK}" stroke-width="4"/>
    <path d="M-5 -320 L0 -344 L5 -320 Z" fill="#e3e6ee" stroke="${INK}" stroke-width="2.5"/>
    <path d="M-6 -300 L-9 -292 M6 -300 L9 -292" stroke="${INK}" stroke-width="2.5"/>
  </g>`;
}

// Orion spacecraft: crew capsule + service module with 4 solar array wings.
function orionSVG() {
  const wing = (r) => `<g transform="rotate(${r})"><rect x="22" y="-5" width="70" height="10" fill="#2f63d8" stroke="${INK}" stroke-width="2.5"/><path d="M40 -5 V5 M58 -5 V5 M76 -5 V5" stroke="#86b2ff" stroke-width="2"/></g>`;
  return `<g id="lorion">
    <path id="lorionFlame" d="M-14 40 Q0 110 14 40 Z" fill="#7fe7ff" opacity=".85"/>
    ${wing(45)}${wing(135)}${wing(-45)}${wing(-135)}
    <rect x="-20" y="-6" width="40" height="44" rx="4" fill="#e9edf6" stroke="${INK}" stroke-width="3.5"/>
    <rect x="-20" y="10" width="40" height="5" fill="#9aa5bf"/>
    <path d="M-20 -6 L-12 -40 L12 -40 L20 -6 Z" fill="#cfd5e3" stroke="${INK}" stroke-width="3.5"/>
    <rect x="-7" y="-30" width="6" height="7" rx="1.5" fill="#2a3566"/><rect x="2" y="-30" width="6" height="7" rx="1.5" fill="#2a3566"/>
  </g>`;
}

// James Webb Space Telescope: 18 gold hexagonal mirror segments above a 5-layer sunshield.
function webbSVG() {
  const R = 13, hex = (cx, cy) => {
    let d = '';
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; d += `${k ? 'L' : 'M'}${(cx + R * Math.cos(a)).toFixed(1)} ${(cy + R * Math.sin(a)).toFixed(1)}`; }
    return `<path d="${d}Z" fill="url(#gold)" stroke="#8a5a00" stroke-width="1.6"/>`;
  };
  const w = R * Math.sqrt(3);
  const cells = [];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
    const s3 = -q - r;
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s3)) > 2 || (q === 0 && r === 0)) continue;
    cells.push([w * (q + r / 2), 1.5 * R * r]);
  }
  const layers = [0, 1, 2, 3, 4].map((i) => `<path d="M${-150 + i * 6} ${70 + i * 5} L0 ${36 + i * 4} L${150 - i * 6} ${70 + i * 5} L0 ${104 - i * 2} Z" fill="${['#efe8ff', '#dcd0f7', '#c9b8ee', '#b6a2e4', '#a48cd9'][i]}" stroke="${INK}" stroke-width="2" opacity=".95"/>`).join('');
  return `<g id="lwebb">
    <defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset=".5" stop-color="#f4b400"/><stop offset="1" stop-color="#c98a00"/></linearGradient></defs>
    ${layers}
    <rect x="-10" y="36" width="20" height="22" fill="#9aa5bf" stroke="${INK}" stroke-width="2"/>
    <g transform="translate(0 -24)">${cells.map(([x, y]) => hex(x, y)).join('')}
      <path d="M-40 40 L0 -62 M40 40 L0 -62 M0 50 L0 -62" stroke="${INK}" stroke-width="2.2"/><circle cx="0" cy="-64" r="6" fill="url(#gold)" stroke="${INK}" stroke-width="2"/></g>
    <circle class="webbshine" cx="-20" cy="-40" r="5" fill="#fff" opacity=".9"/>
  </g>`;
}

// Lander for touchdown on the Moon or Mars.
function landerSVG() {
  return `<g id="llander">
    <g id="lthrust" opacity="1"><path d="M-14 60 Q0 150 14 60 Z" fill="#ffb02e"/><path d="M-7 60 Q0 110 7 60 Z" fill="#fff3a6"/></g>
    <path d="M-34 30 L-62 92 M34 30 L62 92 M-20 40 L-36 92 M20 40 L36 92" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <rect x="-74" y="88" width="26" height="8" rx="3" fill="#9aa5bf" stroke="${INK}" stroke-width="3"/><rect x="48" y="88" width="26" height="8" rx="3" fill="#9aa5bf" stroke="${INK}" stroke-width="3"/>
    <path d="M-42 -10 H42 L36 46 H-36 Z" fill="#e8b83c" stroke="${INK}" stroke-width="4"/>
    <path d="M-30 0 L-20 40 M-6 0 L-2 40 M18 0 L14 40" stroke="#c79416" stroke-width="2"/>
    <rect x="-28" y="-62" width="56" height="54" rx="14" fill="#f2f4fa" stroke="${INK}" stroke-width="4"/>
    <circle cx="0" cy="-38" r="13" fill="#46d9ff" stroke="${INK}" stroke-width="3.5"/>
    <path d="M-6 -44 Q0 -48 5 -46" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g transform="translate(-14 -24) ">${flagSVG(0, 0, 28)}</g>
    <path d="M0 -62 V-80" stroke="${INK}" stroke-width="3"/><circle cx="0" cy="-82" r="4" fill="#ff5c7a" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

export function playLaunch(world) {
  const moon = world === 'moon';
  const dest = moon ? { name: 'the Moon', a: '#e6e8f0', b: '#9da1b5', ground: '#a9adbd', sky: '#04051a' } : { name: 'Mars', a: '#ff9f6b', b: '#b4452a', ground: '#c8653a', sky: '#e9b88a' };
  const box = document.createElement('div');
  box.className = 'launchbox';
  box.innerHTML = `
  <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" id="lsvg" role="img" aria-label="SLS rocket launch from Earth, past the James Webb Space Telescope, to ${dest.name}">
    <defs>
      <linearGradient id="lsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb6ff"/><stop offset="1" stop-color="#bfe9ff"/></linearGradient>
      <radialGradient id="ldest" cx=".35" cy=".35"><stop offset="0" stop-color="${dest.a}"/><stop offset="1" stop-color="${dest.b}"/></radialGradient>
      <radialGradient id="learth" cx=".35" cy=".35"><stop offset="0" stop-color="#5fb0ff"/><stop offset="1" stop-color="#1f5fc4"/></radialGradient>
    </defs>
    <rect width="1200" height="700" fill="#03041a"/>
    <g id="lstars" opacity="0">${stars(160)}</g>
    <g id="lspace" opacity="0">
      <g id="learthBall" transform="translate(220 600)">${earthSVG('learth', 160)}<text y="-178" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="26" fill="#fff">Earth</text></g>
      <g id="ldestBall" transform="translate(1000 160) scale(.2)"><circle r="150" fill="url(#ldest)" stroke="${INK}" stroke-width="8"/><circle cx="-40" cy="30" r="26" fill="#000" opacity=".12"/><circle cx="50" cy="-40" r="18" fill="#000" opacity=".12"/><circle cx="20" cy="70" r="14" fill="#000" opacity=".12"/></g>
    </g>
    <g id="learthScene">
      <rect width="1200" height="700" fill="url(#lsky)"/>
      <g fill="#fff" opacity=".9"><ellipse cx="200" cy="150" rx="90" ry="30"/><ellipse cx="260" cy="135" rx="60" ry="30"/><ellipse cx="930" cy="220" rx="110" ry="34"/><ellipse cx="1000" cy="200" rx="70" ry="30"/></g>
      <path d="M0 560 Q300 520 600 550 T1200 545 V700 H0Z" fill="#5fcf72" stroke="${INK}" stroke-width="5"/>
      <path d="M0 610 Q400 590 1200 620 V700 H0Z" fill="#46b45b"/>
      <g stroke="${INK}" stroke-width="5" fill="none"><path d="M690 560 V120 M750 560 V120 M690 120 H750 M690 180 L750 240 M750 180 L690 240 M690 300 L750 360 M750 300 L690 360 M690 420 L750 480 M750 420 L690 480 M690 160 H632 M690 260 H632 M690 380 H640"/></g>
      <rect x="520" y="548" width="200" height="22" rx="4" fill="#8d93a8" stroke="${INK}" stroke-width="5"/>
      <rect x="520" y="548" width="160" height="22" rx="6" fill="#9aa5bf" stroke="${INK}" stroke-width="5"/>
      <g transform="translate(860 470)"><line x1="0" y1="90" x2="0" y2="0" stroke="${INK}" stroke-width="5"/><g id="lpadflag" transform="translate(2 2)">${flagSVG(0, 0, 80)}</g></g>
      <text x="600" y="660" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="28" fill="#fff" stroke="${INK}" stroke-width="1">Launch pad, Earth 🌍 · Space Launch System (SLS) rocket</text>
    </g>
    <g id="ldestScene" opacity="0">
      <rect width="1200" height="700" fill="${dest.sky}"/>
      ${moon ? stars(60) : ''}
      <path d="M0 560 Q300 530 600 552 T1200 548 V700 H0Z" fill="${dest.ground}" stroke="${INK}" stroke-width="5"/>
      <text id="ltouch" x="600" y="140" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="64" fill="#ffd23f" stroke="${INK}" stroke-width="3" opacity="0">Touchdown on ${dest.name}!</text>
    </g>
    <g id="lsmoke"></g>
    <g id="lrocketWrap" transform="translate(600 448)">${slsSVG()}</g>
    <g id="lwebbWrap" opacity="0" transform="translate(560 330)">${webbSVG()}
      <text y="150" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="28" fill="#ffd23f" stroke="${INK}" stroke-width="1.5">Hi, James Webb Space Telescope! 👋</text></g>
    <g id="lorionWrap" opacity="0" transform="translate(120 560)">${orionSVG()}</g>
    <g id="llanderWrap" opacity="0" transform="translate(600 -200)">${landerSVG()}</g>
    <text id="lstage" x="40" y="60" font-family="Fredoka" font-weight="700" font-size="30" fill="#fff" stroke="${INK}" stroke-width="1.5" opacity="0"></text>
    <text id="ltitle" x="600" y="90" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="54" fill="#fff" stroke="${INK}" stroke-width="3">Mission to ${dest.name}!</text>
    <text id="lcount" x="600" y="330" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="200" fill="#ffd23f" stroke="${INK}" stroke-width="6" opacity="0"></text>
  </svg>
  <button class="btn small secondary" id="lskip" style="position:absolute;right:16px;bottom:16px">Skip ⏩</button>`;
  document.body.append(box);

  const smoke = box.querySelector('#lsmoke');
  const stage = (t) => { const el = box.querySelector('#lstage'); el.textContent = t; gsap.fromTo(el, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }); };
  const puff = (n, y = 560) => {
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', 600 + (Math.random() - 0.5) * 60); c.setAttribute('cy', y); c.setAttribute('r', 18 + Math.random() * 16);
      c.setAttribute('fill', i % 3 ? '#f2f2f7' : '#d8dbe6'); c.setAttribute('stroke', INK); c.setAttribute('stroke-width', '3');
      smoke.append(c);
      gsap.to(c, { attr: { cx: 600 + (Math.random() - 0.5) * 700, cy: y - Math.random() * 90, r: 40 + Math.random() * 40 }, opacity: 0, duration: 2 + Math.random(), ease: 'power2.out' });
    }
  };

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      Fx.sfx.stopRumble();
      gsap.to(box, { opacity: 0, duration: 0.5, onComplete: () => { box.remove(); resolve(); } });
    };
    box.querySelector('#lskip').onclick = () => { tl.kill(); finish(); };
    animateEarth('learth', 14);
    gsap.to('#lpadflag', { skewY: 5, scaleX: 0.92, transformOrigin: '0% 50%', duration: 0.8, yoyo: true, repeat: -1 });
    const flicker = gsap.to(['#lflame', '#lthrust'], { scaleY: 0.82, transformOrigin: '50% 0%', duration: 0.08, yoyo: true, repeat: -1, paused: true });
    const tl = gsap.timeline({ onComplete: finish });
    // countdown
    ['3', '2', '1'].forEach((n, i) => {
      tl.call(() => { box.querySelector('#lcount').textContent = n; Fx.sfx.tick(); }, null, i * 0.85)
        .fromTo('#lcount', { opacity: 0, scale: 1.8, transformOrigin: '600px 260px' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, i * 0.85)
        .to('#lcount', { opacity: 0, duration: 0.25 }, i * 0.85 + 0.6);
    });
    // ignition + BOOM
    tl.call(() => { box.querySelector('#lcount').textContent = 'LIFTOFF!'; stage('Stage 1: SLS rocket launch'); Fx.sfx.boom(); Fx.sfx.rumble(4.5); flicker.play(); puff(28); }, null, 2.6)
      .to('#lcount', { opacity: 1, scale: 0.5, duration: 0.2 }, 2.6)
      .to('#lcount', { opacity: 0, duration: 0.4 }, 3.3)
      .to('#lflame', { opacity: 1, duration: 0.15 }, 2.6)
      .fromTo('#lsvg', { x: -10 }, { x: 10, duration: 0.05, repeat: 21, yoyo: true, ease: 'none' }, 2.6)
      .set('#lsvg', { x: 0 }, 3.75)
      .to('#ltitle', { opacity: 0, duration: 0.4 }, 2.8)
      .to('#lrocketWrap', { y: '-=160', duration: 1.4, ease: 'power2.in' }, 2.9)
      .call(() => puff(14), null, 3.2)
      .to('#lrocketWrap', { y: '-=900', duration: 1.4, ease: 'power1.in' }, 4.3)
      // into space: Orion flies past the James Webb Space Telescope
      .to('#learthScene', { opacity: 0, duration: 1.2 }, 4.4)
      .to(['#lstars', '#lspace'], { opacity: 1, duration: 1.2 }, 4.6)
      .set('#lrocketWrap', { opacity: 0 }, 5.6)
      .call(() => stage('Stage 2: Orion flies through space'), null, 5.6)
      .fromTo('#lorionWrap', { opacity: 0, x: 80, y: 600, rotation: 50, scale: 0.9 }, { opacity: 1, duration: 0.4 }, 5.6)
      .fromTo('#learthBall', { scale: 1 }, { scale: 0.45, x: '-=120', y: '+=120', duration: 4.2, ease: 'power1.inOut' }, 5.6)
      .fromTo('#lwebbWrap', { opacity: 0, scale: 0.5, x: 700, y: 300 }, { opacity: 1, scale: 1, x: 560, y: 330, duration: 1.2, ease: 'back.out(1.6)' }, 6.0)
      .to('#lorionWrap', { x: 360, y: 420, rotation: 60, duration: 1.6, ease: 'power1.out' }, 5.6)
      .call(() => Fx.sfx.badge(), null, 6.6)
      .to('#lwebbWrap', { rotation: 6, duration: 0.8, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 7.0)
      .to('#lorionWrap', { x: 960, y: 200, rotation: 60, scale: 0.4, duration: 2.2, ease: 'power1.in' }, 7.3)
      .to('#lwebbWrap', { x: 200, opacity: 0, duration: 1.6, ease: 'power1.in' }, 8.1)
      .to('#ldestBall', { scale: 1.6, duration: 4.2, ease: 'power1.in' }, 5.6)
      .to('#lstars', { x: -160, duration: 4.2, ease: 'none' }, 5.6)
      // landing: the lander touches down
      .to(['#lspace', '#lstars', '#lorionWrap'], { opacity: 0, duration: 0.6 }, 9.6)
      .to('#ldestScene', { opacity: 1, duration: 0.6 }, 9.6)
      .call(() => stage(`Stage 3: Lander touches down`), null, 9.9)
      .set('#llanderWrap', { opacity: 1, x: 600, y: -200 }, 9.9)
      .call(() => Fx.sfx.rumble(2.2), null, 9.9)
      .to('#llanderWrap', { y: 452, duration: 2.1, ease: 'power2.out' }, 9.9)
      .to('#lthrust', { scaleY: 0.4, transformOrigin: '50% 0%', duration: 0.6 }, 11.1)
      .call(() => { Fx.sfx.thud(); flicker.pause(); puff(16, 548); }, null, 12.0)
      .to('#lthrust', { opacity: 0, duration: 0.3 }, 12.0)
      .fromTo('#ltouch', { opacity: 0, scale: 0.4, transformOrigin: '600px 120px' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2.5)' }, 12.1)
      .call(() => Fx.sfx.cheer(), null, 12.2)
      .to({}, { duration: 1.4 }, 12.7);
  });
}
