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
  'spine:sea': { _: 'THE SEA — the open meeting extended to a city, in the words SALT uses.', 1: { _: 'DIVE — a person dives in.', 8: 'DECIDE — Dive? Asked of David.' } },
  'function:sea': { _: 'THE LAW of sea.', 1: 'mode: document' },
  proposals: { _: { _: 'PROPOSALS — one line each, the first nine kept whole beneath the supernest.', 1: 'sea — the open meeting extended to a city: a person dives into the crowd; its band is a night sea · happyseaurchin.com/the-sea' }, 1: { _: 'the next nine', 1: 'lab — what an address can do · example.org/lab' } },
  'function:wire': { _: 'THE LAW of wire.', 1: 'mode: game', 6: 'page: https://example.org/wire.html' }
};
let reads = [], down = false;
const SITE_PAGES = {
  '/the-sea': '<!doctype html><html><head><title>The Sea · a night sea</title><meta property="og:title" content="The Sea — the open meeting, extended to a city"><meta content="/animations/the-sea.jpg" property="og:image"></head><body>…</body></html>'
};
let siteReads = [];
globalThis.fetch = async (url) => {
  const u = new URL(url), name = u.searchParams.get('block');
  if (u.hostname === 'happyseaurchin.com') {
    siteReads.push(u.pathname);
    const html = SITE_PAGES[u.pathname];
    return { status: html ? 200 : 404, ok: !!html, text: async () => html || 'not found' };
  }
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
console.log('\n/proposal/<name>: the page, saying what it is before it runs');
const head = (b) => String(b || '').split('</head>')[0];
const meta = (b, k) => (new RegExp('<meta (?:property|name)="' + k + '" content="([^"]*)">').exec(head(b)) || [])[1];
const titleIn = (b) => (/<title>([^<]*)<\/title>/.exec(head(b)) || [])[1];
siteReads = [];
r = await call({ proposal: 'sea', x: '1' });
check('a listed proposal: the page itself, as html, kept ten minutes at the CDN and served stale for a day while it is read again', r.code === 200 && /^text\/html/.test(r.headers['Content-Type']) && /max-age=600, stale-while-revalidate=86400/.test(r.headers['Vercel-CDN-Cache-Control']) && String(r.body).includes('</html>') && String(r.body).includes('function shelfOf'), r.headers);
check('…titled with its crafted page\'s own title, its og:title the same', titleIn(r.body) === 'The Sea — the open meeting, extended to a city' && meta(r.body, 'og:title') === 'The Sea — the open meeting, extended to a city', [titleIn(r.body), meta(r.body, 'og:title')]);
check('…its line the list\'s, before the band\'s clause, said as a proposal', meta(r.body, 'og:description') === 'A proposal: The open meeting extended to a city: a person dives into the crowd' && meta(r.body, 'description') === meta(r.body, 'og:description'), meta(r.body, 'og:description'));
check('…its picture its crafted page\'s share still, made whole on this site, shown large', meta(r.body, 'og:image') === 'https://happyseaurchin.com/animations/the-sea.jpg' && meta(r.body, 'twitter:card') === 'summary_large_image', [meta(r.body, 'og:image'), meta(r.body, 'twitter:card')]);
check('…its address its own, written once, and the crafted page read once, at its path on this site', meta(r.body, 'og:url') === 'https://happyseaurchin.com/proposal/sea' && (head(r.body).match(/og:url/g) || []).length === 1 && siteReads.length === 1 && siteReads[0] === '/the-sea', [meta(r.body, 'og:url'), siteReads]);
siteReads = [];
r = await call({ proposal: 'lab' });
check('a proposal whose page is another site\'s: titled from its spine as the text writes it, its own knots its picture, and the other site never read', titleIn(r.body) === 'The lab' && meta(r.body, 'og:image') === 'https://happyseaurchin.com/proposal/lab/knots' && meta(r.body, 'og:description') === 'A proposal: What an address can do' && siteReads.length === 0, [titleIn(r.body), meta(r.body, 'og:description'), meta(r.body, 'og:image'), siteReads]);
BLOCKS['spine:bare'] = { _: 'THE BARE ONE — a proposal with no steps yet.' };
BLOCKS['function:bare'] = { _: 'THE LAW of bare.', 1: 'mode: document', 7: 'phase: proposal' };
r = await call({ proposal: 'bare' });
check('a proposal with no step to hang knots on and no crafted page: its title and line alone, as a small card', titleIn(r.body) === 'The bare one' && meta(r.body, 'og:image') === undefined && meta(r.body, 'twitter:card') === 'summary' && meta(r.body, 'og:url') === 'https://happyseaurchin.com/proposal/bare', [titleIn(r.body), meta(r.body, 'og:image'), meta(r.body, 'twitter:card')]);
const PLAIN_TITLE = 'Proposals';
r = await call({ proposal: 'kern' });
check('a family that is not a proposal (unlisted, its phase another kind\'s): the page with its plain preview, which says the rest itself, no picture but its title and line as a small card, and no address of its own, so the door and the code card name the one it was opened at', r.code === 200 && titleIn(r.body) === PLAIN_TITLE && meta(r.body, 'og:image') === undefined && meta(r.body, 'twitter:card') === 'summary' && meta(r.body, 'og:url') === undefined, [titleIn(r.body), meta(r.body, 'og:image'), meta(r.body, 'twitter:card'), meta(r.body, 'og:url')]);
r = await call({ proposal: 'nothing-here' });
check('…and a name with no spine the same', r.code === 200 && titleIn(r.body) === PLAIN_TITLE, titleIn(r.body));
r = await call({ proposal: '../etc' });
check('…and a name that is no name the same, the beach never asked', r.code === 200 && titleIn(r.body) === PLAIN_TITLE, titleIn(r.body));
r = await call({ proposal: 'sea' }, 'HEAD');
check('a HEAD answered as a GET', r.code === 200 && /^text\/html/.test(r.headers['Content-Type']), r.headers);

console.log('\n/proposal/<name>/knots: its knots as a picture');
const { inflateSync } = await import('node:zlib');
/* the picture read back: its size, and its pixels, the Sub filter undone */
function pixelsOf(buf) {
  const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20), parts = [];
  for (let o = 8; o < buf.length;) { const n = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8); if (type === 'IDAT') parts.push(buf.slice(o + 8, o + 8 + n)); o += 12 + n; }
  const raw = inflateSync(Buffer.concat(parts)), px = Buffer.alloc(W * H * 3), row = W * 3 + 1;
  for (let y = 0; y < H; y++) for (let i = 0; i < W * 3; i++) { const v = raw[y * row + 1 + i], left = i >= 3 ? px[y * W * 3 + i - 3] : 0; px[y * W * 3 + i] = raw[y * row] === 1 ? (v + left) & 255 : v; }
  return { W, H, px };
}
const count = (pic, rgb) => { let n = 0; for (let i = 0; i < pic.px.length; i += 3) if (Math.abs(pic.px[i] - rgb[0]) < 6 && Math.abs(pic.px[i + 1] - rgb[1]) < 6 && Math.abs(pic.px[i + 2] - rgb[2]) < 6) n++; return n; };
r = await call({ knots: 'lab' });
const isPng = Buffer.isBuffer(r.body) && r.body.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
check('a PNG, 1200 by 630, kept ten minutes at the CDN and served stale for a day', r.code === 200 && r.headers['Content-Type'] === 'image/png' && isPng && r.body.readUInt32BE(16) === 1200 && r.body.readUInt32BE(20) === 630 && /max-age=600, stale-while-revalidate=86400/.test(r.headers['Vercel-CDN-Cache-Control']), [r.code, r.headers]);
const pic = isPng ? pixelsOf(r.body) : null;
check('ann\'s GO at 1.8 is a green knot, and the HOLDS at 4.8 is beside the steps so draws none', pic && count(pic, [0x7F, 0xCB, 0x86]) > 300, pic && count(pic, [0x7F, 0xCB, 0x86]));
check('…bob\'s sealed answer is a knot in the plain grey, its words never read', pic && count(pic, [0x82, 0xA0, 0xA8]) > 300, '');
r = await call({ knots: 'wire' });
check('a family with no step down 1 has no knots: 404, so a crawler shows the title and line alone', r.code === 404, r.code);
r = await call({ knots: '../x' });
check('a name that is no name is refused', r.code === 400, r.code);

down = true;
r = await call({ proposal: 'sea' });
check('a beach that cannot be read still serves the page, its plain preview kept only thirty seconds', r.code === 200 && titleIn(r.body) === PLAIN_TITLE && /max-age=30/.test(r.headers['Vercel-CDN-Cache-Control']) && String(r.body).includes('</html>'), r.headers);
r = await call({ family: 'lab' });
check('a beach that cannot be read is said plainly, 502', r.code === 502 && /could not be read/.test(r.body), r);

console.log(pass ? '\nall good\n' : '\nSOMETHING FAILED\n');
process.exit(pass ? 0 : 1);
