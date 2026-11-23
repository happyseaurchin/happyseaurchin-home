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
 *
 *   GET /proposal/<name>           (vercel.json rewrites it to /api/text?proposal=<name>)
 *       the proposal's page, proposal.html as it stands, its title and preview saying this proposal: the title its
 *       spine's root gives, the line the proposals list gives it, and its crafted page's own share picture (else
 *       the proposal card), so a link to it, sent anywhere or shared on the String, says what it is before anything
 *       on the page has run (spine:o-page-unit 1.11111111112; lane share-string.1, 23 November 2026). The page is
 *       always served: a name that is no proposal, or a beach that cannot be read in time, gets its plain preview,
 *       and the page says the rest itself.
 *   GET /proposal/<name>/knots     (vercel.json rewrites it to /api/text?knots=<name>)
 *       its knots as a picture, 1200 by 630: the quipu /proposal draws, its spine a cord across, each step a cord
 *       hanging with a dash for each side-room and a knot for every answer, coloured by the word it opens with, an open
 *       ring where a decision waits; a proposal with no crafted page of its own is previewed with it, and one with no
 *       steps has no picture at all, its title and line alone (David, 23 November 2026: 'just a knotted image for
 *       standard proposal if possible, otherwise just the title and blurb').
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
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

  /* a room around the proposal that asks a question of its own at its 8 is read whole, beside the steps, its question a
     point with everyone's answers (function:proposal 3; spine:determinacy 4.8, the two gains); the root's other
     side-rooms are where it came from, its page, its provenance */
  const asks = (d) => { const n = spine[d]; return !!n && typeof n === 'object' && /^DECIDE\b/.test(voiceOf(n['8'])); };
  const rootRooms = mode === 'frame' ? [] : kids(spine).filter((d) => !(document_ && d === '1'));
  if (document_) for (const d of rootRooms) if (asks(d)) room_([d], 2);
  const about = rootRooms.filter((d) => !(document_ && asks(d)));
  if (about.length) {
    push('', '## About this family');
    for (const d of about) {
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

/* ── a proposal's page, saying what it is before it runs ── */
const PLAIN = {
  title: 'Proposals',
  text: "A proposal kept on the beach grows into its project's page: its steps, decisions anyone can answer, a room, and threads that tie the work to it as it begins.",
  image: '', url: ''
};
const KIND = { proposal: 'A proposal', project: 'A project', complete: 'A project, complete', 'set aside': 'A proposal, set aside', inquiry: 'An inquiry', walk: 'A walk', recipe: 'A recipe', explainer: 'An explainer', reference: 'A reference' };
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[\s,;:—–-]+\S*$/, '') + '…' : s; };
const within = (ms, p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('the beach was slow')), ms))]);
function strings(n, out = []) {
  if (typeof n === 'string') out.push(n);
  else if (n && typeof n === 'object') for (const k of Object.keys(n)) strings(n[k], out);
  return out;
}
/* the proposals list's line for a name, '<name> — what · <its page>', read down to the list's floor as /proposal reads it */
export function listLine(list, name) {
  let floor = 1, n = list;
  while (n && typeof n === 'object' && n._ && typeof n._ === 'object') { floor++; n = n._; }
  let found = null;
  (function walk(n, depth) {
    if (found) return;
    if (depth === floor) {
      const m = /^\s*([a-z0-9][a-z0-9-]*)\s*—\s*([\s\S]*?)(?:\s*·\s*(\S+))?\s*$/i.exec(voiceOf(n) || (typeof n === 'string' ? n : ''));
      if (m && m[1].toLowerCase() === name) found = { what: m[2].trim(), page: m[3] ? (/^https?:/.test(m[3]) ? m[3] : 'https://' + m[3]) : '' };
      return;
    }
    if (!n || typeof n !== 'object') return;
    if (n._ && typeof n._ === 'object') walk(n._, depth + 1);
    for (const d of DIGITS) if (n[d] != null) walk(n[d], depth + 1);
  })(list, 0);
  return found;
}
/* a maker's own line for a name, in the order listed.js reads the lists, the earliest made first: a line in any
   proposed:<handle> lists a proposal as the keeper's list does (function:proposal 7 and 8, 23 Nov 2026) */
async function makersLine(name) {
  const got = await mirrorsOf('proposed');
  const lists = (got && got.mirrors) || {}, born = (got && got.born) || {};
  const hands = Object.keys(lists).sort((a, b) => { const x = String(born[a] || ''), y = String(born[b] || ''); return x < y ? -1 : x > y ? 1 : a.localeCompare(b); });
  for (const h of hands) { const l = listLine(lists[h], name); if (l) return Object.assign(l, { by: h }); }
  return null;
}
/* what a proposal says of itself, from its spine, its law and its line on the list (the keeper's, else the one given
   from a maker's own); null where it is no proposal */
export function proposalCard(name, spine, law, list, line) {
  if (!spine || typeof spine !== 'object') return null;
  const listed = listLine(list, name) || line || null;
  const phase = ((voiceOf(at(law, ['7'])).match(/^phase:\s*(set aside|[a-z]+)/i) || [])[1] || '').toLowerCase();
  /* only what /proposal draws: one on the list, or one whose law names a phase of the form's own (function:proposal 6);
     any other name the page says plainly is not one, so its preview is the plain one */
  if (!listed && !/^(proposal|project|complete|set aside|inquiry)$/.test(phase)) return null;
  const root = split(voiceOf(spine));
  const title = clip(root.title ? titleOf(root.title, learn(strings(spine).map((t) => split(t).body))) : name, 110);   /* cased as the words beneath the titles write them, as compose does */
  const own = (listed && listed.what.split(/;\s/)[0]) || root.body;
  const label = KIND[phase] || 'A proposal';
  const text = clip(label + ': ' + capFirst(own), 300);
  const lawPage = ((voiceOf(at(law, ['6'])).match(/page:\s*(https?:\/\/[^\s,;)]+)/i) || [])[1] || '').replace(/[.]$/, '');
  const root2 = voiceOf(at(spine, ['2']));
  const page = lawPage || (/^THE PAGE\b/i.test(root2) ? ((root2.match(/https?:\/\/[^\s,;)]+/) || [''])[0].replace(/[.]$/, '')) : '') || (listed && listed.page) || '';
  return { title, text, page, url: SITE + '/proposal/' + name };
}
/* the title and share picture a page of this site gives, read from its head as a crawler reads it; another site's page is
   never read */
export async function headOf(page) {
  let u;
  try { u = new URL(page); } catch (e) { return {}; }
  if (!/^(www\.)?happyseaurchin\.com$/i.test(u.hostname) || /^\/proposals?(\/|$)/.test(u.pathname)) return {};
  const r = await fetch(SITE + u.pathname, { headers: { Accept: 'text/html' } });
  if (!r.ok) return {};
  const head = (await r.text()).slice(0, 400000).split(/<\/head>/i)[0];
  const meta = {};
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    const a = {};
    for (const m of tag.matchAll(/([a-z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) a[m[1].toLowerCase()] = m[2] != null ? m[2] : m[3];
    const k = (a.property || a.name || '').toLowerCase();
    if (k && a.content && !(k in meta)) meta[k] = a.content;
  }
  const ent = (t) => String(t || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const src = meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image'] || meta['twitter:image:src'] || '';
  let image = '';
  try { const img = new URL(ent(src), SITE + u.pathname); if (src && img.protocol === 'https:') image = img.href; } catch (e) {}
  return { title: clip(ent(meta['og:title'] || meta['twitter:title'] || ''), 110), image };
}
export function withProposalPreview(html, p) {
  const q = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const set = (attr, key, value) => { html = html.replace(new RegExp('<meta ' + attr + '="' + key + '" content="[^"]*">'), () => '<meta ' + attr + '="' + key + '" content="' + q(value) + '">'); };
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + q(p.title) + '</title>');
  set('name', 'description', p.text);
  set('property', 'og:title', p.title);
  set('property', 'og:description', p.text);
  /* a picture only where it has one: its crafted page's still or its own knots, shown large; with none, its title and
     line alone, as a small card. Its own address only where the preview is its own: the door and the code card take
     og:url as the page's address, so the plain preview, served for any name, names none, and they read the address
     the page was opened at */
  const more = (p.image ? '\n<meta property="og:image" content="' + q(p.image) + '">' : '') + (p.url ? '\n<meta property="og:url" content="' + q(p.url) + '">' : '');
  if (more) html = html.replace(/<meta property="og:description" content="[^"]*">/, (m) => m + more);
  set('name', 'twitter:card', p.image ? 'summary_large_image' : 'summary');
  return html;
}

/* ── a proposal's knots, as a picture (the quipu /proposal draws, quipuSVG, at a link's preview size) ── */
const FORM_KINDS = { 'GO': 'go', 'NOT YET': 'wait', 'CHANGE': 'change' }, OWN_KINDS = ['c1', 'c2', 'c3', 'c4'];
const TOK = "[A-Z][A-Z’']*(?: [A-Z][A-Z’']*)*";
const CLOSING = new RegExp('(?:^|\\s)(' + TOK + '(?:, ' + TOK + ')*,? or ' + TOK + ')\\.?\\s*$');
/* the words a decision is answered in, as the page reads them: its own where it closes on them, else the form's three */
export function wordsOf(text) {
  const body = String(text).replace(/^DECIDE\s*[—–:-]\s*/i, '').trim(), m = CLOSING.exec(body);
  const tokens = m ? m[1].split(/,\s*|\s+or\s+/).map((t) => t.trim()).filter(Boolean) : ['GO', 'NOT YET', 'CHANGE'];
  let n = 0;
  return tokens.map((t) => [t, FORM_KINDS[t] || OWN_KINDS[(n++) % OWN_KINDS.length]]);
}
/* every mirror's answer at one decision, each a knot coloured by the word it opens with, in the order the words are offered */
function answersTo(mirrors, path, words) {
  const re = new RegExp('^(' + words.map((w) => w[0].replace(/ /g, '\\s+')).join('|') + ')\\b', 'i'), out = [];
  for (const h of Object.keys(mirrors || {})) {
    const t = voiceOf(at(mirrors[h], path));
    if (!t) continue;
    const m = re.exec(t), token = m ? m[1].toUpperCase().replace(/\s+/g, ' ') : '', i = words.findIndex((w) => w[0] === token);
    out.push({ kind: i < 0 ? 'none' : words[i][1], rank: i < 0 ? 99 : i });
  }
  return out.sort((a, b) => a.rank - b.rank);
}
/* the steps down 1, as the page walks them (twelve at most): each its decision's knots and its side-rooms', null where none is asked */
export function knotsOf(spine, mirrors) {
  const steps = [];
  let node = spine && spine['1'], path = ['1'];
  while (node != null && steps.length < 12) {
    const step = { main: null, rooms: [] };
    if (typeof node === 'object') {
      const d8 = voiceOf(node['8']);
      if (/^DECIDE\b/i.test(d8)) step.main = answersTo(mirrors, path.concat('8'), wordsOf(d8));
      for (const k of '234567') {
        const r = node[k];
        if (r == null) continue;
        const rd = typeof r === 'object' ? voiceOf(r['8']) : '';
        step.rooms.push(/^DECIDE\b/i.test(rd) ? answersTo(mirrors, path.concat(k, '8'), wordsOf(rd)) : null);
      }
    }
    steps.push(step);
    if (typeof node !== 'object') break;
    node = node['1']; path = path.concat('1');
  }
  return steps;
}
/* the page's own colours in the dark (theme.css and proposal.html), the night water the share stills stand on */
const RGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const INK = { cord: RGB('#C4DBDF'), dim: RGB('#82A0A8'), abyss: RGB('#06171E'), go: RGB('#7FCB86'), wait: RGB('#E7B24C'), change: RGB('#B79CF0'),
  none: RGB('#82A0A8'), c1: RGB('#33C2D2'), c2: RGB('#8FB8F0'), c3: RGB('#F0A06A'), c4: RGB('#C8D86A') };
/* where every mark goes, the cord at y 0: a step a column, a dash for each side-room, a gap, its knots, the tassel; a
   side-room's decision on a cord of its own beside it. k scales every length down the cords. */
function layoutKnots(steps, W, k) {
  const marks = [], n = Math.max(1, steps.length), padL = 70, col = (W - 2 * padL) / n;
  const r = Math.min(col * 0.36, Math.max(4.6, Math.min(9.2, col / 7)) * k), space = 2 * r + 6 * k, rw = Math.min(20, col * 0.55);
  let maxY = 60;
  function knots(x, y, answers, rr, sp) {
    if (!answers.length) { marks.push({ t: 'ring', x, y: y + rr, r: rr, w: 2.8, c: INK.dim, a: 1 }); return y + 2 * rr + 6 * k; }
    let prev = null;
    for (const a of answers) {
      if (prev !== null && a.kind !== prev) y += 6 * k;
      marks.push({ t: 'disc', x, y: y + rr, r: rr, c: INK[a.kind] || INK.none, a: 1 });
      y += sp; prev = a.kind;
    }
    return y;
  }
  steps.forEach((s, i) => {
    const x = Math.round(padL + col * (i + 0.5)), cell = [];
    let y = 18 * k;
    const subs = [];
    for (const rm of s.rooms) {
      cell.push({ t: 'cap', x1: x - rw / 2 + 3.4, y1: y + 3.4, x2: x + rw / 2 - 3.4, y2: y + 3.4, w: 6.8, c: INK.dim, a: 0.75 });
      if (rm) subs.push({ y: y + 3.4, answers: rm });
      y += 14 * k;
    }
    const at0 = marks.length;
    if (s.main) { y += 16 * k; y = knots(x, y, s.main, r, space); }
    const knotMarks = marks.splice(at0);
    const yEnd = y + 32 * k;
    marks.push({ t: 'cap', x1: x, y1: 0, x2: x, y2: yEnd, w: 4, c: INK.dim, a: 1 }, { t: 'disc', x, y: yEnd, r: 4.8, c: INK.dim, a: 1 }, ...cell, ...knotMarks);
    subs.forEach((sb, j) => {
      const dir = j % 2 ? -1 : 1, sx = x + Math.round(Math.min(col * 0.44, Math.max(r * 2 + 8, 26 + 12 * Math.floor(j / 2)))) * dir;   /* clear of the step's own knots */
      for (let t = 0; t < 8; t++) {
        const q = (u) => [(1 - u) * (1 - u) * x + 2 * (1 - u) * u * sx + u * u * sx, (1 - u) * (1 - u) * sb.y + 2 * (1 - u) * u * (sb.y + 8 * k) + u * u * (sb.y + 28 * k)];
        const [ax, ay] = q(t / 8), [bx, by] = q((t + 1) / 8);
        marks.push({ t: 'cap', x1: ax, y1: ay, x2: bx, y2: by, w: 2.8, c: INK.dim, a: 0.9 });
      }
      const at1 = marks.length, ky = knots(sx, sb.y + 36 * k, sb.answers, Math.max(4.2, r - 1.6 * k), space - 2.4 * k), km = marks.splice(at1), se = ky + 16 * k;
      marks.push({ t: 'cap', x1: sx, y1: sb.y + 28 * k, x2: sx, y2: se, w: 2.8, c: INK.dim, a: 0.9 }, ...km, { t: 'disc', x: sx, y: se, r: 3.6, c: INK.dim, a: 1 });
      maxY = Math.max(maxY, se + 8);
    });
    maxY = Math.max(maxY, yEnd + 10);
  });
  return { marks, maxY };
}
/* every mark laid on the night water with soft edges, as a 1200 by 630 picture, encoded as a PNG with nothing but node */
export function drawKnots(steps) {
  const W = 1200, H = 630, room = H - 150;
  let k = 1.6, lay = layoutKnots(steps, W, k);
  while (lay.maxY > room && k > 0.3) { k -= 0.05; lay = layoutKnots(steps, W, k); }
  const cordY = Math.round(Math.max(72, (H - Math.min(lay.maxY, room)) / 2 - 24)), px = new Float32Array(W * H * 3);
  const stops = [[0, RGB('#0F2E38')], [0.45, RGB('#0A2129')], [1, RGB('#06171E')]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W * 0.18) / (W * 1.2), dy = y / (H * 1.4), t = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    const [t0, c0] = t < 0.45 ? stops[0] : stops[1], [t1, c1] = t < 0.45 ? stops[1] : stops[2], u = (t - t0) / (t1 - t0), i = (y * W + x) * 3;
    px[i] = c0[0] + (c1[0] - c0[0]) * u; px[i + 1] = c0[1] + (c1[1] - c0[1]) * u; px[i + 2] = c0[2] + (c1[2] - c0[2]) * u;
  }
  function paint(x0, y0, x1, y1, cover, c, a) {
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) {
      const v = cover(x + 0.5, y + 0.5) * a;
      if (v <= 0) continue;
      const i = (y * W + x) * 3, f = Math.min(1, v);
      px[i] += (c[0] - px[i]) * f; px[i + 1] += (c[1] - px[i + 1]) * f; px[i + 2] += (c[2] - px[i + 2]) * f;
    }
  }
  const disc = (cx, cy, r, c, a) => paint(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, (x, y) => r + 0.5 - Math.hypot(x - cx, y - cy), c, a);
  function cap(x1, y1, x2, y2, w, c, a) {
    const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1, h = w / 2;
    paint(Math.min(x1, x2) - h - 1, Math.min(y1, y2) - h - 1, Math.max(x1, x2) + h + 1, Math.max(y1, y2) + h + 1, (x, y) => {
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L));
      return h + 0.5 - Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
    }, c, a);
  }
  function ring(cx, cy, r, w, c, a) {
    paint(cx - r - w, cy - r - w, cx + r + w, cy + r + w, (x, y) => {
      const d = Math.hypot(x - cx, y - cy), s = (Math.atan2(y - cy, x - cx) + Math.PI) * r;
      return s % 8.8 < 4.8 ? w / 2 + 0.5 - Math.abs(d - r) : 0;
    }, c, a);
  }
  cap(36, cordY, W - 36, cordY, 9, INK.cord, 1);
  for (let x = 46; x < W - 46; x += 14) cap(x, cordY, x + 4, cordY, 2.6, INK.abyss, 0.55);
  disc(36, cordY, 10, INK.cord, 1);
  for (const m of lay.marks) {
    if (m.t === 'cap') cap(m.x1, cordY + m.y1, m.x2, cordY + m.y2, m.w, m.c, m.a);
    else if (m.t === 'disc') disc(m.x, cordY + m.y, m.r, m.c, m.a);
    else ring(m.x, cordY + m.y, m.r, m.w, m.c, m.a);
  }
  return png(W, H, px);
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function png(W, H, px) {
  const row = W * 3 + 1, raw = Buffer.alloc(row * H);
  for (let y = 0; y < H; y++) {
    raw[y * row] = 1;   /* each row as its difference from the pixel to its left (the Sub filter), which the night water's gradient packs small */
    for (let i = 0; i < W * 3; i++) {
      const v = Math.round(px[y * W * 3 + i]), left = i >= 3 ? Math.round(px[y * W * 3 + i - 3]) : 0;
      raw[y * row + 1 + i] = (v - left) & 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4);
    len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
/* the picture at its address: a family with no spine, or no step down 1, has none (404), and a crawler shows the title and
   line alone; mirrors that cannot be read draw the cords with every ring still open */
async function knotsPicture(res, given) {
  const name = given.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) return res.status(400).send('not a family name');
  try {
    const [spine, crowd] = await Promise.all([within(3500, readBlock('spine:' + name)), within(3500, mirrorsOf(name)).catch(() => ({ mirrors: {} }))]);
    if (!spine || spine['1'] == null) { res.setHeader('Vercel-CDN-Cache-Control', 'max-age=300'); return res.status(404).send('no knots: spine:' + name + ' has no steps'); }
    const pic = drawKnots(knotsOf(spine, crowd.mirrors || {}));
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=600, stale-while-revalidate=86400');
    return res.status(200).send(pic);
  } catch (e) {
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=30');
    return res.status(502).send('the beach could not be read just now');
  }
}
async function proposalPage(res, given) {
  let html;
  try { html = readFileSync(join(process.cwd(), 'proposal.html'), 'utf8'); }
  catch (e) { return res.status(500).send('the page could not be read'); }
  const name = given.trim().toLowerCase();
  let p = null, cached = 'max-age=600, stale-while-revalidate=86400';
  if (/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) {
    try {
      const [spine, law, list] = await within(3500, Promise.all([readBlock('spine:' + name), readBlock('function:' + name), readBlock('proposals').catch(() => null)]));
      const line = spine && !listLine(list, name) ? await within(2000, makersLine(name)).catch(() => null) : null;
      const c = proposalCard(name, spine, law, list, line);
      /* its crafted page's own title and picture where it has one: the name its maker gave it, and its share still; else
         its own knots, where it has a step to hang them on; else no picture, its title and line alone */
      const h = c && c.page ? await within(2500, headOf(c.page)).catch(() => ({})) : {};
      if (c) p = Object.assign(c, { title: h.title || c.title, image: h.image || (spine['1'] != null ? SITE + '/proposal/' + name + '/knots' : '') });
    } catch (e) { cached = 'max-age=30'; }
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Vercel-CDN-Cache-Control', cached);
  return res.status(200).send(withProposalPreview(html, p || PLAIN));
}

/* ── the door ── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).send('GET only');   // a HEAD is answered as a GET, its body never sent
  if ((req.query || {}).proposal != null) return proposalPage(res, String(req.query.proposal));
  if ((req.query || {}).knots != null) return knotsPicture(res, String(req.query.knots));
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
