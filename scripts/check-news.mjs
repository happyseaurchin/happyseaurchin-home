// /api/news checked offline: the beach mocked as global fetch, the handler called as Vercel calls it.
// The strip at the top of the day (spine:happening 1.1), the wire noting what is made where its kind is
// listed (1.11), and the keeper choosing by the law at function:news 2.6.
//   node scripts/check-news.mjs
const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const NOW = Date.now(), iso = (msAgo) => new Date(NOW - msAgo).toISOString();
const MIN = 60_000;
/* its stamps stand minutes before now, inside today: in the day's first hour they would fall in yesterday */
if (NOW % 86400_000 < 70 * MIN) { console.log('check-news: run it after 01:10 UTC, when an hour of today stands to place its stamps in'); process.exit(0); }
const { momentToAddress } = await import('../api/news.js');
const DAY = momentToAddress(new Date(NOW)).slice(0, 8);            // today's digits, 2026414 6 …

const nested = (line, floor) => { let n = line; for (let i = 0; i < floor; i++) n = { _: n }; return n; };
/* a now:<handle> mirror founded ten deep, as the beach lands one, with lines at the given digits */
function mirror(who, lines) {
  const m = nested('MIRROR — ' + who, 10);
  for (const [digits, line] of Object.entries(lines)) {
    let n = m;
    const path = digits.replace(/^(\d)0/, '$1_');                   // the century's zero is kept at '_'
    for (const d of path.slice(0, -1)) { if (!n[d] || typeof n[d] !== 'object') n[d] = typeof n[d] === 'string' ? { _: n[d] } : {}; n = n[d]; }
    const last = path.slice(-1);
    if (n[last] && typeof n[last] === 'object' && typeof line === 'string') n[last]._ = line; else n[last] = line;
  }
  return m;
}
const BLOCKS = {
  'function:news': { _: 'The law of the news family.', 3: { 3: 'Agents known: weft, keel.' },
    2: { 6: { _: 'THE KEEPER\'S CHOOSING LAW — read at each pass.', 1: 'You keep the house edition.', 2: 'Choose at most nine.', 3: 'Words to an agent in its own room are housekeeping.' } } },
  'now:Matthew': mirror('Matthew', { [DAY]: "I'll be at Salem Hall, showing the app." }),
  'now:keel': mirror('keel', { [DAY]: 'A film made with David at dawn.' }),
  'now:weft': mirror('weft', { [DAY]: "weft's day.", [DAY + '6']: { _: 'a lane said this in the afternoon', 2: 'now', 3: iso(90 * MIN), 4: 'done' } }),
  'now:quiet': mirror('quiet', { '2026414111': 'a line on another day' }),
  'now:trial-hand-a': mirror('trial-hand-a', { [DAY]: 'a test hand, never shown' }),
  presence: { _: 'Presence.', 1: { _: 'ann here', 1: 'ann', 2: 'pool:phenomemental', 3: iso(2 * MIN) }, 2: { _: 'bob earlier', 1: 'bob', 2: 'pool:x', 3: iso(20 * MIN) } },
  proposals: { _: 'PROPOSALS — one line each.', 1: { _: 'happening — where things are happening · happyseaurchin.com/proposal/happening', 3: iso(30 * MIN) } },
  'spine:happening': nested('HAPPENING — where things are happening.', 1),
  'function:happening': { _: 'Operator for happening.', 6: 'THE LOOK — no crafted page.', 9: 'PROVENANCE — written by weft (Claude Code) at David\'s word.' },
  'spine:ai-wave': nested('THE AI WAVE — two films of one wave.', 10),
  'function:ai-wave': { _: 'The law of the AI wave.', 6: 'page: https://happyseaurchin.com/animations/before-it-breaks — with its other version.', 9: 'PROVENANCE — founded 27 October 2026 by weft at David\'s word.' },
  animations: { _: 'Animations of the beach.', 1: { _: 'Films.',
    1: { _: 'Front-wheel drive — an old film whose credit was written over its stamp', 1: 'https://happyseaurchin.com/animations/front-wheel-drive', 2: 'https://happyseaurchin.com/animations/front-wheel-drive.jpg', 3: 'Brought by David Pinto on 9 October 2026' },
    2: { _: 'A new film — kept with its stamp', 1: 'https://happyseaurchin.com/animations/new-film', 2: 'https://happyseaurchin.com/animations/new-film.jpg', 3: iso(10 * MIN), 5: 'Made by keel, the Claude pattern, at David Pinto\'s word' } } },
};
const BORN = { 'spine:happening': iso(40 * MIN), 'function:happening': iso(39 * MIN), 'spine:ai-wave': iso(50 * MIN), 'function:ai-wave': iso(49 * MIN) };
const TOUCHED = { ...BORN, proposals: iso(30 * MIN), animations: iso(10 * MIN), presence: iso(2 * MIN), 'torus-mirror:weft': iso(3 * MIN), 'torus-mirror:keel': iso(5 * 60 * MIN),
  'now:Matthew': iso(5 * 60 * MIN), 'now:keel': iso(4 * 60 * MIN), 'now:weft': iso(60 * MIN), 'now:quiet': iso(3 * 86400_000), 'now:trial-hand-a': iso(60 * MIN) };
const BEAT = [
  { address: 'x.1', content: 'happening.2: building the strip', stamp: iso(3 * MIN) },
  { address: 'x.2', content: 'happening.2: an earlier line of the same lane', stamp: iso(6 * MIN) },
  { address: 'x.3', content: 'string.2: building the String', stamp: iso(4 * MIN) },
  { address: 'x.4', content: 'old.1: said a beat and more ago', stamp: iso(40 * MIN) },
];
let refuse = null;                                                    // a source the beach will not give
globalThis.fetch = async (url) => {
  const u = new URL(url), name = u.searchParams.get('block');
  const body = (status, d) => ({ status, ok: status < 400, json: async () => d });
  if (refuse && refuse.test(u.search)) return body(503, { error: 'down' });
  if (u.searchParams.has('tables')) return body(200, { tables: [{ name: 'brackenfoot-open', room: 'pool:131', touched: iso(20 * MIN) }, { name: 'old-table', room: 'pool:1', touched: iso(9 * 86400_000) }] });
  if (!name) return body(200, { blocks: [...Object.keys(BLOCKS), 'torus-mirror:weft', 'torus-mirror:keel'], touched: TOUCHED, born: BORN, now: { iso: new Date(NOW).toISOString() } });
  if (name.startsWith('torus-mirror:')) return body(200, { descent: name === 'torus-mirror:weft' ? BEAT : [] });
  const b = BLOCKS[name];
  return b ? body(200, b) : body(404, { error: 'not found' });
};
const { default: handler, keeperLaw } = await import('../api/news.js');
let pass = true;
const check = (label, ok, detail) => { if (!ok) pass = false; console.log(`  ${ok ? '✓' : '✗'} ${label}` + (ok ? '' : '\n      ' + JSON.stringify(detail))); };
function call(query) {
  return new Promise((ok) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.code = s; return this; }, json(d) { ok({ code: this.code, headers: this.headers, body: d }); }, end() { ok({ code: this.code }); } };
    handler({ method: 'GET', query, headers: {} }, res);
  });
}

console.log('\nthe strip at the top of the day (spine:happening 1.1)');
let r = await call({ where: '1' });
const w = r.body;
check('answers 200, cached briefly while the day runs', r.code === 200 && /max-age=20/.test(r.headers['Vercel-CDN-Cache-Control'] || '') && w.day.running === true, r);
check('what people said today, people before agents, a test hand and a quiet one left out', w.said.ok && w.said.lines.map((l) => l.who).join(',') === 'Matthew,weft,keel', w.said);
check('a line kept in the accumulator shape is one line, its fields not lines of their own', w.said.lines.find((l) => l.who === 'weft').finer.map((f) => f.text).join('|') === 'a lane said this in the afternoon', w.said.lines.find((l) => l.who === 'weft'));
check('who is here: presence within fifteen minutes, not twenty', w.here.ok && w.here.hands.map((h) => h.who + ' ' + h.where).join(',') === 'ann pool:phenomemental', w.here);
check('the beat: the newest line of each lane said within one beat\'s width', w.beat.ok && w.beat.lines.map((l) => l.lane).join(',') === 'happening.2,string.2', w.beat);
check('the tables that took a voice today, and not an older one', w.tables.ok && w.tables.tables.map((t) => t.name).join(',') === 'brackenfoot-open', w.tables);
refuse = /block=presence/;
r = await call({ where: '1' });
check('a source the beach will not give is unread, the rest still read', r.code === 200 && r.body.here.ok === false && /503/.test(r.body.here.error) && !/https?:/.test(r.body.here.error) && r.body.said.ok && r.body.beat.ok, r.body.here);
refuse = null;

console.log('\nnew things noted (spine:happening 1.11)');
r = await call({ rung: 'day' });
const items = r.body.items || [], find = (k, s) => items.find((it) => it.kind === k && String(it.line).includes(s));
const wave = find('family', 'ai-wave'), hap = find('family', 'happening');
check('a family opens at the page its law names at 6', wave && wave.open === 'https://happyseaurchin.com/animations/before-it-breaks' && wave.who === 'weft', wave);
check('…else at the page the proposals list names for it', hap && hap.open === 'https://happyseaurchin.com/proposal/happening', hap);
const prop = find('proposal', 'happening');
check('a proposal shared on the list is noted at its stamp, opening its page, its maker from the law\'s provenance', prop && prop.open === 'https://happyseaurchin.com/proposal/happening' && prop.who === 'weft' && !prop.line.includes(' · '), prop);
const film = find('animation', 'A new film');
check('a film on the animations shelf with its stamp kept is noted, with its still and its maker from the credit at 5', film && film.image.endsWith('new-film.jpg') && film.open.endsWith('/new-film') && film.who === 'keel' && film.agent === true, film);
check('a film whose credit was written over its stamp cannot be noted', !find('animation', 'Front-wheel'), items.map((it) => it.kind + ' ' + it.line));
r = await call({ item: film.address, s: film.source });
check('the film\'s own page reads it again at its source', r.code === 200 && r.body.item && r.body.item.kind === 'animation' && r.body.item.who === 'keel', r.body);

console.log('\nthe keeper\'s law (function:news 2.6)');
let law = await keeperLaw();
check('the keeper chooses by the law on the beach, a line at each digit', law.from === 'function:news 2.6' && law.text.split('\n').length === 3 && /housekeeping/.test(law.text), law);
delete BLOCKS['function:news'][2];
law = await keeperLaw();
check('…and by its own copy where the beach holds no law there', law.from === 'api/news.js' && /Words to an agent in its own room are housekeeping/.test(law.text), law.from);

console.log(pass ? '\nall pass\n' : '\nFAILED\n');
process.exit(pass ? 0 : 1);
