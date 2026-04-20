#!/usr/bin/env node
// Ingest a single file as a new inventory component.
// Steps: classify → copy into docs/components/{paddedId}-{slug}{ext}
//      → append to pscale-inventory.data.json → build-inventory.js → git commit.
//
// Flags:
//   --dry-run     classify and print; write nothing
//   --no-commit   do everything except git add/commit/push
//   --no-push     commit but don't push
//
// Dedup: content-hash cache at scripts/.ingested-hashes.json (gitignored).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { classify, validate, ValidationError } = require('./classify');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(REPO_ROOT, 'experiments/pscale-inventory.data.json');
const HTML_PATH = path.join(REPO_ROOT, 'experiments/pscale-inventory.html');
const DOCS_DIR = path.join(REPO_ROOT, 'docs/components');
const ZIP_PATH = path.join(REPO_ROOT, 'docs/components.zip');
const BUILD_SCRIPT = path.join(__dirname, 'build-inventory.js');
const HASH_CACHE = path.join(__dirname, '.ingested-hashes.json');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readHashCache() {
  if (!fs.existsSync(HASH_CACHE)) return {};
  try { return JSON.parse(fs.readFileSync(HASH_CACHE, 'utf8')); }
  catch { return {}; }
}

function writeHashCache(cache) {
  fs.writeFileSync(HASH_CACHE, JSON.stringify(cache, null, 2) + '\n');
}

function nextId(data) {
  const ids = Object.keys(data.components).map(Number).filter(Number.isFinite);
  return String((ids.length ? Math.max(...ids) : 0) + 1);
}

function paddedId(id) {
  return String(id).padStart(2, '0');
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { cwd: REPO_ROOT, stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status}`);
  }
}

function ingest(filePath, { dryRun = false, commit = true, push = true } = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`file not found: ${filePath}`);
  }

  const source = fs.readFileSync(filePath);
  const hash = sha256(source);
  const cache = readHashCache();
  if (cache[hash]) {
    console.log(`[ingest] Skipping — already ingested as #${cache[hash].id} (${cache[hash].slug})`);
    console.log(`[ingest] Hash ${hash.slice(0, 12)}… matches ${path.basename(cache[hash].source || '?')}`);
    return { skipped: true, reason: 'duplicate hash', ...cache[hash] };
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const id = nextId(data);

  let entry;
  try {
    entry = classify(filePath, { validateEntry: !dryRun });
  } catch (err) {
    if (err instanceof ValidationError && dryRun) {
      console.error(`[ingest] Validation (dry-run): ${err.message}`);
      entry = err.entry;
    } else {
      throw err;
    }
  }

  const ext = path.extname(filePath) || '.md';
  const destName = `${paddedId(id)}-${entry.slug}${ext}`;
  const destPath = path.join(DOCS_DIR, destName);

  console.log(`[ingest] Classified as #${id}: ${entry.name} [${entry.cat}/${entry.status}]`);
  console.log(`[ingest] Slug: ${entry.slug}`);
  console.log(`[ingest] Products: ${entry.products.join(', ')}`);
  console.log(`[ingest] Desc: ${entry.desc}`);
  console.log(`[ingest] Dest: docs/components/${destName}`);

  if (dryRun) {
    console.log('[ingest] DRY RUN — no changes written');
    return { dryRun: true, id, entry, destPath };
  }

  if (fs.existsSync(destPath)) {
    throw new Error(`destination already exists: ${destPath}`);
  }

  // 1. Copy file
  fs.copyFileSync(filePath, destPath);

  // 2. Append to JSON
  data.components[id] = entry;
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');

  // 3. Regenerate HTML data block + zip
  run('node', [BUILD_SCRIPT]);

  // 4. Record hash
  cache[hash] = { id, slug: entry.slug, source: path.basename(filePath), at: new Date().toISOString() };
  writeHashCache(cache);

  // 5. Git
  if (commit) {
    run('git', ['add', 'experiments/pscale-inventory.data.json', 'experiments/pscale-inventory.html', `docs/components/${destName}`, 'docs/components.zip']);
    const msg = `[inventory] Add #${id}: ${entry.name}`;
    run('git', ['commit', '-m', msg]);
    if (push) {
      run('git', ['push']);
      console.log(`[ingest] Committed and pushed #${id}`);
    } else {
      console.log(`[ingest] Committed #${id} (not pushed; --no-push)`);
    }
  } else {
    console.log(`[ingest] Wrote #${id} (not committed; --no-commit)`);
  }

  return { id, entry, destPath };
}

module.exports = { ingest };

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = {
    dryRun: args.includes('--dry-run'),
    commit: !args.includes('--no-commit'),
    push:   !args.includes('--no-push'),
  };
  const filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) {
    console.error('Usage: ingest.js [--dry-run] [--no-commit] [--no-push] <file>');
    process.exit(1);
  }
  try {
    ingest(filePath, opts);
  } catch (err) {
    console.error(`[ingest] FAILED: ${err.message}`);
    if (err instanceof ValidationError && err.entry) {
      console.error('[ingest] Raw entry:', JSON.stringify(err.entry, null, 2));
    }
    process.exit(2);
  }
}
