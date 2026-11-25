/**
 * /api/xp — a family's experience points in four columns, worked out on read (spine:experience-points).
 *
 *   GET /api/xp?family=<name>[&at=<ISO>][&credits=<N>[&supporter=<handle>]]   (buyer= is read as supporter=)
 *     { family, at, beat, law, columns: { players, bringers, makers, beach }, commons, agents,
 *       shares?: { credits, supporter: { handle, credits } | null, columns, by: [{ handle, credits, from: { players, bringers,
 *       makers, beach } }], commons, commonsFrom }, split?: { <handle>: credits, commons } }
 *   GET /api/xp?ledger=<name>      the weightings, run over ledger:<name> (spine:shore 1.1112), all sums in pence
 *     { ledger, at, lines, unit, method, read, given, shared, anything, paid, held, families: { <family>: { sums, pence } },
 *       by: [{ handle, earned, paid, could, from: { players, bringers, makers, beach } }], commons, commonsFrom }
 *
 * Experience points are human time, counted in active beats (the clock's pscale 0, eighty-one a day) in
 * which a person did something on the beach that can be checked (spine:experience-points 1.1). One line a
 * beat makes four pots, each a different reading of the same lines, so the four always total the same
 * (1.11): the players' pot counts each person's own beats; the bringers' pot gives each beat to whoever
 * brought that person, divided equally along the chain back (1.111, David's CHAIN); the makers' pot gives
 * each beat to the makers the family's own law names, equally (1.1111, David's GO); the beach's pot gives
 * each beat to the beach, as the family's law names it. A beat nobody can be named for in a pot goes to the
 * commons (1.1114). Agents count nothing, and an agent's making is its person's (1.15): the agents are the handles named
 * on an 'agents:' line in function:experience-points (2.11) or in the family's own law, never guessed from a passport.
 *
 * For a proposal (contract type two, a family's own four columns) the acts are what already stands, with no
 * new write: each line a person said in their own mirror <name>:<handle> (an answer, a reading at a part,
 * a Builder line), each line they said in its room (pool:<name>, or the room its law names at 3), and each
 * knot they tied on its threads (the threads its law names at 5, in thread:<handle>). A room line carries
 * its stamp, so it counts once per beat; a mirror line or a knot carries none, so each counts as one act,
 * one beat (1.16: one beat per act), and a mirror born after the moment asked about counts nothing.
 * Who brought a person is read off the String: they answered someone's share of this family's page, the
 * earliest such answer counting (string.md; theme.js passedOn), and that sharer's own bringer before them.
 *
 * With credits=N it also says how N credits made at that moment are shared (the support ticket at the
 * moment of payment, credits.proposals.1): a supporter who takes part (supporter=<handle>) keeps the share
 * the law's support line names ('the supporter: 50%'; none sends every credit on), to take part and gift
 * with; the rest goes by the four columns, the law's weights (equal unless its support line says
 * otherwise) giving each pot its part, each part split by beats, whole credits by largest remainder,
 * and whatever cannot be named goes to the commons. Nothing is written or kept: anyone can run the same
 * numbers for any moment and get the same answer, which is the point (pool:experience-points 1).
 *
 * With ledger=<name> it runs the weightings over a ledger's lines (function:shore 8): each sum in that names a family is
 * shared as that family's four columns stood when the sum landed, its stamp, each person's exact part of every sum added
 * up and made whole pence once; what the ledger says each was paid comes off, and 'could' is the most they could ask for.
 * A sum for anything, or for a word that names no family's law, is counted and shared by nobody. 'the players: <holder>'
 * in a law's support line sends the players' part to that holder, a game's tournament pot. The working is weigh.js, the
 * same file the lab at /weightings runs on invented blocks, so the lab and this reader agree to the penny.
 */
import weigh from '../weigh.js';
import { mirrorsOf } from './mirrors.js';
import { momentToAddress } from './news.js';

const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const ECONOMY = 'function:experience-points';   // its 'agents:' line (2.11): the handles that count nothing
const MOST_FAMILIES = 24;                        // families one ledger read prepares at most

async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`beach ${r.status}`);
  return r.json();
}
const readBlock = (name) => getJSON(`${BEACH}?block=${encodeURIComponent(name)}`).catch(() => null);

/* ── a family's blocks, read as weigh.js prepares them: its mirrors, its room, the String and its threads, the String
 * and the threads read once for every family a ledger names ── */
async function prepared(family, law, economy, once = {}) {
  const L = weigh.lawOf(law, family);
  const [fam, room, strings, threads] = await Promise.all([
    mirrorsOf(family), readBlock('pool:' + L.room), once.strings || (once.strings = mirrorsOf('string')),
    L.threads.length ? (once.threads || (once.threads = mirrorsOf('thread'))) : Promise.resolve({ mirrors: {} }),
  ]);
  return weigh.prepare({ family, law, economy, fam, room, strings, threads }, momentToAddress);
}

/* ── the four columns at a moment ── */
export async function xpOf(family, at = new Date()) {
  const [law, economy] = await Promise.all([readBlock('function:' + family), readBlock(ECONOMY)]);
  return weigh.xpAt(await prepared(family, law, economy), at);
}

/* ── N credits shared in whole numbers, as a ticket machine writes them (weigh.js) ── */
export const shareOut = weigh.shareOut;

/* ── the weightings, run over a ledger: null where no ledger stands under that name ── */
export async function ledgerRun(name, now = new Date()) {
  const block = await readBlock('ledger:' + name);
  if (!block) return null;
  const lines = weigh.ledgerLines(block);
  const named = [...new Set(lines.filter((l) => l.kind === 'in' && l.family).map((l) => l.family))].slice(0, MOST_FAMILIES);
  const economy = named.length ? await readBlock(ECONOMY) : null;
  const once = {}, preps = {};
  await Promise.all(named.map(async (f) => {
    const law = await readBlock('function:' + f);
    if (law) preps[f] = await prepared(f, law, economy, once);    // a word that names no family's law: a sum for anything
  }));
  const run = weigh.runLedger(lines, preps, { now });
  delete run.trace;
  return { ledger: 'ledger:' + name, at: now.toISOString(), lines: lines.length, ...run };
}

/* ── the door ── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ error: 'GET only' });
  const q = req.query || {}, family = String(q.family || '').trim().toLowerCase();
  if (q.ledger !== undefined) {
    const name = String(q.ledger).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) return res.status(400).json({ error: 'not a ledger name' });
    try {
      const run = await ledgerRun(name);
      if (!run) return res.status(404).json({ error: 'no ledger stands at ledger:' + name });
      res.setHeader('Vercel-CDN-Cache-Control', 'max-age=15, stale-while-revalidate=45');
      return res.status(200).json(run);
    } catch (e) {
      return res.status(502).json({ error: 'the beach could not be read: ' + String(e && e.message ? e.message : e).slice(0, 200) });
    }
  }
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(family)) return res.status(400).json({ error: 'not a family name' });
  const at = q.at ? new Date(String(q.at)) : new Date();
  if (isNaN(at.getTime())) return res.status(400).json({ error: 'at is not a moment (ISO 8601)' });
  const given = q.credits ?? q.n;                       // a machine names the credits n
  const credits = given === undefined ? null : Number(given);
  if (credits !== null && !(Number.isFinite(credits) && credits >= 0 && credits <= 1e9)) return res.status(400).json({ error: 'credits is not a whole number' });
  try {
    const xp = await xpOf(family, at);
    /* the payer, as a machine names them (buyer=): a supporter who takes part keeps the law's share; a quiet one buys in
       the family's fund's own handle (<family>-fund), so neither the ticket nor the book names them, and keeps nothing,
       every credit going on (a grain is the issuer-and-buyer hash anyone can test against a handle, so only a ticket
       bought in the fund's name keeps a quiet supporter out of the book: credits.games.1, ticketing-agent #13) */
    const payer = String(q.supporter ?? q.buyer ?? '');
    if (payer && !/^(fund:)?[A-Za-z0-9_.-]{2,64}$/.test(payer)) return res.status(400).json({ error: 'supporter is not a handle' });
    const supporter = payer.startsWith('fund:') || payer === family + '-fund' ? '' : payer;
    {
      /* a machine reading its split calls this address bare or with n: the split is always answered, on the scale of
         the credits named, else of a million, which a machine splits by share to the cent */
      xp.shares = shareOut(xp, credits === null ? 1e6 : credits, supporter);
      if (credits === null) xp.shares.scale = 'a million, as shares';
      /* the split a ticket machine reads at the moment of payment ({ split: { <handle>: credits } }, the machine's
         credits.to as an https:// address): whole credits that sum to N, the supporter's own share and the commons
         among them, so the machine gives exactly what it is told and nothing is left over */
      const split = {};
      if (xp.shares.supporter) split[xp.shares.supporter.handle] = xp.shares.supporter.credits;
      for (const r of xp.shares.by) split[r.handle] = (split[r.handle] || 0) + r.credits;
      if (xp.shares.commons) split.commons = (split.commons || 0) + xp.shares.commons;
      xp.split = split;
    }
    res.setHeader('Vercel-CDN-Cache-Control', q.at ? 'max-age=300, stale-while-revalidate=600' : 'max-age=15, stale-while-revalidate=45');
    return res.status(200).json(xp);
  } catch (e) {
    return res.status(502).json({ error: 'the beach could not be read: ' + String(e && e.message ? e.message : e).slice(0, 200) });
  }
}
