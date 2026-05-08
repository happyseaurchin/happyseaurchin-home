#!/usr/bin/env node
// Wipe a sibling block from the beach.
//
//   node scripts/wipe-block.js <block-name>
//   BEACH_URL=https://staging.example.com/.well-known/pscale-beach \
//     node scripts/wipe-block.js <block-name>
//
// Auth: if the block has a `_` (whole-block) lock, PSCALE_BEACH_LOCK must
// match it. If no `_` lock is set, wipe proceeds without auth — consistent
// with how unlocked whole-block-replace already behaves.
//
// PSCALE_BEACH_LOCK is read from process.env first, then .env.local at the
// repo root. The `beach`, `sed:*`, and `grain:*` blocks are blocked here
// — substrate cleanup needs different auth and isn't in scope.
//
// Requires Node 18+ (native fetch).

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const REPO_ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(REPO_ROOT, '.env.local');
const ENDPOINT = process.env.BEACH_URL || 'https://happyseaurchin.com/.well-known/pscale-beach';

function readLockSecret() {
  if (process.env.PSCALE_BEACH_LOCK) return process.env.PSCALE_BEACH_LOCK;
  let raw;
  try {
    raw = readFileSync(ENV_PATH, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  const match = raw.match(/^[ \t]*PSCALE_BEACH_LOCK[ \t]*=[ \t]*(?:"([^"]*)"|'([^']*)'|([^\r\n]*?))[ \t]*$/m);
  if (!match) return null;
  const value = match[1] ?? match[2] ?? match[3] ?? '';
  return value || null;
}

function redact(s) {
  if (!s) return '(none)';
  if (s.length <= 6) return '*'.repeat(s.length);
  return `${s.slice(0, 3)}…${s.slice(-2)} (${s.length} chars)`;
}

async function main() {
  const blockName = process.argv[2];
  if (!blockName) {
    console.error('Usage: node scripts/wipe-block.js <block-name>');
    console.error('Example: node scripts/wipe-block.js happyseaurchin__shell');
    process.exit(2);
  }
  if (blockName === 'beach' || blockName.startsWith('sed:') || blockName.startsWith('grain:')) {
    console.error(`Refusing "${blockName}" — script blocks the default beach and substrate-prefixed blocks.`);
    process.exit(2);
  }

  const secret = readLockSecret();
  console.log(`Wiping block "${blockName}"`);
  console.log(`  endpoint : ${ENDPOINT}`);
  console.log(`  secret   : ${redact(secret)}`);
  console.log('');

  const url = `${ENDPOINT}?block=${encodeURIComponent(blockName)}`;
  const body = { confirm: true };
  if (secret) body.secret = secret;

  const r = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let payload = null;
  try { payload = await r.json(); } catch {}
  if (r.ok) {
    console.log(`OK [${r.status}] ${JSON.stringify(payload)}`);
    process.exit(0);
  }
  if (r.status === 403 && payload && payload.code === 'lock_required') {
    console.error(`LOCKED [${r.status}] ${payload.error}`);
    console.error('');
    console.error('The block has a `_` lock. Set PSCALE_BEACH_LOCK to the matching secret.');
    process.exit(1);
  }
  console.error(`FAILED [${r.status}] ${payload && payload.error ? payload.error : JSON.stringify(payload)}`);
  process.exit(1);
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
