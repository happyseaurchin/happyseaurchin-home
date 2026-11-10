/* buckets — the yoke from the talk's first instrument (presentation.html, 1a "carry it": the figure, the amber yoke,
   the two hanging buckets, the scum side bending the back) with the room's balls (1b) dropping into each bucket. */
MOTIF('buckets', {
  title: 'Two buckets',
  about: 'A figure with a yoke across the shoulders carries a scum bucket and a genius bucket as small balls drop into each, the scum one filling faster and bending the back: all our lives we sort what we hear into one bucket or the other (genius or scum bucket).',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, s = r / 128;            // the instrument's units: the figure stands ~225 of them tall
    const st = o.state;
    if (!st.j) { const R = MOTIF.rand(o.seed); st.j = []; for (let i = 0; i < 72; i++) st.j.push(R()); }
    const J = st.j, P = 18, NS = 20, NG = 10, D = 1.5;
    const ph = ((t + o.seed * P) % P + P) % P;
    const sm = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
    const fade = 1 - sm(14.6, 17.4, ph);                             // the buckets empty, and the day begins again
    const spS = k => 0.3 + k * 0.6 + J[k] * 0.3, spG = k => 0.8 + k * 1.2 + J[20 + k] * 0.4;
    let heavy = 0;
    for (let k = 0; k < NS; k++) heavy += sm(spS(k) + D - 0.1, spS(k) + D + 0.5, ph);
    heavy = heavy / NS * fade;                                       // the scum bucket's weight bends the back
    const tilt = heavy * 6, stoop = heavy * 10;
    const L = -80, Rx = 80, yokeY = -60, top = -15, bw = 64, bh = 54;
    const lw = (v, m) => Math.max(m, v * s);
    const slot = (k, cx, bottom) => {
      const row = k >> 2, ci = [1, 2, 0, 3][(k + row) & 3];
      return [cx + (ci - 1.5) * 9.4 + (J[40 + (k % 30)] - 0.5) * 1.4, bottom - 4.2 - row * 7.4];
    };
    const br = Math.max(0.9, 4 * s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    /* the ground, faint */
    ctx.strokeStyle = rgba(C.ink, 0.12); ctx.lineWidth = lw(1, 0.6);
    ctx.beginPath(); ctx.moveTo(-58 * s, 112.5 * s); ctx.lineTo(58 * s, 112.5 * s); ctx.stroke();

    /* balls in the air, behind everything */
    function falling(n, sp, cx, bottom, col) {
      ctx.fillStyle = rgba(col, 0.9);
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const u = (ph - sp(k)) / D;
        if (u <= 0 || u >= 1) continue;
        const p = slot(k, cx, bottom), y0 = -Math.sqrt(Math.max(0, 118 * 118 - p[0] * p[0])) + 6;
        const y = y0 + (p[1] - y0) * u * u, a = Math.min(1, u * 3);
        ctx.moveTo(p[0] * s + br * a, y * s); ctx.arc(p[0] * s, y * s, br * a, 0, 6.2832);
      }
      ctx.fill();
    }
    falling(NS, spS, L, top + tilt + bh, C.lime);
    falling(NG, spG, Rx, top + bh, C.sand);

    /* the figure */
    const hx = stoop * 0.4, hy = -101 + stoop * 0.3;
    ctx.strokeStyle = rgba(C.ink, 0.92); ctx.lineWidth = lw(3, 1);
    ctx.beginPath(); ctx.arc(hx * s, hy * s, 11 * s, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx * s, (hy + 11) * s); ctx.lineTo(0, 22.5 * s); ctx.lineTo(-12 * s, 112.5 * s);
    ctx.moveTo(0, 22.5 * s); ctx.lineTo(12 * s, 112.5 * s); ctx.stroke();
    const yy = x => yokeY + tilt * (Rx - x) / (Rx - L), sx = hx * 0.8, sy = hy + 19;
    ctx.lineWidth = lw(2.4, 0.9);                                    // the hands on the yoke
    ctx.beginPath(); ctx.moveTo(-27 * s, yy(-27) * s); ctx.lineTo(sx * s, sy * s); ctx.lineTo(27 * s, yy(27) * s); ctx.stroke();

    /* the ropes and the buckets */
    ctx.strokeStyle = rgba(C.ink, 0.55); ctx.lineWidth = lw(1.5, 0.7);
    ctx.beginPath(); ctx.moveTo(L * s, (yokeY + tilt) * s); ctx.lineTo(L * s, (top + tilt) * s);
    ctx.moveTo(Rx * s, yokeY * s); ctx.lineTo(Rx * s, top * s); ctx.stroke();
    function bucket(cx, y) {
      ctx.moveTo((cx - bw / 2) * s, y * s); ctx.lineTo((cx + bw / 2) * s, y * s);
      ctx.lineTo((cx + bw * 0.38) * s, (y + bh) * s); ctx.lineTo((cx - bw * 0.38) * s, (y + bh) * s); ctx.closePath();
    }
    ctx.strokeStyle = rgba(C.ink, 0.62); ctx.lineWidth = lw(2, 0.9);
    ctx.beginPath(); bucket(L, top + tilt); bucket(Rx, top); ctx.stroke();

    /* what has landed */
    function landed(n, sp, cx, bottom, col) {
      ctx.fillStyle = rgba(col, 0.92 * fade);
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        if (ph < sp(k) + D) continue;
        const p = slot(k, cx, bottom);
        ctx.moveTo(p[0] * s + br, p[1] * s); ctx.arc(p[0] * s, p[1] * s, br, 0, 6.2832);
      }
      ctx.fill();
    }
    if (fade > 0.01) { landed(NS, spS, L, top + tilt + bh, C.lime); landed(NG, spG, Rx, top + bh, C.sand); }

    /* the yoke, lamp-lit */
    ctx.strokeStyle = rgba(C.sand, 0.95); ctx.lineWidth = lw(3, 1.1);
    ctx.shadowColor = rgba(C.sand, 0.55); ctx.shadowBlur = Math.max(2, 7 * s);
    ctx.beginPath(); ctx.moveTo(L * s, (yokeY + tilt) * s); ctx.lineTo(Rx * s, yokeY * s); ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';

    /* the names, where there is room for them */
    const fs = 9.5 * s;
    if (fs >= 8.5) {
      ctx.font = '600 ' + fs.toFixed(1) + 'px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = rgba(C.lime, 0.55); ctx.fillText('SCUM', L * s, (top + tilt + bh + 7) * s);
      ctx.fillStyle = rgba(C.sand, 0.55); ctx.fillText('GENIUS', Rx * s, (top + bh + 7) * s);
    }
  }
});
