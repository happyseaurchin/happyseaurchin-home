/* sundial — lifted from House on the Sundial: the dial of concentric rings, each cutting the same year finer
   (seasons, months, weeks, days, as the film's project rung shows them), the small gap at twelve o'clock where the
   period starts and ends, the amber band of the chain outside the rings, the ten voices' lanes beyond it, and the hand
   from the centre at now. The hand sweeps; the cells it has just passed are lit as done and fade behind it. */
MOTIF('sundial', {
  title: "The sundial's rings",
  about: 'A dial of concentric rings, each cutting the same year finer, seasons, months, weeks and days, with a hand at now crossing every ring and the cells it has just passed lit behind it: time as nested rings, every scale read at one address.',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, TAU = Math.PI * 2, GAP = 0.035;
    const seed = o.seed || 0;
    if (!o.state.lanes) {                       // the voices' lanes: seeded runs of work, fixed for this instance
      const rnd = MOTIF.rand(seed + 0.31), lanes = [];
      for (let k = 0; k < 4; k++) { const d = []; for (let i = 0; i < 14; i++) d.push(1 + rnd() * 9, 2 + rnd() * 16); lanes.push(d); }
      const chain = []; for (let i = 0; i < 10; i++) chain.push(4 + rnd() * 18, 1.5 + rnd() * 3);
      o.state.lanes = lanes; o.state.chain = chain;
    }
    const D = r * 0.94, small = r < 55, big = r >= 110;
    const lw = Math.max(0.75, r / 170);
    const a0 = -Math.PI / 2 + GAP, a1 = -Math.PI / 2 + TAU - GAP, span = TAU - 2 * GAP;
    const hand = a0 + span * ((t / 20 + seed) % 1);                  // one year round the dial in 20 s
    const rings = small ? [4, 12, 52] : big ? [4, 12, 52, 365] : [4, 12, 52];
    const rIn = 0.21 * D, rOut = (small ? 0.8 : 0.7) * D, step = (rOut - rIn) / rings.length;

    // the light of what has just been done: brightest at the hand, fading round behind it
    let trail = null;
    if (ctx.createConicGradient) {
      trail = ctx.createConicGradient(hand, 0, 0);
      trail.addColorStop(0, rgba(C.ink, 0));
      trail.addColorStop(0.62, rgba(C.ink, 0));
      trail.addColorStop(0.9, rgba(C.ink, 0.12));
      trail.addColorStop(1, rgba(C.ink, 0.42));
    }
    function ring(rad, width, n, style, gapPx) {
      const L = span * rad / n, g = Math.min(L * 0.4, gapPx);
      ctx.setLineDash([Math.max(0.6, L - g), g]); ctx.lineDashOffset = -g / 2;
      ctx.lineWidth = width; ctx.strokeStyle = style;
      ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    rings.forEach(function (n, k) {
      const rad = rIn + (k + 0.5) * step, w = step * (small ? 0.8 : 0.64), gp = Math.max(0.8, lw * (n > 100 ? 0.9 : 1.6));
      ring(rad, w, n, rgba(C.blue, small ? 0.36 : 0.2 - k * 0.02), gp);
      if (trail) ring(rad, w, n, trail, gp);
    });
    if (!trail) {                                // without conic gradients: the trail in a few steps
      for (let i = 0; i < 6; i++) {
        const b = hand - (i + 1) * 0.12, e = hand - i * 0.12;
        ctx.setLineDash([]); ctx.lineWidth = rOut - rIn; ctx.strokeStyle = rgba(C.ink, 0.22 * (1 - i / 6));
        ctx.beginPath(); ctx.arc(0, 0, (rIn + rOut) / 2, b, e); ctx.stroke();
      }
    }

    // the chain: an amber band just outside the rings; and beyond it the voices' lanes
    const bandR = rOut + 0.045 * D;
    ctx.setLineDash(o.state.chain.map(function (x) { return x * D / 160; })); ctx.lineDashOffset = 0;
    ctx.lineWidth = Math.max(1.2, 0.03 * D); ctx.strokeStyle = rgba(C.amber, small ? 0.75 : 0.55);
    ctx.beginPath(); ctx.arc(0, 0, bandR, a0, a1); ctx.stroke();
    if (!small) {
      const nl = big ? 3 : 2, la = bandR + 0.06 * D, lb = 0.99 * D, lwd = (lb - la) / nl;
      for (let k = 0; k < nl; k++) {
        ctx.setLineDash(o.state.lanes[k].map(function (x) { return x * D / 170; })); ctx.lineDashOffset = k * 7;
        ctx.lineWidth = lwd * 0.48; ctx.strokeStyle = rgba(C.ink, 0.075 + 0.03 * (k % 2));
        ctx.beginPath(); ctx.arc(0, 0, la + (k + 0.5) * lwd, a0, a1); ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // the centre: the reference the whole period is read from
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(0, 0, 0.17 * D, 0, TAU);
    ctx.fillStyle = rgba(C.deep, 0.35); ctx.fill(); ctx.strokeStyle = rgba(C.ink, 0.3); ctx.stroke();

    // the hand at now, from the centre out through every ring
    const hx = Math.cos(hand), hy = Math.sin(hand);
    ctx.lineCap = 'round';
    ctx.lineWidth = lw * 1.7; ctx.strokeStyle = rgba(C.ink, 0.85);
    ctx.beginPath(); ctx.moveTo(hx * 0.175 * D, hy * 0.175 * D); ctx.lineTo(hx * D, hy * D); ctx.stroke();
    ctx.fillStyle = rgba(C.sand, 0.2); ctx.beginPath(); ctx.arc(hx * D, hy * D, lw * 5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(C.sand, 0.95); ctx.beginPath(); ctx.arc(hx * D, hy * D, lw * 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(C.ink, 0.7); ctx.beginPath(); ctx.arc(0, 0, lw * 1.6, 0, TAU); ctx.fill();
  }
});
