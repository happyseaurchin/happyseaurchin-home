/* ─────────────────────────────────────────────────────────────────────────────
 * hand.js — a person's cards, one hand per project (function:ahead; bsp-mcp
 * proposals/2026-10-12-a-hand-per-project).
 *
 * ahead:<project>:<handle> is the holder's hand in one project: seven rungs,
 * nine cards to a rung, born latched under the holder's own key. now is the
 * project every handle has — ahead:now:<handle>, said 'my now'. The project is
 * the hand's NAME, so a card in it carries no 2 (David, 2026-10-12: 'a bunch of
 * cards per project, simple. Maximum of 9 per rung per project').
 *
 * The one hand that stood before, ahead:<handle>, is read beside the new hands
 * until its holder's next keyed visit moves it (split, below): there a card's
 * project is its field 2, and now where it has none.
 *
 * Every page that reads or writes cards does it through here, so the shape is
 * changed in one place. Loaded by the pages that hold cards, and by the bar's
 * ＋card on its first tap — never by a page that does not.
 * ───────────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';
if (window.hand) return;

const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';

/* THE RUNGS, called by their own names (2026-10-12, superseding 'tomorrow' for
 * 2): the digit is the rung's pscale, and the rung a person sees is the rung
 * the card is in. */
const RUNGS = [
  { d: '1', label: 'within hours' }, { d: '2', label: 'today' },
  { d: '3', label: 'this week' },    { d: '4', label: 'this month' },
  { d: '5', label: 'this season' },  { d: '6', label: 'this year' },
  { d: '7', label: 'this decade' },
];
const rungLabel = d => (RUNGS.find(x => x.d === String(d)) || {}).label || '';
/* a rung's pscale to its digit, held to the seven */
const rungOfPscale = p => String(Math.min(7, Math.max(1, Number(p) || 1)));
/* the next rung out — /next's ↑ later */
const laterRung = d => String(Math.min(7, (Number(d) || 1) + 1));
/* a project as a person reads it */
const projectSaid = p => p === 'now' ? 'my now' : String(p || '');

const PROJECT_OK = /^[a-z0-9][a-z0-9-]*$/i;
const name = (project, handle) => 'ahead:' + project + ':' + handle;
/* 'ahead:<handle>' is the hand that stood before; 'ahead:<project>:<handle>' a
 * project's. A handle holds no colon (theme.js cleanHandle), so the first colon
 * after 'ahead:' is the only one that can divide them. */
function parse(block){
  if (typeof block !== 'string' || block.indexOf('ahead:') !== 0) return null;
  const rest = block.slice(6), i = rest.indexOf(':');
  if (!rest) return null;
  if (i < 0) return { project: null, handle: rest, legacy: true };
  const project = rest.slice(0, i), handle = rest.slice(i + 1);
  if (!PROJECT_OK.test(project) || !handle) return null;
  return { project, handle, legacy: false };
}

/* ── the beach ── */
async function read(blockName){
  const r = await fetch(BEACH + '?block=' + encodeURIComponent(blockName), { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('the beach answered ' + r.status);
  return r.json();
}
async function index(){
  const r = await fetch(BEACH, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!r.ok) throw new Error('the beach index answered ' + r.status);
  return r.json();
}
async function write(body){
  const r = await fetch(BEACH, { method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  let d = null; try { d = await r.json(); } catch(e){}
  return { ok: r.ok, status: r.status, data: d };
}
const lockRequired = w => !w.ok && w.data && (w.data.code === 'lock_required' || w.data.error === 'lock_required');
const namesIn = idx => ((idx && idx.blocks) || []).map(b => typeof b === 'string' ? b : (b && b.name) || '');
/* every hand one holder has: the one that stood before, and one per project */
const handsOf = (idx, handle) => namesIn(idx).filter(b => { const p = parse(b); return p && p.handle === handle; });
/* every hand that can hold cards of one project: its own, and the hands that
 * stood before, whose cards name it at 2 */
const handsFor = (idx, project) => namesIn(idx).filter(b => { const p = parse(b); return p && (p.legacy || p.project === project); });

/* ── a card ── */
/* A STORED ENTRY IS A SENTENCE WITH ITS CONDITIONS BENEATH (function:ahead 2):
 * _ the words; 3 the stamp; 4 the state (standing when absent; held, doing,
 * done, drop); 5 where it was dealt from. In the hand that stood before, 2 named
 * the project. A bare string is a standing card. Nothing parses the words. */
const isEntry = n => !!n && typeof n === 'object' && typeof n._ === 'string'
  && Object.keys(n).every(k => k === '_' || typeof n[k] !== 'object');
const digitsOf = node => (node && typeof node === 'object') ? Object.keys(node).filter(k => /^[1-9]$/.test(k)).sort() : [];
const isOpen = c => c.state !== 'done' && c.state !== 'drop';
const stamp = () => new Date().toISOString().slice(0, 16) + 'Z';

/* every card in one hand, open or closed, each knowing the block it stands in.
 * A rung's cards are the leaves beneath it at any depth (a pile that stood
 * before may have wrapped); a path of zeros beneath a rung is the rung's own
 * voice, and an emptied slot ({_: ''}) is no card. */
function cardsIn(blockName, block){
  const p = parse(blockName);
  if (!p || !block || typeof block !== 'object') return [];
  const out = [];
  for (const rung of digitsOf(block)){
    (function leaves(node, digits){
      if (typeof node === 'string'){
        if (digits.slice(1).every(d => d === '0')) return;
        if (node.trim()) out.push(cardOf(p, blockName, digits, rung, { '_': node }));
        return;
      }
      if (!node || typeof node !== 'object') return;
      if (isEntry(node)){ if (node._.trim()) out.push(cardOf(p, blockName, digits, rung, node)); return; }
      if (node._ !== undefined) leaves(node._, digits.concat('0'));
      for (const d of digitsOf(node)) leaves(node[d], digits.concat(d));
    })(block[rung], [rung]);
  }
  return out;
}
function cardOf(p, blockName, digits, rung, n){
  const aim = p.legacy && typeof n['2'] === 'string' && PROJECT_OK.test(n['2']) ? n['2'] : null;
  return {
    block: blockName, handle: p.handle, legacy: p.legacy,
    project: p.project || aim || 'now',
    /* the card's place in its own hand — unique only within that block */
    addr: digits.join(''), pile: rung, key: blockName + '|' + digits.join(''),
    text: String(n._).trim(),
    ts: n['3'] || null, state: n['4'] || null, from: n['5'] || null,
    /* a card in the hand that stood before keeps its own 2 on every write back */
    aim: p.legacy ? (n['2'] || null) : null,
  };
}
/* the entry a card's slot holds after a change — in a project hand never a 2 */
function entryOf(c, patch, inProjectHand){
  patch = patch || {};
  const v = k => (k in patch) ? patch[k] : c[k];
  const e = { '_': v('text') };
  if (!inProjectHand && c.legacy && c.aim) e['2'] = c.aim;
  if (v('ts')) e['3'] = v('ts');
  if (v('state')) e['4'] = v('state');
  if (v('from')) e['5'] = v('from');
  return e;
}

/* ── the pile law (function:ahead 1, ratified 2026-09-01) ──
 * A rung is bounded and written at its slots, never appended: a free digit
 * first, then the lowest RETIRED slot — an emptied one, a legacy DONE/DROP
 * line, a card let go, or a card done before today. Nine is the shape of a
 * node, so nine live cards refuse plainly.
 * A CARD LET GO FREES ITS PLACE AT ONCE (David, 2026-10-20: five cards showing
 * in his now, 'today 9/9', no room to add — the cards he had just let go were
 * holding their places until the next day). It stands where it was, under
 * done today with its undo, until a new card needs the place. A card DONE
 * today still holds its own: one still in the pile is one whose landing has
 * not happened, and it is never written over (function:ahead 4). */
function reusable(n){
  if (typeof n === 'string') return !n.trim() || /^(DONE|DROP)\b/.test(n.trim());
  if (!isEntry(n)) return false;
  if (!n._.trim() || n['4'] === 'drop') return true;
  return n['4'] === 'done' && String(n['3'] || '').slice(0, 10) !== new Date().toISOString().slice(0, 10);
}
/* every slot a card may take, in the order a landing takes them */
function slotsFree(node){
  if (!node || typeof node !== 'object') return ['1','2','3','4','5','6','7','8','9'];
  const digs = digitsOf(node), free = [];
  for (let d = 1; d <= 9; d++) if (!digs.includes(String(d))) free.push(String(d));
  return free.concat(digs.filter(d => reusable(node[d])));
}
/* how many of a rung's nine stand taken — its live cards, the ones a person
 * sees in the row */
const taken = node => 9 - slotsFree(node).length;

/* ── the key ── one per holder, as every hand door has kept it, the
 * passport's behind it */
const keyName = h => 'next-latch:ahead:' + h;
function keyOf(h){ try { return localStorage.getItem(keyName(h)) || localStorage.getItem('passport-latch:' + h) || ''; } catch(e){ return ''; } }
function keep(h, k){ try { localStorage.setItem(keyName(h), k); } catch(e){} }
const ask = m => { const v = prompt(m); return v === null ? '' : v.trim(); };

/* a write to one of a holder's hands under the key this device keeps — asked
 * once where none is kept, and kept; quiet asks nothing */
async function put(h, body, quiet){
  const send = k => write(Object.assign({}, body, k ? { secret: k } : {}));
  let w = await send(keyOf(h));
  if (lockRequired(w)){
    if (quiet) return { ok: false, quiet: true };
    const v = ask(body.block + ' is latched — enter the key for your cards (kept on this device; check the first letter — phones capitalise it):');
    if (!v) return { ok: false, quiet: true };
    w = await send(v);
    if (w.ok) keep(h, v);
    else if (lockRequired(w)) return { ok: false, refused: true, data: w.data };
  }
  return w;
}

const rootOf = (project, h) => 'AHEAD — ' + h + "'s hand in " + (project === 'now' ? 'their own now' : project)
  + ': cards held toward doing, each at the rung it is sized for, nine to a rung, unordered within it, never '
  + 'arriving unless pulled into doing and landed as record in ' + project + ':' + h
  + '. Sovereign; a rung is appetite, not sequence (function:ahead).';

/* FOUND a project hand, latched (R1). A handle whose passport is locked founds
 * a block named for it only with the passport's key (pscale-beach, a handle
 * founds under its own key); given as the proof, the new hand may keep the key
 * the holder's hands already use, so a person keeps one key for their cards. */
async function found(h, project, quiet){
  const block = name(project, h);
  let key = keyOf(h);
  if (!key){
    if (quiet) return { ok: false, quiet: true };
    key = ask('This founds your hand for ' + projectSaid(project) + ', locked to you.\nEnter your key — the one your passport uses, if you have one (kept on this device — check the first letter: phones capitalise it):');
    if (!key) return { ok: false, quiet: true };
  }
  const content = { '_': rootOf(project, h) };
  let w = await write({ block, content, new_lock: key });
  if (!w.ok && w.data && w.data.code === 'handle_bound'){
    let pk = ''; try { pk = localStorage.getItem('passport-latch:' + h) || ''; } catch(e){}
    if (!pk || pk === key){
      if (quiet) return { ok: false, quiet: true };
      pk = ask('The beach binds ' + block + " to your passport's key — enter that key (kept on this device; check the first letter: phones capitalise it):");
      if (!pk) return { ok: false, quiet: true };
    }
    w = await write({ block, content, secret: pk, new_lock: key });
    if (w.ok) try { localStorage.setItem('passport-latch:' + h, pk); } catch(e){}
  }
  if (w.ok) keep(h, key);
  return w;
}

/* LAND a card in a holder's hand for a project, at a rung — the hand founded
 * where it is not yet. The entry is the card's own shape, {_, 3, 4, 5}. */
async function land(h, project, rung, entry, quiet){
  if (typeof entry === 'string') entry = { '_': entry };
  entry = Object.assign({}, entry); delete entry['2'];
  rung = String(rung);
  const block = name(project, h);
  let hand = await read(block);
  if (!hand){
    const w0 = await found(h, project, quiet);
    hand = await read(block);
    if (!hand) return w0.ok ? { ok: false, data: { error: 'the hand was founded but does not read back' } } : w0;
  }
  const node = hand[rung];
  let spindle, content, addr;
  if (!node){ spindle = rung; content = { '1': entry }; addr = rung + '1'; }
  else if (typeof node === 'string'){ spindle = rung; content = { '_': node, '1': entry }; addr = rung + '1'; }
  else {
    const slot = slotsFree(node)[0];
    if (!slot) return { ok: false, full: true, block, rung, project };
    spindle = addr = rung + slot; content = entry;
  }
  const w = await put(h, { block, spindle, content }, quiet);
  return Object.assign(w, { block, addr, rung, project });
}

/* a card rewritten where it stands — words, state or stamp */
const set = (c, patch, quiet) => put(c.handle, { block: c.block, spindle: c.addr, content: entryOf(c, patch, !c.legacy) }, quiet);

/* MOVE a card to another rung, another project, or both. It lands whole at its
 * new place first, its conditions kept, and only then is the old slot emptied:
 * a refused landing leaves it where it was, never nowhere, and an emptied slot
 * is free at once (function:ahead 1). A move the holder makes is a change, so
 * its stamp is fresh; the hand that stood before moving itself is no change to
 * any card, so each keeps its own (to.keep). */
async function move(c, to, quiet){
  to = to || {};
  const project = to.project || c.project, rung = String(to.rung || c.pile);
  if (!c.legacy && project === c.project && rung === String(c.pile)) return { ok: true, same: true };
  const patch = Object.assign(to.keep ? {} : { ts: stamp() }, to.patch || {});
  const w = await land(c.handle, project, rung, entryOf(c, patch, true), quiet);
  if (!w.ok) return w;
  const w2 = await put(c.handle, { block: c.block, spindle: c.addr, content: { '_': '' } }, quiet);
  return w2.ok ? w : Object.assign(w, { twice: true });
}

/* MOVE THE HAND THAT STOOD BEFORE — the open cards of ahead:<handle> into the
 * project hands, each at the rung it stood at, on its holder's own visit with
 * the key this device keeps. Nothing is asked: where no key is kept nothing
 * moves, and a card that cannot land stays where it was, still read. Done and
 * dropped cards stay as the record; the old hand is set aside, never wiped. */
async function split(h){
  if (!keyOf(h)) return { ok: false, quiet: true, moved: 0 };
  const old = await read('ahead:' + h).catch(() => null);
  const open = old ? cardsIn('ahead:' + h, old).filter(isOpen) : [];
  let moved = 0;
  for (const c of open){
    const w = await move(c, { keep: true }, true);
    if (w.ok) moved++;
    else if (!w.full) break;
  }
  return { ok: true, moved, left: open.length - moved };
}

/* every card one holder has, across their hands, with the blocks as they stand */
async function load(h, idx){
  idx = idx || await index();
  const names = handsOf(idx, h);
  const blocks = {};
  await Promise.all(names.map(async n => { blocks[n] = await read(n).catch(() => null); }));
  let cards = [];
  names.forEach(n => { cards = cards.concat(cardsIn(n, blocks[n])); });
  return { cards, blocks };
}
/* every card of one project, every holder's */
async function loadProject(project, idx){
  idx = idx || await index();
  const names = handsFor(idx, project);
  const blocks = {};
  await Promise.all(names.map(async n => { blocks[n] = await read(n).catch(() => null); }));
  let cards = [];
  names.forEach(n => { cards = cards.concat(cardsIn(n, blocks[n]).filter(c => c.project === project)); });
  return { cards, blocks };
}
/* how many of one rung a holder's project hand has taken, from blocks as read */
const takenIn = (blocks, h, project, rung) => taken(((blocks || {})[name(project, h)] || {})[String(rung)]);

window.hand = {
  BEACH, RUNGS, rungLabel, rungOfPscale, laterRung, projectSaid,
  name, parse, handsOf, handsFor, cardsIn, isOpen, entryOf, stamp,
  slotsFree, taken, takenIn, keyOf, keep, read, index,
  found, land, set, move, split, load, loadProject,
};
})();
