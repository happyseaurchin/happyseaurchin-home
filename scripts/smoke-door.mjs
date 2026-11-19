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
 *     and, where the page marks its parts, the place reached (or, where the page writes its own
 *     first message through window.siteDoorMessage, that message as it is), the place never a
 *     part with no title ('the part (9)');
 *   - its 'Someone beside you?' button opens theme.js's code card (siteHand) over it, the code
 *     naming the page's own address; Escape closes the card back to the button, then the door;
 *   - Escape closes it and gives focus back to the button;
 *   - no script error and no sideways scroll.
 * A page whose own buttons open the shared door (data-ai-door, as the eight pages that kept doors of their
 * own do since 19 Nov 2026) has no corner button: the door is opened from the first of those buttons that
 * shows, and every check above is run on it, Escape giving focus back to that button.
 * A page that builds a door of its own (window.openDoor) fails: one door, kept in one place (David,
 * 19 Nov 2026: 'use the shared door'), since a copy drifts from it.
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
/* the code card, opened by a data-hand-on button inside a door: drawn, naming this page, and closed
   by Escape back to that button with the door beneath still open */
async function codeCard(page, scope, path, doorOpen) {
  const probs = [];
  const before = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.click(scope + ' [data-hand-on]');
  const code = await page.waitForSelector('dialog.site-hand[open] .sh-img svg', { timeout: 8000 }).then(() => page.evaluate(() => {
    const d = document.querySelector('dialog.site-hand'), img = d.querySelector('.sh-img'), r = img.getBoundingClientRect();
    return { url: img.getAttribute('data-for') || '', shown: d.querySelector('.sh-url').textContent, w: Math.round(r.width), inView: r.top >= -1 && r.bottom <= window.innerHeight + 1, wide: document.documentElement.scrollWidth - window.innerWidth };
  }), () => null);
  if (!code) { probs.push('no code drawn when asked'); return probs; }
  const want = path.replace(/\/+$/, '');
  if (!code.url.startsWith('https://') || !(code.url.endsWith(want) || code.url.split('?')[0].endsWith(want))) probs.push('the code names ' + code.url + ', not this page');
  if (code.shown !== code.url.replace(/^https:\/\//, '')) probs.push('the card says ' + code.shown + ' under a code for ' + code.url);
  if (code.w < 120) probs.push('the code is too small to scan (' + code.w + 'px)');
  if (!code.inView) probs.push('the code runs off the screen');
  if (code.wide > Math.max(1, before)) probs.push('the code pushes the page sideways (' + before + 'px before, ' + code.wide + 'px with it)');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const back = await page.evaluate(([scope, doorOpen]) => {
    const d = document.querySelector('dialog.site-hand'), btn = document.querySelector(scope + ' [data-hand-on]');
    return { closed: !d.open, focus: document.activeElement === btn, door: doorOpen ? !document.querySelector(scope).hidden : true };
  }, [scope, doorOpen]);
  if (!back.closed) probs.push('Escape did not close the code');
  else if (!back.door) probs.push('closing the code closed the door too');
  else if (!back.focus) probs.push('closing the code did not give focus back to its button');
  return probs;
}
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
        /* one door, kept in one place (David, 19 Nov 2026: 'use the shared door'): a door a page builds for itself
           drifts from it, as ai-churn's did, so a page that keeps one fails here; its buttons open the shared one
           when marked data-ai-door */
        line(false, path, view.name, 'keeps a door of its own (window.openDoor): mark its buttons data-ai-door to open the shared door instead');
        await page.close(); continue;
      }
      /* a page whose own buttons open the shared door (data-ai-door): the corner stands aside, and the door is
         opened from the first of those buttons that shows */
      const button = has ? '' : await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-ai-door]:not([data-ai-door="off"])')].find((x) => {
          const r = x.getBoundingClientRect(), cs = getComputedStyle(x);
          /* checkVisibility, since a button in a closed <details> keeps a box but is not shown */
          return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && (!x.checkVisibility || x.checkVisibility({ visibilityProperty: true }));
        });
        if (!b) return '';
        b.setAttribute('data-smoke-opener', '');
        return '‘' + b.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) + '’';
      });
      if (!has && !button) { line(false, path, view.name, 'no corner button'); await page.close(); continue; }
      const opener = has ? pill : page.locator('[data-smoke-opener]');
      const probs = [];
      let sits = [];
      if (has) {
        /* nothing covers it */
        const covered = await page.evaluate(() => {
          const b = document.querySelector('.aid-pill'), r = b.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return top && !b.contains(top) ? (top.tagName.toLowerCase() + (top.className && typeof top.className === 'string' ? '.' + top.className.split(' ')[0] : '')) : '';
        });
        if (covered) probs.push('covered by ' + covered);
        /* and it covers none of the page's own fixed or stuck controls, at the top and after a scroll */
        sits = await page.evaluate(SITS);
        if (sits.length) probs.push('sits over ' + sits.join(', ') + ' at the top');
      }
      /* no sideways scroll */
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (wide > 1) probs.push('sideways scroll ' + wide + 'px');
      /* scroll a third of the way, then open it */
      await page.evaluate(() => window.scrollTo(0, Math.round(document.documentElement.scrollHeight / 3)));
      await page.waitForTimeout(400);
      if (has) {
        sits = await page.evaluate(SITS);
        if (sits.length) probs.push('sits over ' + sits.join(', ') + ' after a scroll');
      }
      if (SHOTS) await page.screenshot({ path: join(SHOTS, (path.replace(/\//g, '_') || 'root') + '-' + view.name + '-closed.png') });
      await opener.click();
      await page.waitForSelector('.aid-back:not([hidden])', { timeout: 8000 });
      await page.waitForTimeout(900);
      const sheet = await page.evaluate(() => {
        const back = document.querySelector('.aid-back'), msg = back.querySelector('.aid-msg').value;
        const where = back.querySelector('.aid-where');
        const r = back.querySelector('.aid-sheet').getBoundingClientRect();
        const own = typeof window.siteDoorMessage === 'function' ? String(window.siteDoorMessage({}) || '') : '';
        return { msg, own, at: where.hidden ? '' : back.querySelector('.aid-at').textContent, inView: r.top >= -1 && r.bottom <= window.innerHeight + 1, family: (window.siteDoorFamily() || {}).name };
      });
      if (sheet.own) {
        /* a page that writes its own first message (window.siteDoorMessage, /mind-meld's one line) is handed it as it is */
        if (sheet.msg !== sheet.own) probs.push('the message is not the page\'s own');
      } else {
        if (!sheet.family || !sheet.msg.includes(sheet.family)) probs.push('the message does not name the family');
        if (!/ways:(reader|recipe)/.test(sheet.msg)) probs.push('the message names no way');
      }
      /* a part the door reads with no title says only its address ('the part (9)', /systemic-kernel until 19 Nov 2026):
       * the page marks the part's name data-part="title", or gives it a heading */
      if (/^the part \(/.test(sheet.at)) probs.push('a marked part has no title the door can read: ' + sheet.at);
      if (!sheet.inView) probs.push('the sheet runs off the screen');
      if (SHOTS) await page.screenshot({ path: join(SHOTS, (path.replace(/\//g, '_') || 'root') + '-' + view.name + '.png') });
      /* the code that hands the page on: a card over the door, naming the page's own address */
      probs.push(...await codeCard(page, '.aid-back', path, true));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      const closed = await page.evaluate((viaPill) => {
        const a = document.activeElement;
        return document.querySelector('.aid-back').hidden && a && (viaPill ? a.classList.contains('aid-pill') : a.hasAttribute('data-smoke-opener'));
      }, !!has);
      if (!closed) probs.push('Escape did not close it back to the button that opened it');
      if (errors.length) probs.push('errors: ' + errors.slice(0, 2).join(' | '));
      line(!probs.length, path, view.name, probs.length ? probs.join('; ') : (button ? 'opened by its own ' + button + ', ' : '') + (sheet.at ? 'at ' + sheet.at : 'no marked parts'));
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
