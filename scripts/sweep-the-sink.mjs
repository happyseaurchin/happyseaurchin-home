#!/usr/bin/env node
// sweep-the-sink — the picture store (ways:stills 9) holds the bytes behind links the picture-books carry.
// When a picture is deleted from a book, or a book is set aside, nothing on any beach points at its file
// any more. This sweeps such files: every object in the bucket that NO gallery book — at the apex or at
// any table the worlds register names — references, and that is older than an hour, is removed.
//
//   node scripts/sweep-the-sink.mjs              dry run: lists what would go, and what stays and why
//   node scripts/sweep-the-sink.mjs --confirm    removes them
//
// Needs SUPABASE_SERVICE_KEY in .env.observer (git-ignored) — the store's published anon key can add
// and read, never delete, which is by design. Fails CLOSED: if any index or book cannot be read, nothing
// is removed, because an unreadable book might be the one that references a file.
import fs from 'node:fs';
import path from 'node:path';

for (const f of [path.join(process.cwd(), '.env.observer'), path.join(path.dirname(new URL(import.meta.url).pathname), '..', '.env.observer')]) {
  try { for (const line of fs.readFileSync(f, 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); } } catch { /* none here */ }
}
const APEX = process.env.APEX || 'https://beach.happyseaurchin.com';
const SINK = 'https://wnprucjylftyktxprogp.supabase.co';
const BUCKET = 'stills';
const PUBLIC = `${SINK}/storage/v1/object/public/${BUCKET}/`;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const CONFIRM = process.argv.includes('--confirm');
const GRACE_MS = 60 * 60 * 1000;
if (!KEY) { console.error('SUPABASE_SERVICE_KEY is not set — put it in .env.observer (never in a block, never in git)'); process.exit(2); }

const H = { Authorization: `Bearer ${KEY}`, apikey: KEY, 'Content-Type': 'application/json' };
async function getJSON(url) { const r = await fetch(url, { headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(`${url} → ${r.status}`); return r.json(); }
async function index(origin) { return (await getJSON(`${origin}/.well-known/pscale-beach`)).blocks || []; }
async function block(origin, name) { return getJSON(`${origin}/.well-known/pscale-beach?block=${encodeURIComponent(name)}`); }

// every link any entry carries at 4, however deep the book is nested
function links(node, out) { if (!node || typeof node !== 'object') return out; if (typeof node['4'] === 'string') out.push(node['4']); for (const k of Object.keys(node)) if (k === '_' || /^[1-9]$/.test(k)) links(node[k], out); return out; }
// a link names a WORLD: the register's routes → an origin (as the pages resolve it)
function routes(node, out = {}) { if (!node || typeof node !== 'object') return out; if (node._ && typeof node._ === 'object') routes(node._, out); for (const k of Object.keys(node)) if (/^[1-9]$/.test(k)) { const v = node[k]; if (typeof v === 'string') { const p = v.split('→'); if (p.length >= 2 && p[0].trim() && p[1].trim()) out[p[0].trim().toLowerCase()] = p[1].trim(); } else routes(v, out); } return out; }
function toOrigin(r) { r = String(r || '').trim().replace(/\/+$/, ''); if (!r) return null; if (r.startsWith('/')) return /^\/w\/[a-z0-9][a-z0-9-]*$/i.test(r) ? APEX + r : null; try { return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(r) ? r : 'https://' + r).origin; } catch { return null; } }

async function referenced() {
  const origins = new Set([APEX]);
  const reg = await block(APEX, 'worlds').catch(() => null);
  for (const r of Object.values(routes(reg))) { const o = toOrigin(r); if (o) origins.add(o); }
  const refs = new Set(); let books = 0;
  for (const o of origins) {
    const names = (await index(o)).filter((b) => b.startsWith('gallery:'));
    for (const n of names) { const b = await block(o, n); books++; for (const l of links(b, [])) if (l.startsWith(PUBLIC)) refs.add(decodeURIComponent(l.slice(PUBLIC.length))); }
    console.log(`${o.replace(/^https?:\/\//, '')} — ${names.length} book${names.length === 1 ? '' : 's'}`);
  }
  return { refs, books, origins: origins.size };
}

async function listAll(prefix = '') {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${SINK}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: H, body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) });
    if (!r.ok) throw new Error(`list ${prefix || '/'} → ${r.status} ${await r.text()}`);
    const items = await r.json();
    for (const it of items) { if (it.id) out.push({ name: prefix ? `${prefix}/${it.name}` : it.name, size: it.metadata?.size || 0, at: it.created_at || it.updated_at }); else out.push(...await listAll(prefix ? `${prefix}/${it.name}` : it.name)); }
    if (items.length < 1000) break;
  }
  return out;
}

const { refs, books, origins } = await referenced();
const objects = await listAll();
const now = Date.now();
const stay = [], go = [], young = [];
for (const o of objects) { if (refs.has(o.name)) stay.push(o); else if (now - Date.parse(o.at) < GRACE_MS) young.push(o); else go.push(o); }
const mb = (a) => (a.reduce((s, o) => s + o.size, 0) / 1048576).toFixed(1);
console.log(`\n${objects.length} files in the store (${mb(objects)} MB) · ${refs.size} links across ${books} books on ${origins} beach${origins === 1 ? '' : 'es'}`);
console.log(`  stay: ${stay.length} (${mb(stay)} MB) referenced by a book`);
console.log(`  wait: ${young.length} younger than an hour — a picture being taken now is not yet linked`);
console.log(`  go:   ${go.length} (${mb(go)} MB) nothing points at them`);
for (const o of go) console.log(`    ${o.name}  ${(o.size / 1024).toFixed(0)} KB  ${o.at}`);
if (!go.length) process.exit(0);
if (!CONFIRM) { console.log('\ndry run — add --confirm to remove them'); process.exit(0); }
for (let i = 0; i < go.length; i += 100) {
  const chunk = go.slice(i, i + 100).map((o) => o.name);
  const r = await fetch(`${SINK}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: H, body: JSON.stringify({ prefixes: chunk }) });
  if (!r.ok) { console.error(`delete → ${r.status} ${await r.text()}`); process.exit(1); }
  console.log(`removed ${Math.min(i + 100, go.length)} of ${go.length}`);
}
