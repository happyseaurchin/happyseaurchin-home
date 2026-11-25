/**
 * /api/commons — the beach's commons (contract three, the whole ecosystem; David, 25 November 2026, in tidy.2:
 * tickets become credits at the moment of payment, shared by XP, with what is free pre-funded by credits; lane
 * credits.apps.1). Money paid into the commons is split the moment it is paid across everyone's four-column XP; the
 * part nobody can be named for goes into a fund for the beach's free things, and the first free thing is an answer on
 * the shared key for someone with no AI of their own.
 *
 * Every credit lives in ONE place: the ticket machine's book, credits:<issuer>, which the machine alone writes, one
 * line a move, in the order it takes them (pscale-commons/ticketing-agent, lib/credits.ts, lane credits.games.1). This
 * function writes nothing to the beach and holds no key of its own. It does three things:
 *
 *   GET  /api/commons?split
 *        the split the machine asks for at the moment a commons ticket is paid: { split: { <handle>: share, …,
 *        "fund:<the fund>": share } }, everyone's four-column XP read on the spot from the voices in the beach's rooms
 *        (spine:experience-points 1.1), the part nobody can be named for going to the fund.
 *   GET  /api/commons
 *        the commons as it stands, read on the spot and kept a minute at the CDN: its law (the block `commons`), what
 *        the book says came in and how each payment was split, what the fund holds and what it has paid for, and
 *        everyone's columns now with their share of the next pound.
 *   POST /api/commons { handle, question, block? }
 *        an answer on the shared key for a handle with no AI of its own: a free go drawn from the fund at the machine
 *        (POST /credits/draw — it keeps the fund's balance and each handle's cap, and pays the go to the makers the
 *        shared key's law names), then the model asked once. The question is written nowhere.
 *
 * Env (Vercel project settings; none of it reaches a page or the beach):
 *   COMMONS_AI         'gateway' — the Vercel AI Gateway on the request's own OIDC token, so no key is stored anywhere
 *                      and the spend is capped by the project's budget there; 'anthropic' — Anthropic directly, on
 *                      COMMONS_ANTHROPIC_KEY. Unset: the shared key is off, and no go is drawn.
 *   COMMONS_BEACH      the beach the law and the book stand on (the live beach unless a test rig names its own).
 *   COMMONS_MACHINE    the ticket machine that keeps the book (the live machine unless a test rig names its own).
 *   COMMONS_FAKE_MODEL=1   the test rig's stand-in for the model; never set in production.
 * Neither address is ever taken from a request.
 */

const BEACH = (process.env.COMMONS_BEACH || 'https://beach.happyseaurchin.com').replace(/\/+$/, '');
const WIRE = `${BEACH}/.well-known/pscale-beach`;
const MACHINE = (process.env.COMMONS_MACHINE || 'https://genus-tickets-production.up.railway.app').replace(/\/+$/, '');
const LAW = 'commons';
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const QUESTION_CHARS = 2000;
const HANDLE = /^[A-Za-z0-9_.\-]{2,64}$/;

/* ── the wire ── */
async function getJSON(url, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: ctl.signal });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`the beach answered ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}
// One read of each block per request, shared by everything that asks for it; nothing is kept between requests.
function reader() {
  const seen = new Map();
  return (name) => {
    if (!seen.has(name)) seen.set(name, getJSON(`${WIRE}?block=${encodeURIComponent(name)}`).catch(() => null));
    return seen.get(name);
  };
}

/* ── reading a block ── */
function voiceOf(n) {
  while (n && typeof n === 'object') { if (!('_' in n)) return ''; n = n._; }
  return typeof n === 'string' ? n.trim() : '';
}
// A law's lines: under a branch, each digit a line '<name>: <value>', read by its opening words as a law's 'mode:'
// and 'page:' are read everywhere on this site.
function lawLines(node) {
  const out = {};
  if (!node || typeof node !== 'object') return out;
  for (const d of DIGITS) {
    const m = /^([a-z][a-z ]*?)\s*:\s*(.+)$/is.exec(voiceOf(node[d]));
    if (m) out[m[1].toLowerCase()] = m[2].trim();
  }
  return out;
}
const listOf = (s) => String(s || '').split(/[,\s]+/).map((x) => x.trim()).filter((x) => HANDLE.test(x));
const numberIn = (s) => { const m = /\d+/.exec(String(s || '')); return m ? Number(m[0]) : 0; };
const nameIn = (s) => (/^[a-z0-9][a-z0-9-]{0,63}$/.exec(String(s || '').trim().split(/\s/)[0] || '') || [''])[0];

/* ── the law ── */
async function lawOf(read) {
  const b = await read(LAW);
  if (!b || typeof b !== 'object') return null;
  const w = lawLines(b['1']), s = lawLines(b['2']), f = lawLines(b['3']);
  return {
    words: voiceOf(b), wallet: voiceOf(b['1']), split: voiceOf(b['2']), free: voiceOf(b['3']),
    test: !/^live\b/i.test(w.mode || ''),
    issuer: listOf(w.issuer)[0] || '',
    point: nameIn(w.point) || 'commons',          // the point a commons ticket's lines carry in the book
    fund: nameIn(w.fund),                         // the machine's product whose fund pays for the free things
    rate: numberIn(w.rate),
    topUp: /^https:\/\/\S+$/.test(w['top up'] || '') ? w['top up'] : '',
    people: listOf(s.people),
    beachMakers: listOf(s['beach makers']),
    keyPoint: nameIn(f.point),                    // the family whose makers an answer pays: the shared key's
    price: numberIn(f.price),
    freeEach: numberIn(f['free answers']),
    model: /^[a-z0-9.\/\-]{3,64}$/i.test(f.model || '') ? f.model : '',
    maxTokens: Math.min(numberIn(f['max tokens']) || 1500, 4000),
    page: voiceOf(b['6']).replace(/^page:\s*/i, ''),
  };
}

/* ── the book: credits:<issuer>, the machine's alone (ticketing-agent lib/credits.ts) ── */
// Each line a move: 1 its id, 2 n, 3 when, 4 the point, 5 to, 6 from (grain:<pair>, fund:<product> or a handle),
// 7 its warrant. Read in the order the beach allocated them — an accumulator counts without zeros and supernests
// when its nine fill, so a longer slot is a later one — exactly as the machine reads it before every move.
function bookLines(book) {
  const out = [];
  (function walk(node, path) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if (typeof node['1'] === 'string' && typeof node['2'] === 'number' && typeof node['5'] === 'string' && typeof node['6'] === 'string') {
      out.push({ slot: path.replace(/^0+/, '') || '0', words: voiceOf(node), id: node['1'], n: node['2'], at: typeof node['3'] === 'string' ? node['3'] : '',
        point: typeof node['4'] === 'string' ? node['4'] : '', to: node['5'], from: node['6'], warrant: typeof node['7'] === 'string' ? node['7'] : '' });
      return;
    }
    for (const k of Object.keys(node)) if (k === '_' || /^[1-9]$/.test(k)) walk(node[k], path + (k === '_' ? '0' : k));
  })(book, '');
  return out.sort((a, b) => a.slot.length - b.slot.length || (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0));
}
const round = (x) => Math.round(x * 100) / 100;
// What every holder holds: what came to them less what went from them, in the book's order. A grain is a source.
function balances(lines) {
  const held = new Map();
  for (const l of lines) {
    if (!l.from.startsWith('grain:')) held.set(l.from, round((held.get(l.from) || 0) - l.n));
    held.set(l.to, round((held.get(l.to) || 0) + l.n));
  }
  return held;
}

/* ── everyone's time: four-column XP, read from the voices in the beach's rooms (spine:experience-points 1.1) ── */
// The voices in a room: every entry with its speaker at 1 and its stamp at 3, through every wrap the room has grown.
function voicesOf(room) {
  const out = [];
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 40) return;
    if (node._ && typeof node._ === 'object') walk(node._, depth + 1);
    for (const d of DIGITS) {
      const v = node[d];
      if (!v || typeof v !== 'object') continue;
      if (typeof v['1'] === 'string' && typeof v['3'] === 'string' && /^\d{4}-\d\d-\d\dT/.test(v['3'])) {
        out.push([v['1'], v['3']]);
        for (const e of ['6', '7', '8', '9']) if (v[e] && typeof v[e] === 'object') walk({ [e]: v[e] }, depth + 1);
      } else walk(v, depth + 1);
    }
  };
  walk(room, 0);
  return out;
}
// The beat an act fell in: a ninth of a ninth of the UTC day (pscale://sundial), as /stack and /ring keep it.
function beatOf(ts) {
  const t = new Date(ts);
  if (!isFinite(t)) return '';
  const secs = t.getUTCHours() * 3600 + t.getUTCMinutes() * 60 + t.getUTCSeconds();
  return `${t.toISOString().slice(0, 10)}#${Math.floor(secs / (86400 / 81))}`;
}
async function inBatches(items, n, fn) {
  let i = 0;
  const run = async () => { while (i < items.length) { const it = items[i++]; await fn(it); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, run));
}

// Stars: a person's own active beats, one a beat however busy. Hearts: the beats of the people they brought — no room
// records who brought whom yet (spine:experience-points 1.1112), so that column stays common. Diamonds: each beat given
// to the makers of the family it was spent in — a person's own room is theirs, any other family's makers are its law's
// 'makers:' line — split evenly, a beat in two families half to each. Waves: every beat to the people the law names as
// the beach's makers, by their own beats. Only the people the law names count; everyone else's time counts nothing (an
// agent's, or a name no one stands behind, 1.15). Whatever cannot be named for anyone stays common.
async function xpOf(law, read) {
  const index = await getJSON(WIRE, 12000).catch(() => null);
  const names = ((index && index.blocks) || []).map((b) => (typeof b === 'string' ? b : b && b.name)).filter(Boolean);
  const rooms = names.filter((n) => n.startsWith('pool:'));
  const people = new Set(law.people);
  const beats = new Map();                                 // person → Map(beat → Set(family))
  await inBatches(rooms, 12, async (room) => {
    const b = await read(room);
    if (!b) return;
    const family = room.slice(5);
    for (const [who, ts] of voicesOf(b)) {
      if (!people.has(who)) continue;
      const k = beatOf(ts);
      if (!k) continue;
      if (!beats.has(who)) beats.set(who, new Map());
      const m = beats.get(who);
      if (!m.has(k)) m.set(k, new Set());
      m.get(k).add(family);
    }
  });
  const families = new Set();
  for (const m of beats.values()) for (const fs of m.values()) for (const f of fs) families.add(f);
  const makers = new Map();
  await inBatches([...families], 12, async (f) => {
    if (people.has(f)) { makers.set(f, [f]); return; }
    makers.set(f, listOf(lawLines(await read(`function:${f}`)).makers).filter((h) => people.has(h)));
  });
  const rows = new Map(law.people.map((h) => [h, { handle: h, stars: 0, hearts: 0, diamonds: 0, waves: 0 }]));
  let total = 0;
  for (const [who, m] of beats) {
    rows.get(who).stars = m.size;
    total += m.size;
    for (const fs of m.values()) for (const f of fs) {
      const mk = makers.get(f) || [];
      for (const h of mk) rows.get(h).diamonds += 1 / fs.size / mk.length;
    }
  }
  const crew = law.beachMakers.filter((h) => rows.has(h));
  const crewBeats = crew.reduce((s, h) => s + rows.get(h).stars, 0);
  for (const h of crew) rows.get(h).waves = total * (crewBeats ? rows.get(h).stars / crewBeats : 1 / crew.length);
  const list = [...rows.values()].map((r) => ({ ...r, weight: total ? (r.stars + r.hearts + r.diamonds + r.waves) / (4 * total) : 0 }));
  const columns = { stars: 0, hearts: 0, diamonds: 0, waves: 0 };
  for (const r of list) for (const c of Object.keys(columns)) columns[c] += r[c];
  const common = total ? Math.max(0, 1 - list.reduce((s, r) => s + r.weight, 0)) : 1;
  list.sort((a, b) => b.weight - a.weight || a.handle.localeCompare(b.handle));
  return { rooms: rooms.length, beats: total, columns, people: list, common };
}

// The split the machine writes at the moment a commons ticket is paid: each person's share, and the common part to
// the fund that pays for the free things. Shares, not credits: the machine divides the ticket's n by them.
function splitOf(xp, law) {
  const split = {};
  for (const p of xp.people) if (p.weight > 0) split[p.handle] = Number(p.weight.toFixed(6));
  if (law.fund && xp.common > 0) split[`fund:${law.fund}`] = Number(xp.common.toFixed(6));
  return split;
}

/* ── the commons as it stands ── */
async function commons(read) {
  const law = await lawOf(read);
  if (!law) return { founded: false };
  const lines = law.issuer ? bookLines(await read(`credits:${law.issuer}`)) : [];
  const held = balances(lines);
  const fund = law.fund ? `fund:${law.fund}` : '';
  const xp = await xpOf(law, read);
  // Each payment into the commons, whole: its lines grouped by the purchase they came from.
  const payments = new Map();
  for (const l of lines) {
    if (l.point !== law.point || !l.from.startsWith('grain:')) continue;
    if (!payments.has(l.id)) payments.set(l.id, { when: l.at, n: 0, to: [] });
    const p = payments.get(l.id);
    p.n = round(p.n + l.n);
    p.to.push({ to: l.to === fund ? 'the fund' : l.to, n: l.n });
  }
  const intoFund = lines.filter((l) => l.to === fund && l.point !== law.point).map((l) => ({ when: l.at, n: l.n, from: l.from.startsWith('grain:') ? 'a ticket' : l.from }));
  // What the fund paid for, one free go at a time (a go may be split among the key's makers: one row a go).
  const goes = new Map();
  for (const l of lines) {
    if (l.from !== fund) continue;
    if (!goes.has(l.id)) goes.set(l.id, { when: l.at, n: 0, for: l.warrant, to: [] });
    const g = goes.get(l.id);
    g.n = round(g.n + l.n);
    g.to.push(l.to);
  }
  const received = new Map();
  for (const l of lines) if (l.point === law.point && l.from.startsWith('grain:') && l.to !== fund) received.set(l.to, round((received.get(l.to) || 0) + l.n));
  return {
    founded: true,
    law: { words: law.words, wallet: law.wallet, split: law.split, free: law.free, test: law.test, issuer: law.issuer, fund: law.fund, rate: law.rate, topUp: law.topUp, price: law.price, freeEach: law.freeEach, model: law.model, keyPoint: law.keyPoint, page: law.page },
    book: law.issuer ? `credits:${law.issuer}` : '',
    fund: fund ? (held.get(fund) || 0) : 0,
    paidIn: round([...payments.values()].reduce((s, p) => s + p.n, 0) + intoFund.reduce((s, x) => s + x.n, 0)),
    payments: [...payments.values()].reverse(),
    intoFund: intoFund.reverse(),
    goes: [...goes.values()].reverse(),
    people: xp.people.filter((p) => p.weight > 0 || received.has(p.handle)).map((p) => ({ ...p, received: received.get(p.handle) || 0, holds: held.get(p.handle) || 0 })),
    xp: { rooms: xp.rooms, beats: xp.beats, columns: xp.columns, common: xp.common },
    switchedOn: process.env.COMMONS_FAKE_MODEL === '1' || /^(gateway|anthropic)$/i.test(process.env.COMMONS_AI || ''),
    asOf: new Date().toISOString(),
  };
}

/* ── an answer on the shared key ── */
class Refusal extends Error { constructor(status, message) { super(message); this.status = status; } }
const SYSTEM = 'You answer one question for someone on the beach at happyseaurchin.com who has no AI of their own; the ' +
  "beach's commons, credits other people paid in, pays for this answer. Answer plainly and briefly, in under two " +
  'hundred words, in British English. Where the opening lines of a block on the beach are given below, answer from ' +
  'them and say where on the beach to look; where you do not know, say so.';

async function contextOf(block, read) {
  if (!block || !/^[A-Za-z0-9:_.\-]{1,128}$/.test(block)) return '';
  const b = await read(block);
  if (!b || typeof b !== 'object') return '';
  const lines = [`The block ${block}: ${voiceOf(b)}`];
  for (const d of DIGITS) { const t = voiceOf(b[d]); if (t) lines.push(`${d}: ${t}`); }
  return `\n\n${lines.join('\n').slice(0, 6000)}`;
}

// Which key answers: decided by the server's own settings, never by a request.
function route() {
  if (process.env.COMMONS_FAKE_MODEL === '1') return 'fake';
  const r = String(process.env.COMMONS_AI || '').toLowerCase();
  if (r === 'gateway') return 'gateway';
  if (r === 'anthropic' && process.env.COMMONS_ANTHROPIC_KEY) return 'anthropic';
  return '';
}

async function askModel(law, question, context, req) {
  const how = route();
  if (how === 'fake') {     // the test rig's stand-in: never set in production
    return { text: `(Test: no model was asked and nothing was spent on any key. On the shared key, ${law.model || 'the model'} would answer this question here.)`, model: 'test stand-in' };
  }
  let url, auth, model = law.model || 'claude-opus-5-5';
  if (how === 'gateway') {
    const token = req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
    if (!token) throw new Refusal(503, 'The shared key is switched to the AI Gateway, but this deployment was given no token for it.');
    url = 'https://ai-gateway.vercel.sh/v1/messages';
    auth = { Authorization: `Bearer ${token}` };
    if (!model.includes('/')) model = `anthropic/${model}`;
  } else {
    url = 'https://api.anthropic.com/v1/messages';
    auth = { 'x-api-key': process.env.COMMONS_ANTHROPIC_KEY };
  }
  const body = { model, max_tokens: law.maxTokens, system: SYSTEM + context, output_config: { effort: 'low' }, messages: [{ role: 'user', content: question }] };
  const headers = { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', ...auth };
  if (/^(anthropic\/)?claude-(opus-5|sonnet-5-5|fable-5)/.test(model)) {     // a refusal falls back on the server, where the model takes it
    body.fallbacks = 'default';
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  }
  const call = () => fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  let r = await call();
  let data = await r.json().catch(() => null);
  if (r.status === 400 && body.fallbacks) {
    delete body.fallbacks; delete headers['anthropic-beta'];
    r = await call(); data = await r.json().catch(() => null);
  }
  if (!r.ok || !data) throw new Refusal(502, `The model could not answer (${r.status}${data && data.error ? `: ${data.error.message}` : ''}); the free answer it was drawn for is spent.`);
  if (data.stop_reason === 'refusal') return { text: 'The model declined to answer this one.', model: data.model || model };
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return { text: text || '(The answer came back empty.)', model: data.model || model, cut: data.stop_reason === 'max_tokens' };
}

const DRAW_REFUSED = {
  fund_empty: [402, "The commons' fund for free answers is empty: it needs topping up before it can pay for another."],
  no_free_goes_left: [429, 'has had all the free answers the commons gives one handle.'],
  not_a_fund: [503, 'The fund this commons names is not set up at the ticket machine.'],
  unknown_product: [503, 'The fund this commons names is not set up at the ticket machine.'],
  point_names_no_makers: [503, "The shared key's law names no makers to pay."],
};

async function answer(req, body) {
  const read = reader();
  const handle = String(body.handle || '').trim();
  const question = String(body.question || '').trim();
  if (!HANDLE.test(handle)) throw new Refusal(400, 'Say which handle on the beach is asking.');
  if (!question || question.length > QUESTION_CHARS) throw new Refusal(400, `Ask one question, up to ${QUESTION_CHARS} characters.`);
  const law = await lawOf(read);
  if (!law || !law.fund) throw new Refusal(503, 'The commons is not founded on this beach.');
  if (!route()) throw new Refusal(503, 'The shared key is not switched on yet: nothing was drawn and nothing was spent.');
  if (!(await read(`passport:${handle}`))) throw new Refusal(404, `There is no ${handle} on this beach: make a passport at happyseaurchin.com/welcome first.`);
  // The go is drawn first, so the fund is never overdrawn and the key's makers are paid for every answer made.
  const r = await fetch(`${MACHINE}/credits/draw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: law.fund, holder: handle }) });
  const d = await r.json().catch(() => null);
  if (!d || !d.ok) {
    const [status, words] = DRAW_REFUSED[d && d.error] || [502, `The ticket machine could not draw a free answer (${(d && d.error) || r.status}).`];
    throw new Refusal(status, d && d.error === 'no_free_goes_left' ? `${handle} ${words}` : words);
  }
  const reply = await askModel(law, question, await contextOf(body.block, read), req);
  return { answer: reply.text, cut: !!reply.cut, model: reply.model, cost: law.price, to: d.makers, fundLeft: d.fund_left, freeLeft: d.free_left, test: law.test };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const read = reader();
      res.setHeader('Vercel-CDN-Cache-Control', 'max-age=60, stale-while-revalidate=300');
      if (req.query && 'split' in req.query) {
        const law = await lawOf(read);
        if (!law) return res.status(404).json({ error: 'The commons is not founded on this beach.' });
        const xp = await xpOf(law, read);
        return res.status(200).json({ split: splitOf(xp, law), beats: xp.beats, asOf: new Date().toISOString() });
      }
      return res.status(200).json(await commons(read));
    } catch (e) {
      return res.status(502).json({ error: `The beach could not be read: ${e.message}` });
    }
  }
  if (req.method === 'POST') {
    try {
      return res.status(200).json(await answer(req, (req.body && typeof req.body === 'object') ? req.body : {}));
    } catch (e) {
      return res.status(e instanceof Refusal ? e.status : 500).json({ error: e.message });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'GET or POST' });
}

export { lawOf, bookLines, balances, voicesOf, beatOf, xpOf, splitOf };
