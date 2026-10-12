/* ─────────────────────────────────────────────────────────────────────────────
 * mint.js — a card in your hand, from any page.
 *
 * The bar's ＋ (theme.js, mintAct) fetches this file on its first tap and never
 * before, so a page pays nothing for it until a card is being written (David,
 * 2026-10-12: 'it could load up too much on the o-page'). Then one read of the
 * hand and one write, and nothing else.
 *
 * ONE PLACE, the simple version David asked for: the card lands in the day's
 * pile, pile 2, toward the holder's now. Pile 2 is where a card minted at a day
 * lands from /walk, because a pile's digit is its rung's pscale and a card
 * standing at a rung is the next of it (David, 2026-09-14) — the hand calls it
 * 'tomorrow'. Moving a card to another pile, or aiming it at a project, is the
 * hand's own act at /hands, as the pile sheet ruled (2026-09-17): you put things
 * in here, and moving between piles stays in the hand.
 *
 * ONE SHAPE, the hand's own (function:ahead 2): the words at _, the conditions
 * beneath — 2 toward, 3 the stamp, 5 the door it came from. Nothing parses the
 * words.
 *
 * THE PILE LAW (function:ahead 1): nine to a pile, every project's cards
 * together, written at the pile's slots and never appended. Every row on the
 * site counts by project and none counts a pile, so when the day's pile is full
 * this card says what fills it, and where one can be moved out.
 * ───────────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';
if (window.mintCard) return;

const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const PILE = '2', PILE_SAID = 'tomorrow', TOWARD = 'now';

/* the name this device signs with — render:who, kept by whichever page last
 * wrote under it (theme.js knownName) */
const deviceName = () => { try { return window.cleanHandle(localStorage.getItem('render:who')) || ''; } catch(e){ return ''; } };
/* the hand's key, named exactly as /next, /hands, /walk and /now name it, so a
 * key kept by any of them is kept here; the passport's own key behind it */
const keyName = h => 'next-latch:ahead:' + h;
const keptKey = h => { try { return localStorage.getItem(keyName(h)) || localStorage.getItem('passport-latch:' + h) || ''; } catch(e){ return ''; } };
const keepKey = (h, k) => { try { localStorage.setItem(keyName(h), k); } catch(e){} };
const stamp = () => new Date().toISOString().slice(0, 16) + 'Z';
/* the door a card came from, as every door stamps itself: its first path step */
const door = () => '/' + (location.pathname.split('/')[1] || '').replace(/\.html$/, '');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ── the beach ── */
async function read(name){
  const r = await fetch(BEACH + '?block=' + encodeURIComponent(name), { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('the beach answered ' + r.status);
  return r.json();
}
async function write(body){
  const r = await fetch(BEACH, { method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  let d = null; try { d = await r.json(); } catch(e){}
  return { ok: r.ok, status: r.status, data: d };
}
const lockRequired = w => !w.ok && w.data && (w.data.code === 'lock_required' || w.data.error === 'lock_required');

/* ── the pile ── */
const isEntry = n => !!n && typeof n === 'object' && typeof n._ === 'string'
  && Object.keys(n).every(k => k === '_' || typeof n[k] !== 'object');
const digitsOf = node => Object.keys(node).filter(k => /^[1-9]$/.test(k)).sort();
/* a slot another card may take, as every door reads the law: absent, emptied,
 * a legacy DONE/DROP line, or a card done or put down before today — today's
 * stand until the sweep */
function reusable(n){
  if (typeof n === 'string') return !n.trim() || /^(DONE|DROP)\b/.test(n.trim());
  if (!isEntry(n)) return false;
  if (!n._.trim()) return true;
  return (n['4'] === 'done' || n['4'] === 'drop') && String(n['3'] || '').slice(0, 10) !== new Date().toISOString().slice(0, 10);
}
/* a free digit first, then the lowest reusable slot (function:ahead 1) */
function slotIn(node){
  const digs = digitsOf(node);
  for (let d = 1; d <= 9; d++) if (!digs.includes(String(d))) return String(d);
  return digs.filter(d => reusable(node[d]))[0] || null;
}
/* how many of the nine slots stand taken, and by what — live cards counted by
 * the project each is toward, cards closed today apart */
function fillOf(node){
  const by = {}; let taken = 0;
  if (!node || typeof node !== 'object') return { taken, by };
  for (const d of digitsOf(node)){
    const n = node[d];
    if (reusable(n)) continue;
    taken++;
    const k = (n && typeof n === 'object' && (n['4'] === 'done' || n['4'] === 'drop')) ? 'closed today'
      : (n && typeof n === 'object' && n['2']) ? (n['2'] === 'now' ? 'toward now' : n['2']) : 'yours, no project';
    by[k] = (by[k] || 0) + 1;
  }
  return { taken, by };
}
const fillSaid = f => Object.keys(f.by).sort((a, b) => f.by[b] - f.by[a]).map(k => f.by[k] + ' ' + k).join(', ');

/* ── the landing — the hand founded latched where it is not yet, then the card
 * at the pile's slot, under the key this device keeps ── */
async function land(h, entry){
  const name = 'ahead:' + h;
  let key = keptKey(h);
  let hand = await read(name);
  if (!hand){
    /* BORN LATCHED, as every door founds a hand: the key asked once and locked in
     * the same write (R1); the beach binds a block named for a passport-holder to
     * the passport's key (handle_bound), so that is the key asked for then */
    if (!key){
      const v = prompt('This founds your hand — the cards you hold, locked to you.\nEnter your key — the one your passport uses, if you have one (kept on this device — check the first letter: phones capitalise it):');
      if (v === null || !v.trim()) return { quiet: true };
      key = v.trim();
    }
    const root = 'AHEAD — ' + h + "'s piles of the indexical future: intents at the grain they are sized for, unordered within their pile, never arriving unless pulled into now and landed in the mirror as record. Sovereign; a pile is appetite, not sequence.";
    let w = await write({ block: name, content: { '_': root }, new_lock: key });
    if (!w.ok && w.data && w.data.code === 'handle_bound'){
      const v = prompt('The beach binds ' + name + " to your passport's key — enter that key (kept on this device; check the first letter: phones capitalise it):");
      if (v === null || !v.trim()) return { quiet: true };
      key = v.trim();
      w = await write({ block: name, content: { '_': root }, new_lock: key });
    }
    if (!w.ok) return w;
    keepKey(h, key);
    hand = await read(name);
  }
  const node = hand && hand[PILE];
  let body;
  if (!node) body = { block: name, spindle: PILE, content: { '1': entry } };
  else if (typeof node === 'string') body = { block: name, spindle: PILE, content: { '_': node, '1': entry } };
  else {
    const slot = slotIn(node);
    if (!slot) return { full: true, fill: fillOf(node) };
    body = { block: name, spindle: PILE + slot, content: entry };
  }
  if (key) body.secret = key;
  let w = await write(body);
  if (lockRequired(w)){
    const v = prompt(name + ' is latched — enter your key for it (kept on this device; check the first letter — phones capitalise it):');
    if (v === null || !v.trim()) return { quiet: true };
    body.secret = v.trim();
    w = await write(body);
    if (w.ok) keepKey(h, body.secret);
    else if (lockRequired(w)) return { refused: true };
  }
  return w;
}

/* ── the card ── */
const CSS = '' +
  '.mc{border:1px solid var(--line-strong);border-radius:12px;background:rgb(var(--well-rgb));color:var(--foam);' +
    'padding:0;width:min(420px,calc(100vw - 32px));box-shadow:0 12px 40px rgba(0,0,0,0.4)}' +
  '.mc::backdrop{background:rgba(0,0,0,0.5)}' +
  '.mc__in{position:relative;padding:20px 18px 16px;display:flex;flex-direction:column;gap:10px}' +
  '.mc__x{position:absolute;top:8px;right:8px;background:none;border:none;color:var(--vapour-dim);' +
    'font-size:14px;line-height:1;padding:6px;cursor:pointer}' +
  '.mc__x:hover{color:var(--foam)}' +
  '.mc__head{font-family:var(--mono);font-size:11px;letter-spacing:0.08em;color:var(--vapour-dim);margin:0;padding-right:26px}' +
  '.mc__head b{color:var(--foam);font-weight:400}' +
  '.mc__name{display:flex;flex-direction:column;gap:6px;font-family:var(--mono);font-size:11px;color:var(--vapour-dim)}' +
  '.mc__name input,.mc__box{background:rgba(var(--well-rgb),0.55);border:1px solid var(--line-strong);border-radius:6px;' +
    'color:var(--foam);padding:9px 10px;box-sizing:border-box;width:100%}' +
  '.mc__name input{font-family:var(--mono);font-size:14px}' +
  '.mc__box{font-family:var(--body);font-size:16px;line-height:1.45;min-height:88px;resize:vertical}' +
  '.mc__box:focus-visible,.mc__name input:focus-visible{outline:2px solid var(--liquid);outline-offset:1px}' +
  '.mc__row{display:flex;align-items:center;gap:10px}' +
  '.mc__where{flex:1;font-family:var(--mono);font-size:10.5px;letter-spacing:0.06em;color:var(--vapour-dim)}' +
  '.mc__go{flex:none;font-family:var(--mono);font-weight:700;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;' +
    'color:var(--abyss);background:var(--liquid);border:none;border-radius:4px;padding:9px 16px;cursor:pointer}' +
  '.mc__go:hover{background:var(--foam)}' +
  '.mc__go:disabled{opacity:0.5;cursor:wait}' +
  '.mc__say{font-family:var(--mono);font-size:11.5px;line-height:1.6;color:var(--vapour);margin:0}' +
  '.mc__say:empty{display:none}' +
  '.mc__say.err{color:var(--solid)}' +
  '.mc__say a{color:var(--liquid)}' +
  '.mc .hidden{display:none}';

let card = null, H = '', busy = false, clearDraft = () => {};
const $ = sel => card.querySelector(sel);
function say(html, err){ const p = $('.mc__say'); p.innerHTML = html || ''; p.classList.toggle('err', !!err); }
const handHref = h => '/hands/' + encodeURIComponent(h);

function build(){
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  card = document.createElement('dialog');
  card.className = 'mc';
  card.setAttribute('aria-label', 'a card in your hand');
  card.innerHTML = '<div class="mc__in">' +
    '<button type="button" class="mc__x" aria-label="close">✕</button>' +
    '<p class="mc__head">a card in <b class="mc__h"></b>’s hand</p>' +
    '<label class="mc__name hidden">whose hand — your name on the beach' +
      '<input type="text" autocapitalize="none" autocomplete="off" spellcheck="false"></label>' +
    '<textarea class="mc__box" rows="3" placeholder="one thing you are holding toward"></textarea>' +
    '<div class="mc__row"><span class="mc__where">' + PILE_SAID + ' · toward ' + TOWARD + '</span>' +
      '<button type="button" class="mc__go">mint</button></div>' +
    '<p class="mc__say" role="status"></p></div>';
  /* the card fills the dialog, so only a tap on the dimmed page around it lands
   * on the dialog itself — that closes it, as Escape does */
  card.addEventListener('click', e => { if (e.target === card) card.close(); });
  $('.mc__x').addEventListener('click', () => card.close());
  const box = $('.mc__box');
  /* every write box keeps its draft and takes dictation (CLAUDE.md 4 and 5) */
  if (window.keepDraft) clearDraft = window.keepDraft(box, 'mint');
  if (window.dictate) window.dictate(box);
  /* the /now keys: Enter mints, Shift+Enter breaks a line, Escape leaves */
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); mint(); } });
  const name = $('.mc__name input');
  name.addEventListener('input', () => { const c = window.cleanHandle(name.value, true); if (c !== name.value) name.value = c; });
  name.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); box.focus(); } });
  $('.mc__go').addEventListener('click', mint);
  document.body.appendChild(card);
}

/* the pile as it stands, said where the card will land — read on opening, so a
 * full pile is said before anything is typed. After a landing the count only
 * moves: the card that filled the pile has just landed, and its ✓ stands. */
async function look(landed){
  if (!H) return;
  const at = H;
  try {
    const hand = await read('ahead:' + at);
    if (at !== H) return;
    const f = fillOf(hand && typeof hand[PILE] === 'object' ? hand[PILE] : null);
    const full = f.taken >= 9 && !slotIn(hand[PILE]);
    $('.mc__where').textContent = PILE_SAID + ' · toward ' + TOWARD + ' · ' + f.taken + ' of 9' + (full && landed ? ', full now' : '');
    if (full && !landed) sayFull(f);
  } catch(e){ /* the count is a courtesy; the mint still reads for itself */ }
}
function sayFull(f){
  say(esc(PILE_SAID) + ' holds nine, every project together — ' + esc(fillSaid(f)) + '. ' +
    'Move one to another pile, or let one go, in <a href="' + handHref(H) + '">your hand →</a>', true);
}

async function mint(){
  if (busy) return;
  const box = $('.mc__box');
  const text = box.value.trim();
  if (!H){
    H = window.cleanHandle($('.mc__name input').value) || '';
    if (!H){ say('whose hand? your name on the beach first', true); $('.mc__name input').focus(); return; }
  }
  if (!text){ say('a card needs words', true); box.focus(); return; }
  busy = true; $('.mc__go').disabled = true; say('');
  try {
    const w = await land(H, { '_': text, '2': TOWARD, '3': stamp(), '5': door() });
    if (w.full) sayFull(w.fill);
    else if (w.refused) say('that key was refused for ahead:' + esc(H) + ' — it is not the one your hand is latched under. Any browser your hand has written from before still holds it.', true);
    else if (w.ok){
      clearDraft(); box.value = '';
      /* the name this device signs with, kept by the page that last wrote under it */
      try { if (!localStorage.getItem('render:who')) localStorage.setItem('render:who', H); } catch(e){}
      showWho();
      say('✓ in your hand — ' + esc(PILE_SAID) + ', toward ' + esc(TOWARD) + ' · <a href="' + handHref(H) + '">move or sort it →</a>');
      document.dispatchEvent(new CustomEvent('mint:landed', { detail: { handle: H } }));
      look(true);
      box.focus();
    }
    else if (!w.quiet) say('the beach did not take it — ' + esc((w.data && (w.data.error || w.data.code)) || w.status), true);
  } catch(e){ say('the beach did not answer — ' + esc(String(e.message || e)), true); }
  finally { busy = false; $('.mc__go').disabled = false; }
}

function showWho(){
  $('.mc__h').textContent = H || 'your';
  $('.mc__head').classList.toggle('hidden', !H);
  $('.mc__name').classList.toggle('hidden', !!H);
}

window.mintCard = function(){
  if (!card) build();
  H = deviceName();
  showWho(); say('');
  $('.mc__where').textContent = PILE_SAID + ' · toward ' + TOWARD;
  if (card.showModal){ if (!card.open) card.showModal(); }
  else card.setAttribute('open', '');
  (H ? $('.mc__box') : $('.mc__name input')).focus();
  look();
};
})();
