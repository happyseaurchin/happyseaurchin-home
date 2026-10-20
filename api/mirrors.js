/**
 * /api/mirrors — every mirror of a family, read once for a crowd.
 *
 *   GET /api/mirrors?family=<name>
 *       { family, mirrors: { <handle>: <block> }, touched: { <handle>: iso }, born: { <handle>: iso },
 *         fold: <the bare block <name>, the fold kept for everyone, or null>, now: <the beach's now> }
 *
 * A premiere's room is every person's own mirror of its design, <name>:<handle>, read side by side.
 * Read from each phone, a room of n costs every phone n reads at every look, and a crowd arriving
 * together costs the beach n²: 300 phones in ten minutes at the Brighton room (FLIRT 2026) would have
 * been some 120,000 reads, the beach's whole index among them a thousand times. Read here, the crowd
 * shares one copy: Vercel's CDN keeps it fifteen seconds and serves it a while longer while the next is
 * read, so in each window the beach answers one index and, from a warm instance, only the mirrors that
 * changed, however many phones ask. Nothing is stored or written; every answer is still written by its
 * own person straight to their own mirror on the beach.
 */

const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const MOST = 600;        // mirrors read at most, the latest touched first
const AT_ONCE = 16;      // reads in flight at once, so one window never floods the beach

/* ── the beach, read raw (the same dialect every o-page speaks) ── */
async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`beach ${r.status}`);
  return r.json();
}
const readBlock = (name) => getJSON(`${BEACH}?block=${encodeURIComponent(name)}`);

/* a mirror a warm instance has read, with the touched stamp it was read at: while the index shows the
 * same stamp, it has not been written since, and is not read again */
const SEEN = new Map();

async function room(family) {
  const ix = await getJSON(BEACH);
  const names = (ix.blocks || []).map((b) => (typeof b === 'string' ? b : (b && b.name) || ''));
  const touched = ix.touched || {}, born = ix.born || {};
  const mine = names.filter((n) => n.startsWith(family + ':') && n.indexOf(':', family.length + 1) < 0)
    .sort((a, b) => String(touched[b] || '').localeCompare(String(touched[a] || '')))
    .slice(0, MOST);
  const out = { family, mirrors: {}, touched: {}, born: {}, fold: null, now: ix.now || null };
  let next = 0;
  async function reader() {
    while (next < mine.length) {
      const name = mine[next++], h = name.slice(family.length + 1), ts = touched[name] || '';
      const was = SEEN.get(name);
      let b = was && ts && was.ts === ts ? was.b : null;
      if (!b) {
        try { b = await readBlock(name); } catch { b = was ? was.b : null; }   // a read that fails keeps the last copy
        if (b && ts) SEEN.set(name, { ts, b });
      }
      if (!b) continue;
      out.mirrors[h] = b;
      if (ts) out.touched[h] = ts;
      if (born[name]) out.born[h] = born[name];
    }
  }
  if (SEEN.size > 5000) SEEN.clear();
  const [fold] = await Promise.all([readBlock(family).catch(() => null), ...Array.from({ length: AT_ONCE }, reader)]);
  out.fold = fold;
  return out;
}

/* ── the door ── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const q = req.query || {}, given = String(q.family || ''), family = given.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(family)) return res.status(400).json({ error: 'not a family name' });
  /* one address per family, so the CDN's copy is the one every phone gets: anything else added to the
   * address is sent back to it, and never reaches the beach as a read of every mirror */
  if (given !== family || Object.keys(q).some((k) => k !== 'family')) {
    res.setHeader('Location', '/api/mirrors?family=' + family);
    return res.status(308).end();
  }
  try {
    const r = await room(family);
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=15, stale-while-revalidate=45');
    return res.status(200).json(r);
  } catch (e) {
    return res.status(502).json({ error: 'the beach could not be read: ' + String(e && e.message ? e.message : e).slice(0, 200) });
  }
}
