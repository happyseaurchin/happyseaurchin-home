/* The mirror, lifted from the-beach-is-a-mirror: the film's standing figure (round head, a torso a little wider at the
   shoulders, limbs as round-capped lines) on the line of the wet sand, and below it its reflection, flipped about the feet
   and paler, with the smaller figures of the people whose lines were read standing beside it in their own colours, joined
   by the film's dashed urchin thread. The reflection's colour is the reader's and keeps changing; the figure's does not.
   From mirror-and-half-turn: a dotted half circle about the feet, along which a violet point carries the head to its
   reflection, since for a figure like this the mirror and the half turn give the same picture. */
MOTIF('mirror', (function () {
  const TAU = Math.PI * 2, C = MOTIF.C, rgba = MOTIF.rgba;
  const READERS = [C.rose, C.coral, C.violet, C.lime, C.amber];       // never the figure's own colour
  const ECHO = [C.coral, C.sea, C.violet, C.rose, C.lime, C.blue];
  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = u => u * u * (3 - 2 * u);
  const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u].map(Math.round);

  function line(ctx, P) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.stroke(); }
  // the film's figure: feet at (x, fy), height h; walk swings the limbs a little
  function figure(ctx, x, fy, h, walk, limb, torso, head) {
    const s = Math.sin(walk) * h * 0.1, l1 = Math.max(0, Math.cos(walk)) * h * 0.035, l2 = Math.max(0, -Math.cos(walk)) * h * 0.035;
    const st = h * 0.05, sw = Math.sin(walk) * h * 0.045;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = limb;
    ctx.lineWidth = h * 0.055;
    line(ctx, [[x + h * 0.022, fy - h * 0.43], [x + st * 0.7 + s * 0.55, fy - h * 0.21 - l1], [x + st + s, fy - l1]]);
    line(ctx, [[x - h * 0.022, fy - h * 0.43], [x - st * 0.7 - s * 0.55, fy - h * 0.21 - l2], [x - st - s, fy - l2]]);
    ctx.fillStyle = torso; ctx.beginPath();
    ctx.moveTo(x - h * 0.075, fy - h * 0.7);
    ctx.quadraticCurveTo(x, fy - h * 0.79, x + h * 0.075, fy - h * 0.7);
    ctx.lineTo(x + h * 0.06, fy - h * 0.42); ctx.quadraticCurveTo(x, fy - h * 0.38, x - h * 0.06, fy - h * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = h * 0.045;
    line(ctx, [[x - h * 0.06, fy - h * 0.7], [x - h * 0.1 - sw, fy - h * 0.55], [x - h * 0.115 - sw * 1.4, fy - h * 0.4]]);
    line(ctx, [[x + h * 0.06, fy - h * 0.7], [x + h * 0.1 + sw, fy - h * 0.55], [x + h * 0.115 + sw * 1.4, fy - h * 0.4]]);
    ctx.fillStyle = head; ctx.beginPath(); ctx.arc(x, fy - h * 0.865, h * 0.092, 0, TAU); ctx.fill();
  }
  function glow(ctx, x, y, rad, col, a) {
    if (a < 0.01) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  }

  return {
    title: 'The mirror',
    about: 'A figure standing on wet sand and its reflection beneath, the reflection taking a different colour from each reader, with the people behind the lines read standing in it: the beach is a mirror; meaning is not in the words, the reader brings it.',
    draw(ctx, t, r, o) {
      const seed = o.seed || 0, tt = t + seed * 40, Y = r * 0.04, h = r * 0.86;
      const detail = r >= 55;
      const walk = 0.14 * Math.sin(tt * 0.45);
      const own = [C.sea, C.blue, C.steel][Math.floor(seed * 3) % 3];

      // the wet sand: faint shimmer below the line, fading out toward the rim
      ctx.lineCap = 'round';
      const nl = detail ? 4 : 2;
      for (let k = 1; k <= nl; k++) {
        const y0 = Y + r * 0.86 * k / (nl + 0.6), half = Math.sqrt(Math.max(0, r * r - y0 * y0)) * 0.82;
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const x = -half + 2 * half * i / 16;
          ctx.lineTo(x, y0 + r * 0.007 * Math.sin(x / r * 14 + tt * 0.8 + k * 2));
        }
        ctx.strokeStyle = rgba(C.ink, 0.1 - 0.012 * k); ctx.lineWidth = Math.max(0.6, r * 0.004); ctx.stroke();
      }

      // the reader's colour: one reader after another, each crossfading into the next
      const P = 6.5, v = tt / P, ci = Math.floor(v), cu = ease(seg(v - ci, 0.7, 1));
      const reader = mix(READERS[ci % READERS.length], READERS[(ci + 1) % READERS.length], cu);
      const pulse = Math.pow(Math.sin(Math.PI * clamp((v - ci - 0.72) / 0.5)), 2);

      // inside the mirror: the reflection, leaning a little with the water, and the people behind the lines
      ctx.save();
      ctx.transform(1, 0, 0.035 * Math.sin(tt * 0.5), 1, -0.035 * Math.sin(tt * 0.5) * Y, 0);
      glow(ctx, 0, Y + h * 0.5, h * 0.42, reader, 0.16 + 0.12 * pulse);
      ctx.translate(0, 2 * Y); ctx.scale(1, -1);
      const he = h * 0.62, ex = r * 0.44;
      for (let e = 0; e < 2; e++) {
        // two of them, taking turns, each standing beside the reflection for a while
        const ph = tt / 9 + e * 0.5, n = Math.floor(ph), u = ph - n;
        const a = Math.sin(Math.PI * clamp(u * 1.15)) * 0.6;
        if (a < 0.02) continue;
        const col = ECHO[(n * 2 + e + Math.floor(seed * 6)) % ECHO.length], x = e ? ex : -ex;
        figure(ctx, x, Y, he, 0, rgba(col, a * 0.75), rgba(col, a), rgba(col, a * 0.85));
      }
      figure(ctx, 0, Y, h, walk, rgba(C.ink, 0.26), rgba(reader, 0.66 + 0.2 * pulse), rgba(C.ink, 0.2));
      ctx.restore();

      // the threads between reflections, dashed, drifting
      if (detail) {
        const yT = Y + h * 0.56;
        ctx.save();
        ctx.setLineDash([r * 0.035, r * 0.028]); ctx.lineDashOffset = -tt * r * 0.03;
        ctx.strokeStyle = rgba(C.violet, 0.5); ctx.lineWidth = Math.max(1, r * 0.009);
        for (let e = 0; e < 2; e++) {
          const ph = tt / 9 + e * 0.5, u = ph - Math.floor(ph), a = Math.sin(Math.PI * clamp(u * 1.15));
          if (a < 0.3) continue;
          const xb = e ? r * 0.44 : -r * 0.44;
          ctx.beginPath(); ctx.moveTo(0, yT); ctx.quadraticCurveTo(xb / 2, yT + r * 0.09, xb, yT * 0.86); ctx.stroke();
        }
        ctx.restore();
      }

      // the waterline: the mirror's edge, gently moving, fading to the rim
      const half = r * 0.96, wl = ctx.createLinearGradient(-half, 0, half, 0);
      wl.addColorStop(0, rgba(C.ink, 0)); wl.addColorStop(0.2, rgba(C.ink, 0.55)); wl.addColorStop(0.8, rgba(C.ink, 0.55)); wl.addColorStop(1, rgba(C.ink, 0));
      ctx.beginPath();
      for (let i = 0; i <= 28; i++) { const x = -half + 2 * half * i / 28; ctx.lineTo(x, Y + r * 0.008 * Math.sin(x / r * 9 + tt * 1.1) + r * 0.004 * Math.sin(x / r * 23 - tt * 0.7)); }
      ctx.strokeStyle = wl; ctx.lineWidth = Math.max(1, r * 0.01); ctx.stroke();

      // the figure, on the mirror
      figure(ctx, 0, Y, h, walk, rgba(C.ink, 0.88), rgba(own, 0.95), rgba(C.ink, 0.88));

      // the half turn: about the feet, the head carried round to its reflection
      if (detail) {
        const R = h * 0.865, side = seed > 0.5 ? -1 : 1, hp = (tt / 11) % 1;
        const vis = Math.sin(Math.PI * clamp(hp / 0.85)) * 0.32;
        if (vis > 0.01) {
          ctx.save();
          ctx.setLineDash([Math.max(1.5, r * 0.012), Math.max(3, r * 0.03)]);
          ctx.strokeStyle = rgba(C.violet, vis); ctx.lineWidth = Math.max(1, r * 0.007);
          ctx.beginPath(); ctx.arc(0, Y, R, -Math.PI / 2, Math.PI / 2, side < 0); ctx.stroke();
          ctx.restore();
          const ang = -Math.PI / 2 + side * Math.PI * ease(seg(hp, 0.12, 0.72));
          const px = R * Math.cos(ang), py = Y + R * Math.sin(ang), da = vis * 2.4;
          glow(ctx, px, py, r * 0.07, C.violet, 0.35 * da);
          ctx.fillStyle = rgba(mix(C.violet, C.ink, 0.35), da); ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, r * 0.018), 0, TAU); ctx.fill();
        }
      }
    }
  };
})());
