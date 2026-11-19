/* Rain, not river, lifted from rain-not-river: the film's change of view, from the one river of the mainstream (left here
   as a faint trace) to rain, seen both ways at once: slanted streaks falling (looking up) and small rings spreading where
   drops land (looking down), each drop on its own, everywhere; and the pools the drops gather into, sea-coloured, each with
   someone in it, joined by pale links. Every drop is drawn from its own number and the time, so nothing is stored. */
MOTIF('rain', (function () {
  const TAU = Math.PI * 2, C = MOTIF.C, rgba = MOTIF.rgba;
  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const NS = 48, NP = 22;                                   // streaks and splashes

  function layout(seed) {
    const rnd = MOTIF.rand(seed * 0.913 + 0.031), streaks = [], pools = [], links = [];
    for (let i = 0; i < NS; i++) streaks.push({ x: rnd() * 2 - 1, v: 0.26 + rnd() * 0.16, ph: rnd(), a: 0.3 + rnd() * 0.35 });
    let tries = 0;
    while (pools.length < 6 && tries++ < 200) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 0.7, x = d * Math.cos(a), y = d * Math.sin(a) + 0.08, s = 0.035 + rnd() * 0.045;
      if (pools.every(p => Math.hypot(p.x - x, p.y - y) > p.s + s + 0.16)) pools.push({ x: x, y: y, s: s, ph: rnd() * TAU, who: [C.blue, C.amber, C.violet, C.sea, C.rose][pools.length % 5] });
    }
    pools.forEach((p, i) => pools.forEach((q, j) => { if (j > i && Math.hypot(p.x - q.x, p.y - q.y) < 0.62) links.push([p, q]); }));
    return { streaks: streaks, pools: pools, links: links };
  }

  return {
    title: 'Rain, not river',
    about: 'Rain falling everywhere at once, each drop landing on its own and spreading a small ring, gathering into many small linked pools, with the one river of the mainstream only a faint trace: two directions for AI, many small makers rather than a few big labs.',
    draw(ctx, t, r, o) {
      const seed = o.seed || 0, st = o.state || {};
      if (!st.lay || st.seed !== seed) { st.seed = seed; st.lay = layout(seed); }
      const lay = st.lay, tt = t + seed * 50, fine = r >= 55;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // the river that was: one channel across, now only a trace
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const u = i / 24, x = (-0.92 + 1.84 * u) * r, y = (-0.3 + 0.38 * u + 0.16 * Math.sin(u * 5.2 + 0.6)) * r;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(C.sea, 0.07); ctx.lineWidth = r * 0.075; ctx.stroke();
      ctx.strokeStyle = rgba(C.sea, 0.12); ctx.lineWidth = Math.max(0.8, r * 0.008); ctx.stroke();

      // the pools, breathing, each with someone in it, and the links between them
      ctx.strokeStyle = rgba(C.sea, 0.16); ctx.lineWidth = Math.max(0.8, r * 0.012);
      ctx.beginPath();
      lay.links.forEach(L => { ctx.moveTo(L[0].x * r, L[0].y * r); ctx.lineTo(L[1].x * r, L[1].y * r); });
      ctx.stroke();
      lay.pools.forEach(p => {
        const s = p.s * r * (0.82 + 0.18 * Math.sin(tt * 0.21 + p.ph));
        ctx.beginPath(); ctx.arc(p.x * r, p.y * r, s, 0, TAU);
        ctx.fillStyle = rgba(C.sea, 0.24); ctx.fill();
        ctx.strokeStyle = rgba(C.sea, 0.5); ctx.lineWidth = Math.max(0.8, r * 0.006); ctx.stroke();
        if (fine) { ctx.fillStyle = rgba(p.who, 0.9); ctx.beginPath(); ctx.arc(p.x * r + s * 0.25 * Math.cos(tt * 0.3 + p.ph), p.y * r + s * 0.2 * Math.sin(tt * 0.23 + p.ph), Math.max(1.2, s * 0.2), 0, TAU); ctx.fill(); }
      });

      // looking down: where each drop lands, a ring spreads and fades
      ctx.lineWidth = Math.max(0.7, r * 0.006);
      for (let i = 0; i < NP; i++) {
        const per = 1.7 + ((i * 0.37) % 1) * 0.9, v = tt / per + ((i * 0.618) % 1), cyc = Math.floor(v), u = v - cyc;
        const rnd = MOTIF.rand(((i * 0.1234 + cyc * 0.0731 + seed * 0.57) % 1 + 1) % 1);
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * 0.86 * r;
        ctx.strokeStyle = rgba(C.sea, 0.6 * (1 - u) * clamp(u * 8));
        ctx.beginPath(); ctx.arc(d * Math.cos(a), d * Math.sin(a), r * (0.012 + 0.07 * u), 0, TAU); ctx.stroke();
      }

      // looking up: the streaks, slanted, falling everywhere
      const len = r * 0.075;
      ctx.lineWidth = Math.max(0.8, r * 0.007);
      for (let i = 0; i < (fine ? NS : 22); i++) {
        const s = lay.streaks[i], y = ((tt * s.v / 2.4 + s.ph) % 1) * 2.4 - 1.2, x = s.x + y * 0.22;
        const rim = 1 - Math.hypot(x, y);
        if (rim < 0.03) continue;
        ctx.strokeStyle = rgba(C.ink, s.a * clamp(rim / 0.2));
        ctx.beginPath(); ctx.moveTo(x * r, y * r); ctx.lineTo(x * r - len * 0.22, y * r - len); ctx.stroke();
      }
    }
  };
})());
