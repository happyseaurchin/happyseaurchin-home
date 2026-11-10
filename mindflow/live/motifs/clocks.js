/* Clocks closing, lifted from clocks-of-completion (drawRings): nested rings, one for each scale of a reply being written
   (word, phrase, sentence, paragraph, the whole reply, in the film's blue, green, gold, red and slate), each a faint full
   circle with its own clock filling anticlockwise from three o'clock as its current unit is written, short ticks where
   the units inside it ended, and a soft swell when it closes; then it starts again. The last word closes every ring at
   once and the reply is complete. A reply is drawn from its number, so nothing is stored but the reply in hand. */
MOTIF('clocks', (function () {
  const TAU = Math.PI * 2, C = MOTIF.C, rgba = MOTIF.rgba, CYCLE = 20, WRITE = 17.2;
  const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u].map(Math.round);
  const LEVEL = [C.blue, C.sea, C.amber, C.coral, mix(C.steel, C.ink, 0.35)];
  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;

  // a reply: paragraphs of sentences of phrases of words; ends[L] are the times each unit at level L closes
  function reply(n, seed) {
    const rnd = MOTIF.rand((n * 0.6180339887 + seed * 0.71) % 1), words = [], ends = [[], [], [], [], []];
    const paras = 2;
    for (let pa = 0; pa < paras; pa++) {
      const sents = 2;
      for (let se = 0; se < sents; se++) {
        const phr = 2 + (rnd() < 0.25 ? 1 : 0);
        for (let ph = 0; ph < phr; ph++) {
          const wd = 2 + (rnd() < 0.4 ? 1 : 0);
          for (let w = 0; w < wd; w++) { words.push(0.7 + rnd() * 0.8); ends[0].push(words.length); }
          ends[1].push(words.length);
        }
        ends[2].push(words.length);
      }
      ends[3].push(words.length);
    }
    ends[4].push(words.length);
    // time: words of different lengths, the whole reply written in WRITE seconds
    const tot = words.reduce((a, b) => a + b, 0), at = [0];
    words.forEach(d => at.push(at[at.length - 1] + d / tot * WRITE));
    return ends.map(E => E.map(i => at[i]));
  }

  return {
    title: 'Clocks closing',
    about: 'Nested rings for word, phrase, sentence, paragraph and the whole reply, each filling like a clock and closing as its unit completes, the small ones often and the large ones rarely: how an LLM writes a completion, token by token, every scale keeping its own clock.',
    draw(ctx, t, r, o) {
      const seed = o.seed || 0, tt = t + seed * CYCLE * 2.9, n = Math.floor(tt / CYCLE), tau = tt - n * CYCLE;
      const st = o.state || {};
      if (st.n !== n || st.seed !== seed) { st.n = n; st.seed = seed; st.ends = reply(n, seed); st.prev = reply(n - 1, seed); }
      const E = st.ends, R = r * 0.93, r0 = R * 0.3, gap = (R - r0) / (LEVEL.length - 1), fine = r >= 50;
      ctx.lineCap = 'round';

      for (let L = 0; L < LEVEL.length; L++) {
        const rad = r0 + gap * L, col = LEVEL[L], ends = E[L];
        // the unit in hand, and when it began
        let i = 0; while (i < ends.length && ends[i] <= tau) i++;
        const start = i ? ends[i - 1] : 0, fin = i < ends.length ? ends[i] : null;
        const prog = fin === null ? 0 : clamp((tau - start) / (fin - start));
        // the ghost ring
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU);
        ctx.strokeStyle = rgba(C.ink, 0.09); ctx.lineWidth = Math.max(0.6, r * 0.004); ctx.stroke();
        // ticks where the units inside this one ended
        if (fine && L > 0 && fin !== null) {
          const inner = E[L - 1];
          ctx.beginPath();
          for (let q = 0; q < inner.length; q++) {
            const e = inner[q];
            if (e <= start || e >= fin || e > tau) continue;
            const a = -TAU * (e - start) / (fin - start), ca = Math.cos(a), sa = Math.sin(a), d = r * 0.022;
            ctx.moveTo((rad - d) * ca, (rad - d) * sa); ctx.lineTo((rad + d) * ca, (rad + d) * sa);
          }
          ctx.strokeStyle = rgba(C.ink, 0.3); ctx.lineWidth = Math.max(0.6, r * 0.005); ctx.stroke();
        }
        // the clock: anticlockwise from three o'clock
        const lw = Math.max(1.3, (3.2 + 0.5 * L) * r / 190);
        if (prog > 0.002) {
          ctx.beginPath(); ctx.arc(0, 0, rad, 0, -TAU * prog, true);
          ctx.strokeStyle = rgba(col, 0.88); ctx.lineWidth = lw; ctx.stroke();
        }
        // the swell of the last close (this reply's, or the end of the one before)
        const last = i ? ends[i - 1] : st.prev[L][st.prev[L].length - 1] - CYCLE;
        const dur = 0.7 + 0.35 * L, age = tau - last, fl = age >= 0 && age < dur ? Math.pow(1 - age / dur, 2) * (0.3 + 0.1 * L) : 0;
        const hold = fin === null ? 0.42 * clamp(1 - (tau - WRITE) / (CYCLE - WRITE)) : 0;   // the finished reply, fading before the next
        if (fl > 0.01 || hold > 0.01) {
          ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU);
          ctx.strokeStyle = rgba(col, Math.max(fl, hold)); ctx.lineWidth = lw + r * 0.04 * fl; ctx.stroke();
        }
      }
      // the centre, where the tokens arrive
      const w = E[0];
      let k = 0; while (k < w.length && w[k] <= tau) k++;
      const wa = k ? tau - w[k - 1] : 9, beat = wa < 0.7 ? Math.pow(1 - wa / 0.7, 2) * 0.6 : 0;
      const rc = r0 - Math.max(2, r * 0.05);
      ctx.beginPath(); ctx.arc(0, 0, rc, 0, TAU);
      ctx.fillStyle = rgba(C.ink, 0.035 + 0.04 * beat); ctx.fill();
      ctx.strokeStyle = rgba(C.ink, 0.22 + 0.25 * beat); ctx.lineWidth = Math.max(0.7, r * 0.005); ctx.stroke();
      if (fine) {
        // the words so far, as a few dots turning slowly round the centre
        const shown = Math.min(k, 12);
        ctx.fillStyle = rgba(C.ink, 0.5);
        for (let q = 0; q < shown; q++) {
          const a = -TAU * (q / 12) - tau * 0.05, rr = rc * 0.55;
          ctx.beginPath(); ctx.arc(rr * Math.cos(a), rr * Math.sin(a), Math.max(0.8, r * 0.008), 0, TAU); ctx.fill();
        }
      }
    }
  };
})());
