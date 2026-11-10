/* wave — lifted from Before It Breaks (and Ride the Barrel): the film's own eighteen-point wave profile, keyed from a
   low mound through rising, building and steepening to the curl, the tube and the break, drawn as it draws it: one
   ink outline, a faint sea body with lines laid inside it, spray off the lip, the flat sea either side, and the violet
   ring on the face that says "we are here, just before the peak". A swell rises every 13 s; each breaks and settles
   as the next one builds. */
MOTIF('wave', {
  title: 'The wave',
  about: 'A swell rising out of a flat sea, steepening and curling over into a tube until it breaks and settles while the next one builds, with a ring on its face just before the peak: the wave of change, we are here just before it breaks.',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, TAU = Math.PI * 2;
    const seed = o.seed || 0, st = o.state;
    const clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    const ease = function (x) { x = clamp(x); return x * x * (3 - 2 * x); };
    const ss = function (x, a, b) { return ease((x - a) / (b - a)); };
    if (!st.WK) {
      // the film's keyframes: height 1, y up from the sea; 0-5 the back, 6-8 the crest and lip, 9 the lip's tip,
      // 10-12 its underside, 13 the tube's ceiling, 14-16 the face, 17 the trough
      const WK = [
        { f: 0.25, p: [[-0.95, 0], [-0.72, 0.02], [-0.5, 0.075], [-0.3, 0.145], [-0.13, 0.2], [0, 0.22], [0.11, 0.215], [0.21, 0.2], [0.3, 0.178], [0.39, 0.15], [0.48, 0.12], [0.57, 0.09], [0.66, 0.062], [0.75, 0.038], [0.84, 0.019], [0.93, 0.007], [1.02, 0.001], [1.1, 0]] },
        { f: 0.45, p: [[-1.05, 0], [-0.82, 0.05], [-0.6, 0.17], [-0.39, 0.34], [-0.18, 0.52], [0, 0.62], [0.09, 0.615], [0.17, 0.595], [0.24, 0.56], [0.3, 0.51], [0.355, 0.45], [0.405, 0.385], [0.455, 0.315], [0.51, 0.245], [0.57, 0.175], [0.64, 0.11], [0.74, 0.05], [0.88, 0]] },
        { f: 0.6, p: [[-1.15, 0], [-0.9, 0.07], [-0.66, 0.24], [-0.43, 0.48], [-0.2, 0.76], [0, 0.92], [0.09, 0.93], [0.17, 0.905], [0.22, 0.85], [0.245, 0.78], [0.26, 0.7], [0.275, 0.61], [0.295, 0.51], [0.325, 0.4], [0.37, 0.28], [0.43, 0.165], [0.52, 0.07], [0.66, 0]] },
        { f: 0.78, p: [[-1.22, 0], [-0.95, 0.07], [-0.7, 0.26], [-0.46, 0.54], [-0.22, 0.86], [0, 1.0], [0.17, 1.06], [0.34, 1.04], [0.47, 0.94], [0.53, 0.78], [0.47, 0.83], [0.37, 0.88], [0.25, 0.86], [0.15, 0.77], [0.1, 0.6], [0.11, 0.38], [0.19, 0.14], [0.36, 0]] },
        { f: 0.95, p: [[-1.28, 0], [-1.0, 0.07], [-0.74, 0.26], [-0.49, 0.55], [-0.24, 0.86], [0, 1.0], [0.25, 1.06], [0.52, 0.98], [0.7, 0.66], [0.72, 0.14], [0.66, 0.36], [0.6, 0.66], [0.45, 0.84], [0.25, 0.86], [0.12, 0.68], [0.09, 0.42], [0.16, 0.14], [0.33, 0]] },
        { f: 1.0, p: [[-1.28, 0], [-1.0, 0.07], [-0.74, 0.26], [-0.49, 0.55], [-0.24, 0.86], [0, 1.0], [0.26, 1.05], [0.54, 0.96], [0.72, 0.6], [0.74, 0.0], [0.68, 0.24], [0.62, 0.6], [0.46, 0.82], [0.25, 0.85], [0.12, 0.67], [0.09, 0.41], [0.16, 0.13], [0.33, 0]] },
        { f: 1.4, p: [[-1.2, 0], [-0.9, 0.04], [-0.62, 0.14], [-0.38, 0.27], [-0.17, 0.37], [0, 0.42], [0.14, 0.44], [0.28, 0.42], [0.4, 0.38], [0.5, 0.32], [0.58, 0.26], [0.65, 0.2], [0.71, 0.15], [0.77, 0.1], [0.83, 0.06], [0.9, 0.03], [0.97, 0.01], [1.05, 0]] }
      ];
      WK.unshift({ f: 0, p: WK[0].p.map(function (q) { return [q[0], q[1] * 0.15]; }) });
      st.WK = WK;
      const rnd = MOTIF.rand(seed + 0.77); st.spray = [];
      for (let j = 0; j < 16; j++) st.spray.push([rnd(), 0.3 + rnd() * 0.6, -Math.PI / 2 + (rnd() - 0.3) * 1.6, 0.7 + rnd() * 1.2]);
    }
    const WN = r < 55 ? 3 : 4, Hm = 0.6 * r, sy = 0.3 * r, lw = Math.max(0.8, r / 140);
    function key(f) {
      const K = st.WK; let i = 0;
      while (i < K.length - 2 && f > K[i + 1].f) i++;
      const a = K[i], b = K[i + 1], u = clamp((f - a.f) / (b.f - a.f));
      return a.p.map(function (q, j) { return [q[0] + (b.p[j][0] - q[0]) * u, q[1] + (b.p[j][1] - q[1]) * u]; });
    }
    function spline(P) {             // centripetal Catmull-Rom through the points, WN samples a span (as the film)
      const N = P.length, out = [], L = function (a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };
      const E = [[2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]]].concat(P, [[2 * P[N - 1][0] - P[N - 2][0], 2 * P[N - 1][1] - P[N - 2][1]]]);
      const td = function (a, b) { return Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5) || 1e-4; };
      for (let i = 1; i < E.length - 2; i++) {
        const p0 = E[i - 1], p1 = E[i], p2 = E[i + 1], p3 = E[i + 2], t1 = td(p0, p1), t2 = t1 + td(p1, p2), t3 = t2 + td(p2, p3);
        for (let k = 0; k < WN; k++) {
          const x = t1 + (t2 - t1) * k / WN;
          const A1 = L(p0, p1, x / t1), A2 = L(p1, p2, (x - t1) / (t2 - t1)), A3 = L(p2, p3, (x - t2) / (t3 - t2));
          const B1 = L(A1, A2, x / t2), B2 = L(A2, A3, (x - t1) / (t3 - t1));
          out.push(L(B1, B2, (x - t1) / (t2 - t1)));
        }
      }
      out.push(P[N - 1].slice());
      return out;
    }

    // the flat sea either side, and the sea's body below it
    const half = 0.92 * r;
    const g = ctx.createLinearGradient(-half, 0, half, 0);
    g.addColorStop(0, rgba(C.sea, 0)); g.addColorStop(0.2, rgba(C.sea, 0.5)); g.addColorStop(0.8, rgba(C.sea, 0.5)); g.addColorStop(1, rgba(C.sea, 0));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = lw; ctx.strokeStyle = g;
    ctx.beginPath(); ctx.moveTo(-half, sy); ctx.lineTo(half, sy); ctx.stroke();
    if (r >= 55) {
      ctx.lineWidth = lw * 0.7;
      for (let k = 1; k <= 3; k++) {
        const w = half * (0.85 - k * 0.12), y = sy + k * 0.11 * r, x0 = Math.sin(t * 0.3 + k * 2) * 0.03 * r;
        ctx.strokeStyle = rgba(C.sea, 0.16 - k * 0.035);
        ctx.beginPath(); ctx.moveTo(x0 - w, y); ctx.lineTo(x0 + w, y); ctx.stroke();
      }
    }

    // the waves: one rises every 13 s and lives 16 s, rising, curling, breaking and settling
    const P = 13, L = 16, now = t + seed * P;
    for (let i = Math.floor(now / P) - 1; i <= Math.floor(now / P); i++) {
      const age = now - i * P;
      if (age < 0 || age >= L) continue;
      const a = ease(age / 2.2) * (1 - ss(age, 12.4, 16));
      if (a < 0.01) continue;
      const f = age < 11 ? 0.06 + 0.92 * ease(age / 11) : 0.98 + 0.42 * ease((age - 11) / 4.5);
      const cx = (0.27 + 0.1 * (age / L - 0.5)) * Hm;
      const K = key(f), H = Math.max.apply(null, K.map(function (q) { return q[1]; })) * Hm;
      const pts = K.map(function (q) { return [cx + q[0] * Hm, sy - q[1] * Hm]; });
      const cv = spline(pts), iTip = 9 * WN, curl = ss(f, 0.6, 0.76), settle = f > 1 ? ss(f, 1, 1.4) : 0;

      // the body: faint sea, with lines laid inside the surface, as the film textures it
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cv[0][0], sy); cv.forEach(function (q) { ctx.lineTo(q[0], q[1]); }); ctx.lineTo(cv[cv.length - 1][0], sy); ctx.closePath();
      ctx.fillStyle = rgba(C.sea, 0.1 * a); ctx.fill();
      if (r >= 55 && H > 0.05 * Hm) {
        ctx.clip(); ctx.lineWidth = lw * 0.75;
        for (let k = 1; k <= 3; k++) {
          const d = k * 0.055 * H;
          ctx.beginPath();
          for (let j = 0; j < cv.length; j++) {
            const p = cv[Math.max(0, j - 1)], n = cv[Math.min(cv.length - 1, j + 1)], tx = n[0] - p[0], ty = n[1] - p[1], m = Math.hypot(tx, ty) || 1;
            const x = cv[j][0] - ty / m * d, y = cv[j][1] + tx / m * d;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.strokeStyle = rgba(C.sea, (0.42 - k * 0.1) * a); ctx.stroke();
        }
      }
      ctx.restore();
      if (curl > 0.25 && settle < 0.6) {      // the hollow of the tube
        ctx.beginPath(); ctx.moveTo(cv[iTip][0], cv[iTip][1]);
        for (let j = iTip; j < cv.length; j++) ctx.lineTo(cv[j][0], cv[j][1]);
        ctx.closePath(); ctx.fillStyle = rgba(C.sea, 0.07 * a * curl * (1 - settle)); ctx.fill();
      }

      // the outline: one ink line; as it collapses the inside of the curl gives way
      const inA = 1 - ss(settle, 0.05, 0.45), cut = inA < 0.999 ? iTip : cv.length - 1;
      ctx.lineWidth = lw * 1.3; ctx.strokeStyle = rgba(C.ink, 0.78 * a);
      ctx.beginPath(); for (let j = 0; j <= cut; j++) j ? ctx.lineTo(cv[j][0], cv[j][1]) : ctx.moveTo(cv[j][0], cv[j][1]); ctx.stroke();
      if (cut < cv.length - 1 && inA > 0.01) {
        ctx.strokeStyle = rgba(C.ink, 0.78 * a * inA);
        ctx.beginPath(); for (let j = cut; j < cv.length; j++) j > cut ? ctx.lineTo(cv[j][0], cv[j][1]) : ctx.moveTo(cv[j][0], cv[j][1]); ctx.stroke();
      }

      // spray off the lip while it curls
      const tip = cv[iTip], lipA = 1 - ss(settle, 0.2, 0.7);
      if (curl > 0.2 && settle < 0.6 && r >= 40) {
        for (const s of st.spray) {
          const u = (t * 0.16 * s[1] + s[0]) % 1, R = H * (0.03 + u * 0.14);
          const x = tip[0] + Math.cos(s[2]) * R * 0.7 + u * 0.06 * H, y = tip[1] - 0.03 * H + Math.sin(s[2]) * R + u * u * 0.1 * H;
          ctx.fillStyle = rgba(C.sea, 0.8 * Math.sin(u * Math.PI) * lipA * curl * a);
          ctx.beginPath(); ctx.arc(x, y, s[3] * lw * 0.9, 0, TAU); ctx.fill();
        }
      }

      // we are here: a ring on the face, just below the top, while it steepens
      const here = a * ss(f, 0.4, 0.55) * (1 - ss(f, 0.96, 1.05));
      if (here > 0.01 && r >= 55) {
        const target = sy - 0.62 * H, stop = curl > 0.5 ? iTip : 5 * WN;
        let hx = null, hy = target;
        for (let j = cv.length - 1; j > stop; j--) {
          const p = cv[j - 1], q = cv[j];
          if (p[1] > q[1] + 1e-6) { hx = q[0]; hy = q[1]; break; }
          if (p[1] <= target && target <= q[1]) { hx = q[0] + (p[0] - q[0]) * ((q[1] - target) / ((q[1] - p[1]) || 1)); break; }
        }
        if (hx !== null) {
          const rr = Math.max(4, 0.07 * r);
          ctx.fillStyle = rgba(C.violet, 0.12 * here); ctx.beginPath(); ctx.arc(hx, hy, rr * 1.35, 0, TAU); ctx.fill();
          ctx.lineWidth = lw * 1.2; ctx.strokeStyle = rgba(C.violet, 0.75 * here); ctx.beginPath(); ctx.arc(hx, hy, rr, 0, TAU); ctx.stroke();
          ctx.fillStyle = rgba(C.violet, 0.9 * here); ctx.beginPath(); ctx.arc(hx, hy, lw * 1.6, 0, TAU); ctx.fill();
        }
      }
    }
  }
});
