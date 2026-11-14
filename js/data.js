// Outpost Zero — game data.
// Every "real" value below carries its source. Values marked GAME are game rules / balance, and the game says so.

export const CREW_SIZE = 3;
export const O2_PER_PERSON = 0.82;          // kg/day — NASA BVAD (0.816 kg)
export const FOOD_PER_PERSON = 1.8;         // kg/day as shipped — NASA ASCEND 2023 logistics
export const RAD_BUDGET = 150;              // mSv — GAME rule: 1/4 of NASA's 600 mSv career limit
export const RAD_GREEN = 100;               // mSv — GAME: green zone for the star
export const MAX_DAYS = 7;                  // GAME
export const ROCKET_DAYS = [2, 4];          // GAME: supply rocket arrives at the end of these days

export const WORLDS = {
  moon: {
    id: 'moon', name: 'The Moon', emoji: '🌑', dayWord: 'day',
    solar: 10,              // GAME: energy blocks on a sunny day
    nightStart: 5,          // GAME: lunar night (real night lasts ~14.5 Earth days — NASA)
    dustSolar: null,
    startBattery: 6, batteryMax: 10,
    startO2: 10, o2Max: 16, // kg (≈4 days of air for 3 people)
    baseDose: 1.37,         // mSv/day — Chang'e 4 LND (Zhang et al. 2020, Science Advances)
    exploreDose: 1.0,       // GAME: extra for going outside
    stormDose: { normal: 40, big: 80 }, // GAME scale of "~100 mSv for a big SEP on the lunar surface" (NASA ASCEND 2025 estimate)
    radioDelay: '1.3 seconds',
    radioDelaySec: 1.3,     // real one-way light time
    facts: [
      ['🌑', 'Night lasts about 14 Earth days'],
      ['📡', 'Radio to Earth: 1.3 seconds'],
      ['☢️', 'High radiation: 1.37 mSv a day'],
    ],
  },
  mars: {
    id: 'mars', name: 'Mars', emoji: '🔴', dayWord: 'sol',
    solar: 7,               // GAME: Mars gets ~40% of Earth's sunlight, so fewer blocks than the Moon
    nightStart: null,
    dustSolar: 2,           // GAME: dust storm blocks most sunlight (2007 storm blocked 99% of direct sunlight — JPL)
    startBattery: 6, batteryMax: 10,
    startO2: 10, o2Max: 16,
    baseDose: 0.67,         // mSv/day — Curiosity RAD (Hassler et al. 2013)
    exploreDose: 0.5,
    stormDose: { normal: 30, big: 60 }, // GAME: Mars' thin air blocks some of it
    radioDelay: '3 to 22 minutes',
    radioDelaySec: 12.5 * 60,
    facts: [
      ['🌪️', 'Dust storms can hide the Sun'],
      ['📡', 'Radio to Earth: 3 to 22 minutes'],
      ['☢️', 'Less radiation: 0.67 mSv a day'],
    ],
  },
};

// Supply-rocket upgrades. GAME values.
export const UPGRADES = {
  reactor:  { id: 'reactor',  icon: '⚛️', name: 'Mini nuclear reactor', text: '+5 power blocks every day AND night', worlds: ['moon', 'mars'], card: 'reactor' },
  panels:   { id: 'panels',   icon: '🔆', name: 'Extra solar panels',  text: '+3 power blocks on sunny days',          worlds: ['moon', 'mars'], card: 'solar' },
  battery:  { id: 'battery',  icon: '🔋', name: 'Big battery',          text: 'Store 8 more power blocks',             worlds: ['moon', 'mars'], card: null },
  soilroof: { id: 'soilroof', icon: '⛰️', name: 'Soil roof',            text: 'Cuts ALL radiation in half, forever',   worlds: ['moon', 'mars'], card: 'soil' },
  moxie:    { id: 'moxie',    icon: '🫧', name: 'Oxygen maker (MOXIE)', text: 'Makes 1 kg of oxygen from Mars air every sol', worlds: ['mars'], card: 'moxie' },
  tanks:    { id: 'tanks',    icon: '🛢️', name: 'Spare air tanks',      text: '+6 kg of oxygen right now',             worlds: ['moon', 'mars'], card: 'o2' },
};

export const JOBS = {
  fix:     { id: 'fix',     icon: '🔧', name: 'Fix',     tip: 'Repair broken machines and clean dusty panels' },
  explore: { id: 'explore', icon: '🔭', name: 'Explore', tip: 'Find science! But outside there is more radiation' },
  farm:    { id: 'farm',    icon: '🌱', name: 'Farm',    tip: 'Help the plants grow more food' },
  rest:    { id: 'rest',    icon: '😴', name: 'Rest',    tip: 'Get energy back' },
};

export const CREW = [
  { id: 'eng', name: 'Ava',  role: 'Engineer',  color: '#ff8a3d', dark: '#d8661c', skin: '#f3c9a6', hair: '#8a3b12', style: 'buns' },
  { id: 'bot', name: 'Leo',  role: 'Botanist',  color: '#36c48a', dark: '#1f9a66', skin: '#9a6440', hair: '#1f1a17', style: 'curls' },
  { id: 'sci', name: 'Mia',  role: 'Scientist', color: '#a77bff', dark: '#7d52d9', skin: '#f6d6b8', hair: '#2b2a55', style: 'bangs' },
];

// Encouragement — PIXEL says these. Kind words for good choices AND for tries.
export const PRAISE = [
  'You are amazing!', 'You are a star! ⭐', 'Great thinking, Commander!', 'Wow, smart choice!',
  'The crew is proud of you!', 'You think like a real NASA engineer!', 'Super job!', 'You rock, space hero!',
  'Brilliant planning!', 'High five! ✋',
];
export const COMFORT = [
  'Great try! Real astronauts practice missions many times.', 'Every mistake teaches us something. You are still a star!',
  'You learned something real today. That is amazing!', 'Mission control believes in you. Try another plan!',
];

// Badges (animated prizes). Checked at the end of each day / mission by sim.badgesEarned().
export const BADGES = {
  shield:   { id: 'shield',   icon: '🛡️', name: 'Storm Shield Hero',  text: 'Kept the crew safe in a real solar storm' },
  night:    { id: 'night',    icon: '🌙', name: 'Night Survivor',     text: 'Made it through the long lunar night' },
  dust:     { id: 'dust',     icon: '🌪️', name: 'Dust Storm Champ',   text: 'Kept power on through a Mars dust storm' },
  science:  { id: 'science',  icon: '🔬', name: 'Science Star',       text: 'Sent lots of science home to Earth' },
  radio:    { id: 'radio',    icon: '📡', name: 'Radio Ace',          text: 'Talked to Earth every single day' },
  farmer:   { id: 'farmer',   icon: '🥬', name: 'Space Farmer',       text: 'Grew your first space harvest' },
  fixer:    { id: 'fixer',    icon: '🔧', name: 'Super Fixer',        text: 'Repaired a broken machine' },
  caring:   { id: 'caring',   icon: '💖', name: 'Caring Commander',   text: 'Nobody got too tired all mission' },
  complete: { id: 'complete', icon: '🚀', name: 'Mission Complete',   text: 'Finished all 7 days' },
};

// Trophies by number of stars (0-3).
export const TROPHIES = [
  { stars: 0, name: 'Brave Explorer Ribbon', medal: 'ribbon', words: 'You tried something really hard. That makes you brave!' },
  { stars: 1, name: 'Bronze Space Medal',    medal: 'bronze', words: 'You are a star! Your crew is home safe.' },
  { stars: 2, name: 'Silver Space Medal',    medal: 'silver', words: 'You are amazing! Almost a perfect mission!' },
  { stars: 3, name: 'Gold Commander Trophy', medal: 'gold',   words: 'PERFECT MISSION! You are a true space superstar!' },
];

// Science Notebook: real facts with sources.
export const CARDS = {
  moonrad: { icon: '☢️', cat: 'rad', big: '200×', kid: 'Moon radiation is 200 times stronger than on Earth!', title: 'Radiation on the Moon', text: 'A Chinese lander, Chang\'e 4, measured radiation on the Moon: about 1.37 mSv every day. That is about 200 times more than on Earth\'s surface!', src: 'Zhang et al. 2020, Science Advances', url: 'https://www.science.org/doi/10.1126/sciadv.aaz1334' },
  marsrad: { icon: '☢️', cat: 'rad', big: '0.67', kid: 'Mars has less radiation than the Moon.', title: 'Radiation on Mars', text: 'NASA\'s Curiosity rover carries a radiation detector called RAD. On Mars it measured about 0.67 mSv a day. Mars\' thin air blocks a little.', src: 'SwRI / NASA Curiosity RAD, 2013', url: 'https://swri.org/node/9079' },
  limit: { icon: '📏', cat: 'rad', big: '600', kid: 'Astronauts have a radiation limit for their whole career.', title: 'How much is too much?', text: 'NASA says an astronaut\'s whole-career radiation must stay under 600 mSv. In our game each mission gets a budget of 150 mSv (that part is a game rule).', src: 'NASA radiation protection brief', url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf' },
  sep: { icon: '☀️', cat: 'sun', big: 'Flash!', kid: 'A flash on the Sun can mean a storm is coming!', title: 'Flash first, particles later', text: 'A solar flare is a flash of light from the Sun. Sometimes it throws out fast particles too. Light arrives first; particles can arrive later. That is why a flash is a warning!', src: 'NASA DONKI space weather database', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' },
  may2024: { icon: '🌞', cat: 'sun', big: 'X8.7', kid: 'In 2024 the Sun made its biggest flare in years!', title: 'The May 2024 superstorm', text: 'In May 2024 one sunspot group made many huge flares, including an X8.7 — the biggest of this solar cycle. It caused the strongest storm at Earth in about 20 years.', src: 'NASA Science', url: 'https://science.nasa.gov/solar-system/solar-physics/how-nasa-tracked-the-most-intense-solar-storm-in-decades/' },
  soil: { icon: '⛰️', cat: 'rad', big: '80 cm', kid: 'A thick blanket of dirt keeps astronauts safe.', title: 'A blanket of dirt', text: 'Scientists say covering a Moon base with thick walls of Moon soil (about 50 to 80 cm) would protect astronauts from much of the radiation.', src: 'Chang\'e 4 radiation team, via AP', url: 'https://abcnews4.com/news/nation-world/new-measurements-show-moon-has-hazardous-radiation-levels' },
  o2: { icon: '💨', cat: 'air', big: '0.82 kg', kid: 'Each astronaut breathes almost 1 kg of oxygen a day!', title: 'How much air do you breathe?', text: 'Each astronaut uses about 0.82 kg of oxygen every day. For 3 astronauts, that is almost 2.5 kg a day!', src: 'NASA Life Support Baseline Values (BVAD)', url: 'https://lifesupportcalc.neocities.org/' },
  recycle: { icon: '♻️', cat: 'air', big: '90%', kid: 'The Space Station recycles almost all its water!', title: 'Recycling in space', text: 'The International Space Station recycles more than 90% of its water, and about half of its oxygen. Every drop counts!', src: 'Frontiers in Space Technologies, 2024', url: 'https://www.frontiersin.org/journals/space-technologies/articles/10.3389/frspt.2024.1461389/full' },
  night: { icon: '🌙', cat: 'power', big: '14 days', kid: 'A night on the Moon lasts 2 whole weeks!', title: 'The long lunar night', text: 'On most of the Moon, night lasts about 14 and a half Earth days. Solar panels make no power in the dark!', src: 'NASA Fission Surface Power project', url: 'https://www.nasa.gov/?p=602427' },
  reactor: { icon: '⚛️', cat: 'power', big: '33 homes', kid: 'NASA is building a tiny power plant for the Moon.', title: 'A nuclear power plant for the Moon', text: 'NASA is working on a small reactor that makes 40 kilowatts — enough for about 33 homes — day and night for 10 years.', src: 'NASA Fission Surface Power project', url: 'https://www.nasa.gov/?p=602427' },
  dust: { icon: '🌪️', cat: 'power', big: '99%', kid: 'Mars dust storms can hide almost all the sunlight!', title: 'Mars dust storms', text: 'In 2007 a dust storm blocked 99% of direct sunlight at NASA\'s Opportunity rover. Its solar power dropped a lot, and it had to rest.', src: 'NASA JPL, via Astronomy magazine', url: 'https://www.astronomy.com/space-exploration/dark-days-for-mars-rovers/' },
  moxie: { icon: '🫧', cat: 'air', big: '122 g', kid: 'A robot made real oxygen on Mars!', title: 'Making oxygen on Mars', text: 'MOXIE, a lunchbox-size machine on the Perseverance rover, made 122 grams of oxygen from Mars air! Future machines could make much more.', src: 'NASA JPL, 2023', url: 'https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/' },
  veggie: { icon: '🥬', cat: 'air', big: '🥬', kid: 'Astronauts grew lettuce in space and ate it!', title: 'Space lettuce', text: 'Astronauts grew red romaine lettuce on the Space Station in a garden called Veggie. It took 33 to 56 days to grow — and they ate it!', src: 'Frontiers in Plant Science, 2020', url: 'https://www.foodnavigator.com/Article/2020/03/18/Space-grown-lettuce-success-Our-growth-techniques-have-many-similarities-to-terrestrial-vertical-farming' },
  csafood: { icon: '🍁', cat: 'air', big: '🍁', kid: 'Canada studies growing food on the Moon.', title: 'Food far from home', text: 'The Canadian Space Agency studies growing food on the Moon — and the same ideas can help people in remote places on Earth grow fresh food.', src: 'Canadian Space Agency food toolkit', url: 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/' },
  delaymoon: { icon: '📡', cat: 'radio', big: '1.3 sec', kid: 'Radio reaches the Moon in about 1 second.', title: 'Hello, Moon!', text: 'Radio travels at the speed of light. It takes about 1.3 seconds to reach the Moon. You can almost have a normal chat!', src: 'Space Academy signal delay table', url: 'https://spaceacademy.net.au/spacelink/commdly.htm' },
  delaymars: { icon: '🐢', cat: 'radio', big: '22 min', kid: 'A message to Mars can take 22 minutes!', title: 'Mars is far, far away', text: 'A message to Mars takes 3 to 22 minutes, one way! Mars astronauts must often decide things by themselves.', src: 'Space Academy signal delay table', url: 'https://spaceacademy.net.au/spacelink/commdly.htm' },
  iss: { icon: '🛰️', cat: 'rad', big: '½', kid: 'The Space Station gets about half the Moon\'s radiation.', title: 'Compare with the Space Station', text: 'In 2019 the Space Station crew got about 0.73 mSv a day — about half of the Moon\'s surface. Earth\'s magnetic field protects them a bit. NASA\'s RadLab has real Space Station dose readings you can explore.', src: 'Sci.News on Chang\'e 4 study; NASA OSDR RadLab', url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/' },
  body: { icon: '💪', cat: 'rad', big: '💪', kid: 'Space changes bones and muscles. Rest helps!', title: 'Space changes the body', text: 'NASA scientists study how space changes bones, muscles and sleep. Rest and exercise help astronauts stay strong. You can explore the real studies in NASA\'s Open Science Data Repository.', src: 'NASA OSDR', url: 'https://osdr.nasa.gov/bio/repo/' },
  sol: { icon: '⏰', cat: 'sun', big: '24h 39m', kid: 'A day on Mars is a little longer than ours.', title: 'What is a sol?', text: 'A "sol" is one day on Mars. It is 24 hours and 39 minutes long — a little longer than a day on Earth.', src: 'NASA Curiosity mission coverage', url: 'https://www.csmonitor.com/Science/2013/1209/Curiosity-measures-radiation-at-Martian-surface' },
  jwst: { icon: '🔭', cat: 'ships', big: '18 mirrors', kid: 'Webb\'s gold mirror has 18 hexagons and sees the first stars!', title: 'James Webb Space Telescope', text: 'Webb has a gold mirror 6.5 meters wide, made of 18 hexagon pieces, and a sunshield as big as a tennis court. It looks at the very first stars and galaxies from about 1.5 million km away.', src: 'NASA Webb mission', url: 'https://science.nasa.gov/mission/webb/' },
  sls: { icon: '🚀', cat: 'ships', big: 'SLS', kid: 'NASA\'s giant SLS rocket launches Artemis missions to the Moon!', title: 'The SLS rocket', text: 'The Space Launch System (SLS) is NASA\'s super-heavy rocket for the Artemis missions. It has an orange core stage and two white boosters, and carries the Orion spacecraft.', src: 'NASA Space Launch System', url: 'https://www.nasa.gov/humans-in-space/space-launch-system/' },
  solar: { icon: '🔆', cat: 'power', big: '40%', kid: 'Sunlight on Mars is weaker than on Earth.', title: 'Sunlight on Mars', text: 'Mars is farther from the Sun, so sunlight there is weaker — less than half as strong as on Earth. Mars bases need big solar panels.', src: 'Mars sunlight ~40% of Earth\'s (approximate)', url: 'https://science.nasa.gov/mars/' },
};

export const CARD_GROUPS = [
  { id: 'rad', icon: '☢️', name: 'Radiation', color: '#c9b6ff' },
  { id: 'air', icon: '💨', name: 'Air & Food', color: '#a9ecff' },
  { id: 'power', icon: '⚡', name: 'Power', color: '#ffe680' },
  { id: 'radio', icon: '📡', name: 'Radio', color: '#b8d4ff' },
  { id: 'sun', icon: '☀️', name: 'Sun & Planets', color: '#ffc9a6' },
  { id: 'ships', icon: '🚀', name: 'Spaceships', color: '#c2f0c8' },
];

// Words PIXEL can explain when tapped.
export const GLOSSARY = {
  dose: 'Radiation dose means how much space radiation your body soaked up. We measure it in mSv (millisieverts).',
  msv: 'mSv (millisievert) is the unit for radiation dose. On Earth you get about 3 mSv in a whole year.',
  sol: 'A sol is one day on Mars: 24 hours and 39 minutes.',
  flare: 'A solar flare is a giant flash on the Sun. Big ones are called X-class.',
  particles: 'Solar particle storms are clouds of super-fast bits from the Sun. They are the dangerous part of a solar storm.',
  shield: 'A shield blocks radiation. Water and soil are good shields because they soak up the particles.',
  lifesupport: 'Life support is the machine that cleans the air and water so astronauts can breathe and drink.',
};
