#!/usr/bin/env node
/* scripts/plug-game.mjs — the plug service's hands (ways:plug 8; lane plug.1, 27 Oct 2026). A maker with no hosting
 * hands a game in as text on the beach, files:<game>, with its sha256 and a line in pool:arcade; this takes it whole,
 * checks it as the kit says (ways:plug 6), and, asked to, plugs it: hosts it here at happyseaurchin.com/games/<game>.
 *
 *   node scripts/plug-game.mjs <game>                   check the submission at files:<game> (reads only)
 *   node scripts/plug-game.mjs <game> --file <page>     check a page on this computer instead (a draft, the kit's stub)
 *   node scripts/plug-game.mjs <game> --no-beach        leave out the family's checks on the beach (a draft not yet founded)
 *   node scripts/plug-game.mjs <game> --plug --by <handle> [--thread spine:<game>-plug]
 *                                                       check, then write games/<game>/ and games/list.json
 *
 * THE CHECKS, in the kit's order: the page taken whole matches the sha256 its maker gave; it is one file that loads the
 * beach's two tags in order and nothing else from outside; its ENGINE (the code between the lines '// ENGINE BEGIN' and
 * '// ENGINE END') runs with no page, no clock and no Math.random, in whole numbers; the same day always draws the same
 * level, for every day of 2026 and 2027; a good player finishes every third day inside thirty seconds; doing nothing
 * never finishes, nor does making the move on every step, or only far slower than playing; a kept run re-runs to its
 * step and a changed one does not; and on the beach the family stands as the recipe says (spine:<game> at its floor,
 * the law's lines, the room, the page at this site's address). Nothing is written unless every check passes.
 *
 * PLUGGING writes games/<game>/game.html (the page as handed in, with one line added at the top of its head, the
 * storage bridge /games/bridge.js) and games/<game>/index.html (the frame the game plays in: a sandboxed iframe, so the
 * game runs in its own opaque origin and can read nothing this site keeps in the browser; vercel.json gives the game
 * file the same sandbox and its connections, the beach and this site's reads). games/list.json is the shelf /games
 * reads. Exits 1 if any check fails. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { hostedPage, framePage, SITE } from './plug-host.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const VOICE = 'https://beach.happyseaurchin.com/button/voice.js';
const PLUG = 'https://beach.happyseaurchin.com/button/game.js';
const MAX_BYTES = 180000, PART = 60000;

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const GAME = String(args[0] || '').toLowerCase();
if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(GAME)) {
  console.error('usage: node scripts/plug-game.mjs <game> [--file <page>] [--no-beach] [--plug --by <handle> [--thread spine:<game>-plug]]');
  process.exit(2);
}
const FILE = opt('--file'), ON_BEACH = !args.includes('--no-beach'), PLUGGING = args.includes('--plug');
const BY = opt('--by'), THREAD = opt('--thread') || 'spine:' + GAME + '-plug';
if (PLUGGING && (FILE || !ON_BEACH)) { console.error('plugging takes the page from files:' + GAME + ' on the beach, checked whole'); process.exit(2); }
if (PLUGGING && !/^[A-Za-z0-9_ -]{1,32}$/.test(BY || '')) { console.error('plugging names its maker: --by <handle>'); process.exit(2); }

const results = [];
function check(name, fn) {
  try { const note = fn(); results.push({ name, ok: true, note }); return true; }
  catch (e) { results.push({ name, ok: false, note: e.message }); return false; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const voiceOf = (v) => { while (v && typeof v === 'object') v = v._; return typeof v === 'string' ? v : ''; };
async function read(block, query = '') {
  const r = await fetch(BEACH + '?block=' + encodeURIComponent(block) + query, { headers: { Accept: 'application/json' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('the beach answered ' + r.status + ' for ' + block);
  return r.json();
}
const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const bytes = (s) => Buffer.byteLength(s, 'utf8');

/* ── 1. TAKE IT WHOLE: files:<game> 1, its parts at 1.1 to 1.3 in order, against the sha256 its voicing names ── */
let page = '', given = { sha: '', bytes: 0 }, source = '';
if (FILE) {
  page = readFileSync(FILE, 'utf8'); source = FILE;
} else {
  const f = await read('files:' + GAME);
  check('the page stands at files:' + GAME + ' 1', () => {
    assert(f && f['1'] && typeof f['1'] === 'object', 'no files:' + GAME + ' with the page at 1 and its parts beneath');
    const parts = [];
    for (let d = 1; d <= 9; d++) { const p = f['1'][String(d)]; if (p == null) break; assert(typeof p === 'string', 'part 1.' + d + ' is not text'); parts.push(p); }
    assert(parts.length, 'no parts beneath files:' + GAME + ' 1');
    parts.forEach((p, i) => assert(bytes(p) <= 65536, 'part 1.' + (i + 1) + ' is ' + bytes(p) + ' bytes'));
    page = parts.join('');
    const v = voiceOf(f['1']);
    given.sha = ((/sha256\s+([0-9a-f]{64})/i.exec(v) || [])[1] || '').toLowerCase();
    given.bytes = +(((/([\d,]+)\s*bytes/i.exec(v) || [])[1] || '0').replace(/,/g, ''));
    source = 'files:' + GAME + ' 1 (' + parts.length + (parts.length === 1 ? ' part' : ' parts') + ')';
    return source;
  });
}
const SHA = sha256(page);
if (!FILE) check('its sha256 is the one its maker gave', () => {
  if (!given.sha) return 'none given: computed here, ' + SHA + ', and named on the thread';
  assert(given.sha === SHA, 'the maker gave ' + given.sha + '; the page taken whole is ' + SHA);
  if (given.bytes) assert(given.bytes === bytes(page), 'the maker gave ' + given.bytes + ' bytes; the page is ' + bytes(page));
  return SHA;
});

/* ── 2. ONE FILE, TWO TAGS, NOTHING ELSE FROM OUTSIDE (ways:plug 2 and 6) ── */
const html = page;
check('one file, at most ' + MAX_BYTES + ' bytes (three parts of ' + PART + ')', () => {
  assert(html.trim(), 'the page is empty');
  assert(bytes(html) <= MAX_BYTES, bytes(html) + ' bytes');
  assert(/<!doctype html>/i.test(html), 'no <!doctype html>');
  assert(/<meta[^>]+name=["']viewport["']/i.test(html), 'no viewport line: a phone draws it at desktop width');
  return bytes(html) + ' bytes';
});
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => ({ attrs: m[1], body: m[2], at: m.index }));
const srcOf = (a) => (/\bsrc\s*=\s*["']([^"']+)["']/i.exec(a) || [])[1] || '';
check('the beach\'s two tags, in order, and no other script from anywhere', () => {
  const outside = scripts.filter((s) => srcOf(s.attrs));
  assert(outside.length === 2, outside.length + ' scripts with a src: ' + outside.map((s) => srcOf(s.attrs)).join(', '));
  assert(srcOf(outside[0].attrs) === VOICE, 'the first is not the voice: ' + srcOf(outside[0].attrs));
  assert(srcOf(outside[1].attrs) === PLUG, 'the second is not the plug: ' + srcOf(outside[1].attrs));
  const named = (/\bdata-game\s*=\s*["']([^"']*)["']/i.exec(outside[1].attrs) || [])[1];
  assert(named === GAME, 'the plug\'s tag names data-game="' + named + '", not "' + GAME + '"');
  const engine = scripts.find((s) => !srcOf(s.attrs) && s.body.includes('// ENGINE BEGIN'));
  assert(engine && engine.at > outside[1].at, 'the page\'s own script stands before the two tags');
  return 'voice, then plug with data-game="' + GAME + '"';
});
check('nothing else loaded from outside', () => {
  const bad = [];
  for (const m of html.matchAll(/<(link|img|iframe|frame|object|embed|base|source|video|audio|track|input)\b[^>]*>/gi)) {
    const tag = m[1].toLowerCase(), t = m[0];
    if (['iframe', 'frame', 'object', 'embed', 'base'].includes(tag)) { bad.push('<' + tag + '>'); continue; }
    const u = (/\b(?:src|href|srcset|poster)\s*=\s*["']([^"']+)["']/i.exec(t) || [])[1] || '';
    if (/^(https?:)?\/\//i.test(u)) bad.push('<' + tag + '> ' + u);
  }
  for (const m of html.matchAll(/<meta\b[^>]*http-equiv[^>]*>/gi)) bad.push(m[0]);
  for (const m of html.matchAll(/url\(\s*["']?(https?:)?\/\//gi)) bad.push('a url() in a style');
  if (/@import\b/i.test(html)) bad.push('@import');
  assert(!bad.length, bad.join('; '));
  return 'links to other pages are fine; nothing fetched from elsewhere';
});
const own = scripts.filter((s) => !srcOf(s.attrs)).map((s) => s.body).join('\n');
check('the page\'s own script reaches the beach only through the plug', () => {
  const bad = ['eval(', 'new Function', 'import(', 'document.cookie', 'indexedDB', 'sendBeacon', 'WebSocket', 'XMLHttpRequest', 'EventSource', 'document.domain']
    .filter((w) => own.includes(w));
  assert(!bad.length, 'it uses ' + bad.join(', '));
  return own.includes('fetch(') ? 'it fetches for itself: allowed only to the beach and this site\'s reads, where it is hosted' : 'beachGame and beachVoice only';
});

/* ── 3. THE ENGINE, alone: no page, no clock, no Math.random, whole numbers (function:arcade 3 and 4) ── */
let E = null;
const lines = html.split('\n');
const b0 = lines.findIndex((l) => l.trim().startsWith('// ENGINE BEGIN')), b1 = lines.findIndex((l) => l.trim().startsWith('// ENGINE END'));
const engineText = b0 >= 0 && b1 > b0 ? lines.slice(b0 + 1, b1).join('\n') : '';
function code(text) {   // the engine with its comments and strings blanked, for reading its words
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/.*$/gm, '$1').replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, "''");
}
check('the engine stands between // ENGINE BEGIN and // ENGINE END, once', () => {
  assert(b0 >= 0 && b1 > b0, 'no lines opening // ENGINE BEGIN and // ENGINE END');
  assert(lines.filter((l) => l.trim().startsWith('// ENGINE BEGIN')).length === 1, 'two ENGINE BEGIN lines');
  return (b1 - b0 - 1) + ' lines';
});
check('the engine touches no page, clock or chance', () => {
  const words = code(engineText);
  const bad = ['Math.random', 'Date', 'performance', 'document', 'window', 'localStorage', 'navigator', 'location', 'fetch', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'crypto', 'beachGame', 'beachVoice']
    .filter((w) => new RegExp('\\b' + w.replace('.', '\\.') + '\\b').test(words));
  assert(!bad.length, 'it uses ' + bad.join(', '));
  return 'none';
});
check('the engine runs on its own and offers what the checks call', () => {
  const ctx = vm.createContext({});
  vm.runInContext('Math.random = function () { throw new Error("Math.random in the engine"); }; Date = function () { throw new Error("Date in the engine"); }; Date.now = Date;', ctx);
  E = vm.runInContext(engineText + '\n;typeof ENGINE === "undefined" ? undefined : ENGINE;', ctx, { timeout: 5000 });
  assert(E && typeof E === 'object', 'no ENGINE defined');
  const fns = ['level', 'start', 'step', 'finished', 'encode', 'decode', 'rerun', 'timeWords', 'bot'];
  const missing = fns.filter((f) => typeof E[f] !== 'function');
  assert(!missing.length, 'ENGINE lacks ' + missing.join(', '));
  assert(E.RATE === 60, 'RATE is ' + E.RATE + ', not 60 steps a second');
  assert(typeof E.VERSION === 'string' && /^[a-z][a-z0-9-]{0,15}$/.test(E.VERSION), 'VERSION is not a short lowercase name: ' + E.VERSION);
  assert(Number.isInteger(E.LIMIT) && E.LIMIT > 0 && E.LIMIT <= 3 * 60 * 60, 'LIMIT is not a whole number of steps up to three minutes');
  return E.VERSION + ', ' + E.RATE + ' steps a second, out of time at ' + E.LIMIT;
});

function dayOf(d) { return String(d.getUTCFullYear()) + (Math.floor(d.getUTCMonth() / 3) + 1) + (d.getUTCMonth() % 3 + 1) + (Math.floor((d.getUTCDate() - 1) / 7) + 1) + ((d.getUTCDate() - 1) % 7 + 1) + '00'; }
const DAYS = []; for (let i = 0; i < 730; i++) DAYS.push(dayOf(new Date(Date.UTC(2026, 0, 1) + i * 86400000)));
function whole(x, path = '') {
  if (typeof x === 'number') { if (!Number.isInteger(x)) throw new Error('not a whole number at ' + (path || 'the top') + ': ' + x); return; }
  if (Array.isArray(x)) return x.forEach((v, i) => whole(v, path + '[' + i + ']'));
  if (x && typeof x === 'object') for (const k of Object.keys(x)) whole(x[k], path + '.' + k);
}
function play(lv, move, limit) {   // no input (move 0 on every step) or the move on every step (1): the step it finishes at, or 0
  let s = E.start(lv);
  for (let i = 0; i < limit; i++) { if (E.finished(lv, s)) return i; s = E.step(lv, s, move); whole(s, 'the state'); }
  return E.finished(lv, s) ? limit : 0;
}
const bots = {};
if (E) {
  check('the same day always draws the same level, in whole numbers, every day of 2026 and 2027', () => {
    for (const d of DAYS) {
      const a = JSON.stringify(E.level(d)), b = JSON.stringify(E.level(d));
      assert(a === b, d + ' drew two levels');
      whole(JSON.parse(a), d);
    }
    assert(JSON.stringify(E.level(DAYS[0])) !== JSON.stringify(E.level(DAYS[1])), 'two days drew the same level');
    return DAYS.length + ' days';
  });
  check('a good player finishes every third day inside thirty seconds', () => {
    let worst = 0, sum = 0, n = 0;
    for (const d of DAYS.filter((_, i) => i % 3 === 0)) {
      const b = E.bot(E.level(d));
      assert(b && Array.isArray(b.moves) && Number.isInteger(b.steps), d + ': the good player (ENGINE.bot) does not finish');
      assert(b.steps <= 30 * E.RATE, d + ': the good player took ' + E.timeWords(b.steps) + ' s');
      bots[d] = b; worst = Math.max(worst, b.steps); sum += b.steps; n++;
    }
    return n + ' days, ' + E.timeWords(Math.round(sum / n)) + ' s on average, ' + E.timeWords(worst) + ' s at worst';
  });
  check('doing nothing never finishes, or only far slower than playing', () => {   // ways:arcade 6: a level that plays itself makes every line a lie
    let slowest = Infinity;
    for (const d of Object.keys(bots).filter((_, i) => i % 2 === 0)) {
      const at = play(E.level(d), 0, E.LIMIT);
      if (at) { assert(at >= 2.5 * bots[d].steps, d + ': no input finished in ' + E.timeWords(at) + ' s, the good player in ' + E.timeWords(bots[d].steps) + ' s'); slowest = Math.min(slowest, at / bots[d].steps); }
    }
    return slowest === Infinity ? 'it never finishes' : 'at least ' + slowest.toFixed(1) + ' times slower';
  });
  check('making the move on every step never finishes, or only far slower than playing', () => {
    let slowest = Infinity;
    for (const d of Object.keys(bots).filter((_, i) => i % 3 === 0)) {
      const at = play(E.level(d), 1, E.LIMIT);
      if (at) { assert(at >= 2.5 * bots[d].steps, d + ': the move on every step finished in ' + E.timeWords(at) + ' s, the good player in ' + E.timeWords(bots[d].steps) + ' s'); slowest = Math.min(slowest, at / bots[d].steps); }
    }
    return slowest === Infinity ? 'it never finishes' : 'at least ' + slowest.toFixed(1) + ' times slower';
  });
  check('a kept run re-runs to its step, in the time its line says', () => {
    for (const d of Object.keys(bots)) {
      const b = bots[d], p = E.encode(d, b.steps, b.moves), r = E.rerun(p), back = E.decode(p);
      assert(r && r.ok, d + ': ' + p + ' does not re-run: ' + (r && r.error));
      assert(r.steps === b.steps && r.time === E.timeWords(b.steps), d + ': it re-runs to ' + r.steps + ' steps, ' + r.time);
      assert(back && back.day === d && back.steps === b.steps && JSON.stringify(back.moves) === JSON.stringify(b.moves), d + ': the proof does not decode to its run');
      assert(p.length <= 1500, d + ': a proof of ' + p.length + ' characters');
      assert(new RegExp('^\\d+\\.\\d\\d$').test(r.time), 'the time is not seconds to the hundredth: ' + r.time);
    }
    return Object.keys(bots).length + ' runs, e.g. ' + E.encode(DAYS[0], bots[DAYS[0]].steps, bots[DAYS[0]].moves);
  });
  check('a changed run does not', () => {
    for (const d of Object.keys(bots)) {
      const b = bots[d];
      assert(!E.rerun(E.encode(d, b.steps + 1, b.moves)).ok, d + ': a step added still re-runs');
      if (b.moves.length && b.moves[b.moves.length - 1] < b.steps - 1) assert(!E.rerun(E.encode(d, b.steps - 1, b.moves)).ok, d + ': a step taken away still re-runs');
      if (b.moves.length) {
        const dropped = !E.rerun(E.encode(d, b.steps, b.moves.slice(0, -1))).ok;
        const last = b.moves[b.moves.length - 1], moved = b.moves.slice(0, -1).concat(last + 1 < b.steps ? [last + 1] : []);
        assert(dropped || !E.rerun(E.encode(d, b.steps, moved)).ok, d + ': the last move dropped and moved still re-runs');
      }
      const other = DAYS[(DAYS.indexOf(d) + 1) % DAYS.length];
      const there = E.rerun(E.encode(other, b.steps, b.moves));
      assert(!(there && there.ok && there.day === d), d + ': a run re-runs as another day');
    }
    assert(!E.rerun('').ok && !E.rerun('nonsense').ok, 'nonsense re-runs');
    return 'a step added or taken away, the last move dropped, nonsense';
  });
}

/* ── 4. THE FAMILY ON THE BEACH, as the recipe founds it (ways:arcade 2, ways:plug 5) ── */
let law = null;
if (ON_BEACH) {
  const [spine, fn, gm, room] = await Promise.all([read('spine:' + GAME, '&pscale=0'), read('function:' + GAME), read('game:' + GAME), read('pool:' + GAME)]);
  law = fn || gm;
  check('spine:' + GAME + ' stands at its floor', () => {
    assert(spine, 'no spine:' + GAME + ': a daily game stands on the clock, its root voiced ten underscores deep');
    assert(spine.floor === 10 || spine.floor === 1, 'its floor is ' + spine.floor + ': ten for a daily game, one for a game of stops');
    return 'floor ' + spine.floor + (spine.floor === 10 ? ', on the clock' : ', of stops');
  });
  const lawLines = [];
  (function walk(n) { if (typeof n === 'string') lawLines.push(n); else if (n && typeof n === 'object') Object.keys(n).forEach((k) => walk(n[k])); })(law);
  const find = (w) => { for (const l of lawLines) { const m = new RegExp('^\\s*' + w + '\\s*:\\s*(.+)$', 'i').exec(l); if (m) return m[1].trim(); } return ''; };
  check('the law says what the plug reads', () => {
    assert(law, 'no function:' + GAME + ' (nor game:' + GAME + ')');
    assert(/^game$/i.test(find('mode')), 'no line \'mode: game\'');
    const brief = find('briefing');
    assert(brief && brief.length <= 280, brief ? 'the briefing runs to ' + brief.length + ' characters: three things only' : 'no line \'briefing: …\'');
    assert(find('room').toLowerCase() === 'pool:' + GAME, 'its room line is \'' + find('room') + '\', not \'pool:' + GAME + '\'');
    assert(/^[A-Z][A-Z0-9_-]*,\s*(lowest|highest) first,\s*(best|last) per player$/i.test(find('board')), 'its board line is \'' + find('board') + '\'');
    assert(find('proof'), 'no line \'proof: …\' saying how a run is kept and checked');
    const pg = find('page');
    assert(/^https:\/\/\S+$/.test(pg), 'no line \'page: https://…\'');
    return 'board: ' + find('board') + ' · page: ' + pg;
  });
  check('the page line names where it plays', () => {
    const pg = find('page');
    if (!FILE) assert(pg === SITE + '/games/' + GAME, 'a game hosted here plays at ' + SITE + '/games/' + GAME + '; its law says ' + pg);
    return pg;
  });
  check('pool:' + GAME + ' stands, the room', () => {
    assert(room && typeof room === 'object', 'no pool:' + GAME);
    return voiceOf(room).slice(0, 80) || '(no purpose line)';
  });
}

/* ── the report ── */
const failed = results.filter((r) => !r.ok);
console.log('\n' + GAME + ' — ' + (source || FILE) + '\n');
for (const r of results) console.log('  ' + (r.ok ? '✓' : '✗') + ' ' + r.name + (r.note ? '\n      ' + r.note : ''));
console.log('\n  sha256 ' + SHA + ' · ' + bytes(page) + ' bytes');
console.log('  ' + (failed.length ? failed.length + ' of ' + results.length + ' checks failed' : 'all ' + results.length + ' checks pass') + '\n');
if (failed.length) process.exit(1);

/* ── 5. PLUG IT: the page hosted in its frame (scripts/plug-host.mjs), and its line on the shelf ── */
if (PLUGGING) {
  const title = ((/<title>([^<]*)<\/title>/i.exec(html) || [])[1] || GAME).trim();
  const what = ((/<meta[^>]+name=["']description["'][^>]+content=(["'])([\s\S]*?)\1/i.exec(html) || [])[2] || '').trim();   // a description may hold the other quote
  const dir = join(ROOT, 'games', GAME);
  mkdirSync(dir, { recursive: true });
  const hosted = hostedPage(html);
  writeFileSync(join(dir, 'game.html'), hosted);
  writeFileSync(join(dir, 'index.html'), framePage({ game: GAME, title, what, by: BY }));
  const listPath = join(ROOT, 'games', 'list.json');
  const list = existsSync(listPath) ? JSON.parse(readFileSync(listPath, 'utf8')) : [];
  const entry = { game: GAME, title, what, by: BY, page: SITE + '/games/' + GAME, law: law ? 'function:' + GAME : '', room: 'pool:' + GAME,
    files: 'files:' + GAME, sha256: SHA, bytes: bytes(page), hosted: sha256(hosted), thread: THREAD, plugged: new Date().toISOString().slice(0, 10) };
  const at = list.findIndex((g) => g.game === GAME);
  if (at >= 0) list[at] = entry; else list.push(entry);
  writeFileSync(listPath, JSON.stringify(list, null, 2) + '\n');
  console.log('  plugged: games/' + GAME + '/game.html (hosted sha256 ' + entry.hosted + '), games/' + GAME + '/index.html, games/list.json');
  console.log('  play it here first: NODE_PATH=$(npm root -g) node scripts/smoke-games.mjs ' + GAME);
  console.log('  live once merged at ' + entry.page + '\n');
}
