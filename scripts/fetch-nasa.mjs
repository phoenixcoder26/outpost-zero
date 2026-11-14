// Fetches the last 30 days of NASA DONKI solar flares (FLR) and solar energetic particle events (SEP)
// and saves them to data/live/donki.json for the game's "Live NASA Sky".
// Run by .github/workflows/fetch-nasa.yml every morning. Needs Node 18+ (built-in fetch).
// The API key comes from the NASA_API_KEY secret — it is never put in the website code.
import { writeFile, mkdir } from 'node:fs/promises';

const key = process.env.NASA_API_KEY || 'DEMO_KEY';
const day = (d) => d.toISOString().slice(0, 10);
const end = new Date(); end.setUTCDate(end.getUTCDate() - 1);
const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29);
const q = `startDate=${day(start)}&endDate=${day(end)}&api_key=${key}`;

async function get(type) {
  const r = await fetch(`https://api.nasa.gov/DONKI/${type}?${q}`);
  if (!r.ok) throw new Error(`${type}: HTTP ${r.status}`);
  const t = await r.text();
  return t.trim() ? JSON.parse(t) : [];
}

const [flr, sep] = await Promise.all([get('FLR'), get('SEP')]);
const out = {
  source: 'NASA DONKI via api.nasa.gov',
  fetchedAt: new Date().toISOString(),
  start: day(start), end: day(end),
  flares: flr.map((x) => ({ time: x.peakTime || x.beginTime, cls: x.classType, link: x.link })),
  seps: sep.map((x) => ({ id: x.sepID, time: x.eventTime, inst: (x.instruments || []).map((i) => i.displayName).join('; '), link: x.link })),
};
await mkdir('data/live', { recursive: true });
await writeFile('data/live/donki.json', JSON.stringify(out, null, 2));
console.log(`Saved ${out.flares.length} flares and ${out.seps.length} particle events (${out.start} to ${out.end}).`);
