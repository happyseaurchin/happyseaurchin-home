#!/usr/bin/env node
/* smoke-iris.mjs — /iris, the single physics (lane torus.1, thread 128).
 *
 * Serves this repo as Vercel serves it (clean URLs and vercel.json's rewrites), lets the page read the live beach and
 * refuses every write, and for spine:the-sea and now:happyseaurchin, in each of the three ways a block is laid (rings,
 * square, winding), at a phone and a desktop, with motion and with reduced motion:
 *   - a wheel swipe, a drag, an arrow key, a + and a flight each move where it stands;
 *   - the place line at the foot opens the words of the place it stands on;
 *   - switching to another way keeps the place;
 *   - no script error, no sideways scroll, no write attempted.
 * Then three moves that are the physics' own: a clock's beat ring turned past 9 carries into the gathering (the
 * odometer), a spine's ring turned past 9 closes (the cryptex), and a tour flies through a spine's decisions.
 *
 *   NODE_PATH=$(npm root -g) node scripts/smoke-iris.mjs [--shots <dir>]
 */
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SHOTS = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

/* ── the site, as Vercel serves it ── */
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const REWRITES = (vercel.rewrites || []).filter((r) => !/^\/api\//.test(r.destination)).map((r) => ({
  re: new RegExp('^' + r.source.replace(/:[a-z]+/gi, '[^/]+') + '/?$'), to: r.destination }));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };
const file = (p) => { for (const t of [p, p + '.html', join(p, 'index.html')]) { const f = join(ROOT, t); if (f.startsWith(ROOT) && existsSync(f) && statSync(f).isFile()) return f; } return null; };
const resolve = (url) => { const p = decodeURIComponent(url.split('?')[0]).replace(/\/+$/, '') || '/'; let f = file(p); if (!f) { const r = REWRITES.find((x) => x.re.test(p)); if (r) f = file(r.to); } return f; };
const server = http.createServer((req, res) => {
  const f = resolve(req.url);
  if (!f) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(readFileSync(f));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const ORIGIN = 'http://127.0.0.1:' + server.address().port;

/* ── the browser: reads reach the beach through the proxy; every write is refused ── */
const { chromium } = require('playwright');
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : {});
const writes = []; let fails = 0;
const fail = (msg) => { fails++; console.log('FAIL ' + msg); };
async function open(path, vp, touch, rm) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: !!touch, isMobile: !!touch, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.route('**/*', (r) => { const q = r.request(); if (q.method() !== 'GET' && q.method() !== 'HEAD') { writes.push(q.method() + ' ' + q.url()); return r.abort(); } return r.continue(); });
  await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__iris && window.__iris.ready, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  return { ctx, page, errs };
}
const settle = async (page) => { for (let i = 0; i < 120; i++) { const a = await page.evaluate(() => window.__iris.axes()); if (!a.moving) return; await page.waitForTimeout(80); } };
const focus = (page) => page.evaluate(() => { const f = window.__iris.focus(); return f.addr + (f.kind !== 'node' ? '(' + f.kind + ')' : ''); });
const MAPS = { rings: 'a', square: 'b', winding: 'c' };

for (const rm of [false, true]) for (const [vp, touch, tag] of [[{ width: 390, height: 844 }, true, '390'], [{ width: 1280, height: 800 }, false, '1280']]) {
  for (const blk of ['spine:the-sea', 'now:happyseaurchin']) for (const map of Object.keys(MAPS)) {
    const { ctx, page, errs } = await open('/iris/' + blk + '?map=' + map, vp, touch, rm);
    const seen = [await focus(page)];
    await page.mouse.move(vp.width / 2, vp.height / 2);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(40, 60); await page.waitForTimeout(16); }
    await page.waitForTimeout(250); await settle(page); seen.push(await focus(page));
    await page.mouse.down(); await page.mouse.move(vp.width / 2 - 120, vp.height / 2 - 90, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(200); await settle(page); seen.push(await focus(page));
    await page.keyboard.press('ArrowRight'); await settle(page); await page.keyboard.press('+'); await settle(page); seen.push(await focus(page));
    await page.evaluate((b) => window.__iris.flyTo(b === 'now:happyseaurchin' ? 'now' : '1.118'), blk); await settle(page); seen.push(await focus(page));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}${rm ? '-rm' : ''}-${blk.replace(':', '_')}-${map}.png` });
    const at = await page.evaluate(() => { const r = document.getElementById('where').getBoundingClientRect(); return { x: r.x + 20, y: r.y + 10 }; });
    await page.mouse.click(at.x, at.y); await page.waitForTimeout(150);
    const read = await page.evaluate(() => !document.getElementById('reader').hidden);
    await page.keyboard.press('Escape');
    const before = await focus(page), other = map === 'square' ? 'winding' : 'square';
    await page.evaluate((m) => window.__iris.setMap(m), MAPS[other]); await page.waitForTimeout(200); await settle(page);
    const after = await focus(page);
    const sideways = await page.evaluate(() => document.scrollingElement.scrollWidth > innerWidth);
    const ie = await page.evaluate(() => window.__iris.errors.slice(0, 2));
    const label = tag + (rm ? ' reduced' : '') + ' ' + blk + ' ' + map;
    if (new Set(seen).size < 2) fail(label + ': nothing moved (' + seen.join(' → ') + ')');
    else if (!read) fail(label + ': the place line did not open its words');
    else if (before.replace(/\(.*\)/, '') !== after.replace(/\(.*\)/, '') && !(blk === 'spine:the-sea' && /empty/.test(before))) fail(label + ': switching to ' + other + ' moved the place, ' + before + ' → ' + after);
    else if (sideways) fail(label + ': sideways scroll');
    else if (errs.length || ie.length) fail(label + ': ' + errs.concat(ie).slice(0, 2).join(' / '));
    else console.log('ok   ' + label + ': ' + seen.join(' → '));
    await ctx.close();
  }
}
// the physics' own moves
{
  const { ctx, page, errs } = await open('/iris/now:happyseaurchin/2026422383?map=rings', { width: 1280, height: 800 });
  for (let i = 0; i < 7; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40); await settle(page); }
  const f = await focus(page);
  if (!/^202642239/.test(f) || errs.length) fail('the odometer: beat 3 of gathering 8 turned seven places on stands at ' + f); else console.log('ok   the odometer: past 9 the beat ring carried into the next gathering, ' + f);
  await ctx.close();
}
{
  const { ctx, page, errs } = await open('/iris/spine:the-sea/1.12?map=rings', { width: 1280, height: 800 });
  const seen = []; for (let i = 0; i < 10; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40); await settle(page); seen.push(await focus(page)); }
  if (seen[seen.length - 1] !== '1.12' || errs.length) fail('the cryptex: ten turns from 1.12 stand at ' + seen[seen.length - 1]); else console.log('ok   the cryptex: ten turns round a spine\'s ring came back to 1.12');
  await ctx.close();
}
{
  const { ctx, page, errs } = await open('/iris/spine:the-sea?map=square', { width: 390, height: 844 }, true);
  await page.click('#flyb'); await page.waitForTimeout(200);
  const has = await page.evaluate(() => !!document.querySelector('#flychips button[data-tour]'));
  if (has) await page.click('#flychips button[data-tour]');
  const stops = []; for (let i = 0; i < 60; i++) { const f = await focus(page); if (stops[stops.length - 1] !== f) stops.push(f); await page.waitForTimeout(250); }
  if (!has || !stops.includes('1.18') || errs.length) fail('the tour: ' + stops.join(' → ')); else console.log('ok   the tour: ' + stops.join(' → '));
  await ctx.close();
}
if (writes.length) fail('writes attempted: ' + writes.slice(0, 3).join(', '));
console.log(fails ? fails + ' failed' : 'all passed, no write attempted');
await browser.close(); server.close();
process.exit(fails ? 1 : 0);
