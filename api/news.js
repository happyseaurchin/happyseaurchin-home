/**
 * /api/news — the news family's door on the site, and its keeper (function:news
 * at the beach). One file on purpose, as every function here is self-contained.
 *
 *   GET /api/news?rung=now|gathering|day|week|month|season|year[&at=<address>]
 *       what the beach made in that period: the keeper's picks where a fold
 *       stands (function:news 2), and for the day and finer the whole wire —
 *       every item made, newest first (function:news 1) — with each item's
 *       answers counted as people and agents apart (function:news 3).
 *   GET /api/news?item=<address>[&s=<source>]
 *       one item: the thing, where it lives, every fold up the ladder that
 *       named it and why, and every answer standing at its address.
 *   GET /api/news?where=1[&at=<address>]
 *       WHERE THINGS ARE HAPPENING, the strip at the top of the day
 *       (spine:happening 1.1): what people said they are doing that day, each
 *       in their own now, people before agents; and while the day runs, who is
 *       on a page or the mirror (presence) and the minds at work at the beat
 *       (torus-mirror); with the tables that took a voice that day. Every part
 *       a read of what already stands, each reported apart, so a part that
 *       cannot be read is said to be unread rather than shown empty.
 *   GET /api/news?keep=1
 *       THE KEEPER'S PASS — the hourly cron (vercel.json). Folds today again
 *       when the wire has moved, seals each closed day once, and re-chooses the
 *       week, month, season and year above it from the folds beneath. It
 *       chooses by the law at function:news 2.6, its own copy below where the
 *       beach cannot be read, and logs what each pass did.
 *
 * The wire is never stored: it is read from what the beach already stamps (the
 * surface index's born and touched maps, each accumulator entry's own stamp at
 * position 3, each table's latest room), so a crowd arriving from a shared
 * link reads one cached copy here instead of each of them reading the beach.
 * The read paths are GET-only and write nothing. Answers are written by each
 * reader straight to their own mirror on the beach, never through here.
 *
 * Env (Vercel project settings) — the read paths need none:
 *   NEWS_KEEPER_SECRET   the latch of the house edition, the bare block `news`.
 *                        The keeper founds the block under it on its first pass.
 *   NEWS_ANTHROPIC_KEY   the key that pays for choosing (its own key, so its cost
 *                        can be watched on its own). Absent: no fold is written
 *                        and the page shows the wire unranked.
 *   NEWS_MODEL           optional; default claude-opus-5-5. claude-haiku-5-5
 *                        is the cheap alternative.
 *   CRON_SECRET          if set, Vercel sends it as a Bearer token on crons and
 *                        the keeper's pass refuses anything else.
 */

import { mirrorsOf } from './mirrors.js';

const BEACH_ORIGIN = 'https://beach.happyseaurchin.com';
const BEACH = BEACH_ORIGIN + '/.well-known/pscale-beach';
const SITE = 'https://happyseaurchin.com';
const HOUSE = process.env.NEWS_HOUSE || 'news';          // a probe: name in tests, never in production
const MODEL = process.env.NEWS_MODEL || 'claude-opus-5-5';
const REFOLD_FLOOR_MS = 20 * 60 * 1000;                  // today is never re-chosen more often than this

/* ── the sundial — momentToAddress, addressToSpan and voiceAddress are
 * pscale-beach lib/temporal.js, itself the port of bsp-mcp src/temporal.ts:
 * re-port, never fork. Only itemAddress (below the beat) is new here. ── */
const DAY_PARTS = ['deep night', 'dawn', 'early morning', 'morning', 'midday',
  'afternoon', 'late afternoon', 'evening', 'night'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function momentToAddress(when) {
  const y = when.getUTCFullYear();
  const month = when.getUTCMonth();
  const dom = when.getUTCDate();
  const secOfDay = when.getUTCHours() * 3600 + when.getUTCMinutes() * 60 + when.getUTCSeconds();
  const partS = 86400 / 9;
  const beatS = partS / 9;
  const part = Math.floor(secOfDay / partS);
  const beat = Math.floor((secOfDay - part * partS) / beatS);
  return [
    Math.floor(y / 1000) % 10, Math.floor(y / 100) % 10, Math.floor(y / 10) % 10, y % 10,
    Math.floor(month / 3) + 1, (month % 3) + 1,
    Math.floor((dom - 1) / 7) + 1, ((dom - 1) % 7) + 1,
    part + 1, beat + 1,
  ].join('');
}

function addressToSpan(addr) {
  const d = addr.split('').map(Number);
  let depth = 10;
  while (depth > 1 && d[depth - 1] === 0) depth--;
  const y = d[0] * 1000 + d[1] * 100 + d[2] * 10 + d[3];
  if (depth <= 4) return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)), pscale: 6 };
  const season = d[4] - 1;
  if (depth === 5) return { start: new Date(Date.UTC(y, season * 3, 1)), end: new Date(Date.UTC(y, season * 3 + 3, 1)), pscale: 5 };
  const month = season * 3 + (d[5] - 1);
  if (depth === 6) return { start: new Date(Date.UTC(y, month, 1)), end: new Date(Date.UTC(y, month + 1, 1)), pscale: 4 };
  const bandStart = (d[6] - 1) * 7 + 1;
  if (depth === 7) {
    const rawEnd = Date.UTC(y, month, bandStart + 7);
    const monthEnd = Date.UTC(y, month + 1, 1);
    return { start: new Date(Date.UTC(y, month, bandStart)), end: new Date(Math.min(rawEnd, monthEnd)), pscale: 3 };
  }
  const dom = bandStart + (d[7] - 1);
  const dayStart = Date.UTC(y, month, dom);
  if (depth === 8) return { start: new Date(dayStart), end: new Date(dayStart + 86400_000), pscale: 2 };
  const partS = 9600_000;
  const pStart = dayStart + (d[8] - 1) * partS;
  if (depth === 9) return { start: new Date(pStart), end: new Date(pStart + partS), pscale: 1 };
  const beatS = partS / 9;
  const bStart = pStart + (d[9] - 1) * beatS;
  return { start: new Date(bStart), end: new Date(bStart + beatS), pscale: 0 };
}

function voiceAddress(addr) {
  const { start, pscale } = addressToSpan(addr);
  const y = start.getUTCFullYear();
  if (pscale === 6) return `${y}`;
  if (pscale === 5) return `${['winter-quarter', 'spring-quarter', 'summer-quarter', 'autumn-quarter'][Math.floor(start.getUTCMonth() / 3)]} ${y}`;
  if (pscale === 4) return `${MONTHS[start.getUTCMonth()]} ${y}`;
  if (pscale === 3) return `the week of ${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]} ${y}`;
  const day = `${WEEKDAYS[start.getUTCDay()]} ${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]} ${y}`;
  if (pscale === 2) return day;
  const part = DAY_PARTS[Number(addr[8]) - 1];
  if (pscale === 1) return `${day}, ${part}`;
  return `${day}, ${part} (beat ${addr[9]})`;
}

/* An item's address: the moment it was made, to the second (function:news 1.2).
 * Below the beat the ladder keeps dividing by nine through the analogue zone —
 * the minute ~2 min, the breath ~13 s, the second ~1.5 s (sundial 1.2) — and an
 * analogue digit never takes a zero. Worked in exact integers (a tick is 1/6561
 * of a millisecond, so every rung from the gathering down is a whole number of
 * ticks) to the millisecond, so a browser doing the same sum gets the same
 * address; the date digits are momentToAddress's own. */
function itemAddress(when) {
  const ms = when.getTime();
  const day0 = Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate());
  let rem = (ms - day0) * 6561;
  const out = [];
  for (const span of [62985600000, 6998400000, 777600000, 86400000, 9600000]) {
    const k = Math.min(8, Math.floor(rem / span));
    out.push(k + 1);
    rem -= k * span;
  }
  return momentToAddress(when).slice(0, 8) + out.slice(0, 2).join('') + '.' + out.slice(2).join('');
}

/* ── the rungs ── */
const RUNG = {
  year: { keep: 4 }, season: { keep: 5 }, month: { keep: 6 }, week: { keep: 7 },
  day: { keep: 8 }, gathering: { keep: 9 }, now: { keep: 10 },
};
const PARENT = { day: 'week', week: 'month', month: 'season', season: 'year' };
const CHILD = { week: 'day', month: 'week', season: 'month', year: 'season' };
const periodOf = (rung, when) => momentToAddress(when).slice(0, RUNG[rung].keep).padEnd(10, '0');
const isPeriod = (a) => /^\d{10}$/.test(a);
const isItemAddress = (a) => /^\d{10}\.[1-9]{1,3}$/.test(a);

/* ── the beach, read raw (the same dialect every o-page speaks) ── */
async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`beach ${r.status} for ${url.slice(0, 120)}`);
  return r.json();
}
const readBlock = (name, origin = BEACH_ORIGIN) =>
  getJSON(`${origin}/.well-known/pscale-beach?block=${encodeURIComponent(name)}`).catch(() => null);
const readIndex = () => getJSON(BEACH);
async function postBeach(body) {
  const r = await fetch(BEACH, {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null; try { data = await r.json(); } catch { /* the status speaks */ }
  return { ok: r.ok, status: r.status, data };
}
async function each(list, n, fn) {
  const out = new Array(list.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length) { const k = i++; out[k] = await fn(list[k], k); }
  }));
  return out;
}

/* ── walking ── */
function floorOf(block) {
  let n = 0, node = block;
  while (node && typeof node === 'object' && '_' in node) { node = node._; n += 1; }
  return n;
}
function walkExact(block, addr) {
  let n = block;
  for (const ch of String(addr).replace('.', '')) {
    if (!n || typeof n !== 'object') return undefined;
    n = ch === '0' ? n._ : n[ch];
  }
  return n;
}
/* a node's own voice: a string, or a string at its underscore (an object there
 * is a zero-child or a floor chain, never this node's words) */
function voiceOf(node) {
  if (typeof node === 'string') return node.trim() || null;
  if (node && typeof node === 'object' && typeof node._ === 'string') return node._.trim() || null;
  return null;
}
/* the root's identity: the end of its underscore chain */
function rootVoice(block) {
  let n = block;
  while (n && typeof n === 'object') n = n._;
  return typeof n === 'string' ? n : '';
}
function clip(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const at = cut.lastIndexOf(' ');
  return (at > n * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:—-]+$/, '') + '…';
}
const isIso = (s) => typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?Z$/.test(s);
const isUrl = (s) => typeof s === 'string' && /^https?:\/\/\S+$/.test(s);
const isImage = (s) => isUrl(s) && /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(s);

/* every entry in an accumulator stamped inside the window: walk the tree, take
 * any object whose position 3 is an instant — the accumulator shape
 * (block-conventions:9) — whatever its slot and however far it supernested */
function entriesIn(block, fromMs, toMs) {
  const out = [];
  (function walk(node, path) {
    if (!node || typeof node !== 'object') return;
    if (path.length && typeof node._ === 'string' && isIso(node['3'])) {
      const t = Date.parse(node['3']);
      if (t >= fromMs && t < toMs) out.push({ slot: path.join(''), entry: node, t });
      return;
    }
    for (const k of Object.keys(node)) if (k !== '_' || typeof node._ === 'object') walk(node[k], path.concat(k === '_' ? '0' : k));
  })(block, []);
  return out;
}
const slotSpindle = (slot) => slot.replace(/^0+/, '');

/* ── what counts as made (function:news 1.3) ── */
const WORKINGS = new Set(['history', 'stash', 'conditions', 'trace', 'surface', 'reflexive', 'torus-mirror',
  'liquid', 'vault', 'review', 'daily', 'watch', 'last-touched', 'located', 'phase', 'phi', 'cadence',
  'capabilities', 'purpose', 'vision', 'relationships', 'task', 'presence', 'wake', 'orientation', 'archive',
  'grain', 'probe', 'flow', 'ear', 'beach-visits', 'now', 'tree', 'lists', 'ahead', 'availability', 'ledger',
  'soft-llm-convos', 'convention', 'scratch', 'shell', 'memory', 'knows', 'witnessed', 'mod', 'note',
  'settings', 'seats', 'roster', 'lanes', 'index', 'keys', 'mint', 'state', 'solid', 'news', 'spine-news',
  'reflective-compass', 'cook', 'brief', 'genome', 'hatch', 'tide', 'marks', 'beach-log', 'field-log',
  'greeter-log', 'gifts', 'neighbour-gifts', 'insights', 'pulse', 'torus', 'meetings', 'ring']);   // births only: the marks board's entries are read below
const TESTISH = /(^|[-:])(test|smoke)([-:]|$)|claude-pipe|bsp-gray|weft-slice|weft-floor|^bob-gt|^g-m1-/i;
const MIRROR_SUFFIX = (name, ix) => {
  const cut = name.indexOf(':');
  return cut > 0 && ix.has('spine:' + name.slice(0, cut)) && !/^(spine|function|pool|view|gallery|passport|proposal|artifacts)$/.test(name.slice(0, cut));
};
function bornKind(name, ix) {
  if (!name || TESTISH.test(name)) return null;
  const cut = name.indexOf(':');
  const prefix = cut > 0 ? name.slice(0, cut) : name;
  const rest = cut > 0 ? name.slice(cut + 1) : '';
  if (WORKINGS.has(prefix)) return null;
  if (MIRROR_SUFFIX(name, ix)) return null;               // a hand's reading in a family: an answer, not a making
  const enc = encodeURIComponent;
  if (prefix === 'passport' && rest) return { kind: 'person', who: rest, open: `${SITE}/page/${enc(rest)}`, lead: `${rest} arrived on the beach` };
  if (prefix === 'pool' && rest) return { kind: 'room', open: `https://mirror.onen.ai/?pool=${enc(rest)}`, lead: `a new room — ${rest}` };
  if (prefix === 'spine' && rest) return { kind: 'family', open: `${SITE}/walk/${enc(rest)}`, lead: `a new family — ${rest}` };
  if (prefix === 'function' && rest) return ix.has('spine:' + rest) ? null : { kind: 'family', open: `${SITE}/render?beach=beach.happyseaurchin.com&block=${enc(name)}`, lead: `a new law — ${rest}` };
  if (prefix === 'gallery' && rest) return { kind: 'gallery', open: `${SITE}/gallery/${enc(rest)}`, lead: `a new gallery — ${rest}` };
  if (prefix === 'view' && rest) return { kind: 'page', open: `${SITE}/view?block=${enc(name)}`, lead: `a new page — ${rest}` };
  if (prefix === 'proposal' && rest) return { kind: 'proposal', open: `${SITE}/render?beach=beach.happyseaurchin.com&block=${enc(name)}`, lead: `a proposal — ${rest}` };
  if (prefix === 'artifacts' && rest) return { kind: 'page', who: rest, open: `${SITE}/render?beach=beach.happyseaurchin.com&block=${enc(name)}`, lead: `${rest}'s map of things made` };
  if (cut > 0) return null;                                // other role-with-handle blocks are someone's workings
  return { kind: 'block', open: `${SITE}/render?beach=beach.happyseaurchin.com&block=${enc(name)}`, lead: `a new block — ${name}` };
}
const beachAt = (name, spindle) =>
  `${BEACH}?block=${encodeURIComponent(name)}${spindle ? '&spindle=' + encodeURIComponent(spindle) : ''}`;

/* ── where a thing opens, and who says they made it (function:news 1.5) ──
 * A family's birth opens the thing itself: the page its law names at 6, 'page:
 * https://…', else the page the proposals list names for it, else its walk. The
 * index stamps when, never who, so a maker is named only where the thing's own
 * words name one: the law's provenance at 9, or a shelf entry's credit. */
const SHELVES = new Set(['animations', 'proposals']);   // a maker's shelf, read by the stamp each entry keeps at 3
function lawPage(law) {
  const m = /^page:\s*(https?:\/\/[^\s<>"']+)/i.exec(voiceOf(law && law['6']) || '');
  return m ? m[1].replace(/[.,;:)]+$/, '') : '';
}
function lawMaker(law) {
  const m = /^PROVENANCE\s*[—–-]\s*(?:written|made|founded|re-founded|drafted|built|brought|re-cut|put up)\b[^.;:]{0,40}?\bby\s+([A-Za-z][\w-]*)/i.exec(voiceOf(law && law['9']) || '');
  return m ? m[1] : '';
}
/* a shelf entry's credit names its maker first: 'Brought by David Pinto on …', 'Made by keel, …' */
function creditMaker(credit) {
  const m = /^(?:brought|made|told|written|drawn|words|built|created|composed)\s+by\s+(.+?)(?=\s+on\s+\d|\s*[,·;(]|\s+at\s+|\s+with\s+|$)/i.exec(String(credit || '').trim());
  return m && m[1].length <= 40 ? m[1].trim() : '';
}
/* an animations entry's credit: at 5 from 27 October 2026, at 3 before (written over its stamp) */
const shelfCredit = (e) => [e['5'], e['3']].map((v) => (typeof v === 'string' ? v.trim() : '')).find((v) => v && !isIso(v)) || '';
/* the proposals list, '<name> — what · <page>' a line: each name's page */
function proposalPages(list) {
  const out = new Map();
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n._ && typeof n._ === 'object') walk(n._);
    for (const k of '123456789') {
      const c = n[k];
      const line = voiceOf(c);
      const m = line && /^([a-z0-9][a-z0-9-]*)\s+—\s+.*·\s*(\S+)\s*$/.exec(line);
      if (m) out.set(m[1], /^https?:\/\//.test(m[2]) ? m[2] : 'https://' + m[2]);
      if (c && typeof c === 'object') walk(c);
    }
  })(list);
  return out;
}
const proposalLine = (line) => { const at = line.lastIndexOf(' · '); return at > 0 ? line.slice(0, at) : line; };
const proposalPage = (line) => { const m = /·\s*(\S+)\s*$/.exec(line); return m ? (/^https?:\/\//.test(m[1]) ? m[1] : 'https://' + m[1]) : ''; };

/* ── agents, until passports say so (function:news 3.2–3.3) ── */
async function readAgents() {
  const law = await readBlock('function:news');
  const line = law && law['3'] && typeof law['3']['3'] === 'string' ? law['3']['3'] : '';
  const list = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;
  return new Set(list.replace(/\.\s*$/, '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}
const agentOf = (agents, who) => !!who && agents.has(String(who).toLowerCase());

/* ── the wire (function:news 1): every item made in [from, to) ── */
async function buildWire(fromMs, toMs, ix, agents) {
  const names = new Set(ix.blocks || []);
  const born = ix.born || {}, touched = ix.touched || {};
  const items = [];
  const add = (it) => {
    if (!it.when) return;
    it.address = itemAddress(new Date(it.when));
    it.agent = agentOf(agents, it.who);
    items.push(it);
  };

  // births — a person, a room, a family, a gallery, a page, a proposal
  const births = Object.entries(born)
    .filter(([n, iso]) => names.has(n) && Date.parse(iso) >= fromMs && Date.parse(iso) < toMs)
    .map(([n, iso]) => ({ n, iso, k: bornKind(n, names) }))
    .filter((b) => b.k);
  // a family opens at the page its law names, else where the proposals list says its page is
  let pages = null;
  const pagesOf = () => (pages ||= readBlock('proposals').then(proposalPages).catch(() => new Map()));
  await each(births, 8, async ({ n, iso, k }) => {
    const block = await readBlock(n);
    const said = block ? rootVoice(block) : '';
    let { open, who = '' } = k;
    if (k.kind === 'family') {
      const name = n.slice(n.indexOf(':') + 1);
      const law = n.startsWith('function:') ? block : await readBlock('function:' + name);
      open = lawPage(law) || (await pagesOf()).get(name) || open;
      who = lawMaker(law) || who;
    }
    add({
      when: iso, who, kind: k.kind,
      line: clip(said ? `${k.lead}: ${said}` : k.lead, 280), text: said ? clip(said, 1200) : '',
      open, beach: beachAt(n), source: n,
    });
  });

  // entries — a post in a room, a picture in a gallery, a film or a proposal on its shelf
  const since = (n) => touched[n] && Date.parse(touched[n]) >= fromMs;
  const accs = [...names].filter((n) => since(n) && !TESTISH.test(n) &&
    ((n.startsWith('pool:') && !n.startsWith('pool:test')) || n.startsWith('gallery:') || n === 'marks' || SHELVES.has(n)));
  await each(accs, 6, async (n) => {
    const block = await readBlock(n);
    if (!block) return;
    const room = n.slice(n.indexOf(':') + 1);
    for (const { slot, entry } of entriesIn(block, fromMs, toMs)) {
      const said = String(entry._ || '').trim();
      if (!said) continue;
      const enc = encodeURIComponent;
      if (n === 'animations') {          // a film, an app, a chart or a page, its still beside it
        const credit = shelfCredit(entry);
        add({ when: entry['3'], who: creditMaker(credit), kind: 'animation', line: clip(said, 280),
          text: clip(credit ? `${said}\n\n${credit}` : said, 1600), image: isImage(entry['2']) ? entry['2'] : '',
          open: isUrl(entry['1']) ? entry['1'] : `${SITE}/animations`, beach: beachAt(n, slotSpindle(slot)), source: `${n}@${slotSpindle(slot)}` });
        continue;
      }
      if (n === 'proposals') {           // '<name> — what · <page>', shared when it was appended
        const name = (/^([a-z0-9][a-z0-9-]*)\s+—/.exec(said) || [])[1] || '';
        const law = name ? await readBlock('function:' + name) : null;
        add({ when: entry['3'], who: lawMaker(law), kind: 'proposal', line: clip(proposalLine(said), 280), text: clip(said, 1600),
          open: proposalPage(said) || (name ? `${SITE}/proposal/${enc(name)}` : `${SITE}/proposal`), beach: beachAt(n, slotSpindle(slot)), source: `${n}@${slotSpindle(slot)}` });
        continue;
      }
      if (n === 'marks') {
        const who = String(entry['1'] || '');
        add({ when: entry['3'], who, kind: 'mark', line: clip(said, 280), text: clip(said, 1200),
          open: who ? `${SITE}/page/${enc(who)}` : beachAt(n, slotSpindle(slot)), beach: beachAt(n, slotSpindle(slot)), source: `${n}@${slotSpindle(slot)}` });
        continue;
      }
      if (n.startsWith('gallery:')) {
        const img = [entry['4'], entry['5']].find(isImage) || '';
        add({ when: entry['3'], who: String(entry['1'] || ''), kind: 'picture', room, line: clip(said, 280), text: clip(said, 1200),
          image: img, open: `${SITE}/gallery/${enc(room)}`, beach: beachAt(n, slotSpindle(slot)), source: `${n}@${slotSpindle(slot)}` });
      } else {
        add({ when: entry['3'], who: String(entry['1'] || ''), kind: 'post', room, line: clip(said, 280), text: clip(said, 1600),
          open: `https://mirror.onen.ai/?pool=${enc(room)}`, beach: beachAt(n, slotSpindle(slot)), source: `${n}@${slotSpindle(slot)}` });
      }
    }
  });

  // tables — a turn at a world's room (a scene)
  try {
    const t = await getJSON(BEACH + '?tables');
    const live = ((t && t.tables) || []).filter((w) => w && w.name && w.room && Date.parse(w.touched) >= fromMs && !TESTISH.test(w.name));
    await each(live.slice(0, 12), 4, async (w) => {
      const origin = `${BEACH_ORIGIN}/w/${w.name}`;
      const block = await readBlock(w.room, origin);
      if (!block) return;
      for (const { slot, entry } of entriesIn(block, fromMs, toMs)) {
        const said = String(entry._ || '').trim();
        if (!said) continue;
        add({ when: entry['3'], who: String(entry['1'] || ''), kind: 'scene', room: w.name, line: clip(said, 280), text: clip(said, 1600),
          open: `https://mirror.onen.ai/?world=${encodeURIComponent(w.name)}`,
          beach: `${origin}/.well-known/pscale-beach?block=${encodeURIComponent(w.room)}&spindle=${encodeURIComponent(slotSpindle(slot))}`,
          source: `w/${w.name}/${w.room}@${slotSpindle(slot)}` });
      }
    });
  } catch { /* the wire stands without the tables */ }

  for (const it of await declarations(ix, fromMs, toMs)) add(it);

  items.sort((a, b) => Date.parse(b.when) - Date.parse(a.when));
  return items;
}

/* the channels era's declarations (function:news 3.1): one standing line per hand
 * at position 1 of a floor-1 news:<handle>, stamped at 1.91 — carried in as items */
async function declarations(ix, fromMs, toMs) {
  const out = [];
  const old = (ix.blocks || []).filter((n) => n.startsWith('news:'));
  await each(old, 6, async (n) => {
    const block = await readBlock(n);
    if (!block || floorOf(block) !== 1) return;
    const node = block['1'];
    const said = voiceOf(node);
    const iso = node && node['9'] && node['9']['1'];
    if (!said || !isIso(iso) || Date.parse(iso) < fromMs || Date.parse(iso) >= toMs) return;
    const who = n.slice(5);
    out.push({ when: iso, who, kind: 'declaration', line: clip(said, 280), text: clip(said, 1600),
      open: `${SITE}/page/${encodeURIComponent(who)}`, beach: beachAt(n, '1'), source: `${n}@1` });
  });
  return out;
}

/* ── the answers (function:news 3): every news:<handle> mirror on the clock ── */
async function readAnswers(ix, agents) {
  const by = {};
  const mirrors = (ix.blocks || []).filter((n) => n.startsWith('news:'));
  await each(mirrors, 8, async (n) => {
    const block = await readBlock(n);
    if (!block || floorOf(block) !== 10) return;
    const who = n.slice(5);
    (function walk(node, digits) {
      if (!node || typeof node !== 'object') return;
      for (const k of Object.keys(node)) {
        /* a zero is a value only at the century, decade and year digits (base ten,
         * sundial 1.1), where the beach keeps it at '_'; at the root '_' is the
         * floor chain and below the year it is a rung's own voice */
        if (k === '_' && !(digits.length >= 1 && digits.length <= 3 && node._ && typeof node._ === 'object')) continue;
        const d = digits + (k === '_' ? '0' : k);
        const child = node[k];
        if (d.length === 13) {
          const said = voiceOf(child);
          if (said) (by[d.slice(0, 10) + '.' + d.slice(10)] ||= []).push({ who, text: clip(said, 1200), agent: agentOf(agents, who) });
        } else if (d.length < 13) walk(child, d);
      }
    })(walkExact(block, ''), '');
  });
  return by;
}
const tally = (list) => ({
  people: (list || []).filter((a) => !a.agent).length,
  agents: (list || []).filter((a) => a.agent).length,
});

/* ── the house edition (function:news 2.3) ── */
const PICK = /^([1-9]) · (\d{10}\.[1-9]{1,3}) · (.+)$/;
const STATUS = /^\((so far|sealed)[^)]*?(\d{4}-\d\d-\d\dT[\d:.]+Z)\)$/;
function parseFold(text) {
  if (!text) return null;
  const head = [], picks = [];
  let status = null, asOf = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const p = PICK.exec(line);
    if (p) { picks.push({ rank: Number(p[1]), address: p[2], said: p[3] }); continue; }
    const s = STATUS.exec(line);
    if (s) { status = s[1]; asOf = s[2]; continue; }
    if (!picks.length) head.push(line);
  }
  if (!picks.length && !head.length) return null;
  return { headline: head.join(' '), picks, status, asOf };
}
function itemFromNode(address, node, agents) {
  if (!node || typeof node !== 'object') return null;
  const s = (k) => (typeof node[k] === 'string' ? node[k] : '');
  return {
    address, line: s('_'), text: s('_'), who: s('1'), open: s('2'), when: s('3'), kind: s('4') || 'post',
    image: isImage(s('5')) ? s('5') : '', source: s('6'), agent: agentOf(agents, s('1')),
    beach: s('6') ? beachAtSource(s('6')) : '',
  };
}
function beachAtSource(src) {
  const at = src.lastIndexOf('@');
  const name = at > 0 ? src.slice(0, at) : src, spindle = at > 0 ? src.slice(at + 1) : '';
  if (name.startsWith('w/')) {
    const [, world, ...room] = name.split('/');
    return `${BEACH_ORIGIN}/w/${world}/.well-known/pscale-beach?block=${encodeURIComponent(room.join('/'))}${spindle ? '&spindle=' + encodeURIComponent(spindle) : ''}`;
  }
  return beachAt(name, spindle);
}
function foldAt(house, period, agents) {
  if (!house) return null;
  const node = walkExact(house, period.slice(0, period.replace(/0+$/, '').length || 1));
  const fold = parseFold(voiceOf(node));
  if (!fold) return null;
  fold.picks = fold.picks.map((p) => {
    const item = itemFromNode(p.address, walkExact(house, p.address), agents);
    const dash = p.said.lastIndexOf(' — ');
    return { rank: p.rank, address: p.address, why: dash > 0 ? p.said.slice(dash + 3) : '', item: item || { address: p.address, line: dash > 0 ? p.said.slice(0, dash) : p.said } };
  });
  return fold;
}

/* ── a period, as the page reads it ── */
function periodFor(rung, at, now) {
  if (rung === 'now') {
    const end = now.getTime();
    return { address: momentToAddress(now), label: 'now', start: end - 9600_000 / 9, end, running: true, prev: null, next: null };
  }
  const address = at && isPeriod(at) ? at.slice(0, RUNG[rung].keep).padEnd(10, '0') : periodOf(rung, now);
  const span = addressToSpan(address);
  const start = span.start.getTime(), end = span.end.getTime();
  const prev = periodOf(rung, new Date(start - 1));
  const next = end <= now.getTime() ? periodOf(rung, new Date(end)) : null;
  const running = end > now.getTime();
  let label = voiceAddress(address);
  if (rung === 'gathering' && running) label = label.replace(/^.*?, /, 'this ');
  return { address, label, start, end, running, prev, next: next && next <= periodOf(rung, now) ? next : null };
}

async function readRung(q) {
  const now = new Date();
  const rung = RUNG[q.rung] ? q.rung : 'day';
  const period = periodFor(rung, String(q.at || ''), now);
  const [ix, agents, house] = await Promise.all([readIndex(), readAgents(), readBlock(HOUSE)]);
  const fine = rung === 'now' || rung === 'gathering' || rung === 'day';
  const [wire, answers] = await Promise.all([
    fine ? buildWire(period.start, Math.min(period.end, now.getTime() + 1000), ix, agents) : Promise.resolve([]),
    readAnswers(ix, agents),
  ]);
  const fold = rung === 'now' || rung === 'gathering' ? null : foldAt(house, period.address, agents);
  let items = wire;
  let latest = false;
  if (rung === 'now' && !items.length) {           // a quiet beat: the newest few of the day, said as such
    const day = addressToSpan(periodOf('day', now));
    items = (await buildWire(day.start.getTime() - 86400_000, now.getTime() + 1000, ix, agents)).slice(0, 12);
    latest = true;
  }
  const counted = (it) => ({ ...it, answers: tally(answers[it.address]) });
  return {
    now: { iso: now.toISOString(), address: momentToAddress(now), voicing: voiceAddress(momentToAddress(now)) },
    rung, period: { ...period, start: new Date(period.start).toISOString(), end: new Date(period.end).toISOString() },
    fold: fold ? { ...fold, picks: fold.picks.map((p) => ({ ...p, item: counted(p.item) })) } : null,
    items: items.map(counted), latest,
    keeper: { house: HOUSE, folding: !!house },
  };
}

async function readItem(q) {
  const address = String(q.item || '');
  if (!isItemAddress(address)) return { error: 'not an item address', status: 400 };
  const [ix, agents, house] = await Promise.all([readIndex(), readAgents(), readBlock(HOUSE)]);
  let item = house ? itemFromNode(address, walkExact(house, address), agents) : null;
  const src = String(q.s || '');
  if (!item && src) item = await itemFromSource(src, address, agents);
  if (!item) {
    const { start } = addressToSpan(address.slice(0, 10));
    const t = start.getTime();
    if (Date.now() - t < 3 * 86400_000) {
      const wire = await buildWire(t, t + 9600_000 / 9, ix, agents);
      item = wire.find((it) => it.address === address) || null;
    }
  }
  const ladder = [];
  if (house) {
    for (const rung of ['day', 'week', 'month', 'season', 'year']) {
      const period = address.slice(0, RUNG[rung].keep).padEnd(10, '0');
      const fold = foldAt(house, period, agents);
      const pick = fold && fold.picks.find((p) => p.address === address);
      if (pick) ladder.push({ rung, period, label: voiceAddress(period), rank: pick.rank, why: pick.why, status: fold.status });
    }
  }
  const answers = (await readAnswers(ix, agents))[address] || [];
  return { address, item, ladder, answers, tally: tally(answers), moment: voiceAddress(address.slice(0, 10)) };
}
async function itemFromSource(src, address, agents) {
  const at = src.lastIndexOf('@');
  const name = at > 0 ? src.slice(0, at) : src, spindle = at > 0 ? src.slice(at + 1) : '';
  if (!/^[\w:\- /.]{1,120}$/.test(name) || !/^\d{0,12}$/.test(spindle)) return null;
  let origin = BEACH_ORIGIN, block = name;
  if (name.startsWith('w/')) { const [, world, ...room] = name.split('/'); origin = `${BEACH_ORIGIN}/w/${world}`; block = room.join('/'); }
  const whole = await readBlock(block, origin);
  if (!whole) return null;
  const node = spindle ? walkExact(whole, spindle) : whole;
  const entry = node && typeof node === 'object' ? node : null;
  const said = spindle ? voiceOf(entry) : rootVoice(whole);
  if (!said) return null;
  const when = entry && isIso(entry['3']) ? entry['3'] : '';
  if (when && itemAddress(new Date(when)) !== address) return null;   // the link and the source must agree
  const room = block.slice(block.indexOf(':') + 1);
  const picture = block.startsWith('gallery:');
  if (block === 'animations' && entry) {
    const credit = shelfCredit(entry), who = creditMaker(credit);
    return { address, when, who, agent: agentOf(agents, who), kind: 'animation', line: clip(said, 280),
      text: clip(credit ? `${said}\n\n${credit}` : said, 1600), image: isImage(entry['2']) ? entry['2'] : '',
      open: isUrl(entry['1']) ? entry['1'] : `${SITE}/animations`, beach: beachAtSource(src), source: src };
  }
  if (block === 'proposals') {
    const name = (/^([a-z0-9][a-z0-9-]*)\s+—/.exec(said) || [])[1] || '';
    const who = name ? lawMaker(await readBlock('function:' + name)) : '';
    return { address, when, who, agent: agentOf(agents, who), kind: 'proposal', line: clip(proposalLine(said), 280), text: clip(said, 1600),
      open: proposalPage(said) || `${SITE}/proposal`, beach: beachAtSource(src), source: src };
  }
  const kind = name.startsWith('w/') ? 'scene' : picture ? 'picture' : block.startsWith('pool:') ? 'post' : block.startsWith('news:') ? 'declaration' : block === 'marks' ? 'mark' : 'block';
  return {
    address, when, who: String((entry && entry['1']) || ''), agent: agentOf(agents, entry && entry['1']), kind,
    line: clip(said, 280), text: clip(said, 1600), room,
    image: picture ? ([entry['4'], entry['5']].find(isImage) || '') : '',
    open: kind === 'post' ? `https://mirror.onen.ai/?pool=${encodeURIComponent(room)}` : kind === 'scene' ? `https://mirror.onen.ai/?world=${encodeURIComponent(name.split('/')[1])}` : picture ? `${SITE}/gallery/${encodeURIComponent(room)}` : '',
    beach: beachAtSource(src), source: src,
  };
}

/* ── WHERE THINGS ARE HAPPENING — the strip at the top of the day (spine:happening 1.1,
 * function:news 4.3). Four reads of what already stands, nothing written and nothing
 * founded: each person's own now at the day (now:<handle>, mirrors.js's one read for a
 * crowd), people before agents; the presence block, a hand counting as here for fifteen
 * minutes as /dashboard counts it; the lines said at the beat (torus-mirror:<hand>, the
 * loom's first band), live for one beat's width; and the tables that took a voice that
 * day (?tables). The rooms that took voices are the day's own wire, by room, which the
 * page already holds. Each part answers apart: one the beach would not give is unread. ── */
const HERE_MS = 15 * 60 * 1000;
const BEAT_MS = 9600_000 / 9;
const UNLISTED = /(^|[-:])(trial|probe)([-:]|$)/i;          // test hands, beside TESTISH
const LANE = /^\s*(?:[\w-]+\s*·\s*)?(?:lane\s+)?([A-Za-z][\w-]*(?:\.[\w-]+)+)\s*[:—(,]/;
const atAddress = (d) => (d.length > 10 ? d.slice(0, 10) + '.' + d.slice(10) : d.padEnd(10, '0'));

async function part(fn) {
  try { return { ok: true, ...(await fn()) }; }
  catch (e) { return { ok: false, error: clip(String(e && e.message ? e.message : e).replace(/ for https?:\/\/\S+/, ''), 160) }; }
}
async function saidOn(day, agents) {
  const room = await mirrorsOf('now');
  const digits = day.address.slice(0, 8);
  const lines = [];
  for (const [who, block] of Object.entries(room.mirrors || {})) {
    if (TESTISH.test(who) || UNLISTED.test(who)) continue;
    const node = walkExact(block, digits);
    if (node == null) continue;
    const said = voiceOf(node);
    const finer = [];                      // the day's parts, beats and seconds, in the order of the day
    (function walk(n, d) {
      if (!n || typeof n !== 'object') return;
      for (const k of '123456789') {
        const c = n[k];
        if (c == null) continue;
        const v = voiceOf(c);
        if (v) finer.push({ at: atAddress(d + k), text: clip(v, 280) });
        /* a line kept in the accumulator shape (its stamp at 3) is one line, its digits its fields */
        if (d.length + 1 < 13 && !(c && typeof c === 'object' && isIso(c['3']))) walk(c, d + k);
      }
    })(node, digits);
    if (!said && !finer.length) continue;
    /* a say at the beat lands at its second and voices the beat too: one line, at its finest address */
    const once = finer.filter((f, i) => !finer.slice(i + 1).some((g) => g.text === f.text && g.at.startsWith(f.at.replace(/0+$/, ''))));
    lines.push({ who, agent: agentOf(agents, who), text: said ? clip(said, 600) : '', finer: once.slice(-3), touched: (room.touched || {})[who] || '' });
  }
  lines.sort((a, b) => (a.agent - b.agent) || String(b.touched).localeCompare(String(a.touched)));
  return { lines };
}
async function presentNow(now, agents) {
  const block = await getJSON(`${BEACH}?block=presence`);
  const hands = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n._ && typeof n._ === 'object') walk(n._);
    for (const k of '123456789') {
      const c = n[k];
      if (c && typeof c === 'object' && typeof c['1'] === 'string' && isIso(c['3'])) {
        const t = Date.parse(c['3']);
        if (now.getTime() - t <= HERE_MS && t <= now.getTime() + 60_000 && !TESTISH.test(c['1']) && !UNLISTED.test(c['1']))
          hands.push({ who: c['1'], where: typeof c['2'] === 'string' ? c['2'] : '', at: c['3'], agent: agentOf(agents, c['1']) });
      } else if (c && typeof c === 'object') walk(c);
    }
  })(block);
  hands.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return { hands, window: HERE_MS / 60_000 };
}
async function atTheBeat(now, ix, agents) {
  const since = now.getTime() - BEAT_MS, touched = ix.touched || {};
  const hands = (ix.blocks || []).filter((n) => /^torus-mirror:[^:]+$/.test(n) && Date.parse(touched[n] || '') >= since);
  const gatherings = [...new Set([now, new Date(since)].map((t) => momentToAddress(t).slice(0, 9) + '0'))];
  let failed = 0;
  const got = await each(hands, 6, async (name) => {
    const out = [];
    try {
      for (const g of gatherings) {
        const j = await getJSON(`${BEACH}?block=${encodeURIComponent(name)}&spindle=${g}&pscale=-3`);
        for (const e of (j && j.descent) || []) {
          if (e && typeof e.content === 'string' && isIso(e.stamp) && Date.parse(e.stamp) >= since)
            out.push({ who: name.slice(13), text: e.content, at: e.stamp, address: String(e.address) });
        }
      }
    } catch { failed++; }
    return out;
  });
  if (hands.length && failed === hands.length) throw new Error('no hand’s beat answered');
  const seen = new Map();                   // the newest line of each lane of each hand
  got.flat().sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).forEach((l) => {
    const lane = (LANE.exec(l.text) || [])[1] || '';
    const key = l.who + '·' + (lane ? lane.toLowerCase() : l.address);
    if (!seen.has(key)) seen.set(key, { who: l.who, agent: agentOf(agents, l.who), lane, text: clip(l.text, 400), at: l.at });
  });
  return { lines: [...seen.values()].slice(0, 12), unread: failed };
}
async function tablesOn(day) {
  const t = await getJSON(BEACH + '?tables');
  const tables = ((t && t.tables) || [])
    .filter((w) => w && w.name && !TESTISH.test(w.name) && Date.parse(w.touched) >= day.start && Date.parse(w.touched) < day.end)
    .map((w) => ({ name: w.name, room: w.room || '', touched: w.touched }));
  return { tables };
}
async function readWhere(q) {
  const now = new Date();
  const day = periodFor('day', String(q.at || ''), now);
  const [ix, agents] = await Promise.all([readIndex(), readAgents()]);
  const [said, here, beat, tables] = await Promise.all([
    part(() => saidOn(day, agents)),
    day.running ? part(() => presentNow(now, agents)) : null,
    day.running ? part(() => atTheBeat(now, ix, agents)) : null,
    part(() => tablesOn(day)),
  ]);
  return {
    now: { iso: now.toISOString(), address: momentToAddress(now), voicing: voiceAddress(momentToAddress(now)) },
    day: { address: day.address, label: day.label, running: day.running, start: new Date(day.start).toISOString(), end: new Date(day.end).toISOString() },
    said, here, beat, tables,
  };
}

/* ── THE KEEPER (function:news 2) ──
 * It chooses by the law at function:news 2.6, one line of it at each of 2.6.1 to
 * 2.6.9, so revising the law on the beach revises the keeper and anyone keeping an
 * edition of their own reads the same words; this copy stands in where the beach
 * cannot be read. */
const KEEPER_LAW = [
  'You keep the house edition of the news on a public commons — the beach at beach.happyseaurchin.com, where people and AI agents make things together in plain public blocks.',
  'From the candidates, choose at most nine items that best show what this period MADE: things made for other people to meet — a picture, a page, a game or a scene at a table, a room someone opened, a practice or way of working, a new person arriving, a post with real substance.',
  'Prefer making over housekeeping and machine echoes (status lines, automatic reports, "X voiced Y on the Z field"); prefer what a stranger arriving from a shared link would find worth a look; prefer variety of kinds and of hands, and a person over an agent when they are otherwise equal. Answers from people are evidence of interest, never a vote you must obey.',
  'Words to an agent in its own room are housekeeping, not making: a note left in an agent\'s parlour, a working session\'s notice to the others, a scheduled pass\'s log.',
  'Choose only from the candidates, by their exact address, and rank them best first. Choosing nothing is honest if nothing was made. Never invent anything a candidate does not say.',
  'Write the headline as two or three plain sentences for a stranger: what this period made, without the beach\'s vocabulary — no block names, addresses or jargon. Write each why as one short clause (under twenty words) saying why it rose.',
].join('\n');
export async function keeperLaw() {
  const node = walkExact(await readBlock('function:news'), '26');
  const lines = [];
  if (node && typeof node === 'object') for (const k of '123456789') { const v = voiceOf(node[k]); if (v) lines.push(v); }
  return lines.length >= 3 ? { text: lines.join('\n'), from: 'function:news 2.6' } : { text: KEEPER_LAW, from: 'api/news.js' };
}
const FOLD_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    picks: { type: 'array', items: { type: 'object', properties: { address: { type: 'string' }, why: { type: 'string' } }, required: ['address', 'why'], additionalProperties: false } },
  },
  required: ['headline', 'picks'],
  additionalProperties: false,
};

async function choose(periodLabel, rung, candidates, law = KEEPER_LAW) {
  if (process.env.NEWS_FAKE_MODEL === '1') {     // the test rig's stand-in: never set in production
    return { headline: `Test fold of ${periodLabel}.`, picks: candidates.slice(0, 9).map((c) => ({ address: c.address, why: 'test pick' })), usage: null };
  }
  const key = process.env.NEWS_ANTHROPIC_KEY;
  if (!key) return null;
  const lines = candidates.map((c) => [
    c.address, c.kind, c.who ? (c.agent ? `${c.who} (agent)` : c.who) : 'someone',
    c.answers ? `answers: ${c.answers.people} people, ${c.answers.agents} agents` : '',
    c.why ? `chosen below because: ${c.why}` : '',
    clip(c.line, 260),
  ].filter(Boolean).join(' | '));
  const body = {
    model: MODEL,
    max_tokens: 16000,
    system: law,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: FOLD_SCHEMA } },
    messages: [{ role: 'user', content: `The period: ${periodLabel} (the ${rung}).\n${rung === 'day' ? 'These are everything made in it, newest first:' : `These are the picks already chosen for each ${CHILD[rung]} inside it:`}\n\n${lines.join('\n')}` }],
  };
  const headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  if (/^claude-(opus-5|sonnet-5-5|fable-5-1)/.test(MODEL)) {     // server-side fallback on a refusal, where the model takes it
    body.fallbacks = 'default';
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  }
  const call = () => fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
  let r = await call();
  let data = await r.json().catch(() => null);
  if (r.status === 400 && body.fallbacks) {       // a refusal fallback the model or account will not take: choose without it
    delete body.fallbacks; delete headers['anthropic-beta'];
    r = await call(); data = await r.json().catch(() => null);
  }
  if (!r.ok || !data) throw new Error(`model ${r.status}: ${data && data.error ? data.error.message : 'no answer'}`);
  if (data.stop_reason === 'refusal' || data.stop_reason === 'max_tokens') return { refused: data.stop_reason, usage: data.usage };
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const out = JSON.parse(text);
  const known = new Set(candidates.map((c) => c.address));
  const seen = new Set();
  out.picks = (out.picks || []).filter((p) => known.has(p.address) && !seen.has(p.address) && seen.add(p.address)).slice(0, 9);
  out.usage = data.usage;
  return out;
}

function foldText(chosen, byAddress, status, asOf) {
  const one = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const lines = [one(chosen.headline) || 'Nothing was made for others to meet in this period.'];
  chosen.picks.forEach((p, i) => {
    const it = byAddress.get(p.address);
    lines.push(`${i + 1} · ${p.address} · ${one(clip(it ? it.line : '', 200))} — ${one(p.why)}`);
  });
  lines.push(`(${status}, as of ${asOf})`);
  return lines.join('\n');
}
function entryOf(it) {
  const e = { _: clip(it.line, 400), 1: it.who || 'someone', 2: it.open || it.beach || '', 3: it.when, 4: it.kind };
  if (it.image) e[5] = it.image;
  if (it.source) e[6] = it.source;
  return e;
}
async function writeFold(secret, period, chosen, byAddress, status, asOf, log) {
  for (const p of chosen.picks) {
    const it = byAddress.get(p.address);
    if (!it || !it.when) continue;
    const w = await postBeach({ block: HOUSE, spindle: p.address, content: entryOf(it), secret });
    if (!w.ok) throw new Error(`the beach refused ${p.address}: ${w.status} ${w.data && (w.data.error || w.data.code)}`);
  }
  const w = await postBeach({ block: HOUSE, spindle: period, content: foldText(chosen, byAddress, status, asOf), secret });
  if (!w.ok) throw new Error(`the beach refused the fold at ${period}: ${w.status} ${w.data && (w.data.error || w.data.code)}`);
  log.push(`${status === 'sealed' ? 'sealed' : 'folded'} ${period} (${voiceAddress(period)}): ${chosen.picks.length} picks`);
}

async function foundHouse(secret, ix, agents, log) {
  let root = 'HOUSE EDITION — the keeper\'s fold of the news on the canonical clock (spine:news, function:news 2): at each period\'s own address its headline and its best nine with why each rose, sealed when the period closes; at each pick\'s own address the reference to the thing itself. One edition among any number — anyone may keep their own at tree:news:<handle>. Read it at happyseaurchin.com/news.';
  for (let i = 0; i < 10; i++) root = { _: root };
  const w = await postBeach({ block: HOUSE, content: root, new_lock: secret });
  if (!w.ok) throw new Error(`could not found ${HOUSE}: ${w.status} ${w.data && (w.data.error || w.data.code)}`);
  log.push(`founded ${HOUSE}`);
  // carry the channels era in (function:news 3.1): its declarations, as the record of the summer they were made in
  const old = (await declarations(ix, Date.UTC(2026, 6, 1), Date.UTC(2026, 9, 1)))
    .map((it) => ({ ...it, address: itemAddress(new Date(it.when)), agent: agentOf(agents, it.who) }))
    .sort((a, b) => Date.parse(a.when) - Date.parse(b.when));
  if (old.length) {
    const by = new Map(old.map((it) => [it.address, it]));
    const chosen = { headline: 'Before the clock: the declarations made on the first news page this summer, one standing line each, carried in when the news was re-founded on the clock in October.', picks: old.slice(0, 9).map((it) => ({ address: it.address, why: 'declared on the channels page' })) };
    await writeFold(secret, '2026300000', chosen, by, 'sealed', new Date().toISOString(), log);
  }
}

async function keep() {
  const secret = process.env.NEWS_KEEPER_SECRET;
  if (!secret) return { status: 500, body: { error: 'no NEWS_KEEPER_SECRET — the keeper has no latch for the house edition' } };
  const now = new Date();
  const asOf = now.toISOString();
  const log = [], spent = [];
  const [ix, agents] = await Promise.all([readIndex(), readAgents()]);
  let house = await readBlock(HOUSE);
  if (!house) { await foundHouse(secret, ix, agents, log); house = await readBlock(HOUSE); }
  if (!process.env.NEWS_ANTHROPIC_KEY && process.env.NEWS_FAKE_MODEL !== '1') {
    return { status: 200, body: { ok: true, log: log.concat('no NEWS_ANTHROPIC_KEY — nothing chosen; the page shows the wire unranked') } };
  }
  const answers = await readAnswers(ix, agents);
  const withAnswers = (it) => ({ ...it, answers: tally(answers[it.address]) });
  const law = await keeperLaw();
  log.push(`choosing by the law at ${law.from}, on ${MODEL}`);

  async function foldDay(period, status, newerThan = 0) {
    const span = addressToSpan(period);
    const wire = (await buildWire(span.start.getTime(), Math.min(span.end.getTime(), now.getTime() + 1000), ix, agents)).map(withAnswers);
    if (!wire.length) { log.push(`${period}: nothing made`); return false; }
    if (newerThan && !wire.some((it) => Date.parse(it.when) > newerThan)) { log.push(`${period}: nothing new since ${new Date(newerThan).toISOString()}`); return false; }
    const chosen = await choose(voiceAddress(period), 'day', wire.slice(0, 180), law.text);
    if (!chosen) return false;
    if (chosen.refused) { log.push(`${period}: model stopped (${chosen.refused})`); return false; }
    if (chosen.usage) spent.push(chosen.usage);
    await writeFold(secret, period, chosen, new Map(wire.map((it) => [it.address, it])), status, asOf, log);
    return true;
  }
  async function foldUp(rung, period, status) {
    const span = addressToSpan(period);
    const child = CHILD[rung];
    const kids = [];
    for (let t = span.start.getTime(); t < span.end.getTime(); ) {
      const p = periodOf(child, new Date(t));
      kids.push(p);
      t = addressToSpan(p).end.getTime();
    }
    const fresh = await readBlock(HOUSE);
    const cands = [];
    for (const k of kids) {
      const f = foldAt(fresh, k, agents);
      if (f) for (const p of f.picks) if (p.item && p.item.when) cands.push({ ...withAnswers(p.item), why: p.why });
    }
    if (!cands.length) { log.push(`${period}: nothing chosen beneath yet`); return false; }
    const chosen = await choose(voiceAddress(period), rung, cands, law.text);
    if (!chosen) return false;
    if (chosen.refused) { log.push(`${period}: model stopped (${chosen.refused})`); return false; }
    if (chosen.usage) spent.push(chosen.usage);
    await writeFold(secret, period, chosen, new Map(cands.map((it) => [it.address, it])), status, asOf, log);
    return true;
  }
  async function climb(fromRung, when) {
    let rung = fromRung;
    while (PARENT[rung]) {
      rung = PARENT[rung];
      const period = periodOf(rung, when);
      const closed = addressToSpan(period).end.getTime() <= now.getTime();
      const was = parseFold(voiceOf(walkExact(await readBlock(HOUSE), period.replace(/0+$/, ''))));
      if (was && was.status === 'sealed') break;
      await foldUp(rung, period, closed ? 'sealed' : 'so far');
      if (!closed) break;                         // a running period's parent waits for it to close
    }
  }

  // 1 — seal each closed day not yet sealed (the last two), then climb from it
  for (const back of [2, 1]) {
    const day = periodOf('day', new Date(now.getTime() - back * 86400_000));
    const was = parseFold(voiceOf(walkExact(house, day.replace(/0+$/, ''))));
    if (was && was.status === 'sealed') continue;
    if (await foldDay(day, 'sealed')) await climb('day', addressToSpan(day).start);
  }
  // 2 — today, again, when the wire has moved since its last fold
  const today = periodOf('day', now);
  const was = parseFold(voiceOf(walkExact(await readBlock(HOUSE), today.replace(/0+$/, ''))));
  const last = was && was.asOf ? Date.parse(was.asOf) : 0;
  if (now.getTime() - last >= REFOLD_FLOOR_MS) await foldDay(today, 'so far', last);
  else log.push(`${today}: folded ${Math.round((now.getTime() - last) / 60000)} min ago — waiting`);

  const tokens = spent.reduce((a, u) => ({ input: a.input + (u.input_tokens || 0), output: a.output + (u.output_tokens || 0) }), { input: 0, output: 0 });
  return { status: 200, body: { ok: true, model: MODEL, calls: spent.length, tokens, log } };
}

/* ── the door ── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const q = req.query || {};
  try {
    if (q.keep) {
      const cron = process.env.CRON_SECRET;
      if (cron && req.headers.authorization !== `Bearer ${cron}`) return res.status(401).json({ error: 'unauthorized' });
      res.setHeader('Cache-Control', 'no-store');
      /* each pass says what it did in the function's log, so whoever watches the keeper
       * reads why the house edition stands or does not (no secret is in it) */
      const r = await keep().catch((e) => ({ status: 500, body: { error: String(e && e.message ? e.message : e).slice(0, 300) } }));
      console.log('[keeper]', r.status, JSON.stringify(r.body).slice(0, 3000));
      return res.status(r.status).json(r.body);
    }
    if (q.where) {
      const r = await readWhere(q);
      const fine = r.day.running ? 20 : 120;
      res.setHeader('Vercel-CDN-Cache-Control', `max-age=${fine}, stale-while-revalidate=${fine * 3}`);
      return res.status(200).json(r);
    }
    if (q.item) {
      const r = await readItem(q);
      if (r.status) return res.status(r.status).json({ error: r.error });
      res.setHeader('Vercel-CDN-Cache-Control', 'max-age=20, stale-while-revalidate=60');
      return res.status(200).json(r);
    }
    const r = await readRung(q);
    const fine = r.rung === 'now' ? 10 : (r.rung === 'gathering' || r.rung === 'day') ? 30 : 120;
    res.setHeader('Vercel-CDN-Cache-Control', `max-age=${fine}, stale-while-revalidate=${fine * 4}`);
    return res.status(200).json(r);
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e).slice(0, 300) });
  }
}

