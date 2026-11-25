// /api/xp checked offline: the beach mocked as global fetch, the handler called as Vercel calls it.
// A family's four columns are read from what already stands (its mirrors, its room, its threads, the String),
// agents count nothing, and N credits are shared in whole numbers that always sum to N.
//   node scripts/check-xp.mjs
const NOW = new Date('2026-11-25T16:00:00Z');
const BLOCKS = {
  'function:fund': {
    _: 'Operator for fund: a proposal read as a document.',
    1: 'mode: document',
    3: 'THE ROOM — pool:fund, open.',
    5: { _: 'THE THREADS', 1: 'thread:7 — the build · step 1' },
    6: 'page: https://happyseaurchin.com/fund — the crafted page',
    7: { _: 'phase: proposal', 1: { _: 'SUPPORT — contract two: credits at payment, shared by the four columns.', 1: 'makers: ann — the hands that built it', 2: 'the beach: bea, cy', 3: 'weights: 1 1 1 1', 4: 'the supporter: 30% — provisional' } },
  },
  // ann answered twice and said a Builder line; bob once; the agent kel twice; dee's mirror was born after the moment
  'fund:ann': { _: 'MIRROR — ann', 1: { _: 'a reading at the root step', 8: 'GO — yes' }, 2: 'WITHDRAWN' },
  'fund:bob': { _: 'MIRROR — bob', 1: { 8: 'NOT YET — later' , 1: { 8: 'CHANGE — this' } } },
  'fund:kel': { _: 'MIRROR — kel', 1: { 8: 'GO' }, 2: 'a reading' },
  'fund:dee': { _: 'MIRROR — dee', 1: { 8: 'GO' } },
  'pool:fund': { _: 'The room.', 1: { _: 'hello', 1: 'bob', 3: '2026-11-25T10:00:00Z' }, 2: { _: 'and again, the same beat', 1: 'bob', 3: '2026-11-25T10:01:00Z' },
    3: { _: 'SUMMARY of 1-2', 1: 'kel', 3: '2026-11-25T11:00:00Z' }, 4: { _: 'too late', 1: 'bob', 3: '2026-11-25T17:00:00Z' }, 5: { _: 'a visitor', 1: '(anon)', 3: '2026-11-25T10:00:00Z' } },
  // ann shared the page; bob answered that share, so ann brought bob; cy shared it later and nobody answered
  'string:ann': { _: 'MIRROR — ann', 2: { _: { 2: { 6: { 4: { 2: { 4: { 4: { 6: { 9: 'SHARE https://happyseaurchin.com/fund — it caught me' } } } } } } } } } },
  'string:bob': { _: 'MIRROR — bob', 2: { _: { 2: { 6: { 4: { 2: { 4: { 4: { 6: { 9: 'yes, I came' } } } } } } } } } },
  'string:cy': { _: 'MIRROR — cy', 2: { _: { 2: { 6: { 4: { 2: { 4: { 4: { 6: { 8: 'SHARE https://happyseaurchin.com/proposal/fund' } } } } } } } } } },
  'thread:ann': { _: 'MIRROR — ann', 7: { _: 'built it · waits on bob', 1: 'an option' } },
  'passport:kel': { _: 'kel — a Claude-instance pattern curated across sessions.' },
  'passport:ann': { _: 'Ann — a person who builds things.' },
};
const BORN = { 'fund:ann': '2026-11-20T09:00:00Z', 'fund:bob': '2026-11-21T09:00:00Z', 'fund:kel': '2026-11-21T09:00:00Z', 'fund:dee': '2026-11-25T17:00:00Z' };
globalThis.fetch = async (url) => {
  const u = new URL(url);
  const body = (status, d) => ({ status, ok: status < 400, json: async () => d });
  if (!u.searchParams.has('block')) return body(200, { blocks: Object.keys(BLOCKS), touched: {}, born: BORN, now: { iso: NOW.toISOString() } });
  const b = BLOCKS[u.searchParams.get('block')];
  return b ? body(200, b) : body(404, { error: 'not found' });
};
const { default: handler, xpOf, shareOut } = await import('../api/xp.js');
let pass = true;
const check = (label, ok, detail) => { if (!ok) pass = false; console.log(`  ${ok ? '✓' : '✗'} ${label}` + (ok ? '' : '\n      ' + JSON.stringify(detail))); };
const call = (query) => new Promise((ok) => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.code = s; return this; }, json(d) { ok({ code: this.code, body: d }); }, end() { ok({ code: this.code }); } };
  handler({ method: 'GET', query }, res);
});

console.log('\n/api/xp: a family\'s four columns, worked out on read');
const xp = await xpOf('fund', NOW);
check('the law is read: its room, its threads, its support line and the conditions beneath it',
  xp.law.room === 'pool:fund' && xp.law.threads.join() === 'thread:7' && xp.law.support === '71' && xp.law.makers.join() === 'ann' && xp.law.beach.join() === 'bea,cy', xp.law);
check('the players: ann 4 (two lines, the withdrawn one not, and a knot with its option), bob 3 (a NOT YET and a CHANGE, and two room lines in one beat)',
  xp.columns.players.ann === 4 && xp.columns.players.bob === 3, xp.columns.players);
check('agents count nothing, a summary is no act, an anonymous line is nobody, and a mirror born after the moment is not read',
  !('kel' in xp.columns.players) && !('dee' in xp.columns.players) && xp.agents.join() === 'kel', xp);
check('bob was brought by ann (he answered her share); ann was brought by nobody, so her beats go to the commons',
  xp.columns.bringers.ann === 3 && xp.commons.bringers === 4 && xp.string.shares === 2 && xp.string.brought === 1, { b: xp.columns.bringers, c: xp.commons, s: xp.string });
check('the makers\' and the beach\'s columns give every beat to whom the law names, the beach split equally',
  xp.columns.makers.ann === 7 && xp.columns.beach.bea === 3.5 && xp.columns.beach.cy === 3.5 && xp.beats === 7, xp.columns);

const s = shareOut(xp, 1000);
const sum = s.by.reduce((a, r) => a + r.credits, 0) + s.commons;
check('1000 credits are shared in whole numbers that sum to 1000', sum === 1000 && s.by.every((r) => Number.isInteger(r.credits)), s);
check('…a quarter a column, each by beats: ann 143 + 107 + 250, bob 107, bea 125, cy 125, the commons 143',
  JSON.stringify(s.by.map((r) => [r.handle, r.credits])) === JSON.stringify([['ann', 500], ['bea', 125], ['cy', 125], ['bob', 107]]) && s.commons === 143, s);
const own = shareOut(xp, 1000, 'eve');
check('a supporter who takes part keeps the law\'s share (30%), and the rest goes by the four columns, still summing to 1000',
  xp.law.supporter === 0.3 && own.supporter && own.supporter.handle === 'eve' && own.supporter.credits === 300 && own.columns === 700 &&
  own.by.reduce((a, r) => a + r.credits, 0) + own.commons + own.supporter.credits === 1000 && s.supporter === null, own);
const one = shareOut(xp, 7);
check('…and a few credits still sum exactly, the same way for anyone', one.by.reduce((a, r) => a + r.credits, 0) + one.commons === 7 && JSON.stringify(one) === JSON.stringify(shareOut(xp, 7)), one);

const r = await call({ family: 'fund', at: NOW.toISOString(), credits: '1000', supporter: 'eve' });
check('the door answers with the columns, the shares and the split a machine reads, summing to the credits', r.code === 200 && r.body.shares && r.body.shares.credits === 1000 && r.body.shares.supporter.credits === 300 && r.body.beat === '2026424471' && Object.values(r.body.split).reduce((a, b) => a + b, 0) === 1000 && r.body.split.eve === 300, r.body && { beat: r.body.beat, shares: r.body.shares && r.body.shares.credits });
const bare = await call({ family: 'fund' });
check('called bare, as a machine calls its split, it still answers the split, on a scale of a million', bare.code === 200 && Object.values(bare.body.split).reduce((a, b) => a + b, 0) === 1e6 && bare.body.shares.scale, bare.body && bare.body.split);
const quiet = await call({ family: 'fund', n: '100', buyer: 'fund-fund' });
const named = await call({ family: 'fund', n: '100', buyer: 'eve' });
check('a machine\'s n and buyer are read: a quiet supporter (bought in the fund\'s own handle, <family>-fund) keeps nothing, one who takes part keeps the law\'s share',
  quiet.code === 200 && !('fund-fund' in quiet.body.split) && quiet.body.shares.supporter === null && named.body.split.eve === 30 && Object.values(named.body.split).reduce((a, b) => a + b, 0) === 100, { q: quiet.body && quiet.body.split, n: named.body && named.body.split });
check('a name that is no family, a moment that is no moment and credits that are no number are refused',
  (await call({ family: 'No Such' })).code === 400 && (await call({ family: 'fund', at: 'soon' })).code === 400 && (await call({ family: 'fund', credits: '-3' })).code === 400 && (await call({ family: 'fund', credits: '5', supporter: 'no one' })).code === 400);

console.log(pass ? '\nall checks pass\n' : '\nSOME CHECKS FAIL\n');
process.exit(pass ? 0 : 1);
