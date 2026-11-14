// art.js — the cartoon outpost: original SVG art + GSAP animation.
// Every animation shows a real cause and effect from the simulation.
/* global gsap, MotionPathPlugin */
if (window.gsap && window.MotionPathPlugin) gsap.registerPlugin(MotionPathPlugin);

const INK = '#23263a';
// the scene is drawn on 1200x560; the window shows y 30..530 so the game can be wider on the screen
export const VIEW = { w: 1200, h: 560, cy: 30, ch: 500 };
export const SPOTS = {
  door: [600, 470], fix: [320, 500], explore: [1030, 520], farm: [905, 505], rest: [600, 440],
  sun: [1065, 92], antennaTop: [778, 300], hab: [600, 400],
};

let calm = false;
export const setCalm = (v) => { calm = !!v; if (window.gsap) gsap.globalTimeline.timeScale(v ? 2.5 : 1); };

// ---------- characters ----------

const HAIR = {
  buns: (h) => `<circle cx="-15" cy="-104" r="8" fill="${h}"/><circle cx="15" cy="-104" r="8" fill="${h}"/><path d="M-19 -86 Q-18 -104 0 -105 Q18 -104 19 -86 Q10 -96 0 -95 Q-10 -96 -19 -86Z" fill="${h}"/>`,
  curls: (h) => `<path d="M-19 -86 Q-22 -100 -12 -105 Q-6 -112 2 -107 Q10 -112 15 -104 Q23 -100 19 -86 Q12 -94 0 -94 Q-12 -94 -19 -86Z" fill="${h}"/><circle cx="-14" cy="-101" r="5" fill="${h}"/><circle cx="-4" cy="-106" r="5" fill="${h}"/><circle cx="7" cy="-105" r="5" fill="${h}"/><circle cx="15" cy="-99" r="5" fill="${h}"/>`,
  bangs: (h) => `<path d="M-20 -78 Q-23 -104 0 -106 Q23 -104 20 -78 L17 -90 Q8 -88 3 -95 Q-4 -88 -12 -91 L-17 -84Z" fill="${h}"/>`,
};
const FRINGE = {
  buns: (h) => `<path d="M-15 -88 Q0 -101 15 -88 Q6 -94 0 -93 Q-6 -94 -15 -88Z" fill="${h}"/>`,
  curls: (h) => `<path d="M-15 -90 Q0 -100 15 -90 Q8 -95 0 -94 Q-8 -95 -15 -90Z" fill="${h}"/>`,
  bangs: (h) => `<path d="M-16 -87 Q-14 -99 0 -99 Q14 -99 16 -87 L12 -90 Q7 -86 3 -91 Q-2 -86 -7 -91 Q-11 -86 -16 -87Z" fill="${h}"/>`,
};
export function astronautSVG(id, color, dark, { scale = 1, idPrefix = 'crew', skin = '#f3c9a6', hair = '#5a3b22', style = 'buns' } = {}) {
  const extra = id === 'bot' ? `<g fill="none" stroke="${INK}" stroke-width="2"><circle cx="-7" cy="-84" r="5.5"/><circle cx="7" cy="-84" r="5.5"/><path d="M-1.5 -84 H1.5"/></g>` : '';
  const freckles = id === 'eng' ? `<g fill="#c9835b"><circle cx="-10" cy="-77" r="1"/><circle cx="-7" cy="-76" r="1"/><circle cx="10" cy="-77" r="1"/><circle cx="7" cy="-76" r="1"/></g>` : '';
  return `
  <g id="${idPrefix}-${id}" class="astro" data-id="${id}">
   <g class="astro-shadow"><ellipse cx="0" cy="2" rx="${30 * scale}" ry="${7 * scale}" fill="#000" opacity=".22"/></g>
   <g class="astro-scale" transform="scale(${scale})"><g class="astro-body">
    <rect x="-26" y="-68" width="52" height="44" rx="12" fill="#dfe5f0" stroke="${INK}" stroke-width="3"/>
    <circle class="packlight" cx="-19" cy="-60" r="3.5" fill="#5be36b" stroke="${INK}" stroke-width="1.5"/>
    <g class="leg-l"><rect x="-15" y="-26" width="13" height="26" rx="6" fill="#f6f8fd" stroke="${INK}" stroke-width="3"/><rect x="-18" y="-7" width="18" height="9" rx="4" fill="${dark}" stroke="${INK}" stroke-width="3"/></g>
    <g class="leg-r"><rect x="2" y="-26" width="13" height="26" rx="6" fill="#f6f8fd" stroke="${INK}" stroke-width="3"/><rect x="0" y="-7" width="18" height="9" rx="4" fill="${dark}" stroke="${INK}" stroke-width="3"/></g>
    <rect x="-22" y="-63" width="44" height="44" rx="16" fill="#f6f8fd" stroke="${INK}" stroke-width="3"/>
    <rect x="-22" y="-30" width="44" height="7" fill="${color}"/>
    <rect x="-22" y="-63" width="44" height="44" rx="16" fill="none" stroke="${INK}" stroke-width="3"/>
    <rect x="-10" y="-54" width="20" height="14" rx="4" fill="#2a3566" stroke="${INK}" stroke-width="2"/>
    <circle cx="-5" cy="-47" r="2.6" fill="#ff5c7a"/><circle cx="1" cy="-47" r="2.6" fill="#ffd23f"/><circle cx="7" cy="-47" r="2.6" fill="#46d9ff" class="blinky"/>
    <circle cx="14" cy="-55" r="5" fill="${color}" stroke="${INK}" stroke-width="2"/><path d="M14 -58 l1 2.2 2.4.3 -1.8 1.6 .5 2.4 -2.1-1.2 -2.1 1.2 .5-2.4 -1.8-1.6 2.4-.3z" fill="#fff"/>
    <g class="arm-l"><rect x="-34" y="-59" width="14" height="31" rx="7" fill="#f6f8fd" stroke="${INK}" stroke-width="3"/><rect x="-34" y="-50" width="14" height="5" fill="${color}"/><circle cx="-27" cy="-27" r="7" fill="${dark}" stroke="${INK}" stroke-width="2.5"/></g>
    <g class="arm-r"><rect x="20" y="-59" width="14" height="31" rx="7" fill="#f6f8fd" stroke="${INK}" stroke-width="3"/><rect x="20" y="-50" width="14" height="5" fill="${color}"/><circle cx="27" cy="-27" r="7" fill="${dark}" stroke="${INK}" stroke-width="2.5"/></g>
    <g class="head">
     <line x1="16" y1="-108" x2="24" y2="-124" stroke="${INK}" stroke-width="3"/><circle class="helmlight" cx="25" cy="-126" r="4.5" fill="${color}" stroke="${INK}" stroke-width="2"/>
     <circle cx="0" cy="-86" r="30" fill="#f6f8fd" stroke="${INK}" stroke-width="3"/>
     <circle cx="0" cy="-85" r="23" fill="#bfe9ff" stroke="${INK}" stroke-width="2.5"/>
     <g class="face">
      ${(HAIR[style] || HAIR.buns)(hair)}
      <ellipse cx="0" cy="-82" rx="15.5" ry="16" fill="${skin}"/>
      ${FRINGE[style] ? FRINGE[style](hair) : ''}
      <g class="eyes"><ellipse cx="-6.5" cy="-83" rx="2.8" ry="3.6" fill="${INK}"/><ellipse cx="6.5" cy="-83" rx="2.8" ry="3.6" fill="${INK}"/><circle cx="-5.6" cy="-84.4" r="1" fill="#fff"/><circle cx="7.4" cy="-84.4" r="1" fill="#fff"/></g>
      ${extra}${freckles}
      <ellipse cx="-10" cy="-76" rx="3" ry="1.8" fill="#ff8fa3" opacity=".75"/><ellipse cx="10" cy="-76" rx="3" ry="1.8" fill="#ff8fa3" opacity=".75"/>
      <path class="mouth" d="M-5 -74 Q0 -69 5 -74" stroke="${INK}" stroke-width="2.4" fill="#fff" stroke-linecap="round"/>
     </g>
     <path d="M-15 -100 Q-6 -107 4 -105" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
     <circle cx="14" cy="-72" r="2.5" fill="#fff" opacity=".6"/>
    </g>
   </g></g>
  </g>`;
}

export function pixelSVG() {
  return `
  <svg viewBox="0 0 120 130" class="pixel-svg" aria-hidden="true">
   <g id="pixelBot">
    <path class="flame" d="M48 104 Q60 132 72 104 Z" fill="#ffb02e"/>
    <path class="flame2" d="M53 104 Q60 120 67 104 Z" fill="#fff3a6"/>
    <line x1="60" y1="18" x2="60" y2="6" stroke="${INK}" stroke-width="4"/>
    <circle class="ant" cx="60" cy="6" r="6" fill="#ff5c7a" stroke="${INK}" stroke-width="3"/>
    <rect x="16" y="58" width="12" height="24" rx="6" fill="#cfd8ea" stroke="${INK}" stroke-width="3" class="parm-l"/>
    <rect x="92" y="58" width="12" height="24" rx="6" fill="#cfd8ea" stroke="${INK}" stroke-width="3" class="parm-r"/>
    <rect x="24" y="18" width="72" height="86" rx="30" fill="#eef2fb" stroke="${INK}" stroke-width="4"/>
    <rect x="33" y="30" width="54" height="40" rx="14" fill="#1d2747" stroke="${INK}" stroke-width="3"/>
    <g id="pixelFace"></g>
    <circle cx="60" cy="86" r="7" fill="#46d9ff" stroke="${INK}" stroke-width="3"/>
   </g>
  </svg>`;
}

const FACES = {
  happy: '<path d="M41 48 Q47 41 53 48" stroke="#5ff2ff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M67 48 Q73 41 79 48" stroke="#5ff2ff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M50 57 Q60 66 70 57" stroke="#5ff2ff" stroke-width="4" fill="none" stroke-linecap="round"/>',
  talk: '<circle cx="47" cy="46" r="4.5" fill="#5ff2ff"/><circle cx="73" cy="46" r="4.5" fill="#5ff2ff"/><ellipse class="talkmouth" cx="60" cy="60" rx="7" ry="4" fill="#5ff2ff"/>',
  worried: '<path d="M41 42 L52 46" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/><path d="M79 42 L68 46" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/><circle cx="47" cy="50" r="3.5" fill="#ffd166"/><circle cx="73" cy="50" r="3.5" fill="#ffd166"/><path d="M50 62 Q55 58 60 62 Q65 66 70 62" stroke="#ffd166" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  wow: '<circle cx="47" cy="46" r="6" fill="none" stroke="#ff8ad8" stroke-width="3.5"/><circle cx="73" cy="46" r="6" fill="none" stroke="#ff8ad8" stroke-width="3.5"/><ellipse cx="60" cy="61" rx="5" ry="6" fill="#ff8ad8"/>',
  star: '<path d="M47 39 l2.6 5.4 6 .8 -4.4 4.1 1.1 5.9 -5.3-2.8 -5.3 2.8 1.1-5.9 -4.4-4.1 6-.8z" fill="#ffe14d"/><path d="M73 39 l2.6 5.4 6 .8 -4.4 4.1 1.1 5.9 -5.3-2.8 -5.3 2.8 1.1-5.9 -4.4-4.1 6-.8z" fill="#ffe14d"/><path d="M50 58 Q60 68 70 58" stroke="#ffe14d" stroke-width="4" fill="none" stroke-linecap="round"/>',
};
export function pixelFace(kind = 'happy') {
  const g = document.getElementById('pixelFace');
  if (g) g.innerHTML = FACES[kind] || FACES.happy;
}
export function animatePixel() {
  if (!window.gsap) return;
  gsap.to('#pixelBot', { y: -8, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('#pixelBot .flame', { scaleY: 0.7, transformOrigin: '60px 104px', duration: 0.12, yoyo: true, repeat: -1 });
  gsap.to('#pixelBot .ant', { fill: '#ffd166', duration: 0.8, yoyo: true, repeat: -1 });
}
export function pixelReact(kind) {
  pixelFace(kind);
  if (!window.gsap) return;
  if (kind === 'star' || kind === 'happy') gsap.fromTo('#pixelBot', { rotation: -8 }, { rotation: 8, transformOrigin: '60px 60px', duration: 0.15, yoyo: true, repeat: 5, onComplete: () => gsap.set('#pixelBot', { rotation: 0 }) });
  if (kind === 'worried') gsap.fromTo('#pixelBot', { x: -3 }, { x: 3, duration: 0.07, yoyo: true, repeat: 7, onComplete: () => gsap.set('#pixelBot', { x: 0 }) });
  if (kind === 'talk') gsap.fromTo('#pixelFace .talkmouth', { attr: { ry: 2 } }, { attr: { ry: 6 }, duration: 0.14, yoyo: true, repeat: 9 });
}

// ---------- scene ----------

function stars(n, seed, maxY) {
  let a = seed; const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = r() * 1200, y = r() * maxY, s = r() * 1.8 + 0.6;
    out += `<circle class="${i % 4 === 0 ? 'twinkle' : ''}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

function panel(x, y, id = '') {
  return `<g ${id ? `id="${id}"` : ''} class="panel">
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 52}" stroke="${INK}" stroke-width="5"/>
    <g transform="translate(${x} ${y}) rotate(-18)">
      <rect x="-40" y="-26" width="80" height="44" rx="5" fill="#2f63d8" stroke="${INK}" stroke-width="3.5"/>
      <path d="M-40 -11 H40 M-40 4 H40 M-20 -26 V18 M0 -26 V18 M20 -26 V18" stroke="#86b2ff" stroke-width="2"/>
      <path d="M-34 -21 L-24 -21" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    </g></g>`;
}

function plant(x, i) {
  return `<g class="plant" id="plant${i}" transform="translate(${x} 470)">
     <g class="plant-grow">
      <path d="M0 0 V-34" stroke="#2f9e5b" stroke-width="4" stroke-linecap="round"/>
      <path d="M0 -14 Q-18 -22 -20 -36 Q-4 -32 0 -16Z" fill="#46c46f" stroke="${INK}" stroke-width="2"/>
      <path d="M0 -20 Q18 -28 20 -42 Q4 -38 0 -22Z" fill="#5fd884" stroke="${INK}" stroke-width="2"/>
      <path d="M0 -32 Q-10 -46 0 -54 Q10 -46 0 -32Z" fill="#c43c6b" stroke="${INK}" stroke-width="2"/>
     </g></g>`;
}

export function buildScene(svg, world) {
  const moon = world === 'moon';
  const skyTop = moon ? '#04051a' : '#e9b88a', skyBot = moon ? '#121a4a' : '#f5d2a5';
  const ground = moon ? '#a9adbd' : '#c8653a', ground2 = moon ? '#8c90a3' : '#a84f2b', hill = moon ? '#6d7186' : '#8e3f22';
  const earth = moon
    ? `<g transform="translate(170 100)">${earthSVG('earth', 38, { label: 'Earth', labelY: 64 })}</g>`
    : `<g id="earth" transform="translate(230 80)"><circle r="6" fill="#7fc3ff"/><circle r="12" fill="#7fc3ff" opacity=".25"/><text y="28" text-anchor="middle" class="svglabel">Earth</text></g>`;
  const craters = moon
    ? `<ellipse cx="120" cy="505" rx="60" ry="14" fill="${ground2}"/><ellipse cx="480" cy="530" rx="44" ry="10" fill="${ground2}"/><ellipse cx="1100" cy="520" rx="70" ry="16" fill="${ground2}"/><ellipse cx="820" cy="545" rx="30" ry="7" fill="${ground2}"/>`
    : `<path d="M90 520 q20-26 44 0z M470 540 q14-18 30 0z M1120 515 q24-30 50 0z M790 548 q12-14 24 0z" fill="${ground2}" stroke="${INK}" stroke-width="2.5"/>`;

  svg.setAttribute('viewBox', `0 ${VIEW.cy} ${VIEW.w} ${VIEW.ch}`);
  svg.innerHTML = `
  <defs>
    <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient>
    <linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02030f"/><stop offset="1" stop-color="#0b1236"/></linearGradient>
    <radialGradient id="sunGlow"><stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#ffd23f" stop-opacity=".6"/><stop offset="1" stop-color="#ffb300" stop-opacity="0"/></radialGradient>
    <radialGradient id="water" cx=".5" cy=".4"><stop offset="0" stop-color="#7fe7ff" stop-opacity=".05"/><stop offset=".8" stop-color="#3fc8ff" stop-opacity=".35"/><stop offset="1" stop-color="#bff4ff" stop-opacity=".8"/></radialGradient>
    <radialGradient id="warm"><stop offset="0" stop-color="#ffe9a3" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient>
    <radialGradient id="purple"><stop offset="0" stop-color="#d27bff" stop-opacity=".75"/><stop offset="1" stop-color="#d27bff" stop-opacity="0"/></radialGradient>
    <radialGradient id="green"><stop offset="0" stop-color="#8dff9a" stop-opacity=".9"/><stop offset="1" stop-color="#8dff9a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect id="skyDayRect" width="1200" height="560" fill="url(#skyDay)"/>
  <rect id="skyNightRect" width="1200" height="560" fill="url(#skyNight)" opacity="0"/>
  <g id="stars" opacity="${moon ? 1 : 0}">${stars(90, world === 'moon' ? 7 : 11, 330)}</g>
  <g transform="translate(${SPOTS.sun[0]} ${SPOTS.sun[1]})"><g id="sun">
    <circle r="95" fill="url(#sunGlow)" class="sunglow"/>
    <circle r="40" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
    <g class="sunface"><circle cx="-12" cy="-6" r="4" fill="${INK}"/><circle cx="12" cy="-6" r="4" fill="${INK}"/><path d="M-12 8 Q0 18 12 8" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/></g>
  </g></g>
  ${earth}
  <g id="stationWrap" transform="translate(-200 60)"><g id="station" transform="scale(.75)">
    <rect x="-70" y="-3" width="140" height="6" fill="#c9cfdf" stroke="${INK}" stroke-width="2"/>
    <g fill="#2f63d8" stroke="${INK}" stroke-width="2"><rect x="-70" y="-38" width="22" height="32"/><rect x="-70" y="6" width="22" height="32"/><rect x="48" y="-38" width="22" height="32"/><rect x="48" y="6" width="22" height="32"/></g>
    <path d="M-59 -38 V-6 M-59 6 V38 M59 -38 V-6 M59 6 V38" stroke="#86b2ff" stroke-width="2"/>
    <rect x="-28" y="-11" width="56" height="22" rx="11" fill="#f2f4fa" stroke="${INK}" stroke-width="3"/>
    <circle cx="-10" cy="0" r="4" fill="#2a3566"/><circle cx="4" cy="0" r="4" fill="#2a3566"/>
    <rect x="-8" y="-24" width="16" height="13" rx="4" fill="#ff7a59" stroke="${INK}" stroke-width="2.5"/>
    <circle class="stationlight" cx="30" cy="-6" r="3.5" fill="#ff5c7a"/>
    <text y="34" text-anchor="middle" class="svglabel" font-size="13">space station</text>
  </g></g>
  <path id="hills" d="M0 360 Q120 300 240 345 T480 330 T760 350 T1000 318 T1200 345 V560 H0Z" fill="${hill}"/>
  <path id="ground" d="M0 395 Q200 375 400 392 T800 388 T1200 392 V560 H0Z" fill="${ground}" stroke="${INK}" stroke-width="3"/>
  ${craters}

  <g id="panelsExtra" opacity="0">${panel(55, 390)}${panel(140, 404)}</g>
  <g id="panels">${panel(215, 392)}${panel(300, 404)}${panel(385, 396)}</g>
  <g id="dirt" opacity="0"><ellipse cx="205" cy="380" rx="24" ry="9" fill="#7a3a1c" opacity=".8"/><ellipse cx="305" cy="392" rx="20" ry="8" fill="#7a3a1c" opacity=".8"/><ellipse cx="380" cy="384" rx="22" ry="8" fill="#7a3a1c" opacity=".8"/></g>
  <g transform="translate(440 418)"><g id="batt">
    <rect x="-34" y="-30" width="68" height="46" rx="8" fill="#e9edf6" stroke="${INK}" stroke-width="3"/>
    <rect x="-8" y="-37" width="16" height="8" rx="2" fill="${INK}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect class="bbar" id="bb${i}" x="${-27 + i * 11}" y="-22" width="8" height="30" rx="2" fill="#3ee07a"/>`).join('')}
    <text y="34" text-anchor="middle" class="svglabel dark">battery</text>
  </g></g>
  <g transform="translate(500 470)"><g id="moxie" opacity="0">
    <rect x="-22" y="-26" width="44" height="30" rx="6" fill="#f5c542" stroke="${INK}" stroke-width="3"/><text y="-6" text-anchor="middle" class="svglabel dark" font-size="11">O₂</text>
    <circle class="bub" cx="-8" cy="-34" r="4" fill="#bff4ff" stroke="${INK}" stroke-width="1.5"/><circle class="bub" cx="6" cy="-40" r="3" fill="#bff4ff" stroke="${INK}" stroke-width="1.5"/>
  </g></g>

  <g id="hab">
    <ellipse cx="600" cy="440" rx="130" ry="14" fill="#000" opacity=".2"/>
    <path d="M490 435 V380 Q490 318 600 312 Q710 318 710 380 V435 Z" fill="#f2f4fa" stroke="${INK}" stroke-width="4"/>
    <path d="M490 395 H710" stroke="#c9cfdf" stroke-width="3"/>
    <rect x="560" y="395" width="80" height="40" rx="10" fill="#cfd6e6" stroke="${INK}" stroke-width="3.5"/>
    <rect x="576" y="402" width="48" height="33" rx="8" fill="#9aa5bf" stroke="${INK}" stroke-width="3"/>
    <circle cx="530" cy="362" r="15" fill="#2a3566" stroke="${INK}" stroke-width="3.5" class="win"/>
    <circle cx="600" cy="350" r="17" fill="#2a3566" stroke="${INK}" stroke-width="3.5" class="win"/>
    <circle cx="670" cy="362" r="15" fill="#2a3566" stroke="${INK}" stroke-width="3.5" class="win"/>
    <g id="winGlow" opacity="0"><circle cx="530" cy="362" r="34" fill="url(#warm)"/><circle cx="600" cy="350" r="38" fill="url(#warm)"/><circle cx="670" cy="362" r="34" fill="url(#warm)"/></g>
    <rect x="545" y="322" width="110" height="16" rx="8" fill="#ff7a59" stroke="${INK}" stroke-width="2.5"/>
    <text x="600" y="334" text-anchor="middle" class="svglabel" font-size="11">OUTPOST ZERO</text>

    <g id="flagWrap"><line x1="600" y1="314" x2="600" y2="222" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="600" cy="220" r="4" fill="#ffd23f" stroke="${INK}" stroke-width="2"/>
    <g id="usflag" transform="translate(602 226)"><rect x="0" y="0.00" width="84" height="3.69" fill="#d62839"/><rect x="0" y="3.69" width="84" height="3.69" fill="#fff"/><rect x="0" y="7.38" width="84" height="3.69" fill="#d62839"/><rect x="0" y="11.08" width="84" height="3.69" fill="#fff"/><rect x="0" y="14.77" width="84" height="3.69" fill="#d62839"/><rect x="0" y="18.46" width="84" height="3.69" fill="#fff"/><rect x="0" y="22.15" width="84" height="3.69" fill="#d62839"/><rect x="0" y="25.85" width="84" height="3.69" fill="#fff"/><rect x="0" y="29.54" width="84" height="3.69" fill="#d62839"/><rect x="0" y="33.23" width="84" height="3.69" fill="#fff"/><rect x="0" y="36.92" width="84" height="3.69" fill="#d62839"/><rect x="0" y="40.62" width="84" height="3.69" fill="#fff"/><rect x="0" y="44.31" width="84" height="3.69" fill="#d62839"/><rect x="0" y="0" width="36" height="25.85" fill="#1c3f94"/><circle cx="4.0" cy="3.2" r="1.1" fill="#fff"/><circle cx="10.2" cy="3.2" r="1.1" fill="#fff"/><circle cx="16.4" cy="3.2" r="1.1" fill="#fff"/><circle cx="22.6" cy="3.2" r="1.1" fill="#fff"/><circle cx="28.8" cy="3.2" r="1.1" fill="#fff"/><circle cx="35.0" cy="3.2" r="1.1" fill="#fff"/><circle cx="7.1" cy="7.4" r="1.1" fill="#fff"/><circle cx="13.3" cy="7.4" r="1.1" fill="#fff"/><circle cx="19.5" cy="7.4" r="1.1" fill="#fff"/><circle cx="25.7" cy="7.4" r="1.1" fill="#fff"/><circle cx="31.9" cy="7.4" r="1.1" fill="#fff"/><circle cx="4.0" cy="11.6" r="1.1" fill="#fff"/><circle cx="10.2" cy="11.6" r="1.1" fill="#fff"/><circle cx="16.4" cy="11.6" r="1.1" fill="#fff"/><circle cx="22.6" cy="11.6" r="1.1" fill="#fff"/><circle cx="28.8" cy="11.6" r="1.1" fill="#fff"/><circle cx="35.0" cy="11.6" r="1.1" fill="#fff"/><circle cx="7.1" cy="15.8" r="1.1" fill="#fff"/><circle cx="13.3" cy="15.8" r="1.1" fill="#fff"/><circle cx="19.5" cy="15.8" r="1.1" fill="#fff"/><circle cx="25.7" cy="15.8" r="1.1" fill="#fff"/><circle cx="31.9" cy="15.8" r="1.1" fill="#fff"/><circle cx="4.0" cy="20.0" r="1.1" fill="#fff"/><circle cx="10.2" cy="20.0" r="1.1" fill="#fff"/><circle cx="16.4" cy="20.0" r="1.1" fill="#fff"/><circle cx="22.6" cy="20.0" r="1.1" fill="#fff"/><circle cx="28.8" cy="20.0" r="1.1" fill="#fff"/><circle cx="35.0" cy="20.0" r="1.1" fill="#fff"/><circle cx="7.1" cy="24.2" r="1.1" fill="#fff"/><circle cx="13.3" cy="24.2" r="1.1" fill="#fff"/><circle cx="19.5" cy="24.2" r="1.1" fill="#fff"/><circle cx="25.7" cy="24.2" r="1.1" fill="#fff"/><circle cx="31.9" cy="24.2" r="1.1" fill="#fff"/><rect x="0" y="0" width="84" height="48" fill="none" stroke="${INK}" stroke-width="2.5"/></g></g>
    <g id="soilroof" opacity="0"><path d="M478 392 Q480 300 600 296 Q720 300 722 392 L710 380 Q710 318 600 312 Q490 318 490 380Z" fill="${ground2}" stroke="${INK}" stroke-width="3"/><circle cx="540" cy="320" r="5" fill="${hill}"/><circle cx="660" cy="318" r="6" fill="${hill}"/></g>
  </g>
  <g id="zzz" opacity="0"><text x="625" y="300" class="zzz">z</text><text x="640" y="282" class="zzz">z</text><text x="657" y="262" class="zzz">Z</text></g>

  <g id="antenna">
    <path d="M778 438 L778 318" stroke="${INK}" stroke-width="6"/>
    <path d="M760 438 L796 438" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <g id="dish" transform="translate(778 318) rotate(-35)">
      <path d="M-34 0 Q0 30 34 0 Z" fill="#e9edf6" stroke="${INK}" stroke-width="3.5"/>
      <line x1="0" y1="10" x2="0" y2="-20" stroke="${INK}" stroke-width="3"/><circle cy="-22" r="4" fill="${INK}"/>
    </g>
    <circle id="antLight" cx="778" cy="300" r="6" fill="#ff5c7a" stroke="${INK}" stroke-width="2"/>
  </g>

  <g id="gh">
    <ellipse cx="905" cy="476" rx="92" ry="10" fill="#000" opacity=".18"/>
    <rect x="815" y="460" width="180" height="16" rx="5" fill="#9b6b43" stroke="${INK}" stroke-width="3"/>
    <circle id="growLight" cx="905" cy="430" r="100" fill="url(#purple)" opacity="0"/>
    <g id="plants">${plant(845, 0)}${plant(885, 1)}${plant(925, 2)}${plant(965, 3)}</g>
    <path d="M815 462 Q815 372 905 368 Q995 372 995 462" fill="#c8f1ff" fill-opacity=".28" stroke="${INK}" stroke-width="3.5"/>
    <path d="M845 400 Q870 382 900 380" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
  </g>

  <g transform="translate(1100 470)"><g id="reactor" opacity="0">
    <circle id="reactorGlow" cx="0" cy="-40" r="70" fill="url(#green)" opacity=".5"/>
    <rect x="-26" y="-78" width="52" height="78" rx="12" fill="#e9edf6" stroke="${INK}" stroke-width="3.5"/>
    <path d="M-26 -60 H26 M-26 -20 H26" stroke="${INK}" stroke-width="3"/>
    <path d="M-60 -70 L-26 -60 M-60 -40 L-26 -40 M60 -70 L26 -60 M60 -40 L26 -40" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="0" cy="-40" r="9" fill="#5be36b" stroke="${INK}" stroke-width="2.5"/>
  </g></g>

  <path id="beamPath" d="M${SPOTS.antennaTop[0]} ${SPOTS.antennaTop[1]} Q${moon ? '480 120 175 105' : '520 120 232 82'}" stroke="#7fe7ff" stroke-width="3" fill="none" stroke-dasharray="8 10" opacity="0"/>
  <circle id="pulse" r="9" fill="#7fe7ff" stroke="#fff" stroke-width="3" opacity="0"/>
  <g id="beamLabel" opacity="0"><rect x="380" y="150" width="240" height="40" rx="20" fill="#0d1440" stroke="#7fe7ff" stroke-width="2"/><text id="beamText" x="500" y="176" text-anchor="middle" class="svglabel" font-size="17">📡 1.3 seconds</text></g>

  <g id="crewLayer"></g>
  <g id="shield" opacity="0">
    <ellipse cx="600" cy="395" rx="178" ry="118" fill="url(#water)" stroke="#9cf0ff" stroke-width="5"/>
    <path d="M470 330 Q520 285 600 280" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".5"/>
  </g>
  <rect id="nightShade" width="1200" height="560" fill="#050824" opacity="0" pointer-events="none"/>
  <g id="nightLights" opacity="0"><circle cx="530" cy="362" r="30" fill="url(#warm)"/><circle cx="600" cy="350" r="34" fill="url(#warm)"/><circle cx="670" cy="362" r="30" fill="url(#warm)"/><circle cx="778" cy="300" r="16" fill="url(#warm)"/></g>
  <rect id="dustShade" width="1200" height="560" fill="#d9772f" opacity="0" pointer-events="none"/>
  `;
  // idle loops
  if (window.gsap) {
    gsap.to('#stars .twinkle', { opacity: 0.15, duration: 1.2, yoyo: true, repeat: -1, stagger: { each: 0.15, repeat: -1, yoyo: true } });
    gsap.to('#sun .sunglow', { scale: 1.08, svgOrigin: '0 0', duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to('#antLight', { opacity: 0.25, duration: 0.6, yoyo: true, repeat: -1 });
    gsap.to('#dish', { rotation: -25, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut', svgOrigin: '778 318' });
    gsap.to('#moxie .bub', { y: -16, opacity: 0, duration: 1.4, repeat: -1, stagger: 0.5 });
    gsap.to('#reactorGlow', { opacity: 0.85, duration: 1.1, yoyo: true, repeat: -1 });
    if (moon) animateEarth('earth', 40);
    gsap.fromTo('#stationWrap', { x: -200, y: 70 }, { x: 1400, y: 40, duration: 45, repeat: -1, ease: 'none', delay: 2 });
    gsap.to('#station', { rotation: 8, svgOrigin: '0 0', duration: 6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to('.stationlight', { opacity: 0.15, duration: 0.6, yoyo: true, repeat: -1 });
    gsap.to('#usflag', { skewY: 6, scaleX: 0.94, transformOrigin: '0% 50%', duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
}

// ---------- crew ----------

export function placeCrew(crewDefs) {
  const layer = document.getElementById('crewLayer');
  layer.innerHTML = crewDefs.map((c) => astronautSVG(c.id, c.color, c.dark, { scale: 1.4, skin: c.skin, hair: c.hair, style: c.style })).join('');
  crewDefs.forEach((c, i) => {
    const el = document.getElementById(`crew-${c.id}`);
    gsap.set(el, { x: SPOTS.door[0] - 95 + i * 95, y: SPOTS.door[1] + 20 });
    idle(el, i);
  });
}

function idle(el, i) {
  gsap.to(el.querySelector('.astro-body'), { y: -4, duration: 0.9 + i * 0.13, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  const eyes = el.querySelector('.eyes');
  gsap.timeline({ repeat: -1, repeatDelay: 2.2 + i }).to(eyes, { scaleY: 0.1, transformOrigin: '50% 50%', duration: 0.08 }).to(eyes, { scaleY: 1, duration: 0.08 });
  gsap.to(el.querySelector('.arm-r'), { rotation: -12, transformOrigin: '50% 8%', duration: 1.1 + i * 0.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to(el.querySelector('.head'), { rotation: 4, transformOrigin: '50% 90%', duration: 1.7 + i * 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to(el.querySelectorAll('.packlight, .helmlight, .blinky'), { opacity: 0.25, duration: 0.5 + i * 0.1, yoyo: true, repeat: -1, stagger: 0.2 });
}

const JOB_SPOT = { fix: SPOTS.fix, explore: SPOTS.explore, farm: SPOTS.farm, rest: SPOTS.rest };

// ---------------------------------------------------------------- explorers wander around while the kid plans
const wanders = {};
function stopWander(id) {
  const w = wanders[id]; if (!w) return;
  w.kill(); delete wanders[id];
  const el = document.getElementById(`crew-${id}`);
  if (el) gsap.set([el.querySelector('.leg-l'), el.querySelector('.leg-r')], { rotation: 0 });
}
export function stopAllWander() { Object.keys(wanders).forEach(stopWander); }
function stroll(tl, el, x, y, from) {
  const dist = Math.hypot(x - from[0], y - from[1]);
  const dur = Math.max(0.6, dist / 110);
  const steps = 2 * Math.max(1, Math.round(dur / 0.36)) - 1;   // odd count: legs end straight
  tl.set(el, { scaleX: x < from[0] ? -1 : 1 })
    .to(el, { x, y, duration: dur, ease: 'sine.inOut' })
    .to(el.querySelector('.leg-l'), { rotation: 22, transformOrigin: '50% 0%', duration: dur / (steps + 1), yoyo: true, repeat: steps }, '<')
    .to(el.querySelector('.leg-r'), { rotation: -22, transformOrigin: '50% 0%', duration: dur / (steps + 1), yoyo: true, repeat: steps }, '<');
  return [x, y];
}
// show the chosen job right away: explorers walk out and roam the surface, everyone else walks to their spot
export function previewJob(id, job, idx = 0) {
  const el = document.getElementById(`crew-${id}`); if (!el || !window.gsap) return;
  stopWander(id);
  gsap.killTweensOf(el);
  gsap.set(el, { opacity: 1 });
  const tl = gsap.timeline();
  let at = [gsap.getProperty(el, 'x'), gsap.getProperty(el, 'y')];
  if (job === 'explore') {
    // walk out, then roam: random stops on the right side of the base, look around at each stop
    at = stroll(tl, el, 760 + idx * 70 + Math.random() * 40, 510 + idx * 8, at);
    const loop = gsap.timeline({ repeat: -1 });
    let p = at;
    for (let k = 0; k < 4; k++) {
      const x = 720 + Math.random() * 280, y = 505 + Math.random() * 30;
      p = stroll(loop, el, x, y, p);
      loop.to(el.querySelector('.head'), { rotation: k % 2 ? -10 : 10, transformOrigin: '50% 90%', duration: 0.4, yoyo: true, repeat: 1 })
        .to({}, { duration: 0.5 + Math.random() * 0.8 });
    }
    p = stroll(loop, el, at[0], at[1], p);            // come back to the start so the loop is seamless
    tl.add(loop);
  } else {
    const spot = { fix: SPOTS.fix, farm: SPOTS.farm }[job];
    const x = spot ? spot[0] + (idx - 1) * 40 : SPOTS.door[0] - 95 + idx * 95;
    const y = spot ? spot[1] : SPOTS.door[1] + 20;
    stroll(tl, el, x, y, at);
    tl.set(el, { scaleX: 1 });
  }
  wanders[id] = tl;
}

export function moveCrew(jobs, order) {
  stopAllWander();
  const tl = gsap.timeline();
  order.forEach((id, i) => {
    const el = document.getElementById(`crew-${id}`);
    if (!el) return;
    const job = jobs[id];
    const [x, y] = JOB_SPOT[job] || SPOTS.door;
    const off = (i - 1) * 64;
    const tx = x + (job === 'rest' ? off : off * 0.6), ty = y + (job === 'explore' ? i * 6 : 0);
    const cur = gsap.getProperty(el, 'x');
    gsap.set(el, { scaleX: tx < cur ? -1 : 1 });
    tl.to(el, { opacity: 1, duration: 0.01 }, 0)
      .to(el, { x: tx, y: ty, duration: calm ? 0.4 : 1.4, ease: 'power1.inOut' }, i * 0.15)
      .to(el.querySelector('.leg-l'), { rotation: 22, transformOrigin: '50% 0%', duration: 0.18, yoyo: true, repeat: calm ? 1 : 7 }, i * 0.15)
      .to(el.querySelector('.leg-r'), { rotation: -22, transformOrigin: '50% 0%', duration: 0.18, yoyo: true, repeat: calm ? 1 : 7 }, i * 0.15);
    if (job === 'rest') tl.to(el, { opacity: 0, duration: 0.3 }, '>-0.2');
  });
  const resting = order.some((id) => jobs[id] === 'rest');
  tl.to('#zzz', { opacity: resting ? 1 : 0, duration: 0.4 });
  return tl;
}

export function cheerCrew() {
  document.querySelectorAll('#crewLayer .astro').forEach((el, i) => {
    gsap.timeline({ delay: i * 0.1 }).to(el, { opacity: 1, duration: 0.01 })
      .to(el.querySelector('.astro-body'), { y: -40, duration: 0.25, yoyo: true, repeat: 3, ease: 'power2.out' })
      .to(el.querySelector('.arm-l'), { rotation: 150, transformOrigin: '50% 8%', duration: 0.2 }, 0)
      .to(el.querySelector('.arm-r'), { rotation: -150, transformOrigin: '50% 8%', duration: 0.2 }, 0)
      .to([el.querySelector('.arm-l'), el.querySelector('.arm-r')], { rotation: 0, duration: 0.3 }, '>');
  });
}

export function worryCrew() {
  document.querySelectorAll('#crewLayer .mouth').forEach((m) => m.setAttribute('d', 'M-5 -71 Q0 -75 5 -71'));
  setTimeout(() => document.querySelectorAll('#crewLayer .mouth').forEach((m) => m.setAttribute('d', 'M-5 -74 Q0 -69 5 -74')), 3500);
}

// ---------- world state ----------

export function setBattery(frac) {
  const n = Math.round(frac * 5);
  for (let i = 0; i < 5; i++) {
    const b = document.getElementById(`bb${i}`);
    if (b) gsap.to(b, { opacity: i < n ? 1 : 0.12, fill: n <= 1 ? '#ff5c5c' : n <= 2 ? '#ffc23f' : '#3ee07a', duration: 0.4 });
  }
}

export function setNight(on, world) {
  const d = calm ? 0.3 : 2.2;
  gsap.to('#skyNightRect', { opacity: on ? 1 : 0, duration: d });
  gsap.to('#nightShade', { opacity: on ? 0.5 : 0, duration: d });
  gsap.to('#nightLights', { opacity: on ? 1 : 0, duration: d });
  gsap.to('#winGlow', { opacity: on ? 1 : 0, duration: d });
  gsap.to('#sun', { y: on ? 420 : 0, duration: d, ease: 'power1.inOut' });
  if (world === 'mars') gsap.to('#stars', { opacity: on ? 1 : 0, duration: d });
}

export function setDust(on, dirty) {
  gsap.to('#dustShade', { opacity: on ? 0.42 : 0, duration: calm ? 0.3 : 1.5 });
  gsap.to('#sun', { opacity: on ? 0.25 : 1, duration: 1.5 });
  gsap.to('#dirt', { opacity: dirty ? 1 : 0, duration: 0.6 });
}

export function setShield(blocks, flash = false) {
  const op = blocks >= 4 ? 0.95 : blocks === 3 ? 0.75 : blocks === 2 ? 0.55 : blocks === 1 ? 0.3 : 0;
  gsap.to('#shield', { opacity: op, duration: 0.5 });
  if (flash && op) gsap.fromTo('#shield ellipse', { attr: { 'stroke-width': 5 } }, { attr: { 'stroke-width': 14 }, duration: 0.25, yoyo: true, repeat: 5 });
}

export function setUpgrades(list) {
  gsap.to('#panelsExtra', { opacity: list.includes('panels') ? 1 : 0, duration: 0.6 });
  gsap.to('#reactor', { opacity: list.includes('reactor') ? 1 : 0, duration: 0.6 });
  gsap.to('#moxie', { opacity: list.includes('moxie') ? 1 : 0, duration: 0.6 });
  gsap.to('#soilroof', { opacity: list.includes('soilroof') ? 1 : 0, duration: 0.6 });
}

export function popUpgrade(id) {
  const target = { panels: '#panelsExtra', reactor: '#reactor', moxie: '#moxie', soilroof: '#soilroof', battery: '#batt', tanks: '#hab' }[id];
  if (target) gsap.fromTo(target, { y: -260 }, { y: 0, duration: 1.1, ease: 'bounce.out' });
}

export function setGreenhouse(grow, powered, growDays) {
  const stage = Math.min(1, grow / growDays);
  gsap.to('#plants .plant-grow', { scaleY: 0.12 + stage * 0.88, scaleX: 0.5 + stage * 0.5, transformOrigin: '50% 100%', duration: 0.8, ease: 'back.out(2)', stagger: 0.08 });
  gsap.to('#plants .plant-grow path', { opacity: 1, duration: 0.3 });
  gsap.to('#growLight', { opacity: powered ? 1 : 0, duration: 0.6 });
}

export function wiltPlants() {
  gsap.to('#plants .plant-grow', { rotation: 35, svgOrigin: '0 0', duration: 0.8, yoyo: true, repeat: 1 });
}

export function harvest() {
  gsap.fromTo('#plants .plant-grow', { scale: 1 }, { scale: 1.25, transformOrigin: '50% 100%', duration: 0.25, yoyo: true, repeat: 3, stagger: 0.05 });
}

export function radioBeam(world, delayLabel) {
  const moon = world === 'moon';
  document.getElementById('beamText').textContent = moon ? '📡 1.3 seconds to Earth' : `📡 ${delayLabel}… (sped up!)`;
  const tl = gsap.timeline();
  tl.set('#pulse', { opacity: 1 })
    .to('#beamPath', { opacity: 0.9, duration: 0.2 })
    .to('#beamLabel', { opacity: 1, duration: 0.2 }, 0)
    .to('#pulse', { duration: calm ? 0.5 : moon ? 1.3 : 3.2, ease: moon ? 'none' : 'power1.in', motionPath: { path: '#beamPath', align: '#beamPath', alignOrigin: [0.5, 0.5] } }, 0)
    .to('#beamPath', { strokeDashoffset: -60, duration: moon ? 1.3 : 3.2, ease: 'none' }, 0)
    .to(['#beamPath', '#pulse', '#beamLabel'], { opacity: 0, duration: 0.4 });
  return tl;
}

export function sunPulse(big) {
  return gsap.timeline()
    .to('#sun', { scale: big ? 1.5 : 1.3, svgOrigin: '0 0', duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut' })
    .to('#sun .sunface path', { attr: { d: 'M-10 12 Q0 4 10 12' }, duration: 0.1 }, 0);
}
export function sunCalm() { gsap.to('#sun', { scale: 1, duration: 0.3 }); const p = document.querySelector('#sun .sunface path'); if (p) p.setAttribute('d', 'M-12 8 Q0 18 12 8'); }

export function liftoff() {
  const tl = gsap.timeline();
  tl.to('#crewLayer .astro', { opacity: 0, duration: 0.3 })
    .to('#hab', { y: -700, duration: 2.5, ease: 'power2.in' })
    .to('#hab', { y: 0, opacity: 0, duration: 0 });
  return tl;
}

// ---------- USA flag + celebration dance ----------
export function usFlagSVG(x, y, w) {
  const h = w * 0.57, sh = h / 13;
  let st = '';
  for (let i = 0; i < 13; i++) st += `<rect x="${x}" y="${(y + i * sh).toFixed(2)}" width="${w}" height="${sh.toFixed(2)}" fill="${i % 2 ? '#fff' : '#d62839'}"/>`;
  let stars = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) stars += `<circle cx="${(x + 2.4 + c * w * 0.1 + (r % 2) * w * 0.05).toFixed(1)}" cy="${(y + 2.2 + r * sh * 1.7).toFixed(1)}" r="${(w * 0.012).toFixed(2)}" fill="#fff"/>`;
  return `${st}<rect x="${x}" y="${y}" width="${(w * 0.42).toFixed(1)}" height="${(sh * 7).toFixed(2)}" fill="#1c3f94"/>${stars}<rect x="${x}" y="${y}" width="${w}" height="${h.toFixed(2)}" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
}

/** The crew dances (mission complete) or waves goodbye (early end), each waving a USA flag. */
export function danceParty(el, crewDefs, mode = 'dance') {
  el.innerHTML = `<svg viewBox="-250 -325 560 340" class="dancesvg" role="img" aria-label="The crew ${mode === 'dance' ? 'dances' : 'waves'} with USA flags">
    <ellipse cx="25" cy="6" rx="270" ry="14" fill="#000" opacity=".12"/>
    ${crewDefs.map((c, i) => `<g transform="translate(${(i - 1) * 165} 0)">${astronautSVG(c.id, c.color, c.dark, { idPrefix: 'dance', scale: 1.6, skin: c.skin, hair: c.hair, style: c.style })}</g>`).join('')}
  </svg>`;
  // a flag held high above each right hand
  crewDefs.forEach((c) => {
    const body = el.querySelector(`#dance-${c.id} .astro-body`);
    if (!body) return;
    body.insertAdjacentHTML('beforeend', `<g class="flagpole"><line x1="34" y1="-70" x2="34" y2="-158" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><circle cx="34" cy="-160" r="3.5" fill="#ffd23f" stroke="${INK}" stroke-width="1.5"/><g class="handflag">${usFlagSVG(35, -157, 46)}</g></g>`);
    gsap.set(el.querySelector(`#dance-${c.id} .arm-r`), { rotation: -165, transformOrigin: '50% 8%' });
  });
  const astros = el.querySelectorAll('.astro');
  astros.forEach((a, i) => {
    const body = a.querySelector('.astro-body');
    const flag = a.querySelector('.handflag');
    gsap.to(flag, { skewY: 8, scaleX: 0.85, transformOrigin: '0% 50%', duration: 0.35 + i * 0.05, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to(a.querySelector('.flagpole'), { rotation: 12, svgOrigin: '34 -70', duration: 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.1 });
    if (mode !== 'dance') {
      gsap.to(body, { y: -4, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      return;
    }
    const tl = gsap.timeline({ repeat: -1, delay: i * 0.15 });
    tl.to(body, { y: -26, duration: 0.25, ease: 'power2.out' })
      .to(body, { y: 0, duration: 0.25, ease: 'bounce.out' })
      .to(a, { rotation: -10, transformOrigin: '50% 100%', duration: 0.3 }, '<')
      .to(a.querySelector('.leg-l'), { rotation: 35, transformOrigin: '50% 0%', duration: 0.2, yoyo: true, repeat: 1 })
      .to(a, { rotation: 10, duration: 0.3 }, '<')
      .to(a.querySelector('.leg-r'), { rotation: -35, transformOrigin: '50% 0%', duration: 0.2, yoyo: true, repeat: 1 })
      .to(a.querySelector('.arm-l'), { rotation: 160, transformOrigin: '50% 8%', duration: 0.25, yoyo: true, repeat: 1 }, '<')
      .to(body, { y: -34, duration: 0.3, ease: 'power2.out' })
      .to(a, { scaleX: -1, duration: 0.3 }, '<')
      .to(body, { y: 0, duration: 0.3, ease: 'bounce.out' })
      .to(a, { scaleX: 1, rotation: 0, duration: 0.3 });
    gsap.to(a.querySelector('.head'), { rotation: 10, transformOrigin: '50% 90%', duration: 0.3, yoyo: true, repeat: -1 });
  });
}

// ---------- animated Earth: spinning continents, drifting clouds, day/night shadow, glowing atmosphere ----------
// Continents are drawn on a strip 4 radii wide that scrolls behind a circular window, so Earth appears to rotate.
const LAND = [
  'M0.3 -0.75 C0.7 -0.9 1.1 -0.7 1.0 -0.4 C0.9 -0.1 0.7 0 0.6 0.15 C0.5 0.05 0.35 -0.2 0.3 -0.75Z',              // North America
  'M0.75 0.2 C0.95 0.25 1.05 0.45 0.9 0.8 C0.8 0.95 0.68 0.7 0.72 0.45Z',                                     // South America
  'M1.75 -0.7 C2.1 -0.8 2.3 -0.55 2.2 -0.35 C2.35 -0.2 2.3 0.2 2.1 0.6 C1.95 0.75 1.85 0.4 1.8 0.1 C1.6 -0.05 1.6 -0.4 1.75 -0.7Z', // Europe + Africa
  'M2.4 -0.8 C2.9 -0.95 3.5 -0.8 3.4 -0.4 C3.3 -0.15 3.0 -0.1 2.8 -0.2 C2.6 -0.25 2.4 -0.45 2.4 -0.8Z',            // Asia
  'M3.2 0.35 C3.45 0.3 3.6 0.45 3.5 0.6 C3.35 0.7 3.15 0.6 3.2 0.35Z',                                           // Australia
  'M0.45 -0.98 C0.6 -1.02 0.8 -1.0 0.75 -0.9 C0.65 -0.85 0.5 -0.88 0.45 -0.98Z',                                 // Greenland
];
const CLOUDS = ['M0.2 -0.35 q0.3 -0.12 0.6 0', 'M1.3 0.1 q0.35 -0.1 0.7 0.02', 'M2.2 -0.55 q0.25 -0.1 0.5 0', 'M2.9 0.25 q0.3 -0.12 0.6 0', 'M3.6 -0.2 q0.2 -0.08 0.4 0', 'M1.0 0.55 q0.3 -0.1 0.5 0'];
export function earthSVG(id, r, { label = '', labelY = null } = {}) {
  const strip = (dx) => `<g transform="translate(${dx} 0)">${LAND.map((d) => `<path d="${d}" fill="#3fbf6a" stroke="${INK}" stroke-width="${(2.2 / r).toFixed(3)}"/>`).join('')}</g>`;
  const clouds = (dx) => `<g transform="translate(${dx} 0)">${CLOUDS.map((d) => `<path d="${d}" stroke="#fff" stroke-width="${(0.09).toFixed(3)}" fill="none" stroke-linecap="round" opacity=".9"/>`).join('')}</g>`;
  return `<g class="earthball" id="${id}">
    <defs>
      <clipPath id="${id}-clip"><circle r="1"/></clipPath>
      <radialGradient id="${id}-sea" cx=".35" cy=".35"><stop offset="0" stop-color="#5fb4ff"/><stop offset="1" stop-color="#1b56c2"/></radialGradient>
      <radialGradient id="${id}-shade" cx=".25" cy=".3" r=".95"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#020524" stop-opacity=".62"/></radialGradient>
      <radialGradient id="${id}-glow"><stop offset=".78" stop-color="#7fc3ff" stop-opacity=".0"/><stop offset=".9" stop-color="#7fc3ff" stop-opacity=".55"/><stop offset="1" stop-color="#7fc3ff" stop-opacity="0"/></radialGradient>
    </defs>
    <g transform="scale(${r})">
      <circle class="earthglow" r="1.28" fill="url(#${id}-glow)"/>
      <circle r="1" fill="url(#${id}-sea)"/>
      <g clip-path="url(#${id}-clip)">
        <g transform="translate(-2 0)">
          <g class="earthland">${strip(0)}${strip(4)}</g>
          <rect x="0" y="0.86" width="8" height="0.3" fill="#f4f8ff"/>
          <g class="earthclouds">${clouds(0)}${clouds(4)}</g>
        </g>
      </g>
      <circle r="1" fill="url(#${id}-shade)"/>
      <path d="M-0.55 -0.62 Q-0.25 -0.85 0.12 -0.82" stroke="#fff" stroke-width="${(5 / r).toFixed(3)}" fill="none" stroke-linecap="round" opacity=".35"/>
      <circle r="1" fill="none" stroke="${INK}" stroke-width="${(3 / r).toFixed(3)}"/>
    </g>
    ${label ? `<text y="${labelY ?? r + 26}" text-anchor="middle" class="svglabel">${label}</text>` : ''}
  </g>`;
}
export function animateEarth(id, seconds = 40) {
  if (!window.gsap) return;
  gsap.fromTo(`#${id} .earthland`, { x: 0 }, { x: -4, duration: seconds, ease: 'none', repeat: -1 });
  gsap.fromTo(`#${id} .earthclouds`, { x: 0 }, { x: -4, duration: seconds * 0.6, ease: 'none', repeat: -1 });
  gsap.to(`#${id} .earthglow`, { scale: 1.06, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}

/** One astronaut floating in space, waving a USA flag (title screen, cover art). */
export function flagAstronaut(el, c) {
  el.innerHTML = `<svg viewBox="-120 -330 300 360" class="flagastro" overflow="visible">
    ${astronautSVG(c.id, c.color, c.dark, { idPrefix: 'title', scale: 1.9, skin: c.skin, hair: c.hair, style: c.style })}</svg>`;
  const body = el.querySelector('.astro-body');
  body.insertAdjacentHTML('beforeend', `<g class="flagpole"><line x1="34" y1="-70" x2="34" y2="-158" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><circle cx="34" cy="-160" r="3.5" fill="#ffd23f" stroke="${INK}" stroke-width="1.5"/><g class="handflag">${usFlagSVG(35, -157, 52)}</g></g>`);
  el.querySelector('.astro-shadow').remove();
  if (!window.gsap) return;
  gsap.set(el.querySelector('.arm-r'), { rotation: -165, transformOrigin: '50% 8%' });
  gsap.to(el.querySelector('.handflag'), { skewY: 8, scaleX: 0.86, transformOrigin: '0% 50%', duration: 0.45, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to(el.querySelector('.flagpole'), { rotation: 10, svgOrigin: '34 -70', duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to(el.querySelector('.arm-l'), { rotation: 40, transformOrigin: '50% 8%', duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to(el, { y: -18, rotation: 4, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}
