#!/usr/bin/env node
// film-the-room.mjs — the observer's seat at a table, and the film of a room.
//
// Three verbs, one convention (ways:stills at the beach): a picture leaves a scene as a LINK,
// never as bytes on the beach, and every picture stands in its MAKER's own book — gallery:<handle>,
// one entry per still: the caption, 1 the maker, 2 the address it renders (pool:<room>:<slot> for a
// moment of play), 3 when, 4 the link. The room's pictures are a VIEW across every book at the
// table, by address; nothing is copied. A character's book holds the FACE — the photograph a
// player gave (2 = passport:<handle>:3, the address of their look) — and every still of them is
// rendered against it, so the person at the table recognises themselves in the film. The film
// itself is one more entry in the cutter's book, addressed to the room (pool:<room>).
//
//   faces  — put a player's photograph at the sink and open their book with it
//   watch  — follow a room: each new moment becomes a still (and, if asked, a clip) on YOUR key
//   film   — read the room's book in beat order and cut the film: stills with a slow move,
//            or clips, captions burned in, narration read aloud; then a YouTube link is the
//            one entry the room keeps of it
//
//   node scripts/film-the-room.mjs faces --world brackenfoot-open --photo Ugarth=./ugarth.jpg
//   node scripts/film-the-room.mjs watch --world brackenfoot-open [--room 211] [--every 20] [--clips]
//   node scripts/film-the-room.mjs film  --world brackenfoot-open [--room 211] --out film.mp4
//                                        [--mode stills|clips] [--seconds 7] [--narrate] [--dry-run]
//   node scripts/film-the-room.mjs keep  --handle "Mark Beall" [--world brackenfoot-open]
//
// Without --room, watch follows EVERY room at the table (a party moves by WAY) and film cuts every
// room in the order the moments were played. A key is pasted once into .env.observer beside this
// repo (HIGGSFIELD_API_KEY=id:secret, or GEMINI_API_KEY=…, or OPENAI_API_KEY=…; AGENT=<your name>)
// and never committed. The one-command evening:
//   node scripts/film-the-room.mjs watch --world <table> --clips      (leave it running while they play)
//   node scripts/film-the-room.mjs film  --world <table> --mode clips --narrate --out tonight.mp4
//
// Keys (yours, your spend — each is optional; the first present is used, in this order):
//   HIGGSFIELD_API_KEY   "id:secret" — stills via HF_IMAGE_ENDPOINT (default xai/grok-imagine-image-2.0,
//                        takes reference faces), clips via HF_VIDEO_ENDPOINT (default
//                        minimax/hailuo-2.3/standard/image-to-video; or higgsfield/cinema-studio/4.0)
//   GEMINI_API_KEY       stills via the Interactions API (GEMINI_IMAGE_MODEL, default gemini-3.1-flash-image,
//                        takes reference faces); clips via Veo (VEO_MODEL, default veo-3.1-fast-generate-preview)
//   OPENAI_API_KEY       stills via images/edits (OPENAI_IMAGE_MODEL, default gpt-image-1, takes reference
//                        faces); narration via audio/speech (gpt-4o-mini-tts)
//   none                 stills via the free service (no faces); film in stills mode still cuts
//
// Needs Node 18+ and ffmpeg on the PATH (FFMPEG=... to point at one). Captions are drawn by a
// small Swift program on a Mac (swift on the PATH); elsewhere they are written as a .srt beside
// the film. Dependency-free otherwise: the beach is plain CORS HTTP.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

const APEX = process.env.BEACH || 'https://beach.happyseaurchin.com';
const SINK_URL = process.env.SINK_URL || 'https://wnprucjylftyktxprogp.supabase.co';
const SINK_KEY = process.env.SINK_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducHJ1Y2p5bGZ0eWt0eHByb2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMzk5ODMsImV4cCI6MjA2MjYxNTk4M30.bovkEN7DJ0OQ0nx0qkcy0ounaEB7aIaB-ldpSgKqCPE';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || (FFMPEG.endsWith('ffmpeg') ? FFMPEG.slice(0, -6) + 'ffprobe' : 'ffprobe');
const AGENT = process.env.AGENT || 'observer';
const DEFAULT_STYLE = 'a photorealistic film still. Dark-ages plain and weather-worn: wool, leather, mud, wet stone, rope and thatch. Low natural light — dusk, firelight, overcast. Documentary framing at eye level, one quiet unsettling detail. No text or lettering, no modern objects, nothing overtly fantastical.';

// ── a key pasted once: .env.observer beside this script or in the working directory (KEY=value lines,
// never committed) is read into the environment for anything not already set there ──
for (const f of [path.join(process.cwd(), '.env.observer'), path.join(path.dirname(new URL(import.meta.url).pathname), '..', '.env.observer')]) {
  try { for (const line of fs.readFileSync(f, 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); } } catch { /* none here */ }
}

// ── arguments ──
const [, , VERB, ...rest] = process.argv;
const ARGS = { photo: [] };
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2), v = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
  if (k === 'photo') ARGS.photo.push(v); else ARGS[k] = v;
}
const DRY = !!ARGS['dry-run'];
const log = (...a) => console.error(...a);

if (!VERB || !/^(faces|watch|film|keep)$/.test(VERB) || (!ARGS.world && VERB !== 'keep')) {
  log(`usage:\n  film-the-room.mjs faces --world <table> --photo <Handle>=<file.jpg> [--photo ...]\n  film-the-room.mjs watch --world <table> [--room <address> | all] [--every 20] [--clips] [--dry-run]\n  film-the-room.mjs film  --world <table> [--room <address> | all] [--out film.mp4] [--mode stills|clips] [--seconds 7] [--narrate] [--dry-run]\n  film-the-room.mjs keep  --handle <name> [--world <table>] [--dry-run]     (BOOK_SECRET=… when the book is locked)`);
  process.exit(2);
}

// ── the beach: reads are open, writes append ──
const wk = origin => origin.replace(/\/+$/, '') + '/.well-known/pscale-beach';
async function readBlock(origin, name) {
  const r = await fetch(wk(origin) + '?block=' + encodeURIComponent(name), { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`read ${name} at ${origin}: HTTP ${r.status}`);
  return r.json();
}
async function readIndex(origin) {
  const r = await fetch(wk(origin), { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!r.ok) throw new Error(`index ${origin}: HTTP ${r.status}`);
  return r.json();
}
async function post(origin, body) {
  const r = await fetch(wk(origin), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  let d = null; try { d = await r.json(); } catch { /* not json */ }
  if (!r.ok) throw new Error(`write ${body.block} at ${origin}: HTTP ${r.status} ${JSON.stringify(d).slice(0, 300)}`);
  return d;
}
async function ensureBook(origin, name, purpose) {
  if (await readBlock(origin, name)) return false;
  await post(origin, { block: name, content: { _: purpose } });
  return true;
}
async function appendEntry(origin, book, entry) {
  return post(origin, { block: book, content: entry, append: true });
}

// a link names a WORLD, never an origin — the pages' resolver, as it stands in group.html
const BARE_NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
const TABLE_PATH = /^\/w\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
function beachFamily() { const h = new URL(APEX).host; return h.startsWith('beach.') ? h : 'beach.' + h; }
function worldToBeach(world) {
  const w = String(world || '').trim().replace(/\/+$/, '');
  if (!w) return null;
  if (BARE_NAME.test(w)) return 'https://' + w + '.' + beachFamily();
  let u; try { u = new URL(w); } catch { return null; }
  const path_ = u.pathname.replace(/\/+$/, '');
  return TABLE_PATH.test(path_) ? u.origin + path_ : u.origin;
}
function digitKeys(node) { return node && typeof node === 'object' ? Object.keys(node).filter(k => /^[1-9]$/.test(k)).sort((a, b) => a - b) : []; }
function registerRoutes(node) {
  const out = new Map();
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n._ && typeof n._ === 'object') walk(n._);
    for (const k of digitKeys(n)) {
      const v = n[k];
      if (typeof v === 'string') { const p = v.split('→'); if (p.length >= 2 && p[0].trim() && p[1].trim()) out.set(p[0].trim().toLowerCase(), p[1].trim()); }
      else walk(v);
    }
  })(node);
  return out;
}
function routeToBeach(route) {
  const r = String(route || '').trim().replace(/\/+$/, '');
  if (!r) return null;
  if (r.startsWith('/')) return TABLE_PATH.test(r) ? APEX + r : null;
  try { const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(r) ? r : 'https://' + r); return u.origin; } catch { return null; }
}
async function resolveWorld(world) {
  const w = String(world || '').trim().replace(/\/+$/, '');
  if (!BARE_NAME.test(w)) return worldToBeach(w);
  const name = w.toLowerCase();
  try { const reg = await readBlock(APEX, 'worlds'); const route = reg && registerRoutes(reg).get(name); const b = route ? routeToBeach(route) : null; if (b) return b; } catch { /* the law continues */ }
  try { const r = await fetch(wk(APEX + '/w/' + name), { headers: { Accept: 'application/json' } }); if (r.ok) { const idx = await r.json(); if (idx && Array.isArray(idx.blocks) && idx.blocks.length) return APEX + '/w/' + name; } } catch { /* fall through */ }
  return worldToBeach(w);
}

// ── the record: beats of a pool, entries of a book ──
const voiceOf = n => { while (n && typeof n === 'object') { if (!('_' in n)) return null; n = n._; } return typeof n === 'string' ? n : null; };
const fieldOf = (e, k) => (e && typeof e === 'object' && typeof e[k] === 'string') ? e[k] : '';
const isEntry = n => !!(n && typeof n === 'object' && typeof n._ === 'string' && typeof n['1'] === 'string');
function slottedEntries(block) {
  const out = [];
  (function walk(node, p) {
    if (!node || typeof node !== 'object') return;
    if (node._ && typeof node._ === 'object') walk(node._, p + '0');
    for (const d of digitKeys(node)) { const n = node[d]; if (isEntry(n)) out.push({ slot: (p + d).replace(/^0+/, ''), entry: n }); else walk(n, p + d); }
  })(block, '');
  return out;
}
const slotKey = s => { s = String(s || ''); return [s.length, s]; };
const slotCmp = (a, b) => { const x = slotKey(a), y = slotKey(b); return x[0] !== y[0] ? x[0] - y[0] : (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0); };
const isWayLine = l => /^\s*WAY\b/.test(l) || /^\s*way\s*[:\-—]?\s*(?:to\s+)?(?:pool:)?\[?\d+(?:\.\d+)?\]?\s*\.?\s*$/i.test(l);
const shownText = t => String(t || '').split('\n').filter(l => !isWayLine(l)).join('\n').trim();
// a MOMENT is a resolved beat — the telling the room's law wove (it names whom it wove at 5, or
// carries a WAY line), or the room's opening telling at slot 1; a player's own staged line, kept
// beside it in the record, is not a picture
const isMoment = x => x.slot === '1' || !!fieldOf(x.entry, '5') || /(^|\n)\s*WAY\b/.test(voiceOf(x.entry) || '');
function beatsOf(pool) {
  const all = slottedEntries(pool), moments = all.filter(isMoment);
  return (moments.length ? moments : all)
    .map(x => ({ slot: x.slot, text: shownText(voiceOf(x.entry)), who: fieldOf(x.entry, '1'), ts: fieldOf(x.entry, '3'), woven: fieldOf(x.entry, '5') }))
    .filter(b => b.text && b.who)
    .sort((a, b) => slotCmp(a.slot, b.slot));
}
function stillsOf(book) {
  return slottedEntries(book)
    .map(x => ({ slot: x.slot, caption: voiceOf(x.entry) || '', who: fieldOf(x.entry, '1'), at: fieldOf(x.entry, '2'), ts: fieldOf(x.entry, '3'), url: fieldOf(x.entry, '4') }))
    .filter(s => /^https?:\/\//.test(s.url));
}
const isVideoLink = u => /youtube\.com\/|youtu\.be\/|vimeo\.com\/|\.(mp4|webm|mov)(\?|$)/i.test(u);

// the look at passport 3, without the Location clause the mechanics keep there
const lookOf = pp => (pp && typeof pp['3'] === 'string' ? pp['3'] : voiceOf(pp && pp['3']) || '').replace(/\s*Location:\s*\*:\S+/i, '').trim();

// field 2 is a LOCAL address when the book stands at the surface it pictures, or a full REFERENCE
// (*:<origin>:<block>:<address>, the star optional) when the book stands elsewhere — the apex is a
// maker's home, and a book there addresses out to the tables it pictures
function refOf(at) {
  const s = String(at || '').replace(/^\*:/, '');
  const m = s.match(/^(https?:\/\/\S+?):([a-z][a-z0-9_ .:-]*)$/i);
  return m ? { origin: m[1].replace(/\/+$/, ''), local: m[2] } : { origin: '', local: s };
}
// every picture-book at a surface — each maker's own; the room's pictures are a VIEW across them
async function booksAt(origin) {
  const idx = await readIndex(origin).catch(() => ({ blocks: [] }));
  const names = (idx.blocks || []).filter(b => b.startsWith('gallery:'));
  const books = await Promise.all(names.map(async n => [n, await readBlock(origin, n).catch(() => null)]));
  return books.filter(([, b]) => b);
}
// the books at the table and at the apex, read once; a room's pictures filtered from them — the books at the
// table by local address, the books at the apex by a reference naming this table
async function loadBooks(origin) {
  const here = origin.replace(/\/+$/, '');
  return { here, table: await booksAt(here), apex: here === APEX ? [] : await booksAt(APEX) };
}
function roomStillsFrom(books, room) {
  const isRoom = local => local === `pool:${room}` || local.startsWith(`pool:${room}:`), out = [];
  for (const [name, book] of books.table) for (const s of stillsOf(book)) { const ref = refOf(s.at); if ((!ref.origin || ref.origin === books.here) && isRoom(ref.local)) out.push({ ...s, at: ref.local, book: name }); }
  for (const [name, book] of books.apex) for (const s of stillsOf(book)) { const ref = refOf(s.at); if (ref.origin === books.here && isRoom(ref.local)) out.push({ ...s, at: ref.local, book: name, home: APEX }); }
  return out;
}
async function stillsAt(origin, room) { return roomStillsFrom(await loadBooks(origin), room); }
// every room at a table — the pools the table's index lists
async function roomsAt(origin) { const idx = await readIndex(origin); return (idx.blocks || []).filter(b => /^pool:\d+(\.\d+)?$/.test(b)).map(b => b.slice(5)).sort(slotCmp); }
// the cost log — one line per generation, the estimate asked before the call where the maker offers one,
// a known rate otherwise (approximate; the invoice is the truth), and a running total
const RATES = { 'gemini-3.1-flash-image': 0.101, 'gemini-3-pro-image': 0.134, 'gpt-image-1': 0.07, 'veo-3.1-fast-generate-preview': 0.10, 'veo-3.1-generate-preview': 0.40, 'veo-3.1-lite-generate-preview': 0.05 };
const costFile = () => path.join(WORK, 'cost.jsonl');
function logCost(entry) { try { fs.appendFileSync(costFile(), JSON.stringify({ t: new Date().toISOString(), ...entry }) + '\n'); } catch { /* the log is a courtesy */ } }
function costTotal() { try { return fs.readFileSync(costFile(), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)).reduce((s, e) => s + (Number(e.usd) || 0), 0); } catch { return 0; } }
// the faces: gallery:<handle>'s entry at the address of the look — the photograph the player gave
async function facesOf(origin, handles) {
  const out = {};
  for (const h of handles) {
    const book = await readBlock(origin, 'gallery:' + h).catch(() => null);
    const face = book && stillsOf(book).filter(s => s.at === `passport:${h}:3`).pop();
    if (face) out[h] = face.url;
  }
  return out;
}
// the place: the table's keeper names where it is placed (keeper:scene 3, PLACING: *:<origin>:spatial:<world>:<address>);
// the room's own line in that register, with its parent's, is the picture's setting — read once per room
function starRef(s) { const m = String(s || '').match(/\*:(https?:\/\/\S+?):((?:[a-z][a-z0-9_-]*:)*[a-z][a-z0-9_-]*):([0-9.]+)\s*$/i); return m ? { origin: m[1], block: m[2], addr: m[3] } : null; }
function linesTo(block, addr) {
  const lines = [], digits = String(addr).replace('.', '').split('');
  let node = block;
  for (const d of digits) {
    let next = node && node[d];
    if (next === undefined && node && node._ && typeof node._ === 'object') { node = node._; next = node[d]; }
    if (next === undefined) break;
    node = next;
    const v = voiceOf(node); if (v) lines.push(v);
  }
  return lines;
}
async function placeOf(origin, room) {
  try {
    const keeper = await readBlock(origin, 'keeper:scene');
    const ref = starRef(keeper && (typeof keeper['3'] === 'string' ? keeper['3'] : voiceOf(keeper['3'])));
    if (!ref) return '';
    const register = await readBlock(ref.origin, ref.block);
    const lines = linesTo(register, room || ref.addr);
    return lines.slice(-2).join(' ').slice(0, 600);
  } catch { return ''; }
}
// who is in the moment: the speaker, the handles it wove, and every character named in its text
function castOf(beat, handles) {
  const named = new Set([beat.who, ...String(beat.woven || '').split(/[,\s]+/)].filter(Boolean));
  for (const h of handles) if (new RegExp('\\b' + h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(beat.text)) named.add(h);
  return handles.filter(h => [...named].some(n => n.toLowerCase() === h.toLowerCase()));
}
function composeShot(beat, cast, looks, style, place) {
  const who = cast.map(h => `${h}: ${looks[h] || 'as described'}`).join(' · ');
  return [
    beat.text.length > 1100 ? beat.text.slice(0, 1100) + '…' : beat.text,
    place ? `The place — ${place}` : '',
    cast.length ? `In frame — ${who}.` : '',
    `The picture is ${style}`,
    cast.length ? 'Each person shown must have the face of their reference photograph, exactly, in period dress.' : '',
  ].filter(Boolean).join(' ');
}
const firstSentence = t => (String(t).split(/(?<=[.!?…])\s/)[0] || String(t)).slice(0, 160);

// ── files ──
const WORK = path.join(process.env.FILM_DIR || path.join(os.tmpdir(), 'film-the-room'), (ARGS.world || 'w').replace(/[^a-z0-9-]/gi, '-'), String(ARGS.room || 'faces'));
fs.mkdirSync(WORK, { recursive: true });
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26, ...opts });
async function download(url, file) {
  const r = await fetch(url, { headers: url.includes('generativelanguage.googleapis.com') ? { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' } : {} });
  if (!r.ok) throw new Error(`download ${url}: HTTP ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return file;
}
function toJpeg(input, out, width = 1216) {
  for (const q of [4, 6, 9, 14, 20]) {
    sh(FFMPEG, ['-y', '-loglevel', 'error', '-i', input, '-vf', `scale=${width}:-2`, '-q:v', String(q), out]);
    if (fs.statSync(out).size <= 480 * 1024) return out;
  }
  return out;
}
async function storeAtSink(file, folder) {
  const p = `${folder.replace(/[^a-z0-9_-]/gi, '-')}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const r = await fetch(`${SINK_URL}/storage/v1/object/stills/${p}`, { method: 'POST', headers: { Authorization: 'Bearer ' + SINK_KEY, apikey: SINK_KEY, 'Content-Type': 'image/jpeg' }, body: fs.readFileSync(file) });
  if (!r.ok) throw new Error(`the sink refused (${r.status}) ${await r.text().then(t => t.slice(0, 200))}`);
  return `${SINK_URL}/storage/v1/object/public/stills/${p}`;
}
const b64 = file => fs.readFileSync(file).toString('base64');
async function fetchB64(url) { const r = await fetch(url); if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`); const mime = r.headers.get('content-type') || 'image/jpeg'; return { mime: mime.split(';')[0], data: Buffer.from(await r.arrayBuffer()).toString('base64') }; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── the makers: one call each, your key, your spend ──
const HF = process.env.HIGGSFIELD_API_KEY, GK = process.env.GEMINI_API_KEY, OK = process.env.OPENAI_API_KEY;
async function hfRun(endpoint, body) {
  const r = await fetch('https://api.higgsfield.ai/' + endpoint.replace(/^\//, ''), { method: 'POST', headers: { Authorization: 'Key ' + HF, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Higgsfield ${endpoint}: HTTP ${r.status} ${JSON.stringify(d).slice(0, 300)}`);
  for (let i = 0; i < 200; i++) {
    await sleep(3000);
    const s = await fetch(d.status_url, { headers: { Authorization: 'Key ' + HF } }).then(x => x.json());
    if (s.status === 'completed') return s;
    if (/^(failed|nsfw|canceled)$/.test(s.status)) throw new Error(`Higgsfield ${endpoint}: ${s.status} ${JSON.stringify(s.error || '').slice(0, 200)}`);
  }
  throw new Error('Higgsfield: gave up waiting');
}
async function hfEstimate(endpoint, body) {
  try { const r = await fetch('https://api.higgsfield.ai/estimate/' + endpoint.replace(/^\//, ''), { method: 'POST', headers: { Authorization: 'Key ' + HF, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json(); return r.ok ? d : null; } catch { return null; }
}
async function makeStill(prompt, faceUrls, outFile, at) {
  if (HF) {
    const ep = process.env.HF_IMAGE_ENDPOINT || 'xai/grok-imagine-image-2.0';
    const body = { prompt, aspect_ratio: '16:9', resolution: '2k', quality: 'medium' };
    if (faceUrls.length) body.image_urls = faceUrls.slice(0, 10);
    const est = await hfEstimate(ep, body); logCost({ kind: 'still', maker: ep, usd: est && est.usd, credits: est && est.credits, at });
    const s = await hfRun(ep, body);
    const url = s.response?.images?.[0]?.url || s.images?.[0]?.url || s.payload?.images?.[0]?.url;
    if (!url) throw new Error('Higgsfield returned no image url: ' + JSON.stringify(s).slice(0, 300));
    return download(url, outFile);
  }
  if (GK) {
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
    logCost({ kind: 'still', maker: model, usd: RATES[model], at, approximate: true });
    const input = [{ type: 'text', text: prompt }];
    for (const u of faceUrls.slice(0, 4)) { const f = await fetchB64(u); input.push({ type: 'image', mime_type: f.mime, data: f.data }); }
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GK }, body: JSON.stringify({ model, input, response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '16:9', image_size: '2K' } }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Gemini ${model}: HTTP ${r.status} ${JSON.stringify(d).slice(0, 300)}`);
    const found = (function dig(n) { if (!n || typeof n !== 'object') return null; if (typeof n.data === 'string' && n.data.length > 1000 && /^image\//.test(n.mime_type || n.mimeType || 'image/jpeg')) return n.data; for (const k of Object.keys(n)) { const v = dig(n[k]); if (v) return v; } return null; })(d);
    if (!found) throw new Error('Gemini returned no image: ' + JSON.stringify(d).slice(0, 300));
    fs.writeFileSync(outFile, Buffer.from(found, 'base64'));
    return outFile;
  }
  if (OK) {
    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
    logCost({ kind: 'still', maker: model, usd: RATES[model], at, approximate: true });
    let r;
    if (faceUrls.length) {
      const form = new FormData();
      form.append('model', model); form.append('prompt', prompt); form.append('size', '1536x1024'); form.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'medium');
      for (const u of faceUrls.slice(0, 8)) { const f = await fetchB64(u); form.append('image[]', new Blob([Buffer.from(f.data, 'base64')], { type: f.mime }), 'face.jpg'); }
      r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + OK }, body: form });
    } else {
      r = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: 'Bearer ' + OK, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, size: '1536x1024', n: 1 }) });
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`OpenAI ${model}: HTTP ${r.status} ${JSON.stringify(d).slice(0, 300)}`);
    const it = d.data && d.data[0];
    if (it && it.b64_json) { fs.writeFileSync(outFile, Buffer.from(it.b64_json, 'base64')); return outFile; }
    if (it && it.url) return download(it.url, outFile);
    throw new Error('OpenAI returned no image');
  }
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1216&height=832&nologo=true`;
  return download(url, outFile);
}
async function makeClip(stillFile, stillUrl, prompt, faceUrls, seconds, outFile, at) {
  if (HF) {
    const ep = process.env.HF_VIDEO_ENDPOINT || 'minimax/hailuo-2.3/standard/image-to-video';
    const body = /cinema-studio/.test(ep)
      ? { prompt, image_urls: [stillUrl, ...faceUrls].slice(0, 30), duration: Math.max(4, Math.min(30, seconds)), resolution: '720p', aspect_ratio: '16:9', generate_audio: true }
      : /hailuo/.test(ep) ? { prompt, image_url: stillUrl, duration: seconds > 6 ? 10 : 6 }
      : { prompt, image_url: stillUrl, image_urls: faceUrls.slice(0, 7), duration: seconds, resolution: '720p', aspect_ratio: '16:9' };
    const est = await hfEstimate(ep, body); logCost({ kind: 'clip', maker: ep, usd: est && est.usd, credits: est && est.credits, at });
    const s = await hfRun(ep, body);
    const url = s.response?.video?.url || s.video?.url || s.payload?.video?.url;
    if (!url) throw new Error('Higgsfield returned no video url: ' + JSON.stringify(s).slice(0, 300));
    return download(url, outFile);
  }
  if (GK) {
    const model = process.env.VEO_MODEL || 'veo-3.1-fast-generate-preview';
    logCost({ kind: 'clip', maker: model, usd: (RATES[model] || 0) * (faceUrls.length ? 8 : seconds), at, approximate: true });
    const still = await fetchB64(stillUrl).catch(() => ({ mime: 'image/jpeg', data: b64(stillFile) }));
    const instance = { prompt, image: { inlineData: { mimeType: still.mime, data: still.data } } };
    const refs = [];
    for (const u of faceUrls.slice(0, 3)) { const f = await fetchB64(u); refs.push({ image: { inlineData: { mimeType: f.mime, data: f.data } }, referenceType: 'asset' }); }
    if (refs.length) instance.referenceImages = refs;
    const body = { instances: [instance], parameters: { aspectRatio: '16:9', resolution: process.env.VEO_RESOLUTION || '720p', durationSeconds: String(refs.length ? 8 : [4, 6, 8].includes(seconds) ? seconds : 8), personGeneration: 'allow_all' } };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GK }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Veo ${model}: HTTP ${r.status} ${JSON.stringify(d).slice(0, 300)}`);
    for (let i = 0; i < 120; i++) {
      await sleep(8000);
      const s = await fetch(`https://generativelanguage.googleapis.com/v1beta/${d.name}`, { headers: { 'x-goog-api-key': GK } }).then(x => x.json());
      if (s.done) {
        const uri = s.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!uri) throw new Error('Veo finished without a video: ' + JSON.stringify(s).slice(0, 300));
        return download(uri, outFile);
      }
    }
    throw new Error('Veo: gave up waiting');
  }
  throw new Error('a clip needs HIGGSFIELD_API_KEY or GEMINI_API_KEY');
}
async function narrate(text, outFile) {
  if (!OK) return null;
  const r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: 'Bearer ' + OK, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice: process.env.OPENAI_TTS_VOICE || 'onyx', input: text.slice(0, 4000), response_format: 'mp3' }) });
  if (!r.ok) throw new Error(`narration: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  fs.writeFileSync(outFile, Buffer.from(await r.arrayBuffer()));
  return outFile;
}
function durationOf(file) { try { return parseFloat(sh(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).toString().trim()) || 0; } catch { return 0; } }

// ── captions: a Swift program draws them on a Mac; elsewhere an .srt rides beside the film ──
const SWIFT_CAPTIONS = `
import Foundation
import AppKit
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers
let args = CommandLine.arguments
let spec = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: args[1]))) as! [[String: String]]
let W = 1280, H = 720
for item in spec {
  let cs = CGColorSpaceCreateDeviceRGB()
  let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  let kind = item["kind"] ?? "caption", text = item["text"] ?? ""
  if kind == "caption" {
    let g = CGGradient(colorsSpace: cs, colors: [CGColor(red: 0, green: 0, blue: 0, alpha: 0.0), CGColor(red: 0, green: 0, blue: 0, alpha: 0.78)] as CFArray, locations: [0, 1])!
    ctx.drawLinearGradient(g, start: CGPoint(x: 0, y: 260), end: CGPoint(x: 0, y: 0), options: [])
  } else {
    ctx.setFillColor(CGColor(red: 0.04, green: 0.05, blue: 0.07, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
  }
  let size: CGFloat = kind == "caption" ? 30 : (kind == "title" ? 54 : 34)
  let font = CTFontCreateWithName(("Georgia" as CFString), size, nil)
  let para = NSMutableParagraphStyle(); para.alignment = kind == "caption" ? .left : .center; para.lineSpacing = 6
  let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: CGColor(red: 0.97, green: 0.96, blue: 0.93, alpha: 1), .paragraphStyle: para]
  let str = NSAttributedString(string: text, attributes: attrs)
  let fs = CTFramesetterCreateWithAttributedString(str)
  let box = kind == "caption" ? CGRect(x: 60, y: 34, width: W - 120, height: 200) : CGRect(x: 120, y: 120, width: W - 240, height: H - 240)
  let fitted = CTFramesetterSuggestFrameSizeWithConstraints(fs, CFRange(location: 0, length: 0), nil, CGSize(width: box.width, height: box.height), nil)
  let y = kind == "caption" ? box.minY : box.minY + (box.height - fitted.height) / 2
  let pathRect = CGRect(x: box.minX, y: y, width: box.width, height: fitted.height)
  let frame = CTFramesetterCreateFrame(fs, CFRange(location: 0, length: 0), CGPath(rect: pathRect, transform: nil), nil)
  CTFrameDraw(frame, ctx)
  let img = ctx.makeImage()!
  let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: item["file"]!) as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, img, nil); CGImageDestinationFinalize(dest)
}
`;
function drawCaptions(items) {
  if (!items.length) return false;
  const hasSwift = spawnSync('which', ['swift']).status === 0;
  if (!hasSwift) return false;
  const src = path.join(WORK, 'captions.swift'), spec = path.join(WORK, 'captions.json');
  fs.writeFileSync(src, SWIFT_CAPTIONS); fs.writeFileSync(spec, JSON.stringify(items));
  const r = spawnSync('swift', [src, spec], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) { log('captions: swift failed —', r.stderr.toString().slice(0, 300)); return false; }
  return true;
}
const srtTime = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = (s % 60).toFixed(3).padStart(6, '0').replace('.', ','); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x}`; };

// ── the three verbs ──
async function verbFaces(origin) {
  if (!ARGS.photo.length) throw new Error('faces needs --photo <Handle>=<file>');
  for (const spec of ARGS.photo) {
    const [handle, file] = spec.split('=');
    if (!handle || !file || !fs.existsSync(file)) throw new Error(`--photo ${spec}: give <Handle>=<an image file>`);
    const jpg = toJpeg(file, path.join(WORK, `face-${handle}.jpg`), 900);
    if (DRY) { log(`dry — would put ${handle}'s photograph at the sink and open gallery:${handle} with it`); continue; }
    const url = await storeAtSink(jpg, 'faces');
    await ensureBook(origin, 'gallery:' + handle, `The picture-book of ${handle} — the face the player gave at the table (the entry at passport:${handle}:3, the address of their look), then every still they stand in, addressed to the moment it renders. Links only; the bytes live at each maker's sink (ways:stills).`);
    const ack = await appendEntry(origin, 'gallery:' + handle, { _: `${handle} — the face at the table, the reference every still of ${handle} is rendered against`, 1: AGENT, 2: `passport:${handle}:3`, 3: new Date().toISOString(), 4: url });
    log(`${handle}: face at ${url} → gallery:${handle} slot ${ack.slot}`);
  }
}

async function renderBeat(origin, room, beat, handles, looks, faces, style, wantClip, seconds, place) {
  const cast = castOf(beat, handles);
  const prompt = composeShot(beat, cast, looks, style, place);
  const faceUrls = cast.map(h => faces[h]).filter(Boolean);
  const base = path.join(WORK, `beat-${beat.slot.replace(/\./g, '_')}`);
  log(`\n[${room}:${beat.slot}] ${beat.who} — ${firstSentence(beat.text)}\n  in frame: ${cast.join(', ') || 'nobody named'}${faceUrls.length ? ` (${faceUrls.length} face${faceUrls.length > 1 ? 's' : ''} as reference)` : ''}`);
  if (DRY) {
    log('  prompt: ' + prompt.slice(0, 400) + (prompt.length > 400 ? '…' : ''));
    if (HF) { const est = await hfEstimate(process.env.HF_IMAGE_ENDPOINT || 'xai/grok-imagine-image-2.0', { prompt, aspect_ratio: '16:9', resolution: '2k', quality: 'medium' }); if (est) log(`  Higgsfield estimate: ${JSON.stringify(est)}`); }
    return null;
  }
  const raw = await makeStill(prompt, faceUrls, base + '-raw.png', `pool:${room}:${beat.slot}`);
  const jpg = toJpeg(raw, base + '.jpg');
  const url = await storeAtSink(jpg, room);
  const ack = await appendEntry(origin, 'gallery:' + AGENT, { _: firstSentence(beat.text), 1: AGENT, 2: `pool:${room}:${beat.slot}`, 3: new Date().toISOString(), 4: url });
  log(`  still → ${url}\n  gallery:${AGENT} slot ${ack.slot}`);
  if (wantClip) {
    try { const clip = await makeClip(jpg, url, prompt, faceUrls, seconds, base + '-clip.mp4', `pool:${room}:${beat.slot}`); log(`  clip → ${clip}`); }
    catch (e) { log('  clip failed: ' + e.message); }
  }
  log(`  spent so far this room: $${costTotal().toFixed(2)} (${costFile()})`);
  return url;
}

// keep — a maker's links die (Higgsfield keeps outputs about seven days): download each picture in a
// book that is not yet at the sink, shrink it, put it at the sink, and append the same entry with the
// lasting link (the original kept in the caption); the book's own key rides as BOOK_SECRET when it is locked
async function verbKeep(origin) {
  const handle = String(ARGS.handle || AGENT).trim(), name = 'gallery:' + handle, secret = process.env.BOOK_SECRET;
  const book = await readBlock(origin, name);
  if (!book) throw new Error(`no ${name} at ${origin}`);
  const all = stillsOf(book), kept = new Set(all.filter(s => s.url.startsWith(SINK_URL)).map(s => s.at));
  const todo = all.filter(s => !s.url.startsWith(SINK_URL) && !isVideoLink(s.url) && !kept.has(s.at));
  log(`${name} at ${origin}: ${all.length} pictures, ${todo.length} not yet at the sink${DRY ? ' (dry run)' : ''}`);
  for (const s of todo) {
    const base = path.join(WORK, 'keep-' + Buffer.from(s.at).toString('base64url').slice(0, 24));
    try {
      if (DRY) { log(`  would keep ${s.at} ← ${s.url.slice(0, 80)}`); continue; }
      const raw = await download(s.url, base + '.src'); const jpg = toJpeg(raw, base + '.jpg');
      const url = await storeAtSink(jpg, handle);
      const entry = { _: s.caption + (s.caption.includes('original at') ? '' : ` (original at ${s.url})`), 1: s.who || handle, 2: s.at, 3: new Date().toISOString(), 4: url };
      const ack = await post(origin, { block: name, content: entry, append: true, ...(secret ? { secret } : {}) });
      log(`  kept ${s.at} → ${url} (slot ${ack.slot})`);
    } catch (e) { log(`  ${s.at}: ${e.message}`); }
  }
}

async function verbWatch(origin) {
  const one = String(ARGS.room || 'all').trim();
  const every = Math.max(8, Number(ARGS.every) || 20) * 1000, wantClip = !!ARGS.clips, seconds = Number(ARGS.seconds) || 6;
  const style = ARGS.style || process.env.STYLE || (await readBlock(origin, 'style:' + (ARGS.world || '')).then(s => voiceOf(s)).catch(() => null)) || DEFAULT_STYLE;
  const stateFile = path.join(WORK, 'watched.json');
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : { done: [] };
  const places = {};
  log(`watching ${one === 'all' ? 'every room' : 'pool:' + one} at ${origin} every ${every / 1000}s as ${AGENT} — ${HF ? 'Higgsfield' : GK ? 'Gemini' : OK ? 'OpenAI' : 'the free service'}${wantClip ? ', with a clip per moment' : ''}${DRY ? ' (dry run — nothing is made or written)' : ''}`);
  if (!DRY) await ensureBook(origin, 'gallery:' + AGENT, `The picture-book of ${AGENT} at this table — what ${AGENT} made, one entry per still: the caption is the moment it renders, 1 the maker, 2 the address rendered (pool:<room>:<slot> for a moment), 3 when, 4 the link a viewer renders. Links only; the bytes live at the maker's sink (ways:stills). The room's pictures are read across every book here by address.`);
  for (;;) {
    try {
      const rooms = one === 'all' ? await roomsAt(origin) : [one];
      const [books, idx] = await Promise.all([loadBooks(origin), readIndex(origin)]);
      const handles = (idx.blocks || []).filter(b => b.startsWith('passport:')).map(b => b.slice(9));
      let moments = 0, todoAll = [];
      for (const room of rooms) {
        const pool = await readBlock(origin, 'pool:' + room).catch(() => null);
        const beats = pool ? beatsOf(pool) : [];
        moments += beats.length;
        const rendered = new Set([...roomStillsFrom(books, room).map(s => s.at), ...state.done]);
        for (const b of beats) if (!rendered.has(`pool:${room}:${b.slot}`) && (!ARGS.since || slotCmp(b.slot, String(ARGS.since)) > 0)) todoAll.push({ room, beat: b });
      }
      if (todoAll.length) {
        const pps = Object.fromEntries(await Promise.all(handles.map(async h => [h, await readBlock(origin, 'passport:' + h).catch(() => null)])));
        const looks = Object.fromEntries(handles.map(h => [h, lookOf(pps[h])]));
        const faces = await facesOf(origin, handles);
        for (const { room, beat } of todoAll) {
          if (!(room in places)) { places[room] = await placeOf(origin, room); if (places[room]) log(`the place at ${room}: ${places[room].slice(0, 120)}${places[room].length > 120 ? '…' : ''}`); }
          try { await renderBeat(origin, room, beat, handles, looks, faces, style, wantClip, seconds, places[room]); if (!DRY) { state.done.push(`pool:${room}:${beat.slot}`); fs.writeFileSync(stateFile, JSON.stringify(state)); } }
          catch (e) { log(`  [${room}:${beat.slot}] failed: ${e.message}`); }
        }
      } else log(`${new Date().toISOString().slice(11, 19)} nothing new (${rooms.length} room${rooms.length === 1 ? '' : 's'}, ${moments} moments, all rendered)`);
    } catch (e) { log('watch: ' + e.message); }
    if (ARGS.once) return;
    await sleep(every);
  }
}

async function verbFilm(origin) {
  const one = String(ARGS.room || 'all').trim();
  const mode = ARGS.mode === 'clips' ? 'clips' : 'stills', seconds = Math.max(3, Number(ARGS.seconds) || 7), wantNarration = !!ARGS.narrate;
  const out = path.resolve(ARGS.out || `film-${(ARGS.world || 'w').replace(/[^a-z0-9-]/gi, '-')}-${one}.mp4`);
  const rooms = one === 'all' ? await roomsAt(origin) : [one];
  const [books, idx] = await Promise.all([loadBooks(origin), readIndex(origin)]);
  const beats = [], stills = [];
  for (const room of rooms) {
    const pool = await readBlock(origin, 'pool:' + room).catch(() => null);
    for (const b of pool ? beatsOf(pool) : []) beats.push({ ...b, room, at: `pool:${room}:${b.slot}` });
    for (const s of roomStillsFrom(books, room)) if (s.at.startsWith(`pool:${room}:`) && !isVideoLink(s.url)) stills.push({ ...s, room });
  }
  stills.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  // one still per moment — the newest, from whichever book — in the order the moments were played
  const byBeat = new Map(); for (const s of stills) byBeat.set(s.at, s);
  const when = Object.fromEntries(beats.map(b => [b.at, b.ts || '']));
  const order = [...byBeat.values()].sort((a, b) => (when[a.at] || '').localeCompare(when[b.at] || '') || slotCmp(a.room, b.room) || slotCmp(a.at.split(':').pop(), b.at.split(':').pop()));
  if (!order.length) throw new Error(`no book at ${origin} holds a still of ${one === 'all' ? 'any room here' : 'pool:' + one} — watch the table first`);
  log(`from ${new Set(stills.map(s => s.book)).size} book(s): ${[...new Set(stills.map(s => s.book))].join(', ')}`);
  const room = one;
  const world = ARGS.world, title = ARGS.title || (one === 'all' ? `${world} — the table` : `${world} — ${one}`);
  const handles = (idx.blocks || []).filter(b => b.startsWith('passport:')).map(b => b.slice(9));
  const faces = mode === 'clips' ? await facesOf(origin, handles) : {};
  log(`${order.length} stills of ${one === 'all' ? rooms.length + ' room(s)' : 'pool:' + one} at ${origin} → ${out} (${mode}${wantNarration ? ', narrated' : ''}${DRY ? ', dry run' : ''})`);
  const plan = order.map((s, i) => {
    const beat = beats.find(b => b.at === s.at);
    const text = beat ? beat.text : s.caption;
    return { i, still: s, beat, caption: s.caption || firstSentence(text), narration: text, slot: s.at.split(':').pop() };
  });
  if (DRY) {
    for (const p of plan) log(`  ${p.slot}: ${p.caption.slice(0, 100)}${p.beat ? '' : ' (no beat text — caption only)'}`);
    const est = mode === 'clips' ? (HF ? 'Higgsfield per clip: see the estimate endpoint' : GK ? `Veo fast 720p ≈ $0.10/s × 8 s × ${plan.length} clips ≈ $${(0.8 * plan.length).toFixed(2)} (check the current rate)` : 'no video key') : 'no generation — stills with a slow move, free';
    log(`  cost: ${est}${wantNarration ? (OK ? '; narration on OpenAI TTS, a few cents' : '; narration wanted but no OPENAI_API_KEY') : ''}`);
    return;
  }
  fs.mkdirSync(WORK, { recursive: true });
  // 1 · gather
  for (const p of plan) {
    p.file = path.join(WORK, `still-${p.slot.replace(/\./g, '_')}.jpg`);
    if (!fs.existsSync(p.file)) { const raw = await download(p.still.url, p.file + '.src'); toJpeg(raw, p.file, 1600); }
    if (wantNarration && OK) { p.audio = path.join(WORK, `say-${p.slot.replace(/\./g, '_')}.mp3`); if (!fs.existsSync(p.audio)) await narrate(p.narration, p.audio); }
    if (mode === 'clips') {
      p.clip = path.join(WORK, `beat-${p.slot.replace(/\./g, '_')}-clip.mp4`);
      if (!fs.existsSync(p.clip)) {
        const cast = p.beat ? castOf(p.beat, handles) : [];
        try { await makeClip(p.file, p.still.url, (p.beat ? p.beat.text.slice(0, 800) : p.caption) + ' Slow, natural motion; the camera barely moves.', cast.map(h => faces[h]).filter(Boolean), seconds, p.clip, p.still.at); log(`  clip ${p.slot} ✓`); }
        catch (e) { log(`  clip ${p.slot} failed (${e.message}) — the still carries this moment`); p.clip = null; }
      }
    }
  }
  // 2 · captions
  const capItems = [{ file: path.join(WORK, 'card-title.png'), kind: 'title', text: title }, { file: path.join(WORK, 'card-end.png'), kind: 'end', text: `played at the table, kept at the beach\n${origin.replace(/^https?:\/\//, '')}${one === 'all' ? '' : ' · pool:' + one}` }];
  for (const p of plan) { p.cap = path.join(WORK, `cap-${p.slot.replace(/\./g, '_')}.png`); capItems.push({ file: p.cap, kind: 'caption', text: p.caption }); }
  const burned = drawCaptions(capItems);
  if (!burned) log('captions: not burned in (no swift) — an .srt is written beside the film');
  // 3 · segments
  const segs = [], srt = []; let clock = 0, n = 0;
  const seg = (name, args, dur) => { const f = path.join(WORK, name); sh(FFMPEG, ['-y', '-loglevel', 'error', ...args, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-t', String(dur), f]); segs.push(f); return f; };
  if (burned) seg('seg-title.mp4', ['-loop', '1', '-framerate', '25', '-i', capItems[0].file, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-vf', 'format=yuv420p', '-shortest'], 3);
  clock += burned ? 3 : 0;
  for (const p of plan) {
    const say = p.audio ? durationOf(p.audio) : 0;
    const dur = Math.max(seconds, say ? say + 0.8 : 0, p.clip ? durationOf(p.clip) : 0);
    const inputs = [], filters = [];
    if (p.clip) { inputs.push('-i', p.clip); filters.push('[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=25,tpad=stop_mode=clone:stop_duration=' + Math.max(0, dur - durationOf(p.clip)).toFixed(2) + '[v0]'); }
    else { inputs.push('-loop', '1', '-framerate', '25', '-i', p.file); filters.push(`[0:v]scale=1600:900:force_original_aspect_ratio=increase,crop=1600:900,zoompan=z='1+0.10*on/${Math.round(dur * 25)}':d=${Math.round(dur * 25)}:x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':s=1280x720:fps=25[v0]`); }
    let vlabel = '[v0]';
    if (burned) { inputs.push('-i', p.cap); filters.push('[v0][1:v]overlay=0:0:format=auto[v1]'); vlabel = '[v1]'; }
    const aIdx = inputs.filter(x => x === '-i').length;
    if (p.audio) inputs.push('-i', p.audio); else if (p.clip && hasAudio(p.clip)) { /* the clip's own sound */ } else inputs.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
    const amap = p.audio ? `${aIdx}:a` : (p.clip && hasAudio(p.clip)) ? '0:a' : `${aIdx}:a`;
    if (p.audio) filters.push(`[${aIdx}:a]apad[a1]`);
    seg(`seg-${String(n++).padStart(3, '0')}.mp4`, [...inputs, '-filter_complex', filters.join(';'), '-map', vlabel, '-map', p.audio ? '[a1]' : amap], dur);
    srt.push(`${srt.length + 1}\n${srtTime(clock)} --> ${srtTime(clock + dur)}\n${p.caption}\n`); clock += dur;
  }
  if (burned) seg('seg-end.mp4', ['-loop', '1', '-framerate', '25', '-i', capItems[1].file, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-vf', 'format=yuv420p', '-shortest'], 4);
  // 4 · the cut
  const list = path.join(WORK, 'segments.txt'); fs.writeFileSync(list, segs.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  sh(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
  if (!burned) fs.writeFileSync(out.replace(/\.mp4$/, '') + '.srt', srt.join('\n'));
  log(`\nfilm: ${out} (${Math.round(clock)} s, ${plan.length} moments${burned ? ', captions burned in' : ', captions in the .srt beside it'})${mode === 'clips' ? ` · spent on this room so far: $${costTotal().toFixed(2)} (${costFile()})` : ''}`);
  log(`upload it to a channel you own, then keep the link in your own book, addressed to the room:\n  curl -X POST '${wk(origin)}' -H 'Content-Type: application/json' -d '${JSON.stringify({ block: 'gallery:' + AGENT, append: true, content: { _: `The film of ${room} — ${plan.length} moments`, 1: AGENT, 2: one === 'all' ? `pool:${rooms[0] || ''}` : `pool:${room}`, 3: new Date().toISOString(), 4: 'https://youtu.be/…' } })}'`);
}
function hasAudio(file) { try { return sh(FFPROBE, ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file]).toString().includes('audio'); } catch { return false; } }

(async () => {
  const origin = ARGS.world ? await resolveWorld(ARGS.world) : APEX;
  if (!origin) throw new Error(`no world named ${ARGS.world}`);
  if (VERB === 'faces') await verbFaces(origin);
  else if (VERB === 'watch') await verbWatch(origin);
  else if (VERB === 'keep') await verbKeep(origin);
  else await verbFilm(origin);
})().catch(e => { log('✗ ' + e.message); process.exit(1); });
