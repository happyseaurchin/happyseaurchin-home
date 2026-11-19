/* The shell and the crab, lifted from the-shell-outlives-the-crab: the chambered spiral (its radius x2.9 a turn, 54 chambers
   a turn, every ninth septum heavier, the open body chamber 0.55 rad, the wall thickening to the lip) and the hermit crab
   (carapace, abdomen, a big and a small claw, eyes on stalks, six legs) that turns at the mouth and backs in, as in the
   film's visit(). A crab stays while one chamber forms, leaves, and the next crab, another colour, arrives (the-same-crab):
   the shell outlives the crab. The spiral is self-similar, so the shell grows a chamber each visit and keeps its size. */
MOTIF('shell', (function () {
  const TAU = Math.PI * 2, K = Math.log(2.9) / TAU, DELTA = Math.PI / 27, BODY = 0.55, ROT = -Math.PI / 2, CYCLE = 16;
  const C = MOTIF.C, rgba = MOTIF.rgba;
  const CRABS = [C.blue, C.sea, C.violet, C.rose, C.lime, C.steel];   // never the shell's amber
  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = u => u * u * (3 - 2 * u);
  const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u].map(Math.round);
  const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const qb = (a, b, c, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
  const qd = (a, b, c, u) => [2 * (1 - u) * (b[0] - a[0]) + 2 * u * (c[0] - b[0]), 2 * (1 - u) * (b[1] - a[1]) + 2 * u * (c[1] - b[1])];

  // the spiral in the shell's own unit: the lip's outer edge at radius 1, straight up from the pole; phi <= 0 runs inward
  const pt = (phi, f) => { const q = Math.exp(K * phi) * (f || 1), a = phi + ROT; return [q * Math.cos(a), q * Math.sin(a)]; };
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const MC = mid(pt(0), pt(-TAU)), W = Math.hypot(pt(0)[0] - pt(-TAU)[0], pt(0)[1] - pt(-TAU)[1]);
  const F = (function () { const c = mid(pt(0.03), pt(0.03 - TAU)), dx = c[0] - MC[0], dy = c[1] - MC[1], L = Math.hypot(dx, dy); return [dx / L, dy / L]; })();
  const SEAT = mid(pt(-BODY * 0.55), pt(-BODY * 0.55 - TAU));
  const at = (k, s) => [MC[0] + F[0] * W * k - F[1] * W * s, MC[1] + F[1] * W * k + F[0] * W * s];
  const FRONT = at(1.05, 0), START = at(1.45, 1.5), CIN = at(1.95, 0.45), COUT = at(1.65, -0.05), END = at(1.8, -0.55);
  const H_OUT = Math.atan2(F[1], F[0]), SIZE = W * 0.31;

  // fit the shell and the crab's walk inside the unit circle, once
  const LAY = (function () {
    const P = [];
    for (let i = 0; i <= 72; i++) P.push(pt(-TAU * i / 72));
    const c = SIZE * 1.6;
    P.push([FRONT[0] + c, FRONT[1]], [FRONT[0], FRONT[1] - c], [FRONT[0], FRONT[1] + c], START, END);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    P.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let D = 0; P.forEach(q => { D = Math.max(D, Math.hypot(q[0] - cx, q[1] - cy)); });
    return { cx: cx, cy: cy, D: D };
  })();

  function spiral(ctx, a, b, step, f) {
    const n = Math.max(2, Math.ceil(Math.abs(b - a) / step));
    for (let i = 0; i <= n; i++) { const q = pt(a + (b - a) * i / n, f); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
  }
  function spiralOn(ctx, a, b, step, f) {
    const n = Math.max(2, Math.ceil(Math.abs(b - a) / step));
    for (let i = 0; i <= n; i++) { const q = pt(a + (b - a) * i / n, f); ctx.lineTo(q[0], q[1]); }
  }

  // the hermit crab, in its own unit (the film's makeCrab and pose): +x is where it faces
  function crab(ctx, x, y, h, size, ins, phase, col, a) {
    if (a <= 0.01) return;
    const edge = mix(col, C.ink, 0.5), soft = mix(col, C.deep, 0.4);
    ctx.save(); ctx.translate(x, y); ctx.rotate(h); ctx.scale(size, size);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(edge, a * 0.9 * (1 - 0.9 * ins)); ctx.lineWidth = 0.13;
    ctx.beginPath();
    for (let side = -1; side <= 1; side += 2) for (let k = 0; k < 3; k++) {
      const g = Math.sin(phase + k * 2.09 + (side > 0 ? Math.PI : 0)) * 0.35, ca = Math.cos(g), sa = Math.sin(g);
      const ox = 0.38 - k * 0.38, oy = side * 0.48, p1x = 0.28, p1y = side * 0.72, p2x = -0.02, p2y = side * 1.32;
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + p1x * ca - p1y * sa, oy + p1x * sa + p1y * ca);
      ctx.lineTo(ox + p2x * ca - p2y * sa, oy + p2x * sa + p2y * ca);
    }
    ctx.stroke();
    if (ins < 0.99) {
      ctx.beginPath(); ctx.ellipse(-1.15, 0.05, 0.85, 0.66, 0, 0, TAU);
      ctx.fillStyle = rgba(soft, a * 0.6 * (1 - ins)); ctx.fill();
      ctx.strokeStyle = rgba(edge, a * 0.75 * (1 - ins)); ctx.lineWidth = 0.09; ctx.stroke();
    }
    ctx.fillStyle = rgba(col, a * 0.62); ctx.strokeStyle = rgba(edge, a * 0.95);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.86, 0.7, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 0.11; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.35, -0.28); ctx.quadraticCurveTo(0, -0.42, 0.35, -0.28);
    ctx.strokeStyle = rgba(edge, a * 0.6); ctx.lineWidth = 0.07; ctx.stroke();
    ctx.strokeStyle = rgba(edge, a * 0.95);
    ctx.save(); ctx.translate(0.92, 0.42); ctx.rotate(0.28);
    ctx.beginPath(); ctx.ellipse(0.12, 0, 0.5, 0.33, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 0.1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.52, -0.1); ctx.lineTo(0.86, -0.03); ctx.moveTo(0.52, 0.1); ctx.lineTo(0.82, 0.15); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(0.9, -0.38); ctx.rotate(-0.24);
    ctx.beginPath(); ctx.ellipse(0.06, 0, 0.33, 0.23, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 0.09; ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(0.7, 0.15); ctx.lineTo(1.18, 0.3); ctx.moveTo(0.7, -0.15); ctx.lineTo(1.18, -0.3);
    ctx.lineWidth = 0.08; ctx.stroke();
    ctx.fillStyle = rgba(C.ink, a * 0.9);
    ctx.beginPath(); ctx.arc(1.2, 0.31, 0.12, 0, TAU); ctx.moveTo(1.32, -0.31); ctx.arc(1.2, -0.31, 0.12, 0, TAU); ctx.fill();
    ctx.restore();
  }

  return {
    title: 'The shell and the crab',
    about: 'A chambered spiral shell; a hermit crab backs in, stays while a new chamber forms, walks off, and a crab of another colour arrives: the shell outlives the crab, memory that outlives the model.',
    draw(ctx, t, r, o) {
      const seed = o.seed || 0, flip = seed > 0.5 ? -1 : 1;
      const S = r * 0.95 / LAY.D, u = 1 / S;                  // px per shell unit; one px in shell units
      const R = S;                                              // the lip's radius in px
      const tt = t + seed * CYCLE * 3.7, k = Math.floor(tt / CYCLE), p = tt / CYCLE - k;
      const g = ease(seg(p, 0.40, 0.60));                       // the chamber this visit leaves
      ctx.save();
      ctx.scale(flip * S, S); ctx.translate(-LAY.cx, -LAY.cy);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // the chambers, faintly filled, oldest at the centre
      const phiMin = Math.max(-4 * TAU, Math.log(1.2 / R) / K);
      ctx.beginPath(); spiral(ctx, -BODY - TAU, -BODY, 0.14); ctx.closePath();
      ctx.fillStyle = rgba(C.ink, 0.045); ctx.fill();

      // the chamber this visit adds, glowing while it forms and after
      const ga = 0.42 * seg(p, 0.38, 0.5) * (1 - seg(p, 0.66, 0.98));
      const p0 = -BODY - (g > 0.02 ? g : 1) * DELTA;
      if (ga > 0.01) {
        ctx.beginPath(); spiral(ctx, p0, -BODY, 0.03); spiralOn(ctx, -BODY - TAU, p0 - TAU, 0.03); ctx.closePath();
        ctx.fillStyle = rgba(C.sand, ga); ctx.fill();
      }

      // the septa: fine every chamber, heavy every ninth; the back wall of the body chamber forms with the new septum
      const fineA = clamp((R - 30) / 120) * 0.32, bigA = clamp((R - 10) / 40) * 0.6;
      const fine = new Path2D(), big = new Path2D();
      for (let j = -1; j < 120; j++) {
        const ph = j < 0 ? -BODY : -BODY - (g + j) * DELTA;
        const len = Math.exp(K * ph) * (1 - 1 / 2.9) * R;
        if (len < 3) break;
        const i = j < 0 ? k + 1 : k - j, heavy = ((i % 9) + 9) % 9 === 0;
        if (!heavy && (len < 7 || fineA <= 0)) continue;
        const a = pt(ph), b = pt(ph - TAU);
        if (j < 0) { // the forming wall, drawn on its own so it can fade in
          if (g < 0.01) continue;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
          ctx.strokeStyle = heavy ? rgba(C.amber, bigA * g) : rgba(C.ink, fineA * g);
          ctx.lineWidth = (heavy ? Math.max(1, R * 0.009) : Math.max(0.6, R * 0.004)) * u; ctx.stroke();
          continue;
        }
        const path = heavy ? big : fine;
        path.moveTo(a[0], a[1]); path.lineTo(b[0], b[1]);
      }
      ctx.strokeStyle = rgba(C.ink, fineA); ctx.lineWidth = Math.max(0.6, R * 0.004) * u; ctx.stroke(fine);
      ctx.strokeStyle = rgba(C.amber, bigA); ctx.lineWidth = Math.max(1, R * 0.009) * u; ctx.stroke(big);

      // the coil: the spiral line between the turns
      ctx.beginPath(); spiral(ctx, phiMin, -TAU, 0.14);
      ctx.strokeStyle = rgba(C.sand, 0.55); ctx.lineWidth = Math.max(0.9, R * 0.007) * u; ctx.stroke();

      // the wall, thickening to the lip, with a faint glow
      ctx.beginPath(); spiral(ctx, -TAU, 0, 0.12); spiralOn(ctx, 0, -TAU, 0.12, 0.93); ctx.closePath();
      ctx.shadowColor = rgba(C.amber, 0.45); ctx.shadowBlur = Math.max(2, r * 0.05);
      ctx.fillStyle = rgba(C.amber, 0.85); ctx.fill();
      ctx.shadowBlur = 0;
      const l0 = pt(0), l1 = pt(-TAU);
      ctx.beginPath(); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(l1[0], l1[1]);
      ctx.strokeStyle = rgba(C.amber, 0.9); ctx.lineWidth = Math.max(1.4, R * 0.016) * u; ctx.stroke();

      // the crab of this visit: walks in, turns, backs in, stays, comes out, walks off
      const col = CRABS[(k + Math.floor(seed * 60)) % CRABS.length];
      let x = FRONT[0], y = FRONT[1], h = H_OUT, ins = 0, ph = 0, al = 1, v;
      if (p < 0.2) {
        v = ease(seg(p, 0, 0.2)); const q = qb(START, CIN, FRONT, v), d = qd(START, CIN, FRONT, v);
        x = q[0]; y = q[1]; h = Math.atan2(d[1], d[0]); ph = v * TAU * 4; al = seg(p, 0, 0.05);
      } else if (p < 0.27) {
        const d = qd(START, CIN, FRONT, 1), h0 = Math.atan2(d[1], d[0]);
        v = ease(seg(p, 0.2, 0.27)); h = h0 + (((H_OUT - h0) % TAU + 3 * Math.PI) % TAU - Math.PI) * v; ph = v * TAU;
      } else if (p < 0.36) {
        v = ease(seg(p, 0.27, 0.36)); const q = lerp2(FRONT, SEAT, v); x = q[0]; y = q[1]; ins = v; ph = v * TAU * 2;
      } else if (p < 0.62) {
        x = SEAT[0]; y = SEAT[1]; ins = 1;
      } else if (p < 0.7) {
        v = ease(seg(p, 0.62, 0.7)); const q = lerp2(SEAT, FRONT, v); x = q[0]; y = q[1]; ins = 1 - v; ph = v * TAU * 2;
      } else if (p < 0.9) {
        v = ease(seg(p, 0.7, 0.9)); const q = qb(FRONT, COUT, END, v), d = qd(FRONT, COUT, END, v);
        x = q[0]; y = q[1]; h = Math.atan2(d[1], d[0]); ph = v * TAU * 4; al = 1 - seg(p, 0.84, 0.9);
      } else al = 0;
      crab(ctx, x, y, h, SIZE, ins, ph, col, al);
      ctx.restore();
    }
  };
})());
