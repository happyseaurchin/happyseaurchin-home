/**
 * /api/news — the news family's door on the site, and its keeper (function:news
 * at the beach). One file on purpose, as every function here is self-contained.
 *
 *   GET /api/news?rung=now|gathering|day|week|month|season|year[&at=<address>][&by=<edition>]
 *       what the beach made in that period: the newest choice that stands for it
 *       (function:news 2) — the keeper's or any reader's, whoever chose last —
 *       and for the day and finer the whole wire, every item made, newest first
 *       (function:news 1), each item's answers counted as people and agents apart
 *       (function:news 3). `by` (an edition's block name) asks for one hand's
 *       choice first.
 *   GET /api/news?item=<address>[&s=<source>]
 *       one item, read where it lives: the thing, the choices up the ladder that
 *       named it and why, and every answer standing at its address.
 *   GET /api/news?prepare=1&rung=day|week|month|season|year[&at=<address>]
 *       what a reader needs to choose a period on their own key: the law, the
 *       prompt, the schema and the candidates. The page calls the model straight
 *       from the reader's browser and writes the choice to the reader's own
 *       edition, tree:news:<handle> — the key never passes through here.
 *   GET /api/news?keep=1
 *       THE KEEPER'S PASS — the hourly cron (vercel.json). Chooses TODAY again
 *       when the wire has moved since the newest choice anyone made, and never
 *       more often than every twenty minutes. Every other period is chosen by
 *       its readers, on their own keys, and the newest choice stands for all.
 *
 * Every pick is read again at its source before it is shown: an edition gives an
 * address, a rank and a why, and the thing itself — its words, its hand, its
 * moment, its door — always comes from where it lives, so no edition can put
 * words into the news that the beach does not hold. The wire is never stored: it
 * is read from what the beach already stamps (the surface index's born and
 * touched maps, each accumulator entry's own stamp at position 3, each table's
 * latest room), so a crowd arriving from a shared link reads one cached copy here
 * instead of each of them reading the beach. The read paths are GET-only and
 * write nothing; answers and editions are written by each reader straight to
 * their own blocks on the beach, never through here.
 *
 * Env (Vercel project settings) — the read paths need none:
 *   NEWS_KEEPER_SECRET   the latch of the house edition, the bare block `news`.
 *                        The keeper founds the block under it on its first pass.
 *   NEWS_ANTHROPIC_KEY   the key that pays for the keeper's choosing (its own key,
 *                        so its cost can be watched on its own). Absent: the
 *                        keeper chooses nothing, and today is chosen by readers.
 *   NEWS_MODEL           optional; default claude-opus-5-5. It is also the model
 *                        a reader's choice is made with, on the reader's key.
 *   CRON_SECRET          if set, Vercel sends it as a Bearer token on crons and
 *                        the keeper's pass refuses anything else.
 * Test rig only, never in production: NEWS_HOUSE=probe:<name>, NEWS_TREE=probe:<prefix>,
 * NEWS_FAKE_MODEL=1.
 */

const BEACH_ORIGIN = 'https://beach.happyseaurchin.com';
const BEACH = BEACH_ORIGIN + '/.well-known/pscale-beach';
const SITE = 'https://happyseaurchin.com';
const HOUSE = process.env.NEWS_HOUSE || 'news';          // the keeper's edition
const TREE = process.env.NEWS_TREE || 'tree:news:';      // a hand's own edition is TREE + handle
const MODEL = process.env.NEWS_MODEL || 'claude-opus-5-5';
const REFOLD_FLOOR_MS = 20 * 60 * 1000;                  // the keeper never re-chooses today more often than this
const SKEW_MS = 2 * 60 * 1000;                           // a clock this far ahead is still honest
const CANDIDATES = 150;                                  // the most one choice is asked to read


/* ── the sundial — momentToAddress, addressToSpan and voiceAddress are
 * pscale-beach lib/temporal.js, itself the port of bsp-mcp src/temporal.ts:
 * re-port, never fork. Only itemAddress (below the beat) is new here. ── */
const DAY_PARTS = ['deep night', 'dawn', 'early morning', 'morning', 'midday',
  'afternoon', 'late afternoon', 'evening', 'night'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function momentToAddress(when) {
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
/* a slot as the beach spells it: left-padded to the block's floor (sundial 1.1),
 * so an entry that supernested under the zero-group is found where it went */
function walkSpindle(block, spindle) {
  const [int, frac = ''] = String(spindle).split('.');
  const f = floorOf(block);
  return walkExact(block, (int.length < f ? int.padStart(f, '0') : int) + frac);
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


/* ── agents, until passports say so (function:news 3.2–3.3) ── */
async function readAgents() {
  const law = await readBlock('function:news');
  const line = law && law['3'] && typeof law['3']['3'] === 'string' ? law['3']['3'] : '';
  const list = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;
  return new Set(list.replace(/\.\s*$/, '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}
const agentOf = (agents, who) => !!who && agents.has(String(who).toLowerCase());

/* one request's view of the beach: the index, the agents, and each block read once
 * however many items point into it */
function reader() {
  const memo = new Map();
  return (name, origin = BEACH_ORIGIN) => {
    const k = origin + ' ' + name;
    if (!memo.has(k)) {
      memo.set(k, getJSON(`${origin}/.well-known/pscale-beach?block=${encodeURIComponent(name)}`)
        .then((block) => (block ? { block } : { gone: true }), (e) => ({ error: String((e && e.message) || e) })));
    }
    return memo.get(k);
  };
}
async function context() {
  const [ix, agents] = await Promise.all([readIndex(), readAgents()]);
  return { ix, agents, names: new Set(ix.blocks || []), read: reader() };
}

/* ── an item, as each kind of making yields it — the wire and every pick read again
 * at its source go through these same hands, so the two always agree ── */
function finish(it, agents) {
  it.address = itemAddress(new Date(it.when));
  it.agent = agentOf(agents, it.who);
  return it;
}
function birthItem(n, iso, k, block) {
  const said = block ? rootVoice(block) : '';
  return {
    when: iso, who: k.who || '', kind: k.kind,
    line: clip(said ? `${k.lead}: ${said}` : k.lead, 280), text: said ? clip(said, 1200) : '',
    open: k.open, beach: beachAt(n), source: n,
  };
}
function entryItem(n, slot, entry) {                  // a post in a room, a mark on the board, a picture in a gallery
  const said = String(entry._ || '').trim();
  if (!said || !isIso(entry['3'])) return null;
  const enc = encodeURIComponent, sp = slotSpindle(slot);
  const who = String(entry['1'] || ''), room = n.slice(n.indexOf(':') + 1);
  const at = { when: entry['3'], who, line: clip(said, 280), beach: beachAt(n, sp), source: `${n}@${sp}` };
  if (n === 'marks') return { ...at, kind: 'mark', text: clip(said, 1200), open: who ? `${SITE}/page/${enc(who)}` : beachAt(n, sp) };
  if (n.startsWith('gallery:')) {
    return { ...at, kind: 'picture', room, text: clip(said, 1200), image: [entry['4'], entry['5']].find(isImage) || '', open: `${SITE}/gallery/${enc(room)}` };
  }
  return { ...at, kind: 'post', room, text: clip(said, 1600), open: `https://mirror.onen.ai/?pool=${enc(room)}` };
}
function sceneItem(world, room, slot, entry) {       // a turn at a world's table
  const said = String(entry._ || '').trim();
  if (!said || !isIso(entry['3'])) return null;
  const sp = slotSpindle(slot);
  return {
    when: entry['3'], who: String(entry['1'] || ''), kind: 'scene', room: world, line: clip(said, 280), text: clip(said, 1600),
    open: `https://mirror.onen.ai/?world=${encodeURIComponent(world)}`,
    beach: `${BEACH_ORIGIN}/w/${world}/.well-known/pscale-beach?block=${encodeURIComponent(room)}&spindle=${encodeURIComponent(sp)}`,
    source: `w/${world}/${room}@${sp}`,
  };
}
/* the channels era's declarations (function:news 3.1): one standing line per hand
 * at position 1 of a floor-1 news:<handle>, stamped at 1.91 */
function declarationItem(n, block) {
  if (!block || floorOf(block) !== 1) return null;
  const node = block['1'];
  const said = voiceOf(node);
  const iso = node && node['9'] && node['9']['1'];
  if (!said || !isIso(iso)) return null;
  const who = n.slice(5);
  return { when: iso, who, kind: 'declaration', line: clip(said, 280), text: clip(said, 1600),
    open: `${SITE}/page/${encodeURIComponent(who)}`, beach: beachAt(n, '1'), source: `${n}@1` };
}

/* ── the wire (function:news 1): every item made in [from, to) ── */
async function buildWire(fromMs, toMs, ctx) {
  const { ix, agents, names, read } = ctx;
  const born = ix.born || {}, touched = ix.touched || {};
  const items = [];
  const add = (it) => { if (it && it.when) items.push(finish(it, agents)); };

  // births — a person, a room, a family, a gallery, a page, a proposal
  const births = Object.entries(born)
    .filter(([n, iso]) => names.has(n) && Date.parse(iso) >= fromMs && Date.parse(iso) < toMs)
    .map(([n, iso]) => ({ n, iso, k: bornKind(n, names) }))
    .filter((b) => b.k);
  await each(births, 8, async ({ n, iso, k }) => add(birthItem(n, iso, k, (await read(n)).block)));

  // entries — a post in a room, a picture in a gallery, a mark on the board
  const since = (n) => touched[n] && Date.parse(touched[n]) >= fromMs;
  const accs = [...names].filter((n) => since(n) && !TESTISH.test(n) &&
    ((n.startsWith('pool:') && !n.startsWith('pool:test')) || n.startsWith('gallery:') || n === 'marks'));
  await each(accs, 6, async (n) => {
    const { block } = await read(n);
    if (block) for (const { slot, entry } of entriesIn(block, fromMs, toMs)) add(entryItem(n, slot, entry));
  });

  // tables — a turn at a world's room (a scene)
  try {
    const t = await getJSON(BEACH + '?tables');
    const live = ((t && t.tables) || []).filter((w) => w && w.name && w.room && Date.parse(w.touched) >= fromMs && !TESTISH.test(w.name));
    await each(live.slice(0, 12), 4, async (w) => {
      const { block } = await read(w.room, `${BEACH_ORIGIN}/w/${w.name}`);
      if (block) for (const { slot, entry } of entriesIn(block, fromMs, toMs)) add(sceneItem(w.name, w.room, slot, entry));
    });
  } catch { /* the wire stands without the tables */ }

  for (const it of await declarations(ctx, fromMs, toMs)) add(it);

  items.sort((a, b) => Date.parse(b.when) - Date.parse(a.when));
  return items;
}
async function declarations(ctx, fromMs, toMs) {
  const out = [];
  await each([...ctx.names].filter((n) => n.startsWith('news:')), 6, async (n) => {
    const it = declarationItem(n, (await ctx.read(n)).block);
    if (it && Date.parse(it.when) >= fromMs && Date.parse(it.when) < toMs) out.push(finish(it, ctx.agents));
  });
  return out;
}

/* ── a thing, read again where it lives. A source is the block and slot an item was
 * read from — `pool:<room>@<slot>`, `gallery:<room>@<slot>`, `marks@<slot>`,
 * `w/<world>/<room>@<slot>`, `news:<handle>@1`, a block's own name for a birth —
 * and the item is whatever that source yields now, at the moment it says it was made ── */
async function deriveItem(src, ctx) {
  src = String(src || '');
  const at = src.lastIndexOf('@');
  const name = at > 0 ? src.slice(0, at) : src, slot = at > 0 ? src.slice(at + 1) : '';
  if (!/^[\w:\- /.]{1,160}$/.test(name) || !/^\d{0,20}$/.test(slot)) return null;
  let origin = BEACH_ORIGIN, block = name, world = '';
  if (name.startsWith('w/')) {
    const [, w, ...room] = name.split('/');
    if (!w || !room.length || !slot || TESTISH.test(w)) return null;
    world = w; origin = `${BEACH_ORIGIN}/w/${w}`; block = room.join('/');
  } else if (TESTISH.test(name) || name.startsWith('pool:test')) return null;
  const r = await ctx.read(block, origin);
  if (r.error) return { error: r.error };
  if (!r.block) return null;
  let made = null;
  if (!slot) {                                         // a birth: its moment is the index's own stamp
    const iso = (ctx.ix.born || {})[name];
    const k = isIso(iso) ? bornKind(name, ctx.names) : null;
    made = k ? birthItem(name, iso, k, r.block) : null;
  } else if (world) {
    const entry = walkSpindle(r.block, slot);
    made = entry && typeof entry === 'object' ? sceneItem(world, block, slot, entry) : null;
  } else if (name.startsWith('news:') && slot === '1') {
    made = declarationItem(name, r.block);
  } else if (name === 'marks' || name.startsWith('pool:') || name.startsWith('gallery:')) {
    const entry = walkSpindle(r.block, slot);
    made = entry && typeof entry === 'object' ? entryItem(name, slot, entry) : null;
  }
  return made ? finish(made, ctx.agents) : null;
}

/* ── the answers (function:news 3): every news:<handle> mirror on the clock ── */
async function readAnswers(ctx) {
  const by = {};
  await each([...ctx.names].filter((n) => n.startsWith('news:')), 8, async (n) => {
    const { block } = await ctx.read(n);
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
          if (said) (by[d.slice(0, 10) + '.' + d.slice(10)] ||= []).push({ who, text: clip(said, 1200), agent: agentOf(ctx.agents, who) });
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

/* ── the shape of a choice (function:news 2.3): plain words at the period's own
 * address — the headline, a line per pick, then its status and moment ── */
const PICK = /^([1-9]) · (\d{10}\.[1-9]{1,3}) · (.+)$/;
const STATUS = /^\((so far|chosen|sealed)[^)]*?(\d{4}-\d\d-\d\dT[\d:.]+Z)\)$/;
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
const whyOf = (said) => { const dash = said.lastIndexOf(' — '); return dash > 0 ? said.slice(dash + 3) : ''; };
function itemFromNode(address, node, agents) {        // the keeper's own copy of a pick
  if (!node || typeof node !== 'object') return null;
  const s = (k) => (typeof node[k] === 'string' ? node[k] : '');
  if (!isIso(s('3'))) return null;
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

/* ── the editions (function:news 2.5): the keeper's, the bare `news`, and each
 * hand's own at tree:news:<handle> — for each period the newest choice stands ── */
const HANDLE = /^[A-Za-z0-9_-]+( [A-Za-z0-9_-]+)*$/;          // theme.js cleanHandle's rule: words, one space between
const isEdition = (n) => n === HOUSE ||
  (n.startsWith(TREE) && n.length <= TREE.length + 64 && HANDLE.test(n.slice(TREE.length)) && !TESTISH.test(n.slice(TREE.length)));
async function readEditions(ctx, also) {
  const names = new Set([HOUSE, ...[...ctx.names].filter((n) => n.startsWith(TREE) && isEdition(n))]);
  if (also && isEdition(also)) names.add(also);      // just written, perhaps not yet in the index
  const out = [];
  await each([...names], 8, async (n) => {
    const { block } = await ctx.read(n);
    if (!block || floorOf(block) !== 10) return;
    const house = n === HOUSE;
    out.push({ name: n, house, by: house ? 'the keeper' : n.slice(TREE.length), block,
      touched: house ? 0 : Date.parse((ctx.ix.touched || {})[n] || '') || 0 });
  });
  return out;
}
/* every edition's choice of a period, newest first; a choice stamped later than
 * now, or later than its own block was last written, is no choice */
const nodeOf = (period) => period.replace(/0+$/, '') || period.slice(0, 1);
function foldsAt(editions, period, nowMs) {
  const out = [];
  for (const edition of editions) {
    const fold = parseFold(voiceOf(walkExact(edition.block, nodeOf(period))));
    const t = fold && fold.asOf ? Date.parse(fold.asOf) : NaN;
    if (!isFinite(t) || t > nowMs + SKEW_MS || (edition.touched && t > edition.touched + SKEW_MS)) continue;
    out.push({ ...fold, t, edition });
  }
  return out.sort((a, b) => b.t - a.t);
}
/* a choice made real: each pick read again where it lives and kept only if the thing
 * is there and was made inside the period, the ranks closed up over what fell away.
 * When the beach cannot be read, or the thing has gone, only the keeper's own copy
 * stands in for it. */
async function realise(fold, ctx, span, wireBy) {
  const { edition } = fold, seen = new Set();
  const picks = await each(fold.picks, 6, async (p) => {
    if (seen.has(p.address)) return null;
    seen.add(p.address);
    let item = (wireBy && wireBy.get(p.address)) || null;
    if (!item) {
      const entry = walkExact(edition.block, p.address);
      const src = entry && typeof entry === 'object' && typeof entry['6'] === 'string' ? entry['6'] : '';
      const got = src ? await deriveItem(src, ctx) : null;
      item = got && !got.error && got.address === p.address ? got : null;
      if (!item && edition.house) item = itemFromNode(p.address, entry, ctx.agents);
    }
    const t = item ? Date.parse(item.when) : NaN;
    if (!(t >= span.start && t < span.end)) return null;
    return { address: p.address, why: whyOf(p.said), item };
  });
  return picks.filter(Boolean).map((p, i) => ({ rank: i + 1, ...p }));
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
const isoPeriod = (p) => ({ ...p, start: new Date(p.start).toISOString(), end: new Date(p.end).toISOString() });

async function readRung(q) {
  const now = new Date();
  const rung = RUNG[q.rung] ? q.rung : 'day';
  const period = periodFor(rung, String(q.at || ''), now);
  const ctx = await context();
  const fine = rung === 'now' || rung === 'gathering' || rung === 'day';
  const chosen = rung !== 'now' && rung !== 'gathering';
  const want = String(q.by || '');
  const [wire, answers, editions] = await Promise.all([
    fine ? buildWire(period.start, Math.min(period.end, now.getTime() + 1000), ctx) : Promise.resolve([]),
    readAnswers(ctx),
    chosen ? readEditions(ctx, want) : Promise.resolve([]),
  ]);
  let fold = null, choices = [];
  if (chosen) {
    const folds = foldsAt(editions, period.address, now.getTime());
    const order = want ? folds.filter((f) => f.edition.name === want).concat(folds.filter((f) => f.edition.name !== want)) : folds;
    const wireBy = rung === 'day' ? new Map(wire.map((it) => [it.address, it])) : null;
    for (const f of order.slice(0, 4)) {
      const picks = await realise(f, ctx, period, wireBy);
      if (picks.length || f.edition.house) {           // a hand's choice that chose nothing real is no choice
        fold = { headline: f.headline, picks, status: f.status, asOf: f.asOf, by: f.edition.by, house: f.edition.house, edition: f.edition.name };
        break;
      }
    }
    choices = folds.map((f) => ({ edition: f.edition.name, by: f.edition.by, house: f.edition.house, asOf: f.asOf, status: f.status, picks: f.picks.length }));
  }
  let items = wire;
  let latest = false;
  if (rung === 'now' && !items.length) {           // a quiet beat: the newest few of the day, said as such
    const day = addressToSpan(periodOf('day', now));
    items = (await buildWire(day.start.getTime() - 86400_000, now.getTime() + 1000, ctx)).slice(0, 12);
    latest = true;
  }
  const counted = (it) => ({ ...it, answers: tally(answers[it.address]) });
  return {
    now: { iso: now.toISOString(), address: momentToAddress(now), voicing: voiceAddress(momentToAddress(now)) },
    rung, period: isoPeriod(period),
    fold: fold ? { ...fold, picks: fold.picks.map((p) => ({ ...p, item: counted(p.item) })) } : null,
    choices, items: items.map(counted), latest,
    keeper: { house: HOUSE, folding: editions.some((e) => e.house) },
    choose: chosen ? { model: MODEL, tree: TREE } : null,
  };
}

async function readItem(q) {
  const address = String(q.item || '');
  if (!isItemAddress(address)) return { error: 'not an item address', status: 400 };
  const ctx = await context();
  const [editions, answersBy] = await Promise.all([readEditions(ctx), readAnswers(ctx)]);
  const now = Date.now();
  // the thing, read where it lives: the link's own source, else the source any choice recorded for it, else the live wire
  const entries = editions.map((ed) => ({ ed, entry: walkExact(ed.block, address) }));
  const sources = [String(q.s || '')].concat(entries.map(({ entry }) =>
    entry && typeof entry === 'object' && typeof entry['6'] === 'string' ? entry['6'] : ''));
  let item = null;
  for (const src of [...new Set(sources.filter(Boolean))].slice(0, 4)) {
    const got = await deriveItem(src, ctx);
    if (got && !got.error && got.address === address) { item = got; break; }
  }
  if (!item) {
    const t = addressToSpan(address.slice(0, 10)).start.getTime();
    if (now - t < 3 * 86400_000) item = (await buildWire(t, t + 9600_000 / 9, ctx)).find((it) => it.address === address) || null;
  }
  if (!item) {                                     // gone from where it lived: the keeper's own copy, if it kept one
    const kept = entries.find(({ ed }) => ed.house);
    item = kept ? itemFromNode(address, kept.entry, ctx.agents) : null;
  }
  const ladder = [];
  for (const rung of ['day', 'week', 'month', 'season', 'year']) {
    const period = address.slice(0, RUNG[rung].keep).padEnd(10, '0');
    const f = foldsAt(editions, period, now).find((x) => x.picks.length);   // the newest choice that chose anything
    const i = f ? f.picks.findIndex((p) => p.address === address) : -1;
    if (i >= 0) ladder.push({ rung, period, label: voiceAddress(period), rank: i + 1, why: whyOf(f.picks[i].said),
      by: f.edition.by, house: f.edition.house, status: f.status, asOf: f.asOf });
  }
  const answers = answersBy[address] || [];
  return { address, item, ladder, answers, tally: tally(answers), moment: voiceAddress(address.slice(0, 10)) };
}

/* ── what a choice reads (function:news 2.1). A day reads everything made in it; a
 * week reads its days' picks, and the whole wire of any day nobody chose; a month
 * and up read the picks chosen beneath, from the nearest rung down that someone
 * chose — at most CANDIDATES, the best-ranked kept first. ── */
const CHILDREN = { week: 'days', month: 'weeks', season: 'months', year: 'seasons' };
function childrenOf(rung, period, nowMs) {
  const child = CHILD[rung], span = addressToSpan(period), kids = [];
  for (let t = span.start.getTime(); t < span.end.getTime() && t <= nowMs; ) {
    const p = periodOf(child, new Date(t));
    kids.push(p);
    t = addressToSpan(p).end.getTime();
  }
  return { child, kids };
}
async function candidatesFor(rung, period, ctx, editions, nowMs) {
  if (rung === 'day') {
    const wire = await buildWire(period.start, Math.min(period.end, nowMs + 1000), ctx);
    return { list: wire.slice(0, CANDIDATES), what: 'Here is everything made in it, newest first:' };
  }
  const unchosen = [];
  async function under(r, address) {
    const { child, kids } = childrenOf(r, address, nowMs);
    const found = await each(kids, 4, async (k) => {
      const s = addressToSpan(k), span = { start: s.start.getTime(), end: s.end.getTime() };
      for (const f of foldsAt(editions, k, nowMs).slice(0, 3)) {
        const picks = await realise(f, ctx, span, null);
        if (picks.length) return picks.map((p) => ({ ...p.item, why: p.why, rank: p.rank }));
      }
      if (child !== 'day') return under(child, k);
      if (rung === 'week') unchosen.push(span);
      return [];
    });
    return found.flat();
  }
  const list = await under(rung, period.address);
  const picked = list.length;
  let raw = 0;
  if (unchosen.length) {
    const from = Math.min(...unchosen.map((s) => s.start)), to = Math.min(Math.max(...unchosen.map((s) => s.end)), nowMs + 1000);
    const inside = (it) => { const t = Date.parse(it.when); return unchosen.some((s) => t >= s.start && t < s.end); };
    const wire = (await buildWire(from, to, ctx)).filter(inside);
    raw = wire.length;
    list.push(...wire);
  }
  const seen = new Set();
  const kept = list.filter((c) => !seen.has(c.address) && seen.add(c.address))
    .sort((a, b) => (a.rank || 10) - (b.rank || 10) || Date.parse(b.when) - Date.parse(a.when))
    .slice(0, CANDIDATES)
    .sort((a, b) => Date.parse(b.when) - Date.parse(a.when));
  const what = rung !== 'week'
    ? `Here are the picks already chosen beneath it — for its ${CHILDREN[rung]}, or further down where nobody chose those yet — newest first:`
    : !raw ? 'Here are the picks already chosen for each of its days, newest first:'
    : !picked ? 'Nobody has chosen its days yet, so here is everything made in it, newest first:'
    : 'Here are the picks already chosen for its days, and everything made on the days nobody has chosen yet, newest first:';
  return { list: kept, what };
}
function promptFor(rung, label, what, candidates) {
  const lines = candidates.map((c) => [
    c.address, c.kind, c.who ? (c.agent ? `${c.who} (agent)` : c.who) : 'someone',
    c.answers && (c.answers.people || c.answers.agents) ? `answers: ${c.answers.people} people, ${c.answers.agents} agents` : '',
    c.why ? `chosen below because: ${c.why}` : '',
    clip(c.line, 260),
  ].filter(Boolean).join(' | '));
  return `The period: ${label} (the ${rung}).\n${what}\n\n${lines.join('\n')}`;
}

/* ── THE LAW OF CHOOSING (function:news 2) — the keeper and every reader choose by it ── */
const CHOOSING_LAW = [
  'You choose the news for one period of a public commons — the beach at beach.happyseaurchin.com, where people and AI agents make things together in plain public blocks. Your choice is one edition among many, and it stands for every reader until someone chooses again.',
  'From the candidates, choose at most nine items that best show what this period MADE: things made for other people to meet — a picture, a page, a game or a scene at a table, a room someone opened, a practice or way of working, a new person arriving, a post with real substance.',
  'Prefer making over housekeeping and machine echoes (status lines, automatic reports, "X voiced Y on the Z field"); prefer what a stranger arriving from a shared link would find worth a look; prefer variety of kinds and of hands, and a person over an agent when they are otherwise equal. Answers from people are evidence of interest, never a vote you must obey.',
  'Choose only from the candidates, by their exact address, and rank them best first. Choosing nothing is honest if nothing was made. Never invent anything a candidate does not say.',
  'Write the headline as two or three plain sentences for a stranger: what this period made, without the beach\'s vocabulary — no block names, addresses or jargon. Write each why as one short clause (under twenty words) saying why it rose.',
].join('\n');
const FOLD_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    picks: { type: 'array', items: { type: 'object', properties: { address: { type: 'string' }, why: { type: 'string' } }, required: ['address', 'why'], additionalProperties: false } },
  },
  required: ['headline', 'picks'],
  additionalProperties: false,
};
const MAX_TOKENS = 16000;
const slim = (c) => ({ address: c.address, when: c.when, who: c.who, agent: c.agent, kind: c.kind, line: c.line,
  open: c.open, beach: c.beach, image: c.image || '', source: c.source, why: c.why || '' });

/* everything a reader's browser needs to make a choice exactly as the keeper would */
async function prepare(q) {
  const now = new Date();
  const rung = RUNG[q.rung] && q.rung !== 'now' && q.rung !== 'gathering' ? q.rung : null;
  if (!rung) return { code: 400, error: 'a choice is made for a day, a week, a month, a season or a year' };
  const period = periodFor(rung, String(q.at || ''), now);
  const ctx = await context();
  const [answers, editions] = await Promise.all([readAnswers(ctx), readEditions(ctx)]);
  const { list, what } = await candidatesFor(rung, period, ctx, editions, now.getTime());
  const candidates = list.map((it) => ({ ...it, answers: tally(answers[it.address]) }));
  return {
    rung, period: isoPeriod(period), asOf: now.toISOString(), standing: period.running ? 'so far' : 'chosen',
    model: MODEL, max_tokens: MAX_TOKENS, system: CHOOSING_LAW, schema: FOLD_SCHEMA,
    user: promptFor(rung, voiceAddress(period.address), what, candidates),
    candidates: candidates.map(slim), tree: TREE,
  };
}

/* ── THE KEEPER (function:news 2.5) — today, on its own key ── */
async function choose(system, user, candidates) {
  if (process.env.NEWS_FAKE_MODEL === '1') {     // the test rig's stand-in: never set in production
    return { headline: 'A test choice of today.', picks: candidates.slice(0, 9).map((c) => ({ address: c.address, why: 'test pick' })), usage: null };
  }
  const key = process.env.NEWS_ANTHROPIC_KEY;
  if (!key) return null;
  const body = {
    model: MODEL, max_tokens: MAX_TOKENS, system,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: FOLD_SCHEMA } },
    messages: [{ role: 'user', content: user }],
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
  out.picks = (out.picks || []).filter((p) => p && known.has(p.address) && !seen.has(p.address) && seen.add(p.address)).slice(0, 9);
  out.usage = data.usage;
  return out;
}

/* the written shape — news.html writes a reader's edition in this same shape */
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
async function writeFold(secret, block, period, chosen, byAddress, status, asOf, log) {
  for (const p of chosen.picks) {
    const it = byAddress.get(p.address);
    if (!it || !it.when) continue;
    const w = await postBeach({ block, spindle: p.address, content: entryOf(it), secret });
    if (!w.ok) throw new Error(`the beach refused ${p.address}: ${w.status} ${w.data && (w.data.error || w.data.code)}`);
  }
  const w = await postBeach({ block, spindle: period, content: foldText(chosen, byAddress, status, asOf), secret });
  if (!w.ok) throw new Error(`the beach refused the choice at ${period}: ${w.status} ${w.data && (w.data.error || w.data.code)}`);
  log.push(`chose ${period} (${voiceAddress(period)}): ${chosen.picks.length} picks`);
}

async function foundHouse(secret, ctx, log) {
  let root = 'HOUSE EDITION — the keeper\'s choice of the news on the canonical clock (spine:news, function:news 2): at today\'s own address, chosen again through the day as the wire moves, its headline and its best nine with why each rose; at each pick\'s own address a reference to the thing itself. The keeper chooses only today. Every other period is chosen by its readers, each in their own edition at tree:news:<handle>, and for every period the newest choice stands, whoever made it. Read it at happyseaurchin.com/news.';
  for (let i = 0; i < 10; i++) root = { _: root };
  const w = await postBeach({ block: HOUSE, content: root, new_lock: secret });
  if (!w.ok) throw new Error(`could not found ${HOUSE}: ${w.status} ${w.data && (w.data.error || w.data.code)}`);
  log.push(`founded ${HOUSE}`);
  // carry the channels era in (function:news 3.1): its declarations, as the record of the summer they were made in
  const old = (await declarations(ctx, Date.UTC(2026, 6, 1), Date.UTC(2026, 9, 1))).sort((a, b) => Date.parse(a.when) - Date.parse(b.when));
  if (old.length) {
    const by = new Map(old.map((it) => [it.address, it]));
    const chosen = { headline: 'Before the clock: the declarations made on the first news page this summer, one standing line each, carried in when the news was re-founded on the clock in October.', picks: old.slice(0, 9).map((it) => ({ address: it.address, why: 'declared on the channels page' })) };
    await writeFold(secret, HOUSE, '2026300000', chosen, by, 'sealed', new Date().toISOString(), log);
  }
}

async function keep() {
  const secret = process.env.NEWS_KEEPER_SECRET;
  if (!secret) return { status: 500, body: { error: 'no NEWS_KEEPER_SECRET — the keeper has no latch for the house edition' } };
  const now = new Date(), nowMs = now.getTime();
  const log = [];
  let ctx = await context();
  if (!(await ctx.read(HOUSE)).block) {
    await foundHouse(secret, ctx, log);
    ctx = { ...ctx, read: reader() };             // the house stands now: read it afresh
  }
  if (!process.env.NEWS_ANTHROPIC_KEY && process.env.NEWS_FAKE_MODEL !== '1') {
    return { status: 200, body: { ok: true, log: log.concat('no NEWS_ANTHROPIC_KEY — the keeper chooses nothing; today is chosen by its readers') } };
  }
  const today = periodFor('day', '', now);
  const [answers, editions] = await Promise.all([readAnswers(ctx), readEditions(ctx)]);
  const { list, what } = await candidatesFor('day', today, ctx, editions, nowMs);
  if (!list.length) return { status: 200, body: { ok: true, log: log.concat(`${today.address}: nothing made yet today`) } };
  // the newest choice of today anyone made that chose something real — the keeper's own always counts
  const made = new Set(list.map((it) => it.address));
  const newest = foldsAt(editions, today.address, nowMs).find((f) => f.edition.house || f.picks.some((p) => made.has(p.address)));
  if (newest) {
    const who = newest.edition.house ? 'the keeper' : newest.edition.by;
    if (nowMs - newest.t < REFOLD_FLOOR_MS) return { status: 200, body: { ok: true, log: log.concat(`${today.address}: chosen by ${who} ${Math.round((nowMs - newest.t) / 60000)} min ago — waiting`) } };
    if (!(Date.parse(list[0].when) > newest.t)) return { status: 200, body: { ok: true, log: log.concat(`${today.address}: nothing made since ${who} chose, ${newest.asOf}`) } };
  }
  const candidates = list.map((it) => ({ ...it, answers: tally(answers[it.address]) }));
  const chosen = await choose(CHOOSING_LAW, promptFor('day', voiceAddress(today.address), what, candidates), candidates);
  if (!chosen) return { status: 200, body: { ok: true, log } };
  if (chosen.refused) return { status: 200, body: { ok: true, model: MODEL, usage: chosen.usage, log: log.concat(`${today.address}: the model stopped (${chosen.refused})`) } };
  await writeFold(secret, HOUSE, today.address, chosen, new Map(candidates.map((c) => [c.address, c])), 'so far', now.toISOString(), log);
  const u = chosen.usage || {};
  return { status: 200, body: { ok: true, model: MODEL, tokens: { input: u.input_tokens || 0, output: u.output_tokens || 0 }, log } };
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
      const r = await keep();
      return res.status(r.status).json(r.body);
    }
    if (q.prepare) {
      res.setHeader('Cache-Control', 'no-store');
      const r = await prepare(q);
      if (r.error) return res.status(r.code || 400).json({ error: r.error });
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
