// /api/xp checked offline: the beach mocked as global fetch, the handler called as Vercel calls it.
// A family's four columns are read from what already stands (its mirrors, its room, its threads, the String),
// agents count nothing, and N credits are shared in whole numbers that always sum to N.
//   node scripts/check-xp.mjs   (and the weightings: a game's tickets, its cup, a ledger run, weigh.js)
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
  // the agents are named in the economy's own law, never guessed from a passport: ann mentions her Claude and is a person
  'function:experience-points': { _: 'Operator for experience-points.', 2: { _: 'THE DECISIONS', 1: { _: 'WHO COUNTS NOTHING', 1: 'agents: kel, zed — each by its own passport' } } },
  'passport:kel': { _: 'kel — a helper on the commons.' },
  'passport:ann': { _: 'Ann — a person who builds things with her Claude, an AI agent of her own.' },
};
// a game, for the weightings (spine:shore 1.1112): a £5 ticket shared 5 · 10 · 80 · 5, the players' part to the game's cup
const put = (b, path, text) => { let n = b; for (const c of path.slice(0, -1)) { const k = c === '0' ? '_' : c; n = n[k] && typeof n[k] === 'object' ? n[k] : (n[k] = {}); } n[path.slice(-1)] = text; };
BLOCKS['function:race'] = { _: 'THE LAW of race — a game.', 1: 'mode: game', 3: 'room: pool:race', 6: 'page: https://happyseaurchin.com/games/race',
  7: { _: 'SUPPORT — a ticket is £5, shared by the four columns as they stand when it lands.', 1: 'makers: mo — who made it', 2: 'the beach: tide — who keeps the server',
    3: 'the players: race-cup — held for its tournaments', 4: 'weights: 5 10 80 5 — the players, the bringers, the makers, the beach' } };
// pia races twice in one beat on the 20th and once on the 22nd; quin once on the 21st
BLOCKS['pool:race'] = { _: 'The room.', 1: { _: 'FINISHED 1:20', 1: 'pia', 3: '2026-11-20T10:00:00Z' }, 2: { _: 'FINISHED 1:18', 1: 'pia', 3: '2026-11-20T10:02:00Z' },
  3: { _: 'FINISHED 1:30', 1: 'quin', 3: '2026-11-21T10:00:00Z' }, 4: { _: 'FINISHED 1:25', 1: 'pia', 3: '2026-11-22T10:00:00Z' } };
// ann shared the game's page and pia answered it, so ann brought pia; nobody brought quin
put(BLOCKS['string:ann'], '2026424351', 'SHARE https://happyseaurchin.com/games/race — fast and silly');
BLOCKS['string:pia'] = { _: 'MIRROR — pia' }; put(BLOCKS['string:pia'], '2026424351', 'came to race');
// the ledger: two tickets for the game, a gift for anything, a reward paid to its maker, a sum for a word that names no family
BLOCKS['ledger:shore'] = { _: 'THE LEDGER of shore.', 1: { _: 'IN — £5 · from pia · for race', 3: '2026-11-20T12:00:00Z' },
  2: { _: 'IN — £5 · from quin · for race', 3: '2026-11-23T12:00:00Z' }, 3: { _: 'IN — £20 · from a giver · for anything', 3: '2026-11-23T13:00:00Z' },
  4: { _: 'PAID — £3 · to mo · for the first race', 3: '2026-11-24T09:00:00Z' }, 5: { _: 'IN — £5 · for vegetables grown', 3: '2026-11-24T10:00:00Z' },
  6: { _: 'a note, no sum', 3: '2026-11-24T11:00:00Z' } };
const BORN = { 'fund:ann': '2026-11-20T09:00:00Z', 'fund:bob': '2026-11-21T09:00:00Z', 'fund:kel': '2026-11-21T09:00:00Z', 'fund:dee': '2026-11-25T17:00:00Z' };
globalThis.fetch = async (url) => {
  const u = new URL(url);
  const body = (status, d) => ({ status, ok: status < 400, json: async () => d });
  if (!u.searchParams.has('block')) return body(200, { blocks: Object.keys(BLOCKS), touched: {}, born: BORN, now: { iso: NOW.toISOString() } });
  const b = BLOCKS[u.searchParams.get('block')];
  return b ? body(200, b) : body(404, { error: 'not found' });
};
const { default: handler, xpOf, shareOut, ledgerRun } = await import('../api/xp.js');
const weigh = (await import('../weigh.js')).default;
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
check('agents count nothing (named in function:experience-points, whatever their passports say), a summary is no act, an anonymous line is nobody, and a mirror born after the moment is not read',
  !('kel' in xp.columns.players) && !('dee' in xp.columns.players) && xp.agents.join() === 'kel', xp);
check('a person whose passport mentions her Claude still counts: the list decides, never the words', xp.columns.players.ann === 4, xp.columns.players);
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


console.log('\na game\'s tickets, by the weightings (weigh.js, spine:shore 1.1112)');
const g1 = await xpOf('race', new Date('2026-11-20T12:00:00Z'));
check('the law names its makers, its beach and its cup, and its weights 5 · 10 · 80 · 5',
  g1.law.makers.join() === 'mo' && g1.law.beach.join() === 'tide' && g1.law.players.join() === 'race-cup' && g1.law.weights.join() === '5,10,80,5', g1.law);
check('on the 20th pia has one beat (two runs in one beat count once), and ann brought her', g1.columns.players.pia === 1 && g1.columns.bringers.ann === 1 && g1.beats === 1, g1.columns);
const t1 = shareOut(g1, 500);
check('a £5 ticket that day, in pence: the cup 25 (never pia by her beats), ann 50, mo 400, tide 25, nothing to the commons',
  JSON.stringify(t1.by.map((r) => [r.handle, r.credits])) === JSON.stringify([['mo', 400], ['ann', 50], ['race-cup', 25], ['tide', 25]]) && t1.commons === 0, t1);
const g2 = await xpOf('race', new Date('2026-11-23T12:00:00Z'));
const p2 = weigh.partsOf(g2, 500), sumP = Object.values(p2.by).reduce((a, r) => a + r.players + r.bringers + r.makers + r.beach, 0) + Object.values(p2.commonsFrom).reduce((a, b) => a + b, 0);
check('on the 23rd quin, whom nobody brought, has played: a third of the bringers\' 50p goes to the commons, and the exact parts sum to the ticket',
  Math.abs(p2.by.ann.bringers - 100 / 3) < 1e-9 && Math.abs(p2.commonsFrom.bringers - 50 / 3) < 1e-9 && Math.abs(sumP - 500) < 1e-9, p2);
const lines = weigh.ledgerLines(BLOCKS['ledger:shore']);
check('the ledger\'s lines are read oldest first: four sums in, one paid, the family the first word after "for", the note left out',
  lines.length === 5 && lines.map((l) => l.kind + ':' + (l.family || '-')).join() === 'in:race,in:race,in:-,paid:-,in:vegetables' && lines[3].to === 'mo', lines);
const run = await ledgerRun('shore', NOW);
const row = (h) => run.by.find((r) => r.handle === h) || {};
check('the run: each ticket shared as the game stood when it landed, made whole once: mo 800, ann 83, the cup 50, tide 50, the commons 17',
  row('mo').earned === 800 && row('ann').earned === 83 && row('race-cup').earned === 50 && row('tide').earned === 50 && run.commons === 17 &&
  run.by.reduce((a, r) => a + r.earned, 0) + run.commons === run.shared && run.shared === 1000, run);
check('£20 for anything and £5 for a word that names no family are counted and shared by nobody; mo was paid £3, so could ask for £5',
  run.anything === 2500 && run.given === 3500 && run.paid === 300 && run.held === 3200 && row('mo').paid === 300 && row('mo').could === 500 && run.families.race.sums === 2, run);
const preps = { race: weigh.prepare({ family: 'race', law: BLOCKS['function:race'], economy: BLOCKS['function:experience-points'], fam: { mirrors: {}, born: {} }, room: BLOCKS['pool:race'],
  strings: { mirrors: { ann: BLOCKS['string:ann'], pia: BLOCKS['string:pia'], bob: BLOCKS['string:bob'], cy: BLOCKS['string:cy'] } }, threads: { mirrors: {} } }) };
const late = weigh.runLedger(lines, preps, { readAt: '2026-11-24T00:00:00Z' }), creds = weigh.runLedger(lines, preps, { credits: true });
check('read once at the end instead, ann has a third of both tickets\' bringers\' part taken by quin, 67; as credits written at each ticket, 83 as the weightings',
  late.by.find((r) => r.handle === 'ann').earned === 67 && creds.by.find((r) => r.handle === 'ann').earned === 83 && creds.commons === 17, { late: late.by, creds: creds.by });
const rl = await call({ ledger: 'shore' });
check('the door reads a ledger by name, refuses a name that is no name, and says so where no ledger stands',
  rl.code === 200 && rl.body.ledger === 'ledger:shore' && rl.body.unit === 'pence' && !('trace' in rl.body) &&
  (await call({ ledger: 'Not One' })).code === 400 && (await call({ ledger: 'none-here' })).code === 404, rl.body);


console.log('\nthe value at exit (weigh.exitValues, spine:value-weightings 1.11): a line, a point, the surface, read now and as landed');
const near = (a, b) => Math.abs(a - b) < 1e-6;
const ev = weigh.exitValues(lines, preps, { read: 'now', now: NOW, surface: ['race'] });
const evr = (h) => ev.by.find((r) => r.handle === h) || {};
check('read now: the two £5 tickets and the £20 for anything share by race as it stands, pia two beats and quin one: mo 2400, ann 200, the cup 150, tide 150, the commons 100',
  near(evr('mo').value, 2400) && near(evr('ann').value, 200) && near(evr('race-cup').value, 150) && near(evr('tide').value, 150) && near(ev.commons, 100), ev.by);
check('…mo was paid £3, so could ask 2100; £5 for a word no law stands under is held, shared by nobody; values and the commons sum to what is shared',
  evr('mo').paid === 300 && near(evr('mo').could, 2100) && ev.pots.held === 500 && ev.given === 3500 && ev.held === 3200 &&
  near(ev.by.reduce((a, r) => a + r.value, 0) + ev.commons, 3000) && ev.pots.line.race === 1000 && ev.pots.surface === 2000, ev.pots);
const el = weigh.exitValues(lines, preps, { read: 'landed', now: NOW, surface: ['race'] });
const elr = (h) => el.by.find((r) => r.handle === h) || {};
check('read as each sum landed, as a credit would hold it: the first ticket landed when ann had brought everyone, so ann 216.67 and the commons 83.33, against 200 and 100 now',
  near(elr('ann').value, 650 / 3) && near(el.commons, 250 / 3) && near(elr('mo').value, 2400), el.by);
const pts = [weigh.parseLine('IN — £1 · from mo · for race · makers', '2026-11-25T12:00:00Z'), weigh.parseLine('IN — £1 · for race · bringers', '2026-11-25T12:00:00Z')];
const ep = weigh.exitValues(pts, preps, { read: 'now', now: NOW });
check('a point is one pot alone: £1 for race\'s makers is mo\'s 100; £1 for its bringers is ann\'s 66.67 and the commons\' 33.33',
  pts[0].layer === 'makers' && pts[1].layer === 'bringers' && near(ep.by.find((r) => r.handle === 'mo').value, 100) &&
  near(ep.by.find((r) => r.handle === 'ann').value, 200 / 3) && near(ep.commons, 100 / 3) && ep.pots.point['race · makers'] === 100, ep);
const rn = await call({ ledger: 'shore', read: 'now', surface: 'race' });
const q1 = await call({ quote: '100', for: 'race', layer: 'makers' }), q2 = await call({ quote: '100', for: 'anything', surface: 'race' });
check('the door: a ledger read now, a quote for a point and a quote for anything, and a layer or a thing that is none refused',
  rn.code === 200 && rn.body.read === 'now' && near(rn.body.commons, 100) && q1.code === 200 && near(q1.body.by[0].value, 100) && q1.body.by[0].handle === 'mo' &&
  q2.code === 200 && near(q2.body.by.find((r) => r.handle === 'mo').value, 80) && (await call({ quote: '100', for: 'race', layer: 'cooks' })).code === 400 &&
  (await call({ quote: '100', for: 'No Thing' })).code === 400 && (await call({ quote: '1.5', for: 'race' })).code === 400, { rn: rn.body.by, q1: q1.body, q2: q2.body.by });

console.log('\nthe lab\'s invented month (weightings-world.js): the index agrees with the run sum by sum');
const world = (await import('../weightings-world.js')).default;
const month = world.inventMonth({ tickets: 400 });
const runBy = (how) => weigh.runLedger(month.lines, { [month.blocks.family]: weigh.prepare(month.blocks) }, Object.assign({ now: month.meta.end }, how));
const fast = runBy({}), slow = runBy({ slow: true });
const pence = (r, h) => (r.by.find((x) => x.handle === h) || { earned: 0 }).earned;
const worst = Math.max(...[...new Set([...fast.by, ...slow.by].map((r) => r.handle))].map((h) => Math.abs(pence(fast, h) - pence(slow, h))));
check('400 invented £5 tickets: every holder\'s pence the same to the penny by the index and sum by sum, the commons too, and nothing lost',
  worst <= 1 && Math.abs(fast.commons - slow.commons) <= 1 && fast.shared === 200000 && fast.by.reduce((a, r) => a + r.earned, 0) + fast.commons === fast.shared, { worst, fc: fast.commons, sc: slow.commons });
check('…its creator holds 80% to the penny, the cup and the beach\'s server 5% each, as the law\'s weights 5 · 10 · 80 · 5 say',
  pence(fast, 'mara') === 160000 && pence(fast, 'reef-run-cup') === 10000 && pence(fast, 'tide') === 10000, fast.by.slice(0, 4));

console.log(pass ? '\nall checks pass\n' : '\nSOME CHECKS FAIL\n');
process.exit(pass ? 0 : 1);
