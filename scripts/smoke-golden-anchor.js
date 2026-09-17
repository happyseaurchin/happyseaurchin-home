// Where the golden card sits in a row, run against the REAL function lifted out of walk.html.
//
// The bug this exists to stop coming back: the gold rode the data-now marker
// ALONE, so a row browsed off today — the day row while you stand in next
// week, and the gathering row under it — had no anchor and dropped its pile
// entirely, until a reload put the selection back on today. A pile is held
// relative to now and its contents never change as you browse, so browsing
// away is the worst possible reason to stop showing it.
const fs = require('fs');
const path = require('path');
const W = fs.readFileSync(path.resolve(__dirname, '..', 'walk.html'), 'utf8');
const grab = (src, sig) => { const i = src.indexOf(sig); return src.slice(i, src.indexOf('\n}\n', i) + 2); };

eval(grab(W, 'function spliceGold(cards, gold){'));

// Cells exactly as rcard emits them: the class string first, data-now only on now.
const cell = (label, { sel, now } = {}) =>
  '<div class="rcard' + (sel ? ' sel' : '') + ' empty" role="button" tabindex="0" '
  + (now ? 'data-now="1" ' : '') + 'data-lv="d" data-d="' + label + '">' + label + '</div>';
const GOLD = '<div class="rcard gold" data-lv="pile" data-pile="2">tomorrow</div>';

let pass = true;
const t = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) pass = false;
  console.log(`  ${ok ? '✓' : '✗'} ${label}` + (ok ? '' : `\n      got ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`));
};
/** index of the gold in a spliced row, or -1 */
const goldAt = row => row.findIndex(c => c.indexOf('rcard gold') !== -1);

console.log('\nthe golden card finds an anchor in every row:');

// 1. The ordinary case, and the one the column alignment depends on: now is
//    also the selection, gold lands immediately after it.
const onToday = [cell('15'), cell('16', { sel: true, now: true }), cell('17')];
t('lands straight after now when the row holds now', goldAt(spliceGold(onToday, GOLD)), 2);

// 2. THE REGRESSION. Browsed to next week: no now anywhere in the row.
const nextWeek = [cell('22'), cell('23', { sel: true }), cell('24')];
t('still lands when the row has no now at all', goldAt(spliceGold(nextWeek, GOLD)) >= 0, true);
t('follows the selection when now is absent', goldAt(spliceGold(nextWeek, GOLD)), 2);

// 3. Now present but NOT selected — a row you have browsed within this week.
//    Now still wins, because that is what keeps the gold in one column.
const browsedWithin = [cell('15', { now: true }), cell('16'), cell('17', { sel: true })];
t('now beats the selection when the row holds both', goldAt(spliceGold(browsedWithin, GOLD)), 1);

// 4. Neither marker — defensive; the gold goes last rather than vanishing.
const neither = [cell('1'), cell('2')];
t('falls to the end when the row has neither marker', goldAt(spliceGold(neither, GOLD)), 2);

// 5. Exactly one gold, always. A second anchor rule that also matched would
//    duplicate the pile, which reads as two piles at one rung.
[onToday, nextWeek, browsedWithin, neither].forEach((row, i) =>
  t(`row ${i + 1} carries exactly one gold`,
    spliceGold(row, GOLD).filter(c => c.indexOf('rcard gold') !== -1).length, 1));

// 6. The cells themselves are untouched and keep their order — the gold is an
//    insertion, never a replacement.
t('every original cell survives, in order',
  spliceGold(nextWeek, GOLD).filter(c => c.indexOf('rcard gold') === -1), nextWeek);

// 7. No gold to place (a rung with no pile) leaves the row exactly as it was.
t('a row with no pile is returned untouched', spliceGold(nextWeek, ''), nextWeek);

console.log(pass ? '\nall green.\n' : '\nFAILED.\n');
process.exit(pass ? 0 : 1);
