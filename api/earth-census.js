/**
 * /api/earth-census — census:earth refolded the moment someone stands.
 *
 * census:earth is the earth world's tally: at spatial:earth's self-same
 * addresses, how many people stand at or under each place, and who they are
 * while few enough stand there to name (the roster rule — 24). /globe draws
 * people from it and from nothing else. The keeper's evening pass folds it once
 * a day (pscale-beach-happyseaurchin scripts/earth-census.mjs, run by weft's
 * daily wake); this is that fold, ported line for line, run by the site the
 * moment a page writes a Location line — /welcome, /here, /walk, /connect — so
 * a person who stands is on the globe within seconds, not the next evening.
 * Re-port, never fork: a change to the fold lands in the script first.
 *
 * It holds no key and needs none: census:earth is derived and deliberately
 * unlocked (its own root says why), and every passport it reads is public. It
 * owns nothing — the next fold, this one or the evening's, rebuilds it whole.
 *
 * ONE DIFFERENCE FROM THE SCRIPT, and it only ever withholds a write: a read
 * that fails (the apex index, or a passport that does not answer) stops the
 * fold before it writes. The script, run once a day by a keeper, counts such a
 * passport as carrying no location; run on every stand, that would take a
 * person off the globe for a passing network fault.
 *
 *   GET            the fold, computed and compared with what stands; nothing written
 *   POST           the fold, written only if it differs from what stands — then once
 *                  more a few seconds later, so when two people stand together the
 *                  earlier fold can never be the last word
 *   POST ?dry=1    as GET
 *
 * Cost: the apex index, one read per passport, two reads of the earth beach and
 * at most two writes per stand. Right at a few dozen passports; at thousands the
 * fold should touch only the stander's own path, paid by the stander.
 */

const ORIGIN = 'https://earth.beach.happyseaurchin.com';
const WIRE = `${ORIGIN}/.well-known/pscale-beach`;
const HOME = 'https://beach.happyseaurchin.com';
const homeWire = `${HOME}/.well-known/pscale-beach`;
/* How many may stand under an address before the map stops naming them — the
   script's dial, unchanged (CENSUS_NAME_UNDER there, 24 by default). */
const NAME_UNDER = 24;
const SETTLE_MS = 4000;

const get = async (block) => {
  const r = await fetch(`${WIRE}${block ? `?block=${encodeURIComponent(block)}` : ''}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${block || 'index'} → ${r.status}`);
  return r.json();
};
/* a passport the index lists but the beach no longer holds carries no location,
   as in the script; any other failure stops the fold (see ONE DIFFERENCE above) */
const getPassport = async (h) => {
  const r = await fetch(`${homeWire}?block=${encodeURIComponent(`passport:${h}`)}`, { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`passport:${h} → ${r.status}`);
  return r.json();
};

/** The address a passport cites, or null. Star-ref only; origin honoured when given. */
const locationIn = (passport) => {
  const text = JSON.stringify(passport);
  const starred = text.match(/\*:(https?:\/\/[^\s"\\]+?):spatial:earth:([0-9.]+)/);
  if (starred) {
    const origin = starred[1].replace(/\/+$/, '');
    if (origin !== ORIGIN.replace(/\/+$/, '')) return null;   // cites a different earth
    return starred[2];
  }
  const bare = text.match(/spatial:earth:([0-9.]+)/);
  return bare ? bare[1] : null;
};

/* the same JSON whatever order the keys came back in */
const canon = (x) => Array.isArray(x)
  ? `[${x.map(canon).join(',')}]`
  : x && typeof x === 'object'
    ? `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`
    : JSON.stringify(x);

async function fold() {
  const idxRes = await fetch(homeWire, { cache: 'no-store' });
  if (!idxRes.ok) throw new Error(`the apex index → ${idxRes.status}`);
  const idx = await idxRes.json();
  const handles = (idx.blocks || []).filter((n) => n.startsWith('passport:')).map((n) => n.slice(9));

  const placed = [];
  const untold = [];
  const refused = [];
  await Promise.all(
    handles.map(async (h) => {
      const pp = await getPassport(h);
      const addr = pp ? locationIn(pp) : null;
      if (!addr) return untold.push(h);
      if (!/^[0-9]+\.?$/.test(addr)) return refused.push({ handle: h, addr });
      const digits = addr.replace(/\.$/, '').replace(/0+$/, '');
      if (digits) placed.push({ handle: h, digits });
      else untold.push(h);
    })
  );

  // ── tally by prefix ──
  const under = new Map(); // address prefix -> handles standing at or under it
  const here = new Map(); // address        -> handles standing exactly there
  for (const { handle, digits } of placed) {
    here.set(digits, [...(here.get(digits) || []), handle]);
    for (let i = 1; i <= digits.length; i++) {
      const pre = digits.slice(0, i);
      under.set(pre, [...(under.get(pre) || []), handle]);
    }
  }

  // ── the block, at the self-same addresses: walk the map and follow its shape ──
  const spatial = await get('spatial:earth');
  const semOf = (n) => (typeof n === 'string' ? n : typeof n?._ === 'string' ? n._ : null);

  const root = {};
  const tally = (addr) => {
    const folk = under.get(addr);
    if (!folk) return null;
    const atRung = (here.get(addr) || []).length;
    const grounds = [...under.keys()].filter(
      (k) => k.length === addr.length + 1 && k.startsWith(addr)
    ).length;
    const roster = folk.length <= NAME_UNDER ? ` · ${[...new Set(folk)].sort().join(', ')}` : '';
    return `${folk.length} · ${atRung} · ${grounds}${roster}`;
  };

  let lines = 0;
  (function mirror(mapNode, outNode, addr) {
    if (!mapNode || typeof mapNode !== 'object') return;
    for (const d of Object.keys(mapNode).filter((k) => /^[1-9]$/.test(k)).sort()) {
      const childAddr = addr + d;
      if (!under.has(childAddr)) continue;               // nobody under it — no entry at all
      const kid = (outNode[d] ||= {});
      const line = tally(childAddr);
      if (semOf(mapNode[d]) && line) { kid._ = line; lines++; }
      mirror(mapNode[d], kid, childAddr);
    }
    // undecided ground: the map descends through its underscore, and so does this
    if (mapNode._ && typeof mapNode._ === 'object') {
      const childAddr = addr + '0';
      if (under.has(childAddr)) mirror(mapNode._, (outNode._ ||= {}), childAddr);
    }
  })(spatial, root, '');

  // the floor matches the map's, so the same digits name the same rung in both blocks
  let floorChain = 0;
  for (let n = spatial; n?._ && typeof n._ === 'object'; n = n._) floorChain++;
  const identity =
    `CENSUS:EARTH — how many people stand at each address of the real, and who they are while that is a ` +
    `short enough answer to give. Every address here is spatial:earth's address and this block mirrors its ` +
    `shape: a line where the map carries a name, a descent where it carries undecided ground. A line reads ` +
    `"under · here · grounds" — how many stand at or beneath this rung, how many at exactly it, and how many ` +
    `grounds below it carry anyone — followed by the handles themselves, present only while no more than ` +
    `${NAME_UNDER} stand under the address. That threshold IS the privacy rule and needs no other: a person is ` +
    `named at the grain they disclosed and is one of a number above it, so the map cannot show what it does ` +
    `not hold. A rung nobody stands at or under has no entry at all. Derived wholly from passports their own ` +
    `holders wrote, and owned by nobody — losing this block costs nothing, because the keeper's next daily ` +
    `pass rebuilds it from the same passports (function:earth 7). Read it instead of reading everyone: a ` +
    `viewer needs one call here, not one per person, and that is the whole reason it exists. THIS BLOCK IS DELIBERATELY UNLOCKED: it is derived, it owns nothing, and every daily fold replaces it whole, so a lock would buy nothing and would cost the one thing that matters — the keeper's scheduled pass can rebuild it without carrying a key onto a command line, where a secret does not belong. Scribble on it and the next pass wipes the scribble; the passports it is folded from are latched to their own holders, and those are where the truth lives.`;
  let chain = identity;
  for (let i = 0; i < floorChain; i++) chain = { _: chain };
  root._ = chain;

  return {
    root,
    report: {
      passports: handles.length,
      placed: placed.length,
      untold: untold.length,
      refused: refused.map((r) => `${r.handle} cites spatial:earth:${r.addr}`),
      lines,
    },
  };
}

/* fold, compare with what stands, and write only a difference */
async function foldOnce(write) {
  const { root, report } = await fold();
  const standing = await fetch(`${WIRE}?block=census:earth`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const changed = !standing || canon(standing) !== canon(root);
  if (!write || !changed) return { ...report, changed, written: false };
  const r = await fetch(`${WIRE}?block=census:earth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spindle: '', content: root, confirm: true }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(`census:earth → ${r.status} ${JSON.stringify(body)}`);
  return { ...report, changed, written: true };
}

/* one fold at a time in this instance: a stand that arrives mid-fold asks for one
   more pass after it, and every caller waits for the pass that saw its own stand */
let RUNNING = null, AGAIN = false;
function foldSoon() {
  if (RUNNING) { AGAIN = true; return RUNNING; }
  RUNNING = (async () => {
    let out;
    do { AGAIN = false; out = await foldOnce(true); } while (AGAIN);
    return out;
  })().finally(() => { RUNNING = null; });
  return RUNNING;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const q = req.query || {};
  const dry = req.method !== 'POST' || q.dry === '1' || q.dry === 'true';
  if (!['GET', 'HEAD', 'POST'].includes(req.method)) return res.status(405).json({ error: 'GET to see the fold, POST to write it' });
  try {
    if (dry) return res.status(200).json({ dry: true, ...(await foldOnce(false)) });
    const first = await foldSoon();
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    const settle = await foldSoon();
    return res.status(200).json({ ...first, settled: settle.written ? 'written again' : 'held' });
  } catch (e) {
    return res.status(502).json({ error: `nothing written — ${e.message}` });
  }
}
