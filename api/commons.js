/**
 * /api/commons — the beach's commons: a pot of credits that is everyone's by their time on the beach and pays for the
 * beach's free things, so that someone who has put nothing in can still use them (contract three, the whole
 * ecosystem; David, 25 November 2026, lane credits.apps.1). Its law is the block `commons`; its wallet is
 * passport:commons, whose latch only this function holds.
 *
 *   GET  /api/commons
 *        the commons as it stands, read on the spot and kept a minute or two at the CDN: its law; its wallet read by
 *        the rules credits.games.1 set at pool:experience-points 2 (a receipt counts only where the giver's own
 *        ledger holds the gift; a mint only where the issuer the law names backs it with an unrevoked ticket grain
 *        and its [ticket-verified] audit line, net of every earlier gift citing that grain; every gift the commons
 *        offers counts against it at once, kept or not); the money in, what it paid for, and what waits to be kept;
 *        and everyone's four-column XP (spine:experience-points 1.1) with each person's part of the pot.
 *   POST /api/commons { handle, question, block? }
 *        an answer on the shared key for a handle that has no AI of its own, paid from the commons: it first keeps
 *        whatever has been given to the commons and not yet kept, then refuses if the pot cannot cover an answer's
 *        price or the handle has had its answers for the day; else it asks the model once and gives the price from
 *        the commons to the key's holder, whose key made the answer. The question is never written anywhere.
 *   POST /api/commons { keep: true }
 *        only the keeping: what was given to the commons becomes its own, as a receipt at its 6.2 (sand-v2 4).
 *
 * Env (Vercel project settings; none of it ever reaches a page or the beach):
 *   COMMONS_SECRET         the commons' latch. Without it nothing is kept or spent.
 *   COMMONS_AI             'gateway' — the Vercel AI Gateway, on the request's own OIDC token, so no key is stored
 *                          anywhere and the spend is capped by the project's budget there; 'anthropic' — Anthropic
 *                          directly, on COMMONS_ANTHROPIC_KEY. Unset: the shared key is off and nothing is spent.
 *   COMMONS_BEACH          the beach the commons stands on; the live beach unless a test rig names its own. Never
 *                          taken from a request, so the latch can only ever travel to this beach.
 *   COMMONS_FAKE_MODEL=1   the test rig's stand-in for the model; never set in production.
 */
import { createHash } from 'node:crypto';

const BEACH = (process.env.COMMONS_BEACH || 'https://beach.happyseaurchin.com').replace(/\/+$/, '');
const WIRE = `${BEACH}/.well-known/pscale-beach`;
const POT = 'commons';        // the wallet's handle: passport:commons
const LAW = 'commons';        // the law's block — no colon, so the wallet's latch binds nothing of it
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const QUESTION_CHARS = 2000;

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
async function post(body) {
  const r = await fetch(WIRE, {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, data };
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
function at(b, address) {
  let n = b;
  for (const d of String(address).replace('.', '')) { if (!n || typeof n !== 'object') return undefined; n = n[d]; }
  return n;
}
// A law's lines: under a branch, each digit a line '<name>: <value>', read by its opening words as a law's 'mode:'
// and 'page:' are read everywhere on this site.
function linesOf(node) {
  const out = {};
  if (!node || typeof node !== 'object') return out;
  for (const d of DIGITS) {
    const m = /^([a-z][a-z ]*?)\s*:\s*(.+)$/is.exec(voiceOf(node[d]));
    if (m) out[m[1].toLowerCase()] = m[2].trim();
  }
  return out;
}
const listOf = (s) => String(s || '').split(/[,\s]+/).map((x) => x.trim()).filter((x) => /^[A-Za-z0-9_.\-]{1,64}$/.test(x));
const numberIn = (s) => { const m = /\d+/.exec(String(s || '')); return m ? Number(m[0]) : 0; };

/* ── the law ── */
async function lawOf(read) {
  const b = await read(LAW);
  if (!b || typeof b !== 'object') return null;
  const w = linesOf(b['1']), s = linesOf(b['2']), f = linesOf(b['3']);
  return {
    words: voiceOf(b), wallet: voiceOf(b['1']), split: voiceOf(b['2']), free: voiceOf(b['3']),
    test: !/^live\b/i.test(w.mode || ''),
    issuer: listOf(w.issuer)[0] || '',
    rate: numberIn(w.rate),
    topic: /^0\.[1-9]{1,9}$/.test(w.topic || '') ? w.topic : '0.1',
    topUp: /^https:\/\/\S+$/.test(w['top up'] || '') ? w['top up'] : '',
    people: listOf(s.people),
    beachMakers: listOf(s['beach makers']),
    price: numberIn(f.price),
    model: /^[a-z0-9.\/\-]{3,64}$/i.test(f.model || '') ? f.model : '',
    maxTokens: Math.min(numberIn(f['max tokens']) || 1500, 4000),
    daily: numberIn(f.daily) || 3,
    dailyAll: numberIn(f['in all']) || 30,
    holder: listOf(f['key holder'])[0] || '',
    page: voiceOf(b['6']).replace(/^page:\s*/i, ''),
  };
}

/* ── the wallets: sand-v2's ledgers, read by the rules at pool:experience-points 2 ── */
// Every gift on a passport's out-ledger, in the order given: 6.3's digits walked in order, a node holding a gift's
// fields (1 a string, 2 a number, 3 a string) read as one, any other node a shelf walked through (bsp-mcp collectGaves).
function giftsOf(passport) {
  const out = [];
  const walk = (node, address, depth) => {
    if (!node || typeof node !== 'object' || depth > 4) return;
    for (const d of DIGITS) {
      const v = node[d];
      if (!v || typeof v !== 'object') continue;
      if (typeof v['1'] === 'string' && typeof v['2'] === 'number' && typeof v['3'] === 'string') {
        out.push({ address: address + d, probe: v['1'], n: v['2'], to: v['3'], topic: v['4'], ts: v['5'] || '', channel: v['6'], audit: v['7'], words: voiceOf(v) });
      } else walk(v, address + d, depth + 1);
    }
  };
  walk(at(passport, '6.3'), '6.3', 0);
  return out;
}
// Every receipt under a passport's 6.2, whatever topic it is filed at: a node with its verdict at 1 and its giver at 6.
function receiptsOf(passport) {
  const out = [];
  const walk = (node, address, depth) => {
    if (!node || typeof node !== 'object' || depth > 12) return;
    for (const d of DIGITS) {
      const v = node[d];
      if (!v || typeof v !== 'object') continue;
      if (typeof v['1'] === 'string' && typeof v['6'] === 'string') {
        out.push({ address: address + d, verdict: v['1'], n: typeof v['2'] === 'number' ? v['2'] : 0, ts: v['4'] || '', probe: v['5'], from: v['6'] });
      } else walk(v, address + d, depth + 1);
    }
  };
  walk(at(passport, '6.2'), '6.2', 0);
  return out;
}

// A MINT is backed by its ticket, never by the issuer's balance (sand-v2 2, as ruled 25 August; bsp-mcp verifyGrainMint):
// the grain stands with the issuer at one side of its 9, that side's ticket carries credits=N and no [ticket-revoked],
// the audit line the gift names marks that grain verified, and every gift citing the grain up to this one stays within N.
// Returns '' when backed, else why not.
async function mintUnbacked(issuer, issuerGifts, g, read) {
  if (!/^grain:[a-f0-9]{16}$/.test(g.channel || '')) return 'it names no ticket grain';
  const grain = await read(g.channel);
  if (!grain || typeof grain !== 'object') return `${g.channel} is not on this beach`;
  const nine = grain['9'] || {};
  const side = nine['1'] === issuer ? '1' : nine['2'] === issuer ? '2' : '';
  if (!side) return `${issuer} is not a party to ${g.channel}`;
  const sideNode = grain[side];
  const ticket = /\[ticket\b[^\]]*\bcredits=(\d+)/.exec(typeof sideNode === 'string' ? sideNode : voiceOf(sideNode));
  if (!ticket) return `the ticket on ${g.channel} carries no credits`;
  if (sideNode && typeof sideNode === 'object' && DIGITS.some((d) => typeof sideNode[d] === 'string' && sideNode[d].includes('[ticket-revoked'))) return 'its ticket was refunded';
  const audit = /^sed:([^:]+):([1-9]+)$/.exec(g.audit || '');
  if (!audit) return 'it names no audit line';
  const line = JSON.stringify(at(await read(`sed:${audit[1]}`), audit[2]) ?? '');
  if (!line.includes('[ticket-verified') || !line.includes(g.channel)) return `no [ticket-verified] line naming ${g.channel} stands at ${g.audit}`;
  let cited = 0;
  for (const x of issuerGifts) { if (x.channel !== g.channel) continue; cited += x.n; if (x.address === g.address) break; }
  if (cited > Number(ticket[1])) return `the gifts citing ${g.channel} come to ${cited}, more than the ${ticket[1]} its ticket backs`;
  return '';
}

// A WALLET by the three rules. Its receipts count only where (1) the giver's ledger holds that gift, to this holder,
// for at least what was kept, and (2) the gift was covered — a mint backed by its ticket when the giver is the issuer
// the law names, else within the giver's own balance read by these same rules; (3) every gift it offers counts
// against it at once, in the order given, kept or not, and one that runs past what it holds is unbacked whoever keeps
// it. Nothing is stored: every figure is read from the parties' own ledgers each time.
async function walletOf(handle, law, read, depth = 0, memo = new Map()) {
  if (memo.has(handle)) return memo.get(handle);
  const passport = await read(`passport:${handle}`);
  const w = { handle, found: !!passport, receipts: [], gifts: passport ? giftsOf(passport) : [], received: 0, given: 0, balance: 0 };
  memo.set(handle, w);
  if (!passport) return w;
  for (const r of receiptsOf(passport)) {
    const kept = { ...r, counted: false, why: '' };
    w.receipts.push(kept);
    if (r.from === handle) { kept.why = 'a gift to oneself moves nothing'; continue; }
    if (r.verdict === 'unbacked' || r.verdict === 'fail') { kept.why = `kept as ${r.verdict}`; continue; }
    const giverBook = await read(`passport:${r.from}`);
    const giverGifts = giverBook ? giftsOf(giverBook) : [];
    const g = giverGifts.find((x) => x.probe === r.probe);
    if (!g) { kept.why = `${r.from}'s ledger holds no such gift`; continue; }
    if (g.to !== handle) { kept.why = `that gift was to ${g.to}`; continue; }
    if (r.n > g.n) { kept.why = `kept as ${r.n}, but only ${g.n} was offered`; continue; }
    if (r.from === law.issuer) {
      kept.why = await mintUnbacked(r.from, giverGifts, g, read);
    } else if (depth >= 3) {
      kept.why = 'the gift came too far along a chain to follow here';
    } else {
      const giver = await walletOf(r.from, law, read, depth + 1, memo);
      const theirs = giver.gifts.find((x) => x.address === g.address);
      kept.why = theirs && theirs.backed ? '' : `${r.from} did not hold it to give`;
    }
    kept.counted = !kept.why;
    kept.mint = r.from === law.issuer;
    if (kept.counted) w.received += r.n;
  }
  let running = w.received;
  for (const g of w.gifts) { running -= g.n; g.backed = running >= 0; w.given += g.n; }
  w.balance = w.received - w.given;
  return w;
}

// What has been given to the commons and not yet kept: the issuer's mints, and gifts from the people the law names.
async function openTo(law, read, pot) {
  const kept = new Set(receiptsOf(pot || {}).map((r) => `${r.from}\n${r.probe}`));
  const out = [];
  for (const giver of [...new Set([law.issuer, ...law.people].filter(Boolean))]) {
    const book = await read(`passport:${giver}`);
    if (!book) continue;
    const gifts = giftsOf(book);
    for (const g of gifts) if (g.to === POT && !kept.has(`${giver}\n${g.probe}`)) out.push({ ...g, from: giver, gifts });
  }
  return out;
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
// to the makers of the families it was spent in — a person's own room is theirs, any other family's makers are its
// law's 'makers:' line — split evenly, a beat in two families half to each. Waves: every beat to the people the law
// names as the beach's makers, by their own beats. Only the people the law names count; everyone else's time counts
// nothing (an agent's or an unknown name's, 1.15). Whatever cannot be named for anyone stays common.
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
    const named = listOf(linesOf(await read(`function:${f}`)).makers).filter((h) => people.has(h));
    makers.set(f, named);
  });
  const row = (h) => ({ handle: h, stars: 0, hearts: 0, diamonds: 0, waves: 0 });
  const rows = new Map(law.people.map((h) => [h, row(h)]));
  let total = 0;
  for (const [who, m] of beats) {
    rows.get(who).stars = m.size;
    total += m.size;
    for (const fs of m.values()) {
      for (const f of fs) {
        const mk = makers.get(f) || [];
        for (const h of mk) rows.get(h).diamonds += 1 / fs.size / mk.length;
      }
    }
  }
  const crew = law.beachMakers.filter((h) => rows.has(h));
  const crewBeats = crew.reduce((s, h) => s + rows.get(h).stars, 0);
  for (const h of crew) rows.get(h).waves = total * (crewBeats ? rows.get(h).stars / crewBeats : 1 / crew.length);
  const list = [...rows.values()].map((r) => ({ ...r, weight: total ? (r.stars + r.hearts + r.diamonds + r.waves) / (4 * total) : 0 }));
  const named = { stars: 0, hearts: 0, diamonds: 0, waves: 0 };
  for (const r of list) for (const c of Object.keys(named)) named[c] += r[c];
  const common = total ? 1 - list.reduce((s, r) => s + r.weight, 0) : 1;
  list.sort((a, b) => b.weight - a.weight || a.handle.localeCompare(b.handle));
  return { rooms: rooms.length, beats: total, columns: named, people: list.filter((r) => r.weight > 0), common: Math.max(0, common) };
}

/* ── the commons as it stands ── */
async function commons(read) {
  const law = await lawOf(read);
  if (!law) return { founded: false, beach: BEACH };
  const [pot, wallet] = [await read(`passport:${POT}`), await walletOf(POT, law, read)];
  const waiting = (await openTo(law, read, pot)).map((g) => ({ from: g.from === law.issuer ? 'the ticket machine' : g.from, n: g.n, when: g.ts, mint: g.from === law.issuer }));
  const xp = await xpOf(law, read);
  const parts = xp.people.map((r) => ({ ...r, part: Math.floor(wallet.balance * r.weight) }));
  return {
    founded: true,
    beach: BEACH,
    law: { words: law.words, wallet: law.wallet, split: law.split, free: law.free, test: law.test, issuer: law.issuer, rate: law.rate, topUp: law.topUp, price: law.price, model: law.model, daily: law.daily, dailyAll: law.dailyAll, holder: law.holder, page: law.page },
    balance: wallet.balance,
    received: wallet.received,
    given: wallet.given,
    in: wallet.receipts.map((r) => ({ when: r.ts, n: r.n, from: r.mint ? 'the ticket machine' : r.from, mint: !!r.mint, counted: r.counted, why: r.why })),
    out: wallet.gifts.map((g) => ({ when: g.ts, n: g.n, to: g.to, words: g.words, backed: g.backed })),
    waiting,
    xp: { rooms: xp.rooms, beats: xp.beats, columns: xp.columns, common: xp.common },
    parts,
    commonPart: Math.max(0, wallet.balance - parts.reduce((s, r) => s + r.part, 0)),
    switchedOn: !!process.env.COMMONS_SECRET && (process.env.COMMONS_FAKE_MODEL === '1' || /^(gateway|anthropic)$/i.test(process.env.COMMONS_AI || '')),
    asOf: new Date().toISOString(),
  };
}

/* ── writing the commons' own ledgers, under its latch ── */
// The commons' passport is founded the first time it is needed, latched to COMMONS_SECRET; over a latched passport
// the founding write carries no secret and changes nothing.
async function found(secret) {
  await post({
    block: `passport:${POT}`, new_lock: secret,
    content: {
      _: "commons — the beach's commons: a pot of credits that is everyone's by their time on the beach and pays for the beach's free things, so that someone who has put nothing in can still use them. Its law is the block commons. Its credits come in at 6.2 and go out at 6.3, each kept and given by the beach's own server under this latch and by that law alone; a credit is never paid out as money (sand-v2 1.3).",
      6: { _: 'The SAND ledgers (sand-v2): 2, what has been kept; 3, what has been given.', 2: { _: 'Receipts, filed by topic.' }, 3: { _: 'Gifts, nine to a shelf, in the order given.' } },
    },
  }).catch(() => null);
}
// A digit position holds nine and never grows, and an entry's own fields fill the digits beneath it, so the commons'
// receipts and gifts go on shelves of nine, each founded the first time it is needed. The append only allocates the
// slot: the beach stamps an appended entry's field 3 with its arrival time unless 3 already holds a date, and a gift
// keeps its recipient there (a receipt its giver's total), so the entry is then written whole at the address it
// landed in, which no stamp touches.
async function appendOnShelf(node, content, secret, label) {
  const settle = async (address) => {
    const w = await post({ block: `passport:${POT}`, spindle: address, content, secret });
    if (!w.ok) throw new Error(`the entry at ${address} could not be written whole: ${(w.data && w.data.error) || w.status}`);
    return address;
  };
  for (let k = 1; k <= 9; k++) {
    const spindle = `${node}${k}`;
    const put = () => post({ block: `passport:${POT}`, spindle, append: true, content, secret });
    let r = await put();
    if (r.ok && r.data && r.data.address) return settle(r.data.address);
    if (r.status === 404 && r.data && r.data.code === 'not_found') {
      const parent = await post({ block: `passport:${POT}`, spindle, content: { _: `Shelf ${k} of ${label}: nine to a shelf, in the order they came.` }, secret });
      if (!parent.ok) throw new Error((parent.data && parent.data.error) || `the beach answered ${parent.status}`);
      r = await put();
      if (r.ok && r.data && r.data.address) return settle(r.data.address);
    }
    if (!(r.data && r.data.code === 'node_full')) throw new Error((r.data && r.data.error) || `the beach answered ${r.status}`);
  }
  throw new Error(`the commons' ${label} are full`);
}
function topicNode(topic) { return `6.2${topic.replace(/^0\./, '')}`; }

// RECEIVE IS THE TRANSFER (sand-v2 4): what was given to the commons becomes its own as a receipt at its 6.2, at the
// gift's topic — 'pass' with what it received where the gift is backed, 'unbacked' with nothing where it is not. A
// topic's node is written only where none stands, since a node written whole would take its receipts with it.
async function keepWhatIsWaiting(law, secret, read) {
  let pot = await read(`passport:${POT}`);
  if (!pot) { await found(secret); pot = await getJSON(`${WIRE}?block=${encodeURIComponent(`passport:${POT}`)}`).catch(() => null); }
  const made = new Set();
  const kept = [];
  for (const g of await openTo(law, read, pot)) {
    const topic = /^0\.[1-9]{1,9}$/.test(g.topic || '') ? g.topic : law.topic;
    const why = g.from === law.issuer ? await mintUnbacked(g.from, g.gifts, g, read)
      : (await walletOf(g.from, law, read)).gifts.find((x) => x.address === g.address && x.backed) ? '' : `${g.from} did not hold it to give`;
    const verdict = why ? 'unbacked' : 'pass';
    const node = topicNode(topic);
    if (at(pot, node) === undefined && !made.has(node)) {
      const r = await post({ block: `passport:${POT}`, spindle: node, content: { _: `Receipts kept at topic ${topic}.` }, secret });
      if (!r.ok) throw new Error((r.data && r.data.error) || `the beach answered ${r.status}`);
      made.add(node);
    }
    const address = await appendOnShelf(node, {
      _: `receipt — ${verdict} of ${g.from} (${g.probe})${verdict === 'pass' ? `, received ${g.n}` : `: ${why}`}`,
      1: verdict, 2: verdict === 'pass' ? g.n : 0, 3: g.n, 4: new Date().toISOString(), 5: g.probe, 6: g.from,
    }, secret, 'receipts');
    kept.push({ from: g.from, n: g.n, verdict, address });
  }
  return kept;
}

/* ── an answer on the shared key ── */
class Refusal extends Error { constructor(status, message) { super(message); this.status = status; } }
const SYSTEM = 'You answer one question for someone on the beach at happyseaurchin.com who has no AI of their own; the ' +
  "beach's commons, a pot of credits other people put in, pays for this answer. Answer plainly and briefly, in under " +
  'two hundred words, in British English. Where the opening lines of a block on the beach are given below, answer from ' +
  'them and say where on the beach to look; where you do not know, say so.';

async function contextOf(block, read) {
  if (!block || !/^[A-Za-z0-9:_.\-]{1,128}$/.test(block)) return '';
  const b = await read(block);
  if (!b || typeof b !== 'object') return '';
  const lines = [`The block ${block}: ${voiceOf(b)}`];
  for (const d of DIGITS) { const t = voiceOf(b[d]); if (t) lines.push(`${d}: ${t}`); }
  return `\n\n${lines.join('\n').slice(0, 6000)}`;
}

async function askModel(law, question, context, req) {
  if (process.env.COMMONS_FAKE_MODEL === '1') {     // the test rig's stand-in: never set in production
    return { text: `(Test: no model was asked and nothing was spent on any key. On the shared key, ${law.model || 'the model'} would answer this question here.)`, model: 'test stand-in', usage: { input_tokens: 0, output_tokens: 0 } };
  }
  const route = String(process.env.COMMONS_AI || '').toLowerCase();
  let url, auth, model = law.model || 'claude-opus-5-5';
  if (route === 'gateway') {
    const token = req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
    if (!token) throw new Refusal(503, 'The shared key is switched to the AI Gateway, but this deployment was given no token for it.');
    url = 'https://ai-gateway.vercel.sh/v1/messages';
    auth = { Authorization: `Bearer ${token}` };
    if (!model.includes('/')) model = `anthropic/${model}`;
  } else if (route === 'anthropic' && process.env.COMMONS_ANTHROPIC_KEY) {
    url = 'https://api.anthropic.com/v1/messages';
    auth = { 'x-api-key': process.env.COMMONS_ANTHROPIC_KEY };
  } else {
    throw new Refusal(503, 'The shared key is not switched on yet: nothing was asked and nothing was spent.');
  }
  const body = {
    model, max_tokens: law.maxTokens, system: SYSTEM + context,
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: question }],
  };
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
  if (!r.ok || !data) throw new Refusal(502, `The model could not answer (${r.status}${data && data.error ? `: ${data.error.message}` : ''}).`);
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (data.stop_reason === 'refusal') return { text: 'The model declined to answer this one.', model: data.model || model, usage: data.usage };
  return { text: text || '(The answer came back empty.)', model: data.model || model, usage: data.usage, cut: data.stop_reason === 'max_tokens' };
}

// Who asked is kept out of the record: the gift's id carries a short digest of the handle, enough to count its answers
// for the day and to name nobody.
const asker = (handle) => createHash('sha256').update(`commons\n${handle.toLowerCase()}`).digest('hex').slice(0, 12);

async function answer(req, body, secret) {
  const read = reader();
  const handle = String(body.handle || '').trim();
  const question = String(body.question || '').trim();
  if (!/^[A-Za-z0-9_.\-]{2,64}$/.test(handle)) throw new Refusal(400, 'Say which handle on the beach is asking.');
  if (!question || question.length > QUESTION_CHARS) throw new Refusal(400, `Ask one question, up to ${QUESTION_CHARS} characters.`);
  const law = await lawOf(read);
  if (!law) throw new Refusal(503, 'The commons is not founded on this beach.');
  if (!law.price || !law.holder) throw new Refusal(503, "The commons' law names no price or no key holder for an answer.");
  if (!(await read(`passport:${handle}`))) throw new Refusal(404, `There is no ${handle} on this beach: make a passport at happyseaurchin.com/welcome first.`);
  await keepWhatIsWaiting(law, secret, read);
  const fresh = reader();
  const wallet = await walletOf(POT, law, fresh);
  if (wallet.balance < law.price) throw new Refusal(402, `The commons holds ${wallet.balance} credits and an answer costs ${law.price}: it needs topping up before it can pay for another.`);
  const day = new Date().toISOString().slice(0, 10);
  const mine = `answer:${asker(handle)}:${day}`;
  if (wallet.gifts.filter((g) => g.probe.startsWith(mine)).length >= law.daily) throw new Refusal(429, `The commons pays for ${law.daily} answers a day for each handle; ${handle} has had today's.`);
  if (wallet.gifts.filter((g) => g.probe.startsWith('answer:') && g.probe.includes(`:${day}:`)).length >= law.dailyAll) throw new Refusal(429, `The commons pays for ${law.dailyAll} answers a day in all, and today's are given.`);
  const reply = await askModel(law, question, await contextOf(body.block, fresh), req);
  const now = new Date().toISOString();
  const tokens = reply.usage ? `${reply.usage.input_tokens || 0} tokens in, ${reply.usage.output_tokens || 0} out` : '';
  let address = null, recorded = '';
  try {
    address = await appendOnShelf('6.3', {
      _: `gave ${law.price} to ${law.holder} — an answer on the shared key for someone with no AI of their own, ${reply.model}${tokens ? `, ${tokens}` : ''}; ${law.holder}'s key made it, and the commons paid for it`,
      1: `${mine}:${now.slice(11, 19)}`, 2: law.price, 3: law.holder, 4: law.topic, 5: now,
    }, secret, 'gifts');
  } catch (e) {
    recorded = `The answer was made but its cost could not be written to the commons: ${e.message}`;
  }
  return { answer: reply.text, cut: !!reply.cut, model: reply.model, cost: law.price, to: law.holder, balance: wallet.balance - (address ? law.price : 0), address, recorded, test: law.test };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const out = await commons(reader());
      res.setHeader('Vercel-CDN-Cache-Control', 'max-age=60, stale-while-revalidate=300');
      return res.status(200).json(out);
    } catch (e) {
      return res.status(502).json({ error: `The beach could not be read: ${e.message}` });
    }
  }
  if (req.method === 'POST') {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const secret = process.env.COMMONS_SECRET;
    try {
      if (!secret) throw new Refusal(503, 'The commons is not switched on here: nothing is kept or spent until it is.');
      if (body.keep === true) {
        const read = reader();
        const law = await lawOf(read);
        if (!law) throw new Refusal(503, 'The commons is not founded on this beach.');
        return res.status(200).json({ kept: await keepWhatIsWaiting(law, secret, read) });
      }
      return res.status(200).json(await answer(req, body, secret));
    } catch (e) {
      return res.status(e instanceof Refusal ? e.status : 500).json({ error: e.message });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'GET or POST' });
}

export { lawOf, walletOf, giftsOf, receiptsOf, voicesOf, beatOf, xpOf, mintUnbacked };
