/* basin — the-hidden-basin's chart seen from above: the level lines of the landscape, the flock of dashes circling the
   old basin (the held centre), the bar with its seven sectors, the ring further out where the hidden attractor lies, and
   the graduated border. Here the flock keeps climbing toward the rim and rolling back in; a few already go round the ring. */
MOTIF('basin', {
  title: 'The hidden basin',
  about: 'A landscape seen from above: a flock circles in an old basin and keeps rolling back into it each time it climbs toward the rim, while a ring further out, the hidden attractor, waits with only a few going round it.',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, st = o.state, TAU = 6.2832;
    if (!st.p) {
      const R = MOTIF.rand(o.seed); st.p = []; st.rot = R() * TAU;
      for (let i = 0; i < 64; i++) st.p.push({ a: R() * TAU, rb: 0.09 + Math.sqrt(R()) * 0.23, ph: R() * TAU, f: 0.75 + R() * 0.5 });
    }
    const big = r >= 70;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    /* the hollow, and the level lines of the land, shifting very slowly */
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.62 * r);
    g.addColorStop(0, rgba(C.steel, 0.16)); g.addColorStop(1, rgba(C.steel, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 0.62 * r, 0, TAU); ctx.fill();
    const levels = big ? [0.17, 0.29, 0.41, 0.53] : [0.22, 0.42];
    ctx.strokeStyle = rgba(C.steel, 0.32); ctx.lineWidth = Math.max(0.6, r * 0.004);
    ctx.beginPath();
    levels.forEach(function (L, li) {
      for (let k = 0; k <= 48; k++) {
        const th = k / 48 * TAU, rr = L * (1 + 0.035 * Math.sin(3 * th + li * 1.9 + t * 0.06) + 0.02 * Math.sin(5 * th - li + t * 0.04)) * r;
        if (k) ctx.lineTo(Math.cos(th) * rr, Math.sin(th) * rr); else ctx.moveTo(Math.cos(th) * rr, Math.sin(th) * rr);
      }
    });
    ctx.stroke();

    /* the bar, and its seven sectors */
    ctx.strokeStyle = rgba(C.ink, 0.22); ctx.lineWidth = Math.max(0.6, r * 0.0045);
    ctx.beginPath(); ctx.arc(0, 0, 0.65 * r, 0, TAU);
    for (let s = 0; s < 7; s++) { const b = st.rot + s / 7 * TAU; ctx.moveTo(Math.cos(b) * 0.61 * r, Math.sin(b) * 0.61 * r); ctx.lineTo(Math.cos(b) * 0.69 * r, Math.sin(b) * 0.69 * r); }
    ctx.stroke();

    /* the ring: the hidden attractor */
    ctx.strokeStyle = rgba(C.sea, 0.38 + 0.1 * Math.sin(t * 0.45 + o.seed * 6)); ctx.lineWidth = Math.max(1, r * 0.011);
    ctx.shadowColor = rgba(C.sea, 0.6); ctx.shadowBlur = Math.max(2, r * 0.03);
    ctx.beginPath(); ctx.arc(0, 0, 0.8 * r, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    /* the graduated border */
    if (big) {
      ctx.strokeStyle = rgba(C.ink, 0.16); ctx.lineWidth = Math.max(0.6, r * 0.003);
      ctx.beginPath(); ctx.arc(0, 0, 0.95 * r, 0, TAU);
      for (let d = 0; d < 72; d++) { const a = d / 72 * TAU, l = d % 6 === 0 ? 0.985 : 0.965; ctx.moveTo(Math.cos(a) * 0.95 * r, Math.sin(a) * 0.95 * r); ctx.lineTo(Math.cos(a) * l * r, Math.sin(a) * l * r); }
      ctx.stroke();
    }

    /* the flock in the old basin: circling, climbing toward the rim, rolling back */
    const N = big ? 64 : 36, len = Math.max(2.2, r * 0.05);
    ctx.strokeStyle = rgba(C.ink, 0.82); ctx.lineWidth = Math.max(1, r * 0.009);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const p = st.p[i], climb = Math.pow(Math.max(0, Math.sin(t * 0.21 * p.f + p.ph)), 4);
      const rad = (p.rb + 0.2 * climb) * r, th = p.a + t * 0.085 * p.f / Math.max(0.12, p.rb + 0.2 * climb), dth = len / Math.max(rad, 1);
      ctx.moveTo(Math.cos(th) * rad, Math.sin(th) * rad); ctx.lineTo(Math.cos(th - dth) * rad, Math.sin(th - dth) * rad);
    }
    ctx.stroke();
    /* the few already on the ring */
    ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = Math.max(1.2, r * 0.013);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const th = st.rot + i * 1.27 + t * 0.05, rad = 0.8 * r, dth = len / rad;
      ctx.moveTo(Math.cos(th) * rad, Math.sin(th) * rad); ctx.lineTo(Math.cos(th - dth) * rad, Math.sin(th - dth) * rad);
    }
    ctx.stroke();
  }
});
