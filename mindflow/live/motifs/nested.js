/* nested — lifted from Tori of Emergence, "Cycles inside cycles": four ring tori nested on one spindle and one equator,
   cut open at the front so their small circles show as nests of circles either side of the spindle. The film's
   geometry: small radii 1/4, 1/2, 3/4 and 1, and R² − r² = 1, so every torus wraps the same core circle and none touch.
   Each level's moment runs round its own circle at one common pace, so the smallest goes round four times while the
   largest goes round once, and each moment is also a ring round the spindle. */
MOTIF('nested', {
  title: 'Nested scales',
  about: 'Four tori nested one inside the next on a single spindle, cut open to show circles within circles, each with its own moment turning, the smallest fastest: scales within scales, each level a whole carried inside the next, pscale where depth is scale.',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, TAU = Math.PI * 2;
    const seed = o.seed || 0;
    const mix = function (a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
    const COL = [C.sand, mix(C.sand, C.sea, 0.55), C.sea, C.blue];          // the core warm, the outside cool
    const RK = [0.25, 0.5, 0.75, 1], RR = RK.map(function (k) { return Math.sqrt(1 + k * k); });
    const U = r * 0.375;                                                    // one unit: the largest reaches 2.414
    const el = 0.34 + 0.04 * Math.sin(t * TAU / 19 + seed * 5), se = Math.sin(el), ce = Math.cos(el);
    const small = r < 55, big = r >= 110;
    const lw = Math.max(0.75, r / 160);
    ctx.translate(0, 0.06 * r);
    ctx.lineCap = 'round';

    // the far side of the tori, standing behind the cut: the largest's ridge, rim and hole; the others' ridges
    if (!small) {
      ctx.lineWidth = lw * 0.9;
      for (let j = big ? 0 : 3; j < 4; j++) {
        const a = j === 3 ? 0.3 : 0.16;
        ctx.beginPath(); ctx.ellipse(0, -RK[j] * ce * U, RR[j] * U, RR[j] * se * U, 0, Math.PI, TAU);
        ctx.strokeStyle = rgba(COL[j], a); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0, 0, (RR[3] + 1) * U, (RR[3] + 1) * se * U, 0, Math.PI, TAU);
      ctx.strokeStyle = rgba(COL[3], 0.22); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, (RR[3] - 1) * U, (RR[3] - 1) * se * U, 0, Math.PI, TAU);
      ctx.strokeStyle = rgba(COL[3], 0.22); ctx.stroke();
    }

    // the spindle, with each torus's shadow on it: the height of its small circle
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(0, -1.35 * ce * U); ctx.lineTo(0, 1.35 * ce * U);
    ctx.strokeStyle = rgba(C.ink, small ? 0.4 : 0.3); ctx.stroke();
    if (!small) {          // longest and finest outside, shortest and fullest at the core: the spindle swells to its centre
      ctx.lineCap = 'butt';
      for (let j = 3; j >= 0; j--) {
        ctx.lineWidth = lw * (1.2 + 1.1 * (3 - j));
        ctx.beginPath(); ctx.moveTo(0, -RK[j] * ce * U); ctx.lineTo(0, RK[j] * ce * U);
        ctx.strokeStyle = rgba(COL[j], 0.5); ctx.stroke();
      }
      ctx.lineCap = 'round';
    }

    // the cut faces: on each side of the spindle, four small circles, each inside the next, outermost first
    for (let j = 3; j >= 0; j--) {
      for (let s = -1; s <= 1; s += 2) {
        ctx.beginPath(); ctx.ellipse(s * RR[j] * U, 0, RK[j] * U, RK[j] * ce * U, 0, 0, TAU);
        ctx.fillStyle = rgba(COL[j], 0.05); ctx.fill();
        ctx.lineWidth = lw * (small ? 1.2 : 1.1); ctx.strokeStyle = rgba(COL[j], small ? 0.75 : 0.6); ctx.stroke();
      }
    }

    // the moments: one pace for all, so a circle a quarter the size goes round four times as often
    const M = [];
    for (let j = 0; j < 4; j++) {
      const v = -(t / (20 * RK[j]) + seed + j * 0.17) * TAU;
      M.push({ j: j, rho: RR[j] + RK[j] * Math.cos(v), y: RK[j] * Math.sin(v) });
    }
    if (!small) {          // each moment is a ring round the spindle: its near half swings in front of the cut
      ctx.lineWidth = lw * 0.9;
      for (const m of M) {
        ctx.beginPath(); ctx.ellipse(0, -m.y * ce * U, m.rho * U, m.rho * se * U, 0, 0, Math.PI);
        ctx.strokeStyle = rgba(COL[m.j], 0.28); ctx.stroke();
      }
    }
    const dr = Math.max(1.2, r / 90);
    for (const m of M) {
      for (let s = -1; s <= 1; s += 2) {
        const x = s * m.rho * U, y = -m.y * ce * U;
        ctx.fillStyle = rgba(COL[m.j], 0.2); ctx.beginPath(); ctx.arc(x, y, dr * 2.4, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(mix(COL[m.j], C.ink, 0.35), 0.95); ctx.beginPath(); ctx.arc(x, y, dr, 0, TAU); ctx.fill();
      }
    }
  }
});
