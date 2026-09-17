// The shapes the shared menu builds, run against the REAL href() lifted out of theme.js.
//
// "Wrong shape here is a dead link there" — theme.js says so above its own
// table, and on 2026-09-17 it happened: /page/<handle> passed the HANDLE as the
// FAMILY, so the two family-shaped doors pointed at a family named after a
// person. "projects" went to /walk/<handle>/<handle> and recency to
// /recency/<handle>/<handle>, neither of which is anywhere.
//
// The builder was never wrong — it has a fallback for exactly this, and the
// fallback is better than the bug it was hiding behind. These checks pin both
// halves: what a page WITH a family gets, and what a page WITHOUT one gets.
const fs = require('fs');
const path = require('path');
const T = fs.readFileSync(path.resolve(__dirname, '..', 'theme.js'), 'utf8');
const grab = (src, sig) => { const i = src.indexOf(sig); return src.slice(i, src.indexOf('\n  }\n', i) + 4); };

eval(grab(T, '  function href(page, shape, handle, family){'));

let pass = true;
const t = (label, got, want) => {
  const ok = got === want;
  if (!ok) pass = false;
  console.log(`  ${ok ? '✓' : '✗'} ${label}` + (ok ? '' : `\n      got  ${got}\n      want ${want}`));
};

const ME = 'happyseaurchin';

console.log('\nthe doors a page builds:');

// ── a page that HAS a family (the walk) ───────────────────────────────────
t('projects, with a family, walks that family',
  href('walk', 'family', ME, 'onen-rpg'), '/walk/onen-rpg/' + ME);
t('recency, with a family, reads that family',
  href('recency', 'family', ME, 'onen-rpg'), '/recency/onen-rpg/' + ME);

// ── a page that has NO family (/page, /now, /hands) ───────────────────────
// This is the fix. Without a family the builder asks rather than inventing one.
t('projects, with no family, asks the walk and keeps the walker',
  href('walk', 'family', ME, ''), '/walk?h=' + ME);
t('recency, with no family, falls back to the now-clock',
  href('recency', 'family', ME, ''), '/recency/now/' + ME);

// ── the bug, stated so it cannot come back unnoticed ──────────────────────
// Passing a handle where a family belongs is SILENT — it builds a real-looking
// URL for a family that does not exist. Nothing downstream can catch it, which
// is why it has to be caught here.
t('a handle passed as a family builds a link to nowhere (what NOT to do)',
  href('walk', 'family', ME, ME), '/walk/' + ME + '/' + ME);

// ── the other shapes, so a future edit to the table is covered ─────────────
t('handle shape', href('now', 'handle', ME, ''), '/now/' + ME);
t('handle shape with nobody is no link at all', href('now', 'handle', '', ''), null);
t('optional shape carries a handle when there is one', href('globe', 'optional', ME, ''), '/globe/' + ME);
t('optional shape stands alone when there is not', href('globe', 'optional', '', ''), '/globe');
t('bare shape takes no path', href('rpg', 'bare', ME, ''), '/rpg');
t('external shape is left whole',
  href('https://mirror.onen.ai/', 'external', ME, ''), 'https://mirror.onen.ai/');

// ── and the page.html call site itself, which is where it went wrong ──────
const call = fs.readFileSync(path.resolve(__dirname, '..', 'page.html'), 'utf8')
  .split('\n').filter(l => l.indexOf('siteDoors(') !== -1).join('\n');
t('page.html passes no family to siteDoors', /family\s*:/.test(call), false);

console.log(pass ? '\nall green.\n' : '\nFAILED.\n');
process.exit(pass ? 0 : 1);
