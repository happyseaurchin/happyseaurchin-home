/* Ghost Race — the engine (27 Oct 2026, lane ghost-race.1): the day's circuit drawn from the day's address,
 * the car, and a run kept as its turns and re-run to count. The law is function:ghost-race on the beach;
 * the rules it keeps are Matthew's, function:arcade 1 to 6.
 *
 * Everything a run depends on is whole numbers and + - * / (function:arcade 4): the circuit is built from
 * the address by an integer generator (FNV-1a into mulberry32), headings are fixed-point vectors turned by
 * a fixed integer rotation and set back to length by an integer square root, and no Math.sin, cos or sqrt
 * is ever called here, so every browser re-runs a run to the same step. Drawing, in the page, may use
 * anything; nothing drawn is read back.
 *
 * The page imports this module; node imports it too (ghost-race/checks.mjs). */

export const VERSION = 'gr1';
export const RATE = 60;                 // steps a second
export const LAPS = 3;
export const MAX_STEPS = 180 * RATE;    // three minutes is out of time
export const W = 1000000, H = 1600000;  // the box the circuit stands in, upright, in units
export const ONE = 16384;               // a heading's length
export const HW = 55000;                // half the track's width
export const CR = 9000;                 // how far the car reaches toward a wall

// the car
const VMAX = 10000;       // units a step, driving straight
const VHOLD = 6500;       // what holding a turn settles to
const ACC = 150, ACC_HOLD = 60, DRAG = 90;
const TURN_C = 16344, TURN_S = 1143;          // four degrees a step, held
const CRASH_DN = 6924, CRASH_V = 3000;        // into a wall at twenty-five degrees or more, at speed: a crash
const PAUSE = 30;                             // a crash stops the car half a second
const SCRAPE = 384, SCRAPE_K = 1024;          // touching a wall slows it, hard: a car left to slide round the outside crawls

// the circuit
const R_MIN = 95000, R_MAX = 240000;          // a corner's radius, at the track's middle
const ARC_C = 16362, ARC_S = 857;             // three degrees, for drawing an arc out as points
const SPACING = 16000;                        // between points along a straight
const MARGIN = HW + 30000;                    // the corners stand this far inside the box
const L_MIN = 2300000, L_MAX = 3600000;       // a lap's length
const CLEAR = 2 * HW + 40000, CLEAR_ALONG = 4 * HW;
const STRAIGHT_MIN = 160000;                  // the start stands on a straight at least this long

// ── whole numbers ──
const div = (a, b) => Math.trunc(a / b);
export function isqrt(n) {
  if (n < 1) return 0;
  let x = 1;
  while (x * x <= n) x *= 2;
  for (;;) { const y = Math.floor((x + Math.floor(n / x)) / 2); if (y >= x) return x; x = y; }
}
function unit(dx, dy) {
  const l = isqrt(dx * dx + dy * dy);
  return l ? [div(dx * ONE, l), div(dy * ONE, l)] : [ONE, 0];
}
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

// ── the day ──
/* the sundial's day, full width: year, season, month in season, week band, day in band, '00' (the plug's
 * today(), and api/board.js, write it the same way) */
export function dayAddress(d) {
  const y = d.getUTCFullYear(), m0 = d.getUTCMonth(), dd = d.getUTCDate();
  return String(y) + (Math.floor(m0 / 3) + 1) + (m0 % 3 + 1) + (Math.floor((dd - 1) / 7) + 1) + ((dd - 1) % 7 + 1) + '00';
}
/* a day address back to its date, or null where it names no day */
export function dayDate(address) {
  const a = String(address || '');
  if (!/^\d{4}[1-4][1-3][1-5][1-7]00$/.test(a)) return null;
  const y = +a.slice(0, 4), m0 = (+a[4] - 1) * 3 + (+a[5] - 1), dd = (+a[6] - 1) * 7 + +a[7];
  const d = new Date(Date.UTC(y, m0, dd));
  return d.getUTCMonth() === m0 && d.getUTCDate() === dd ? d : null;
}

// ── the circuit ──
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  const h = lo.slice(0, -1).concat(up.slice(0, -1));
  let area = 0;
  for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; area += a[0] * b[1] - b[0] * a[1]; }
  return area > 0 ? h : h.reverse();   // clockwise on the screen, where y runs down: every corner a right-hander
}

/* one draw of a circuit from its seed text, or null where the draw is unfit to race. Its corners are the
 * convex hull of a few points, so every corner turns the same way, and the day's shape says how the points
 * fall: round the edge of the box and pulled in a little (a wide circuit), anywhere in it (a free one), or in
 * an upright strip (a long narrow one, its ends tight). */
const SHAPES = ['wide', 'free', 'narrow'];
function draw(text, shape) {
  const rnd = mulberry32(fnv1a('ghost-race ' + text)), pts = [];
  const iw = W - 2 * MARGIN, ih = H - 2 * MARGIN;
  if (shape === 0) {
    const n = 4 + rnd() % 4, per = 2 * (iw + ih), cx = div(W, 2), cy = div(H, 2);
    for (let i = 0; i < n; i++) {
      let s = rnd() % per, x, y;
      if (s < iw) { x = s; y = 0; } else if ((s -= iw) < ih) { x = iw; y = s; } else if ((s -= ih) < iw) { x = iw - s; y = ih; } else { x = 0; y = ih - (s - iw); }
      x += MARGIN; y += MARGIN;
      const f = rnd() % 30;
      pts.push([x + div((cx - x) * f, 100), y + div((cy - y) * f, 100)]);
    }
  } else if (shape === 1) {
    const n = 6 + rnd() % 4;
    for (let i = 0; i < n; i++) pts.push([MARGIN + rnd() % iw, MARGIN + rnd() % ih]);
  } else {
    // an upright strip: its four corners, each nudged, and a side or two bowed out
    const bow = div(iw, 10), sw = div(iw * (34 + rnd() % 22), 100), x0 = MARGIN + bow + rnd() % (iw - sw - 2 * bow + 1);
    const nudge = () => rnd() % 60000, top = MARGIN + rnd() % 120000, foot = H - MARGIN - rnd() % 120000;
    pts.push([x0 + nudge(), top + nudge()], [x0 + sw - nudge(), top + nudge()], [x0 + sw - nudge(), foot - nudge()], [x0 + nudge(), foot - nudge()]);
    for (let i = rnd() % 3; i > 0; i--) {
      const left = rnd() % 2, y = top + 200000 + rnd() % (foot - top - 400000);
      pts.push([left ? x0 - rnd() % bow : x0 + sw + rnd() % bow, y]);
    }
  }
  const v = hull(pts), k = v.length;
  if (k < 3) return null;
  const corners = [];
  for (let i = 0; i < k; i++) {
    const a = v[(i + k - 1) % k], b = v[i], c = v[(i + 1) % k];
    const u = unit(b[0] - a[0], b[1] - a[1]), w = unit(c[0] - b[0], c[1] - b[1]);
    const cross = div(u[0] * w[1] - u[1] * w[0], ONE), dot = div(u[0] * w[0] + u[1] * w[1], ONE);
    if (cross <= 0 || dot < -14189) return null;                // no left-hander, and nothing sharper than 150 degrees
    const half = div(cross * ONE, ONE + dot);                    // tan of half the turn
    const r = R_MIN + rnd() % (R_MAX - R_MIN);
    corners.push({ at: b, u, w, half, t: div(r * half, ONE), r, turn: dot });
  }
  // two corners share each side: where their arcs would overlap, both are tightened in proportion
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < k; i++) {
      const a = corners[i], b = corners[(i + 1) % k];
      const dx = b.at[0] - a.at[0], dy = b.at[1] - a.at[1], len = isqrt(dx * dx + dy * dy);
      if (a.t + b.t > len) { const s = a.t + b.t; a.t = div(a.t * len, s); b.t = div(b.t * len, s); }
    }
  }
  for (const c of corners) {
    c.r = c.half ? div(c.t * ONE, c.half) : R_MAX;
    if (c.r < R_MIN) return null;
    c.A = [c.at[0] - div(c.u[0] * c.t, ONE), c.at[1] - div(c.u[1] * c.t, ONE)];
    c.B = [c.at[0] + div(c.w[0] * c.t, ONE), c.at[1] + div(c.w[1] * c.t, ONE)];
    c.C = [c.A[0] - div(c.u[1] * c.r, ONE), c.A[1] + div(c.u[0] * c.r, ONE)];   // the centre, to the right of the way in
  }
  // the start: the middle of the longest straight
  let j = 0, best = -1;
  for (let i = 0; i < k; i++) {
    const a = corners[i].B, b = corners[(i + 1) % k].A, dx = b[0] - a[0], dy = b[1] - a[1], l = isqrt(dx * dx + dy * dy);
    if (l > best) { best = l; j = i; }
  }
  if (best < STRAIGHT_MIN) return null;
  const P = [];
  const push = (x, y) => { const q = P[P.length - 1]; if (!q || q[0] !== x || q[1] !== y) P.push([x, y]); };
  const straight = (a, b, first) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.max(1, Math.ceil(isqrt(dx * dx + dy * dy) / SPACING));
    for (let s = first ? 0 : 1; s <= m; s++) push(a[0] + div(dx * s, m), a[1] + div(dy * s, m));
  };
  const arc = (c) => {
    let x = c.A[0] - c.C[0], y = c.A[1] - c.C[1];
    const bx = c.B[0] - c.C[0], by = c.B[1] - c.C[1];
    for (let guard = 0; guard < 80; guard++) {
      let nx = div(x * ARC_C - y * ARC_S, ONE), ny = div(x * ARC_S + y * ARC_C, ONE);
      const l = isqrt(nx * nx + ny * ny); nx = div(nx * c.r, l); ny = div(ny * c.r, l);
      if (nx * by - ny * bx <= 0) break;
      push(c.C[0] + nx, c.C[1] + ny); x = nx; y = ny;
    }
    push(c.B[0], c.B[1]);
  };
  const s0 = corners[j].B, s1 = corners[(j + 1) % k].A, start = [div(s0[0] + s1[0], 2), div(s0[1] + s1[1], 2)];
  straight(start, s1, true);
  for (let i = 1; i <= k; i++) {
    const c = corners[(j + i) % k];
    arc(c);
    straight(c.B, i === k ? start : corners[(j + i + 1) % k].A, false);
  }
  if (P.length > 2 && P[P.length - 1][0] === P[0][0] && P[P.length - 1][1] === P[0][1]) P.pop();
  const m = P.length, S = new Array(m + 1), len = new Array(m);
  S[0] = 0;
  for (let i = 0; i < m; i++) {
    const a = P[i], b = P[(i + 1) % m], dx = b[0] - a[0], dy = b[1] - a[1];
    len[i] = Math.max(1, isqrt(dx * dx + dy * dy)); S[i + 1] = S[i] + len[i];
  }
  const L = S[m];
  if (L < L_MIN || L > L_MAX) return null;
  for (const q of P) if (q[0] < HW + 10000 || q[0] > W - HW - 10000 || q[1] < HW + 10000 || q[1] > H - HW - 10000) return null;
  for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) {
    const along = Math.min(S[b] - S[a], L - (S[b] - S[a]));
    if (along < CLEAR_ALONG) continue;
    const dx = P[a][0] - P[b][0], dy = P[a][1] - P[b][1];
    if (dx * dx + dy * dy < CLEAR * CLEAR) return null;
  }
  const hairpins = corners.filter((c) => c.turn < -5604).length;     // turning more than 110 degrees
  return { shape: SHAPES[shape], points: P, S, len, L, corners: corners.map((c) => ({ x: c.at[0], y: c.at[1], r: c.r, hairpin: c.turn < -5604 })), hairpins };
}

/* the day's circuit: the same address always draws the same circuit. The address picks the day's shape, and
 * a draw that is unfit to race (a corner too tight, a lap too short or too long, two parts of the track too
 * close, a straight too short to start on) is drawn again from the address with '#1', '#2' … added, keeping
 * its shape, as Ghost Wire redraws a wire. */
export function circuit(address) {
  const a = String(address), shape = fnv1a('ghost-race shape ' + a) % 3;   // about a third of days each
  for (let n = 0; n < 200; n++) {
    const c = draw(a + (n ? '#' + n : ''), shape);
    if (c) { c.address = a; c.redraws = n; return c; }
  }
  throw new Error('no circuit could be drawn from ' + a);
}
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
export function circuitWords(c) {
  const k = c.corners.length, h = c.hairpins;
  return WORDS[k] + ' corners' + (h ? ', ' + (h === k ? (k === 2 ? 'both' : 'all') + ' of them hairpins' : WORDS[h] + (h === 1 ? ' of them a hairpin' : ' of them hairpins')) : '');
}

// ── the car ──
/* where a car starts: on the line, facing down the straight, still */
export function start(c) {
  const p = c.points, d = unit(p[1][0] - p[0][0], p[1][1] - p[0][1]);
  return { x: p[0][0], y: p[0][1], hx: d[0], hy: d[1], v: 0, seg: 0, s: 0, prog: 0, pause: 0, crashes: 0, scrape: false, crashed: false, done: false, steps: 0 };
}
function nearest(c, car) {
  const P = c.points, m = P.length;
  let bestD = Infinity, bestI = car.seg, bx = 0, by = 0, bt = 0;
  for (let o = -5; o <= 5; o++) {
    const i = ((car.seg + o) % m + m) % m, a = P[i], b = P[(i + 1) % m];
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    let t = l2 ? div((car.x - a[0]) * dx + (car.y - a[1]) * dy, c.len[i]) : 0;     // along the segment, in units
    if (t < 0) t = 0; else if (t > c.len[i]) t = c.len[i];
    const qx = a[0] + div(dx * t, c.len[i]), qy = a[1] + div(dy * t, c.len[i]);
    const ex = car.x - qx, ey = car.y - qy, d = ex * ex + ey * ey;
    if (d < bestD) { bestD = d; bestI = i; bx = qx; by = qy; bt = t; }
  }
  return { i: bestI, x: bx, y: by, d2: bestD, t: bt };
}
/* one step: hold is whether the turn is held through it. The car turns right while held and goes straight
 * when let go; touching a wall slows it, and running into one at speed is a crash, which stops it for half
 * a second and sets it facing down the track. */
export function step(c, car, hold) {
  if (car.done) return car;
  car.steps++;
  car.scrape = false; car.crashed = false;
  if (car.pause > 0) {
    car.pause--;
    if (!car.pause) {
      const P = c.points, a = P[car.seg], b = P[(car.seg + 1) % P.length], d = unit(b[0] - a[0], b[1] - a[1]);
      car.hx = d[0]; car.hy = d[1]; car.v = 0;
    }
    return car;
  }
  if (hold) {
    const hx = div(car.hx * TURN_C - car.hy * TURN_S, ONE), hy = div(car.hx * TURN_S + car.hy * TURN_C, ONE);
    const d = unit(hx, hy); car.hx = d[0]; car.hy = d[1];
  }
  const target = hold ? VHOLD : VMAX;
  if (car.v < target) car.v = Math.min(target, car.v + (hold ? ACC_HOLD : ACC));
  else if (car.v > target) car.v = Math.max(target, car.v - DRAG);
  car.x += div(car.v * car.hx, ONE); car.y += div(car.v * car.hy, ONE);
  const q = nearest(c, car), lim = HW - CR;
  car.seg = q.i;
  if (q.d2 > lim * lim) {
    const d = isqrt(q.d2), nx = div((car.x - q.x) * ONE, d), ny = div((car.y - q.y) * ONE, d);
    car.x = q.x + div(nx * lim, ONE); car.y = q.y + div(ny * lim, ONE);
    const dn = div(car.hx * nx + car.hy * ny, ONE);
    if (dn > 0) {
      if (dn >= CRASH_DN && car.v >= CRASH_V) { car.v = 0; car.pause = PAUSE; car.crashes++; car.crashed = true; }
      else {
        const h = unit(car.hx - div(nx * dn, ONE), car.hy - div(ny * dn, ONE)); car.hx = h[0]; car.hy = h[1];
        car.v -= div(car.v * (SCRAPE + div(dn * SCRAPE_K, ONE)), 1024);
        car.scrape = true;
      }
    }
  }
  const s = c.S[q.i] + q.t;
  let ds = s - car.s;
  if (ds > c.L / 2) ds -= c.L; else if (ds < -c.L / 2) ds += c.L;
  car.prog += ds; car.s = s;
  if (car.prog >= LAPS * c.L) car.done = true;
  return car;
}
export function lapOf(c, car) { return Math.min(LAPS, Math.floor(Math.max(0, car.prog) / c.L) + 1); }

// ── a run kept ──
/* a run is 'gr1.<day>.<steps>.<turns>': the day's address, how many steps it took, and the steps at which
 * the turn was taken or let go, each written as the steps since the one before, in base 36, joined by '-'.
 * Nothing else: no positions, no times, so it can be read in full and still not faked. */
export function encode(address, steps, toggles) {
  let prev = 0;
  return VERSION + '.' + address + '.' + steps + '.' + toggles.map((t) => { const d = t - prev; prev = t; return d.toString(36); }).join('-');
}
export function decode(proof) {
  const m = /^gr1\.(\d{10})\.(\d{1,5})\.([0-9a-z-]*)$/.exec(String(proof || '').trim());
  if (!m) return null;
  const steps = +m[2], toggles = [];
  let at = 0;
  if (m[3]) for (const part of m[3].split('-')) {
    if (!/^[0-9a-z]{1,4}$/.test(part)) return null;
    const d = parseInt(part, 36);
    if (toggles.length && d < 1) return null;
    at += d; toggles.push(at);
  }
  if (!steps || steps > MAX_STEPS || toggles.some((t) => t >= steps)) return null;
  return { address: m[1], steps, toggles };
}
/* re-run a kept run on its circuit: it counts only if it finishes on its last step. With keep, the car's
 * place at every step comes back too, for drawing it as a ghost: x, y and heading, step by step. */
export function rerun(proof, opts) {
  opts = opts || {};
  const r = decode(proof);
  if (!r) return { ok: false, why: 'not a Ghost Race run' };
  if (opts.address && r.address !== String(opts.address)) return { ok: false, why: 'a run on another day\'s circuit' };
  const c = opts.circuit && opts.circuit.address === r.address ? opts.circuit : circuit(r.address);
  const car = start(c), keep = !!opts.keep;
  const xs = keep ? new Int32Array(r.steps + 1) : null, ys = keep ? new Int32Array(r.steps + 1) : null;
  const hxs = keep ? new Int16Array(r.steps + 1) : null, hys = keep ? new Int16Array(r.steps + 1) : null;
  if (keep) { xs[0] = car.x; ys[0] = car.y; hxs[0] = car.hx; hys[0] = car.hy; }
  let hold = false, ti = 0;
  for (let i = 0; i < r.steps; i++) {
    while (ti < r.toggles.length && r.toggles[ti] === i) { hold = !hold; ti++; }
    step(c, car, hold);
    if (keep) { xs[i + 1] = car.x; ys[i + 1] = car.y; hxs[i + 1] = car.hx; hys[i + 1] = car.hy; }
    if (car.done && i + 1 < r.steps) return { ok: false, why: 'it finished before its last step' };
  }
  if (!car.done) return { ok: false, why: 'it does not finish' };
  return { ok: true, address: r.address, steps: r.steps, time: timeWords(r.steps), crashes: car.crashes, track: keep ? { xs, ys, hxs, hys } : null };
}
/* a run's time in words, as its line says it: steps over sixty, to the hundredth */
export function timeWords(steps) {
  const cs = Math.round(steps * 100 / RATE);
  return Math.floor(cs / 100) + '.' + String(cs % 100).padStart(2, '0');
}

/* a driver for checking only, never on the board: it holds the turn while the track a little way ahead
 * lies to its right. ghost-race/checks.mjs drives every day's circuit with it. */
export function botRun(c, look) {
  look = look || 5;
  const car = start(c), toggles = [];
  let hold = false;
  for (let i = 0; i < MAX_STEPS && !car.done; i++) {
    const P = c.points, m = P.length, t = P[(car.seg + look) % m];
    const want = car.hx * (t[1] - car.y) - car.hy * (t[0] - car.x) > 0;
    if (want !== hold) { hold = want; toggles.push(i); }
    step(c, car, hold);
  }
  return car.done ? { steps: car.steps, toggles, crashes: car.crashes, proof: encode(c.address, car.steps, toggles) } : null;
}
