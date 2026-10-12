/* ─────────────────────────────────────────────────────────────────────────────
 * mint.js — a card from any page, the bar's ＋card.
 *
 * theme.js (mintAct) fetches /hand.js and this file on the button's first tap
 * and never before, so a page pays nothing for it until a card is being written
 * (David, 2026-10-12: 'it could load up too much on the o-page'). Then one read
 * of the hand and one write.
 *
 * The simple version: a card for TODAY, ALIGNED TO MY NOW — the holder's hand in
 * the project every handle has, ahead:now:<handle>, at rung 2. Moving it to
 * another rung or aligning it to a project is the hand's own act, ⇄ at /hands
 * (the pile sheet's ruling of 2026-09-17: you put things in here; moving stays
 * in the hand). A rung holds nine in each project, so the count beside the box
 * is one a person can check by looking at their now's cards today.
 * ───────────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';
if (window.mintCard || !window.hand) return;
const H_ = window.hand;
const PROJECT = 'now', RUNG = '2';
const WHERE = H_.rungLabel(RUNG) + ' · aligned to ' + H_.projectSaid(PROJECT);

const deviceName = () => { try { return window.cleanHandle(localStorage.getItem('render:who')) || ''; } catch(e){ return ''; } };
/* the door a card came from, as every door stamps itself: its first path step */
const door = () => '/' + (location.pathname.split('/')[1] || '').replace(/\.html$/, '');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const handHref = h => '/hands/' + encodeURIComponent(h);

const CSS = '' +
  '.mc{border:1px solid var(--line-strong);border-radius:12px;background:rgb(var(--well-rgb));color:var(--foam);' +
    'padding:0;width:min(420px,calc(100vw - 32px));box-shadow:0 12px 40px rgba(0,0,0,0.4)}' +
  '.mc::backdrop{background:rgba(0,0,0,0.5)}' +
  '.mc__in{position:relative;padding:20px 18px 16px;display:flex;flex-direction:column;gap:10px}' +
  '.mc__x{position:absolute;top:8px;right:8px;background:none;border:none;color:var(--vapour-dim);' +
    'font-size:14px;line-height:1;padding:6px;cursor:pointer}' +
  '.mc__x:hover{color:var(--foam)}' +
  '.mc__head{font-family:var(--mono);font-size:11px;letter-spacing:0.08em;color:var(--vapour-dim);margin:0;padding-right:26px}' +
  '.mc__head b{color:var(--solid);font-weight:400}' +
  '.mc__name{display:flex;flex-direction:column;gap:6px;font-family:var(--mono);font-size:11px;color:var(--vapour-dim)}' +
  '.mc__name input,.mc__box{background:rgba(var(--well-rgb),0.55);border:1px solid var(--line-strong);border-radius:6px;' +
    'color:var(--foam);padding:9px 10px;box-sizing:border-box;width:100%}' +
  '.mc__name input{font-family:var(--mono);font-size:14px}' +
  '.mc__box{font-family:var(--body);font-size:16px;line-height:1.45;min-height:88px;resize:vertical}' +
  '.mc__box:focus-visible,.mc__name input:focus-visible{outline:2px solid var(--solid);outline-offset:1px}' +
  '.mc__row{display:flex;align-items:center;gap:10px}' +
  '.mc__where{flex:1;font-family:var(--mono);font-size:11px;letter-spacing:0.04em;color:var(--vapour)}' +
  '.mc__go{flex:none;font-family:var(--mono);font-weight:700;font-size:12px;letter-spacing:0.04em;' +
    'color:var(--abyss);background:var(--solid);border:none;border-radius:4px;padding:9px 16px;cursor:pointer}' +
  '.mc__go:hover{background:var(--foam)}' +
  '.mc__go:disabled{opacity:0.5;cursor:wait}' +
  '.mc__say{font-family:var(--body);font-size:15px;line-height:1.45;color:var(--vapour);margin:0}' +
  '.mc__say:empty{display:none}' +
  '.mc__say a{color:var(--liquid)}' +
  '.mc .hidden{display:none}';

let card = null, H = '', busy = false, clearDraft = () => {};
const $ = sel => card.querySelector(sel);
const say = html => { $('.mc__say').innerHTML = html || ''; };
/* THE FULL RUNG, said so a person can check it: nine of their now's cards stand
 * at today, and they can count them in their hand */
const sayFull = () => say('Today already has nine ' + esc(H_.projectSaid(PROJECT)) + ' cards. Finish one, or move one to this week, in <a href="' + handHref(H) + '">your hand →</a>');

function build(){
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  card = document.createElement('dialog');
  card.className = 'mc';
  card.setAttribute('aria-label', 'a card for today');
  card.innerHTML = '<div class="mc__in">' +
    '<button type="button" class="mc__x" aria-label="close">✕</button>' +
    '<p class="mc__head">a card in <b class="mc__h"></b>’s hand</p>' +
    '<label class="mc__name hidden">whose hand — your name on the beach' +
      '<input type="text" autocapitalize="none" autocomplete="off" spellcheck="false"></label>' +
    '<textarea class="mc__box" rows="3" placeholder="one thing you mean to do"></textarea>' +
    '<div class="mc__row"><span class="mc__where"></span><button type="button" class="mc__go">＋card</button></div>' +
    '<p class="mc__say" role="status"></p></div>';
  /* only a tap on the dimmed page around the card lands on the dialog itself */
  card.addEventListener('click', e => { if (e.target === card) card.close(); });
  $('.mc__x').addEventListener('click', () => card.close());
  const box = $('.mc__box');
  /* every write box keeps its draft and takes dictation (CLAUDE.md 4 and 5) */
  if (window.keepDraft) clearDraft = window.keepDraft(box, 'mint');
  if (window.dictate) window.dictate(box);
  /* Enter mints, Shift+Enter breaks a line, Escape leaves */
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); mint(); } });
  const nameBox = $('.mc__name input');
  nameBox.addEventListener('input', () => { const c = window.cleanHandle(nameBox.value, true); if (c !== nameBox.value) nameBox.value = c; });
  nameBox.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); box.focus(); } });
  $('.mc__go').addEventListener('click', mint);
  document.body.appendChild(card);
}

/* the count beside the box: how many of today's nine this holder's now has
 * taken — read on opening, so a full rung is said before anything is typed */
async function look(landed){
  if (!H) return;
  const at = H;
  try {
    const block = await H_.read(H_.name(PROJECT, at));
    if (at !== H) return;
    const n = H_.taken(block && block[RUNG]);
    $('.mc__where').textContent = WHERE + ' · ' + n + ' of 9' + (n >= 9 && landed ? ', full now' : '');
    if (n >= 9 && !landed) sayFull();
  } catch(e){ /* the count is a courtesy; the landing reads for itself */ }
}

async function mint(){
  if (busy) return;
  const box = $('.mc__box');
  const text = box.value.trim();
  if (!H){
    H = window.cleanHandle($('.mc__name input').value) || '';
    if (!H){ say('Whose hand? Your name on the beach first.'); $('.mc__name input').focus(); return; }
  }
  if (!text){ say('A card needs words.'); box.focus(); return; }
  busy = true; $('.mc__go').disabled = true; say('');
  try {
    const w = await H_.land(H, PROJECT, RUNG, { '_': text, '3': H_.stamp(), '5': door() });
    if (w.full) sayFull();
    else if (w.refused) say('That key was refused for your cards — it is not the one they are latched under. Any browser your cards have been written from still holds it.');
    else if (w.ok){
      clearDraft(); box.value = '';
      /* the name this device signs with, kept by the page that last wrote under it */
      try { if (!localStorage.getItem('render:who')) localStorage.setItem('render:who', H); } catch(e){}
      showWho();
      say('✓ in your hand — ' + esc(WHERE) + ' · <a href="' + handHref(H) + '">see it →</a>');
      document.dispatchEvent(new CustomEvent('mint:landed', { detail: { handle: H } }));
      look(true);
      box.focus();
    }
    else if (!w.quiet) say('The beach did not take it — ' + esc((w.data && (w.data.error || w.data.code)) || w.status));
  } catch(e){ say('The beach did not answer — ' + esc(String(e.message || e))); }
  finally { busy = false; $('.mc__go').disabled = false; }
}

function showWho(){
  $('.mc__h').textContent = H;
  $('.mc__head').classList.toggle('hidden', !H);
  $('.mc__name').classList.toggle('hidden', !!H);
}

window.mintCard = function(){
  if (!card) build();
  H = deviceName();
  showWho(); say('');
  $('.mc__where').textContent = WHERE;
  if (card.showModal){ if (!card.open) card.showModal(); }
  else card.setAttribute('open', '');
  (H ? $('.mc__box') : $('.mc__name input')).focus();
  look();
};
})();
