/**
 * /api/board — a game's board for today, read once for a crowd.
 *
 *   GET /api/board?game=<name>
 *       { game, title, page, room, law, day, date, source, top: [{ name, line, score, time, slot, at, tries, proof }],
 *         runs, players, read, asKept }
 *
 * The arcade's front door (/arcade) lists every game on the shelf with its top ten today. A game plugged in
 * (spine:game-arcade 1.1111114; the plug button/game.js in pscale-beach, the recipe ways:arcade) keeps each
 * player's result in their own mirror <game>:<handle> at the day's address, so its board is THE FOLD: every
 * mirror of the family read once through the same path as /api/mirrors (mirrors.js, one copy a crowd shares),
 * each player's line at the day (or their best beneath it), sorted as the game's law says in its board line
 * ('board: FINISHED, lowest first, best per player'), cut at ten. Where no mirror holds a line at the day, the
 * game's ROOM is read instead, as Matthew's pages keep a run (game:ghost-wire 4 — {_: the time in words,
 * 1: '<name>, a visitor', 2: the address, 3: when, 5: the guest name a named phone played under before, 6: who
 * brought them, 7: the run, 8: which try}): the lines of today carrying a run, a Ghost Wire run's time read as
 * its law does (steps over sixty), a guest named as the name it later took (by 5), each player's best.
 *
 * No table of games stands here: the game's law (function:<game>, else game:<game> as Matthew's Arcade keeps
 * one) names its page, its room and its board line, and a game with no law on the beach is not on the shelf.
 * The day is the beach's clock's, turning at midnight UTC: the first eight digits of the sundial's ten, then
 * '00'. Nothing is re-run here: a time is as the mirror or the room keeps it, and the answer says so
 * (asKept); the honest board is the plug's, whose verify re-runs each proof on the maker's page.
 *
 * Vercel's CDN keeps the answer fifteen seconds and serves it a while longer while the next is read, so however
 * many open the door in a window, the beach answers one fold. Nothing is stored or written.
 */

import { mirrorsOf } from './mirrors.js';

const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';

/* the sundial's day: year, season (1-4), month in season (1-3), week band (1-5), day in band (1-7), '00' */
function dayAddress(d) {
  const y = d.getUTCFullYear(), m0 = d.getUTCMonth(), dd = d.getUTCDate();
  return String(y) + (Math.floor(m0 / 3) + 1) + (m0 % 3 + 1) + (Math.floor((dd - 1) / 7) + 1) + ((dd - 1) % 7 + 1) + '00';
}
const dateWords = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

async function readBlock(name) {
  const r = await fetch(`${BEACH}?block=${encodeURIComponent(name)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`beach ${r.status}`);
  return r.json();
}
const voice = (v) => { while (v && typeof v === 'object') v = v._; return typeof v === 'string' ? v : ''; };
const nameOf = (s) => String(s || '').replace(/,\s*a (visitor|player)\s*$/i, '').trim();
const titleOf = (game) => game.split('-').map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');

/* ── the law, as the plug reads it (button/game.js parseLaw): lines found by their opening word ── */
export async function readLaw(game) {
  let block = await readBlock('function:' + game), name = 'function:' + game;
  if (!block || typeof block !== 'object') { block = await readBlock('game:' + game); name = 'game:' + game; }
  if (!block || typeof block !== 'object') return null;
  return parseLaw(block, name, game);
}
export function parseLaw(block, name, game) {
  const lines = [];
  (function walk(n) { if (typeof n === 'string') lines.push(n); else if (n && typeof n === 'object') Object.keys(n).forEach((k) => walk(n[k])); })(block);
  const find = (word) => { for (const l of lines) { const m = new RegExp('^\\s*' + word + '\\s*:\\s*(.+)$', 'i').exec(l); if (m) return m[1].trim(); } return ''; };
  const b = find('board') || 'FINISHED, lowest first, best per player';
  const word = (/^([A-Za-z][A-Za-z0-9_-]*)/.exec(b) || [, 'FINISHED'])[1].toUpperCase();
  const room = (/^(pool:[a-z0-9][a-z0-9-]*)/i.exec(find('room')) || [, 'pool:' + game])[1].toLowerCase();
  const urls = (lines.join(' ').match(/https?:\/\/[^\s'")\]]+/g) || []).map((u) => u.replace(/[;,.]+$/, ''));
  const page = (/^(https?:\/\/\S+)/.exec(find('page')) || [, urls[0] || ''])[1];
  return { block: name, mode: find('mode'), room, page, board: { line: b, word, lowest: !/highest first/i.test(b), best: !/last per player/i.test(b) }, title: find('title') || titleOf(game) };
}

/* ── addresses in a mirror: the digits walked from the root, a zero stepping into the underscore, the floor's
 *    trailing zeros left off (2026414500 is 2 _ 2 6 4 1 4 5) ── */
function nodeAt(tree, addr) {
  const s = String(addr).replace(/0+$/, '');
  let n = tree;
  for (const d of s) n = n && typeof n === 'object' ? n[d === '0' ? '_' : d] : undefined;
  return n;
}
export function linesUnder(tree, addr) {
  const out = [], root = String(addr).replace(/0+$/, '');
  (function walk(node, path) {
    if (typeof node === 'string') { if (node.trim()) out.push({ at: path, line: node }); return; }
    if (!node || typeof node !== 'object') return;
    if (typeof node._ === 'string' && node._.trim()) out.push({ at: path, line: node._ });
    else if (node._ && typeof node._ === 'object') walk(node._, path);
    Object.keys(node).forEach((k) => { if (/^[1-9]$/.test(k)) walk(node[k], path + k); });
  })(nodeAt(tree, addr), root);
  return out;
}
const scoreOf = (line, word) => { const m = new RegExp('^\\s*' + word + '\\b\\s*(-?\\d+(?:\\.\\d+)?)', 'i').exec(line || ''); return m ? +m[1] : NaN; };
const proofOf = (line) => { const m = /proof\s+(pool:[a-z0-9][a-z0-9-]*)\s+(\d+)/i.exec(line || ''); return m ? { room: m[1], slot: m[2] } : null; };
const better = (a, b, lowest) => isNaN(b) || (lowest ? a < b : a > b);

/* ── the fold: each player's line at the day in their own mirror ── */
export function boardFromMirrors(fold, law, day) {
  const rows = [];
  Object.keys(fold.mirrors || {}).forEach((h) => {
    const cands = linesUnder(fold.mirrors[h], day).map((x) => ({ name: h, line: x.line, at: x.at, score: scoreOf(x.line, law.board.word) })).filter((x) => !isNaN(x.score));
    if (!cands.length) return;
    const pick = law.board.best ? cands.reduce((a, b) => (better(b.score, a.score, law.board.lowest) ? b : a)) : cands[cands.length - 1];
    const p = proofOf(pick.line);
    rows.push({ name: pick.name, line: pick.line.replace(/\s*·\s*proof\s+pool:\S+\s+\d+\s*$/i, ''), score: pick.score, time: pick.score, at: (fold.touched || {})[h] || '', slot: p ? p.slot : '', proof: p ? p.room + ' ' + p.slot : '', tries: '' });
  });
  rows.sort((a, b) => (law.board.lowest ? a.score - b.score : b.score - a.score) || String(a.at).localeCompare(String(b.at)));
  return { top: rows.slice(0, 10), runs: rows.length, players: rows.length };
}

/* ── the room, as Matthew's pages keep a run: every line with its slot, the digits walked from the root ── */
function roomLines(block) {
  const out = [];
  (function walk(node, path) {
    if (!node || typeof node !== 'object') return;
    if (typeof node['7'] === 'string' || typeof node['1'] === 'string') out.push({ slot: path.replace(/^0+/, '') || '0', node });
    Object.keys(node).forEach((k) => { if (k === '_' || /^[1-9]$/.test(k)) walk(node[k], path + (k === '_' ? '0' : k)); });
  })(block, '');
  return out;
}
export function boardFromRoom(block, law, day) {
  const all = roomLines(block).filter((x) => voice(x.node['2']) === day && typeof x.node['7'] === 'string');
  const took = {};
  roomLines(block).forEach((x) => { const g = voice(x.node['5']), n = nameOf(voice(x.node['1'])); if (g && n) took[g] = n; });
  const runs = all.map((x) => {
    const gw = /^gw1\.(\d+)\.(\d+)\./.exec(x.node['7']);
    let score = NaN, line = voice(x.node._);
    if (gw) { if (gw[1] !== day) return null; score = Math.round(+gw[2] / 60 * 100) / 100; line = line || law.board.word + ' ' + score.toFixed(2) + 's'; }
    else score = scoreOf(line, law.board.word);
    if (isNaN(score)) return null;
    const who = nameOf(voice(x.node['1'])) || 'someone';
    return { name: took[who] || who, line, score, time: score, slot: x.slot, at: voice(x.node['3']) || '', tries: voice(x.node['8']) || '', proof: law.room + ' ' + x.slot };
  }).filter(Boolean);
  const best = {};
  runs.forEach((r) => { if (!best[r.name] || (law.board.best ? better(r.score, best[r.name].score, law.board.lowest) : r.at > best[r.name].at)) best[r.name] = r; });
  const top = Object.values(best).sort((a, b) => (law.board.lowest ? a.score - b.score : b.score - a.score) || a.at.localeCompare(b.at)).slice(0, 10);
  return { top, runs: runs.length, players: Object.keys(best).length };
}

export async function boardOf(game, now = new Date()) {
  const law = await readLaw(game);
  if (!law) return null;
  const day = dayAddress(now);
  let fold = null;
  try { fold = await mirrorsOf(game); } catch { fold = null; }
  let b = fold && Object.keys(fold.mirrors || {}).length ? boardFromMirrors(fold, law, day) : { top: [], runs: 0, players: 0 };
  let source = 'mirrors';
  if (!b.top.length) {
    const block = await readBlock(law.room);
    b = block ? boardFromRoom(block, law, day) : b;
    source = 'room';
  }
  return { game, title: law.title, page: law.page, room: law.room, law: law.block, board: law.board.line, day, date: dateWords(now), source, ...b, read: now.toISOString(), asKept: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const q = req.query || {}, given = String(q.game || ''), game = given.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(game)) return res.status(400).json({ error: 'not a game name' });
  /* one address per game, so the CDN's copy is the one every phone gets */
  if (given !== game || Object.keys(q).some((k) => k !== 'game')) { res.setHeader('Location', '/api/board?game=' + game); return res.status(308).end(); }
  try {
    const b = await boardOf(game);
    if (!b) return res.status(404).json({ error: 'no law for ' + game + ' stands on the beach (neither function:' + game + ' nor game:' + game + ')' });
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=15, stale-while-revalidate=45');
    return res.status(200).json(b);
  } catch (e) {
    return res.status(502).json({ error: 'the beach could not be read: ' + String(e && e.message ? e.message : e).slice(0, 200) });
  }
}
