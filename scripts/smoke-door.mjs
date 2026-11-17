#!/usr/bin/env node
/* smoke-door.mjs — the door, 'with your AI', on every page a person is handed
 * (spine:o-page-unit 1.1; David's GO at 1.18; thread:41).
 *
 * Serves this repo as Vercel serves it (clean URLs and vercel.json's rewrites), lets the
 * pages read the live beach and refuses every write, and for each page that is the face of
 * a family, at a phone in the dark and a desktop in the light:
 *   - the corner button stands, or stands aside where the page has a door of its own;
 *   - nothing covers it;
 *   - a tap opens the sheet over the page, its first message naming the family, ways:reader
 *     and, where the page marks its parts, the place reached;
 *   - Escape closes it and gives focus back to the button;
 *   - no script error and no sideways scroll.
 * A page with no family (the list at /proposal) carries no corner button.
 *
 *   NODE_PATH=$(npm root -g) node scripts/smoke-door.mjs [page …] [--shots <dir>]
 */
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const SHOTS = shotsAt >= 0 ? args[shotsAt + 1] : '';
const named = args.filter((a, i) => !a.startsWith('--') && (shotsAt < 0 || i !== shotsAt + 1));
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

/* ── the site, as Vercel serves it ── */
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const REWRITES = (vercel.rewrites || []).filter((r) => !/^\/api\//.test(r.destination)).map((r) => ({
  re: new RegExp('^' + r.source.replace(/:[a-z]+/gi, '[^/]+') + '/?$'),
  to: r.destination,
}));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
function file(p) {
  for (const t of [p, p + '.html', join(p, 'index.html')]) {
    const f = join(ROOT, t);
    if (f.startsWith(ROOT) && existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}
function resolve(url) {
  const p = decodeURIComponent(url.split('?')[0]).replace(/\/+$/, '') || '/';
  let f = file(p);
  if (!f) { const r = REWRITES.find((x) => x.re.test(p)); if (r) f = file(r.to); }
  return f;
}
const server = http.createServer((req, res) => {
  const f = resolve(req.url);
  if (!f) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const ORIGIN = 'http://127.0.0.1:' + server.address().port;

/* ── the pages: every page that says its family, and the generic readers ── */
const own = new Set();
const faces = [];
for (const f of readdirSync(ROOT).filter((n) => n.endsWith('.html'))) {
  const s = readFileSync(join(ROOT, f), 'utf8');
  const tag = /<html[^>]*>/i.exec(s)?.[0] || '';
  if (!/data-(proposal|meeting|schematic|family)=/.test(tag)) continue;
  const path = '/' + f.replace(/\.html$/, '');
  faces.push(path);
  if (/window\.openDoor\s*=/.test(s)) own.add(path);
}
const READERS = ['/proposal/o-page-unit', '/proposal/threads', '/schematic/beach', '/met/sam-6-nov'];
const NONE = ['/proposal', '/schematic'];
const pages = named.length ? named : [...faces.sort(), ...READERS];

/* ── the browser: reads reach the beach through the proxy; every write is refused ── */
const { chromium } = require('playwright');
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : {});
/* the page's own fixed controls, or sticky ones standing stuck, that the button sits over */
const SITS = () => {
        const b = document.querySelector('.aid-pill'), p = b.getBoundingClientRect(), out = [];
        for (const el of document.body.querySelectorAll('*')) {
          if (el === b || b.contains(el) || el.closest('.aid-back')) continue;
          const cs = getComputedStyle(el), pos = cs.position;
          if (pos !== 'fixed' && pos !== 'sticky') continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || (r.width > window.innerWidth * 0.6 && r.height > window.innerHeight * 0.6)) continue;
          if (pos === 'sticky') {   /* only a sticky control standing stuck, as theme.js judges it */
            const t = parseFloat(cs.top), bt = parseFloat(cs.bottom), l = parseFloat(cs.left);
            if (!((!isNaN(t) && Math.abs(r.top - t) < 2) || (!isNaN(bt) && Math.abs(window.innerHeight - r.bottom - bt) < 2) || (!isNaN(l) && Math.abs(r.left - l) < 2))) continue;
          }
          if (r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top) out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''));
        }
        return out.slice(0, 3);
      };
const VIEWS = [
  { name: 'phone-dark', viewport: { width: 390, height: 844 }, theme: 'dark', touch: true },
  { name: 'desktop-light', viewport: { width: 1280, height: 800 }, theme: 'light', touch: false },
];
const writes = [];
const results = [];
function line(ok, page, view, note) { results.push({ ok, page, view, note }); console.log(`  ${ok ? '✓' : '✗'} ${page} · ${view}${note ? ' — ' + note : ''}`); }

for (const view of VIEWS) {
  const context = await browser.newContext({ viewport: view.viewport, deviceScaleFactor: 1, hasTouch: view.touch, reducedMotion: 'reduce' });
  await context.addInitScript((t) => { try { localStorage.setItem('view:theme', t); localStorage.removeItem('render:who'); } catch (e) {} }, view.theme);
  await context.route('**/*', (route) => {
    const r = route.request();
    if (r.method() !== 'GET' && r.method() !== 'HEAD' && !r.url().startsWith(ORIGIN)) { writes.push(r.method() + ' ' + r.url()); return route.abort(); }
    return route.continue();
  });
  for (const path of [...pages, ...(named.length ? [] : NONE)]) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|ERR_|favicon|status of 4\d\d|status of 5\d\d/i.test(m.text())) errors.push(m.text()); });
    try {
      await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1800);
      const pill = page.locator('.aid-pill');
      const has = await pill.count();
      if (NONE.includes(path)) {
        line(has === 0 && !errors.length, path, view.name, has ? 'a page with no family shows the corner button' : errors.length ? 'errors: ' + errors.slice(0, 2).join(' | ') : 'no family, no corner button');
        await page.close(); continue;
      }
      if (own.has(path)) {
        const ownDoor = await page.evaluate(() => typeof window.openDoor === 'function');
        line(has === 0 && ownDoor && !errors.length, path, view.name, has ? 'two doors: the corner button stood beside the page\'s own' : errors.length ? 'errors: ' + errors.slice(0, 2).join(' | ') : 'its own door kept; the corner stands aside');
        await page.close(); continue;
      }
      if (!has) { line(false, path, view.name, 'no corner button'); await page.close(); continue; }
      const probs = [];
      /* nothing covers it */
      const covered = await page.evaluate(() => {
        const b = document.querySelector('.aid-pill'), r = b.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return top && !b.contains(top) ? (top.tagName.toLowerCase() + (top.className && typeof top.className === 'string' ? '.' + top.className.split(' ')[0] : '')) : '';
      });
      if (covered) probs.push('covered by ' + covered);
      /* and it covers none of the page's own fixed or stuck controls, at the top and after a scroll */
      let sits = await page.evaluate(SITS);
      if (sits.length) probs.push('sits over ' + sits.join(', ') + ' at the top');
      /* no sideways scroll */
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (wide > 1) probs.push('sideways scroll ' + wide + 'px');
      /* scroll a third of the way, then open it */
      await page.evaluate(() => window.scrollTo(0, Math.round(document.documentElement.scrollHeight / 3)));
      await page.waitForTimeout(400);
      sits = await page.evaluate(SITS);
      if (sits.length) probs.push('sits over ' + sits.join(', ') + ' after a scroll');
      if (SHOTS) await page.screenshot({ path: join(SHOTS, (path.replace(/\//g, '_') || 'root') + '-' + view.name + '-closed.png') });
      await pill.click();
      await page.waitForSelector('.aid-back:not([hidden])', { timeout: 8000 });
      await page.waitForTimeout(900);
      const sheet = await page.evaluate(() => {
        const back = document.querySelector('.aid-back'), msg = back.querySelector('.aid-msg').value;
        const where = back.querySelector('.aid-where');
        const r = back.querySelector('.aid-sheet').getBoundingClientRect();
        return { msg, at: where.hidden ? '' : back.querySelector('.aid-at').textContent, inView: r.top >= -1 && r.bottom <= window.innerHeight + 1, family: (window.siteDoorFamily() || {}).name };
      });
      if (!sheet.family || !sheet.msg.includes(sheet.family)) probs.push('the message does not name the family');
      if (!/ways:(reader|recipe)/.test(sheet.msg)) probs.push('the message names no way');
      if (!sheet.inView) probs.push('the sheet runs off the screen');
      /* the code that hands the page on: drawn on a press, naming the page's own address */
      await page.click('.aid-back [data-hand]');
      const code = await page.waitForSelector('.aid-back .aid-qr-img svg', { timeout: 8000 }).then(() => page.evaluate(() => {
        const back = document.querySelector('.aid-back'), r = back.querySelector('.aid-qr-img').getBoundingClientRect();
        return { url: back.querySelector('.aid-qr-url').textContent, w: Math.round(r.width), wide: document.documentElement.scrollWidth - window.innerWidth };
      }), () => null);
      if (!code) probs.push('no code drawn when asked');
      else {
        if (!code.url || !code.url.endsWith(path.replace(/\/+$/, ''))) probs.push('the code names ' + code.url + ', not this page');
        if (code.w < 120) probs.push('the code is too small to scan (' + code.w + 'px)');
        if (code.wide > 1) probs.push('the code pushes the page sideways');
      }
      if (SHOTS) await page.screenshot({ path: join(SHOTS, (path.replace(/\//g, '_') || 'root') + '-' + view.name + '.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      const closed = await page.evaluate(() => document.querySelector('.aid-back').hidden && document.activeElement && document.activeElement.classList.contains('aid-pill'));
      if (!closed) probs.push('Escape did not close it back to the button');
      if (errors.length) probs.push('errors: ' + errors.slice(0, 2).join(' | '));
      line(!probs.length, path, view.name, probs.length ? probs.join('; ') : (sheet.at ? 'at ' + sheet.at : 'no marked parts'));
    } catch (e) {
      line(false, path, view.name, 'threw: ' + String(e && e.message || e).split('\n')[0]);
    }
    await page.close();
  }
  await context.close();
}
await browser.close();
server.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length} passed, ${bad.length} failed${writes.length ? ` · ${writes.length} writes refused` : ''}`);
process.exit(bad.length ? 1 : 0);
