#!/usr/bin/env node
/* fotronic/checks.mjs — the DONE WHEN checks of spine:tronic-glass 1.162, run headless under node:
 *
 *   node fotronic/checks.mjs
 *
 * One check per clause, each driving the simulation module through the same events a page would send,
 * and one more for 1.16's determinism (the same inputs always give the same match). Exits 1 if any fails.
 */
import { LAW, createMatch, step, apply, botEvents, resultLine, castRay, UP, DOWN, LEFT, RIGHT, DX, DY } from './sim.js';

const TPS = LAW.TICKS_PER_SECOND;
const results = [];
const only = process.argv.slice(2).join(' ');   // node fotronic/checks.mjs <part of a name> runs that check alone
function check(name, fn) {
  if (only && name.indexOf(only) < 0) return;
  try { const note = fn(); results.push({ name, ok: true, note }); }
  catch (e) { results.push({ name, ok: false, note: e.message }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const secs = t => (t / TPS).toFixed(2) + ' s';

/* a match already in play: the countdown skipped */
function playing(seats, law) {
  const s = createMatch(law, seats, 'check');
  s.phase = 'play';
  return s;
}
/* put a cycle somewhere, with a fresh wall starting there */
function place(c, x, y, dir) { c.x = x; c.y = y; c.dir = dir; c.walls = [{ x1: x, y1: y, x2: x, y2: y }]; }
/* a wall of another cycle's, laid down as segments */
function lay(c, ...pts) { c.walls = []; for (let i = 1; i < pts.length; i++) c.walls.push({ x1: pts[i - 1][0], y1: pts[i - 1][1], x2: pts[i][0], y2: pts[i][1] }); c.walls.push({ x1: c.x, y1: c.y, x2: c.x, y2: c.y }); }

/* an inward square spiral: a cycle starts at the top-right corner of a square of side `first` centred on (cx,cy),
 * heading left, and turns left at every corner, each pair of legs `gap` shorter than the last; it never meets its
 * own wall and never leaves the square */
function spiral(cx, cy, first, gap) {
  const pts = [[cx - first / 2, cy + first / 2]];
  let x = cx - first / 2, y = cy + first / 2, dir = DOWN;
  const legs = [first, first];
  for (let l = first - gap; l > 0; l -= gap) legs.push(l, l);
  for (const len of legs) { x += DX[dir] * len; y += DY[dir] * len; pts.push([x, y]); dir = (dir + 1) & 3; }
  return { x: cx + first / 2, y: cy + first / 2, dir: LEFT, pts };
}
function ride(state, seat, cx, cy, first, gap) {
  const sp = spiral(cx, cy, first, gap);
  place(state.cycles[seat], sp.x, sp.y, sp.dir);
  return driver(state, seat, sp.pts);
}
/* a cycle kept alive out of the way, driven round a wide spiral for a minute or more */
function park(state, seat, cx, cy) { return ride(state, seat, cx, cy, 120, 5); }
function driver(state, seat, pts) {
  let i = 0;
  return () => {
    const c = state.cycles[seat];
    if (!c.alive || i >= pts.length) return;
    const [px, py] = pts[i];
    const passed = (c.x - px) * DX[c.dir] + (c.y - py) * DY[c.dir] >= 0;
    if (passed) { apply(state, { tick: state.tick, seat, action: 'L' }); i += 1; }
  };
}

check('one enemy alone takes your zone in 5.0 s', () => {
  const s = playing([{ team: 'blue', seat: 1 }, { team: 'gold', seat: 1 }]);
  // blue far away in a corner of its own, gold spiralling inside blue's zone
  const parked = park(s, 0, 250, 300);
  const z = s.zones.blue;
  const drive = ride(s, 1, z.x, z.y, 50, 5);
  const t0 = s.tick;
  while (s.zones.blue.standing) {
    parked(); drive(); step(s);
    assert(s.cycles[1].alive, 'the attacker died at ' + secs(s.tick - t0));
    assert(s.tick - t0 < 8 * TPS, 'the zone had not fallen after 8 s (conquest ' + s.zones.blue.conquest.toFixed(3) + ')');
  }
  const took = s.zones.blue.fellAt + 1 - t0;
  assert(Math.abs(took - 5 * TPS) <= 1, 'took ' + secs(took) + ', not 5.0 s');
  assert(s.score.gold === LAW.FORTRESS_CONQUERED_SCORE + LAW.SCORE_WIN && s.rounds.gold === 1, 'gold scored ' + s.score.gold + ', not ' + (LAW.FORTRESS_CONQUERED_SCORE + LAW.SCORE_WIN));
  return 'fell at ' + secs(took) + '; gold ' + s.score.gold + ' (4 for the conquest, 6 for the round)';
});

check('one attacker against one defender never does', () => {
  const s = playing([{ team: 'blue', seat: 1 }, { team: 'gold', seat: 1 }]);
  const z = s.zones.blue;
  const d0 = ride(s, 0, z.x - 18, z.y, 30, 3);   // the defender, in the left of its own zone
  const d1 = ride(s, 1, z.x + 18, z.y, 30, 3);   // the attacker, in the right of it
  const t0 = s.tick;
  let peak = 0;
  while (s.tick - t0 < 10 * TPS) {
    d0(); d1(); step(s);
    assert(s.cycles[0].alive && s.cycles[1].alive, 'a cycle died at ' + secs(s.tick - t0));
    peak = Math.max(peak, s.zones.blue.conquest);
    assert(s.zones.blue.standing, 'the zone fell at ' + secs(s.tick - t0));
  }
  return '10 s with both inside: conquest never above ' + peak.toFixed(3);
});

check('riding 0.5 m from a parallel wall lifts speed above 30, easing back after', () => {
  const s = playing([{ team: 'blue', seat: 1 }, { team: 'gold', seat: 1 }]);
  const rider = s.cycles[0], other = s.cycles[1];
  place(rider, 100, 100, UP);
  const parked = park(s, 1, 400, 400);
  lay(other, [100.5, 60], [100.5, 300]);          // gold's wall, parallel, 0.5 m to the right of the rider
  let top = 0, atWallEnd = 0, after = 0, eased = true;
  while (rider.y < 400) {
    parked(); step(s);
    assert(rider.alive, 'the rider died');
    if (rider.y < 300) { top = Math.max(top, rider.v); atWallEnd = rider.v; }
    else { if (rider.v > after + 1e-9 && after) eased = false; after = rider.v; }
  }
  assert(top > 30, 'speed never passed 30 (top ' + top.toFixed(2) + ')');
  assert(eased && after < atWallEnd && after > 30, 'speed did not ease back after the wall (' + atWallEnd.toFixed(2) + ' → ' + after.toFixed(2) + ')');
  // and the rim lifts nothing
  const r = playing([{ team: 'blue', seat: 1 }, { team: 'gold', seat: 1 }]);
  place(r.cycles[0], 0.5, 100, UP); const parked2 = park(r, 1, 400, 400);
  let rimTop = 0;
  while (r.cycles[0].y < 300) { parked2(); step(r); rimTop = Math.max(rimTop, r.cycles[0].v); }
  assert(rimTop <= 30 + 1e-6, 'the rim lifted speed to ' + rimTop.toFixed(2));
  return 'top ' + top.toFixed(1) + ' m/s beside the wall, ' + after.toFixed(1) + ' at 400 m and falling; the rim lifted nothing (' + rimTop.toFixed(1) + ')';
});

check('driving straight at a wall holds you about 0.17 s before you die, and a turn inside that lives', () => {
  function run(turnAfter) {
    const s = playing([{ team: 'blue', seat: 1 }, { team: 'gold', seat: 1 }]);
    const c = s.cycles[0], other = s.cycles[1];
    place(c, 100, 100, UP);
    const parked = park(s, 1, 400, 400);
    lay(other, [60, 160], [140, 160]);              // a wall across the path, 60 m ahead
    let contact = -1;
    while (c.alive && s.tick < 20 * TPS) {
      const before = c.y;
      parked(); step(s);
      if (contact < 0 && c.y - before < c.v / TPS - 1e-6 && c.y > 159) contact = s.tick - 1;
      if (turnAfter >= 0 && contact >= 0 && s.tick - 1 === contact + turnAfter) apply(s, { tick: s.tick, seat: 0, action: 'L' });
      if (contact >= 0 && turnAfter >= 0 && s.tick > contact + turnAfter + TPS) break;
    }
    return { contact, died: c.alive ? -1 : c.diedAt, alive: c.alive, c };
  }
  const a = run(-1);
  assert(a.contact >= 0 && a.died >= 0, 'no death at the wall');
  const held = a.died - a.contact;
  assert(held >= 0.14 * TPS && held <= 0.2 * TPS, 'held ' + secs(held) + ', not about 0.17 s');
  assert(a.c.x === 100 && Math.abs(a.c.y - 159.99) < 0.02, 'stopped at y ' + a.c.y.toFixed(3) + ', not 0.01 m short');
  const b = run(Math.round(0.1 * TPS));
  assert(b.alive, 'the turn at 0.1 s did not save it');
  assert(b.c.dir === LEFT && b.c.x < 90, 'after the turn it is heading ' + b.c.dir + ' at x ' + b.c.x.toFixed(1));
  return 'held ' + secs(held) + ' then died; a left turn 0.10 s after contact lived and ran along the wall';
});

check('no wall exceeds 400 m, and a dead cycle’s goes 8 s after', () => {
  const s = playing([{ team: 'blue', seat: 1 }, { team: 'gold', seat: 1 }, { team: 'blue', seat: 2 }]);
  const c = s.cycles[0];
  place(c, 40, 250, RIGHT);
  const parkedGold = park(s, 1, 400, 400), parkedBlue = park(s, 2, 120, 420);   // a teammate alive, so the round goes on after the death
  const parked = () => { parkedGold(); parkedBlue(); };
  const len = w => w.reduce((t, g) => t + Math.abs(g.x2 - g.x1) + Math.abs(g.y2 - g.y1), 0);
  let longest = 0;
  while (c.alive) { parked(); step(s); longest = Math.max(longest, len(c.walls)); assert(len(c.walls) <= LAW.WALLS_LENGTH + 1e-6, 'wall reached ' + len(c.walls).toFixed(1) + ' m'); }
  assert(c.killedBy === -1, 'died on something other than the rim');
  const died = c.diedAt;
  const stay = Math.round(LAW.WALLS_STAY_UP_DELAY * TPS);
  while (s.tick < died + stay) { parked(); step(s); }
  assert(s.cycles[0] === c && s.phase === 'play', 'the round ended (' + s.phase + ')');
  assert(c.walls.length > 0, 'the wall was gone before 8 s');
  parked(); step(s);
  assert(c.walls.length === 0, 'the wall still stood after 8 s');
  return 'longest ' + longest.toFixed(1) + ' m; the dead wall stood ' + secs(stay) + ' then went';
});

check('two quick turns both happen, 0.1 s apart', () => {
  const s = playing([{ team: 'blue', seat: 1 }, { team: 'gold', seat: 1 }]);
  const c = s.cycles[0];
  place(c, 250, 250, UP); const parked = park(s, 1, 400, 400);
  for (let i = 0; i < 10; i++) { parked(); step(s); }
  const t = s.tick;
  apply(s, { tick: t, seat: 0, action: 'L' });
  apply(s, { tick: t + 1, seat: 0, action: 'L' });
  const dirs = [];
  for (let i = 0; i < 30; i++) { parked(); step(s); dirs.push(c.dir); }
  const first = dirs.findIndex(d => d === LEFT), second = dirs.findIndex(d => d === DOWN);
  assert(first === 0, 'the first turn came at tick +' + first);
  assert(second === Math.round(LAW.CYCLE_DELAY * TPS), 'the second turn came at +' + second + ' ticks, not +' + Math.round(LAW.CYCLE_DELAY * TPS));
  assert(c.walls.length === 3, 'the wall has ' + c.walls.length + ' segments, not 3');
  return 'turns at +0 and +' + second + ' ticks (' + secs(second) + ')';
});

check('at 100 the match ends and shows its result line', () => {
  const seats = [1, 2, 3].flatMap(n => [{ team: 'blue', seat: n, bot: true, handle: 'blue' + n }, { team: 'gold', seat: n, bot: true, handle: 'gold' + n }]);
  const s = createMatch(null, seats, 'check');
  const cap = 30 * 60 * TPS;
  while (s.phase !== 'over' && s.tick < cap) {
    for (const e of botEvents(s)) apply(s, e);
    step(s);
  }
  assert(s.phase === 'over', 'the match had not ended after 30 minutes: ' + resultLine(s, 0));
  assert(Math.max(s.score.blue, s.score.gold) >= LAW.LIMIT_SCORE, 'ended below 100');
  const line = resultLine(s, 0);
  assert(/^FOTRONIC \S+ · BLUE \d+ – GOLD \d+ · rounds \d+–\d+ · \S+ K\d+ D\d+ C\d+$/.test(line), 'the line reads: ' + line);
  return line + ' — ' + secs(s.tick) + ' of play, ' + (s.rounds.blue + s.rounds.gold) + ' rounds won';
});

check('the same inputs always give the same match', () => {
  const seats = [1, 2].flatMap(n => [{ team: 'blue', seat: n, bot: true }, { team: 'gold', seat: n, bot: true }]);
  const run = () => {
    const s = createMatch({ LIMIT_SCORE: 30 }, seats, 'twin');
    while (s.phase !== 'over' && s.tick < 10 * 60 * TPS) { for (const e of botEvents(s)) apply(s, e); step(s); }
    return resultLine(s, 0) + ' @' + s.tick;
  };
  const a = run(), b = run();
  assert(a === b, 'the twins differ:\n  ' + a + '\n  ' + b);
  return a;
});

let failed = 0;
for (const r of results) {
  console.log((r.ok ? '  ok  ' : ' FAIL ') + r.name + (r.note ? '\n       ' + r.note : ''));
  if (!r.ok) failed += 1;
}
console.log(failed ? '\n' + failed + ' of ' + results.length + ' checks failed' : '\nall ' + results.length + ' checks pass');
process.exit(failed ? 1 : 0);
