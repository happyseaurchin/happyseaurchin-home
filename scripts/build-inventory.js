#!/usr/bin/env node
// Regenerates the inventory data block in experiments/pscale-inventory.html
// from experiments/pscale-inventory.data.json. Also rebuilds docs/components.zip.
//
// The HTML data region is delimited by:
//   // @@INVENTORY_DATA_START ... // @@INVENTORY_DATA_END
// Anything inside that region is overwritten; everything else is untouched.

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

const START_MARK = '// @@INVENTORY_DATA_START';
const END_MARK = '// @@INVENTORY_DATA_END';

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

  const j = (obj) => JSON.stringify(obj, null, 2);

  return [
    `${START_MARK} — auto-generated from pscale-inventory.data.json, do not edit by hand`,
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
    END_MARK,
  ].join('\n');
}

function replaceRegion(html, block) {
  const startIdx = html.indexOf(START_MARK);
  const endIdx = html.indexOf(END_MARK);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Sentinel markers not found. Expected ${START_MARK} and ${END_MARK} in ${HTML_PATH}`);
  }
  if (startIdx >= endIdx) {
    throw new Error('Sentinel markers out of order');
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

  const block = buildDataBlock(data);
  const newHtml = replaceRegion(html, block);

  const changed = newHtml !== html;
  if (changed) {
    fs.writeFileSync(HTML_PATH, newHtml);
  }

  rebuildZip();

  const n = Object.keys(data.components).length;
  const p = Object.keys(data.products).length;
  console.log(`[build] ${n} components · ${p} products${changed ? '' : ' (HTML unchanged)'}`);
}

main();
