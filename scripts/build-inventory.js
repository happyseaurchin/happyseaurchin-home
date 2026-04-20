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

const DATA_START = '// @@INVENTORY_DATA_START';
const DATA_END   = '// @@INVENTORY_DATA_END';
const TREES_START = '// @@INVENTORY_TREES_START';
const TREES_END   = '// @@INVENTORY_TREES_END';

const j = (obj) => JSON.stringify(obj, null, 2);

function buildDataBlock(data) {
  const { categories, products, components } = data;

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

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  let out = replaceRegion(html, DATA_START, DATA_END, buildDataBlock(data));
  out = replaceRegion(out, TREES_START, TREES_END, buildTreesBlock(data));

  const changed = out !== html;
  if (changed) fs.writeFileSync(HTML_PATH, out);

  rebuildZip();

  const n = Object.keys(data.components).length;
  const p = Object.keys(data.products).length;
  console.log(`[build] ${n} components · ${p} products${changed ? '' : ' (HTML unchanged)'}`);
}

main();
