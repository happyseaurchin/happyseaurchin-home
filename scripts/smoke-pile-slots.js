// THE PILE LAW IN EVERY DOOR — each slot rule run out of the file that holds it,
// against the same piles, so no door can decide a place is taken while the rest of
// the site shows it free.
//
//   node scripts/smoke-pile-slots.js            (ROOT=<dir> to run another checkout)
//
// Two rules stand since a hand per project (2026-10-12): hand.js, which every project
// hand lands through (/hands, /next, /now, /walk, /recency and the bar's ＋card), run
// here whole through its own land() against a stubbed beach; and next.html's own, for
// the one hand that stood before.
//
// The faults this guards (David): 2026-10-05, five cards showing in tomorrow's golden
// card, nine counted, no room to add — every put-down writes {_: ''} and the rule knew
// only the empty string, so each emptied slot stayed taken; and 2026-10-20, five cards
// showing in his now, 'today 9/9', no room — the cards he had just let go were holding
// their places until the next day.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const grab = (src, sig) => {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error('not found: ' + sig);
  return src.slice(i, src.indexOf('\n}\n', i) + 2);
};

const TODAY = new Date().toISOString().slice(0, 16) + 'Z';
const BEFORE = '2026-09-12T14:18Z';
const live = (n, state) => ({ '_': 'a live card ' + n, '3': TODAY, ...(state ? { '4': state } : {}) });
const pile = over => { const p = {}; for (let d = 1; d <= 9; d++) p[d] = live(d, d % 3 ? null : 'doing'); return Object.assign(p, over); };
const letGo = stamp => ({ '_': 'a card let go', '3': stamp || TODAY, '4': 'drop', '5': '/walk' });
/* David's now at today as it stood at 09:35Z on 2026-10-20: one doing, five let go, three standing */
const DAVID = { 1: live(1, 'doing'), 2: letGo(), 3: letGo(), 4: letGo(), 5: letGo(), 6: letGo(), 7: live(7), 8: live(8), 9: live(9) };

const CASES = [
  ['six live and three emptied — tomorrow as it stood 2026-10-05', pile({ 3: { '_': '' }, 4: { '_': '' }, 8: { '_': '' } }), '3'],
  ['an emptied slot still wearing old conditions (a blank from before 2026-09-01)', pile({ 5: { '_': '', '2': 'now', '3': BEFORE, '4': 'held' } }), '5'],
  ['an emptied slot is spent before a later retired one — lowest digit first', pile({ 2: { '_': '  ' }, 6: { '_': 'old', '3': BEFORE, '4': 'done' } }), '2'],
  ['nine live cards refuse, as the law says', pile({}), 'full'],
  ['a card done today is not real estate — its landing has not happened', pile({ 4: { '_': 'done today', '3': TODAY, '4': 'done' } }), 'full'],
  ['a card let go today frees its place at once', pile({ 6: letGo() }), '6'],
  ["David's now at today, 2026-10-20 — five let go, the lowest place first", DAVID, '2'],
  ['a card let go before today is free too', pile({ 6: letGo(BEFORE) }), '6'],
  ['a legacy empty string is free', pile({ 7: '' }), '7'],
  ['a free digit comes first', (() => { const p = pile({}); delete p[4]; delete p[9]; return p; })(), '4'],
  ['a free digit comes before a card let go', (() => { const p = pile({ 2: letGo() }); delete p[8]; return p; })(), '8'],
];

/* hand.js whole, in a window of its own, against a beach that answers with the
 * hand and keeps what is written */
function handDoor(hand, writes){
  const answer = (status, body) => ({ status, ok: status < 400, json: async () => body });
  const box = {
    window: {}, console,
    localStorage: { getItem: () => 'key', setItem(){} },
    prompt: () => null,
    fetch: async (url, init) => {
      if (init && init.method === 'POST'){ writes.push(JSON.parse(init.body)); return answer(200, { ok: true }); }
      return answer(200, JSON.parse(JSON.stringify(hand)));
    },
  };
  vm.createContext(box);
  vm.runInContext(read('hand.js'), box);
  return box.window.hand;
}

const doors = {
  hand: async p => {
    const writes = [];
    const w = await handDoor({ '_': 'AHEAD — tester', '2': p }, writes).land('tester', 'now', '2', { '_': 'new' }, true);
    return w.full ? 'full' : w.ok ? writes[writes.length - 1].spindle.slice(1) : 'refused';
  },
  next: async p => {
    const src = read('next.html');
    const slotFor = new Function(grab(src, 'function isEntryNode(n){') + '\n' + grab(src, 'function pileSlotFor(node){') + '\nreturn pileSlotFor;')();
    return slotFor(JSON.parse(JSON.stringify(p))) || 'full';
  },
};

(async () => {
  let pass = true;
  const check = (ok, label, detail) => { if (!ok) pass = false; console.log(`  ${ok ? '✓' : '✗'} ${label}` + (ok ? '' : `\n      ${detail}`)); };
  for (const [label, p, want] of CASES){
    const got = {};
    for (const name of Object.keys(doors)) got[name] = await doors[name](p);
    check(Object.values(got).every(g => g === want), `${label} → ${want}`, 'got ' + JSON.stringify(got));
  }
  /* THE COUNT — the cards a person sees in the row, never the places let go */
  const H = handDoor({}, []);
  check(H.taken(DAVID) === 4, "David's now at today counts the four cards showing, not nine", 'counted ' + H.taken(DAVID));
  check(H.taken({ 1: letGo() }) === 0, 'within hours with its one card let go counts none', 'counted ' + H.taken({ 1: letGo() }));
  check(H.taken(pile({})) === 9, 'nine live cards count nine', 'counted ' + H.taken(pile({})));
  console.log(pass ? '\nPASS — both doors agree on every pile, and the count is the cards' : '\nFAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
