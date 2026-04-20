#!/usr/bin/env node
// Foreground inbox watcher. Run in a terminal tab; drop files into
// ~/xstream-inbox/ and they're ingested automatically.
//
//   node scripts/watch-inbox.js
//
// Successes move to inbox/processed/, failures to inbox/errors/ with a .log.
// No chokidar, no launchd — just fs.watch and a small debounce.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ingest } = require('./ingest');

const INBOX = process.env.XSTREAM_INBOX || path.join(os.homedir(), 'xstream-inbox');
const PROCESSED = path.join(INBOX, 'processed');
const ERRORS = path.join(INBOX, 'errors');
const DRY_RUN = process.argv.includes('--dry-run');

for (const d of [INBOX, PROCESSED, ERRORS]) {
  fs.mkdirSync(d, { recursive: true });
}

const SUPPORTED = new Set(['.md', '.txt', '.json', '.jsx', '.js', '.ts', '.tsx', '.html', '.py']);
const STABLE_MS = 1500;
const inFlight = new Set();
const pending = new Map(); // basename → setTimeout id

function shouldProcess(basename) {
  if (basename.startsWith('.')) return false;
  const ext = path.extname(basename).toLowerCase();
  return SUPPORTED.has(ext);
}

async function waitForStable(filePath) {
  let lastSize = -1;
  let stableSince = Date.now();
  while (true) {
    await new Promise(r => setTimeout(r, 300));
    let size;
    try { size = fs.statSync(filePath).size; }
    catch { return false; } // file gone
    if (size !== lastSize) { lastSize = size; stableSince = Date.now(); continue; }
    if (Date.now() - stableSince >= STABLE_MS) return true;
  }
}

async function handle(basename) {
  const filePath = path.join(INBOX, basename);
  if (inFlight.has(basename)) return;
  if (!fs.existsSync(filePath)) return;
  if (!shouldProcess(basename)) return;

  inFlight.add(basename);
  console.log(`[watch] ${basename} → waiting for stable…`);

  try {
    const stable = await waitForStable(filePath);
    if (!stable) { inFlight.delete(basename); return; }

    const result = ingest(filePath, { dryRun: DRY_RUN });

    if (DRY_RUN) {
      console.log(`[watch] ${basename} — dry-run classified, left in place\n`);
      return;
    }

    if (result.skipped) {
      const dest = path.join(PROCESSED, `dup-${Date.now()}-${basename}`);
      fs.renameSync(filePath, dest);
      console.log(`[watch] ${basename} — duplicate, moved to processed/${path.basename(dest)}`);
    } else {
      const dest = path.join(PROCESSED, `${String(result.id).padStart(3, '0')}-${basename}`);
      fs.renameSync(filePath, dest);
      console.log(`[watch] ${basename} → #${result.id} ${result.entry.name} — processed/${path.basename(dest)}\n`);
    }
  } catch (err) {
    const errName = `${Date.now()}-${basename}`;
    const errPath = path.join(ERRORS, errName);
    try { fs.renameSync(filePath, errPath); } catch {}
    fs.writeFileSync(`${errPath}.log`, `${err.stack || err.message}\n`);
    console.error(`[watch] ${basename} FAILED: ${err.message}`);
    console.error(`[watch]   → errors/${errName} (see .log)\n`);
  } finally {
    inFlight.delete(basename);
  }
}

function scheduleHandle(basename) {
  if (pending.has(basename)) clearTimeout(pending.get(basename));
  pending.set(basename, setTimeout(() => {
    pending.delete(basename);
    handle(basename);
  }, 200));
}

// Sweep anything already sitting in inbox when we start
for (const name of fs.readdirSync(INBOX)) {
  const full = path.join(INBOX, name);
  if (fs.statSync(full).isFile() && shouldProcess(name)) scheduleHandle(name);
}

fs.watch(INBOX, (_event, filename) => {
  if (!filename) return;
  scheduleHandle(filename);
});

console.log(`[watch] watching ${INBOX}${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);
console.log(`[watch] drop .md/.txt/.json/.jsx/.py files here — Ctrl-C to stop\n`);
