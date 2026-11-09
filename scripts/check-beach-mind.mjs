// check-beach-mind.mjs — webllm/beach-mind.js offline, then against the live beach (reads only).
//
//   node scripts/check-beach-mind.mjs            the pure parts, then reads at beach.happyseaurchin.com
//   node scripts/check-beach-mind.mjs --offline  the pure parts only
//
// The memory half is the mirror's own smoke (xstream-bsp scripts/smoke-soft-convos.ts at 9dd369e), case for case,
// against the port: a conversation kept by this page must be the thread the mirror reads.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bm = require('../webllm/beach-mind.js');
const S = bm.soft;

let passed = 0, failed = 0;
function ok(name, cond) { if (cond) passed++; else { failed++; console.error('  ✗ ' + name); } }
function eq(name, got, want) { const g = JSON.stringify(got), w = JSON.stringify(want); ok(`${name} (got ${g}, want ${w})`, g === w); }

// ── the mirror's smoke, ported ──
eq('spineSuffix(1)', S.spineSuffix(1), '.1');
eq('spineSuffix(2)', S.spineSuffix(2), '.11');
eq('spineSuffix(3)', S.spineSuffix(3), '.111');
eq('spineSuffix(0) clamps to depth 1', S.spineSuffix(0), '.1');
eq('convoDate full ISO', S.convoDate('2026-07-21T13:00:00.000Z'), '2026-07-21');
eq('convoDate empty', S.convoDate(''), '');
const base = { slot: '3', depth: 2, location: 'pool:rpg', date: '2026-07-21' };
ok('boundary: null state opens', S.isBoundary(null, 'pool:rpg', '2026-07-21') === true);
ok('boundary: same loc+day+under-cap deepens', S.isBoundary(base, 'pool:rpg', '2026-07-21') === false);
ok('boundary: location change opens', S.isBoundary(base, '', '2026-07-21') === true);
ok('boundary: day change opens', S.isBoundary(base, 'pool:rpg', '2026-07-22') === true);
ok('boundary: depth cap opens', S.isBoundary({ ...base, depth: S.CONVO_DEPTH_CAP }, 'pool:rpg', '2026-07-21') === true);
const r1 = S.authorResidue('clear liam’s slot', 'Cleared — slot 1 is now empty.');
ok('residue joins intent → said', r1.includes('→') && r1.includes('Cleared'));
const rJson = S.authorResidue('{"a":1}', '');
ok('residue de-prefixes a JSON-literal head', rJson[0] !== '{' && rJson[0] !== '[');
eq('residue empty inputs', S.authorResidue('', ''), '(no content)');
eq('faceTagged prefixes the stance', S.faceTagged('designer', 'did x'), '[designer] did x');
eq('faceTagged empty face leaves it untouched', S.faceTagged('', 'did x'), 'did x');
ok('faceTagged output never parses as JSON', (() => { try { JSON.parse(S.faceTagged('character', '[1,2]')); return false; } catch { return true; } })());
const spineNode = { _: 'gist', 2: 'pool:rpg', 1: { _: 'r1', 1: { _: 'r2', 1: 'r3' } } };
eq('walkSpine collects residues in order', S.walkSpine(spineNode), ['r1', 'r2', 'r3']);
eq('walkSpine single leaf', S.walkSpine({ 1: 'only' }), ['only']);
eq('walkSpine no spine', S.walkSpine({ _: 'gist' }), []);
const grown = {
  _: {
    _: 'soft-llm-convos:x at beach.example.',
    1: { _: 'e1', 2: 'A', 3: '2026-08-12T10:00:00Z', 1: 'r1' },
    3: { _: 'e3', 2: '', 3: '2026-08-13T10:00:00Z', 1: 'r3' },
    5: { _: 'e5', 2: 'A', 3: '2026-08-15T10:00:00Z', 1: 'r5' },
    9: { _: 'e9', 2: 'B', 3: '2026-08-16T10:00:00Z', 1: 'r9' },
  },
  1: {
    1: { _: 'e11', 2: 'B', 3: '2026-08-20T10:00:00Z', 1: 'r11' },
    5: { _: 'e15', 2: '', 3: '2026-08-22T10:00:00Z', 1: { _: 'r15a', 1: 'r15b' } },
    9: { _: 'e19', 2: 'C', 3: '2026-08-25T10:00:00Z', 1: 'r19' },
  },
  2: {
    1: { _: 'e21', 2: 'C', 3: '2026-09-01T10:00:00Z', 1: 'r21' },
    2: { _: 'e22', 2: 'A', 3: '2026-09-10T14:55:00Z', 1: { _: 'r22a', 1: { _: 'r22b', 1: 'r22c' } } },
  },
};
eq('floorDepth: once wrapped → 2', S.floorDepth(grown), 2);
eq('floorDepth: never wrapped → 1', S.floorDepth({ _: 'seed', 1: { _: 'x' } }), 1);
const all = S.collectEngagements(grown);
eq('every engagement found, newest first, no container among them', all.map((e) => e.addr), [22, 21, 19, 15, 11, 9, 5, 3, 1]);
eq('a sunk engagement keeps its location', all.find((e) => e.addr === 5)?.location, 'A');
eq('a sunk engagement keeps its date', all.find((e) => e.addr === 5)?.date, '2026-08-15');
eq('placeholder slot skipped', S.collectEngagements({ _: 'seed', 1: { _: 'x' }, 2: { _: '' } }).map((e) => e.addr), [1]);
eq('no container summary written → none', S.containerSummaries(grown), []);
const summarised = { ...grown, 2: { _: 'Sept: two rooms, mostly navigation.', ...grown[2] } };
eq('a container\'s own underscore is its summary, at its address', S.containerSummaries(summarised), [{ addr: 20, text: 'Sept: two rooms, mostly navigation.' }]);
eq('format null → empty', S.formatSoftConvos(null), '');
eq('format empty view → empty', S.formatSoftConvos({ rolling_summary: '', current_thread: [], here_before: [] }), '');
const text = S.formatSoftConvos({ rolling_summary: 'older stuff', current_thread: ['opened about rpg', 'cleared a slot'], here_before: [{ gist: 'talked about resolution', date: '2026-07-19' }] });
ok('format shows the running thread', text.includes('this conversation so far') && text.includes('cleared a slot'));
ok('format shows here-before', text.includes('you have been at this location before') && text.includes('2026-07-19'));
ok('format shows long arc', text.includes('long arc') && text.includes('older stuff'));
const atA = S.projectConvos(grown, 'A');
eq('@A the running thread is the newest engagement at A', atA.current_thread, ['r22a', 'r22b', 'r22c']);
eq('@A here-before newest first', atA.here_before.map((h) => h.gist), ['e5', 'e1']);
eq('@A here-before date derived', atA.here_before[0].date, '2026-08-15');
const atC = S.projectConvos(grown, 'C');
eq('@C thread is 21, not the newest-global 22', atC.current_thread, ['r21']);
eq('@C here-before is 19, read out of its container', atC.here_before.map((h) => h.gist), ['e19']);
eq('@fresh location has no thread', S.projectConvos(grown, 'Z').current_thread, []);
const atRoot = S.projectConvos(grown, '');
eq('@root the thread is engagement 15, both turns', atRoot.current_thread, ['r15a', 'r15b']);
eq('@root here-before is the sunk 3', atRoot.here_before.map((h) => h.gist), ['e3']);
eq('no summary written → no long arc, even once wrapped', atA.rolling_summary, '');
eq('a written container summary is the long arc', S.projectConvos(summarised, 'A').rolling_summary, 'Sept: two rooms, mostly navigation.');
eq('never-wrapped block: floor `_` is identity, not a summary', S.projectConvos({ _: 'soft-llm-convos:x at beach.example.', 1: { _: 'e1', 2: 'A', 1: 'r1' } }, 'A').rolling_summary, '');

// ── the wire's canonical shapes, as text ──
eq('format: disc', bm.format({ shape: 'disc', entries: [{ address: '0', content: 'root' }, { address: '1', content: { _: 'one' } }] }), '[0] root\n[1] one');
eq('format: point with its ring', bm.format({ shape: 'point', address: '7.1', content: 'boot', beneath: [{ address: '7.11', content: 'pick-up' }] }), '[7.1] boot\n  [7.11] pick-up');
eq('format: path-walk+descent', bm.format({ shape: 'path-walk+descent', path_walk: [{ address: '7', content: 'door' }, { address: '7.1', content: 'boot' }], descent: [{ address: '7.11', content: 'pick-up' }] }), '[7] door\n[7.1] boot\n  [7.11] pick-up');
eq('format: unknown → empty', bm.format({ shape: 'block', block: {} }), '');
const ctx = bm.context([{ title: 'a', text: 'x'.repeat(50) }, { title: 'b', text: 'y'.repeat(5000) }], 300);
ok('context fits its budget', ctx.length <= 300);
ok('context keeps both titles', ctx.includes('## a') && ctx.includes('## b'));
ok('context marks a cut', ctx.endsWith('…'));

// ── against the live beach: reads only ──
if (!process.argv.includes('--offline')) {
  const b = bm.beach('https://beach.happyseaurchin.com');
  const disc = await b.read('lighthouse');
  ok('live: the lighthouse disc opens with its compass line', /^\[0\] The compass/.test(disc));
  ok('live: the disc carries branches 1 to 9', /\n\[1\] /.test(disc) && /\n\[9\] /.test(disc));
  const walk = await b.read('orientation:weft', '7.1');
  ok('live: a spindle read carries its ancestor first', /^\[7\] THE DOOR/.test(walk));
  ok('live: then the point', /\n\[7\.1\] \S/.test(walk));   // the point's own line, whatever its words say today
  ok('live: then one ring beneath it', /\n {2}\[7\.11\] /.test(walk));
  const live = await b.live(24 * 60);
  ok('live: someone touched the torus in the last day', Array.isArray(live) && live.length > 0 && typeof live[0].handle === 'string');
  const mem = await b.memory('happyseaurchin', '');
  ok('live: the mirror\'s memory projects', mem && Array.isArray(mem.current_thread) && Array.isArray(mem.here_before));
  const none = await b.memory('nobody-' + Date.now(), '');
  ok('live: a name with no memory is empty, not an error', none && none.current_thread.length === 0);
}

console.log(`\nbeach-mind: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
