// The derived latch in the site's pages (bsp-mcp proposals/2026-11-05-the-derived-latch.md §4, step 2): theme.js's
// sitePass carries every page's request to a beach, so a write whose hand's passport says "latch: derived" at 9.3, and
// whose word derives the halves there, goes out with the latch derived from the word in place of it — as secret and as
// new_lock — while an unswitched hand's word and a shared key go as they are; a passport stripped of its marker after
// this device saw it is refused with nothing sent; and the proof at a members' beach, which comes before any read,
// proves in the form kept, else the derived latch first.
//
// A page that loads theme.js alone is served from this repository and opened in headless Chromium against the REAL
// beach handler (pscale-beach's scripts/local-beach.mjs, one open beach and one members' beach on scratch folders); the
// beach's seal is served from the same checkout; every body the page sends to a beach is recorded. No live beach is
// touched: every other address is refused. Exits 1 if any check fails. Needs playwright and chromium.
//
//   BEACH_DIR=<a pscale-beach checkout> node scripts/check-derived-latch.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BEACH_DIR = process.env.BEACH_DIR || resolve(ROOT, '..', 'pscale-beach');
if (!existsSync(join(BEACH_DIR, 'scripts', 'local-beach.mjs'))) { console.error('set BEACH_DIR to a pscale-beach checkout'); process.exit(2); }
let passed = 0, failed = 0;
const ok = (label, cond, detail) => { if (cond) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label + (detail === undefined ? '' : ' — ' + String(detail).slice(0, 300))); } };

// ── the beach's seal in node, with the site's vendored libraries, for the expected keys ──
const resolveName = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === 'tweetnacl') return join(ROOT, 'vendor/nacl-fast.min.js');
  if (request === 'hash-wasm') return join(ROOT, 'vendor/argon2.umd.min.js');
  return resolveName.call(this, request, parent, ...rest);
};
const tmp = mkdtempSync(join(tmpdir(), 'check-latch-'));
writeFileSync(join(tmp, 'seal.cjs'), readFileSync(join(BEACH_DIR, 'button/seal.js'), 'utf8'));
const S = require(join(tmp, 'seal.cjs'));

// ── two local beaches, the real handler on scratch folders ──
const OPEN = 'http://127.0.0.1:8891', GATED = 'http://127.0.0.1:8892';
const wire = (o) => o + '/.well-known/pscale-beach';
function beach(port, base, env) {
  const dir = mkdtempSync(join(tmpdir(), 'check-latch-beach-'));
  const proc = spawn('node', [join(BEACH_DIR, 'scripts', 'local-beach.mjs'), '--dir', dir, '--port', String(port), '--origin', base], { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, ...env } });
  return { proc, dir };
}
const beaches = [beach(8891, 'open.latch.test', {}), beach(8892, 'gated.latch.test', { BEACH_GATE: 'members', BEACH_GATE_SECRET: 'check-latch-gate', BEACH_KEEPERS: 'keeper' })];
async function up(o) { for (let i = 0; i < 80; i++) { try { if ((await fetch(wire(o))).status < 500) return true; } catch {} await new Promise((r) => setTimeout(r, 250)); } return false; }
const post = async (o, block, body) => { const r = await fetch(wire(o) + '?block=' + encodeURIComponent(block), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spindle: '', ...body }) }); return r.status; };
const marker = (h) => `latch: derived — this word reaches a beach only as the latch derived from it (seal.js latch: Argon2id, salt latch:${h}), never as itself · since 2026-11-05T18:00:00Z · swept 2026-11-05T18:00:00Z`;

// ── the site, and a page that loads theme.js alone ──
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/latch-test') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); res.end('<!doctype html><html><head><script src="/theme.js"></script></head><body><p>derived latch</p></body></html>'); return; }
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:' + server.address().port;

const W_ADA = 'rowan-pier-swallow-plover-41', W_BOB = 'flint-harbour-lotus-77', W_CY = 'cedar-lamp-quiet-river-12', W_DEE = 'birch-cove-ember-58';
const PROJECT = 'a-shared-project-lock-for-the-check';
const { chromium } = require('playwright');
let browser;
try {
  if (!await up(OPEN) || !await up(GATED)) throw new Error('a local beach did not start');
  const L_ADA = await S.latch(W_ADA, 'ada'), L_CY = await S.latch(W_CY, 'cy');
  const nine = async (word, h) => ({ ...S.published(await S.pair(word, h)), 3: marker(h) });
  await post(OPEN, 'passport:ada', { content: { _: 'ADA', 9: await nine(W_ADA, 'ada') }, new_lock: L_ADA });
  await post(OPEN, 'now:ada', { content: { _: 'ada now' }, new_lock: L_ADA });
  await post(OPEN, 'passport:bob', { content: { _: 'BOB' }, new_lock: W_BOB });
  await post(OPEN, 'now:bob', { content: { _: 'bob now' }, new_lock: W_BOB });
  await post(OPEN, 'spine:shared', { content: { _: 'a family under a shared lock' }, new_lock: PROJECT });
  await post(GATED, 'passport:cy', { content: { _: 'CY', 9: await nine(W_CY, 'cy') }, new_lock: L_CY });
  await post(GATED, 'passport:dee', { content: { _: 'DEE' }, new_lock: W_DEE });
  await post(GATED, 'settings', { content: { _: 'the beach settings' }, new_lock: 'OP' });

  browser = await chromium.launch();
  const page = await browser.newPage();
  const sent = [];
  await page.route('**/*', async (route) => {
    const u = route.request().url();
    if (u.startsWith(SITE)) return route.continue();
    if (u.startsWith(OPEN) || u.startsWith(GATED)) {
      const r = route.request();
      if (r.method() === 'POST') { let b = null; try { b = JSON.parse(r.postData() || 'null'); } catch {} if (b) sent.push({ beach: u.startsWith(OPEN) ? 'open' : 'gated', block: b.block, secret: b.secret, new_lock: b.new_lock }); }
      return route.continue();
    }
    const m = /^https:\/\/beach\.happyseaurchin\.com\/button\/(seal\.js|vendor\/[a-z0-9.-]+\.js)$/.exec(u);
    if (m) return route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(join(BEACH_DIR, 'button', m[1])) });
    return route.abort();   // no live beach, no other address
  });
  await page.goto(SITE + '/latch-test');
  const send = (beachUrl, body) => page.evaluate(async ([u, b]) => {
    const r = await fetch(u + '?block=' + encodeURIComponent(b.block), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, [wire(beachUrl), body]);
  const lastTo = (block) => [...sent].reverse().find((s) => s.block === block);

  console.log('\na page\'s write, through theme.js');
  let r = await send(OPEN, { block: 'now:ada', spindle: '1', content: 'from a page', secret: W_ADA });
  ok("a switched hand's write lands, sent with the derived latch and never the word", r.status === 200 && lastTo('now:ada')?.secret === L_ADA, JSON.stringify(r) + ' ' + JSON.stringify(lastTo('now:ada')));
  r = await send(OPEN, { block: 'days:ada', content: { _: 'ada days' }, new_lock: W_ADA });
  ok('a founding under the word goes with the derived latch as its new lock, and the passport takes it', r.status === 200 && lastTo('days:ada')?.new_lock === L_ADA, JSON.stringify(r));
  r = await send(OPEN, { block: 'now:bob', spindle: '1', content: 'bob', secret: W_BOB });
  ok("an unswitched hand's word goes as it is", r.status === 200 && lastTo('now:bob')?.secret === W_BOB, JSON.stringify(r));
  await page.evaluate(() => localStorage.setItem('render:who', 'ada'));
  r = await send(OPEN, { block: 'spine:shared', spindle: '1', content: 'shared', secret: PROJECT });
  ok("a shared lock goes as it is, even signed as a switched hand: it derives no hand's halves", r.status === 200 && lastTo('spine:shared')?.secret === PROJECT, JSON.stringify(r));
  ok("no request carried ada's word", !sent.some((s) => s.secret === W_ADA || s.new_lock === W_ADA));

  console.log('\na beach that stops saying the form (§4.4)');
  await post(OPEN, 'passport:ada', { spindle: '9', content: S.published(await S.pair(W_ADA, 'ada')), secret: L_ADA });
  await page.reload();
  const before = sent.length;
  r = await send(OPEN, { block: 'now:ada', spindle: '2', content: 'told a lie', secret: W_ADA });
  ok('a write for a hand this device saw switched is refused, with nothing sent', r.status === 403 && r.body?.code === 'form_gone' && sent.slice(before).every((s) => s.block !== 'now:ada'), JSON.stringify(r));

  console.log("\nthe proof at a members' beach");
  const prove = (name, word) => page.evaluate(async ([g, n, w]) => {
    await window.siteKeys.ready();
    await window.siteKeys.set('passport-latch:' + n + '@' + g.replace(/^https?:\/\//, ''), w);
    return window.sitePass.prove({ beach: g, name: n, ask: false });
  }, [GATED, name, word]);
  r = await prove('cy', W_CY);
  const cyProofs = sent.filter((s) => s.beach === 'gated' && s.block === 'passport:cy');
  ok('a switched member proves with the derived latch, and the word is never sent', r?.ok === true && cyProofs.length === 1 && cyProofs[0].secret === L_CY, JSON.stringify(r) + ' ' + cyProofs.length);
  r = await prove('dee', W_DEE);
  const deeProofs = sent.filter((s) => s.beach === 'gated' && s.block === 'passport:dee');
  ok('an unswitched member proves with the word, after the derived latch is refused', r?.ok === true && deeProofs.length === 2 && deeProofs[1].secret === W_DEE, JSON.stringify(r) + ' ' + deeProofs.length);
  ok('…and this device keeps the form each proved with', (await page.evaluate((g) => [localStorage.getItem('beach-form:' + g + '|cy'), localStorage.getItem('beach-form:' + g + '|dee')], GATED)).join(',') === 'derived:,word');
} catch (e) {
  failed++; console.error('  ✗ ' + ((e && e.stack) || e));
} finally {
  if (browser) await browser.close();
  server.close();
  for (const b of beaches) { b.proc.kill(); rmSync(b.dir, { recursive: true, force: true }); }
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`\nderived latch at the site: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
