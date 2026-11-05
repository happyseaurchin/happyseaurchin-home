// vault.js checked offline: the vault's two keys, its re-seal, and the round trip against the router's own vectors.
// The beach is mocked as global fetch (a latch per block, spindle writes, appends), so every request vault.js makes is
// seen; the cipher is the beach's own seal (button/seal.js) with the site's vendored tweetnacl and hash-wasm, the same
// bytes the beach serves beside it. Proves: a vault is founded latched under the passport's key and sealed under a vault
// key of its own, which no request ever carries; the canary opens under the vault key and not under the latch; a vault key
// that is the latch is refused; an entry kept opens under the vault key alone; a vault founded under one phrase opens with
// it, and re-sealed under a vault key opens under that key alone, its latch unchanged and its law replaced; the salt is the
// beach's address, so what vault.js seals opens under the router's key (keys.ts, the shared vectors' key_hex) and what
// keys.ts sealed opens in vault.js; and a vault stands at the beach a page reads, never a table or a world beneath it.
//
//   node scripts/check-vault.mjs
//   SEAL_JS=<path or url> node scripts/check-vault.mjs           the seal to check against (default: the live beach's)
//   GRAY_VECTORS=<path or url> node scripts/check-vault.mjs      the shared vectors (default: a bsp-mcp-server checkout
//                                                                beside this one, else the repository's own on GitHub)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';

const here = dirname(fileURLToPath(import.meta.url)), site = resolve(here, '..');
const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const ok = (label, cond, detail) => { if (cond) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label + (detail === undefined ? '' : ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)))); } };
const text = async (from) => /^https?:/.test(from) ? (await (await fetch(from)).text()) : readFileSync(resolve(from), 'utf8');

// ── the seal, with its two libraries as the site vendors them ──
const realFetch = globalThis.fetch;
const sealFrom = process.env.SEAL_JS || (existsSync(resolve(site, '../../../../pscale-beach/button/seal.js')) ? resolve(site, '../../../../pscale-beach/button/seal.js') : existsSync(resolve(site, '../pscale-beach/button/seal.js')) ? resolve(site, '../pscale-beach/button/seal.js') : 'https://beach.happyseaurchin.com/button/seal.js');
const tmp = mkdtempSync(join(tmpdir(), 'check-vault-'));
const resolveName = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === 'tweetnacl') return join(site, 'vendor/nacl-fast.min.js');
  if (request === 'hash-wasm') return join(site, 'vendor/argon2.umd.min.js');
  return resolveName.call(this, request, parent, ...rest);
};
writeFileSync(join(tmp, 'seal.cjs'), await text(sealFrom));
const S = require(join(tmp, 'seal.cjs'));
globalThis.beachSeal = S;
const vault = require(join(site, 'vault.js'));
const nacl = require(join(site, 'vendor/nacl-fast.min.js'));
console.log('seal: ' + sealFrom);

// ── a beach, mocked: a latch per block (a hash, as the beach keeps one), its writes recorded ──
const ORIGIN = 'https://beach.happyseaurchin.com', SENT = [];
let BLOCKS = {}, LATCH = {};
const hash = (k) => 'h:' + Buffer.from(String(k)).toString('base64');
const walk = (b, sp) => String(sp).replace('.', '').split('').map((c) => (c === '0' ? '_' : c));
function at(b, sp) { let n = b; for (const k of walk(b, sp)) { n = n && typeof n === 'object' ? n[k] : undefined; } return n; }
function put(b, sp, v) { const ks = walk(b, sp); let n = b; ks.slice(0, -1).forEach((k) => { if (typeof n[k] !== 'object' || n[k] === null) n[k] = n[k] == null ? {} : { _: n[k] }; n = n[k]; }); n[ks[ks.length - 1]] = v; }
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  if (!u.pathname.endsWith('/.well-known/pscale-beach')) return realFetch(url, init);
  if (!init.method || init.method === 'GET') {
    const b = BLOCKS[u.searchParams.get('block')];
    if (!b) return json(404, { error: 'not found', code: 'not_found' });
    const sp = u.searchParams.get('spindle');
    return json(200, sp ? at(b, sp) : b);
  }
  const body = JSON.parse(init.body); SENT.push(init.body);
  const name = body.block, b = BLOCKS[name];
  if (!b) {
    if (body.content === undefined) return json(404, { error: 'not found' });
    BLOCKS[name] = JSON.parse(JSON.stringify(body.content)); if (body.new_lock) LATCH[name] = hash(body.new_lock);
    return json(200, { ok: true });
  }
  if (LATCH[name] && LATCH[name] !== hash(body.secret)) return json(403, { error: 'secret does not match', code: 'lock_required' });
  if (body.append) { let k = 1; while (b[String(k)] !== undefined) k++; b[String(k)] = JSON.parse(JSON.stringify(body.content)); return json(200, { ok: true, slot: String(k) }); }
  if (!body.spindle) { if (!body.confirm) return json(409, { code: 'confirm_required' }); BLOCKS[name] = body.content; return json(200, { ok: true }); }
  put(b, body.spindle, JSON.parse(JSON.stringify(body.content)));
  return json(200, { ok: true });
};
const carried = (k) => SENT.some((s) => s.includes(k));

// throwaway test words, never anyone's key
const LATCH_KEY = 'reed lantern harbour 31', VAULT_KEY = 'quartz meadow kestrel lotus 58', OLD = 'one phrase for both 12', NEW = 'a vault key of its own 77';

console.log('\n— a vault founded with two keys —');
const LAW = 'vault:ada — the vault, founded by the check (two keys)';
ok('founded', await vault.found(ORIGIN, 'ada', LATCH_KEY, VAULT_KEY, LAW).catch((e) => e.message) === true);
ok('born latched under the passport’s key', LATCH['vault:ada'] === hash(LATCH_KEY));
const canary = BLOCKS['vault:ada']['9'];
ok('the canary opens under the vault key, salted with the beach’s address', /^canary — sealed /.test(await vault.open(canary, VAULT_KEY, ORIGIN) || ''));
ok('and not under the latch', (await vault.open(canary, LATCH_KEY, ORIGIN)) === null);
ok('and not under the bare handle as salt (the other addressing form)', (await vault.open(canary, VAULT_KEY, 'ada')) === null);
const slot = await vault.keep(ORIGIN, 'ada', LATCH_KEY, VAULT_KEY, 'image key — Google, kept by the check', 'IMAGE-KEY-VALUE');
ok('an entry kept, appended at 1', slot === '1' && BLOCKS['vault:ada']['1']._ === 'image key — Google, kept by the check');
let r = await vault.read(ORIGIN, 'ada', VAULT_KEY);
ok('read under the vault key: the entry opens, the canary opens', r.exists && r.canary === 'opens' && r.entries.length === 1 && r.entries[0].text === 'IMAGE-KEY-VALUE', r);
r = await vault.read(ORIGIN, 'ada', LATCH_KEY);
ok('read under the latch: nothing opens', r.canary === 'sealed' && r.entries.every((e) => !e.opened), r);
ok('the vault key was never sent to the beach', !carried(VAULT_KEY));
ok('every write carried the latch, never a lock of its own beneath the root', SENT.filter((s) => JSON.parse(s).new_lock).length === 1);
ok('a vault key that is the latch is refused', /must not be/.test(await vault.found(ORIGIN, 'bea', LATCH_KEY, LATCH_KEY, LAW).then(() => '', (e) => e.message)));
ok('two keys are asked for', /two keys/.test(await vault.found(ORIGIN, 'bea', LATCH_KEY, '', LAW).then(() => '', (e) => e.message)));
ok('a write under the vault key is refused at the latch', /latched with/.test(await vault.keep(ORIGIN, 'ada', VAULT_KEY, VAULT_KEY, 'x', 'y').then(() => '', (e) => e.message)));

console.log('\n— a vault founded under one phrase, re-sealed under a vault key —');
SENT.length = 0;
// as the page founded one before: latched and sealed under the one phrase
const S1 = await vault.seal('canary — the old way', OLD, ORIGIN), E1 = await vault.seal('PLACE-KEY-VALUE', OLD, ORIGIN), E2 = await vault.seal('ORIK-KEY-VALUE', OLD, ORIGIN);
BLOCKS['vault:cy'] = { _: 'vault:cy — ONE sovereign', '1': { _: 'picture place — supabase', '1': E1 }, '2': { _: 'Orik at brackenfoot-open', '1': E2 }, '9': S1 };
LATCH['vault:cy'] = hash(OLD);
r = await vault.read(ORIGIN, 'cy', OLD);
ok('it opens with the one phrase, as ever', r.canary === 'opens' && r.entries.every((e) => e.opened), r);
const LAW2 = 'vault:cy — TWO KEYS: latched with the passport’s key, sealed with a vault key of its own';
const done = await vault.reseal(ORIGIN, 'cy', OLD, OLD, NEW, LAW2).catch((e) => ({ error: e.message }));
ok('re-sealed: both entries and the canary, read back under the vault key', done.resealed === 2 && done.left === 0 && done.canary === 'opens', done);
r = await vault.read(ORIGIN, 'cy', NEW);
ok('under the vault key every entry opens', r.canary === 'opens' && r.entries.map((e) => e.text).join(',') === 'PLACE-KEY-VALUE,ORIK-KEY-VALUE', r);
r = await vault.read(ORIGIN, 'cy', OLD);
ok('under the old phrase nothing opens now', r.canary === 'sealed' && r.entries.every((e) => !e.opened), r);
ok('the latch is unchanged: the passport’s phrase', LATCH['vault:cy'] === hash(OLD));
ok('the law at the root says two keys, the entries standing', BLOCKS['vault:cy']._ === LAW2 && BLOCKS['vault:cy']['1']._ === 'picture place — supabase');
ok('the new vault key was never sent to the beach', !carried(NEW));
ok('a re-seal to the same phrase is refused', /choose another|of its own/.test(await vault.reseal(ORIGIN, 'cy', OLD, NEW, NEW).then(() => '', (e) => e.message)));

console.log('\n— the router’s own vectors (keys.ts), both ways —');
let fx = null;
const fxFrom = process.env.GRAY_VECTORS || [resolve(site, '../../../../bsp-mcp-server/scripts/fixtures/gray-vectors.json'), resolve(site, '../bsp-mcp-server/scripts/fixtures/gray-vectors.json')].find((p) => existsSync(p))
  || 'https://raw.githubusercontent.com/pscale-commons/bsp-mcp-server/main/scripts/fixtures/gray-vectors.json';
try { fx = JSON.parse(await text(fxFrom)); } catch (e) { console.log('  · the vectors could not be read from ' + fxFrom + ': ' + e.message); }
if (fx) {
  console.log('  vectors: ' + fxFrom);
  for (const v of fx.vectors) {
    ok(v.name + ': vault.js opens the keys.ts envelope', (await vault.open(v.envelope, v.secret, v.salt)) === v.plaintext);
    const env = await vault.seal(v.plaintext, v.secret, v.salt);
    const opened = nacl.secretbox.open(Buffer.from(env['1'], 'base64'), Buffer.from(env['2'], 'base64'), Buffer.from(v.key_hex, 'hex'));
    ok(v.name + ': the router’s key (key_hex) opens the vault.js envelope', !!opened && Buffer.from(opened).toString('utf8') === v.plaintext);
  }
} else failed++;

console.log('\n— where a vault stands —');
ok('a table at the apex: the apex', vault.home('https://beach.happyseaurchin.com/w/brackenfoot-open') === ORIGIN);
ok('a world beneath the apex: the apex', vault.home('https://earth.beach.happyseaurchin.com') === ORIGIN);
ok('a members’ beach: itself', vault.home('https://beach.bringingtheflavour.com') === 'https://beach.bringingtheflavour.com');
ok('a beach on this computer: itself, its port kept', vault.home('http://127.0.0.1:47161/') === 'http://127.0.0.1:47161');

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
