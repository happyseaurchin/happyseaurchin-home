/* bricks — the talk's 3a instrument "from C to A" (presentation.html: a 12 × 6 running-bond wall whose pieces loosen and
   fly as chevrons, then come home, on a 22 s round, with its flocking step), in the C · B · A colours of reflexive-cba and
   the-fulcrum-turn (C grey-steel, B amber, A sea). The round is phased so each stage reads: the wall still, the bricks
   loosening in place, the take-off into chevrons, the flock, and the flight home into the wall. */
MOTIF('bricks', {
  title: 'Bricks loosening',
  about: 'A wall of bricks loosens and its pieces fly free as a flock, then settle back into the wall: C, solid foundations, every piece set in its place; B, the turn, the pieces loosen and take their lead from one another; A, flying free, no piece holding the plan.',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, st = o.state, k = r / 200;   // simulation space: a disc of radius 200
    const BW = 26, BH = 13, COLS = 12, ROWS = 6, PER = 22;
    if (!st.P) {
      st.R = MOTIF.rand(o.seed); st.P = [];
      const ox = -COLS * BW / 2 - BW / 4, oy = -ROWS * BH / 2;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const hx = ox + x * BW + (y % 2 ? BW / 2 : 0) + BW / 2, hy = oy + y * BH + BH / 2, an = st.R() * 6.2832;
        st.P.push({ x: hx, y: hy, vx: 0, vy: 0, hx: hx, hy: hy, jx: Math.cos(an), jy: Math.sin(an), tw: st.R() < 0.5 ? -1 : 1 });
      }
      st.last = t; st.acc = 0;
    }
    const sm = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
    const mix = (c1, c2, u) => [0, 1, 2].map(i => Math.round(c1[i] + (c2[i] - c1[i]) * u));
    const ph = (((t + o.seed * PER) % PER) + PER) % PER / PER;
    const home = sm(0.78, 0.86, ph);                                  // the flight home
    const seek = Math.max(home, 1 - sm(0.06, 0.12, ph));              // and any laggard still finds its place at C
    const loosen = sm(0.12, 0.38, ph) * (1 - home);                   // B: the mortar gives
    const fly = sm(0.36, 0.5, ph) * (1 - home);                       // A: free, reading the neighbours

    function step() {
      const P = st.P, n = P.length, R = st.R;
      const hold = 0.08 * (1 - 0.85 * loosen) * (1 - fly), spread = 1 + 0.22 * loosen;
      const damp = fly > 0.05 ? 0.97 : 0.86, max = 0.6 + 1.8 * fly + 2.8 * seek;
      for (let i = 0; i < n; i++) {
        const p = P[i];
        const tx = p.hx * spread + p.jx * 7 * loosen, ty = p.hy * spread + p.jy * 7 * loosen;
        let ax = (tx - p.x) * hold, ay = (ty - p.y) * hold;
        if (fly > 0.02) {                                             /* the instrument's flocking step */
          let cx = 0, cy = 0, vx = 0, vy = 0, m = 0, sx = 0, sy = 0;
          for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const q = P[j], dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
            if (d2 < 2700) { cx += q.x; cy += q.y; vx += q.vx; vy += q.vy; m++; if (d2 < 150) { sx -= dx / (d2 + 1) * 12; sy -= dy / (d2 + 1) * 12; } }
          }
          if (m) { ax += ((cx / m - p.x) * 0.004 + (vx / m - p.vx) * 0.06) * fly; ay += ((cy / m - p.y) * 0.004 + (vy / m - p.vy) * 0.06) * fly; }
          ax += sx * 0.35 * fly + (R() - 0.5) * 0.25 * fly; ay += sy * 0.35 * fly + (R() - 0.5) * 0.25 * fly;
          const d = Math.sqrt(p.x * p.x + p.y * p.y);
          if (d > 140) { const f = 0.12 * fly * (1 + (d - 140) / 25) / d; ax -= p.x * f; ay -= p.y * f; }
        }
        ax += (R() - 0.5) * 0.12 * loosen * (1 - fly); ay += (R() - 0.5) * 0.12 * loosen * (1 - fly);
        p.vx = (p.vx + ax) * damp; p.vy = (p.vy + ay) * damp;
        if (seek > 0) {                                               /* home: each flies back to its own place */
          let dx = (p.hx - p.x) * 0.07, dy = (p.hy - p.y) * 0.07; const dl = Math.sqrt(dx * dx + dy * dy);
          if (dl > 3) { dx *= 3 / dl; dy *= 3 / dl; }
          p.vx += (dx - p.vx) * 0.14 * seek; p.vy += (dy - p.vy) * 0.14 * seek;
        }
        const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
        if (fly > 0.3 && sp < 0.6 * fly) { p.vx += (R() - 0.5) * fly; p.vy += (R() - 0.5) * fly; }
        p.x += p.vx; p.y += p.vy;
        const d = Math.sqrt(p.x * p.x + p.y * p.y); if (d > 186) { p.x *= 186 / d; p.y *= 186 / d; }
      }
    }
    st.acc += Math.max(0, Math.min(0.2, t - st.last)); st.last = t;
    for (let n = 0; st.acc >= 1 / 30 && n < 6; n++) { step(); st.acc -= 1 / 30; }

    const chevA = sm(0.38, 0.5, ph) * (1 - sm(0.9, 0.97, ph)), brickA = 1 - chevA, wob = loosen * (1 - fly) * 3;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    /* C and B: the bricks, tilting and parting as the mortar gives */
    if (brickA > 0.01) {
      const g = Math.max(2, 1.1 / k), hw = (BW - g) / 2, hh = (BH - g) / 2;
      ctx.fillStyle = rgba(mix(C.steel, C.amber, loosen), 0.9 * brickA);
      ctx.beginPath();
      st.P.forEach(function (p, i) {
        const off = Math.sqrt((p.x - p.hx) * (p.x - p.hx) + (p.y - p.hy) * (p.y - p.hy));
        const th = p.tw * (Math.min(0.65, off / BW * 0.8) + 0.2 * loosen) + wob * 0.05 * Math.sin(t * 1.1 + i * 2.4), c = Math.cos(th), s = Math.sin(th);
        const px = p.x + wob * Math.sin(t * 0.9 + i * 1.7), py = p.y + wob * 0.6 * Math.cos(t * 0.8 + i * 2.9);
        const X = (u, v) => (px + u * c - v * s) * k, Y = (u, v) => (py + u * s + v * c) * k;
        ctx.moveTo(X(-hw, -hh), Y(-hw, -hh)); ctx.lineTo(X(hw, -hh), Y(hw, -hh)); ctx.lineTo(X(hw, hh), Y(hw, hh)); ctx.lineTo(X(-hw, hh), Y(-hw, hh)); ctx.closePath();
      });
      ctx.fill();
    }
    /* A: chevrons, amber as they lift, sea when free, cooling to steel as they come home */
    if (chevA > 0.01) {
      const L = Math.max(9, 3 / k);
      const col = mix(mix(C.amber, C.sea, sm(0.42, 0.56, ph)), C.steel, home);
      ctx.strokeStyle = rgba(col, 0.92 * chevA); ctx.lineWidth = Math.max(0.9, 1.8 * k);
      ctx.beginPath();
      st.P.forEach(function (p) {
        const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy), ux = sp > 0.05 ? p.vx / sp : 0.6 * p.tw, uy = sp > 0.05 ? p.vy / sp : -0.8, x = p.x, y = p.y;
        ctx.moveTo((x - ux * L) * k, (y - uy * L) * k); ctx.lineTo((x + ux * L * 0.4) * k, (y + uy * L * 0.4) * k);
        ctx.moveTo(x * k, y * k); ctx.lineTo((x - ux * L * 0.6 - uy * L * 0.5) * k, (y - uy * L * 0.6 + ux * L * 0.5) * k);
        ctx.moveTo(x * k, y * k); ctx.lineTo((x - ux * L * 0.6 + uy * L * 0.5) * k, (y - uy * L * 0.6 - ux * L * 0.5) * k);
      });
      ctx.stroke();
    }
  }
});
