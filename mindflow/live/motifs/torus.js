/* torus — lifted from Smoke Ring of Now (and Psychosocial Torus): the ring torus at the film's proportions
   (R + r = 1, R/r = 2.5), twelve small circles, each one person's moment, the spindle through the hole and the
   threshold on the inner equator. The moments turn in step, so their dots roll as one ring round the tube: down
   the outside, in under the bottom, up through the hole and back over the top, and the ring leaves its wake below. */
MOTIF('torus', {
  title: 'The torus',
  about: 'A ring torus of small circles with a spindle through its hole; a ring of gold moments rolls down the outside and up through the hole, leaving a wake: the smoke ring of now, the psychosocial torus, the observer inside what is observed.',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, TAU = Math.PI * 2, H = Math.PI / 2;
    const seed = o.seed || 0;
    const S = r * 0.72, R = 0.714 * S, rt = 0.286 * S;               // outer radius, core radius, tube radius
    const el = 0.58 + 0.05 * Math.sin(t * TAU / 17 + seed * 6);      // the film's slow camera sway
    const az = 0.22 * Math.sin(t * TAU / 23 + seed * 4);
    const se = Math.sin(el), ce = Math.cos(el);
    const small = r < 55, N = small ? 8 : 12, A = small ? 1.5 : 1;   // at small sizes, fewer and brighter lines
    const lw = Math.max(0.7, r / 170);
    const v0 = -(t / 10 + seed) * TAU;                               // the moment, one turn round the tube in 10 s
    ctx.translate(0, -0.05 * r);
    ctx.lineCap = 'round';

    // the horizon and the wake the rising ring leaves below it
    if (!small) {
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, 1.3 * S, 1.3 * S * se, 0, 0, TAU);
      ctx.strokeStyle = rgba(C.ink, 0.05); ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const ph = k + ((t / 4 + seed * 3) % 1), y = (0.286 + 0.12 + ph * 0.17) * S;
        const a = 0.2 * Math.min(1, ph / 0.6) * (1 - ph / 3);
        ctx.beginPath(); ctx.ellipse(0, y * ce, R, R * se, 0, 0, TAU);
        ctx.strokeStyle = rgba(C.ink, a); ctx.stroke();
      }
    }

    // the spindle, through the hole
    ctx.lineWidth = lw * 1.3;
    ctx.beginPath(); ctx.moveTo(0, -1.25 * S * ce); ctx.lineTo(0, 1.25 * S * ce);
    ctx.strokeStyle = rgba(C.violet, 0.5); ctx.stroke();

    // the small circles: each an ellipse, brighter where it faces the eye
    const M = [];
    for (let i = 0; i < N; i++) {
      const u = az + i * TAU / N, cu = Math.cos(u), su = Math.sin(u);
      const ax = Math.abs(cu) < 0.002 ? 0.002 * rt : rt * cu;          // a circle seen edge-on stays drawable
      M.push({ u: u, su: su, cx: R * cu, cy: R * su * se, ax: ax, ay: rt * su * se, by: -rt * ce, ph: Math.atan2(se, su * ce) });
    }
    function arcs(lo, hi, from) {   // add each circle's arc [ph+lo, ph+hi] (or [from+lo, from+hi]) to one path
      ctx.beginPath();
      for (const m of M) {
        const c = from === undefined ? m.ph : from;
        ctx.save(); ctx.transform(m.ax, m.ay, 0, m.by, m.cx, m.cy);
        ctx.moveTo(Math.cos(c + lo), Math.sin(c + lo)); ctx.arc(0, 0, 1, c + lo, c + hi);
        ctx.restore();
      }
    }
    ctx.lineWidth = lw;
    arcs(0, TAU); ctx.strokeStyle = rgba(C.ink, A * 0.1); ctx.stroke();
    arcs(-H, H); ctx.strokeStyle = rgba(C.ink, A * 0.16); ctx.stroke();
    arcs(-H / 2, H / 2); ctx.strokeStyle = rgba(C.ink, A * 0.22); ctx.stroke();

    // origination on the outer equator (its near half faces the eye), the threshold on the inner (its far half does)
    ctx.beginPath(); ctx.ellipse(0, 0, S, S * se, 0, 0, Math.PI); ctx.strokeStyle = rgba(C.ink, A * 0.28); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, S, S * se, 0, Math.PI, TAU); ctx.strokeStyle = rgba(C.ink, A * 0.1); ctx.stroke();
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, R - rt, (R - rt) * se, 0, Math.PI, TAU); ctx.strokeStyle = rgba(C.violet, A * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, R - rt, (R - rt) * se, 0, 0, Math.PI); ctx.strokeStyle = rgba(C.violet, A * 0.2); ctx.stroke();
    if (!small) {
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.ellipse(0, -rt * ce, R, R * se, 0, 0, TAU); ctx.strokeStyle = rgba(C.ink, 0.12); ctx.stroke();
    }

    // each moment's short trail, behind it on its circle (the moment runs toward decreasing v)
    if (!small) {
      ctx.lineWidth = lw * 1.6;
      [[0, 0.3, 0.42], [0.3, 0.65, 0.24], [0.65, 1.05, 0.1]].forEach(function (s) {
        arcs(s[0], s[1], v0); ctx.strokeStyle = rgba(C.sand, s[2]); ctx.stroke();
      });
    }

    // the moments: one dot on every small circle, all in step, so they roll as a ring through the hole
    const cv = Math.cos(v0), sv = Math.sin(v0), dr = Math.max(1.1, r / 95);
    for (const m of M) {
      const x = m.cx + m.ax * cv, y = m.cy + m.ay * cv + m.by * sv;
      const f = sv * se + cv * m.su * ce, a = 0.35 + 0.65 * Math.max(0, Math.min(1, (f + 0.3) / 0.6));
      ctx.fillStyle = rgba(C.sand, 0.16 * a); ctx.beginPath(); ctx.arc(x, y, dr * 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(C.sand, 0.95 * a); ctx.beginPath(); ctx.arc(x, y, dr, 0, TAU); ctx.fill();
    }
  }
});
