#!/usr/bin/env node
/* ghost-race/checks.mjs — the engine's checks, run headless under node (function:ghost-race 5; the rules at
 * function:arcade 3 and 4):
 *
 *   node ghost-race/checks.mjs            every check
 *   node ghost-race/checks.mjs <part>     the checks whose name holds it
 *
 * Every day draws a circuit fit to race, the same address always draws the same circuit (pinned below, so
 * any change to the generator or the car shows here first and takes a new version, gr2), a driver finishes
 * every day, a kept run re-runs to its step and a changed one does not, and doing nothing is never a way to
 * race. Exits 1 if any fails. */
import * as E from './engine.js';

const results = [];
const only = process.argv.slice(2).join(' ');
function check(name, fn) {
  if (only && name.indexOf(only) < 0) return;
  try { const note = fn(); results.push({ name, ok: true, note }); }
  catch (e) { results.push({ name, ok: false, note: e.message }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function days(from, n) { const out = []; for (let i = 0; i < n; i++) out.push(E.dayAddress(new Date(from + i * 86400000))); return out; }
const fingerprint = (c) => {
  let h = 2166136261;
  for (const p of c.points) for (const v of p) { h ^= v & 0xffff; h = Math.imul(h, 16777619) >>> 0; h ^= v >>> 16; h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16) + '/' + c.points.length + '/' + c.L;
};
const YEARS = days(Date.UTC(2026, 0, 1), 730);

check('every day of 2026 and 2027 draws a circuit fit to race', () => {
  const shapes = {}; let worst = 0;
  for (const a of YEARS) {
    const c = E.circuit(a);
    assert(c.address === a, a + ' drew the circuit of ' + c.address);
    assert(c.L >= 2300000 && c.L <= 3600000, a + ': a lap of ' + c.L);
    assert(c.corners.every((k) => k.r >= 95000), a + ': a corner tighter than 0.095');
    shapes[c.shape] = (shapes[c.shape] || 0) + 1; worst = Math.max(worst, c.redraws);
  }
  assert(Object.keys(shapes).length === 3 && Object.values(shapes).every((n) => n > 150), 'the three shapes, about a third each: ' + JSON.stringify(shapes));
  return YEARS.length + ' days, ' + JSON.stringify(shapes) + ', at most ' + worst + ' redraws';
});

check('the same address always draws the same circuit (gr1, pinned)', () => {
  const pins = { 2026414600: '57f00626/218/2447110', 2026413700: '35202659/240/2846155', 2027111100: '46d37924/229/2496227' };
  for (const [a, want] of Object.entries(pins)) {
    const got = fingerprint(E.circuit(a));
    assert(got === want, a + ' draws ' + got + ', gr1 drew ' + want + ': a change to the circuit takes a new version');
    assert(fingerprint(E.circuit(a)) === got, a + ' drew two circuits');
  }
  return Object.keys(pins).join(', ');
});

check('a driver finishes every day\'s circuit inside a minute', () => {
  let slowest = 0, sum = 0;
  for (const a of YEARS.filter((_, i) => i % 3 === 0)) {
    const c = E.circuit(a);
    const best = [3, 5, 8].map((k) => E.botRun(c, k)).filter(Boolean).sort((x, y) => x.steps - y.steps)[0];
    assert(best, a + ': no driver finishes');
    slowest = Math.max(slowest, best.steps); sum += best.steps;
    assert(best.steps < 60 * E.RATE, a + ': the best driver took ' + E.timeWords(best.steps) + ' s');
  }
  return 'mean ' + E.timeWords(Math.round(sum / Math.ceil(YEARS.length / 3))) + ' s, slowest ' + E.timeWords(slowest) + ' s, three laps';
});

check('a kept run re-runs to its step, and the pinned run still does', () => {
  const c = E.circuit('2026414600'), b = E.botRun(c, 5);
  assert(b.steps === 860, 'the pinned driver took ' + b.steps + ' steps where gr1 took 860: a change to the car takes a new version');
  const r = E.rerun(b.proof, { address: '2026414600', keep: true });
  assert(r.ok && r.steps === b.steps && r.time === E.timeWords(b.steps), 'the re-run said ' + JSON.stringify({ ok: r.ok, why: r.why, steps: r.steps }));
  assert(r.track.xs.length === b.steps + 1, 'the ghost\'s track holds every step');
  const again = E.rerun(b.proof, { address: '2026414600', keep: true });
  for (let i = 0; i <= b.steps; i += 37) assert(again.track.xs[i] === r.track.xs[i] && again.track.ys[i] === r.track.ys[i], 'two re-runs part at step ' + i);
  return b.proof.length + ' characters of proof for ' + r.time + ' s';
});

check('a run changed in any way does not count', () => {
  const c = E.circuit('2026414600'), b = E.botRun(c, 5), d = E.decode(b.proof);
  const faster = b.proof.replace('.' + b.steps + '.', '.' + (b.steps - 60) + '.');
  assert(!E.rerun(faster, { address: '2026414600' }).ok, 'a run claiming a second less counted');
  const slower = b.proof.replace('.' + b.steps + '.', '.' + (b.steps + 60) + '.');
  assert(!E.rerun(slower, { address: '2026414600' }).ok, 'a run claiming a second more counted');
  const moved = E.encode('2026414600', b.steps, d.toggles.map((t, i) => (i === 3 ? t + 9 : t)));
  const m = E.rerun(moved, { address: '2026414600' });
  assert(!m.ok || m.steps !== b.steps || moved === b.proof, 'a turn moved nine steps and the run still finished on the same step');
  assert(!E.rerun(b.proof, { address: '2026414500' }).ok, 'a run on another day\'s circuit counted for this one');
  for (const junk of ['', 'gw1.2026414600.860.', 'gr1.2026414600.0.', 'gr1.2026414600.99999.', 'gr1.20264146.860.', 'gr1.2026414600.860.1-0-2', 'gr1.2026414600.860.zzzzz']) assert(!E.decode(junk), 'read as a run: ' + junk);
  return 'faster, slower, a turn moved, another day, seven junk strings';
});

check('doing nothing is never a way to race', () => {
  let worst = Infinity;
  for (const a of YEARS.filter((_, i) => i % 15 === 0)) {
    const c = E.circuit(a), car = E.start(c), bot = [3, 5, 8].map((k) => E.botRun(c, k)).filter(Boolean).sort((x, y) => x.steps - y.steps)[0];
    let i = 0;
    for (; i < E.MAX_STEPS && !car.done; i++) E.step(c, car, false);
    const ratio = (car.done ? i : E.MAX_STEPS) / bot.steps;
    worst = Math.min(worst, ratio);
    assert(ratio > 2.5, a + ': a car never turned took ' + E.timeWords(i) + ' s against the driver\'s ' + E.timeWords(bot.steps) + ' s');
    const spin = E.start(c);
    for (let j = 0; j < E.MAX_STEPS && !spin.done; j++) E.step(c, spin, true);
    assert(!spin.done, a + ': a car held turning the whole way finished');
  }
  return 'never turning is at least ' + worst.toFixed(1) + ' times slower than driving, and always turning never finishes';
});

check('a wall slows the car, and running into one is a crash that stops it half a second', () => {
  const c = E.circuit('2026414600'), car = E.start(c);
  for (let i = 0; i < 40; i++) E.step(c, car, false);
  const fast = car.v;
  car.hx = car.hy = 0; const d = [c.points[1][1] - c.points[0][1], -(c.points[1][0] - c.points[0][0])];   // straight at the wall
  const l = E.isqrt(d[0] * d[0] + d[1] * d[1]); car.hx = Math.trunc(d[0] * E.ONE / l); car.hy = Math.trunc(d[1] * E.ONE / l);
  let crashed = -1;
  for (let i = 0; i < 40 && crashed < 0; i++) { E.step(c, car, false); if (car.crashed) crashed = i; }
  assert(crashed >= 0 && car.v === 0 && car.pause === 30, 'driven square at the wall at ' + fast + ' it did not crash');
  for (let i = 0; i < 30; i++) E.step(c, car, false);
  assert(car.pause === 0, 'the pause outlasted half a second');
  return 'square on at ' + (fast / 10000).toFixed(2) + ' of full speed: a crash, stopped for 30 steps';
});

check('time in words is steps over sixty, to the hundredth', () => {
  const cases = { 60: '1.00', 61: '1.02', 1071: '17.85', 860: '14.33', 10800: '180.00' };
  for (const [s, w] of Object.entries(cases)) assert(E.timeWords(+s) === w, s + ' steps said ' + E.timeWords(+s));
  return Object.values(cases).join(', ');
});

check('a day address and its date', () => {
  for (const a of YEARS.slice(0, 40)) assert(E.dayAddress(E.dayDate(a)) === a, a + ' did not come back');
  assert(!E.dayDate('2026414800') && !E.dayDate('2026414658') && !E.dayDate('20264146'), 'read a non-day as a day');
  return 'forty days there and back';
});

let failed = 0;
for (const r of results) { console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.note ? ' — ' + r.note : '')); if (!r.ok) failed++; }
console.log(failed ? failed + ' of ' + results.length + ' checks failed' : 'all ' + results.length + ' checks hold');
process.exit(failed ? 1 : 0);
