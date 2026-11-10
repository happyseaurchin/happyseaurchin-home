/* spindle — the talk's "A spindle in time" (presentation.html: the ladder from the year down to this moment, each rung
   a line, lit as an instance is handed every rung above where it arrives), ending at now as Two Ways Through Now
   draws it: two circles that touch at now, the sensing way and the projecting way, turning in opposite senses.
   A light walks down one rung at a time, each rung staying lit behind it; at now it goes both ways round, then the
   ladder dims and the walk begins again from the year. */
MOTIF('spindle', {
  title: 'The spindle',
  about: 'A ladder of rungs narrowing from the year down to this moment, walked one rung deeper with every rung above kept lit, ending at now where two circles touch and the light goes both ways round: the spindle, reading from the general to the particular, two ways through now.',
  draw(ctx, t, r, o) {
    const C = MOTIF.C, rgba = MOTIF.rgba, TAU = Math.PI * 2;
    const seed = o.seed || 0;
    const clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    const ease = function (x) { x = clamp(x); return x * x * (3 - 2 * x); };
    const n = r < 55 ? 4 : r < 120 ? 6 : 7;                    // the year, the season, the month, the week, the day, …
    const lw = Math.max(0.8, r / 150);
    const yTop = -0.84 * r, yBot = 0.13 * r, yNow = 0.52 * r, Rc = 0.25 * r;
    const P = n + 7.9, tau = (t + seed * P) % P;                // one walk: 12 to 15 s
    const tN = n + 0.3, tF = tN + 5.2;                           // arrival at now; the ladder begins to dim
    const dim = 1 - ease((tau - tF) / 1.6);
    const Y = [], Wd = [];
    for (let k = 0; k < n; k++) { const f = k / (n - 1); Y.push(yTop + (yBot - yTop) * f); Wd.push((0.56 - 0.46 * Math.pow(f, 0.9)) * r); }
    ctx.lineCap = 'round';

    // the stem, from the year to now
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath(); ctx.moveTo(0, yTop - 0.06 * r); ctx.lineTo(0, yNow); ctx.strokeStyle = rgba(C.ink, 0.22); ctx.stroke();

    // the rungs: each a line, narrowing toward now; lit as the walk reaches it, and kept lit
    for (let k = 0; k < n; k++) {
      const lit = ease((tau - (k + 0.25)) / 0.45) * dim;
      const here = lit * (1 - ease((tau - (k < n - 1 ? k + 1.25 : tN)) / 0.45));   // the rung the light stands on
      ctx.beginPath(); ctx.moveTo(-Wd[k], Y[k]); ctx.lineTo(Wd[k], Y[k]);
      if (here > 0.01) { ctx.lineWidth = lw * 5; ctx.strokeStyle = rgba(C.sand, 0.1 * here); ctx.stroke(); }
      ctx.lineWidth = lw * (1.1 + 0.5 * lit);
      ctx.strokeStyle = rgba(C.ink, 0.24 * (1 - lit)); ctx.stroke();
      if (lit > 0.01) { ctx.strokeStyle = rgba(C.sand, 0.85 * lit); ctx.stroke(); }
      if (r >= 55) {
        ctx.fillStyle = rgba(lit > 0.5 ? C.sand : C.ink, 0.3 + 0.5 * lit);
        ctx.beginPath(); ctx.arc(-Wd[k], Y[k], lw * 1.3, 0, TAU); ctx.arc(Wd[k], Y[k], lw * 1.3, 0, TAU); ctx.fill();
      }
    }

    // two ways through now: two circles touching at now, traced in opposite senses by the light
    const s = ease((tau - tN - 0.3) / 4.5), trace = dim;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(-Rc, yNow, Rc, 0, TAU); ctx.moveTo(2 * Rc, yNow); ctx.arc(Rc, yNow, Rc, 0, TAU);
    ctx.strokeStyle = rgba(C.ink, 0.2); ctx.stroke();
    if (s > 0 && trace > 0.01) {
      ctx.lineWidth = lw * 1.5; ctx.strokeStyle = rgba(C.sand, 0.6 * trace);
      ctx.beginPath(); ctx.arc(-Rc, yNow, Rc, -s * TAU, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(Rc, yNow, Rc, Math.PI, Math.PI + s * TAU); ctx.stroke();
    }

    // the walker: down the stem a rung at a time, into now
    let wy, wa;
    if (tau < tN) {
      const k = Math.min(n - 1, Math.floor(tau)), from = k === 0 ? yTop - 0.1 * r : Y[k - 1];
      wy = tau < n ? from + (Y[k] - from) * ease((tau - k) / 0.45) : Y[n - 1] + (yNow - Y[n - 1]) * ease((tau - n) / 0.3);
      wa = ease(tau / 0.3);
    } else { wy = yNow; wa = 1 - ease((tau - tN) / 0.4); }
    const dr = Math.max(1.3, r / 85);
    function dot(x, y, a) {
      ctx.fillStyle = rgba(C.sand, 0.18 * a); ctx.beginPath(); ctx.arc(x, y, dr * 2.8, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(C.sand, 0.95 * a); ctx.beginPath(); ctx.arc(x, y, dr, 0, TAU); ctx.fill();
    }
    if (wa > 0.01) dot(0, wy, wa);
    const da = ease((tau - tN - 0.3) / 0.3) * (1 - ease((tau - tN - 4.6) / 0.5));
    if (da > 0.01) {
      dot(-Rc + Rc * Math.cos(-s * TAU), yNow + Rc * Math.sin(-s * TAU), da);
      dot(Rc + Rc * Math.cos(Math.PI + s * TAU), yNow + Rc * Math.sin(Math.PI + s * TAU), da);
    }

    // now, where the two ways meet
    const glow = 0.5 + 0.5 * ease((tau - tN + 0.3) / 0.6) * dim;
    ctx.fillStyle = rgba(C.violet, 0.14 * glow); ctx.beginPath(); ctx.arc(0, yNow, 0.09 * r, 0, TAU); ctx.fill();
    ctx.lineWidth = lw * 1.2; ctx.strokeStyle = rgba(C.violet, 0.5 + 0.4 * glow);
    ctx.beginPath(); ctx.arc(0, yNow, Math.max(2.2, 0.045 * r), 0, TAU); ctx.stroke();
    ctx.fillStyle = rgba(C.violet, 0.9); ctx.beginPath(); ctx.arc(0, yNow, Math.max(1, 0.018 * r), 0, TAU); ctx.fill();
  }
});
