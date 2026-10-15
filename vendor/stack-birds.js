/* stack-birds.js — keel's StackBirds, carried verbatim from /animations/state-stack-birds (keel, 14 October 2026),
   loaded by /stack the first time its room screen or a phone's own figure is switched to Birds. To update: copy the block again from
   that page; it is self-contained. The API is described there, in the comment at the head of the page. */
/* ======================================================================================================================
   StackBirds — the State Stack's room, drawn as shorebirds. Self-contained: copy this whole block.
   ====================================================================================================================== */
const StackBirds = (function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u); };
  const ease = (dt, tau) => 1 - Math.exp(-dt / tau);

  function hash(s) {
    s = String(s); let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /* a small steady source of chance for each bird, from its id: the same phone hatches the same bird */
  function chance(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim()); const n = m ? parseInt(m[1], 16) : 0x808080; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const css = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : Math.max(0, Math.min(1, a)).toFixed(3)) + ')';

  /* ---- the room, read exactly as the State Stack reads it (animations/the-state-stack, and stats() in /stack) ---- */
  const avg = v => (v[0] + v[1] + v[2]) / 3;
  function phaseOf(m) {
    if (Math.abs(m - 0.5) < 0.15) return ['phasing C → B', 'ph-cb'];
    if (Math.abs(m - 1.5) < 0.15) return ['phasing B → A', 'ph-ba'];
    if (m < 0.5) return ['C', 'ph-c'];
    if (m < 1.5) return ['B', 'ph-b'];
    return ['A', 'ph-a'];
  }
  function middle(xs) {
    const s = xs.slice().sort((a, b) => a - b), n = s.length;
    if (!n) return 0;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }
  function asStack(p) {
    if (p && Array.isArray(p.v) && p.v.length === 3) return p.v.map(x => clamp(+x || 0, 0, 2));
    if (p && typeof p.value === 'number') { const x = clamp(p.value, 0, 2); return [x, x, x]; }
    return [0, 0, 0];
  }

  /* The shore before dawn. The light comes up with the room: C's slate night, B's amber dawn, A's clear teal morning,
     the State Stack's own colours. The warm light stays at the horizon throughout and the teal belongs to the sky,
     so the passage from B to A never muddies. */
  const SKY = [
    { top: '#04080D', mid: '#0A131B', low: '#18222A', core: '#A9B2BA', halo: '#5A6670', sea: '#0A1318', gI: 0.3 },
    { top: '#060C17', mid: '#121B2C', low: '#3A3244', core: '#FFD48A', halo: '#E6A63C', sea: '#0D141C', gI: 0.72 },
    { top: '#05121A', mid: '#0E2C38', low: '#2A5D62', core: '#FFF1D0', halo: '#F0D49A', sea: '#0B1B21', gI: 0.86 }
  ];
  const PALETTE = {
    seaNear: '#0F1D24', wet: '#172126', sand: '#262A2A', sandNear: '#313432', sandLit: '#3E3E39',
    ink: '#ECE5D6', shade: '#0A0F13', flash: '#FFF6E4'
  };

  function create(canvas, options) {
    const opt = Object.assign({ perPerson: 1, scale: 1, trails: false, still: null }, options || {});
    const pal = Object.assign({}, PALETTE, opt.palette || {});
    const P = {}; for (const k in pal) P[k] = rgb(pal[k]);
    const SK = (opt.sky || SKY).map(o => { const r = {}; for (const k in o) r[k] = typeof o[k] === 'number' ? o[k] : rgb(o[k]); return r; });
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return { set() {}, options() {}, state() { return null; }, advance() {}, destroy() {} };
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const still = () => (opt.still != null ? !!opt.still : !!(mq && mq.matches));

    let W = 0, H = 0, dpr = 1, K = 1;
    const L = { horizon: 0, edge: 0, top: 0, gx: 0, D: 1, roost: 1 };
    let birds = [];
    const byKey = new Map();
    let people = [];
    let roomRaw = { n: 0, med: 0, phase: phaseOf(0) };
    let T = 0, last = 0, running = false, onScreen = true, dead = false, labelAt = 0;
    let room = 0, F = 0, E = 0, S = 0, sally = 0;
    let wheel = 1, wheelAt = 16, waveAt = 3;
    let sky = skyAt(0);
    const local = { x: 0, y: 0, z: 0 }, far = { x: 0, y: 0, z: 0 };
    const acc = { x: 0, y: 0, z: 0 };
    let stars = [], grain = null;

    function skyAt(m) {
      const u = smooth(0.15, 0.85, m), w = smooth(1.15, 1.85, m), out = {};
      for (const k in SK[0]) {
        const a = SK[0][k], b = SK[1][k], c = SK[2][k];
        out[k] = typeof a === 'number' ? (m < 1 ? lerp(a, b, u) : lerp(b, c, w)) : (m < 1 ? mix(a, b, u) : mix(b, c, w));
      }
      return out;
    }

    /* ---------- layout: a sky over a strip of sea, the wash, wet sand, dry sand ---------- */
    function layout() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      let d = Math.min(window.devicePixelRatio || 1, 2);
      if (w * h * d * d > 7e6) d = Math.max(1, Math.sqrt(7e6 / (w * h)));
      if (w === W && h === H && d === dpr) return true;
      const kx = W ? w / W : 1, ky = H ? h / H : 1;
      birds.forEach(b => { b.x *= kx; b.y *= ky; b.z *= kx; b.hx *= kx; b.lx *= kx; b.tx = null; b.trail.length = 0; b.sx = b.x; b.sy = b.y; });
      W = w; H = h; dpr = d;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      K = clamp(Math.min(W / 760, H / 430), 0.72, 2.6);
      const tall = H > W * 0.9;
      L.horizon = H * (tall ? 0.54 : 0.56);
      L.edge = H * (tall ? 0.67 : 0.695);
      L.top = H * 0.07;
      L.gx = W * 0.66;
      L.D = W * 0.32;
      L.roost = Math.min(W * 0.13, (L.horizon - L.top) * 0.55);
      birds.forEach(b => { if (!b.placed) arrive(b); });          /* stacks that came while the canvas had no size */
      if (!stars.length) {
        const r = chance(7);
        for (let i = 0; i < 46; i++) stars.push({ x: r(), y: Math.pow(r(), 1.6) * 0.62, a: 0.3 + r() * 0.7, s: r() < 0.15 ? 1.6 : 1 });
      }
      if (!grain) {
        const g = document.createElement('canvas'); g.width = g.height = 140;
        const gc = g.getContext('2d'), r = chance(11);
        for (let i = 0; i < 1500; i++) { gc.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)'; gc.fillRect(r() * 140, r() * 140, 1, 1); }
        grain = ctx.createPattern(g, 'repeat');
      }
      return true;
    }

    /* depth: a bird further out over the sea is drawn smaller and nearer the horizon, toward the light */
    const project = (x, y, z) => { const s = 1 / (1 + Math.max(z, 0) / L.D); return { x: L.gx + (x - L.gx) * s, y: L.horizon + (y - L.horizon) * s, s }; };
    const swash = () => H * 0.011 * Math.sin(T * 0.6) + H * 0.004 * Math.sin(T * 1.33 + 1.1);
    const ripple = x => Math.sin(x * 0.011 + T * 0.8) * K * 1.4;
    const seaLine = x => L.edge + swash() + ripple(x);
    /* where a bird's feet are: a long bill feeds at the water's edge and follows the wash; a short one stands up the sand */
    function footing(b, x) {
      const follow = clamp(1 - b.offF / 0.045, 0, 1);
      return L.edge + K * 5 + b.offF * H + follow * (swash() + ripple(x));
    }

    /* ---------- a bird ---------- */
    function hatch(key, person, n) {
      const r = chance(hash(key));
      const bill = 4 + r() * 5.5;
      const b = {
        key, id: person.id, copy: n, mine: false, r, leaving: false,
        vt: asStack(person), vs: null, lean: 0, psy: 0, rel: 0, soc: 0, imp: 0, hold: 0, holdA: 0, goA: 0,
        mode: 'ground', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        dir: r() < 0.5 ? -1 : 1, tx: null, pause: r() * 2, alert: false, peck: 0, step: r() * TAU,
        chase: 0, flee: 0, rest: 0, wings: 0, stretch: 0,
        bill, size: 0.88 + r() * 0.24, pace: 0.85 + r() * 0.3, offF: (1 - (bill - 4) / 5.5) * 0.06 + r() * 0.035,
        ph: r() * TAU, flapv: 0, glide: 0, boost: 0, bank: 0, head: 0, flash: 0,
        hx: 0, hr: 0, ha: 0, hw: 1, alt: 0, aloft: 0, landing: false, lx: 0, flare: 0,
        trail: [], sx: 0, sy: 0, ss: 1, svx: 1, svy: 0, placed: false
      };
      b.vs = b.vt.slice();
      return b;
    }
    /* a spot on the sand near `around`, as far as can be from the birds already there */
    function spot(b, around, range) {
      let best = clamp(around, W * 0.05, W * 0.95), bestGap = -1;
      for (let i = 0; i < 5; i++) {
        const x = clamp(around + (b.r() * 2 - 1) * range, W * 0.05, W * 0.95);
        let gap = W;
        for (const o of birds) {
          if (o === b || o.leaving) continue;
          const ox = o.mode === 'ground' ? o.x : o.landing ? o.lx : null;
          if (ox != null) gap = Math.min(gap, Math.abs(ox - x));
        }
        if (gap > bestGap) { bestGap = gap; best = x; }
      }
      return best;
    }
    /* a stack that comes in once the screen is running flies in from the side and lands */
    function arrive(b) {
      b.placed = true;
      if (T > 1.5 && !still()) {
        const left = b.r() < 0.5;
        b.mode = 'air'; b.landing = true;
        b.x = left ? -K * 30 : W + K * 30; b.y = L.top + (L.horizon - L.top) * (0.25 + 0.3 * b.r()); b.z = 0;
        b.vx = (left ? 1 : -1) * K * 90; b.vy = 0;
        b.lx = spot(b, left ? W * 0.3 : W * 0.7, W * 0.2);
        b.dir = left ? 1 : -1;
      } else {
        b.x = spot(b, W * (0.08 + 0.84 * b.r()), W * 0.25);
        b.y = footing(b, b.x);
      }
      b.sx = b.x; b.sy = b.y;
    }
    function depart(b) { if (b.leaving) return; b.leaving = true; if (b.mode === 'ground') takeoff(b); b.landing = false; }

    function takeoff(b) {
      b.mode = 'air'; b.landing = false; b.z = 0; b.tx = null; b.chase = b.flee = 0; b.wings = 0;
      b.y -= K * 4;
      b.vx = b.dir * K * (35 + 40 * b.r()); b.vy = -K * (120 + 60 * b.imp); b.vz = 0;
      b.boost = 0.7; b.glide = 0;
      const l1 = clamp(b.lean, 0, 1), avail = Math.max(K * 40, b.y - L.top);
      b.alt = avail * (0.12 + 0.6 * l1) * (0.8 + 0.3 * b.r());
      b.hx = clamp(b.x + b.dir * W * (0.03 + 0.07 * b.r()), W * 0.12, W * 0.88);
      b.hr = W * (0.025 + 0.045 * l1) * (0.75 + 0.5 * b.r());
      b.ha = b.dir > 0 ? Math.PI : 0;
      b.hw = b.r() < 0.5 ? -1 : 1;
      b.aloft = (1.2 + 3.4 * l1) * (0.75 + 0.9 * clamp(b.soc, 0, 1)) * (0.8 + 0.4 * b.r());
      b.trail.length = 0;
    }
    function touchdown(b) {
      b.mode = 'ground'; b.landing = false; b.flare = 0;
      b.dir = b.vx < 0 ? -1 : 1;
      b.x = b.lx; b.z = 0; b.vx = b.vy = b.vz = 0; b.y = footing(b, b.x);
      b.wings = 1; b.rest = 1.0 + b.r() * 1.6; b.pause = 0.3; b.tx = null; b.trail.length = 0;
    }

    /* ---------- on the sand: walk, stop, peck; follow the wash; keep a patch, or let the others close ---------- */
    function ground(b, dt, airFrac) {
      const sp = K * 34 * b.pace;
      b.wings = Math.max(0, b.wings - dt * 2.2);
      if (b.stretch > 0) { b.stretch -= dt; b.wings = Math.max(b.wings, Math.min(1, b.stretch * 2.5)); }
      if (b.rest > 0) b.rest -= dt;
      let moving = false;
      if (b.chase > 0) { b.chase -= dt; b.x += b.dir * sp * 3.4 * dt; moving = true; b.peck = 0; }
      else if (b.flee > 0) { b.flee -= dt; b.x += b.dir * sp * 3.8 * dt; moving = true; b.peck = 0; }
      else if (b.pause > 0) { b.pause -= dt; b.peck = b.alert ? 0 : Math.max(0, Math.sin(T * 7.5 + b.ph)); }
      else {
        if (b.tx == null) b.tx = spot(b, b.x, W * 0.1);
        const gap = b.tx - b.x, d = sp * dt;
        if (Math.abs(gap) <= d) { b.x = b.tx; b.tx = null; b.pause = 0.7 + b.r() * 2.6; b.alert = b.r() < 0.3; }
        else { b.dir = gap < 0 ? -1 : 1; b.x += b.dir * d; moving = true; b.peck = 0; }
      }
      if (moving) b.step += dt * (b.chase > 0 || b.flee > 0 ? 34 : 15);
      const patch = K * (14 + 40 * (1 - clamp(b.rel, 0, 1)));
      for (const o of birds) {
        if (o === b || o.mode !== 'ground' || o.leaving) continue;
        const dx = o.x - b.x, ad = Math.abs(dx);
        if (ad >= patch) continue;
        if (b.rel < 0.45 && b.chase <= 0 && b.flee <= 0 && o.flee <= 0 && b.r() < dt * 0.9) {
          b.dir = dx < 0 ? -1 : 1; b.chase = 0.28 + b.r() * 0.2; b.tx = null;
          o.dir = b.dir; o.flee = 0.38 + o.r() * 0.2; o.tx = null; o.pause = 0;
        } else b.x -= (dx < 0 ? -1 : 1) * (patch - ad) * dt * 0.6;
      }
      b.x = clamp(b.x, W * 0.03, W * 0.97);
      b.y = footing(b, b.x);
      b.sx = b.x; b.sy = b.y; b.ss = 1;
      if (b.leaving) { takeoff(b); return; }
      let lam = b.imp < 0.06 ? 0 : 0.01 + 0.14 * Math.pow(b.imp, 1.6);   /* every so often, more often the higher it leans */
      lam *= 1 + 1.6 * airFrac;                                   /* others up make a bird readier */
      lam += 2.4 * F * b.hold;                                    /* past the decision point the flock calls it up */
      if (b.rest > 0 && F * b.hold < 0.5) lam *= 0.15;            /* just down: it settles first */
      if (Math.random() < lam * dt) { takeoff(b); return; }
      if (b.imp < 0.1 && b.stretch <= 0 && Math.random() < dt * 0.02) b.stretch = 0.8;   /* no wish to fly: a stretch */
    }

    /* ---------- in the air ---------- */
    function seek(b, tx, ty, tz, speed, gain) {
      const dx = tx - b.x, dy = ty - b.y, dz = tz - b.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const s = Math.min(speed, d * 1.6);
      acc.x += (dx / d * s - b.vx) * gain; acc.y += (dy / d * s - b.vy) * gain; acc.z += (dz / d * s - b.vz) * gain;
    }
    /* the others, as starlings attend to them: the seven nearest, whatever the distance */
    const near = [];
    function flock(b, air) {
      if (air.length < 2) return;
      near.length = 0;
      for (const o of air) {
        if (o === b) continue;
        const dx = o.x - b.x, dy = o.y - b.y, dz = o.z - b.z;
        near.push({ o, d2: dx * dx + dy * dy + dz * dz });
      }
      near.sort((p, q) => p.d2 - q.d2);
      const n = Math.min(7, near.length);
      let cx = 0, cy = 0, cz = 0, ux = 0, uy = 0, uz = 0, sx = 0, sy = 0, sz = 0;
      const sep = K * 40;
      for (let i = 0; i < n; i++) {
        const o = near[i].o;
        cx += o.x; cy += o.y; cz += o.z; ux += o.vx; uy += o.vy; uz += o.vz;
        const d = Math.sqrt(near[i].d2) || 0.01;
        if (d < sep) { const f = (sep - d) / sep / d; sx += (b.x - o.x) * f; sy += (b.y - o.y) * f; sz += (b.z - o.z) * f; }
      }
      const wc = 0.12 + 0.5 * F;
      const wa = (0.3 + 1.0 * F) * (0.55 + 0.45 * clamp(b.rel, 0, 1.4));
      acc.x += (cx / n - b.x) * wc; acc.y += (cy / n - b.y) * wc; acc.z += (cz / n - b.z) * wc;
      acc.x += (ux / n - b.vx) * wa; acc.y += (uy / n - b.vy) * wa; acc.z += (uz / n - b.vz) * wa;
      const ws = K * 420;
      acc.x += sx * ws; acc.y += sy * ws; acc.z += sz * ws;
    }
    function bounds(b, groundY) {
      const p = project(b.x, b.y, b.z);
      if (!b.leaving) {
        const m = W * 0.04;
        if (p.x < m) acc.x += (m - p.x) / p.s * 6;
        if (p.x > W - m) acc.x -= (p.x - (W - m)) / p.s * 6;
      }
      const top = L.top * 0.7;
      if (p.y < top) acc.y += (top - p.y) / p.s * 8;
      if (!b.landing) { const floor = groundY - K * 26; if (b.y > floor) acc.y -= (b.y - floor) * 8; }
      if (b.z < 0) acc.z -= b.z * 10;
      if (b.z > W * 1.3) acc.z -= (b.z - W * 1.3) * 4;
    }
    function turn(b, a) {
      const c = Math.cos(a), s = Math.sin(a), vx = b.vx, vy = b.vy;
      b.vx = vx * c - vy * s; b.vy = vx * s + vy * c; b.vz += (Math.random() - 0.5) * K * 60;
    }
    function fly(b, dt, air) {
      acc.x = acc.y = acc.z = 0;
      const held = b.leaving ? 0 : F * b.hold;
      const groundY = footing(b, b.x);
      let cruise = K * 78 * b.pace;
      if (b.leaving) {
        seek(b, b.x < W / 2 ? -W * 0.3 : W * 1.3, L.top + (L.horizon - L.top) * 0.3, 0, K * 150, 1.2);
        cruise = K * 140;
      } else {
        if (!b.landing) {
          b.aloft -= dt * (1 - held);
          if (b.aloft <= 0 && held < 0.5) { b.landing = true; b.lx = spot(b, clamp(b.x + b.vx * 0.9, W * 0.06, W * 0.94), W * 0.06); }
        } else if (held > 0.8) { b.landing = false; b.aloft = 1.5; }
        if (b.landing) {
          const fy = footing(b, b.lx);
          seek(b, b.lx, fy - K * 2, 0, K * 92, 2.0);
          const d = Math.sqrt((b.lx - b.x) * (b.lx - b.x) + (fy - b.y) * (fy - b.y) + b.z * b.z);
          b.flare = smooth(K * 70, K * 14, d);
          cruise = K * lerp(92, 38, b.flare);
          if (d < K * 8) { touchdown(b); return; }
        } else {
          const self = 1 - held;
          if (self > 0.02) {                                         /* its own flight: climb to its height and look round */
            b.ha += dt * b.hw * (K * 80) / Math.max(b.hr, K * 20);
            seek(b, b.hx + Math.cos(b.ha) * b.hr, groundY - b.alt + Math.sin(b.ha) * b.hr * 0.32, 0, K * 95, 1.1 * self);
          }
          flock(b, air);
          if (held > 0.01) {
            /* held by the flock: free to wheel inside the roost, drawn back hard from beyond it, a slow common turn so
               the flock mills; toward A the roost itself goes out over the sea, into the light */
            const g = b.goA;
            const rx = lerp(local.x, far.x, g), ry = lerp(local.y, far.y, g), rz = lerp(local.z, far.z, g);
            const Rr = L.roost * (1 - 0.55 * g);
            const dx = b.x - rx, dy = (b.y - ry) / 0.6, dz = (b.z - rz) / 0.55;
            const r = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            const pull = ((r > Rr ? (r - Rr) * 2.4 : 0) + r * 0.1) * held;
            acc.x -= dx / r * pull; acc.y -= dy / r * pull; acc.z -= dz / r * pull;
            const ang = 0.55 * Math.sin(T * 0.043), ay = Math.sin(ang), az = Math.cos(ang);
            const tx = ay * dz - az * dy, ty = az * dx, tz = -ay * dx;
            const tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
            const sw = wheel * held * (1 - g) * K * 38;
            acc.x += tx / tl * sw; acc.y += ty / tl * sw; acc.z += tz / tl * sw;
            cruise = K * (lerp(80, 94, held) + 160 * g) * b.pace;
          }
        }
      }
      bounds(b, groundY);
      const amax = K * 1100;
      const al = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      if (al > amax) { const q = amax / al; acc.x *= q; acc.y *= q; acc.z *= q; }
      b.vx += acc.x * dt; b.vy += acc.y * dt; b.vz += acc.z * dt;
      let sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz) || 1;
      const q = 1 + (cruise / sp - 1) * Math.min(1, dt * 1.4);
      b.vx *= q; b.vy *= q; b.vz *= q; sp *= q;
      const vmax = cruise * 1.8;
      if (sp > vmax) { const r = vmax / sp; b.vx *= r; b.vy *= r; b.vz *= r; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      /* how it looks on the screen: heading, bank, the flash of a turn, the wingbeat */
      const p = project(b.x, b.y, b.z);
      const svx = (p.x - b.sx) / dt, svy = (p.y - b.sy) / dt;
      if (svx * svx + svy * svy > 1) {
        const head = Math.atan2(svy, svx);
        let dh = head - b.head; while (dh > Math.PI) dh -= TAU; while (dh < -Math.PI) dh += TAU;
        b.head = head;
        b.bank += (clamp(dh / dt * 0.22, -1, 1) - b.bank) * ease(dt, 0.18);
        b.svx = svx; b.svy = svy;
      }
      b.flash = Math.max(b.flash - dt * 1.6, Math.abs(b.bank));
      b.sx = p.x; b.sy = p.y; b.ss = p.s;
      if (opt.trails) { b.trail.push(p.x, p.y); if (b.trail.length > 28) b.trail.splice(0, 2); }
      const climbing = b.vy < -K * 30 || b.boost > 0;
      if (b.boost > 0) b.boost -= dt;
      if (b.glide > 0) b.glide -= dt;
      else if (!climbing && !b.landing && Math.random() < dt * 0.45) b.glide = 0.35 + Math.random() * 0.6;
      const hz = b.boost > 0 ? 5.4 : climbing ? 3.9 : 2.8;
      if (b.glide <= 0 || b.landing) b.ph += dt * TAU * hz * (0.9 + 0.2 * b.size);
      const target = b.landing && b.flare > 0.5 ? -0.9 : b.glide > 0 && !b.landing ? 0.3 : Math.sin(b.ph);
      b.flapv += (target - b.flapv) * ease(dt, 0.05);
    }

    /* ---------- one step of the world ---------- */
    function step(dt) {
      T += dt;
      const a = ease(dt, 0.9), leans = [];
      for (const b of birds) {
        for (let i = 0; i < 3; i++) b.vs[i] += (b.vt[i] - b.vs[i]) * a;
        b.soc = b.vs[0]; b.rel = b.vs[1]; b.psy = b.vs[2];
        b.lean = avg(b.vs);
        b.imp = clamp((0.55 * Math.min(b.psy, 1.2) + 0.45 * Math.min(b.lean, 1.2) - 0.1) / 0.9, 0, 1);
        b.hold = smooth(0.3, 0.6, b.lean);
        b.holdA = smooth(1.1, 1.45, b.lean);
        if (!b.leaving && b.copy === 0) leans.push(b.lean);
      }
      room += ((leans.length ? middle(leans) : 0) - room) * ease(dt, 1.6);
      F = smooth(0.35, 0.65, room);
      E = smooth(1.35, 1.65, room);
      S = smooth(1.0, 1.4, room) * (1 - E);
      sally = S * Math.pow(0.5 - 0.5 * Math.cos(T * 0.19), 2);
      const span = L.horizon - L.top;
      local.x = W * 0.44 + W * 0.16 * Math.sin(T * 0.061) + W * 0.04 * Math.sin(T * 0.17 + 1.0);
      local.y = L.top + span * 0.36 + span * 0.08 * Math.sin(T * 0.083 + 0.6);
      local.z = W * (0.05 + 0.02 * Math.sin(T * 0.047));
      far.z = W * 0.75;
      const fs = 1 / (1 + far.z / L.D);
      far.x = L.gx + W * 0.04 * Math.sin(T * 0.23);
      far.y = L.horizon - span * (0.13 + 0.03 * Math.sin(T * 0.31)) / fs;
      if (T > wheelAt) { wheel = -wheel; wheelAt = T + 14 + Math.random() * 18; }
      const air = birds.filter(b => b.mode === 'air' && !b.leaving && !b.landing);
      const airFrac = birds.length ? air.length / birds.length : 0;
      if (F > 0.55 && T > waveAt && air.length > 2) {
        turn(air[(Math.random() * air.length) | 0], (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.6));
        waveAt = T + 2.2 + Math.random() * 4;
      }
      for (const b of birds) {
        b.goA += (Math.max(E, sally * 0.6) * b.holdA - b.goA) * ease(dt, 2.2);
        if (b.mode === 'ground') ground(b, dt, airFrac); else fly(b, dt, air);
      }
      birds = birds.filter(b => {
        if (!b.leaving || b.mode !== 'air') return true;
        const gone = b.sx < -K * 60 || b.sx > W + K * 60;
        if (gone) byKey.delete(b.key);
        return !gone;
      });
      sky = skyAt(room);
    }

    /* ---------- drawing ---------- */
    function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    function oval(x, y, rx, ry, a) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, TAU); ctx.fill(); }

    function backdrop() {
      const G = sky, hz = L.horizon;
      let g = ctx.createLinearGradient(0, 0, 0, hz);
      g.addColorStop(0, css(G.top)); g.addColorStop(0.55, css(G.mid)); g.addColorStop(1, css(G.low));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 1);
      const sa = 0.5 * (1 - smooth(0.25, 0.85, room));                 /* stars, before the light comes */
      if (sa > 0.01) {
        ctx.fillStyle = css(P.ink);
        for (const s of stars) { ctx.globalAlpha = sa * s.a; ctx.fillRect(s.x * W, L.top * 0.5 + s.y * (hz - L.top), s.s, s.s); }
        ctx.globalAlpha = 1;
      }
      ctx.save();                                                       /* the light: a wide halo and a bright core */
      ctx.beginPath(); ctx.rect(0, 0, W, hz); ctx.clip();
      ctx.translate(L.gx, hz); ctx.scale(1, 0.3);
      let R = W * 0.7;
      let rg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      rg.addColorStop(0, css(G.halo, 0.55 * G.gI)); rg.addColorStop(0.35, css(G.halo, 0.2 * G.gI)); rg.addColorStop(1, css(G.halo, 0));
      ctx.fillStyle = rg; ctx.fillRect(-R, -R, 2 * R, R);
      R = W * 0.16;
      rg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      rg.addColorStop(0, css(G.core, 0.95 * G.gI)); rg.addColorStop(0.4, css(G.core, 0.35 * G.gI)); rg.addColorStop(1, css(G.core, 0));
      ctx.fillStyle = rg; ctx.fillRect(-R, -R, 2 * R, R);
      ctx.restore();
      g = ctx.createLinearGradient(0, hz, 0, L.edge);                  /* the sea */
      g.addColorStop(0, css(mix(G.sea, G.halo, 0.1 * G.gI)));
      g.addColorStop(1, css(P.seaNear));
      ctx.fillStyle = g; ctx.fillRect(0, hz, W, L.edge - hz + H * 0.04);
      const hl = ctx.createLinearGradient(L.gx - W * 0.42, 0, L.gx + W * 0.42, 0);
      hl.addColorStop(0, css(G.core, 0)); hl.addColorStop(0.5, css(G.core, 0.8 * G.gI)); hl.addColorStop(1, css(G.core, 0));
      ctx.fillStyle = hl; ctx.fillRect(L.gx - W * 0.42, hz - 0.5, W * 0.84, Math.max(1, K * 0.9));
      ctx.lineWidth = Math.max(1, K * 0.75);                           /* the light's road on the water, cream glints aside */
      for (let i = 1; i <= 9; i++) {
        const f = i / 10;
        const y = Math.round(hz + (L.edge - hz) * Math.pow(f, 1.35)) + 0.5;
        const a = 0.16 + 0.1 * Math.sin(T * 0.8 + i * 1.7);
        const half = W * (0.025 + 0.11 * f);
        const drift = Math.sin(T * 0.25 + i * 2.3) * 8 * K;
        ctx.strokeStyle = css(G.core, (a + 0.12 * (1 - f)) * (0.35 + 0.85 * G.gI));
        line(L.gx - half + drift, y, L.gx + half + drift, y);
        ctx.strokeStyle = css(P.ink, a * 0.32);
        line(L.gx - half * 2.4 - drift * 0.5, y, L.gx - half * 1.5 - drift * 0.5, y);
        line(L.gx + half * 1.6 + drift * 0.7, y, L.gx + half * 2.3 + drift * 0.7, y);
      }
      ctx.beginPath();                                                  /* the sand, below the moving edge of the water */
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, seaLine(x));
      ctx.lineTo(W, H); ctx.closePath();
      const lit = clamp((G.gI - 0.3) * 0.4, 0, 0.25);
      g = ctx.createLinearGradient(0, L.edge, 0, H);
      g.addColorStop(0, css(mix(P.wet, G.low, 0.22))); g.addColorStop(0.24, css(P.wet));
      g.addColorStop(0.42, css(mix(P.sand, P.sandLit, lit))); g.addColorStop(1, css(mix(P.sandNear, P.sandLit, lit)));
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      const ey = seaLine(L.gx);
      ctx.translate(L.gx, ey); ctx.scale(1, 0.22);
      const wr = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.32);
      wr.addColorStop(0, css(G.core, 0.2 * G.gI)); wr.addColorStop(1, css(G.core, 0));
      ctx.fillStyle = wr; ctx.fillRect(-W * 0.4, 0, W * 0.8, H * 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (grain) { ctx.globalAlpha = 0.07; ctx.fillStyle = grain; ctx.fillRect(0, L.edge - H * 0.03, W, H); ctx.globalAlpha = 1; }
      ctx.restore();
      const wave = (dy, alpha, width, speed) => {                       /* the wash, and the film it leaves */
        ctx.globalAlpha = alpha; ctx.strokeStyle = css(P.ink); ctx.lineWidth = width;
        ctx.beginPath();
        for (let x = 0; x <= W + 8; x += 8) { const y = seaLine(x) + dy + Math.sin(x * 0.031 + T * speed) * K * 1.1; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke(); ctx.globalAlpha = 1;
      };
      wave(0, 0.5, Math.max(1, K * 0.9), 0.6);
      wave(K * 7 + (Math.sin(T * 0.6 + 1.4) + 1) * K * 4, 0.14, Math.max(1, K * 0.7), -0.4);
    }

    /* a bird against the light becomes a silhouette, as birds do at dawn */
    function inkAt(x, y) {
      if (y >= L.horizon) return P.ink;
      const dx = x - L.gx, dy = y - L.horizon;
      const hx = dx / (W * 0.3), hy = dy / (W * 0.08), cx = dx / (W * 0.07), cy = dy / (W * 0.022);
      const lum = sky.gI * (0.55 * Math.exp(-(hx * hx + hy * hy)) + 0.95 * Math.exp(-(cx * cx + cy * cy)));
      return mix(P.ink, P.shade, smooth(0.18, 0.5, lum));
    }

    /* a bird standing, its feet at (x, y), facing the way it last walked; flip draws its reflection in the wet sand */
    function standing(b, x, y, flip, col, alpha) {
      const kk = K * 1.4 * b.size * opt.scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(b.dir * kk, (flip ? -0.6 : 1) * kk);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ctx.strokeStyle = css(col);
      ctx.lineWidth = 1.05;
      const dip = b.peck || 0;
      const walking = b.chase > 0 || b.flee > 0 || (b.tx != null && b.pause <= 0);
      const run = walking ? Math.sin(b.step) * (b.chase > 0 || b.flee > 0 ? 1.7 : 1.2) : 0;
      line(-0.9 + run, 0, -0.1, -5.4); line(1.5 - run, 0, 1.0, -5.4);
      oval(0, -7.6, 6.3, 3.35, -0.12 + dip * 0.4);
      ctx.beginPath(); ctx.moveTo(-4.8, -8.9); ctx.lineTo(-8.8, -9.6 + dip * 0.8); ctx.lineTo(-5.2, -6.5); ctx.closePath(); ctx.fill();
      const hx = 4.9 + dip * 1.7, hy = -10.3 + dip * 6.4;
      oval(hx, hy, 2.3, 2.15, 0);
      line(hx + 1.6, hy + 0.3, hx + 1.6 + b.bill * 0.9, hy + 0.85 + dip * b.bill * 0.6);
      if (b.wings > 0.02 && !flip) {
        const w = b.wings;
        ctx.beginPath(); ctx.moveTo(-0.4, -9.6); ctx.quadraticCurveTo(-1.2, -15 - 5 * w, -6 - 2.5 * w, -13 - 8.5 * w); ctx.quadraticCurveTo(-4.4, -11.4 - 3 * w, -3.2, -8.8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(1.2, -9.9); ctx.quadraticCurveTo(1.0, -16 - 6 * w, -2.8 - 1.5 * w, -14.5 - 9.5 * w); ctx.quadraticCurveTo(-1.4, -12 - 3 * w, -0.8, -9.2); ctx.closePath(); ctx.fill();
      }
      if (!flip && kk > 1.5) { ctx.fillStyle = css(P.shade, 0.9); oval(hx + 0.75, hy - 0.45, 0.42, 0.42, 0); }
      ctx.restore();
    }

    /* a bird in flight: two wings from the body, beating; far off, a fleck */
    function flyer(b, col, alpha) {
      const s = b.ss, size = K * 10.5 * b.size * s * opt.scale;
      ctx.globalAlpha = alpha;
      if (size < 1.7) {
        const w = Math.max(1, size * 2), h = Math.max(0.8, size * (0.45 + 0.35 * Math.abs(b.flapv)));
        ctx.fillStyle = css(col); ctx.fillRect(b.sx - w / 2, b.sy - h / 2, w, h);
        return;
      }
      const facing = b.svx >= 0 ? 1 : -1;
      const tilt = clamp(b.svy / (Math.abs(b.svx) + K * 40), -0.6, 0.6) * 0.5 * facing + b.bank * 0.35;
      ctx.save();
      ctx.translate(b.sx, b.sy); ctx.rotate(tilt); ctx.scale(facing, 1);
      const f = b.flapv;
      const tipY = 0.2 * size - f * 0.85 * size, midY = -0.34 * size + f * 0.22 * size;
      const back = 1 - 0.4 * Math.abs(b.bank);
      ctx.strokeStyle = css(col);
      ctx.lineWidth = Math.max(1, size * 0.15);
      ctx.beginPath();
      ctx.moveTo(-size * back, tipY * back);
      ctx.quadraticCurveTo(-size * 0.42 * back, midY, 0, 0);
      ctx.quadraticCurveTo(size * 0.42, midY, size, tipY);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.1, size * 0.22);
      line(-size * 0.28, size * 0.05, size * 0.32, -size * 0.03);
      ctx.restore();
    }

    function ring(x, y, r) {
      ctx.globalAlpha = 0.55; ctx.strokeStyle = css(P.shade); ctx.lineWidth = Math.max(2.5, K * 2.4);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.strokeStyle = css(P.ink); ctx.lineWidth = Math.max(1, K * 1.1);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function draw() {
      if (!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      backdrop();
      const grounded = birds.filter(b => b.mode === 'ground');
      const flying = birds.filter(b => b.mode === 'air').sort((p, q) => q.z - p.z);
      for (const b of grounded) {                                       /* reflections in the wet sand */
        if (b.y < seaLine(b.x) + H * 0.06) standing(b, b.x, b.y + K * 0.6, true, P.ink, 0.12);
      }
      ctx.fillStyle = css(P.shade);                                     /* shadows of the low flyers */
      for (const b of flying) {
        if (b.z > W * 0.03) continue;
        const gy = footing(b, b.x), h = gy - b.y, reach = H * 0.25;
        if (h <= 0 || h >= reach) continue;
        ctx.globalAlpha = 0.24 * (1 - h / reach);
        oval(b.x, gy, K * 6 * opt.scale * (1 - h / (reach * 2)), K * 1.5, 0);
      }
      ctx.globalAlpha = 1;
      const nearZ = W * 0.02;
      const drawFlyer = b => {
        const base = inkAt(b.sx, b.sy);
        const col = mix(base, P.flash, clamp(b.flash * 0.6 * F, 0, 0.7));
        if (opt.trails && b.trail.length > 6 && !b.landing) {
          const tr = b.trail, a = 0.13 * F * (1 - b.goA * 0.7);
          if (a > 0.01) {
            ctx.strokeStyle = css(base); ctx.lineWidth = Math.max(0.6, K * 0.6 * b.ss);
            ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(tr[0], tr[1]);
            for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1]);
            ctx.stroke();
          }
        }
        flyer(b, col, b.leaving ? 0.8 : 0.95);
        if (b.mine) ring(b.sx, b.sy, Math.max(K * 5, K * 15 * b.ss * opt.scale));
      };
      flying.filter(b => b.z > nearZ).forEach(drawFlyer);
      for (const b of grounded) {
        standing(b, b.x, b.y, false, P.ink, 0.93);
        if (b.mine) ring(b.x, b.y - K * 9 * opt.scale, K * 16 * opt.scale);
      }
      flying.filter(b => b.z <= nearZ).forEach(drawFlyer);
      ctx.globalAlpha = 1;
    }

    /* for anyone whose device asks for less motion: one still picture of where the room stands */
    function pose() {
      for (const b of birds) { b.vs = b.vt.slice(); b.soc = b.vs[0]; b.rel = b.vs[1]; b.psy = b.vs[2]; b.lean = avg(b.vs); b.hold = smooth(0.3, 0.6, b.lean); b.holdA = smooth(1.1, 1.45, b.lean); }
      room = roomRaw.med; F = smooth(0.35, 0.65, room); E = smooth(1.35, 1.65, room);
      sky = skyAt(room);
      const span = L.horizon - L.top;
      local.x = W * 0.44; local.y = L.top + span * 0.36; local.z = W * 0.05;
      far.z = W * 0.75; far.x = L.gx; far.y = L.horizon - span * 0.13 * (1 + far.z / L.D);
      const down = birds.filter(b => !(F * b.hold > 0.5)).sort((p, q) => hash(p.key) - hash(q.key));
      down.forEach((b, i) => { b.mode = 'ground'; b.x = W * (i + 0.5) / down.length; b.y = footing(b, b.x); b.peck = 0; b.wings = 0; b.tx = null; b.pause = 1; b.sx = b.x; b.sy = b.y; });
      birds.forEach(b => {
        if (!(F * b.hold > 0.5)) return;
        const r = chance(hash(b.key)), a = r() * TAU, d = Math.sqrt(r());
        const g = E * b.holdA, Rr = L.roost * (1 - 0.55 * g);
        b.mode = 'air'; b.landing = false; b.goA = g;
        b.x = lerp(local.x, far.x, g) + Math.cos(a) * d * Rr;
        b.y = lerp(local.y, far.y, g) + Math.sin(a) * d * Rr * 0.6;
        b.z = lerp(local.z, far.z, g) + (r() - 0.5) * Rr * 0.5;
        const p = project(b.x, b.y, b.z); b.sx = p.x; b.sy = p.y; b.ss = p.s; b.svx = r() < 0.5 ? -1 : 1; b.svy = 0; b.flapv = 0.2; b.bank = 0; b.flash = 0; b.trail.length = 0;
      });
    }

    function label() {
      const st = state();
      canvas.setAttribute('aria-label', st.n ? st.n + (st.n === 1 ? ' bird' : ' birds') + ', one for each stack: ' + st.ground + ' on the sand, ' +
        st.up + ' in the air' + (st.gone ? ', ' + st.gone + ' heading away' : '') + '. Most of the room: ' + st.phase[0] + '.'
        : 'A shore before dawn, waiting for the first stack.');
    }

    function frame(ts) {
      if (dead || !running) return;
      if (!onScreen || document.hidden || !layout()) { running = false; return; }
      const dt = last ? Math.min((ts - last) / 1000, 0.05) : 1 / 60;
      last = ts;
      step(dt);
      draw();
      if (ts - labelAt > 1500) { labelAt = ts; label(); }
      requestAnimationFrame(frame);
    }
    function wake() {
      if (dead || !layout()) return;
      if (still()) { pose(); draw(); label(); return; }
      if (running || !onScreen || document.hidden) return;
      running = true; last = 0;
      requestAnimationFrame(frame);
    }

    function set(list) {
      people = Array.isArray(list) ? list.filter(p => p && p.id != null) : [];
      layout();
      const per = clamp(opt.perPerson | 0 || 1, 1, 9);
      const seen = new Set();
      people.forEach(p => {
        const v = asStack(p);
        for (let n = 0; n < per; n++) {
          const key = String(p.id) + (n ? '#' + n : '');
          seen.add(key);
          let b = byKey.get(key);
          if (!b) { b = hatch(key, p, n); birds.push(b); byKey.set(key, b); if (W) arrive(b); }
          b.vt = v; b.mine = !!p.mine && n === 0;
          if (b.leaving) { b.leaving = false; b.aloft = 2; }
        }
      });
      if (still()) {
        birds = birds.filter(b => seen.has(b.key));
        [...byKey.keys()].forEach(k => { if (!seen.has(k)) byKey.delete(k); });
      } else birds.forEach(b => { if (!seen.has(b.key)) depart(b); });
      const med = middle(people.map(p => avg(asStack(p))));
      roomRaw = { n: people.length, med, phase: phaseOf(med) };
      wake();
      const now = performance.now();
      if (now - labelAt > 1000) { labelAt = now; label(); }
    }
    function state() {
      let ground = 0, up = 0, gone = 0;
      birds.forEach(b => { if (b.leaving) return; if (b.mode === 'ground') ground++; else if (b.goA > 0.5) gone++; else up++; });
      return { n: roomRaw.n, med: roomRaw.med, phase: roomRaw.phase, flock: F, away: E, room, ground, up, gone, birds: birds.length };
    }
    function advance(sec) {
      if (!layout()) return;
      const n = Math.round(Math.max(0, sec) * 60);
      for (let i = 0; i < n; i++) step(1 / 60);
      draw(); label();
    }

    let io = null, ro = null;
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); if (onScreen) wake(); });
      io.observe(canvas);
    }
    /* a canvas hidden and shown again (a Lines | Birds switch) comes back to life here */
    if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (!layout()) return; if (still()) { pose(); draw(); } else { draw(); wake(); } }); ro.observe(canvas); }
    const onVis = () => { if (!document.hidden) wake(); };
    document.addEventListener('visibilitychange', onVis);
    if (mq && mq.addEventListener) mq.addEventListener('change', () => { running = false; wake(); });
    wake();

    return {
      set,
      options(o) { Object.assign(opt, o || {}); set(people); },
      state,
      advance,
      destroy() { dead = true; running = false; if (io) io.disconnect(); if (ro) ro.disconnect(); document.removeEventListener('visibilitychange', onVis); }
    };
  }

  return { create, phaseOf };
})();
/* ====================================================================================================================== */
