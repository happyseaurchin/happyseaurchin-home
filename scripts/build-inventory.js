#!/usr/bin/env node
// Regenerates two auto-generated regions in experiments/pscale-inventory.html
// from experiments/pscale-inventory.data.json, and rebuilds docs/components.zip.
//
// Regions:
//   // @@INVENTORY_DATA_START  … // @@INVENTORY_DATA_END   (6 data consts)
//   // @@INVENTORY_TREES_START … // @@INVENTORY_TREES_END  (core + product trees)
// Anything inside those regions is overwritten; everything else is untouched.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(REPO_ROOT, 'experiments/pscale-inventory.data.json');
const HTML_PATH = path.join(REPO_ROOT, 'experiments/pscale-inventory.html');
const DOCS_DIR = path.join(REPO_ROOT, 'docs/components');
const DOCS_PARENT = path.dirname(DOCS_DIR);
const ZIP_NAME = 'components.zip';
const ZIP_PATH = path.join(DOCS_PARENT, ZIP_NAME);
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

const DATA_START = '// @@INVENTORY_DATA_START';
const DATA_END   = '// @@INVENTORY_DATA_END';
const TREES_START = '// @@INVENTORY_TREES_START';
const TREES_END   = '// @@INVENTORY_TREES_END';

const j = (obj) => JSON.stringify(obj, null, 2);

function cleanLinks(links) {
  if (!links || typeof links !== 'object') return null;
  const out = {};
  if (links.live) out.live = links.live;
  if (links.source) out.source = links.source;
  return Object.keys(out).length ? out : null;
}

function buildDataBlock(data) {
  const { categories, products, components, packages = {} } = data;

  const COMPONENTS = {};
  const PRODUCT_MAP = {};
  const STATUS = {};
  const DOC_SLUGS = {};
  const LINKS = {};

  for (const [id, c] of Object.entries(components)) {
    COMPONENTS[id] = { name: c.name, cat: c.cat, desc: c.desc };
    PRODUCT_MAP[id] = c.products;
    STATUS[id] = c.status;
    DOC_SLUGS[id] = c.slug;
    const links = cleanLinks(c.links);
    if (links) LINKS[id] = links;
  }

  return [
    `${DATA_START} — auto-generated from pscale-inventory.data.json, do not edit by hand`,
    `const CATEGORIES = ${j(categories)};`,
    '',
    `const PRODUCTS = ${j(products)};`,
    '',
    `const COMPONENTS = ${j(COMPONENTS)};`,
    '',
    `const PRODUCT_MAP = ${j(PRODUCT_MAP)};`,
    '',
    `const STATUS = ${j(STATUS)};`,
    '',
    `const DOC_SLUGS = ${j(DOC_SLUGS)};`,
    '',
    `const LINKS = ${j(LINKS)};`,
    '',
    `const PACKAGES = ${j(packages)};`,
    DATA_END,
  ].join('\n');
}

function buildTreesBlock(data) {
  const { trees } = data;
  if (!trees || !trees.coreFirst || !trees.productFirst) {
    throw new Error('data.trees.coreFirst and data.trees.productFirst are required');
  }
  return [
    `${TREES_START} — auto-generated from pscale-inventory.data.json, do not edit by hand`,
    `const coreFirstTree = ${j(trees.coreFirst)};`,
    '',
    `const productFirstTree = ${j(trees.productFirst)};`,
    TREES_END,
  ].join('\n');
}

function replaceRegion(html, startMark, endMark, block) {
  const startIdx = html.indexOf(startMark);
  const endIdx = html.indexOf(endMark);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Sentinel markers not found: ${startMark} / ${endMark}`);
  }
  if (startIdx >= endIdx) {
    throw new Error(`Sentinel markers out of order: ${startMark} / ${endMark}`);
  }
  const endOfEndLine = html.indexOf('\n', endIdx);
  const tail = endOfEndLine === -1 ? '' : html.slice(endOfEndLine);
  return html.slice(0, startIdx) + block + tail;
}

function rebuildZip() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.warn(`[build] docs/components not found, skipping zip`);
    return;
  }
  // zip -rq: recursive, quiet. Overwrite existing archive cleanly.
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
  execSync(`zip -rq ${JSON.stringify(ZIP_NAME)} components/`, { cwd: DOCS_PARENT });
}

// ────────────────────────── package pages ──────────────────────────

const SHARED_STYLE = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0a; --fg: #d4d4d4; --muted: #888; --faint: #555;
    --border: #333; --card-bg: #121212; --accent: #aac;
    --btn-bg: #1a1a2e; --btn-border: #556; --btn-fg: #aac;
  }
  [data-theme="light"] {
    --bg: #f5f5f0; --fg: #2a2a2a; --muted: #666; --faint: #999;
    --border: #ccc; --card-bg: #fff; --accent: #446;
    --btn-bg: #e0e0f0; --btn-border: #99a; --btn-fg: #446;
  }
  html, body { background: var(--bg); color: var(--fg); min-height: 100vh; }
  body {
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 13px; line-height: 1.55;
    max-width: 860px; margin: 0 auto; padding: 32px 24px 80px;
    transition: background 0.3s, color 0.3s;
  }
  a { color: inherit; }
  .topbar {
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 14px; margin-bottom: 28px; border-bottom: 1px solid var(--border);
  }
  .topbar a, .topbar button {
    font-family: inherit; font-size: 12px;
    background: var(--btn-bg); border: 1px solid var(--btn-border); color: var(--btn-fg);
    padding: 6px 12px; border-radius: 2px; cursor: pointer; text-decoration: none;
  }
  .topbar a:hover, .topbar button:hover { filter: brightness(1.2); }
  h1 { font-size: 22px; font-weight: 500; letter-spacing: 0.01em; margin-bottom: 6px; }
  .lede { color: var(--muted); margin-bottom: 18px; max-width: 60ch; }
  .meta { color: var(--faint); font-size: 11px; margin-bottom: 28px; }
  .switcher { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 32px; }
  .switcher .lbl { color: var(--faint); font-size: 11px; padding: 4px 0; margin-right: 4px; }
  .switcher a {
    font-size: 11px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 2px;
    color: var(--muted); text-decoration: none;
  }
  .switcher a:hover { color: var(--fg); border-color: var(--btn-border); }
  .switcher a.current { background: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-fg); }
  .card {
    background: var(--card-bg); border: 1px solid var(--border);
    padding: 16px 18px; margin-bottom: 12px; border-radius: 2px;
  }
  .card .idx { color: var(--faint); font-size: 11px; }
  .card h2 {
    font-size: 15px; font-weight: 500; margin: 2px 0 6px;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .cat-badge {
    font-size: 10px; padding: 2px 7px; border-radius: 2px;
    background: var(--btn-bg); color: var(--btn-fg); border: 1px solid var(--btn-border);
  }
  .status-badge { font-size: 10px; color: var(--faint); }
  .card .desc { color: var(--muted); margin-bottom: 10px; }
  .card .links { display: flex; gap: 6px; flex-wrap: wrap; }
  .card .links a {
    font-size: 11px; text-decoration: none; padding: 4px 10px; border-radius: 2px;
    border: 1px solid var(--border); color: var(--muted);
  }
  .card .links a:hover { color: var(--fg); border-color: var(--btn-border); }
  .card .links a.live { background: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-fg); }
  .empty-link { color: var(--faint); font-style: italic; font-size: 11px; padding: 4px 10px; }
  .pkg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .pkg-grid a.pkg { text-decoration: none; color: inherit; }
  .pkg-grid .card:hover { border-color: var(--btn-border); }
  .footnote { color: var(--faint); font-size: 11px; margin-top: 48px; text-align: center; }
`;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function catBadge(cat, catName) {
  return `<span class="cat-badge" title="${esc(catName)}">${esc(cat)}</span>`;
}

function componentCard(idx, id, component, links, catName) {
  const docUrl = `/docs/components/${String(id).padStart(2, '0')}-${component.slug}.md`;
  const liveHtml = links?.live
    ? `<a class="live" href="${esc(links.live)}" target="_blank" rel="noopener">live ↗</a>`
    : `<span class="empty-link">live: TBD</span>`;
  const sourceHtml = links?.source
    ? `<a href="${esc(links.source)}" target="_blank" rel="noopener">source ↗</a>`
    : `<span class="empty-link">source: TBD</span>`;
  return `
    <div class="card">
      <div class="idx">${idx}.</div>
      <h2>${esc(component.name)} ${catBadge(component.cat, catName)} <span class="status-badge">${esc(component.status)}</span></h2>
      <div class="desc">${esc(component.desc)}</div>
      <div class="links">
        <a href="${esc(docUrl)}" target="_blank" rel="noopener">doc ↗</a>
        ${liveHtml}
        ${sourceHtml}
      </div>
    </div>`;
}

function packageSwitcher(currentSlug, packages) {
  const entries = Object.entries(packages);
  if (entries.length <= 1) return '';
  const pills = entries.map(([slug, pkg]) => {
    const cls = slug === currentSlug ? 'current' : '';
    return `<a href="/packages/${esc(slug)}" class="${cls}">${esc(pkg.name)}</a>`;
  }).join('');
  return `
    <div class="switcher">
      <span class="lbl">Other packages:</span>
      ${pills}
    </div>`;
}

function renderPackagePage(slug, pkg, data) {
  const { components, categories, packages } = data;
  const cards = pkg.components.map((id, i) => {
    const c = components[id];
    if (!c) return `<div class="card"><div class="desc">Missing component #${id}</div></div>`;
    const catName = categories[c.cat]?.name || '';
    return componentCard(i + 1, id, c, c.links, catName);
  }).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(pkg.name)} — pscale packages</title>
<link rel="icon" href="/assets/torus.png" type="image/png">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>${SHARED_STYLE}</style>
</head>
<body data-theme="light">
<div class="topbar">
  <a href="/experiments/pscale-inventory.html?pkg=${esc(slug)}">← See on graph</a>
  <a href="/packages/">All packages</a>
</div>
<h1>${esc(pkg.name)}</h1>
<div class="lede">${esc(pkg.desc)}</div>
${packageSwitcher(slug, packages)}
<div class="meta">${pkg.components.length} components</div>
${cards}
<div class="footnote">Part of the <a href="/experiments/pscale-inventory.html">pscale inventory</a></div>
</body>
</html>
`;
}

function renderPackagesIndex(data) {
  const { packages, components } = data;
  const entries = Object.entries(packages);
  const cards = entries.length === 0
    ? `<div class="card"><div class="desc">No packages yet.</div></div>`
    : entries.map(([slug, pkg]) => {
        const n = pkg.components.length;
        const validCount = pkg.components.filter(id => components[id]).length;
        return `
          <a class="pkg" href="/packages/${esc(slug)}">
            <div class="card">
              <h2>${esc(pkg.name)}</h2>
              <div class="desc">${esc(pkg.desc)}</div>
              <div class="meta">${validCount} components${validCount !== n ? ` (${n - validCount} missing)` : ''}</div>
            </div>
          </a>`;
      }).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Packages — pscale inventory</title>
<link rel="icon" href="/assets/torus.png" type="image/png">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>${SHARED_STYLE}</style>
</head>
<body data-theme="light">
<div class="topbar">
  <a href="/experiments/pscale-inventory.html">← Back to inventory</a>
  <span></span>
</div>
<h1>Packages</h1>
<div class="lede">Curated reading lists grouping inventory components into coherent reference bundles.</div>
<div class="meta">${entries.length} package${entries.length === 1 ? '' : 's'}</div>
<div class="pkg-grid">${cards}</div>
<div class="footnote">Back to the <a href="/experiments/pscale-inventory.html">pscale inventory</a></div>
</body>
</html>
`;
}

function writeIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) {
    return false;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
}

function buildPackagePages(data) {
  fs.mkdirSync(PACKAGES_DIR, { recursive: true });
  let wrote = 0;
  const packages = data.packages || {};
  for (const [slug, pkg] of Object.entries(packages)) {
    const out = path.join(PACKAGES_DIR, `${slug}.html`);
    if (writeIfChanged(out, renderPackagePage(slug, pkg, data))) wrote++;
  }
  const indexPath = path.join(PACKAGES_DIR, 'index.html');
  if (writeIfChanged(indexPath, renderPackagesIndex(data))) wrote++;
  return { total: Object.keys(packages).length, wrote };
}

// ────────────────────────── main ──────────────────────────

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  let out = replaceRegion(html, DATA_START, DATA_END, buildDataBlock(data));
  out = replaceRegion(out, TREES_START, TREES_END, buildTreesBlock(data));

  const changed = out !== html;
  if (changed) fs.writeFileSync(HTML_PATH, out);

  rebuildZip();
  const pkg = buildPackagePages(data);

  const n = Object.keys(data.components).length;
  const p = Object.keys(data.products).length;
  const pkgMsg = pkg.total ? ` · ${pkg.total} package${pkg.total === 1 ? '' : 's'}${pkg.wrote ? ` (${pkg.wrote} page${pkg.wrote === 1 ? '' : 's'} updated)` : ''}` : '';
  console.log(`[build] ${n} components · ${p} products${pkgMsg}${changed ? '' : ' (HTML unchanged)'}`);
}

main();
