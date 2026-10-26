// /api/board checked offline: the beach and the fold mocked as global fetch, the handler called as Vercel
// calls it. A plugged game's board is the fold of its players' mirrors at the day; a game with no mirror at
// the day falls back to its room as Matthew's pages keep a run; a game with no law is not on the shelf.
//   node scripts/check-board.mjs
const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const DAY = '2026414500', NOW = new Date('2026-10-26T20:30:00Z');
const nested = (line, floor) => { let n = line; for (let i = 0; i < floor; i++) n = { _: n }; return n; };
// a line said at the day in a mirror founded ten deep, as the beach lands it: 2026414500 is 2 _ 2 6 4 1 4 5
const mirror = (who, line) => { const m = nested('MIRROR — ' + who, 10); let n = m; for (const d of '2_26414') { if (!n[d] || typeof n[d] !== 'object') n[d] = {}; n = n[d]; } n['5'] = line; return m; };
const BLOCKS = {
  'function:wire': { _: 'THE LAW of wire.', 1: 'mode: game', 3: 'room: pool:wire', 4: 'board: FINISHED, lowest first, best per player', 6: 'page: https://example.org/wire.html' },
  'wire:ann': mirror('ann', 'FINISHED 1.90s · proof pool:wire 4'),
  'wire:bob': mirror('bob', 'FINISHED 0.50s · proof pool:wire 5'),
  'wire:cat': mirror('cat', 'FINISHED 2.38s · proof pool:wire 1'),
  'wire:old': mirror('old', 'FINISHED 0.10s'),
  'function:bats': { _: 'THE LAW of bats.', 1: 'mode: game', 4: 'board: CAUGHT, highest first, best per player', 6: 'page: https://example.org/bats.html' },
  'pool:bats': { _: 'The room of bats.', 1: { _: 'CAUGHT 14 bats', 1: 'ann, a visitor', 2: DAY, 3: '2026-10-26T10:00:00Z', 7: 'bats1.x' }, 2: { _: 'CAUGHT 9 bats', 1: 'bob, a visitor', 2: DAY, 3: '2026-10-26T11:00:00Z', 7: 'bats1.y' }, 3: { _: 'CAUGHT 20 bats', 1: 'ann, a visitor', 2: '2026414400', 3: '2026-10-25T11:00:00Z', 7: 'bats1.z' } },
  'game:ghost-wire': { _: 'GAME:GHOST-WIRE — trace a neon wire. Played at https://phenomemental.github.io/happyseaurchin-beach/ghost-wire.html; kept runs and notes live in pool:ghost-wire.' },
  'pool:ghost-wire': { _: 'The room.', 1: { _: '2.62 s on the wire', 1: 'Darcy, a visitor', 2: DAY, 3: '2026-10-26T09:45:10Z', 7: 'gw1.' + DAY + '.157.AAA', 8: '32' }, 2: { _: '2.03 s', 1: 'Guest 4821', 2: DAY, 3: '2026-10-26T09:50:00Z', 7: 'gw1.' + DAY + '.122.AAA' }, 3: { _: '2.50 s', 1: 'Phenomemental, a visitor', 2: DAY, 3: '2026-10-26T10:00:00Z', 5: 'Guest 4821', 7: 'gw1.' + DAY + '.150.AAA' }, 4: { _: 'a note', 1: 'Jenna, a visitor', 2: DAY, 3: '2026-10-26T10:01:00Z' } }
};
// 'old' wrote at the week's address, which the day's board does not gather upward; cat's line stands only at the day
delete BLOCKS['wire:old'];
const BORN = { 'wire:ann': '2026-10-26T08:00:00Z', 'wire:bob': '2026-10-26T08:05:00Z', 'wire:cat': '2026-10-26T09:00:00Z' };
let reads = [];
globalThis.fetch = async (url) => {
  const u = new URL(url); reads.push(u.searchParams.get('block') || 'index');
  const body = (status, d) => ({ status, ok: status < 400, json: async () => d });
  if (!u.searchParams.has('block')) return body(200, { blocks: Object.keys(BLOCKS), touched: {}, born: BORN, now: { iso: NOW.toISOString() } });
  const b = BLOCKS[u.searchParams.get('block')];
  return b ? body(200, b) : body(404, { error: 'not found' });
};
const { default: handler, boardOf } = await import('../api/board.js');
let pass = true;
const check = (label, ok, detail) => { if (!ok) pass = false; console.log(`  ${ok ? '✓' : '✗'} ${label}` + (ok ? '' : '\n      ' + JSON.stringify(detail))); };
function call(query) {
  return new Promise((ok) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.code = s; return this; }, json(d) { ok({ code: this.code, headers: this.headers, body: d }); }, end() { ok({ code: this.code, headers: this.headers }); } };
    handler({ method: 'GET', query }, res);
  });
}

console.log('\n/api/board as the fold of a plugged game\'s mirrors');
let b = await boardOf('wire', NOW);
check('the law is read from function:wire: its page, room and board line', b && b.page === 'https://example.org/wire.html' && b.room === 'pool:wire' && b.law === 'function:wire' && b.board === 'FINISHED, lowest first, best per player', b);
check('the board is each player\'s line at the day in their own mirror, lowest first, the proof\'s slot named apart', b.source === 'mirrors' && b.top.map((r) => r.name + ' ' + r.line + ' ' + r.slot).join('|') === 'bob FINISHED 0.50s 5|ann FINISHED 1.90s 4|cat FINISHED 2.38s 1' && b.players === 3, b.top);
check('…read through the beach\'s index and each mirror once, the room never', reads.filter((x) => x === 'index').length === 1 && reads.filter((x) => x === 'wire:ann').length === 1 && !reads.includes('pool:wire'), reads);
check('the day is the beach\'s clock\'s, as the door shows it', b.day === DAY && /^Monday,? 26 October 2026$/.test(b.date) && b.asKept === true, b);

console.log('\n…falling back to the room where no mirror holds a line at the day');
reads = [];
b = await boardOf('bats', NOW);
check('a highest-first game with no mirrors reads its room: each player\'s best today, the other day\'s line left out', b.source === 'room' && b.top.map((r) => r.name + ' ' + r.score).join('|') === 'ann 14|bob 9' && b.runs === 2 && b.players === 2, b);
reads = [];
b = await boardOf('ghost-wire', NOW);
check('Ghost Wire, its law at game:ghost-wire naming its page and room in its words, reads its room as before', b.source === 'room' && b.law === 'game:ghost-wire' && b.page === 'https://phenomemental.github.io/happyseaurchin-beach/ghost-wire.html' && b.room === 'pool:ghost-wire' && b.title === 'Ghost Wire', b);
check('…a run\'s time as the law reads it (steps over sixty), a guest as the name it later took, each player\'s fastest, the note passed by', b.top.map((r) => r.name + ' ' + r.time + ' ' + r.slot + (r.tries ? ' ' + r.tries : '')).join('|') === 'Phenomemental 2.03 2|Darcy 2.62 1 32' && b.runs === 3 && b.players === 2, b.top);

console.log('\nthe door');
let r = await call({ game: 'wire' });
check('GET ?game=wire answers the board, cached for the crowd', r.code === 200 && r.body.game === 'wire' && /max-age=15/.test(r.headers['Vercel-CDN-Cache-Control']), r);
r = await call({ game: 'no-such-game' });
check('a game with no law on the beach is not on the shelf', r.code === 404 && /no law for no-such-game/.test(r.body.error), r);
r = await call({ game: 'Wire', extra: '1' });
check('one address per game: anything else is sent back to it', r.code === 308 && r.headers.Location === '/api/board?game=wire', r);
r = await call({ game: 'pool:x' });
check('a name that is not a game\'s is refused', r.code === 400, r);
console.log(pass ? '\ncheck-board passed' : '\ncheck-board FAILED');
process.exit(pass ? 0 : 1);
