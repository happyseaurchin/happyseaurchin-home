/* kernels — the talk's 3b instrument "two kernels in register" (presentation.html): your kernel as nine filled dots, the
   other, written blind, as nine rings; slid together, the few that coincide light with the lamp's glow. Here the slide is
   eased, and each round is written again while both are faded, so nothing jumps. */
MOTIF('kernels', {
  title: 'Two kernels in register',
  about: 'Two kernels written blind, nine points each, slide over one another until they are in register, and the few places where they meet light up: the overlap that neither holds alone, found by laying one over the other, not by merging.',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, st = o.state, P = 16, TAU = 6.2832;
    const tt = t + o.seed * P, cyc = Math.floor(tt / P), ph = tt - cyc * P;
    if (st.cyc !== cyc) {                                           // write again
      st.cyc = cyc;
      const R = MOTIF.rand((o.seed + cyc * 0.6180339) % 1), A = [], B = [];
      const pick = (others, gap) => {
        let best = null, bestD = -1;
        for (let k = 0; k < 24; k++) {
          const an = R() * TAU, d = Math.sqrt(R()) * 0.58, x = Math.cos(an) * d, y = Math.sin(an) * d;
          let m = 9; others.forEach(q => { m = Math.min(m, Math.hypot(q.x - x, q.y - y)); });
          if (m >= gap) return { x: x, y: y };
          if (m > bestD) { bestD = m; best = { x: x, y: y }; }
        }
        return best;
      };
      for (let i = 0; i < 9; i++) A.push(pick(A, 0.19));
      const shared = 3 + Math.floor(R() * 3);
      for (let i = 0; i < 9; i++) {
        if (i < shared) B.push({ x: A[i].x + (R() - 0.5) * 0.03, y: A[i].y + (R() - 0.5) * 0.03, s: true });
        else { const q = pick(A.concat(B), 0.17); q.s = false; B.push(q); }
      }
      const ring = arr => arr.slice().sort((p, q) => Math.atan2(p.y, p.x) - Math.atan2(q.y, q.x));
      st.A = A; st.B = B; st.ra = ring(A); st.rb = ring(B);
    }
    const sm = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
    const env = sm(0, 1.5, ph) * (1 - sm(13.4, 15.8, ph));
    const off = (1 - sm(1.2, 8, ph)) * 0.34;
    const glow = sm(7.6, 9.4, ph) * (1 - sm(12.8, 15.2, ph)) * (0.85 + 0.15 * Math.sin(t * 1.1));
    if (env < 0.005) return;
    ctx.lineJoin = 'round';

    /* each kernel's nine points, joined faintly around, so each reads as one shape */
    function loop(pts, dx, col, a) {
      ctx.strokeStyle = rgba(col, a); ctx.lineWidth = Math.max(0.6, r * 0.004);
      ctx.beginPath();
      pts.forEach((p, i) => { const x = (p.x + dx) * r, y = p.y * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath(); ctx.stroke();
    }
    loop(st.ra, -off, C.sea, 0.16 * env);
    loop(st.rb, off, C.rose, 0.14 * env);

    /* where they meet: the lamp */
    if (glow > 0.01) {
      const gr = Math.max(6, r * 0.13);
      st.B.forEach(p => {
        if (!p.s) return;
        const x = p.x * r, y = p.y * r, g = ctx.createRadialGradient(x, y, 0, x, y, gr);
        g.addColorStop(0, rgba(C.sand, 0.8 * glow * env)); g.addColorStop(1, rgba(C.sand, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, gr, 0, TAU); ctx.fill();
      });
    }
    /* your kernel: filled dots */
    const dr = Math.max(1.7, r * 0.022);
    ctx.fillStyle = rgba(C.sea, 0.95 * env);
    ctx.beginPath();
    st.A.forEach(p => { const x = (p.x - off) * r, y = p.y * r; ctx.moveTo(x + dr, y); ctx.arc(x, y, dr, 0, TAU); });
    ctx.fill();
    /* the other, written blind: rings */
    const rr = Math.max(2.4, r * 0.026);
    ctx.strokeStyle = rgba(C.rose, 0.95 * env); ctx.lineWidth = Math.max(1, r * 0.0095);
    ctx.beginPath();
    st.B.forEach(p => { const x = (p.x + off) * r, y = p.y * r; ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, TAU); });
    ctx.stroke();
  }
});
