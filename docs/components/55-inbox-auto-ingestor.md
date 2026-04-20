# Xstream Inbox Automation — Technical Design Spec

**Repo**: `happyseaurchin/happyseaurchin-home`
**Author**: David Pinto (designed with Claude.ai)
**Target**: Claude Code (implementation)
**Date**: 20 April 2026

---

## Goal

Automate the pipeline: drop a new artifact in a local inbox folder → it gets classified, renamed, placed in `docs/components/`, added to the inventory, HTML regenerated, zip rebuilt, committed and pushed. Zero manual steps after the drop.

## Rationale

Currently, every new artifact requires manual copy, manual classification, manual JSON edit, manual HTML edit, manual zip regeneration, manual commit. This kills momentum. The automation preserves the drop-it-and-forget moment of creation.

## Architecture

Three layers:

1. **Source of truth** — `experiments/pscale-inventory.data.json`. All component data lives here. Currently it's inlined in the HTML; we extract it.

2. **Build step** — `scripts/build-inventory.js`. Reads the JSON, writes the component data into the HTML between sentinel comments. Deterministic. Also regenerates `docs/components.zip`.

3. **Ingestion pipeline** — watches `~/xstream-inbox/`, invokes Claude Code headlessly for classification, places the file, updates JSON, runs build, commits, pushes.

Design principle: the HTML rendering logic is untouched by ingestion. Only the data block inside the marker region changes. Every ingestion is one commit, trivially revertible.

---

## Phase 1 — Refactor HTML to consume external JSON registry

**One-time work. One PR. Verify visual parity before merging.**

### Step 1.1 — Extract inventory data to JSON

Create `experiments/pscale-inventory.data.json`:

```json
{
  "categories": {
    "A": { "name": "Foundation", "dark": "#6ea8d9", "light": "#2e6da4" },
    "B": { "name": "Process", "dark": "#7cc47c", "light": "#3a8a3a" },
    "C": { "name": "Creation", "dark": "#c9a84c", "light": "#9a7a20" },
    "D": { "name": "Interface", "dark": "#d97e6e", "light": "#b04a3a" },
    "E": { "name": "Distribution", "dark": "#c76ec7", "light": "#8e3a8e" },
    "F": { "name": "Network (SAND)", "dark": "#6ecac7", "light": "#2a8a87" },
    "G": { "name": "Structure", "dark": "#aaa", "light": "#666" },
    "H": { "name": "Shell", "dark": "#8888cc", "light": "#5555a0" },
    "I": { "name": "Relational", "dark": "#cc8888", "light": "#a05555" },
    "J": { "name": "Context", "dark": "#88ccaa", "light": "#3a8a6a" },
    "K": { "name": "SAND Mechanics", "dark": "#5cb8b5", "light": "#2a8a87" },
    "L": { "name": "Meta", "dark": "#b8b85c", "light": "#7a7a20" },
    "M": { "name": "Primitives", "dark": "#c0a0d0", "light": "#7a5a8a" }
  },
  "products": {
    "MAGI": "#6688cc",
    "Xstream": "#cc8866",
    "Onen": "#88cc66",
    "Creation Tools": "#cccc66"
  },
  "components": {
    "1": {
      "name": "Pscale Block",
      "cat": "A",
      "desc": "Nested JSON, semantic numbers as addresses. Self-describing. The core mechanism.",
      "status": "code",
      "products": ["MAGI", "Xstream", "Onen", "Creation Tools"],
      "slug": "pscale-block"
    },
    "...": "(extract all 54 from the HTML, merging COMPONENTS + PRODUCT_MAP + STATUS + DOC_SLUGS)"
  }
}
```

**Per-component schema:**
- `name` (string) — from `COMPONENTS[id].name`
- `cat` (string, A–M) — from `COMPONENTS[id].cat`
- `desc` (string) — from `COMPONENTS[id].desc`
- `status` (enum: `"code" | "spec" | "concept"`) — from `STATUS[id]`
- `products` (array of product names) — from `PRODUCT_MAP[id]`
- `slug` (string, kebab-case) — from `DOC_SLUGS[id]`

### Step 1.2 — Add sentinel comments to HTML

In `experiments/pscale-inventory.html`, locate the six inline `const` declarations: `CATEGORIES`, `PRODUCTS`, `COMPONENTS`, `PRODUCT_MAP`, `STATUS`, `DOC_SLUGS`.

Wrap them in sentinel comments — this is the only region the build script will touch:

```js
// @@INVENTORY_DATA_START — auto-generated from pscale-inventory.data.json, do not edit by hand
const CATEGORIES = { ... };
const PRODUCTS = { ... };
const COMPONENTS = { ... };
const PRODUCT_MAP = { ... };
const STATUS = { ... };
const DOC_SLUGS = { ... };
// @@INVENTORY_DATA_END
```

Also: the title count (`"54 components · 3 products"`) should be derived. Replace the hardcoded string with a placeholder the rendering code computes from the data:

```js
document.getElementById('title').textContent =
  `${Object.keys(COMPONENTS).length} components · ${Object.keys(PRODUCTS).length - 1} products`;
```
(The `-1` accounts for "Creation Tools" if you still treat the count as three main products. Adjust to taste.)

### Step 1.3 — Create `scripts/build-inventory.js`

Reads `experiments/pscale-inventory.data.json`, decomposes it into the six constants, replaces the HTML sentinel region with the regenerated JS, writes the result back. Also regenerates `docs/components.zip`.

```js
// scripts/build-inventory.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(REPO_ROOT, 'experiments/pscale-inventory.data.json');
const HTML_PATH = path.join(REPO_ROOT, 'experiments/pscale-inventory.html');
const DOCS_DIR = path.join(REPO_ROOT, 'docs/components');
const ZIP_PATH = path.join(REPO_ROOT, 'docs/components.zip');

const START_MARK = '// @@INVENTORY_DATA_START';
const END_MARK = '// @@INVENTORY_DATA_END';

function buildDataBlock(data) {
  const { categories, products, components } = data;

  // Decompose into the four constants the HTML expects
  const COMPONENTS = {};
  const PRODUCT_MAP = {};
  const STATUS = {};
  const DOC_SLUGS = {};

  for (const [id, c] of Object.entries(components)) {
    COMPONENTS[id] = { name: c.name, cat: c.cat, desc: c.desc };
    PRODUCT_MAP[id] = c.products;
    STATUS[id] = c.status;
    DOC_SLUGS[id] = c.slug;
  }

  return [
    START_MARK + ' — auto-generated from pscale-inventory.data.json, do not edit by hand',
    `const CATEGORIES = ${JSON.stringify(categories, null, 2)};`,
    `const PRODUCTS = ${JSON.stringify(products, null, 2)};`,
    `const COMPONENTS = ${JSON.stringify(COMPONENTS, null, 2)};`,
    `const PRODUCT_MAP = ${JSON.stringify(PRODUCT_MAP, null, 2)};`,
    `const STATUS = ${JSON.stringify(STATUS, null, 2)};`,
    `const DOC_SLUGS = ${JSON.stringify(DOC_SLUGS, null, 2)};`,
    END_MARK,
  ].join('\n');
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  const startIdx = html.indexOf(START_MARK);
  const endIdx = html.indexOf(END_MARK);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Sentinel markers not found in HTML');
  }
  const endOfEndLine = html.indexOf('\n', endIdx);

  const newBlock = buildDataBlock(data);
  const newHtml = html.slice(0, startIdx) + newBlock + html.slice(endOfEndLine);

  fs.writeFileSync(HTML_PATH, newHtml);

  // Regenerate zip
  execSync(`cd ${path.dirname(DOCS_DIR)} && zip -rq components.zip components/`);

  console.log(`Built: ${Object.keys(data.components).length} components`);
}

main();
```

### Step 1.4 — Verify parity

Run `node scripts/build-inventory.js`. Open the HTML locally, compare against current live version. Filters, tooltips, counts, colors should all match. If yes, commit.

**Commit message**: `[inventory] Extract data to JSON registry + build script`

---

## Phase 2 — Classifier and ingestion

### Step 2.1 — Classifier prompt

Create `scripts/prompts/classify-component.md`:

```markdown
You are classifying a new component for David Pinto's Xstream inventory.

## Task

Read the attached document. Output ONE JSON object classifying it. No prose, no markdown fences, no commentary — pure JSON.

## Schema

{
  "name": "Short display name, 2-5 words, title case",
  "cat": "single letter A-M",
  "desc": "One sentence, under 140 chars, evocative not exhaustive",
  "status": "code" | "spec" | "concept",
  "products": ["MAGI" | "Xstream" | "Onen" | "Creation Tools", ...],
  "slug": "kebab-case-slug-from-name"
}

## Categories

A: Foundation — core data structures (pscale block, BSP walker, star operator)
B: Process — how things move through time (compaction, PCT loop, reflexive spark)
C: Creation — making pscale blocks (transcript-to-pscale, etc)
D: Interface — human/agent interaction (shelf, forking stream, triad, film strip)
E: Distribution — how things spread (reflector, seed, MCP server)
F: Network (SAND) — decentralised discovery (passport, beach, ecosquared)
G: Structure — structural properties (möbius twists)
H: Shell — hermitcrab internals (constitution, wake, cook, capabilities)
I: Relational — ghost mechanics, institutional blocks, editing balance
J: Context — aperture, currents, second-order processing
K: SAND Mechanics — stigmergy, rider, SQ, payment gateway, GitHub coordination
L: Meta — vision, process, kernel-as-block, systemic evolution
M: Primitives — foundational principles (LLM as primitive, blocks-as-code, shell as concept)

## Status rules

- "code": a working implementation exists (runnable, deployed, or a functional artifact)
- "spec": detailed design documented, not yet implemented
- "concept": identified as a thing, not yet specified in detail

## Products

- MAGI: agent infrastructure
- Xstream: reflexive coordination interface
- Onen: RPG testing ground
- Creation Tools: authoring/transcript/concept tools

Assign products liberally — most foundational things belong to all four.

## Slug rules

- kebab-case only, ASCII
- derived from the name
- must be unique against the existing slugs (provided below)
- matches the filename stem in docs/components/{slug}.md

## Existing components (for context and de-duplication)

{{EXISTING_COMPONENTS_LIST}}

## Existing slugs (must not collide)

{{EXISTING_SLUGS_LIST}}

## Output

Pure JSON object, nothing else.
```

The `{{EXISTING_COMPONENTS_LIST}}` and `{{EXISTING_SLUGS_LIST}}` placeholders are filled in at runtime by the classifier script — so the LLM sees the current state of the inventory.

### Step 2.2 — Classifier script

`scripts/classify.js`:

```js
// scripts/classify.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(REPO_ROOT, 'experiments/pscale-inventory.data.json');
const PROMPT_PATH = path.join(__dirname, 'prompts/classify-component.md');

function buildPrompt(data) {
  const existing = Object.entries(data.components)
    .map(([id, c]) => `  ${id}. ${c.name} [${c.cat}] — ${c.desc}`)
    .join('\n');
  const slugs = Object.values(data.components).map(c => c.slug).join(', ');

  return fs.readFileSync(PROMPT_PATH, 'utf8')
    .replace('{{EXISTING_COMPONENTS_LIST}}', existing)
    .replace('{{EXISTING_SLUGS_LIST}}', slugs);
}

function classify(filePath) {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const prompt = buildPrompt(data);
  const fileContent = fs.readFileSync(filePath, 'utf8');

  // Invoke Claude Code headlessly. Adjust flag names to match actual `claude` CLI.
  // The idea: prompt + file contents go in, JSON comes out on stdout.
  const fullPrompt = `${prompt}\n\n---\n\nDocument to classify:\n\n${fileContent}`;
  const output = execSync(
    `claude -p ${JSON.stringify(fullPrompt)} --output-format text`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );

  // Strip any accidental markdown fences
  const cleaned = output.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
  const entry = JSON.parse(cleaned);

  validate(entry, data);
  return entry;
}

function validate(entry, data) {
  if (!entry.name || typeof entry.name !== 'string') throw new Error('Invalid name');
  if (!/^[A-M]$/.test(entry.cat)) throw new Error(`Invalid cat: ${entry.cat}`);
  if (!['code', 'spec', 'concept'].includes(entry.status)) throw new Error(`Invalid status: ${entry.status}`);
  if (!Array.isArray(entry.products) || entry.products.length === 0) throw new Error('products must be non-empty array');
  const validProducts = Object.keys(data.products);
  for (const p of entry.products) {
    if (!validProducts.includes(p)) throw new Error(`Invalid product: ${p}`);
  }
  if (!/^[a-z0-9-]+$/.test(entry.slug)) throw new Error(`Invalid slug: ${entry.slug}`);
  const existingSlugs = new Set(Object.values(data.components).map(c => c.slug));
  if (existingSlugs.has(entry.slug)) throw new Error(`Slug collision: ${entry.slug}`);
}

module.exports = { classify };

if (require.main === module) {
  const filePath = process.argv[2];
  console.log(JSON.stringify(classify(filePath), null, 2));
}
```

**Note on Claude Code invocation**: the exact `claude` CLI flags may have changed — Claude Code should verify current flags with `claude --help` and adjust. The logic is: pass the composed prompt as input, get a JSON string on stdout.

### Step 2.3 — Ingest orchestrator

`scripts/ingest.js`:

```js
// scripts/ingest.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { classify } = require('./classify');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(REPO_ROOT, 'experiments/pscale-inventory.data.json');
const DOCS_DIR = path.join(REPO_ROOT, 'docs/components');

function nextId(data) {
  const ids = Object.keys(data.components).map(Number);
  return String(Math.max(...ids) + 1);
}

function ingest(filePath, { dryRun = false } = {}) {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const entry = classify(filePath);
  const id = nextId(data);

  console.log(`[ingest] Classified as #${id}: ${entry.name} [${entry.cat}/${entry.status}]`);
  console.log(`[ingest] Slug: ${entry.slug}`);
  console.log(`[ingest] Products: ${entry.products.join(', ')}`);

  if (dryRun) {
    console.log('[ingest] DRY RUN — no changes written');
    return { id, entry };
  }

  // 1. Copy file into docs/components/ with the slug name
  const ext = path.extname(filePath) || '.md';
  const destPath = path.join(DOCS_DIR, `${entry.slug}${ext}`);
  fs.copyFileSync(filePath, destPath);

  // 2. Append to JSON
  data.components[id] = entry;
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');

  // 3. Run build (regenerates HTML data block + zip)
  execSync(`node ${path.join(__dirname, 'build-inventory.js')}`, { stdio: 'inherit' });

  // 4. Git add, commit, push
  const git = (cmd) => execSync(`git ${cmd}`, { cwd: REPO_ROOT, stdio: 'inherit' });
  git('add experiments/pscale-inventory.data.json experiments/pscale-inventory.html docs/components/ docs/components.zip');
  git(`commit -m "[inventory] Add #${id}: ${entry.name.replace(/"/g, '\\"')}"`);
  git('push');

  console.log(`[ingest] Committed and pushed #${id}`);
  return { id, entry };
}

module.exports = { ingest };

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) { console.error('Usage: ingest.js [--dry-run] <file>'); process.exit(1); }
  ingest(filePath, { dryRun });
}
```

**Commit message format**: `[inventory] Add #{id}: {name}` — matches his git discipline in the Xstream project instructions. Each ingestion is one commit, trivially revertible with `git revert`.

---

## Phase 3 — The watcher

### Step 3.1 — Watcher script

`scripts/watch-inbox.js`:

```js
// scripts/watch-inbox.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const chokidar = require('chokidar');
const { ingest } = require('./ingest');

const INBOX = path.join(os.homedir(), 'xstream-inbox');
const PROCESSED = path.join(INBOX, 'processed');
const ERRORS = path.join(INBOX, 'errors');

for (const dir of [INBOX, PROCESSED, ERRORS]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function waitForStable(filePath, { interval = 500, stableFor = 2000 } = {}) {
  return new Promise((resolve, reject) => {
    let lastSize = -1;
    let stableSince = 0;
    const timer = setInterval(() => {
      try {
        const { size } = fs.statSync(filePath);
        if (size === lastSize) {
          if (Date.now() - stableSince >= stableFor) {
            clearInterval(timer);
            resolve();
          }
        } else {
          lastSize = size;
          stableSince = Date.now();
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, interval);
  });
}

async function handleFile(filePath) {
  const basename = path.basename(filePath);
  console.log(`[watch] Detected: ${basename}`);

  try {
    await waitForStable(filePath);
    const { id } = ingest(filePath);
    const destName = `${id.padStart(3, '0')}-${basename}`;
    fs.renameSync(filePath, path.join(PROCESSED, destName));
    console.log(`[watch] Success: ${basename} → processed/${destName}`);
  } catch (err) {
    console.error(`[watch] Error processing ${basename}:`, err.message);
    const errName = `${Date.now()}-${basename}`;
    fs.renameSync(filePath, path.join(ERRORS, errName));
    fs.writeFileSync(
      path.join(ERRORS, `${errName}.log`),
      `${err.stack || err.message}\n`
    );
  }
}

const watcher = chokidar.watch(INBOX, {
  ignored: [PROCESSED, ERRORS, /^\./],
  persistent: true,
  depth: 0, // only watch top level of inbox
  awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
});

watcher.on('add', handleFile);
console.log(`[watch] Watching ${INBOX}`);
```

**Supported file types**: `.md`, `.jsx`, `.json`, `.html`, `.py` — anything the classifier can read as text. The extension is preserved when copying into `docs/components/`.

### Step 3.2 — Background operation (macOS launchd)

`~/Library/LaunchAgents/com.happyseaurchin.xstream-inbox.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.happyseaurchin.xstream-inbox</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/YOU/code/happyseaurchin-home/scripts/watch-inbox.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/YOU/code/happyseaurchin-home</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/YOU/code/happyseaurchin-home/scripts/watch.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/YOU/code/happyseaurchin-home/scripts/watch.err.log</string>
</dict>
</plist>
```

Load with `launchctl load ~/Library/LaunchAgents/com.happyseaurchin.xstream-inbox.plist`. Paths need to match David's actual home directory and Node install location (he'll adjust).

Alternative for simplicity during testing: just run `node scripts/watch-inbox.js` in a terminal tab. Background it once it's proven stable.

---

## File structure (final)

```
happyseaurchin-home/
├── experiments/
│   ├── pscale-inventory.html            ← unchanged structure, sentinel region auto-updates
│   └── pscale-inventory.data.json       ← NEW: source of truth
├── docs/
│   ├── components/
│   │   ├── pscale-block.md
│   │   ├── {slug}.md                    ← new docs land here
│   │   └── ...
│   └── components.zip                   ← regenerated on every ingest
├── scripts/                              ← NEW
│   ├── build-inventory.js
│   ├── classify.js
│   ├── ingest.js
│   ├── watch-inbox.js
│   ├── watch.log
│   └── prompts/
│       └── classify-component.md
├── package.json                          ← NEW: dependency on chokidar
└── specs/
    └── xstream-inbox-automation-spec.md ← this file
```

## Inbox structure

```
~/xstream-inbox/
├── (drop files here)
├── processed/           ← successful ingests renamed with id prefix
└── errors/              ← failures with .log sibling file
```

---

## Commands

```bash
# One-off ingest (manual)
node scripts/ingest.js ~/Downloads/new-exploration.md

# Dry run (see classification without committing)
node scripts/ingest.js --dry-run ~/Downloads/new-exploration.md

# Start watcher (foreground)
node scripts/watch-inbox.js

# Manual rebuild (after manually editing the JSON)
node scripts/build-inventory.js

# Launchd control
launchctl load ~/Library/LaunchAgents/com.happyseaurchin.xstream-inbox.plist
launchctl unload ~/Library/LaunchAgents/com.happyseaurchin.xstream-inbox.plist
```

## Rollback

Every ingestion is one commit. To undo:

```bash
cd happyseaurchin-home
git log --oneline -5            # find the bad commit
git revert <sha>                # revert and push
mv ~/xstream-inbox/processed/001-file.md ~/xstream-inbox/   # re-queue if desired
```

---

## Implementation order (suggested)

| # | Step | Verify |
|---|------|--------|
| 1 | Phase 1.1–1.2: extract JSON, add sentinels | JSON parses |
| 2 | Phase 1.3: build-inventory.js | Running it idempotently regenerates same HTML |
| 3 | Phase 1.4: compare before/after HTML, commit | Visual parity on the live site |
| 4 | Phase 2.1–2.2: classifier prompt + script | `node scripts/classify.js test.md` outputs valid JSON for a known doc |
| 5 | Phase 2.3: ingest.js with `--dry-run` | Dry run on a test file prints sensible classification |
| 6 | Phase 2.3 live run | Check the resulting commit diff is minimal and clean |
| 7 | Phase 3.1: watcher, foreground | Drop a file, it processes and commits |
| 8 | Phase 3.2: launchd | Runs across reboots |

## Dependencies

```bash
npm init -y
npm install chokidar
```

Also required on the machine:
- Node 18+
- `zip` CLI (macOS ships with it)
- `claude` CLI (Claude Code), authenticated
- `git` configured with push access to the repo

---

## Open decisions for David

1. **Runtime or build-time JSON?** This spec uses build-time (HTML gets the data injected by `build-inventory.js`). Alternative is runtime `fetch()` which means the HTML never changes on ingestion but adds a network dependency. Recommend keeping build-time — HTML stays self-contained.

2. **Do you want the classifier to ever skip files?** E.g. if the classifier decides a file doesn't belong in the inventory (it's actually a meeting note, a scratchpad, etc.). Could add a `"skip": true` escape hatch. Out of scope for v1.

3. **Tag field.** Current inventory has no tags beyond category. The schema has room for it if you want.

---

## Why this design survives drift

Three properties:

- **Single source of truth**: `pscale-inventory.data.json`. All edits, manual or automated, go through it.
- **Deterministic build**: `build-inventory.js` is a pure function of the JSON. Same input, same output. No LLM in the build path.
- **One commit per ingestion**: every change is atomic and revertible. Git is the undo stack.

The only LLM step is classification, which produces structured JSON that the script validates before accepting. If the classifier hallucinates a bad category or colliding slug, validation fails and the file goes to `errors/` rather than corrupting the registry.
