/* The thread with its knots: a quipu, drawn after animations/thread-schematic.jpg (no film draws it). The list is a twisted
   main cord with a ring at every tenth place; every thread hangs from it with its own knot at the top, then one knot for
   each line a hand tied, in that hand's colour, ending complete (a pale tassel: nothing waits), open (a ring: a choice next
   to be taken) or with short ends (the choices nobody took). The newest thread is tied as you watch: the amber point
   (whose move it is) goes down to the place, a knot is tied there, the place is handed on to the other hand; when it ends
   complete the list moves on by one and a new place opens. Every thread is drawn from its own number, so nothing is stored. */
MOTIF('quipu', (function () {
  const TAU = Math.PI * 2, C = MOTIF.C, rgba = MOTIF.rgba, CYCLE = 15;
  const HANDS = [C.blue, C.rose, C.sea, C.violet, C.coral, C.lime];
  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = u => u * u * (3 - 2 * u);
  const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u].map(Math.round);
  const FEAT = 8, SP = 0.15, CORD = -0.5;              // the place being tied (0 = the oldest in view), spacing and cord height, in r

  // one thread, from its number: its length, its knots, its two hands, its ending
  function spec(j, seed) {
    const rnd = MOTIF.rand((j * 0.6180339887 + seed * 0.37) % 1);
    const a = Math.floor(rnd() * HANDS.length), b = (a + 1 + Math.floor(rnd() * (HANDS.length - 1))) % HANDS.length;
    const n = 2 + Math.floor(rnd() * 3), L = 0.62 + rnd() * 0.6, e = rnd();
    const knots = [];
    for (let m = 0; m < n; m++) knots.push({ f: (m + 0.75) / (n + 0.55), col: HANDS[m % 2 ? b : a] });
    return { L: L, knots: knots, end: e < 0.6 ? 'complete' : e < 0.82 ? 'open' : 'short', top: rnd() < 0.8 ? C.amber : C.coral };
  }

  function knot(ctx, x, y, s, col, a, stripes) {
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.62, s, 0, 0, TAU);
    ctx.fillStyle = rgba(col, 0.92 * a); ctx.fill();
    if (stripes) {
      ctx.strokeStyle = rgba(C.deep, 0.55 * a); ctx.lineWidth = s * 0.16; ctx.beginPath();
      for (let q = -1; q <= 1; q++) { ctx.moveTo(x - s * 0.5, y + q * s * 0.55 + s * 0.22); ctx.lineTo(x + s * 0.5, y + q * s * 0.55 - s * 0.22); }
      ctx.stroke();
    }
  }
  function ending(ctx, kind, x, y, r, a) {
    const lw = Math.max(0.8, r * 0.006);
    if (kind === 'complete') {
      ctx.fillStyle = rgba(C.ink, 0.8 * a); ctx.beginPath(); ctx.arc(x, y + r * 0.012, Math.max(1.2, r * 0.016), 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(C.ink, 0.5 * a); ctx.lineWidth = lw; ctx.beginPath();
      for (let q = -1; q <= 1; q++) { ctx.moveTo(x + q * r * 0.008, y + r * 0.03); ctx.lineTo(x + q * r * 0.02, y + r * 0.07); }
      ctx.stroke();
    } else if (kind === 'open') {
      ctx.strokeStyle = rgba(C.ink, 0.6 * a); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y + r * 0.02, Math.max(1.5, r * 0.02), 0, TAU); ctx.stroke();
    } else {
      ctx.strokeStyle = rgba(C.ink, 0.26 * a); ctx.lineWidth = lw; ctx.beginPath();
      for (let q = -1; q <= 1; q += 2) {
        const ex = x + q * r * 0.04, ey = y + r * 0.075;
        ctx.moveTo(x, y - r * 0.02); ctx.lineTo(ex, ey); ctx.moveTo(ex - r * 0.01, ey); ctx.lineTo(ex + r * 0.01, ey);
      }
      ctx.stroke();
    }
  }

  return {
    title: 'The thread with its knots',
    about: 'A quipu: a main cord with threads hanging from it, a knot tied along the newest thread one by one in each hand\'s colour as the work passes between minds; a thread carries work: one read at its place, one knot in your own mirror, the place handed on.',
    draw(ctx, t, r, o) {
      const seed = o.seed || 0, tt = t + seed * CYCLE * 5.3, k = Math.floor(tt / CYCLE), p = tt / CYCLE - k;
      const shift = ease(seg(p, 0.88, 1)), sp = SP * r, cy = CORD * r, fine = r >= 60;
      const xOf = i => (i - 4.6 - shift) * sp;            // place i in view (0 = the oldest)
      const half = Math.sqrt(1 - CORD * CORD) * r * 0.97;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // the threads already tied
      for (let i = 0; i < FEAT; i++) {
        const j = k + i, s = spec(j, seed), x = xOf(i);
        const fade = i === 0 ? 1 - shift : 1, edge = clamp((half - Math.abs(x)) / (r * 0.1));
        const a = fade * edge;
        if (a < 0.02) continue;
        const room = Math.sqrt(Math.max(0, r * r - x * x)) * 0.86 - cy, L = Math.min(s.L * r, room);
        drawThread(ctx, x, cy, L, L, s, r, a * 0.85, s.knots.length, fine, 0, s.end);
      }

      // the thread being tied
      {
        const j = k + FEAT, s = spec(j, seed), x = xOf(FEAT);
        const room = Math.sqrt(Math.max(0, r * r - x * x)) * 0.86 - cy, L = Math.min(s.L * r, room);
        const n = s.knots.length, w = 0.66 / n;          // each hand's turn: go down, tie, hand on
        let tied = 0, reach = 0, dotA = 1, ring = null;
        const tops = [0.04 * r].concat(s.knots.map(q => q.f * L));
        for (let m = 0; m < n; m++) {
          const a0 = 0.08 + m * w, down = ease(seg(p, a0, a0 + w * 0.45)), tie = ease(seg(p, a0 + w * 0.45, a0 + w * 0.75));
          if (p >= a0) reach = tops[m] + (tops[m + 1] - tops[m]) * down;
          tied = m + tie;
          if (tie > 0 && tie < 1) ring = { y: cy + s.knots[m].f * L, u: tie, col: s.knots[m].col };
          if (p < a0 + w) break;
        }
        const endT = ease(seg(p, 0.76, 0.84));
        if (p >= 0.76) { reach = s.knots[n - 1].f * L + (L - s.knots[n - 1].f * L) * endT; tied = n; dotA = 1 - endT; }
        const opened = ease(seg(p, 0, 0.08));
        const glowA = (1 - shift) * 0.5;
        // a new place opens on the cord
        if (p < 0.2) {
          const u = seg(p, 0, 0.2);
          ctx.strokeStyle = rgba(C.amber, 0.5 * (1 - u)); ctx.lineWidth = Math.max(1, r * 0.006);
          ctx.beginPath(); ctx.arc(x, cy, r * (0.02 + 0.06 * u), 0, TAU); ctx.stroke();
        }
        drawThread(ctx, x, cy, Math.max(0.001, reach * opened), L, s, r, 1, tied, fine, glowA, p >= 0.82 ? s.end : null);
        if (ring) {
          ctx.strokeStyle = rgba(ring.col, 0.55 * (1 - ring.u)); ctx.lineWidth = Math.max(1, r * 0.007);
          ctx.beginPath(); ctx.arc(x, ring.y, r * (0.03 + 0.07 * ring.u), 0, TAU); ctx.stroke();
        }
        // whose move it is: the amber point at the place
        if (dotA > 0.02 && opened > 0) {
          const dy = cy + reach * opened + r * 0.012, da = dotA * opened;
          ctx.shadowColor = rgba(C.sand, 0.8 * da); ctx.shadowBlur = Math.max(3, r * 0.05);
          ctx.fillStyle = rgba(C.sand, 0.95 * da); ctx.beginPath(); ctx.arc(x, dy, Math.max(1.6, r * 0.017), 0, TAU); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // the list: the main cord, twisted, fading at both ends, with a ring at every tenth place
      const g = ctx.createLinearGradient(-half, 0, half, 0);
      g.addColorStop(0, rgba(C.sand, 0)); g.addColorStop(0.12, rgba(C.sand, 0.6)); g.addColorStop(0.88, rgba(C.sand, 0.6)); g.addColorStop(1, rgba(C.sand, 0));
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(1.4, r * 0.016);
      ctx.beginPath(); ctx.moveTo(-half, cy); ctx.lineTo(half, cy); ctx.stroke();
      if (fine) {
        const tw = r * 0.036, off = ((k + shift) * sp) % tw;
        ctx.strokeStyle = rgba(C.deep, 0.9); ctx.lineWidth = Math.max(0.8, r * 0.005); ctx.beginPath();
        for (let x = -half + tw - off; x < half; x += tw) { ctx.moveTo(x - r * 0.006, cy - r * 0.008); ctx.lineTo(x + r * 0.006, cy + r * 0.008); }
        ctx.stroke();
      }
      for (let i = 0; i <= FEAT; i++) {
        const j = k + i; if (j % 10) continue;
        const x = xOf(i) + sp * 0.5, a = (i === 0 ? 1 - shift : 1) * clamp((half - Math.abs(x)) / (r * 0.1));
        ctx.fillStyle = rgba(C.deep, a); ctx.strokeStyle = rgba(C.ink, 0.7 * a); ctx.lineWidth = Math.max(0.8, r * 0.006);
        ctx.beginPath(); ctx.arc(x, cy, Math.max(1.8, r * 0.02), 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
  };

  // a thread hanging from (x, cy): drawn len long of its full Lf, with its first `tied` knots (a fraction grows the last);
  // glow lights the newest; end names the ending to draw at its foot, or none
  function drawThread(ctx, x, cy, len, Lf, s, r, a, tied, fine, glow, end) {
    if (glow > 0.01) { ctx.shadowColor = rgba(C.sea, glow); ctx.shadowBlur = Math.max(2, r * 0.04); }
    ctx.strokeStyle = rgba(glow > 0.01 ? mix(C.sand, C.sea, 0.5) : C.sand, (glow > 0.01 ? 0.8 : 0.5) * a);
    ctx.lineWidth = Math.max(0.8, r * 0.009);
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy + len); ctx.stroke();
    ctx.shadowBlur = 0;
    if (fine) {
      ctx.save(); ctx.setLineDash([r * 0.012, r * 0.014]);
      ctx.strokeStyle = rgba(C.deep, 0.8 * a); ctx.lineWidth = Math.max(0.6, r * 0.004);
      ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy + len); ctx.stroke(); ctx.restore();
    }
    const ks = Math.max(1.6, r * 0.032);
    knot(ctx, x, cy + r * 0.05, ks * 0.8, s.top, a * clamp(len / (r * 0.06)), fine);
    for (let m = 0; m < s.knots.length; m++) {
      const g = clamp(tied - m);
      if (g <= 0) break;
      knot(ctx, x, cy + s.knots[m].f * Lf, ks * (0.4 + 0.6 * g), s.knots[m].col, a * g, fine);
    }
    if (end) ending(ctx, end, x, cy + len, r, a);
  }
})());
