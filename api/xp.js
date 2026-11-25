/**
 * /api/xp — a family's experience points in four columns, worked out on read (spine:experience-points).
 *
 *   GET /api/xp?family=<name>[&at=<ISO>][&credits=<N>[&supporter=<handle>]]   (buyer= is read as supporter=)
 *     { family, at, beat, law, columns: { players, bringers, makers, beach }, commons, agents,
 *       shares?: { credits, supporter: { handle, credits } | null, columns, by: [{ handle, credits, from: { players, bringers,
 *       makers, beach } }], commons, commonsFrom }, split?: { <handle>: credits, commons } }
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
 */
import { mirrorsOf } from './mirrors.js';
import { momentToAddress } from './news.js';

const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const SITE = 'https://happyseaurchin.com';
const COMMONS = 'commons';
const POTS = ['players', 'bringers', 'makers', 'beach'];

async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`beach ${r.status}`);
  return r.json();
}
const readBlock = (name) => getJSON(`${BEACH}?block=${encodeURIComponent(name)}`).catch(() => null);

/* ── a block, walked as pscale: digits 1-9 by key, the digit 0 by '_' when it holds a subtree ── */
const textOf = (n) => (typeof n === 'string' ? n.trim() : n && typeof n === 'object' && typeof n._ === 'string' ? n._.trim() : '');
function linesOf(n, path = '', out = []) {
  const t = path ? textOf(n) : '';                     // the root's own line is the mirror's header, never a reading
  if (t) out.push({ path, text: t });
  if (n && typeof n === 'object') {
    for (const k of Object.keys(n)) {
      if (/^[1-9]$/.test(k)) linesOf(n[k], path + k, out);
      else if (k === '_' && n._ && typeof n._ === 'object') linesOf(n._, path + '0', out);
    }
  }
  return out;
}
function nodeAt(b, digits) {
  let n = b;
  for (const c of digits) { if (!n || typeof n !== 'object') return null; n = n[c === '0' ? '_' : c]; }
  return n;
}
/* an accumulator's entries ({_, 1: who, 3: stamp}) wherever the ladder has wrapped them */
function entriesOf(n, out = []) {
  if (!n || typeof n !== 'object') return out;
  for (const k of Object.keys(n)) {
    const v = n[k];
    if (!v || typeof v !== 'object') continue;
    if (/^[1-9]$/.test(k) && typeof v._ === 'string' && typeof v['1'] === 'string') out.push(v);
    if (/^[1-9]$/.test(k) || k === '_') entriesOf(v, out);
  }
  return out;
}
const counted = (t) => t && !/^WITHDRAWN\b/i.test(t);   // a NOT YET is an answer too; a withdrawn line is not
const handleOf = (who) => { const m = /^\s*([A-Za-z0-9_.-]{2,64})\b/.exec(String(who || '')); return m && !/^anon$/i.test(m[1]) ? m[1] : ''; };

/* ── the law: where the room is, which threads are its own, and the support line's conditions ── */
function lawOf(law, family) {
  const lines = linesOf(law || {});
  const room = (lines.find((l) => l.path === '3' && /pool:([a-z0-9-]+)/i.test(l.text)) || {}).text;
  const threads = new Set();
  for (const l of lines) if (l.path[0] === '5') for (const m of l.text.matchAll(/^thread:(\d+)\b/gi)) threads.add(m[1]);
  const page = ((lines.find((l) => /^page:\s*(https?:\/\/\S+)/i.test(l.text)) || {}).text || '').replace(/^page:\s*/i, '').split(/\s/)[0];
  // the support line (any digit, its conditions beneath it): 'SUPPORT — …', then 'makers: a, b', 'the beach: c', 'weights: 1 1 1 1'
  const support = lines.find((l) => /^SUPPORT\b/.test(l.text));
  const under = support ? lines.filter((l) => l.path.startsWith(support.path) && l.path !== support.path) : [];
  const listAfter = (re) => {
    const l = under.find((x) => re.test(x.text)) || lines.find((x) => re.test(x.text));
    if (!l) return [];
    return l.text.replace(re, '').split(/\s[—–-]\s/)[0].split(/[,;]|\band\b/).map((s) => handleOf(s)).filter(Boolean);
  };
  const w = under.map((x) => /^weights:\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(x.text)).find(Boolean);
  // the supporter's own share, to take part and gift with (David, 25 Nov 2026: 'giving people credits to take part in
  // the experience'): 'the supporter: 50%' or 'the supporter: 0.5'; none, or 0, sends every credit to the four columns
  const s = under.map((x) => /^the supporter:\s*([\d.]+)\s*(%)?/i.exec(x.text)).find(Boolean);
  const supporter = s ? Math.min(1, Math.max(0, Number(s[1]) / (s[2] ? 100 : Number(s[1]) > 1 ? 100 : 1))) : 0;
  return {
    room: room ? /pool:([a-z0-9-]+)/i.exec(room)[1] : family,
    threads: [...threads],
    page,
    support: support ? support.path : null,
    makers: listAfter(/^makers:\s*/i),
    beach: listAfter(/^the beach:\s*/i),
    weights: w ? w.slice(1, 5).map(Number) : [1, 1, 1, 1],
    supporter: Number.isFinite(supporter) ? supporter : 0,
  };
}

/* ── agents count nothing (1.15): the handles named on an 'agents:' line in the economy's own law
 * (function:experience-points 2.11), and on one in the family's own law, never guessed from a passport's words, which
 * misread both ways (a person who mentions their Claude, an agent that calls itself a helper: pool:experience-points 7) ── */
const ECONOMY = 'function:experience-points';
function agentsNamed(...laws) {
  const out = new Set();
  for (const b of laws) for (const l of linesOf(b || {})) {
    const m = /^agents:\s*(.*)$/i.exec(l.text);
    if (!m) continue;
    for (const part of m[1].split(/\s[—–-]\s/)[0].split(/[,;]|\band\b/)) { const h = handleOf(part); if (h) out.add(h); }
  }
  return out;
}

/* ── the String: who brought whom to this family's page ── */
function bringersOf(strings, pages) {
  const norm = (u) => { try { const x = new URL(u, SITE); return x.pathname.replace(/\.html$/, '').replace(/(.)\/+$/, '$1').toLowerCase(); } catch { return ''; } };
  const shares = [];                                   // { who, path }
  for (const [h, b] of Object.entries(strings)) {
    for (const l of linesOf(b)) {
      const m = /^SHARE\s+(\S+)/i.exec(l.text);
      if (m && pages.has(norm(m[1]))) shares.push({ who: h, path: l.path });
    }
  }
  shares.sort((a, b) => a.path.localeCompare(b.path));
  const firstBy = {};                                   // person → the sharer of the earliest share of this page they answered
  for (const s of shares) {
    for (const [o, b] of Object.entries(strings)) {
      if (o === s.who || firstBy[o]) continue;
      const a = textOf(nodeAt(b, s.path));
      if (a && !/^(WITHDRAWN|SHARE)\b/i.test(a)) firstBy[o] = s.who;
    }
  }
  return { shares: shares.length, firstBy };
}
function chainOf(h, firstBy, agents) {
  const chain = [], seen = new Set([h]);
  let at = firstBy[h];
  while (at && !seen.has(at) && chain.length < 9) { seen.add(at); if (!agents.has(at)) chain.push(at); at = firstBy[at]; }
  return chain;
}

/* ── the four columns at a moment ── */
export async function xpOf(family, at = new Date()) {
  const [law, economy] = await Promise.all([readBlock('function:' + family), readBlock(ECONOMY)]);
  const L = lawOf(law, family);
  const atMs = at.getTime();
  const [fam, room, strings, threads] = await Promise.all([
    mirrorsOf(family), readBlock('pool:' + L.room), mirrorsOf('string'),
    L.threads.length ? mirrorsOf('thread') : Promise.resolve({ mirrors: {} }),
  ]);

  const acts = {};                                      // handle → { beats: Set (stamped), lines: n (unstamped) }
  const add = (h, beat) => { if (!h) return; const a = acts[h] || (acts[h] = { beats: new Set(), lines: 0 }); if (beat) a.beats.add(beat); else a.lines++; };
  for (const [h, b] of Object.entries(fam.mirrors || {})) {
    const born = Date.parse((fam.born || {})[h] || '');
    if (born && born > atMs) continue;
    for (const l of linesOf(b)) if (counted(l.text)) add(h, null);
  }
  for (const e of entriesOf(room)) {
    const ts = Date.parse(e['3'] || '');
    if (!ts || ts > atMs || /^SUMMARY\b/.test(e._)) continue;
    add(handleOf(e['1']), momentToAddress(new Date(ts)));
  }
  for (const [h, b] of Object.entries(threads.mirrors || {})) {
    for (const n of L.threads) for (const l of linesOf(nodeAt(b, n), n)) if (counted(l.text)) add(h, null);
  }

  const pages = new Set(['/' + family, '/proposal/' + family]);
  if (L.page) { try { pages.add(new URL(L.page).pathname.replace(/\.html$/, '').toLowerCase()); } catch { /* a page line with no address */ } }
  const brought = bringersOf(strings.mirrors || {}, pages);
  const agents = agentsNamed(economy, law);

  const columns = { players: {}, bringers: {}, makers: {}, beach: {} };
  const commons = { players: 0, bringers: 0, makers: 0, beach: 0 };
  const put = (pot, h, v) => { columns[pot][h] = (columns[pot][h] || 0) + v; };
  const makers = L.makers.filter((h) => !agents.has(h)), beach = L.beach.filter((h) => !agents.has(h));
  let total = 0;
  for (const [h, a] of Object.entries(acts)) {
    if (agents.has(h)) continue;
    const beats = a.beats.size + a.lines;
    if (!beats) continue;
    total += beats;
    put('players', h, beats);
    const chain = chainOf(h, brought.firstBy, agents);
    if (chain.length) for (const c of chain) put('bringers', c, beats / chain.length); else commons.bringers += beats;
    if (makers.length) for (const m of makers) put('makers', m, beats / makers.length); else commons.makers += beats;
    if (beach.length) for (const s of beach) put('beach', s, beats / beach.length); else commons.beach += beats;
  }
  return {
    family, at: at.toISOString(), beat: momentToAddress(at), beats: total,
    law: { at: 'function:' + family, support: L.support, room: 'pool:' + L.room, threads: L.threads.map((n) => 'thread:' + n), makers: L.makers, beach: L.beach, weights: L.weights, supporter: L.supporter },
    columns, commons, agents: [...new Set([...Object.keys(acts), ...Object.values(brought.firstBy), ...L.makers, ...L.beach])].filter((h) => agents.has(h)).sort(),
    string: { shares: brought.shares, brought: Object.keys(brought.firstBy).length },
  };
}

/* ── N credits shared: the supporter's own share first, where they take part (the law's 'the supporter:'), then the
 * rest by the four columns, each pot its weighted part, each part by beats, all in whole credits ── */
export function shareOut(xp, credits, supporter = '') {
  const all = Math.max(0, Math.floor(credits)), W = xp.law.weights, sumW = W.reduce((a, b) => a + b, 0) || 4;
  const own = supporter ? Math.floor(all * (xp.law.supporter || 0) + 1e-9) : 0, N = all - own;
  const parts = whole(POTS.map((p, i) => [p, (N * W[i]) / sumW]), N);
  const by = {}, toCommons = { players: 0, bringers: 0, makers: 0, beach: 0 };
  for (const pot of POTS) {
    const part = parts[pot], col = xp.columns[pot], named = Object.values(col).reduce((a, b) => a + b, 0);
    const all = named + xp.commons[pot];
    if (!part) continue;
    if (!all) { toCommons[pot] = part; continue; }
    const got = whole([...Object.entries(col).map(([h, v]) => [h, (part * v) / all]), [COMMONS, (part * xp.commons[pot]) / all]], part);
    for (const [h, n] of Object.entries(got)) {
      if (!n) continue;
      if (h === COMMONS) { toCommons[pot] += n; continue; }
      const row = by[h] || (by[h] = { handle: h, credits: 0, from: { players: 0, bringers: 0, makers: 0, beach: 0 } });
      row.credits += n; row.from[pot] += n;
    }
  }
  const commons = Object.values(toCommons).reduce((a, b) => a + b, 0);
  return { credits: all, supporter: own ? { handle: supporter, credits: own } : null, columns: N,
    by: Object.values(by).sort((a, b) => b.credits - a.credits || a.handle.localeCompare(b.handle)), commons, commonsFrom: toCommons };
}
/* largest remainder: whole numbers that sum to exactly n, ties broken by name so anyone gets the same */
function whole(pairs, n) {
  const out = {}, rest = [];
  let given = 0;
  for (const [k, v] of pairs) { const f = Math.floor(v + 1e-9); out[k] = (out[k] || 0) + f; given += f; rest.push([k, v - f]); }
  rest.sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  for (let i = 0; given < n && rest.length; i = (i + 1) % rest.length) { out[rest[i][0]]++; given++; }
  return out;
}

/* ── the door ── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ error: 'GET only' });
  const q = req.query || {}, family = String(q.family || '').trim().toLowerCase();
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
