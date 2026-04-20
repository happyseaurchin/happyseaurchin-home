#!/usr/bin/env node
// Classifies a document as an inventory component using `claude -p`.
// Uses --json-schema to constrain structured output; pipes prompt via stdin
// (argv-safe for large docs) and spawnSync with an argv array (shell-safe).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(REPO_ROOT, 'experiments/pscale-inventory.data.json');
const PROMPT_PATH = path.join(__dirname, 'prompts/classify-component.md');

// NOTE: we don't pass --json-schema — the current CLI rejects it with
// "tool_use ids must be unique". Instead we instruct the model to emit pure
// JSON in the prompt and tolerate stray fences in parseResponse.

function buildPrompt(data) {
  const existing = Object.entries(data.components)
    .map(([id, c]) => `  ${id}. ${c.name} [${c.cat}/${c.status}] — ${c.desc}`)
    .join('\n');
  const slugs = Object.values(data.components).map(c => c.slug).sort().join(', ');

  const tpl = fs.readFileSync(PROMPT_PATH, 'utf8');
  return tpl
    .replaceAll('{{EXISTING_COMPONENTS_LIST}}', existing)
    .replaceAll('{{EXISTING_SLUGS_LIST}}', slugs);
}

function invokeClaude(fullPrompt) {
  const result = spawnSync(
    'claude',
    ['-p', '--output-format', 'text'],
    {
      input: fullPrompt,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }
  );
  if (result.error) {
    throw new Error(`claude CLI failed to spawn: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`claude CLI exited with ${result.status}: ${result.stderr?.trim() || result.stdout?.trim() || '(no output)'}`);
  }
  return result.stdout;
}

function parseResponse(raw) {
  // With --json-schema the output should already be pure JSON, but strip any
  // stray whitespace or accidental code fences just in case.
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`classifier returned non-JSON output:\n${raw}\n\nparse error: ${err.message}`);
  }
}

function validate(entry, data) {
  const errors = [];
  if (!/^[A-M]$/.test(entry.cat)) errors.push(`invalid cat: ${entry.cat}`);
  if (!['code', 'spec', 'concept'].includes(entry.status)) errors.push(`invalid status: ${entry.status}`);
  if (!Array.isArray(entry.products) || entry.products.length === 0) {
    errors.push('products must be a non-empty array');
  } else {
    const validProducts = new Set(Object.keys(data.products));
    for (const p of entry.products) {
      if (!validProducts.has(p)) errors.push(`invalid product: ${p}`);
    }
  }
  if (!/^[a-z0-9-]+$/.test(entry.slug || '')) errors.push(`invalid slug: ${entry.slug}`);
  const existingSlugs = new Set(Object.values(data.components).map(c => c.slug));
  if (existingSlugs.has(entry.slug)) errors.push(`slug collision: ${entry.slug}`);
  const existingNames = new Set(Object.values(data.components).map(c => c.name.toLowerCase()));
  if (existingNames.has((entry.name || '').toLowerCase())) errors.push(`name collision: ${entry.name}`);
  if (errors.length) throw new ValidationError(errors.join('; '), entry);
  return entry;
}

class ValidationError extends Error {
  constructor(msg, entry) { super(msg); this.name = 'ValidationError'; this.entry = entry; }
}

function classify(filePath, { validateEntry = true } = {}) {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const prompt = buildPrompt(data);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const fullPrompt = `${prompt}\n\n---\n\nDocument to classify (filename: ${path.basename(filePath)}):\n\n${fileContent}`;

  const raw = invokeClaude(fullPrompt);
  const entry = parseResponse(raw);
  if (validateEntry) validate(entry, data);
  return entry;
}

module.exports = { classify, validate, ValidationError };

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: classify.js <file>');
    process.exit(1);
  }
  try {
    const entry = classify(filePath);
    console.log(JSON.stringify(entry, null, 2));
  } catch (err) {
    if (err.name === 'ValidationError') {
      console.error('[classify] Validation failed:', err.message);
      console.error('[classify] Raw entry:', JSON.stringify(err.entry, null, 2));
      process.exit(2);
    }
    throw err;
  }
}
