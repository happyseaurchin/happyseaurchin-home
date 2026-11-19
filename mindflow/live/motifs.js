/* The motif library: small live drawings lifted from the films in /animations, for the image cloud (mindflow/live).
   Each motif is its own file in motifs/, and registers itself:

     MOTIF('torus', { title: 'The torus', about: 'one line: what it shows', draw(ctx, t, r, o) { … } });

   draw(ctx, t, r, o) — the origin is the motif's centre; draw inside the circle of radius r (r runs from about 30 to 320 px);
   t is seconds and only grows (animate from it, slowly: a loop of 6 to 20 s); o.seed (0 to 1) makes one instance differ
   from another; o.state is an object of this instance's own, kept between frames (for a flock's birds, say).
   The caller saves and restores the context around each draw, and fades a motif through ctx.globalAlpha:
   never set globalAlpha, use the alphas of rgba() instead. Draw on a transparent ground (the cloud is dark).

   MOTIF.load(names) adds motifs/<name>.js for each name, beside this file, and resolves when they have run. */
(function () {
  const C = {
    ink: [226, 237, 235], sand: [240, 208, 122], amber: [198, 154, 69], sea: [74, 163, 138], steel: [106, 137, 163],
    blue: [78, 131, 166], violet: [145, 115, 178], rose: [231, 154, 180], coral: [227, 160, 126], lime: [175, 199, 122],
    deep: [18, 40, 47],
  };
  // ?light (or ?theme=light): the same drawings in darker inks on a pale ground, for a screen that washes out dark
  const light = /[?&](light|theme=light)(&|=|$)/.test(location.search);
  if (light) Object.assign(C, {
    ink: [30, 42, 48], sand: [158, 112, 28], amber: [140, 96, 26], sea: [26, 118, 96], steel: [62, 92, 120],
    blue: [34, 86, 136], violet: [106, 72, 146], rose: [176, 66, 104], coral: [182, 88, 54], lime: [84, 122, 34],
    deep: [228, 232, 226],
  });
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a > 1 ? 1 : a) + ')'; }
  function rand(seed) {                       // a small seeded generator: rand(seed)() → 0..1
    let s = Math.floor((seed || 0) * 4294967296) >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const MOTIFS = window.MOTIFS = window.MOTIFS || {};
  function MOTIF(name, m) { m.name = name; MOTIFS[name] = m; }
  MOTIF.C = C; MOTIF.rgba = rgba; MOTIF.rand = rand; MOTIF.light = light;
  MOTIF.names = ['torus', 'nested', 'spindle', 'sundial', 'clocks', 'murmuration', 'bricks', 'buckets', 'kernels',
                 'shell', 'mirror', 'quipu', 'wave', 'basin', 'rain'];   // the library, in the order the gallery shows it
  MOTIF.load = function (names) {
    return Promise.all((names || MOTIF.names).map(function (n) {
      return new Promise(function (done) {
        const s = document.createElement('script');
        s.src = new URL('motifs/' + n + '.js', here).href;
        s.onload = s.onerror = function () { done(); };
        document.head.appendChild(s);
      });
    }));
  };
  window.MOTIF = MOTIF;
})();
