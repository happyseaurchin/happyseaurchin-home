/* murmuration — the flock of state-stack-birds (each bird attends to its seven nearest: topological, after Ballerini et al.,
   the science strand of murmuration-motif) drawn with that film's gull-wing glyph when large, and as reflexive-cba's A:
   sea-coloured streaks with faint links to their neighbours, when small. */
MOTIF('murmuration', {
  title: 'The murmuration',
  about: 'A murmuration: many birds moving as one with no leader, each reading only its seven nearest neighbours, the shape of the whole emerging live; people who organise themselves without a leader.',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, st = o.state, N = 64, TAU = 6.2832;
    if (!st.b) {
      const R = MOTIF.rand(o.seed); st.b = []; st.dir = R() < 0.5 ? -1 : 1;
      const h0 = R() * TAU;
      for (let i = 0; i < N; i++) {
        const an = R() * TAU, d = Math.sqrt(R()) * 0.32, h = h0 + (R() - 0.5) * 1.0;
        st.b.push({ x: Math.cos(an) * d, y: Math.sin(an) * d * 0.6, vx: Math.cos(h) * 0.24, vy: Math.sin(h) * 0.24, ax: 0, ay: 0, ph: R() * TAU, fr: 0.8 + R() * 0.4, n0: -1, n1: -1 });
      }
      st.last = t; st.acc = 0; st.T = 0;
    }
    const B = st.b, bd = [0, 0, 0, 0, 0, 0, 0], bi = [0, 0, 0, 0, 0, 0, 0];
    function step(dt) {
      st.T += dt;
      const T = st.T, s0 = o.seed * 6.3;
      const Ax = 0.26 * Math.sin(T * 0.16 + s0), Ay = 0.2 * Math.sin(T * 0.23 + 1.3 + s0);
      for (let i = 0; i < N; i++) {
        const b = B[i];
        let m = 0;
        for (let j = 0; j < N; j++) {                       // the seven nearest, kept in order
          if (j === i) continue;
          const q = B[j], dx = q.x - b.x, dy = q.y - b.y, d2 = dx * dx + dy * dy;
          if (m < 7 || d2 < bd[m - 1]) {
            let p = m < 7 ? m++ : 6;
            while (p > 0 && bd[p - 1] > d2) { bd[p] = bd[p - 1]; bi[p] = bi[p - 1]; p--; }
            bd[p] = d2; bi[p] = j;
          }
        }
        let cx = 0, cy = 0, ux = 0, uy = 0, sx = 0, sy = 0;
        for (let k = 0; k < m; k++) {
          const q = B[bi[k]]; cx += q.x; cy += q.y; ux += q.vx; uy += q.vy;
          const d = Math.sqrt(bd[k]) || 0.001;
          if (d < 0.12) { const f = (0.12 - d) / 0.12 / d; sx += (b.x - q.x) * f; sy += (b.y - q.y) * f; }
        }
        b.n0 = bi[0]; b.n1 = bi[1];
        let ax = (cx / m - b.x) * 0.6 + (ux / m - b.vx) * 1.8 + sx * 1.4;
        let ay = (cy / m - b.y) * 0.6 + (uy / m - b.vy) * 1.8 + sy * 1.4;
        const rx = b.x - Ax, ry = b.y - Ay, rd = Math.sqrt(rx * rx + ry * ry) || 0.001;
        const pull = rd > 0.16 ? (rd - 0.16) * 1.3 / rd : 0;  // a roost that wanders, and a faint turn that slowly changes hand
        const sw = 0.03 * st.dir * Math.sin(T * 0.05 + s0);
        ax += -rx * pull - ry / rd * sw; ay += -ry * pull + rx / rd * sw;
        const d = Math.sqrt(b.x * b.x + b.y * b.y);
        if (d > 0.6) { const f = (d - 0.6) * 7 / d; ax -= b.x * f; ay -= b.y * f; }
        b.ax = ax; b.ay = ay;
      }
      for (let i = 0; i < N; i++) {
        const b = B[i];
        b.vx += b.ax * dt; b.vy += b.ay * dt;
        const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 0.001, cl = Math.min(0.3, Math.max(0.16, sp));
        b.vx *= cl / sp; b.vy *= cl / sp;
        b.x += b.vx * dt; b.y += b.vy * dt;
        const d = Math.sqrt(b.x * b.x + b.y * b.y); if (d > 0.9) { b.x *= 0.9 / d; b.y *= 0.9 / d; }
        b.ph += dt * TAU * 1.25 * b.fr;
      }
    }
    st.acc += Math.max(0, Math.min(0.1, t - st.last)); st.last = t;
    for (let n = 0; st.acc >= 1 / 60 && n < 4; n++) { step(1 / 60); st.acc -= 1 / 60; }

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    /* the links: each bird to the two it reads most */
    ctx.strokeStyle = rgba(C.sea, r < 80 ? 0.22 : 0.17); ctx.lineWidth = Math.max(0.6, r * 0.0035);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const b = B[i];
      [b.n0, b.n1].forEach(function (j) {
        if (j < 0 || j < i && (B[j].n0 === i || B[j].n1 === i)) return;
        const q = B[j], dx = q.x - b.x, dy = q.y - b.y;
        if (dx * dx + dy * dy < 0.04) { ctx.moveTo(b.x * r, b.y * r); ctx.lineTo(q.x * r, q.y * r); }
      });
    }
    ctx.stroke();
    if (r < 100) {
      /* small: streaks, as the A flock of reflexive-cba */
      ctx.strokeStyle = rgba(C.ink, 0.9); ctx.lineWidth = Math.max(1.1, r * 0.012);
      ctx.beginPath();
      B.forEach(function (b) {
        const L = Math.max(1.8, r * 0.16 * Math.sqrt(b.vx * b.vx + b.vy * b.vy)) / (r * Math.sqrt(b.vx * b.vx + b.vy * b.vy));
        ctx.moveTo(b.x * r, b.y * r); ctx.lineTo((b.x - b.vx * L) * r, (b.y - b.vy * L) * r);
      });
      ctx.stroke();
      return;
    }
    /* large: the gull-wing of state-stack-birds — two wings beating from the body */
    const size = r * 0.036;
    const wings = new Path2D(), bodies = new Path2D();
    B.forEach(function (b) {
      const fc = b.vx >= 0 ? 1 : -1, tl = Math.max(-0.6, Math.min(0.6, b.vy / (Math.abs(b.vx) + 0.08))) * 0.5 * fc;
      const c = Math.cos(tl), s = Math.sin(tl), X0 = b.x * r, Y0 = b.y * r;
      const X = (u, v) => X0 + u * fc * c - v * s, Y = (u, v) => Y0 + u * fc * s + v * c;
      const f = Math.sin(b.ph) * 0.85, tipY = 0.2 * size - f * 0.85 * size, midY = -0.34 * size + f * 0.22 * size;
      wings.moveTo(X(-size, tipY), Y(-size, tipY));
      wings.quadraticCurveTo(X(-size * 0.42, midY), Y(-size * 0.42, midY), X0, Y0);
      wings.quadraticCurveTo(X(size * 0.42, midY), Y(size * 0.42, midY), X(size, tipY), Y(size, tipY));
      bodies.moveTo(X(-size * 0.28, size * 0.05), Y(-size * 0.28, size * 0.05)); bodies.lineTo(X(size * 0.32, -size * 0.03), Y(size * 0.32, -size * 0.03));
    });
    ctx.strokeStyle = rgba(C.ink, 0.88);
    ctx.lineWidth = Math.max(1, size * 0.15); ctx.stroke(wings);
    ctx.lineWidth = Math.max(1.1, size * 0.22); ctx.stroke(bodies);
  }
});
