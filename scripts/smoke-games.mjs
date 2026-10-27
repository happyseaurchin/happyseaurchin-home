#!/usr/bin/env node
/* scripts/smoke-games.mjs — a hosted game played in a browser before it is pushed (ways:plug 8; lane plug.1, 27 Oct 2026).
 * This repository is served as Vercel serves it (clean URLs, and the header vercel.json gives /games/<game>/game, read
 * from vercel.json itself), and the game is opened at /games/<game> in headless Chromium:
 *
 *   NODE_PATH=$(npm root -g) node scripts/smoke-games.mjs <game>                  the game plugged at games/<game>/
 *   NODE_PATH=$(npm root -g) node scripts/smoke-games.mjs <game> --file <page>    a page as handed in, hosted in memory
 *
 * It proves the frame does what the service promises: the game runs in its own opaque origin and cannot read what
 * this site keeps (a name and a key set beforehand at the site's origin read as nothing inside); what the game keeps
 * lands with the frame page under games:<game>: and comes back after a reload; it can reach the beach and nowhere else;
 * the beach's two tags load under the sandbox and the plug answers; a touch starts a run and a minute of the game's
 * clock passes with nothing thrown. It reads the beach (the law, the board) and writes nothing to it. Exits 1 if any
 * check fails. Needs playwright and chromium, as the beach's own smoke tests do. */
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { hostedPage, framePage } from './plug-host.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const GAME = String(args[0] || '');
const FILE = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(GAME)) { console.error('usage: node scripts/smoke-games.mjs <game> [--file <page>]'); process.exit(2); }
if (!FILE && !existsSync(join(ROOT, 'games', GAME, 'game.html'))) { console.error('no games/' + GAME + '/game.html: plug it first, or pass --file'); process.exit(2); }

/* the header vercel.json gives a hosted game */
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const rule = (vercel.headers || []).find((h) => h.source === '/games/:game/game');
if (!rule) { console.error('vercel.json gives /games/:game/game no header'); process.exit(1); }
const GAME_HEADERS = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));

/* in memory, for --file: the page hosted as the service would host it, and its frame */
const MEMORY = {};
if (FILE) {
  const html = readFileSync(FILE, 'utf8');
  const title = ((/<title>([^<]*)<\/title>/i.exec(html) || [])[1] || GAME).trim();
  MEMORY['/games/' + GAME + '/game'] = hostedPage(html);
  MEMORY['/games/' + GAME] = framePage({ game: GAME, title, what: '', by: 'the smoke test' });
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
function resolve(path) {   // clean URLs, as vercel.json's cleanUrls serves them
  const p = decodeURIComponent(path.split('?')[0]).replace(/\/+$/, '') || '/';
  if (MEMORY[p]) return { body: MEMORY[p], type: TYPES['.html'], path: p };
  const tries = [p, p + '.html', join(p, 'index.html')];
  for (const t of tries) { const f = join(ROOT, t); if (f.startsWith(ROOT) && existsSync(f) && statSync(f).isFile()) return { file: f, type: TYPES[extname(f)] || 'application/octet-stream', path: p }; }
  return null;
}
const server = http.createServer((req, res) => {
  const hit = resolve(req.url);
  if (!hit) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
  const headers = { 'Content-Type': hit.type, 'Cache-Control': 'no-store' };
  if (/^\/games\/[a-z0-9][a-z0-9-]*\/game$/.test(hit.path)) Object.assign(headers, GAME_HEADERS);
  res.writeHead(200, headers);
  res.end(hit.body != null ? hit.body : readFileSync(hit.file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const ORIGIN = 'http://127.0.0.1:' + server.address().port;

const results = [];
async function check(name, fn) {
  try { const note = await fn(); results.push({ name, ok: true, note }); }
  catch (e) { results.push({ name, ok: false, note: (e && e.message) || String(e) }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const { chromium } = require('playwright');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
try {
  // what this site keeps for its own pages, which a game must never read
  await page.goto(ORIGIN + '/games/bridge.js');
  await page.evaluate(() => { localStorage.setItem('render:who', 'site-name'); localStorage.setItem('next-latch:now:site-name', 'site-key'); });
  await page.clock.install();
  await page.goto(ORIGIN + '/games/' + GAME, { waitUntil: 'load' });
  const frameEl = await page.waitForSelector('iframe#game');
  const frame = await frameEl.contentFrame();
  await frame.waitForLoadState('load');
  await page.clock.runFor(1500);

  await check('the game runs in its own origin, sandboxed', async () => {
    const o = await frame.evaluate(() => self.origin);
    assert(o === 'null', 'its origin is ' + o);
    return 'origin ' + o;
  });
  await check('it reads nothing this site keeps in the browser', async () => {
    const seen = await frame.evaluate(() => [localStorage.getItem('render:who'), localStorage.getItem('next-latch:now:site-name'), localStorage.length]);
    assert(seen[0] === null && seen[1] === null, 'it read ' + JSON.stringify(seen));
    return 'the site\'s name and key read as nothing inside';
  });
  await check('what it keeps lands with its frame, under games:' + GAME + ':, and comes back', async () => {
    await frame.evaluate(() => localStorage.setItem('smoke-kept', 'yes'));
    await page.clock.runFor(200);
    const outside = await page.evaluate((g) => localStorage.getItem('games:' + g + ':smoke-kept'), GAME);
    assert(outside === 'yes', 'the frame page kept ' + outside);
    await page.reload({ waitUntil: 'load' });
    const f2 = await (await page.waitForSelector('iframe#game')).contentFrame();
    await f2.waitForLoadState('load');
    const back = await f2.evaluate(() => localStorage.getItem('smoke-kept'));
    assert(back === 'yes', 'after a reload it reads ' + back);
    await f2.evaluate(() => localStorage.removeItem('smoke-kept'));
    await page.clock.runFor(200);
    const gone = await page.evaluate((g) => localStorage.getItem('games:' + g + ':smoke-kept'), GAME);
    assert(gone === null, 'a removal did not reach the frame page');
    return 'kept, read back after a reload, and removed';
  });
  const f = await (await page.waitForSelector('iframe#game')).contentFrame();
  await check('the beach\'s two tags load under the sandbox, and the plug answers', async () => {
    const got = await f.evaluate(() => ({ game: window.beachGame && window.beachGame.game, voice: !!window.beachVoice, today: window.beachGame && window.beachGame.today() }));
    assert(got.game === GAME, 'beachGame.game is ' + got.game);
    assert(got.voice, 'no beachVoice');
    assert(/^\d{8}00$/.test(got.today || ''), 'today() is ' + got.today);
    return 'beachGame.game ' + got.game + ', today ' + got.today;
  });
  await check('it can reach the beach, and nowhere else', async () => {
    const beach = await f.evaluate(() => fetch('https://beach.happyseaurchin.com/.well-known/pscale-beach?block=function:' + window.beachGame.game).then((r) => r.status, (e) => 'refused: ' + e.message));
    const elsewhere = await f.evaluate(() => fetch('https://example.com/').then((r) => 'reached: ' + r.status, () => 'refused'));
    assert(typeof beach === 'number', 'the beach: ' + beach);
    assert(elsewhere === 'refused', 'example.com was ' + elsewhere);
    return 'the beach answered ' + beach + '; example.com refused';
  });
  await check('a touch starts a run, and a minute of its clock passes with nothing thrown', async () => {
    const canvas = await f.$('canvas');
    assert(canvas, 'no canvas to touch');
    await canvas.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
    for (let i = 0; i < 65; i++) await page.clock.runFor(1000);
    const thrown = errors.filter((e) => !/Failed to load resource|favicon|ERR_|net::|example\.com/i.test(e));   // example.com: refused above, on purpose
    assert(!thrown.length, thrown.join(' | '));
    return '65 s of the game\'s clock';
  });
  await check('the board and the room draw', async () => {
    const drawn = await f.evaluate(() => {
      const b = document.querySelector('beach-board'), r = document.querySelector('beach-room');
      return { board: b ? b.textContent.trim().slice(0, 80) : null, room: r ? r.textContent.trim().slice(0, 80) : null };
    });
    assert(drawn.board === null || drawn.board.length, 'the board drew nothing');
    return 'board: ' + (drawn.board === null ? '(none on the page)' : drawn.board) + ' · room: ' + (drawn.room === null ? '(none)' : drawn.room);
  });
} finally {
  await browser.close();
  server.close();
}

console.log('\n' + GAME + ' — played at /games/' + GAME + (FILE ? ' (' + FILE + ', hosted in memory)' : '') + '\n');
for (const r of results) console.log('  ' + (r.ok ? '✓' : '✗') + ' ' + r.name + (r.note ? '\n      ' + r.note : ''));
const failed = results.filter((r) => !r.ok);
console.log('\n  ' + (failed.length ? failed.length + ' of ' + results.length + ' checks failed' : 'all ' + results.length + ' checks pass') + '\n');
process.exit(failed.length ? 1 : 0);
