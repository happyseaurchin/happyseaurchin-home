// THE PILE LAW IN ALL FIVE DOORS — each copy lifted out of its page and run against
// the same piles, so one door can never again decide a slot is taken while the rest
// of the site shows it empty.
//
//   node scripts/smoke-pile-slots.js            (ROOT=<dir> to run another checkout)
//
// The fault this guards (David, 2026-10-05): five cards showing in tomorrow's golden
// card, nine counted, no room to add. Every put-down writes {_: ''} — a done card
// landing in the timeline, a card thrown to tomorrow, the sweep — and the five copies
// of the slot rule knew only the empty string, so each emptied slot stayed taken.
const fs = require('fs');
const path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const grab = (src, sig) => {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error('not found: ' + sig);
  return src.slice(i, src.indexOf('\n}\n', i) + 2);
};

const TODAY = new Date().toISOString().slice(0, 16) + 'Z';
const BEFORE = '2026-09-12T14:18Z';
const live = (n, state) => ({ '_': 'a live card ' + n, '2': 'now', '3': TODAY, ...(state ? { '4': state } : {}) });
const pile = over => { const p = {}; for (let d = 1; d <= 9; d++) p[d] = live(d, d % 3 ? null : 'doing'); return Object.assign(p, over); };

const CASES = [
  ['six live and three emptied — tomorrow as it stood 2026-10-05', pile({ 3: { '_': '' }, 4: { '_': '' }, 8: { '_': '' } }), '3'],
  ['an emptied slot still wearing old conditions (a blank from before 2026-09-01)', pile({ 5: { '_': '', '2': 'now', '3': BEFORE, '4': 'held' } }), '5'],
  ['an emptied slot is spent before a later retired one — lowest digit first', pile({ 2: { '_': '  ' }, 6: { '_': 'old', '3': BEFORE, '4': 'done' } }), '2'],
  ['nine live cards refuse, as the law says', pile({}), 'full'],
  ['a card done today is not real estate', pile({ 4: { '_': 'done today', '3': TODAY, '4': 'done' } }), 'full'],
  ['a card dropped before today is', pile({ 6: { '_': 'dropped', '3': BEFORE, '4': 'drop' } }), '6'],
  ['a legacy empty string is free', pile({ 7: '' }), '7'],
  ['a free digit comes first', (() => { const p = pile({}); delete p[4]; delete p[9]; return p; })(), '4'],
];

/* each door, with the little world its function expects stubbed around it */
function doors(hand, writes){
  const hit = b => { writes.push(b); return { ok: true }; };
  const env = {
    HANDLE: 'tester',
    readBlock: async () => JSON.parse(JSON.stringify(hand)),
    writeBlock: async b => hit(b),
    writeWithLatch: async b => hit(b),
    withLatch: async (blk, b) => hit(b),
    foundLatched: async () => ({ ok: true }),
    localStorage: { getItem: () => 'key', setItem(){} },
    prompt: () => null, readLatch: () => 'key', lockRequired: () => false,
    MODE: 'clock', SPINE: {}, floorOf: () => 10, FAMILY: 'now',
  };
  const names = Object.keys(env);
  const lift = (file, sigs, fn) =>
    new Function(...names, sigs.map(s => grab(read(file), s)).join('\n') + '\nreturn ' + fn + ';')(...names.map(n => env[n]));
  const landed = r => (r === false || r === 'full' || (r && r.full)) ? 'full' : writes[writes.length - 1].spindle.slice(1);
  return {
    next: async () => {
      const slotFor = lift('next.html', ['function isEntryNode(n){', 'function pileSlotFor(node){'], 'pileSlotFor');
      return slotFor(hand['1']) || 'full';
    },
    walk: async () => landed(await lift('walk.html', ['function isEntryNode(n){', 'async function appendCard(entry, pile){'], 'appendCard')({ '_': 'new' }, '1')),
    hands: async () => landed(await lift('hands.html', ['function isEntryNode(n){', 'async function addCard(pile, entry){'], 'addCard')('1', { '_': 'new' })),
    now: async () => landed(await lift('now.html', ['async function writeCardToHand(entry, pile){'], 'writeCardToHand')({ '_': 'new' }, '1')),
    /* /recency deals by the clock: an eight-digit day address is pile 1 */
    recency: async () => landed(await lift('recency.html', ['async function dealToHand(text, addr){'], 'dealToHand')('new', '20264115')),
  };
}

(async () => {
  let pass = true;
  for (const [label, p, want] of CASES){
    const got = {};
    for (const name of ['next', 'walk', 'hands', 'now', 'recency']){
      const writes = [];
      got[name] = await doors({ '_': 'AHEAD — tester', '1': p }, writes)[name]();
    }
    const ok = Object.values(got).every(g => g === want);
    if (!ok) pass = false;
    console.log(`  ${ok ? '✓' : '✗'} ${label} → ${want}` + (ok ? '' : `\n      got ${JSON.stringify(got)}`));
  }
  console.log(pass ? '\nPASS — all five doors agree on every pile' : '\nFAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
