/**
 * /api/board — a game's board for today, read once for a crowd.
 *
 *   GET /api/board?game=ghost-wire
 *       { game, day, date, top: [{ name, time, slot, at, tries }], runs, players, page, read }
 *
 * The arcade's front door (/arcade) lists every game on the shelf with its top ten today. Ghost Wire has no
 * spine yet (spine:game-arcade 1.2): its page keeps every run in its room, pool:ghost-wire, as the game's own
 * law says (game:ghost-wire 4 — {_: the time in words, 1: '<name>, a visitor', 2: the wire's address, 3: when,
 * 5: the guest name a named phone played under before, 6: who brought them, 7: the run, 8: which try}). This
 * reads the room whole, once a window, keeps the lines of today's wire that carry a run, reads each run's time
 * as the law does (its steps over sixty), names a guest as the name it later took (by 5), takes each player's
 * fastest, sorts, and cuts at ten. It re-runs nothing: a time here is as the room keeps it, and the page says
 * so; the honest board (1.13) is the plug's, a later step. The day is the beach's clock's, turning at midnight
 * UTC: the first eight digits of the sundial's ten, then '00' (game:ghost-wire 1).
 *
 * Read from each phone, the room costs every phone the whole pool (90 kB and growing by the day); here the
 * crowd shares one copy, as /api/mirrors is shared: Vercel's CDN keeps it fifteen seconds and serves it a while
 * longer while the next is read, so however many open the door in a window, the beach answers one read.
 * Nothing is stored or written.
 */

const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const GAMES = {
  'ghost-wire': { room: 'pool:ghost-wire', page: 'https://phenomemental.github.io/happyseaurchin-beach/ghost-wire.html', title: 'Ghost Wire' }
};

/* the sundial's day: year, season (1-4), month in season (1-3), week band (1-5), day in band (1-7), '00' */
function dayAddress(d) {
  const y = d.getUTCFullYear(), m0 = d.getUTCMonth(), dd = d.getUTCDate();
  return String(y) + (Math.floor(m0 / 3) + 1) + (m0 % 3 + 1) + (Math.floor((dd - 1) / 7) + 1) + ((dd - 1) % 7 + 1) + '00';
}
const dateWords = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

async function readBlock(name) {
  const r = await fetch(`${BEACH}?block=${encodeURIComponent(name)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`beach ${r.status}`);
  return r.json();
}

/* every line of the room, with its slot: the digits walked from the root, an underscore read as 0, the
 * floor's own padding left off (the disc shows 024; the game's links say ghost=24) */
function lines(block) {
  const out = [];
  (function walk(node, path) {
    if (!node || typeof node !== 'object') return;
    if (typeof node['7'] === 'string' || typeof node['1'] === 'string') out.push({ slot: path.replace(/^0+/, '') || '0', node });
    Object.keys(node).forEach((k) => { if (k === '_' || /^[1-9]$/.test(k)) walk(node[k], path + (k === '_' ? '0' : k)); });
  })(block, '');
  return out;
}
const voice = (v) => { while (v && typeof v === 'object') v = v._; return typeof v === 'string' ? v : ''; };
const nameOf = (s) => String(s || '').replace(/,\s*a visitor\s*$/i, '').trim();

function board(block, day) {
  const all = lines(block).filter((x) => voice(x.node['2']) === day && typeof x.node['7'] === 'string');
  /* a guest name is read as the name it later took, where a named line says so at 5 */
  const took = {};
  lines(block).forEach((x) => { const g = voice(x.node['5']), n = nameOf(voice(x.node['1'])); if (g && n) took[g] = n; });
  const runs = all.map((x) => {
    const m = /^gw1\.(\d+)\.(\d+)\./.exec(x.node['7']);
    if (!m || m[1] !== day) return null;
    const who = nameOf(voice(x.node['1'])) || 'someone';
    return { name: took[who] || who, time: Math.round(+m[2] / 60 * 100) / 100, slot: x.slot, at: voice(x.node['3']) || '', tries: voice(x.node['8']) || '' };
  }).filter(Boolean);
  const best = {};
  runs.forEach((r) => { if (!best[r.name] || r.time < best[r.name].time) best[r.name] = r; });
  const top = Object.values(best).sort((a, b) => a.time - b.time || a.at.localeCompare(b.at)).slice(0, 10);
  return { top, runs: runs.length, players: Object.keys(best).length };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const q = req.query || {}, given = String(q.game || ''), game = given.trim().toLowerCase();
  if (!GAMES[game]) return res.status(404).json({ error: 'no such game on the shelf', games: Object.keys(GAMES) });
  /* one address per game, so the CDN's copy is the one every phone gets */
  if (given !== game || Object.keys(q).some((k) => k !== 'game')) { res.setHeader('Location', '/api/board?game=' + game); return res.status(308).end(); }
  try {
    const now = new Date(), day = dayAddress(now), g = GAMES[game];
    const block = await readBlock(g.room);
    const b = block ? board(block, day) : { top: [], runs: 0, players: 0 };
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=15, stale-while-revalidate=45');
    return res.status(200).json({ game, title: g.title, page: g.page, room: g.room, day, date: dateWords(now), ...b, read: now.toISOString(), asKept: true });
  } catch (e) {
    return res.status(502).json({ error: 'the beach could not be read: ' + String(e && e.message ? e.message : e).slice(0, 200) });
  }
}
