#!/usr/bin/env node
// One-shot. Phase B of beach.json protection: installs locks at beach:_,
// beach:8, beach:9 using PSCALE_BEACH_LOCK. Idempotent — rerunning is a
// no-op as long as the lock value is unchanged. Refuses to overwrite if a
// position is already locked with a different secret.
//
// PREREQ: Phase A must be deployed first. Without the per-position lock
// derivation in api/pscale-beach.js, installing the beach:_ lock would
// gate ALL sub-position writes (including xstream presence heartbeats at
// beach:1.X) — bricking the beach. Verify the production endpoint is
// running the Phase A code before invoking this script.
//
//   node scripts/bootstrap-beach-locks.js
//   BEACH_URL=https://staging.example.com/.well-known/pscale-beach \
//     node scripts/bootstrap-beach-locks.js
//
// Reads PSCALE_BEACH_LOCK from process.env first, then .env.local at the
// repo root. Requires Node 18+ (native fetch).

const { readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');

const REPO_ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(REPO_ROOT, '.env.local');
const ENDPOINT = process.env.BEACH_URL || 'https://happyseaurchin.com/.well-known/pscale-beach';

const POSITIONS = [
  { spindle: '_', purpose: 'whole-block + underscore (beach purpose statement)' },
  { spindle: '8', purpose: 'local conventions' },
  { spindle: '9', purpose: 'metadata' },
];

function readLockSecret() {
  if (process.env.PSCALE_BEACH_LOCK) return process.env.PSCALE_BEACH_LOCK;
  let raw;
  try {
    raw = readFileSync(ENV_PATH, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error(`PSCALE_BEACH_LOCK is not in process.env and ${ENV_PATH} does not exist. Either export PSCALE_BEACH_LOCK or create .env.local with PSCALE_BEACH_LOCK=<secret>.`);
    }
    throw e;
  }
  const match = raw.match(/^[ \t]*PSCALE_BEACH_LOCK[ \t]*=[ \t]*(?:"([^"]*)"|'([^']*)'|([^\r\n]*?))[ \t]*$/m);
  if (!match) {
    throw new Error(`PSCALE_BEACH_LOCK not found in ${ENV_PATH}. Add line: PSCALE_BEACH_LOCK=<secret>`);
  }
  const value = match[1] ?? match[2] ?? match[3] ?? '';
  if (!value) throw new Error(`PSCALE_BEACH_LOCK is empty in ${ENV_PATH}.`);
  return value;
}

async function installLock(spindle, secret) {
  // Send both secret and new_lock with the same value:
  //   - no existing lock → secret ignored, new_lock installs
  //   - existing matches → secret passes rotation check, new_lock no-ops
  //   - existing differs → 403 lock_required (refuse to clobber)
  const url = `${ENDPOINT}?block=beach`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spindle, secret, new_lock: secret }),
  });
  let body = null;
  try { body = await r.json(); } catch {}
  return { status: r.status, body };
}

function redact(s) {
  if (!s) return '(empty)';
  if (s.length <= 6) return '*'.repeat(s.length);
  return `${s.slice(0, 3)}…${s.slice(-2)} (${s.length} chars)`;
}

async function main() {
  const secret = readLockSecret();
  console.log(`Bootstrapping beach.json locks`);
  console.log(`  endpoint : ${ENDPOINT}`);
  console.log(`  secret   : ${redact(secret)}`);
  console.log('');

  let installed = 0, idempotent = 0, conflict = 0, failed = 0;

  for (const { spindle, purpose } of POSITIONS) {
    process.stdout.write(`  beach:${spindle.padEnd(2)} ${purpose} … `);
    try {
      const { status, body } = await installLock(spindle, secret);
      if (status === 200 && body && body.ok) {
        // Could be fresh install OR no-op rotation; substrate doesn't tell us
        // which. Either way the position is now locked with our secret.
        console.log('OK');
        installed++;
      } else if (status === 403 && body && body.code === 'lock_required') {
        console.log('CONFLICT — already locked with a different secret');
        conflict++;
      } else {
        console.log(`FAILED [${status}] ${body && body.error ? body.error : JSON.stringify(body)}`);
        failed++;
      }
    } catch (e) {
      console.log(`ERROR ${e.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Done: ${installed} locked, ${conflict} conflicts, ${failed} failed.`);
  if (conflict > 0) {
    console.log('');
    console.log('A conflict means a position is locked with a secret different from PSCALE_BEACH_LOCK.');
    console.log('Either rotate the existing lock manually (POST {spindle, secret: <old>, new_lock: <new>}) or');
    console.log('update PSCALE_BEACH_LOCK to match the in-place value.');
  }
  process.exit((conflict + failed) > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
