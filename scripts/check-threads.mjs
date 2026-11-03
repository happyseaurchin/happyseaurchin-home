// threads.js checked offline: the beach mocked as global fetch, the page's script run as a browser runs it. A thread
// is read by where its lines stand (function:thread 3, 3 November 2026): a hand's lines beneath its own act are its
// options and every other line is an act, and a place put in a hand's room waits on that hand until one of its options
// is taken or, where none was offered, until that hand ties at or beneath it, as the thread battery's short.py reads a
// card. A line that closes ' · waits on <handle>' still waits on that handle; a thread opened before 29 October keeps
// its old reading by a word; a tap's place is appended to the room of the hand that offered it.
//   node scripts/check-threads.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
/* a line at an address of a floor-1 mirror, its node made where the address needs one */
const knot = (m, addr, line) => { let n = m; addr.replace('.', '').split('').forEach((k) => { if (typeof n[k] === 'string') n[k] = { _: n[k] }; n = n[k] = n[k] || {}; }); n._ = line; return m; };
const entry = (by, text, ts) => ({ _: text, 1: by, 2: '', 3: ts });

const rook = { _: 'MIRROR — rook' }, wren = { _: 'MIRROR — wren' }, dana = { _: 'MIRROR — dana' };
knot(rook, '1', 'built the tide-table page’s first draft');
knot(rook, '1.1', 'wren reviews it against the harbour data');
knot(rook, '1.2', 'dana decides without a review');
knot(rook, '1.3', 'rook adds the spring tides before anyone reviews');
knot(rook, '1.31', 'added the spring tides (tides:draft 2)');            // its own option taken, one deeper
knot(rook, '1.311', 'wren reviews draft 2');
knot(rook, '1.121', 'low-water marks shown (tides:draft 3)');            // the answer to dana's ask, beneath it
knot(rook, '1.1211', 'dana publishes draft 3');
knot(wren, '1.1', 'reviewed: two tide times corrected (tides:draft 2)');   // rook's option taken, at its address
knot(wren, '1.11', 'dana publishes the page');
knot(wren, '1.12', 'dana asks for another pass');
knot(dana, '1.12', 'dana asks for another pass');                         // wren's option taken
knot(rook, '2', 'started the moorings list');
knot(rook, '2.1', 'wren checks it, complete the list later');             // before 29 October: an act by its word
knot(rook, '3', 'opened the glossary · waits on dana');                   // the closing clause, 29 October to 3 November
knot(rook, '4', 'started the berths list, as archive:ways:thread:2026-11-03 says');   // a block's name, never a place
knot(rook, '4.1', 'wren checks it and completes the list');               // after 3 November: an option, whatever its words
const BLOCKS = {
  'spine:thread': { _: 'THE REGISTRY',
    1: { _: 'the tide-table page · opened by rook', 3: '2026-11-03T14:00:00Z' },
    2: { _: 'the moorings list · opened by rook', 3: '2026-10-29T13:00:00Z' },
    3: { _: 'the glossary · opened by rook', 3: '2026-11-01T09:00:00Z' },
    4: { _: 'the berths list · opened by rook', 3: '2026-11-03T15:00:00Z' } },
  'function:harbour': { _: 'THE HARBOUR PAGES', 5: { _: 'THE THREADS — one per piece of work',
    1: 'thread:1 — the tide-table page', 2: 'thread:2 — the moorings list', 3: 'thread:3 — the glossary', 4: 'thread:4 — the berths list' } },
  'thread:rook': rook, 'thread:wren': wren, 'thread:dana': dana,
  'pool:dana': { _: 'ROOM — dana', 1: entry('wren', 'wren: thread:1.1 — yours to decide', '2026-11-03T14:05:00Z'), 2: entry('rook', 'rook: thread:1.121 — draft 3 is ready', '2026-11-03T14:20:00Z') },
  'pool:rook': { _: 'ROOM — rook', 1: entry('dana', 'dana: thread:1.12 — another pass, please', '2026-11-03T14:10:00Z') },
  'pool:wren': { _: 'ROOM — wren', 1: { ...entry('wren', 'wren: noted', '2026-11-03T14:12:00Z'), 6: entry('rook', 'rook: thread:1.31 — please review draft 2', '2026-11-03T14:15:00Z') } }
};
const posted = [];
globalThis.fetch = async (url, opts = {}) => {
  const s = String(url);
  if (!s.startsWith(BEACH)) return new Response('{}', { status: 404 });
  if (opts.method === 'POST') { posted.push(JSON.parse(opts.body)); return new Response(JSON.stringify({ ok: true }), { status: 200 }); }
  const b = new URL(s).searchParams.get('block');
  if (!b) return new Response(JSON.stringify({ blocks: Object.keys(BLOCKS) }), { status: 200 });
  return BLOCKS[b] ? new Response(JSON.stringify(BLOCKS[b]), { status: 200 }) : new Response('{}', { status: 404 });
};
const document = { readyState: 'complete', addEventListener() {}, querySelectorAll: () => [], createElement: () => ({}) };
const ctx = { document, fetch: globalThis.fetch, console, Promise, WeakMap, URL, JSON };
ctx.window = ctx;
vm.runInNewContext(readFileSync(new URL('../threads.js', import.meta.url), 'utf8'), ctx);
const T = ctx.beachThreads;

let bad = 0;
const check = (ok, what) => { console.log((ok ? '✓ ' : '✗ ') + what); if (!ok) bad++; };
const cards = async (h) => (await T.waiting(h, true)).map((w) => w.end.addr + (w.options.length ? ' [' + w.options.map((o) => o.addr).join(' ') + ']' : '') + (w.from ? ' from ' + w.from : ' by its clause')).sort();
const trees = async () => { T.forget(); const got = await T.read('harbour'); return (n) => got.threads.find((t) => t.registry === String(n)).tree; };
const nodeAt = (x, a) => (x.addr === a ? x : x.kids.map((k) => nodeAt(k, a)).find(Boolean));

let tree = await trees();
const n = (a) => nodeAt(tree(a.split('.')[0]), a);
check(n('1.1').taken && n('1.1').hands.map((l) => l.who).join() === 'wren' && n('1.1').offerer === 'rook', '1.1 is rook\'s option, taken by wren\'s act at its address');
check(!n('1.2').taken && n('1.2').option === 'dana decides without a review', '1.2 is rook\'s option, not taken');
check(!n('1.11').taken && n('1.11').offerer === 'wren', '1.11 is wren\'s option, open');
check(n('1.12').taken && n('1.12').hands.map((l) => l.who).join() === 'dana', '1.12 is wren\'s option, taken by dana');
check(n('1.31').live && n('1.31').hands[0].who === 'rook' && !n('1.311').taken, '1.31 is what came of rook\'s own option, one deeper, a live end with its option open');
check(n('1.121').live && n('1.121').hands[0].who === 'rook', '1.121 is rook\'s answer beneath dana\'s ask, a live end');
check(n('2.1').taken && n('2.1').hands.length === 1, '2.1, in a thread opened before 29 October, is an act by its word "complete"');
check(!n('4.1').taken && n('4.1').option === 'wren checks it and completes the list', '4.1, in a thread opened after 3 November, is an option whatever its words');
check(n('3').live && n('3').waits.join() === 'dana', 'thread 3\'s knot waits on dana by its closing clause');
check(n('4').crosses.length === 0, 'a block\'s name, archive:ways:thread:2026-11-03, names no other thread\'s place');

check(JSON.stringify(await cards('dana')) === JSON.stringify(['1.121 [1.1211] from rook', '3 by its clause']),
  'dana waits on draft 3 at 1.121, put in her room by rook, and on the glossary by its clause; 1.1 no longer, an option of it taken');
check(JSON.stringify(await cards('rook')) === '[]', 'rook waits on nothing: dana\'s ask at 1.12 is answered beneath it');
check(JSON.stringify(await cards('wren')) === JSON.stringify(['1.31 [1.311] from rook']), 'wren waits on draft 2 at 1.31, a place in a reply nested beneath an entry of her room');

BLOCKS['thread:dana'] = knot(JSON.parse(JSON.stringify(dana)), '1.1211', 'dana publishes draft 3');
check(JSON.stringify(await cards('dana')) === JSON.stringify(['3 by its clause']), 'once dana takes 1.1211, draft 3 no longer waits on her');
tree = await trees();
check(n('1.1211').taken && n('1.1211').hands.map((l) => l.who).join() === 'dana' && !n('1.121').live && n('1.1211').live,
  'her line at 1.1211 is an act, and the live end moves to it');

BLOCKS['thread:rook'] = knot(JSON.parse(JSON.stringify(rook)), '1.21', 'dana decided without a review, in chat: published');   // its own option taken one deeper, nothing after
tree = await trees();
check(!n('1.2').hands.length && n('1.2').taken && n('1.21').hands.map((l) => l.who).join() === 'rook' && n('1.21').live,
  'rook\'s own option 1.2, taken one deeper with nothing after, stays an option, and 1.21 is the act and the live end');

const h = await T.handOn('rook', '1.1211', 'dana publishes draft 3', 'dana');
const p = posted[posted.length - 1];
check(h.ok && p.block === 'pool:rook' && p.append === true && p.content._ === 'thread:1.1211 — dana publishes draft 3' && p.content[1] === 'dana',
  'a tap\'s place is appended to the offerer\'s room: ' + JSON.stringify(p));

console.log(bad ? `${bad} NOT as expected` : 'all as expected');
process.exit(bad ? 1 : 0);
