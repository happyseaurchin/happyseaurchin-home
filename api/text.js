/**
 * /api/text — a family on the beach as one plain text, for a person to read or keep and for any AI to fetch:
 * its spine walked down its 1, each step's side-rooms and points, the shared reading wherever one stands,
 * every reader's own lines at the addresses they wrote them, its law, and its room's latest lines.
 *
 *   GET /text/<family>             (vercel.json rewrites it to /api/text?family=<family>)
 *   GET /text/<family>?download    the same, handed over as a file, <family>.md
 *
 * Read live from the beach and kept a minute at the CDN, so a crowd from one shared link costs one read;
 * nothing is stored or written. A sealed line is named as sealed and never shown as its ciphertext, and a
 * file kept whole in a block (a script, a picture) is named with the address it stands at, not poured out.
 * (lane pscale.lab, 20 November 2026, at David's word: 'link to downloadable readable text for LLM and
 * humans who still want to read docs'.)
 */
import { mirrorsOf } from './mirrors.js';

const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const SITE = 'https://happyseaurchin.com';
const LONG = 2400;            // a leaf longer than this, or one that reads as code, is a file: named, not poured out
const ROOM_LINES = 9;

async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`beach ${r.status}`);
  return r.json();
}
const readBlock = (name) => getJSON(`${BEACH}?block=${encodeURIComponent(name)}`);

/* ── reading a block ── */
const DIGITS = '123456789';
function voiceOf(n) { while (n && typeof n === 'object') { if (!('_' in n)) return ''; n = n._; } return typeof n === 'string' ? n.trim() : ''; }
function at(b, path) { let n = b; for (const d of path) { if (!n || typeof n !== 'object') return undefined; n = n[d]; } return n; }
function addr(path) { return path.length ? path[0] + (path.length > 1 ? '.' + path.slice(1).join('') : '') : '0'; }
function sealed(n) { if (!n || typeof n !== 'object') return false; const h = voiceOf(n['9']); return h === 'gray' || /^colou?r\b/i.test(h); }
function split(t) {
  const i = t.indexOf(' — ');
  return i > 0 && /^[^a-z]+$/.test(t.slice(0, i)) ? { title: t.slice(0, i), body: t.slice(i + 3) } : { title: '', body: t };
}
const capFirst = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
/* a title in capitals written as the text itself writes each word mid-sentence (AI, SALT, LEROs), else in lower case */
const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
function learn(texts) {
  const count = new Map();
  for (const t of texts) {
    if (!t) continue;
    for (const m of t.matchAll(WORD)) {
      const before = t.slice(0, m.index).trimEnd();
      if (!before || /[.!?:—(\n"“]$/.test(before)) continue;   // a sentence's first word says nothing of its case
      const k = m[0].toLowerCase(), c = count.get(k) || new Map();
      c.set(m[0], (c.get(m[0]) || 0) + 1);
      count.set(k, c);
    }
  }
  const learnt = new Map();
  for (const [k, c] of count) {
    let best = k, n = c.get(k) || 0;
    for (const [w, m] of c) if (w !== k && m > n) { best = w; n = m; }
    learnt.set(k, best);
  }
  return learnt;
}
function titleOf(t, learnt) {
  let first = true;
  return t.replace(WORD, (w) => {
    let out = learnt.get(w.toLowerCase()) || w.toLowerCase();
    if (first) { out = capFirst(out); first = false; }
    return out;
  });
}
const isFile = (t) => t.length > LONG || /^#!/.test(t) || (/\nimport /.test(t) && /\ndef /.test(t));
const blockUrl = (name) => `${BEACH}?block=${encodeURIComponent(name)}`;
/* one line as a reader receives it, a file named where it stands */
function lineOf(n, block, path) {
  if (sealed(n)) return '(sealed: readable only by those it was sealed for)';
  const t = voiceOf(n);
  if (!t) return '';
  if (isFile(t)) return `[a file of ${t.length.toLocaleString('en-GB')} characters, kept whole at ${block} ${addr(path)}: ${blockUrl(block)}]`;
  return t;
}
const kids = (n) => (n && typeof n === 'object' ? DIGITS.split('').filter((d) => d in n) : []);

/* ── the text ── */
export function compose({ family, spine, law, mirrors = {}, fold = null, room = null, roomName, now }) {
  const out = [];
  const push = (...l) => out.push(...l);
  const hands = Object.keys(mirrors).sort();
  const root = split(voiceOf(spine));
  const lawLine = (d) => voiceOf(at(law, [d]));
  const page = ((lawLine('6').match(/https?:\/\/[^\s,;)]+/) || [])[0] || '').replace(/[.]$/, '');
  const phase = lawLine('7').replace(/^phase:\s*/i, '').split(/[\s—,.]/)[0] || '';
  const mode = ((lawLine('1').match(/^mode:\s*([a-z-]+)/i) || [])[1] || '').toLowerCase();
  const bodies = [];
  (function gather(n, path) {
    if (!n || typeof n !== 'object') { if (typeof n === 'string') bodies.push(split(n).body); return; }
    if (path[path.length - 1] !== '8' && path[path.length - 1] !== '9') bodies.push(split(voiceOf(n)).body);
    for (const d of kids(n)) gather(n[d], path.concat(d));
  })(spine, []);
  const learnt = learn(bodies);
  /* its plain view: a proposal's kinds are drawn at /proposal, a walk, a recipe, a frame or a plain document at /walk */
  const plain = `${SITE}/${phase && !/^(walk|recipe|reference)$/.test(phase) && mode !== 'frame' ? 'proposal' : 'walk'}/${family}`;
  const heading = (s, path) => (s.title ? titleOf(s.title, learnt) : (s.body.split(/[.:;]/)[0] || addr(path)).slice(0, 80));
  const bodyOf = (s) => (s.title ? capFirst(s.body) : s.body);

  push(`# ${root.title ? titleOf(root.title, learnt) : family}`);
  if (root.body) push('', bodyOf(root));
  push('', `This is ${family}, a family on the beach at https://beach.happyseaurchin.com, read live ${now}` +
    (phase ? `; its phase: ${phase}` : '') + '. It is made of its spine (spine:' + family + '), the text everyone reads; ' +
    'its law (function:' + family + '); every reader\'s own lines (' + family + ':<handle>), at the spine\'s addresses; ' +
    'the shared reading (' + family + '), which anyone may make again; and its room (' + roomName + ').' +
    (page ? ` Its page: ${page}.` : '') + ` Drawn plainly: ${plain}. Any of its blocks reads as JSON at ${BEACH}?block=<name>.`);

  /* every reader's lines at a place, and whatever they wrote beneath it that the spine does not hold */
  function readers(path, spineNode) {
    for (const h of hands) {
      const m = at(mirrors[h], path);
      if (m === undefined) continue;
      const block = family + ':' + h, t = lineOf(m, block, path);
      if (t) push(`- **${h}**: ${t}`);
      if (sealed(m)) continue;
      beneath(m, path, spineNode, block, t ? 1 : 0, h);
    }
  }
  function beneath(m, path, spineNode, block, indent, h) {
    for (const d of kids(m)) {
      if (spineNode && typeof spineNode === 'object' && d in spineNode) continue;   // the spine's own place: read there
      const p = path.concat(d), n = m[d], t = lineOf(n, block, p);
      if (t) push(`${'  '.repeat(indent)}- ${indent ? '' : `**${h}** `}${addr(p)}: ${t}`);
      if (!sealed(n)) beneath(n, p, null, block, indent + (t ? 1 : 0), h);
    }
  }
  function shared(path) {
    const t = voiceOf(at(fold, path));
    if (t) push('', `**The shared reading here** (${family} ${addr(path)}, which anyone may make again):`, '', t);
  }
  function point(path, node) {
    const t = voiceOf(node);
    if (!t) return;
    const kind = /^DECIDE\b/.test(t) ? 'Decide' : /^WHERE YOU ARE\b/.test(t) ? 'Where you are' : 'Point';
    push('', `**${kind} · ${addr(path)}** — ${t.replace(/^(DECIDE|WHERE YOU ARE)\s*—\s*/, '')}`);
    shared(path);
    const before = out.length;
    readers(path, node);
    if (out.length === before) push('- (no answers yet)');
  }
  function room_(path, level) {
    const node = at(spine, path), t = voiceOf(node), s = split(t);
    push('', `${'#'.repeat(Math.min(level, 5))} ${heading(s, path)} · ${addr(path)}`);
    if (s.body) push('', bodyOf(s));
    shared(path);
    if (typeof node !== 'object') { readers(path, node); return; }
    readers(path, node);
    for (const d of kids(node)) {
      if (d === '8') point(path.concat(d), node[d]);
      else if (d === '9') { const v = voiceOf(node[d]); if (v) push('', `*State · ${addr(path.concat(d))}:* ${v}`); }
      else room_(path.concat(d), level + 1);
    }
  }

  /* a document's steps run down 1, each with its side-rooms 2 to 7, its point at 8 and its state at 9; a frame's
     regions stand side by side at the root; any other kind (a game, a clock) is read on its page */
  const document_ = mode === 'document' || (!mode && voiceOf(at(spine, ['1'])) !== '');
  if (document_) {
    let path = ['1'];
    while (at(spine, path) !== undefined) {
      const node = at(spine, path), s = split(voiceOf(node));
      push('', `## ${s.title ? titleOf(s.title, learnt) : addr(path)} · ${addr(path)}`);
      if (s.body) push('', bodyOf(s));
      shared(path);
      readers(path, node);
      for (const d of kids(node)) {
        if (d === '1') continue;
        if (d === '8') point(path.concat(d), node[d]);
        else if (d === '9') { const v = voiceOf(node[d]); if (v) push('', `*State · ${addr(path.concat(d))}:* ${v}`); }
        else room_(path.concat(d), 3);
      }
      if (typeof node !== 'object' || !('1' in node)) break;
      path = path.concat('1');
    }
  } else if (mode === 'frame') {
    for (const d of kids(spine)) room_([d], 2);
  } else {
    push('', `Its parts are not a document (its law says ${mode ? 'mode: ' + mode : 'no mode'}), so they are read on its page${page ? ', ' + page : ''}.`);
  }

  /* the root's own side-rooms: where it came from, its page, its provenance */
  const rootRooms = mode === 'frame' ? [] : kids(spine).filter((d) => !(document_ && d === '1'));
  if (rootRooms.length) {
    push('', '## About this family');
    for (const d of rootRooms) {
      const t = voiceOf(spine[d]);
      if (t) push('', t);
    }
  }

  /* the law, one line a position */
  if (law) {
    push('', `## Its law · function:${family}`, '', voiceOf(law));
    for (const d of kids(law)) {
      const n = law[d], t = voiceOf(n);
      if (t) push(`- **${d}** ${t}`);
      for (const e of kids(n)) { const u = voiceOf(n[e]); if (u) push(`  - **${d}.${e}** ${u}`); }
    }
  }

  /* the room's latest lines */
  if (room) {
    const lines = entries(room).sort((a, b) => String(b['3']).localeCompare(String(a['3']))).slice(0, ROOM_LINES);
    push('', `## Its room · ${roomName}`, '', voiceOf(room) || '(no purpose said)');
    if (lines.length) {
      push('', `Its latest ${lines.length === 1 ? 'line' : lines.length + ' lines'}, newest first:`, '');
      for (const e of lines) push(`- ${voiceOf(e['1']) || 'someone'} · ${String(e['3']).slice(0, 10)} — ${sealed(e) ? '(sealed)' : voiceOf(e)}`);
    } else push('', 'Nothing said yet; the room is open.');
  }

  push('', '---', '', `Read live from the beach ${now}; nothing in this text is kept anywhere. ${page ? 'Its page: ' + page + '; drawn' : 'Drawn'} plainly: ${plain}; as text: ${SITE}/text/${family}.`, '');
  return out.join('\n');
}

/* a room's lines, wherever its containers have nested them */
function entries(n, out = []) {
  if (!n || typeof n !== 'object') return out;
  if (n._ && typeof n._ === 'object') entries(n._, out);
  for (const d of DIGITS) {
    const s = n[d];
    if (!s || typeof s !== 'object') continue;
    if (typeof s['3'] === 'string' && ('1' in s)) out.push(s); else entries(s, out);
  }
  return out;
}

/* ── the door ── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).send('GET only');
  const q = req.query || {}, given = String(q.family || ''), family = given.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(family)) return res.status(400).send('not a family name');
  const download = 'download' in q;
  /* one address per family and form, so the CDN's copy is the one everyone gets */
  if (given !== family || Object.keys(q).some((k) => k !== 'family' && k !== 'download')) {
    res.setHeader('Location', '/text/' + family + (download ? '?download' : ''));
    return res.status(308).end();
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const [spine, law, crowd] = await Promise.all([readBlock('spine:' + family), readBlock('function:' + family), mirrorsOf(family)]);
    if (!spine) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Vercel-CDN-Cache-Control', 'max-age=60');
      return res.status(404).send(`No family named ${family} stands on the beach: spine:${family} is not there.\n`);
    }
    const named = (voiceOf(at(law, ['3'])).match(/pool:[a-z0-9][a-z0-9-]*/) || [])[0] || 'pool:' + family;
    const room = await readBlock(named).catch(() => null);
    const n = crowd && crowd.now, now = typeof n === 'string' ? n : (n && (n.voicing ? `${n.voicing} (${n.iso})` : n.iso)) || new Date().toISOString();
    const text = compose({ family, spine, law, mirrors: crowd.mirrors || {}, fold: crowd.fold, room, roomName: named, now });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${family}.md"`);
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=60, stale-while-revalidate=300');
    return res.status(200).send(text);
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(502).send('The beach could not be read just now: ' + String(e && e.message ? e.message : e).slice(0, 200) + '\n');
  }
}
