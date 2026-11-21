// /api/text checked offline: the beach mocked as global fetch, the handler called as Vercel calls it. A family is
// one plain text: its spine walked down its 1, side-rooms and points in place, the shared reading wherever one
// stands, every reader's lines at the addresses they wrote them, its law and its room; a sealed line is named,
// never shown, and a file kept whole in a block is named where it stands, never poured out.
//   node scripts/check-text.mjs
const NOW = { iso: '2026-11-20T08:10:00Z', address: '2026511600', voicing: 'Friday 20 November 2026, morning' };
const SCRIPT = '#!/usr/bin/env python3\n"""an apparatus"""\nimport torch\n' + 'x = 1\n'.repeat(600);
const GRAY = { _: 'Encrypted (gray) — sealed to its holder', 1: 'CIPHERTEXT-SHOULD-NOT-SHOW', 2: 'nonce', 9: { _: 'gray', 1: 'self' } };
const BLOCKS = {
  'spine:lab': {
    _: 'THE LAB — what an address can do, tried in the open.',
    1: {
      _: 'THE QUESTION — what a model gives up each time it reads.',
      1: {
        _: 'WHY SALT AND AI MEET — the first lane, where SALT keeps its words and an AI reads them.',
        2: { _: 'COMPILED SPINDLES — runs as they come, each in its runner\'s mirror.', 8: 'DECIDE — Run it with trained weights? Asked of David and weft. RUN, CHANGE or NOT YET.' },
        9: 'STATE: under way — the first run stands.'
      },
      2: 'A SIDE ROOM — where the question came from, with the AI named mid-sentence.',
      8: 'DECIDE — Run the lab? Asked of David.'
    },
    2: 'THE PAGE — https://example.org/lab',
    3: 'WHERE IT CAME FROM — a chat on 19 November 2026.',
    4: { _: 'BESIDE THE STEPS — a measure laid beside them.', 1: 'ITS READING — what the measure reads.', 8: 'DECIDE — Is the measure the right one? Asked of anyone. HOLDS, TEST or NOT YET.' }
  },
  'function:lab': { _: 'THE LAW of lab.', 1: 'mode: document', 3: 'room: pool:lab-room, open', 6: 'page: https://example.org/lab.', 7: 'phase: proposal — the decisions are open' },
  'lab:ann': {
    _: 'MIRROR — ann',
    1: { 8: 'GO — yes, run it', 1: { 2: { 1: { _: 'RUN 1 — on a small model', 1: 'EXACT — the same word at every spindle', 9: { _: 'APPARATUS — whole at 9.1', 1: SCRIPT } } } } },
    4: { 8: 'HOLDS — it reads what it says' }
  },
  'lab:bob': { _: 'MIRROR — bob', 1: { 8: GRAY } },
  lab: { _: 'LAB — the FOLD', 1: { 8: 'THE SHARED READING — both said yes, one sealed.', 1: { 2: 'ACROSS THE RUNS — one run, laid out.\n\nTable 1 — the runs\n| | ann |\n|---|---|\n| Model | small |' } } },
  'pool:lab-room': {
    _: 'The room of the lab.',
    1: { _: 'first line', 1: 'ann', 3: '2026-11-19T20:00:00Z' },
    2: { _: 'Encrypted (gray)', 1: 'bob', 3: '2026-11-19T21:00:00Z', 9: { _: 'gray', 1: 'self' } },
    3: { _: 'newest line', 1: 'cat', 3: '2026-11-20T07:00:00Z' }
  },
  'spine:kern': { _: 'A kernel of regions.', 1: 'THE PERSON — who one is.', 2: { _: 'BETWEEN PEOPLE — what passes.', 1: 'TRUST — how it grows.' } },
  'function:kern': { _: 'THE LAW of kern.', 1: 'mode: frame — regions side by side', 7: 'phase: reference' },
  'spine:wire': { _: 'SPINE — a game on the clock.' },
  'function:wire': { _: 'THE LAW of wire.', 1: 'mode: game', 6: 'page: https://example.org/wire.html' }
};
let reads = [], down = false;
globalThis.fetch = async (url) => {
  const u = new URL(url), name = u.searchParams.get('block');
  reads.push(name || 'index');
  const body = (status, d) => ({ status, ok: status < 400, json: async () => d });
  if (down) return body(503, { error: 'down' });
  if (!name) return body(200, { blocks: Object.keys(BLOCKS), touched: {}, born: {}, now: NOW });
  const b = BLOCKS[name];
  return b ? body(200, b) : body(404, { error: 'not found' });
};
const { default: handler } = await import('../api/text.js');
let pass = true;
const check = (label, ok, detail) => { if (!ok) pass = false; console.log(`  ${ok ? '✓' : '✗'} ${label}` + (ok ? '' : '\n      ' + JSON.stringify(detail).slice(0, 600))); };
function call(query, method = 'GET') {
  return new Promise((ok) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.code = s; return this; },
      send(b) { ok({ code: this.code, headers: this.headers, body: b }); }, end() { ok({ code: this.code, headers: this.headers, body: '' }); } };
    handler({ method, query }, res);
  });
}

console.log('\n/api/text: a family as one plain text');
let r = await call({ family: 'lab' });
const t = r.body || '';
check('200, plain text kept a minute at the CDN, handed over inline as lab.md', r.code === 200 && /^text\/plain/.test(r.headers['Content-Type']) && r.headers['Content-Disposition'] === 'inline; filename="lab.md"' && /max-age=60/.test(r.headers['Vercel-CDN-Cache-Control']), r.headers);
check('titled from the spine, its body capitalised after the title', /^# The lab\n\nWhat an address can do/.test(t), t.slice(0, 120));
check('says when it was read, by the beach\'s own clock', t.includes('read live Friday 20 November 2026, morning (2026-11-20T08:10:00Z)'), t.slice(0, 400));
check('the steps run down 1, each a heading with its address', t.includes('\n## The question · 1\n') && t.includes('\n## Why SALT and AI meet · 1.1\n'), t.match(/^##.*$/gm));
check('…a title\'s capitals written as the text writes each word mid-sentence (SALT, AI), the rest in lower case', t.includes('Why SALT and AI meet') && !/Why salt and ai/i.test(t.replace('Why SALT and AI meet', '')), t.match(/^##.*$/gm));
check('side-rooms sit inside their step, a level down', t.includes('\n### A side room · 1.2\n') && t.includes('\n### Compiled spindles · 1.12\n'), t.match(/^###.*$/gm));
check('a decision with the shared reading above everyone\'s answers', /\*\*Decide · 1\.8\*\* — Run the lab\? Asked of David\.\n\n\*\*The shared reading here\*\* \(lab 1\.8[^\n]*\n\nTHE SHARED READING — both said yes, one sealed\.\n- \*\*ann\*\*: GO — yes, run it\n- \*\*bob\*\*: \(sealed: readable only by those it was sealed for\)/.test(t), t.slice(t.indexOf('**Decide · 1.8'), t.indexOf('**Decide · 1.8') + 400));
check('a sealed line is named, never shown as its ciphertext', !t.includes('CIPHERTEXT-SHOULD-NOT-SHOW'), '');
check('a decision nobody has answered says so', /\*\*Decide · 1\.128\*\* — Run it with trained weights\?[^\n]*\n- \(no answers yet\)/.test(t), t.slice(t.indexOf('**Decide · 1.128'), t.indexOf('**Decide · 1.128') + 200));
check('a reader\'s run beneath a place the spine leaves open, its findings nested beneath it', t.includes('- **ann** 1.121: RUN 1 — on a small model\n  - 1.1211: EXACT — the same word at every spindle\n  - 1.1219: APPARATUS — whole at 9.1'), t.slice(t.indexOf('**ann** 1.121') - 10, t.indexOf('**ann** 1.121') + 400));
check('a file kept whole in a block is named where it stands, not poured out', /    - 1\.12191: \[a file of [\d,]+ characters, kept whole at lab:ann 1\.12191: https:\/\/beach\.happyseaurchin\.com\/\.well-known\/pscale-beach\?block=lab%3Aann\]/.test(t) && !t.includes('x = 1\nx = 1'), t.slice(t.indexOf('1.12191') - 10, t.indexOf('1.12191') + 200));
check('the shared reading of a lane stands under its heading, tables and all', t.includes('**The shared reading here** (lab 1.12, which anyone may make again):\n\nACROSS THE RUNS — one run, laid out.\n\nTable 1 — the runs\n| | ann |'), '');
check('a step\'s state is said', t.includes('*State · 1.19:* STATE: under way — the first run stands.'), '');
check('a room beside the steps that asks a question is read whole, after the steps, its question a point with its answers', t.includes('\n## Beside the steps · 4\n\nA measure laid beside them.') && t.includes('\n### Its reading · 4.1\n') && /\*\*Decide · 4\.8\*\* — Is the measure the right one\?[^\n]*\n- \*\*ann\*\*: HOLDS — it reads what it says/.test(t) && t.indexOf('## Beside the steps · 4') > t.indexOf('## Why SALT and AI meet · 1.1') && t.indexOf('## Beside the steps · 4') < t.indexOf('## About this family'), t.slice(t.indexOf('## Beside'), t.indexOf('## Beside') + 400));
check('…and is not said again among the root\'s other side-rooms', !/## About this family[\s\S]*BESIDE THE STEPS/.test(t), t.slice(t.indexOf('## About this family'), t.indexOf('## About this family') + 300));
check('the root\'s side-rooms, its law line by line, and its room', t.includes('## About this family\n\nTHE PAGE — https://example.org/lab\n\nWHERE IT CAME FROM') && t.includes('## Its law · function:lab') && t.includes('- **7** phase: proposal — the decisions are open'), '');
check('the room named by the law, its latest lines newest first, a sealed one said to be sealed', /## Its room · pool:lab-room\n\nThe room of the lab\.\n\nIts latest 3 lines, newest first:\n\n- cat · 2026-11-20 — newest line\n- bob · 2026-11-19 — \(sealed\)\n- ann · 2026-11-19 — first line/.test(t), t.slice(t.indexOf('## Its room')));
check('the foot names the page, the plain view and the text itself', t.includes('Its page: https://example.org/lab; drawn plainly: https://happyseaurchin.com/proposal/lab; as text: https://happyseaurchin.com/text/lab.'), t.slice(-300));
check('read once each: the index, the spine, the law, two mirrors, the fold and the room', ['index', 'spine:lab', 'function:lab', 'lab:ann', 'lab:bob', 'lab', 'pool:lab-room'].every((n) => reads.filter((x) => x === n).length === 1) && reads.length === 7, reads);

console.log('\n…as a file, and at one address');
r = await call({ family: 'lab', download: '' });
check('?download hands it over as a file, lab.md', r.code === 200 && r.headers['Content-Disposition'] === 'attachment; filename="lab.md"', r.headers);
r = await call({ family: 'Lab' });
check('a name in capitals goes to its one address', r.code === 308 && r.headers.Location === '/text/lab', r);
r = await call({ family: 'lab', download: '', x: '1' });
check('…and a query it does not take is dropped, the download kept', r.code === 308 && r.headers.Location === '/text/lab?download', r);
r = await call({ family: '../etc' });
check('a name that is not a family is refused', r.code === 400, r);
r = await call({ family: 'lab' }, 'POST');
check('GET only, a POST refused', r.code === 405, r);
r = await call({ family: 'lab' }, 'HEAD');
check('…and a HEAD answered as a GET, as a link checker asks', r.code === 200 && r.headers['Content-Disposition'] === 'inline; filename="lab.md"', r);
r = await call({ family: 'nothing-here' });
check('a family with no spine on the beach says so, 404', r.code === 404 && /spine:nothing-here is not there/.test(r.body), r);

console.log('\n…by its kind');
r = await call({ family: 'kern' });
check('a frame\'s regions stand side by side at the root, drawn plainly at /walk', r.code === 200 && r.body.includes('\n## The person · 1\n') && r.body.includes('\n## Between people · 2\n') && r.body.includes('\n### Trust · 2.1\n') && r.body.includes('Drawn plainly: https://happyseaurchin.com/walk/kern') && !r.body.includes('## About this family'), r.body.slice(0, 900));
r = await call({ family: 'wire' });
check('a game is not a document: it is read on its page', r.code === 200 && r.body.includes('Its parts are not a document (its law says mode: game), so they are read on its page, https://example.org/wire.html.'), r.body.slice(0, 900));
down = true;
r = await call({ family: 'lab' });
check('a beach that cannot be read is said plainly, 502', r.code === 502 && /could not be read/.test(r.body), r);

console.log(pass ? '\nall good\n' : '\nSOMETHING FAILED\n');
process.exit(pass ? 0 : 1);
