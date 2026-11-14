// sky.js — turns real NASA DONKI space-weather events into the game's storm schedule.
// Three skies:
//   'archive'  — the May 2024 superstorm, real data embedded (DONKI SEP list + reported flares)
//   'live'     — the last 7 days of real DONKI data, fetched when you play (or from the daily snapshot)
//   'practice' — made-up storms for practice (clearly labeled, never presented as real)

import { MAX_DAYS } from './data.js';

// Real solar energetic particle (SEP) events from NASA DONKI, retrieved 2026-11-13 from
// https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-05-31
export const ARCHIVE_MAY2024 = {
  id: 'may2024',
  title: 'The May 2024 Superstorm',
  start: '2024-05-07',
  source: 'NASA DONKI (particle events) + NASA SDO / NOAA SWPC flare reports',
  seps: [
    { id: '2024-05-09T13:59:00-SEP-001', time: '2024-05-09T13:59Z', inst: 'MODEL: REleASE:ACE/EPAM 15.8-39.8 MeV' },
    { id: '2024-05-09T14:25:00-SEP-001', time: '2024-05-09T14:25Z', inst: 'MODEL: REleASE:SOHO/EPHIN 15.8-39.8 MeV' },
    { id: '2024-05-10T12:59:00-SEP-001', time: '2024-05-10T12:59Z', inst: 'SOHO: COSTEP 15.8-39.8 MeV' },
    { id: '2024-05-10T13:02:00-SEP-001', time: '2024-05-10T13:02Z', inst: 'SOHO: COSTEP 28.2-50.1 MeV' },
    { id: '2024-05-10T13:35:00-SEP-001', time: '2024-05-10T13:35Z', inst: 'GOES-P: SEISS >10 MeV' },
    { id: '2024-05-10T14:50:00-SEP-001', time: '2024-05-10T14:50Z', inst: 'STEREO A: IMPACT 13-100 MeV' },
    { id: '2024-05-11T02:10:00-SEP-001', time: '2024-05-11T02:10Z', inst: 'GOES-P: SEISS >100 MeV' },
    { id: '2024-05-11T04:07:00-SEP-001', time: '2024-05-11T04:07Z', inst: 'STEREO A: IMPACT 13-100 MeV' },
    { id: '2024-05-13T12:44:00-SEP-001', time: '2024-05-13T12:44Z', inst: 'STEREO A: IMPACT 13-100 MeV' },
    { id: '2024-05-13T13:10:00-SEP-001', time: '2024-05-13T13:10Z', inst: 'MODEL: REleASE:SOHO/EPHIN 15.8-39.8 MeV' },
    { id: '2024-05-13T14:00:00-SEP-001', time: '2024-05-13T14:00Z', inst: 'GOES-P: SEISS >10 MeV' },
    { id: '2024-05-13T16:19:00-SEP-001', time: '2024-05-13T16:19Z', inst: 'MODEL: REleASE:ACE/EPAM 15.8-39.8 MeV' },
    { id: '2024-05-13T18:07:00-SEP-001', time: '2024-05-13T18:07Z', inst: 'SOHO: COSTEP 15.8-39.8 MeV' },
    { id: '2024-05-13T18:07:00-SEP-002', time: '2024-05-13T18:07Z', inst: 'SOHO: COSTEP 28.2-50.1 MeV' },
  ],
  // X-class flares from AR 13664 as reported by NASA SDO, NOAA SWPC and SIDC (dates in UTC).
  flares: [
    { time: '2024-05-05', cls: 'X1.3' }, { time: '2024-05-06', cls: 'X4.5' },
    { time: '2024-05-08', cls: 'X1.0' }, { time: '2024-05-09', cls: 'X2.2' },
    { time: '2024-05-09', cls: 'X1.1' }, { time: '2024-05-10', cls: 'X3.9' },
    { time: '2024-05-11', cls: 'X5.8' }, { time: '2024-05-11', cls: 'X1.5' },
    { time: '2024-05-14', cls: 'X1.7' }, { time: '2024-05-14', cls: 'X1.2' },
    { time: '2024-05-14', cls: 'X8.7' }, { time: '2024-05-15', cls: 'X3.4' },
  ],
};

const DAY_MS = 86400000;
export const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
export const addDays = (iso, n) => isoDay(Date.parse(iso + 'T00:00:00Z') + n * DAY_MS);

export function sepRecordUrl(date) {
  return `https://api.nasa.gov/DONKI/SEP?startDate=${date}&endDate=${date}&api_key=DEMO_KEY`;
}
export function flrRecordUrl(date) {
  return `https://api.nasa.gov/DONKI/FLR?startDate=${date}&endDate=${date}&api_key=DEMO_KEY`;
}

const flareRank = (cls) => {
  const m = /^([ABCMX])(\d+(?:\.\d+)?)/.exec(cls || '');
  if (!m) return 0;
  return { A: 0.001, B: 0.01, C: 0.1, M: 1, X: 10 }[m[1]] * parseFloat(m[2]);
};

/**
 * Build a day-by-day schedule from real events.
 * Returns days[1..MAX_DAYS] = { day, date, flares:[cls], particles, size, estimated, records:[url] }
 * `rng` is only used when `estimate` is true (live sky with no recorded particle events):
 *   a big flare then *may* bring particles the next day — labeled "estimated" in the game.
 */
export function buildSchedule({ start, flares = [], seps = [], estimate = false, rng = Math.random }) {
  const days = [];
  for (let d = 1; d <= MAX_DAYS; d++) {
    const date = addDays(start, d - 1);
    const dayFlares = flares.filter((f) => isoDay(f.time) === date).map((f) => f.cls);
    const daySeps = seps.filter((s) => isoDay(s.time) === date);
    const big = daySeps.some((s) => />\s*100\s*MeV/i.test(s.inst || ''));
    days.push({
      day: d, date, flares: dayFlares,
      particles: daySeps.length > 0, size: big ? 'big' : 'normal',
      estimated: false, sepCount: daySeps.length,
    });
  }
  if (estimate) {
    // No real particle events recorded in this window → estimate from real flares (labeled as an estimate).
    for (let i = 0; i < days.length - 1; i++) {
      const top = Math.max(0, ...days[i].flares.map(flareRank));
      const next = days[i + 1];
      if (next.particles) continue;
      const p = top >= 10 ? 0.5 : top >= 5 ? 0.15 : 0;
      if (p && rng() < p) { next.particles = true; next.size = top >= 50 ? 'big' : 'normal'; next.estimated = true; }
    }
  }
  return days;
}

export function archiveSky() {
  const a = ARCHIVE_MAY2024;
  return {
    kind: 'archive', label: `REAL NASA data · ${a.title} (archive)`, short: 'May 2024 storm',
    start: a.start, schedule: buildSchedule({ start: a.start, flares: a.flares, seps: a.seps }),
    fetchedAt: null, note: 'Real particle storms from NASA DONKI and real flare reports from May 7–13, 2024.',
  };
}

export function practiceSky(rng) {
  const start = '2030-01-01';
  const schedule = [];
  for (let d = 1; d <= MAX_DAYS; d++) {
    const r = rng();
    const flares = r < 0.12 ? ['X' + (1 + Math.floor(rng() * 5))] : r < 0.3 ? ['M' + (1 + Math.floor(rng() * 9))] : [];
    schedule.push({ day: d, date: null, flares, particles: false, size: 'normal', estimated: false, sepCount: 0 });
  }
  for (let i = 0; i < schedule.length - 1; i++) {
    if (schedule[i].flares.some((c) => c[0] === 'X') && rng() < 0.7) {
      schedule[i + 1].particles = true; schedule[i + 1].size = rng() < 0.35 ? 'big' : 'normal';
    }
  }
  return { kind: 'practice', label: 'PRACTICE sky · made-up storms (not real data)', short: 'Practice', start: null, schedule, fetchedAt: null, note: 'These storms are invented for practice.' };
}

/**
 * Live sky: the 7 days ending yesterday (UTC), from NASA DONKI.
 * 1) data/live/donki.json written daily by the GitHub Action (no API key in the browser)
 * 2) else a direct call to api.nasa.gov with the shared DEMO_KEY (rate-limited)
 * Returns null if both fail — the game then says so and offers the archive.
 */
export async function liveSky(rng, { fetchImpl = fetch, today = new Date() } = {}) {
  const end = addDays(isoDay(today), -1);
  const start = addDays(end, -(MAX_DAYS - 1));
  let flares = null, seps = null, fetchedAt = null, via = '';
  try {
    const r = await fetchImpl('data/live/donki.json', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      if (j && j.fetchedAt && Date.now() - Date.parse(j.fetchedAt) < 3 * DAY_MS) {
        flares = j.flares; seps = j.seps; fetchedAt = j.fetchedAt; via = 'daily snapshot';
      }
    }
  } catch (_) { /* fall through */ }
  if (!flares) {
    try {
      const q = `startDate=${start}&endDate=${end}&api_key=DEMO_KEY`;
      const [f, s] = await Promise.all([
        fetchImpl(`https://api.nasa.gov/DONKI/FLR?${q}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
        fetchImpl(`https://api.nasa.gov/DONKI/SEP?${q}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      ]);
      flares = (f || []).map((x) => ({ time: x.peakTime || x.beginTime, cls: x.classType, link: x.link }));
      seps = (s || []).map((x) => ({ id: x.sepID, time: x.eventTime, inst: (x.instruments || []).map((i) => i.displayName).join('; '), link: x.link }));
      fetchedAt = new Date().toISOString(); via = 'NASA API, just now';
    } catch (_) { return null; }
  }
  const hasSep = seps.some((s) => isoDay(s.time) >= start && isoDay(s.time) <= end);
  const schedule = buildSchedule({ start, flares, seps, estimate: !hasSep, rng });
  const when = new Date(fetchedAt).toISOString().slice(0, 10);
  return {
    kind: 'live', label: `LIVE NASA DONKI data · ${start} to ${end} (updated ${when})`, short: 'Live sky',
    start, schedule, fetchedAt, via,
    note: hasSep ? 'Real flares and real particle storms from the last 7 days.'
      : 'Real flares from the last 7 days. No particle storms were recorded, so any particle storm is a game estimate from a real flare.',
  };
}
