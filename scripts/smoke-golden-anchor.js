// Where the golden card sits in a row, run against the REAL function lifted out of walk.html.
//
// THE RULE: the gold sits where NOW is, or where now WOULD be. A pile is
// measured from now and nowhere else — "a year out" is 2027 whichever decade
// you are looking at — so a row later than now takes it at the far left, and a
// row earlier than now takes it at the far right.
//
// Two bugs live behind these checks, both found by David on the rack:
//   2026-09-16  the gold rode the data-now marker ALONE, so a row browsed off
//               today had no anchor and dropped its pile entirely.
//   2026-09-17  the first fix anchored it to the SELECTION, which kept it on
//               screen but put "a year out" after 2037 while standing in the
//               2030s — on the row, and lying about where the pile is.
const fs = require('fs');
const path = require('path');
const W = fs.readFileSync(path.resolve(__dirname, '..', 'walk.html'), 'utf8');
const grab = (src, sig) => { const i = src.indexOf(sig); return src.slice(i, src.indexOf('\n}\n', i) + 2); };

eval(grab(W, 'function spliceGold(cards, gold, nowAddr){'));

// now, at the rung the rack draws finest: 2026, season 3, month 3, band 3, day 3, gathering 6.
const NOW = '202633326';
// Cells exactly as rcard emits them — class first, data-addr always, data-now only on now.
const cell = (addr, { sel, now } = {}) =>
  '<div class="rcard' + (sel ? ' sel' : '') + ' empty" role="button" tabindex="0" '
  + 'data-addr="' + addr + '" ' + (now ? 'data-now="1" ' : '') + 'data-lv="y">' + addr + '</div>';
const GOLD = '<div class="rcard gold" data-lv="pile" data-pile="6">a year out</div>';

let pass = true;
const t = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) pass = false;
  console.log(`  ${ok ? '✓' : '✗'} ${label}` + (ok ? '' : `\n      got ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`));
};
const goldIx = row => row.findIndex(c => c.indexOf('rcard gold') !== -1);
/** where the gold landed and how it is pinned, as one readable answer */
const place = (cells, gold = GOLD) => {
  const row = spliceGold(cells, gold, NOW);
  const i = goldIx(row);
  if (i < 0) return 'ABSENT';
  const g = row[i];
  const pin = /pin-l/.test(g) ? 'pin-l' : /pin-r/.test(g) ? 'pin-r' : '';
  return (i === 0 ? 'first' : i === row.length - 1 ? 'last' : 'at ' + i) + (pin ? ' ' + pin : '');
};

console.log('\nthe gold sits where now is, or where now would be:');

// ── 1. now is in the row ───────────────────────────────────────────────────
const thisDecade = [cell('2025'), cell('2026', { sel: true, now: true }), cell('2027')];
t('straight after now, unpinned, when the row holds now', place(thisDecade), 'at 2');

// now present but not selected — now still wins, which is what keeps the column
const browsed = [cell('2025', { now: true }), cell('2026'), cell('2027', { sel: true })];
t('now beats the selection when the row holds both', place(browsed), 'at 1');

// ── 2. the row is entirely LATER than now — David standing in the 2030s ────
const thirties = ['2029', '2030', '2031', '2032', '2033', '2034', '2035', '2036', '2037', '2038', '2039']
  .map(y => cell(y, { sel: y === '2037' }));
t('far left when every cell is later than now', place(thirties), 'first pin-l');
t('  and NOT beside the selection, which was the 2026-09-17 bug',
  spliceGold(thirties, GOLD, NOW).findIndex(c => /rcard gold/.test(c)) === 0, true);

const seasonsUnder37 = ['20371', '20372', '20373', '20374'].map(a => cell(a, { sel: a === '20374' }));
t('every finer row under a later year goes far left too', place(seasonsUnder37), 'first pin-l');
t('  and the month row under it as well',
  place(['203741', '203742', '203743'].map(a => cell(a))), 'first pin-l');

// ── 3. the row is entirely EARLIER than now — a retrospective at 2025 ──────
const seasonsUnder25 = ['20251', '20252', '20253', '20254'].map(a => cell(a, { sel: a === '20253' }));
t('far right when every cell is earlier than now', place(seasonsUnder25), 'last pin-r');
t('  and the month row under it as well',
  place(['202531', '202532', '202533'].map(a => cell(a))), 'last pin-r');

// the YEAR row of that retrospective still CONTAINS now, so it is case 1
const twenties = ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029']
  .map(y => cell(y, { sel: y === '2025', now: y === '2026' }));
t('a row straddling now holds it, so it is never pinned', place(twenties), 'at 8');

// ── 4. invariants that must hold however it lands ─────────────────────────
[thisDecade, browsed, thirties, seasonsUnder25, twenties].forEach((row, i) =>
  t(`row ${i + 1} carries exactly one gold`,
    spliceGold(row, GOLD, NOW).filter(c => c.indexOf('rcard gold') !== -1).length, 1));

t('every original cell survives, in order',
  spliceGold(thirties, GOLD, NOW).filter(c => c.indexOf('rcard gold') === -1), thirties);

t('a row with no pile is returned untouched', spliceGold(thirties, '', NOW), thirties);

// a cell with no address must not throw or silently mis-place the pile
t('an addressless row still places the gold', place([cell(''), cell('')]) !== 'ABSENT', true);

console.log(pass ? '\nall green.\n' : '\nFAILED.\n');
process.exit(pass ? 0 : 1);
