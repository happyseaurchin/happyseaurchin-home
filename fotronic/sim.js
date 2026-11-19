/* fotronic/sim.js — Fortress as a minimal team snake: the simulation alone.
 *
 * Built as spine:tronic-glass 1.1 stands (its side-rooms 1.12 to 1.17 on the beach, 26 October 2026):
 * a module that takes (law, seats, events) and steps at a fixed 120 ticks a second, deterministic,
 * with no unseeded randomness inside it. Drawing and input stay outside: a key handler never touches
 * the state; it sends an event {tick, seat, action} through the page's transport, and the page hands
 * the event in here with apply(). The bots live here too, but they drive the same way — botEvents()
 * returns the events they want to send, and the page sends them through the same transport.
 *
 * The law is one settings object, LAW, named as Armagetron names its settings (1.151) so anyone can
 * trace a number; a cup will name its rules by address and hand a law of its own to createMatch().
 * The arena, the zones and the spawns are numbers of the map in Armagetron, not settings, so they are
 * named plainly at the end of the same object.
 *
 * Units: metres, seconds, and ticks of 1/TICKS_PER_SECOND. Directions: 0 right (+x), 1 up (+y),
 * 2 left, 3 down — x to the right and y up from blue's end to gold's (1.12). A left turn is +1.
 */

export const LAW = {
  CYCLE_SPEED: 30,                 // the speed a cycle is drawn toward
  CYCLE_START_SPEED: 20,           // the speed it spawns at
  CYCLE_SPEED_MIN: 0.25,           // never below this fraction of CYCLE_SPEED
  CYCLE_SPEED_MAX: 0,              // 0: no top speed
  CYCLE_SPEED_DECAY_BELOW: 5,      // accel += (CYCLE_SPEED - v) * this when slower
  CYCLE_SPEED_DECAY_ABOVE: 0.1,    // accel += (CYCLE_SPEED - v) * this when faster
  CYCLE_ACCEL: 20,                 // wall acceleration: accel += this * (1/(d + OFFSET) - 1/(NEAR + OFFSET))
  CYCLE_ACCEL_OFFSET: 2,
  CYCLE_WALL_NEAR: 6,              // the side rays' length
  CYCLE_ACCEL_SELF: 1,             // own walls count fully
  CYCLE_ACCEL_TEAM: 1,             // teammates' walls count fully
  CYCLE_ACCEL_ENEMY: 1,            // enemy walls count fully
  CYCLE_ACCEL_RIM: 0,              // the rim not at all
  CYCLE_BRAKE: 30,                 // m/s² off while the brake is held
  CYCLE_BRAKE_DEPLETE: 1,          // the reservoir (0..1) drains this much a second braking
  CYCLE_BRAKE_REFILL: 0.1,         // and refills this much a second not braking
  CYCLE_DELAY: 0.1,                // one turn per this many seconds at most
  CYCLE_TURN_MEMORY: 3,            // up to this many turns queued
  CYCLE_TURN_SPEED_FACTOR: 0.95,   // each turn costs 5% of speed
  CYCLE_RUBBER: 5,                 // past this much rubber the cycle dies
  CYCLE_RUBBER_TIME: 10,           // rubber /= (1 + dt / this) each tick
  WALLS_LENGTH: 400,               // a wall is never longer than this: the tail retracts
  WALLS_STAY_UP_DELAY: 8,          // a dead cycle's wall stays this many seconds
  EXPLOSION_RADIUS: 0.75,          // wall within this of a crash goes at once
  FORTRESS_CONQUEST_RATE: 0.3,     // conquest += (this * enemies - DEFEND * owners - DECAY) * dt
  FORTRESS_DEFEND_RATE: 0.25,
  FORTRESS_CONQUEST_DECAY_RATE: 0.1,
  FORTRESS_CONQUERED_SCORE: 4,     // shared by the conquerors
  FORTRESS_COLLAPSE_SPEED: 0.5,    // a fallen zone shrinks away over 1/this seconds
  SCORE_WIN: 6,                    // a round won
  SCORE_KILL: 2,                   // a kill, to the killer
  LIMIT_SCORE: 100,                // the match ends at this (the Ladle plays 100 or 150)
  TEAM_MAX_PLAYERS: 6,
  SPAWN_WINGMEN_BACK: 2.202896,    // each step back from the leader
  SPAWN_WINGMEN_SIDE: 2.75362,     // and out to the side
  TICKS_PER_SECOND: 120,
  ROUND_RESULT_SECONDS: 3,         // the result shows for this long between rounds
  ROUND_COUNTDOWN_SECONDS: 3,      // then the countdown
  /* the map (1.12): a square walled on all four edges, a zone at each end, each leader inside its own zone */
  ARENA_SIZE: 500,
  FORTRESS_RADIUS: 40,
  ZONE_BLUE: { x: 250, y: 50 },
  ZONE_GOLD: { x: 250, y: 450 },
  SPAWN_BLUE: { x: 255, y: 50, dir: 1 },   // heading up
  SPAWN_GOLD: { x: 245, y: 450, dir: 3 },  // heading down
  SEED: 1                          // the one seed the bots' tie-breaks draw on
};

export const RIGHT = 0, UP = 1, LEFT = 2, DOWN = 3;
export const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
export const TEAMS = ['blue', 'gold'];
export const ACTIONS = ['L', 'R', 'BRAKE_ON', 'BRAKE_OFF'];

const EPS = 1e-9;
const RIM = -1;   // the owner of the rim's four walls

function other(team) { return team === 'blue' ? 'gold' : 'blue'; }
function turnOf(dir, action) { return action === 'L' ? (dir + 1) & 3 : (dir + 3) & 3; }
function left(dir) { return (dir + 1) & 3; }
function right(dir) { return (dir + 3) & 3; }

/* ── the match ── */

/* seats: [{team: 'blue'|'gold', seat: 1..TEAM_MAX_PLAYERS, handle, bot}] in any order; the index in the
 * array is the seat's number in every event. */
export function createMatch(law, seats, matchId) {
  law = Object.assign({}, LAW, law || {});
  const state = {
    law, match: matchId || 'local', tick: 0,
    phase: 'countdown', phaseUntil: Math.round(law.ROUND_COUNTDOWN_SECONDS * law.TICKS_PER_SECOND),
    round: 1, score: { blue: 0, gold: 0 }, rounds: { blue: 0, gold: 0 },
    lastRound: null,            // {winner: 'blue'|'gold'|null, how}
    seats: seats.map((s, i) => ({ index: i, team: s.team, seat: s.seat, handle: s.handle || (s.bot ? 'bot' : 'you'), bot: !!s.bot })),
    cycles: [], zones: null, inbox: [], news: [],
    bots: seats.map(() => ({ lastTurn: -1000, patience: 0, side: 0 })),
    rng: (law.SEED >>> 0) || 1
  };
  for (const t of TEAMS) {
    const n = state.seats.filter(s => s.team === t).length;
    if (n > law.TEAM_MAX_PLAYERS) throw new Error('too many ' + t + ' seats: ' + n + ' > TEAM_MAX_PLAYERS ' + law.TEAM_MAX_PLAYERS);
  }
  state.cycles = state.seats.map(s => spawnCycle(state, s));
  state.zones = freshZones(law);
  return state;
}

function rand(state) {   // a seeded LCG, the only randomness here, and only the bots draw on it
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 4294967296;
}

function freshZones(law) {
  return {
    blue: { team: 'blue', x: law.ZONE_BLUE.x, y: law.ZONE_BLUE.y, r: law.FORTRESS_RADIUS, conquest: 0, standing: true, fellAt: -1 },
    gold: { team: 'gold', x: law.ZONE_GOLD.x, y: law.ZONE_GOLD.y, r: law.FORTRESS_RADIUS, conquest: 0, standing: true, fellAt: -1 }
  };
}

/* seat k starts ceil(k/2) steps behind and beside its leader, odd seats to the left and even to the right (1.12) */
function spawnPoint(law, team, seat) {
  const sp = team === 'blue' ? law.SPAWN_BLUE : law.SPAWN_GOLD;
  const d = sp.dir;
  if (seat <= 1) return { x: sp.x, y: sp.y, dir: d };
  // the wingmen, counted from the leader: the first (seat 2) one step back to the left, the second (seat 3)
  // one step back to the right, the third two steps back to the left, and so on
  const m = seat - 1, steps = Math.ceil(m / 2), toLeft = m % 2 === 1 ? 1 : -1, l = left(d);
  return {
    x: sp.x - DX[d] * steps * law.SPAWN_WINGMEN_BACK + DX[l] * toLeft * steps * law.SPAWN_WINGMEN_SIDE,
    y: sp.y - DY[d] * steps * law.SPAWN_WINGMEN_BACK + DY[l] * toLeft * steps * law.SPAWN_WINGMEN_SIDE,
    dir: d
  };
}

function spawnCycle(state, s) {
  const p = spawnPoint(state.law, s.team, s.seat);
  return {
    index: s.index, team: s.team, seat: s.seat, handle: s.handle,
    x: p.x, y: p.y, dir: p.dir, v: state.law.CYCLE_START_SPEED,
    rubber: 0, brake: 1, braking: false, queue: [], lastTurn: -1000000,
    alive: true, diedAt: -1, killedBy: null, pushing: null,
    walls: [{ x1: p.x, y1: p.y, x2: p.x, y2: p.y }],
    kills: 0, deaths: 0, conquests: 0
  };
}

/* ── events ── */

/* an event {tick, seat, action}; the sim applies it at its tick, or now if that tick has passed */
export function apply(state, event) {
  if (!event || ACTIONS.indexOf(event.action) < 0) return false;
  const i = event.seat | 0;
  if (i < 0 || i >= state.cycles.length) return false;
  state.inbox.push({ tick: event.tick | 0, seat: i, action: event.action });
  return true;
}

function takeEvents(state) {
  const keep = [];
  for (const e of state.inbox) {
    if (e.tick > state.tick) { keep.push(e); continue; }
    const c = state.cycles[e.seat];
    if (!c.alive) continue;
    if (e.action === 'BRAKE_ON') c.braking = true;
    else if (e.action === 'BRAKE_OFF') c.braking = false;
    else if (c.queue.length < state.law.CYCLE_TURN_MEMORY) c.queue.push(e.action);
  }
  state.inbox = keep;
}

/* ── walls and rays ── */

function rimWalls(law) {
  const S = law.ARENA_SIZE;
  return [{ x1: 0, y1: 0, x2: S, y2: 0 }, { x1: S, y1: 0, x2: S, y2: S }, { x1: S, y1: S, x2: 0, y2: S }, { x1: 0, y1: S, x2: 0, y2: 0 }];
}

/* every wall in the arena this tick: [{seg, owner}] with the rim as owner RIM */
function allWalls(state) {
  const out = [];
  for (const w of state.rimCache || (state.rimCache = rimWalls(state.law))) out.push({ seg: w, owner: RIM });
  for (const c of state.cycles) for (const w of c.walls) out.push({ seg: w, owner: c.index });
  return out;
}

/* the distance s along a ray from (x,y) in direction dir, at most len, at which it meets the axis-aligned
 * segment; Infinity if it does not. A collinear overlap counts from where the overlap begins (0 when the
 * ray starts inside the segment). */
function rayHit(x, y, dir, len, seg) {
  const sx = DX[dir], sy = DY[dir];
  const horizontal = seg.y1 === seg.y2, vertical = seg.x1 === seg.x2;
  if (horizontal && vertical) {   // a point: a head that has not moved since its turn or its spawn
    const s = (seg.x1 - x) * sx + (seg.y1 - y) * sy;
    const off = Math.abs((seg.x1 - x) * sy) + Math.abs((seg.y1 - y) * sx);
    return off <= EPS && s >= -EPS && s <= len ? Math.max(0, s) : Infinity;
  }
  if (sy === 0) {   // travelling along x at height y
    if (vertical && !(horizontal && vertical)) {
      if (y < Math.min(seg.y1, seg.y2) - EPS || y > Math.max(seg.y1, seg.y2) + EPS) return Infinity;
      const s = (seg.x1 - x) * sx;
      return s >= -EPS && s <= len ? Math.max(0, s) : Infinity;
    }
    if (horizontal) {
      if (Math.abs(seg.y1 - y) > EPS) return Infinity;
      const a = (Math.min(seg.x1, seg.x2) - x) * sx, b = (Math.max(seg.x1, seg.x2) - x) * sx;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (hi < -EPS || lo > len) return Infinity;
      return Math.max(0, lo);
    }
    return Infinity;
  }
  // travelling along y at x
  if (horizontal && !(horizontal && vertical)) {
    if (x < Math.min(seg.x1, seg.x2) - EPS || x > Math.max(seg.x1, seg.x2) + EPS) return Infinity;
    const s = (seg.y1 - y) * sy;
    return s >= -EPS && s <= len ? Math.max(0, s) : Infinity;
  }
  if (vertical) {
    if (Math.abs(seg.x1 - x) > EPS) return Infinity;
    const a = (Math.min(seg.y1, seg.y2) - y) * sy, b = (Math.max(seg.y1, seg.y2) - y) * sy;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (hi < -EPS || lo > len) return Infinity;
    return Math.max(0, lo);
  }
  return Infinity;
}

/* the nearest wall from a cycle's head along dir, at most len away: {s, owner, seg} or null.
 * Its own head segment is never a wall to it; its own other segments are, except where they merely
 * touch the head (the segment it just turned off). */
export function castRay(state, c, dir, len, walls) {
  walls = walls || allWalls(state);
  let best = null;
  const head = c.walls[c.walls.length - 1];
  for (const w of walls) {
    if (w.owner === c.index) {
      if (w.seg === head) continue;
      const s = rayHit(c.x, c.y, dir, len, w.seg);
      if (s <= 1e-6 && dir === c.dir) continue;   // the segment it turned off, touching the head behind it
      if (s < len + EPS && (!best || s < best.s)) best = { s, owner: w.owner, seg: w.seg };
      continue;
    }
    const s = rayHit(c.x, c.y, dir, len, w.seg);
    if (s < len + EPS && (!best || s < best.s)) best = { s, owner: w.owner, seg: w.seg };
  }
  return best;
}

function isParallel(seg, dir) { return DY[dir] === 0 ? seg.y1 === seg.y2 && seg.x1 !== seg.x2 : seg.x1 === seg.x2 && seg.y1 !== seg.y2; }

/* a side ray meets a wall running parallel to the cycle at distance d: the nearest such, or null */
function sideWall(state, c, side, walls) {
  const law = state.law, dir = side === 'L' ? left(c.dir) : right(c.dir);
  let best = null;
  const head = c.walls[c.walls.length - 1];
  for (const w of walls) {
    if (w.seg === head) continue;
    if (!isParallel(w.seg, c.dir)) continue;
    const s = rayHit(c.x, c.y, dir, law.CYCLE_WALL_NEAR, w.seg);
    if (s <= EPS) continue;   // collinear with the head: no side distance
    if (s < law.CYCLE_WALL_NEAR + EPS && (!best || s < best.s)) best = { s, owner: w.owner };
  }
  return best;
}

function wallFactor(law, state, c, owner) {
  if (owner === RIM) return law.CYCLE_ACCEL_RIM;
  if (owner === c.index) return law.CYCLE_ACCEL_SELF;
  return state.cycles[owner].team === c.team ? law.CYCLE_ACCEL_TEAM : law.CYCLE_ACCEL_ENEMY;
}

function wallLength(walls) {
  let t = 0;
  for (const w of walls) t += Math.abs(w.x2 - w.x1) + Math.abs(w.y2 - w.y1);
  return t;
}

/* the tail retracts as the head advances (1.133) */
function trimWall(c, max) {
  let total = wallLength(c.walls);
  while (total > max + EPS && c.walls.length) {
    const w = c.walls[0];
    const len = Math.abs(w.x2 - w.x1) + Math.abs(w.y2 - w.y1);
    const cut = total - max;
    if (cut >= len - EPS && c.walls.length > 1) { c.walls.shift(); total -= len; continue; }
    if (len <= EPS) { if (c.walls.length > 1) { c.walls.shift(); continue; } break; }
    const f = Math.min(1, cut / len);
    w.x1 += (w.x2 - w.x1) * f; w.y1 += (w.y2 - w.y1) * f;
    total -= cut;
    break;
  }
}

/* wall within r of the crash goes at once, leaving a hole (1.133); the head segment of a live cycle stays last */
function explode(state, px, py) {
  const r = state.law.EXPLOSION_RADIUS;
  for (const c of state.cycles) {
    const out = [];
    for (let i = 0; i < c.walls.length; i++) {
      const w = c.walls[i], isHead = i === c.walls.length - 1;
      const pieces = cutSegment(w, px, py, r);
      if (isHead && c.alive) {
        if (!pieces.length || !same(pieces[pieces.length - 1], w, true)) {
          for (const p of pieces) if (!same(p, w, true)) out.push(p);
          out.push({ x1: w.x2, y1: w.y2, x2: w.x2, y2: w.y2 });   // a fresh head segment at the head
        } else for (const p of pieces) out.push(p);
      } else for (const p of pieces) out.push(p);
    }
    c.walls = out.length ? out : [{ x1: c.x, y1: c.y, x2: c.x, y2: c.y }];
  }
}
function same(p, w, atEnd) { return atEnd ? p.x2 === w.x2 && p.y2 === w.y2 : p.x1 === w.x1 && p.y1 === w.y1; }

/* the parts of an axis-aligned segment further than r from (px,py), in order from x1,y1 to x2,y2 */
function cutSegment(w, px, py, r) {
  const horizontal = w.y1 === w.y2;
  const off = horizontal ? w.y1 - py : w.x1 - px;
  if (Math.abs(off) >= r) return [w];
  const h = Math.sqrt(r * r - off * off);
  const a = horizontal ? w.x1 : w.y1, b = horizontal ? w.x2 : w.y2, p = horizontal ? px : py;
  const lo = p - h, hi = p + h;                         // the hole along the axis
  const s0 = Math.min(a, b), s1 = Math.max(a, b);
  if (hi <= s0 || lo >= s1) return [w];
  const parts = [];
  if (lo > s0) parts.push([s0, lo]);
  if (hi < s1) parts.push([hi, s1]);
  const mk = (u, v) => horizontal ? { x1: u, y1: w.y1, x2: v, y2: w.y1 } : { x1: w.x1, y1: u, x2: w.x1, y2: v };
  const ordered = a <= b ? parts : parts.reverse().map(([u, v]) => [v, u]);
  return ordered.map(([u, v]) => mk(u, v));
}

/* ── the tick ── */

/* one tick: the events for it are taken from the inbox, then the cycles move, the zones count, and the round is judged */
export function step(state) {
  const law = state.law, dt = 1 / law.TICKS_PER_SECOND;
  state.news = [];
  takeEvents(state);

  if (state.phase === 'play') {
    moveCycles(state, dt);
    judgeZones(state, dt);
    judgeRound(state);
  } else if (state.phase === 'result') {
    // the fallen zone shrinks away; dead walls still age
    ageWalls(state);
    for (const z of [state.zones.blue, state.zones.gold]) if (!z.standing && z.r > 0) z.r = Math.max(0, z.r - law.FORTRESS_RADIUS * law.FORTRESS_COLLAPSE_SPEED * dt);
    if (state.tick >= state.phaseUntil) {
      if (state.score.blue >= law.LIMIT_SCORE || state.score.gold >= law.LIMIT_SCORE) {
        state.phase = 'over'; state.news.push({ kind: 'over' });
      } else {
        state.round += 1;
        resetRound(state);
        state.phase = 'countdown'; state.phaseUntil = state.tick + Math.round(law.ROUND_COUNTDOWN_SECONDS * law.TICKS_PER_SECOND);
      }
    }
  } else if (state.phase === 'countdown') {
    if (state.tick >= state.phaseUntil) { state.phase = 'play'; state.news.push({ kind: 'go', round: state.round }); }
  }
  state.tick += 1;
  return state;
}

function resetRound(state) {
  state.cycles = state.seats.map(s => spawnCycle(state, s)).map((c, i) => Object.assign(c, { kills: state.cycles[i].kills, deaths: state.cycles[i].deaths, conquests: state.cycles[i].conquests }));
  state.zones = freshZones(state.law);
  state.inbox = [];
  for (const b of state.bots) { b.lastTurn = -1000; b.patience = 0; }
}

function ageWalls(state) {
  const stay = Math.round(state.law.WALLS_STAY_UP_DELAY * state.law.TICKS_PER_SECOND);
  for (const c of state.cycles) if (!c.alive && c.walls.length && state.tick - c.diedAt >= stay) c.walls = [];
}

function moveCycles(state, dt) {
  const law = state.law;
  const walls = allWalls(state);
  const plans = [];

  for (const c of state.cycles) {
    if (!c.alive) continue;
    // a queued turn, one per CYCLE_DELAY at most
    if (c.queue.length && state.tick - c.lastTurn >= Math.round(law.CYCLE_DELAY * law.TICKS_PER_SECOND)) {
      const a = c.queue.shift();
      c.dir = turnOf(c.dir, a);
      c.v *= law.CYCLE_TURN_SPEED_FACTOR;
      c.lastTurn = state.tick;
      const head = c.walls[c.walls.length - 1];
      head.x2 = c.x; head.y2 = c.y;
      c.walls.push({ x1: c.x, y1: c.y, x2: c.x, y2: c.y });
      state.news.push({ kind: 'turn', seat: c.index });
    }
    // speed (1.131)
    let accel = (law.CYCLE_SPEED - c.v) * (c.v < law.CYCLE_SPEED ? law.CYCLE_SPEED_DECAY_BELOW : law.CYCLE_SPEED_DECAY_ABOVE);
    // wall acceleration (1.132)
    for (const side of ['L', 'R']) {
      const w = sideWall(state, c, side, walls);
      if (!w) continue;
      const f = wallFactor(law, state, c, w.owner);
      if (f) accel += f * law.CYCLE_ACCEL * (1 / (w.s + law.CYCLE_ACCEL_OFFSET) - 1 / (law.CYCLE_WALL_NEAR + law.CYCLE_ACCEL_OFFSET));
    }
    // the brake and its reservoir
    if (c.braking && c.brake > 0) { accel -= law.CYCLE_BRAKE; c.brake = Math.max(0, c.brake - law.CYCLE_BRAKE_DEPLETE * dt); }
    else if (!c.braking) c.brake = Math.min(1, c.brake + law.CYCLE_BRAKE_REFILL * dt);
    c.v += accel * dt;
    const vmin = law.CYCLE_SPEED_MIN * law.CYCLE_SPEED;
    if (c.v < vmin) c.v = vmin;
    if (law.CYCLE_SPEED_MAX > 0 && c.v > law.CYCLE_SPEED_MAX) c.v = law.CYCLE_SPEED_MAX;
    // rubber drains each tick (1.134)
    c.rubber /= (1 + dt / law.CYCLE_RUBBER_TIME);
    // the step, tested as a segment against every wall
    const want = c.v * dt;
    const hit = castRay(state, c, c.dir, want, walls);
    let moved = want, pushing = null;
    if (hit) { moved = Math.max(0, hit.s - 0.01); c.rubber += want - moved; pushing = hit.owner; }
    plans.push({ c, moved, pushing });
  }

  // commit the moves, then look for heads that met
  for (const p of plans) {
    const c = p.c;
    c.x += DX[c.dir] * p.moved; c.y += DY[c.dir] * p.moved;
    const head = c.walls[c.walls.length - 1];
    head.x2 = c.x; head.y2 = c.y;
    c.pushing = p.pushing;
  }
  const dying = [];
  for (let i = 0; i < plans.length; i++) for (let j = i + 1; j < plans.length; j++) {
    const a = plans[i].c, b = plans[j].c;
    if (stepsMeet(a, b, plans[i].moved, plans[j].moved)) { dying.push([a, b.index]); dying.push([b, a.index]); }
  }
  for (const p of plans) if (p.c.rubber > state.law.CYCLE_RUBBER) dying.push([p.c, p.pushing]);
  for (const [c, by] of dying) if (c.alive) kill(state, c, by);
  for (const c of state.cycles) if (c.alive) trimWall(c, law.WALLS_LENGTH);
  ageWalls(state);
}

/* two heads meeting: the step segments cross or end on each other */
function stepsMeet(a, b, ma, mb) {
  const ax1 = a.x - DX[a.dir] * ma, ay1 = a.y - DY[a.dir] * ma;
  const bx1 = b.x - DX[b.dir] * mb, by1 = b.y - DY[b.dir] * mb;
  return segmentsTouch(ax1, ay1, a.x, a.y, bx1, by1, b.x, b.y);
}
function segmentsTouch(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
  const d = (ax2 - ax1) * (by2 - by1) - (ay2 - ay1) * (bx2 - bx1);
  if (Math.abs(d) < EPS) {   // parallel: collinear and overlapping, or not touching
    const cross = (bx1 - ax1) * (ay2 - ay1) - (by1 - ay1) * (ax2 - ax1);
    if (Math.abs(cross) > 1e-6) return false;
    const horizontal = Math.abs(ay2 - ay1) < EPS;
    const [a0, a1] = horizontal ? [Math.min(ax1, ax2), Math.max(ax1, ax2)] : [Math.min(ay1, ay2), Math.max(ay1, ay2)];
    const [b0, b1] = horizontal ? [Math.min(bx1, bx2), Math.max(bx1, bx2)] : [Math.min(by1, by2), Math.max(by1, by2)];
    if (Math.abs(ax2 - ax1) < EPS && Math.abs(ay2 - ay1) < EPS) return false;
    return a1 >= b0 - 1e-6 && b1 >= a0 - 1e-6 && (Math.abs(horizontal ? ay1 - by1 : ax1 - bx1) < 1e-6);
  }
  const t = ((bx1 - ax1) * (by2 - by1) - (by1 - ay1) * (bx2 - bx1)) / d;
  const u = ((bx1 - ax1) * (ay2 - ay1) - (by1 - ay1) * (ax2 - ax1)) / d;
  return t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6;
}

function kill(state, c, by) {
  const law = state.law;
  c.alive = false; c.diedAt = state.tick; c.deaths += 1; c.braking = false; c.queue = [];
  c.killedBy = by;
  let killer = null;
  if (by !== null && by !== RIM && by !== undefined) {
    const k = state.cycles[by];
    if (k && k.team !== c.team) { killer = k; k.kills += 1; state.score[k.team] += law.SCORE_KILL; }
  }
  state.news.push({ kind: 'death', seat: c.index, x: c.x, y: c.y, killer: killer ? killer.index : null });
  explode(state, c.x, c.y);
}

function judgeZones(state, dt) {
  const law = state.law;
  for (const z of [state.zones.blue, state.zones.gold]) {
    if (!z.standing) continue;
    let enemies = 0, owners = 0;
    const inside = [];
    for (const c of state.cycles) {
      if (!c.alive) continue;
      const dx = c.x - z.x, dy = c.y - z.y;
      if (dx * dx + dy * dy > z.r * z.r) continue;
      if (c.team === z.team) owners += 1; else { enemies += 1; inside.push(c); }
    }
    z.conquest += (law.FORTRESS_CONQUEST_RATE * enemies - law.FORTRESS_DEFEND_RATE * owners - law.FORTRESS_CONQUEST_DECAY_RATE) * dt;
    if (z.conquest < 0) z.conquest = 0;
    if (z.conquest >= 1 - 1e-9) {
      z.conquest = 1; z.standing = false; z.fellAt = state.tick;
      const taker = other(z.team);
      state.score[taker] += law.FORTRESS_CONQUERED_SCORE;
      for (const c of inside) c.conquests += 1;
      state.news.push({ kind: 'fall', zone: z.team, by: inside.map(c => c.index) });
    }
  }
}

function judgeRound(state) {
  const law = state.law;
  const blueAlive = state.cycles.some(c => c.team === 'blue' && c.alive);
  const goldAlive = state.cycles.some(c => c.team === 'gold' && c.alive);
  const blueZone = state.zones.blue.standing, goldZone = state.zones.gold.standing;
  let winner, how;
  if (!blueZone && !goldZone) { winner = null; how = 'both zones fell'; }
  else if (!blueZone) { winner = 'gold'; how = 'blue’s zone fell'; }
  else if (!goldZone) { winner = 'blue'; how = 'gold’s zone fell'; }
  else if (!blueAlive && !goldAlive) { winner = null; how = 'both teams dead'; }
  else if (!blueAlive) { winner = 'gold'; how = 'blue wiped out'; }
  else if (!goldAlive) { winner = 'blue'; how = 'gold wiped out'; }
  else return;
  if (winner) { state.score[winner] += law.SCORE_WIN; state.rounds[winner] += 1; }
  state.lastRound = { round: state.round, winner, how };
  state.news.push({ kind: 'round', winner, how });
  state.phase = 'result';
  state.phaseUntil = state.tick + Math.round(law.ROUND_RESULT_SECONDS * law.TICKS_PER_SECOND);
}

/* ── the result line (1.172) ── */

export function resultLine(state, seatIndex) {
  const s = state.seats[seatIndex];
  const c = state.cycles[seatIndex];
  let line = 'FOTRONIC ' + state.match + ' · BLUE ' + state.score.blue + ' – GOLD ' + state.score.gold + ' · rounds ' + state.rounds.blue + '–' + state.rounds.gold;
  if (s && c) line += ' · ' + s.handle + ' K' + c.kills + ' D' + c.deaths + ' C' + c.conquests;
  return line;
}

/* ── bots (1.161) ── */

const THINK_EVERY = 6;   // ticks: a bot looks twenty times a second

/* the events the bots want to send this tick; the page sends them through its transport */
export function botEvents(state) {
  const out = [];
  if (state.phase !== 'play') return out;
  const law = state.law;
  let walls = null;
  for (const c of state.cycles) {
    const seat = state.seats[c.index];
    if (!seat.bot || !c.alive) continue;
    if ((state.tick + c.index) % THINK_EVERY !== 0) continue;
    if (c.queue.length) continue;          // a turn is already on its way
    walls = walls || allWalls(state);
    const mem = state.bots[c.index];
    const far = 80;
    const look = dir => { const h = castRay(state, c, dir, far, walls); return h ? h.s : far; };
    const ahead = look(c.dir), room = { L: look(left(c.dir)), R: look(right(c.dir)) };
    // a wall closer than about 0.4 s of travel: turn toward open space
    const danger = Math.max(c.v * 0.4, 6);
    if (ahead < danger) {
      const side = room.L === room.R ? (rand(state) < 0.5 ? 'L' : 'R') : (room.L > room.R ? 'L' : 'R');
      if (room[side] > 1.5) { out.push({ tick: state.tick, seat: c.index, action: side }); mem.lastTurn = state.tick; }
      continue;
    }
    // where to go
    const t = botTarget(state, c, mem);
    if (!t) continue;
    const dx = t.x - c.x, dy = t.y - c.y;
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) continue;
    const want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? RIGHT : LEFT) : (dy > 0 ? UP : DOWN);
    if (want === c.dir) {
      // going the right way; but is the other axis far off, and is it worth a turn there first?
      continue;
    }
    if (state.tick - mem.lastTurn < Math.round(0.25 * law.TICKS_PER_SECOND)) continue;
    let side;
    if (want === left(c.dir)) side = 'L';
    else if (want === right(c.dir)) side = 'R';
    else side = room.L === room.R ? (rand(state) < 0.5 ? 'L' : 'R') : (room.L > room.R ? 'L' : 'R');   // behind: the roomier side
    const need = Math.max(15, c.v * 0.6);
    if (room[side] < need) {
      if (side === 'L' && room.R >= need && want === (c.dir + 2) % 4) side = 'R';
      else if (side === 'R' && room.L >= need && want === (c.dir + 2) % 4) side = 'L';
      else continue;
    }
    out.push({ tick: state.tick, seat: c.index, action: side });
    mem.lastTurn = state.tick;
  }
  return out;
}

function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

/* odd seats attack, even seats defend; a lone bot attacks */
function botTarget(state, c, mem) {
  const law = state.law, S = law.ARENA_SIZE;
  const own = state.zones[c.team], enemyZone = state.zones[other(c.team)];
  const enemies = state.cycles.filter(e => e.alive && e.team !== c.team);
  const sec = state.tick / law.TICKS_PER_SECOND;
  // odd seats attack, even seats defend; a defender whose team has no attacker left alive attacks too, so a round always resolves
  const attackerAlive = state.cycles.some(t => t.alive && t.team === c.team && t.seat % 2 === 1);
  const defender = c.seat % 2 === 0 && attackerAlive;
  const offset = ((c.index * 7919) % 360) * Math.PI / 180;   // a fixed phase of its own, so mirrored teams do not mirror forever
  if (!mem.side) mem.side = rand(state) < 0.5 ? -1 : 1;
  if (defender && own.standing) {
    const d = dist(c.x, c.y, own.x, own.y);
    if (d > 70) return { x: own.x, y: own.y };
    let near = null, nd = 150;
    for (const e of enemies) { const ed = dist(e.x, e.y, own.x, own.y); if (ed < nd) { nd = ed; near = e; } }
    if (near) return { x: near.x + DX[near.dir] * 12, y: near.y + DY[near.dir] * 12 };
    const a = sec * 0.9 + offset;
    return { x: own.x + Math.cos(a) * 48, y: own.y + Math.sin(a) * 48 };
  }
  // an attacker
  if (!enemyZone.standing) {
    // nothing left to take: hunt the nearest enemy
    let near = null, nd = Infinity;
    for (const e of enemies) { const ed = dist(e.x, e.y, c.x, c.y); if (ed < nd) { nd = ed; near = e; } }
    return near ? { x: near.x + DX[near.dir] * 20, y: near.y + DY[near.dir] * 20 } : { x: S / 2, y: S / 2 };
  }
  const inside = dist(c.x, c.y, enemyZone.x, enemyZone.y) < enemyZone.r;
  if (inside) {   // circle inside, so the count keeps running
    const a = sec * 1.2 + offset;
    return { x: enemyZone.x + Math.cos(a) * 22, y: enemyZone.y + Math.sin(a) * 22 };
  }
  const guarded = enemies.some(e => dist(e.x, e.y, enemyZone.x, enemyZone.y) < 70);
  mem.patience += THINK_EVERY;
  if (!guarded || mem.patience > 12 * law.TICKS_PER_SECOND) return { x: enemyZone.x, y: enemyZone.y };
  // guarded: run the side for speed, staging beside the enemy zone, until the way is clear
  const sideX = enemyZone.x + mem.side * 150;
  return { x: Math.max(20, Math.min(S - 20, sideX)), y: enemyZone.y + (c.team === 'blue' ? -60 : 60) };
}

/* ── the human-readable law, for a page or a check ── */
export function describeLaw(law) {
  law = law || LAW;
  return Object.keys(law).filter(k => typeof law[k] === 'number').map(k => k + ' ' + law[k]).join(', ');
}
