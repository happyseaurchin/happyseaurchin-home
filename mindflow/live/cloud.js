// mindflow/live/cloud.js — the image cloud: what a talk says, as live pictures that grow while it is said.
//
// Mindflow's rules place everything, as in mindflow/basic: a word or an idea grows with how often it is said
// and fades with how long ago; what is said together is drawn together, and linked. An idea in the catalogue
// that has a motif (motifs/, small live drawings lifted from the films in /animations) is drawn as that motif
// instead of its word; everything else stays a word. The Mac's Haiku composes pictures nobody drew: two or
// three motifs, one inside another, linked, or turning one into the next, under a label (CLOUD.compose).
//
//   CLOUD.start({ canvas, catalogue, stop })   begin drawing on the canvas
//   CLOUD.hear(text)                           a phrase just said
//   CLOUD.idea(msg)                            the Mac's chooser named an idea ({films, why}): Haiku's catch counts
//   CLOUD.compose(msg)                         Haiku's picture ({motifs, relation, label})
//   CLOUD.visible(on)                          fade the cloud out under a film, and back

(function () {
  const WORDS_MAX = 18, MOTIFS_MAX = 7, PICTURES_MAX = 2;
  const LIFE = { word: [30, 90], motif: [80, 220], picture: [60, 170] };   // s since last said: whole until the first, gone by the second
  const SCORE_FADE_S = 12, SCORE_AT = 0.6;     // an idea is called up once its mentions, fading, weigh this much (the chooser's own rule)
  const PHRASES_KEPT = 16;                     // the phrases whose togetherness links what they named

  let cv, ctx, W = 0, H = 0, dpr = 1;
  let concepts = [], STOP = new Set();
  const nodes = new Map();                     // key → node: 'w:<word>', 'm:<idea>', 'x:<motif>', 'p:<motifs>:<relation>'
  const phrases = [];                          // the keys each recent phrase touched, for co-occurrence
  let links = new Map();                       // 'a|b' → how often said together
  let last = null, view = 1, viewTo = 1, lastPicture = null;
  let colour = 0, frames = 0, slow = 0, fps = 60, dprCap = 2;

  const norm = s => s.toLowerCase().replace(/→/g, ' to ').replace(/[^a-z0-9]+/g, ' ').trim();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const now = () => Date.now();
  const has = name => !!(window.MOTIFS && MOTIFS[name]);
  const rgba = (c, a) => window.MOTIF ? MOTIF.rgba(c, a) : 'rgba(220,220,230,' + a + ')';
  const pal = () => window.MOTIF ? MOTIF.C : {};
  const WORD_COLOURS = ['ink', 'sand', 'sea', 'steel', 'rose', 'lime', 'coral', 'violet', 'blue'];

  // ── the catalogue: ideas, their words, their motifs ──────

  function learn(cat) {
    concepts = (cat.concepts || []).map((c, i) => ({
      i,
      head: (c.label || (c.idea || '').split(':')[0] || '').trim(),
      films: c.films || [],
      motifs: c.motifs || [],
      score: 0, at: 0,
      words: Object.entries(c.words || {}).map(([w, weight]) => ({
        w, weight, parts: norm(w).split(' '),
        re: new RegExp('(^| )' + norm(w).split(' ').join(' ?') + '(s|es)?(?= |$)', 'g'),
      })),
    }));
    const wanted = new Set(Object.keys(cat.motifs || {}));
    concepts.forEach(c => c.motifs.forEach(m => wanted.add(m)));
    if (window.MOTIF) MOTIF.load([...wanted]);
  }

  // ── what was said ─────────────────────────────────────────

  function hear(text) {
    if (!text || !text.trim()) return;
    const t = now(), n = norm(text);
    const touched = [], covered = new Set();
    for (const c of concepts) {
      let got = 0, best = null;
      for (const w of c.words) {
        const k = (n.match(w.re) || []).length;
        if (k) { got += k * w.weight; if (!best || w.weight > best.weight) best = w; }
      }
      if (!got) continue;
      c.score = c.score * Math.exp(-(t - c.at) / 1000 / SCORE_FADE_S) + got;
      c.at = t;
      if (c.score < SCORE_AT) continue;
      const node = touchIdea(c, best.w, got);
      if (node) {
        touched.push(node.key);
        c.words.forEach(w => { if (n.match(w.re)) w.parts.forEach(p => covered.add(p)); });
      }
    }
    const toks = text.toLowerCase().replace(/[^\w\s'-]/g, '').split(/\s+/)
      .map(w => w.replace(/^'+|'+$/g, ''))
      .filter(w => w.length > 1 && !STOP.has(w) && !covered.has(w) && !covered.has(w.replace(/(es|s)$/, '')));
    for (const tok of toks) touched.push(touchWord(tok).key);
    remember(touched);
  }

  function touchWord(tok) {
    const key = 'w:' + tok;
    let node = nodes.get(key);
    if (node) { node.freq++; node.last = now(); node.pulse = 1.25; node.dying = false; }
    else node = add({ key, kind: 'word', label: tok, colour: WORD_COLOURS[colour++ % WORD_COLOURS.length] });
    return node;
  }

  function touchIdea(c, said, got) {
    const key = 'm:' + c.i;
    let node = nodes.get(key);
    if (node && node.motif) { node.freq += Math.min(1, got); node.last = now(); node.pulse = 1.12; node.dying = false; node.label = said || node.label; return node; }
    const showing = new Set([...nodes.values()].filter(x => x.motif && !x.dying).map(x => x.motif));
    const loaded = c.motifs.filter(has);
    const motif = loaded.find(m => !showing.has(m)) || loaded[0];
    if (!motif) return null;                       // no motif yet: its words stay words
    return add({ key, kind: 'motif', motif, label: said || c.head, idea: c.i, freq: Math.min(1, got) });
  }

  function idea(m) {
    if (!m || m.why === 'words' || m.why === 'manual' || m.why === 'release') return;   // the words already counted
    const f = (m.films || [])[0] || m.film;
    const c = f && concepts.find(c => c.films.includes(f));
    if (!c) return;
    const node = touchIdea(c, nodes.has('m:' + c.i) ? null : c.head.toLowerCase(), 1);
    if (node) remember([node.key]);
  }

  function compose(m) {
    if (!m || !Array.isArray(m.motifs)) return;
    const parts = m.motifs.filter(has).slice(0, 3);
    if (!parts.length) return;
    const label = (m.label || '').trim();
    lastPicture = { at: now(), label, parts, relation: m.relation };
    if (parts.length === 1) {                      // one motif: the idea it belongs to, said in other words
      const there = [...nodes.values()].find(x => x.motif === parts[0] && !x.dying);
      if (there) { there.freq++; there.last = now(); there.pulse = 1.12; remember([there.key]); return; }
      remember([add({ key: 'x:' + parts[0], kind: 'motif', motif: parts[0], label: label.toLowerCase() || parts[0] }).key]);
      return;
    }
    const relation = ['inside', 'linked', 'turning'].includes(m.relation) ? m.relation : 'linked';
    const key = 'p:' + parts.join('+') + ':' + relation;
    let node = nodes.get(key);
    if (node) { node.freq++; node.last = now(); node.pulse = 1.08; node.dying = false; if (label) node.label = label; }
    else node = add({ key, kind: 'picture', parts, relation, label, os: parts.map((p, i) => ({ seed: Math.random(), state: {} })) });
    const kin = [...nodes.values()].filter(x => x.motif && parts.includes(x.motif)).map(x => x.key);
    remember([node.key, ...kin]);
  }

  function add(n) {
    const t = now();
    const anchor = n.kind !== 'picture' && last && nodes.has(last) ? nodes.get(last) : { x: W / 2, y: H * 0.42 };   // a picture comes in at the centre
    const spread = n.kind === 'word' ? 1 : n.kind === 'motif' ? 0.6 : 0.15;
    const node = Object.assign({
      freq: 1, last: t, born: t, pulse: 1, op: 0, dying: false,
      x: clamp(anchor.x + (Math.random() - 0.5) * W * 0.32 * spread, W * 0.08, W * 0.92),
      y: clamp(anchor.y + (Math.random() - 0.5) * H * 0.2 * spread, H * 0.1, H * 0.74),
      vx: 0, vy: 0, tx: 0, ty: 0, s: 0, o: { seed: Math.random(), state: {} },
    }, n);
    node.tx = node.x; node.ty = node.y;
    node.s = node.kind === 'word' ? 13 : H * 0.03;
    nodes.set(node.key, node);
    cap();
    return node;
  }

  function remember(keys) {
    keys = [...new Set(keys)];
    if (!keys.length) return;
    last = keys.find(k => k[0] !== 'w') || keys[0];
    phrases.push(keys);
    while (phrases.length > PHRASES_KEPT) phrases.shift();
    retarget();
  }

  function cap() {
    const live = kind => [...nodes.values()].filter(n => n.kind === kind && !n.dying).sort((a, b) => a.last - b.last);
    [['word', WORDS_MAX], ['motif', MOTIFS_MAX], ['picture', PICTURES_MAX]].forEach(([kind, max]) => {
      const l = live(kind);
      l.slice(0, Math.max(0, l.length - max)).forEach(n => { n.dying = true; });
    });
  }

  // ── placing: Mindflow's rules ─────────────────────────────

  function weight(n, t) {
    const age = (t - n.last) / 1000;
    return n.freq * Math.pow(n.kind === 'word' ? 0.95 : 0.97, age);
  }

  function retarget() {
    links = new Map();
    for (const keys of phrases) {
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        if (!nodes.has(keys[i]) || !nodes.has(keys[j])) continue;
        const k = keys[i] < keys[j] ? keys[i] + '|' + keys[j] : keys[j] + '|' + keys[i];
        links.set(k, (links.get(k) || 0) + 1);
      }
    }
    const cx = W / 2, cy = H * 0.43;
    const pull = new Map();
    for (const [k, c] of links) {
      const [a, b] = k.split('|');
      const A = nodes.get(a), B = nodes.get(b);
      (pull.get(a) || pull.set(a, []).get(a)).push([B, c]);
      (pull.get(b) || pull.set(b, []).get(b)).push([A, c]);
    }
    for (const n of nodes.values()) {
      const p = pull.get(n.key);
      if (p) {
        let x = 0, y = 0, k = 0;
        p.forEach(([o, c]) => { x += o.x * c; y += o.y * c; k += c; });
        n.tx = (x / k) * 0.5 + cx * 0.5; n.ty = (y / k) * 0.45 + cy * 0.55;   // a wide screen: the pull to the middle is gentler sideways
      } else {
        n.tx = n.x * 0.85 + cx * 0.15; n.ty = n.y * 0.75 + cy * 0.25;
      }
    }
  }

  function radius(n) {
    if (n.kind === 'word') return Math.max(n.s * 0.75, n.label.length * n.s * 0.31) + 6;
    return n.s * (n.kind === 'picture' ? 1.12 : 1.04) + 14;
  }

  function below(n) {                          // how far it reaches beneath its centre, its label included
    return n.kind === 'word' ? n.s * 0.7 : n.kind === 'motif' ? n.s + 30 : n.s * 1.08 + 44;
  }

  function step(dt) {
    const t = now(), k = Math.min(3, dt / 16.7);
    const top = H * 0.04, bottom = H * 0.83, left = W * 0.03, right = W * 0.97;
    const arr = [...nodes.values()];
    for (const n of arr) {
      const age = (t - n.last) / 1000, w = weight(n, t);
      const [a, b] = LIFE[n.kind];
      const op = n.dying ? 0 : age < a ? 1 : age < b ? 1 - (age - a) / (b - a) : 0;
      n.op += (op - n.op) * (n.dying ? 0.03 : 0.025) * k;
      if (op === 0 && n.op < 0.01) { nodes.delete(n.key); continue; }
      const s = n.kind === 'word' ? clamp(13 + w * 6, 13, 40)
              : n.kind === 'motif' ? clamp(H * (0.07 + 0.03 * w), H * 0.075, H * 0.18)
              : clamp(H * (0.14 + 0.02 * w), H * 0.15, H * 0.21);
      n.s += (s - n.s) * 0.04 * k;
      if (n.pulse > 1) { n.pulse += (1 - n.pulse) * 0.06 * k; if (n.pulse < 1.005) n.pulse = 1; }
      const spring = (n.kind === 'word' ? 0.0012 : 0.0016) * (0.7 + Math.min(1.5, w * 0.3));
      n.vx += (n.tx - n.x) * spring * k; n.vy += (n.ty - n.y) * spring * k;
      const damp = Math.pow(0.86, k);
      n.vx *= damp; n.vy *= damp;
      n.x += n.vx * k; n.y += n.vy * k;
      const r = radius(n);
      if (n.x < left + r) n.x += (left + r - n.x) * 0.05 * k;
      if (n.x > right - r) n.x += (right - r - n.x) * 0.05 * k;
      const up = n.kind === 'word' ? n.s * 0.7 : n.s * 1.08, down = below(n);
      if (n.y < top + up) n.y += (top + up - n.y) * 0.05 * k;
      if (n.y > bottom - down) n.y += (bottom - down - n.y) * 0.05 * k;
    }
    const live = [...nodes.values()].filter(n => n.op > 0.05);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01, min = radius(a) + radius(b);
      if (d >= min) continue;
      dx /= d; dy /= d;
      const push = (min - d) * (a.kind === 'word' && b.kind === 'word' ? 0.05 : 0.03) * k;
      const wa = a.kind === 'word' ? 1 : 0.35, wb = b.kind === 'word' ? 1 : 0.35;   // the pictures hold their place; words make way
      a.vx -= dx * push * wa; a.vy -= dy * push * wa;
      b.vx += dx * push * wb; b.vy += dy * push * wb;
    }
    view += (viewTo - view) * 0.03 * k;
  }

  // ── drawing ───────────────────────────────────────────────

  function drawMotif(name, x, y, r, o, t, alpha) {
    if (!has(name) || alpha < 0.005) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = clamp(alpha, 0, 1);
    try { MOTIFS[name].draw(ctx, t, r, o); } catch (e) { if (!drawMotif.told) { drawMotif.told = 1; console.warn(name, e); } }
    ctx.restore();
  }

  function label(text, x, y, size, c, a, italic) {
    if (!text || a < 0.01) return;
    ctx.font = (italic ? 'italic ' : '') + '300 ' + size + "px -apple-system, 'Helvetica Neue', 'Segoe UI', Roboto, sans-serif";
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(10,10,15,' + (0.85 * a) + ')';       // a dark halo: a word drifting under it never hides it
    ctx.strokeText(text, x, y);
    ctx.fillStyle = rgba(c, a);
    ctx.fillText(text, x, y);
  }

  function drawPicture(n, t, a) {
    const R = n.s * n.pulse, C = pal(), parts = n.parts.filter(has);
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.strokeStyle = rgba(C.sand, 0.09);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.08, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    if (n.relation === 'inside') {
      drawMotif(parts[0], n.x, n.y, R, n.os[0], t, a);
      for (let i = 1; i < parts.length; i++) {
        const r = R * (i === 1 ? 0.5 : 0.24);
        ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);              // a soft dark well for the inner one to read in
        const g = ctx.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, r * 1.25);
        g.addColorStop(0, 'rgba(10,10,15,0.72)'); g.addColorStop(1, 'rgba(10,10,15,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r * 1.25, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        drawMotif(parts[i], n.x, n.y, r, n.os[i], t, a);
      }
    } else if (n.relation === 'turning') {
      const per = 8, cyc = per * parts.length, ph = ((t + n.o.seed * cyc) % cyc) / per;
      const i = Math.floor(ph), f = ph - i, j = (i + 1) % parts.length;
      const turn = f < 0.62 ? 0 : (f - 0.62) / 0.38, e = turn * turn * (3 - 2 * turn);
      drawMotif(parts[i], n.x, n.y, R * (1 - 0.12 * e), n.os[i], t, a * (1 - e));
      if (e > 0) drawMotif(parts[j], n.x, n.y, R * (0.88 + 0.12 * e), n.os[j], t, a * e);
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);                 // the turn, as a slow arc on the frame
      const th = t * 0.4 + n.o.seed * 6;
      ctx.strokeStyle = rgba(C.sand, 0.35); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, R * 1.08, th, th + 0.9); ctx.stroke();
      ctx.restore();
    } else {
      const k = parts.length, rr = k === 2 ? 0.5 : 0.55, pr = k === 2 ? R * 0.52 : R * 0.44;
      const at = parts.map((p, i) => {
        const th = k === 2 ? (i ? 0 : Math.PI) : -Math.PI / 2 + i * 2 * Math.PI / 3;
        return [n.x + Math.cos(th) * R * rr, n.y + Math.sin(th) * R * rr];
      });
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
      for (let i = 0; i < k - (k === 2 ? 1 : 0); i++) {
        const [x1, y1] = at[i], [x2, y2] = at[(i + 1) % k];
        thread(x1, y1, x2, y2, 0.38, t, i);
      }
      ctx.restore();
      parts.forEach((p, i) => drawMotif(p, at[i][0], at[i][1], pr, n.os[i], t, a));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    label(n.label, n.x, n.y + R * 1.08 + 10, clamp(Math.round(H * 0.019), 14, 22), C.sand, 0.8 * a, true);
  }

  function thread(x1, y1, x2, y2, a, t, i) {     // a link: a slow cord, a knot travelling along it
    const C = pal(), mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
    const bend = 0.08 * Math.sin(t * 0.3 + i);
    const qx = mx - dy * bend, qy = my + dx * bend;
    ctx.strokeStyle = rgba(C.sand, a * 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(qx, qy, x2, y2); ctx.stroke();
    const u = ((t * 0.07 + i * 0.37) % 1), v = 1 - u;
    const kx = v * v * x1 + 2 * u * v * qx + u * u * x2, ky = v * v * y1 + 2 * u * v * qy + u * u * y2;
    ctx.fillStyle = rgba(C.sand, a * 1.4);
    ctx.beginPath(); ctx.arc(kx, ky, 2, 0, Math.PI * 2); ctx.fill();
  }

  function render() {
    const t = performance.now() / 1000, C = pal();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (view < 0.01) return;
    for (const [k, c] of links) {
      const [a, b] = k.split('|').map(x => nodes.get(x));
      if (!a || !b || (a.kind === 'word' && b.kind === 'word')) continue;
      const al = Math.min(0.32, 0.08 + 0.06 * c) * Math.min(a.op, b.op) * view;
      if (al < 0.01) continue;
      if (a.kind !== 'word' && b.kind !== 'word') thread(a.x, a.y, b.x, b.y, al, t, k.length);
      else {
        ctx.strokeStyle = rgba(C.steel, al * 0.6); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of nodes.values()) {
      if (n.kind !== 'word' || n.op < 0.01) continue;
      ctx.font = Math.round(n.s * n.pulse) + "px 'SF Mono', 'Fira Code', Consolas, monospace";
      ctx.fillStyle = rgba(C[n.colour] || C.ink, 0.82 * n.op * view);
      ctx.fillText(n.label, n.x, n.y);
    }
    for (const n of nodes.values()) {
      if (n.kind !== 'motif' || n.op < 0.01) continue;
      const r = n.s * n.pulse;
      if (has(n.motif)) {
        drawMotif(n.motif, n.x, n.y, r, n.o, t, n.op * view);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        label(n.label, n.x, n.y + r + 8, clamp(Math.round(H * 0.016), 12, 18), C.ink, 0.55 * n.op * view);
      } else {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        label(n.label, n.x, n.y, 22, C.ink, 0.8 * n.op * view);
      }
    }
    for (const n of nodes.values()) if (n.kind === 'picture' && n.op >= 0.01) drawPicture(n, t, n.op * view);
  }

  // ── the loop ──────────────────────────────────────────────

  function fit() {
    dpr = Math.min(dprCap, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }

  let prev = 0, skip = false;
  function loop(ts) {
    const dt = prev ? Math.min(100, ts - prev) : 16.7;
    prev = ts;
    step(dt);
    if (!skip || (frames & 1) === 0) {
      const t0 = performance.now();
      render();
      slow = slow * 0.95 + (performance.now() - t0) * 0.05;
      skip = slow > 14 ? true : slow < 8 ? false : skip;   // a slow computer draws every other frame
      if (slow > 22 && dpr > 1 && frames > 120) { dprCap = 1; fit(); slow = 10; }   // and a very slow one draws fewer pixels
    }
    frames++;
    fps = fps * 0.95 + (1000 / dt) * 0.05;
    requestAnimationFrame(loop);
  }

  window.CLOUD = {
    start(o) {
      cv = o.canvas; ctx = cv.getContext('2d');
      STOP = o.stop || new Set();
      learn(o.catalogue || {});
      fit();
      addEventListener('resize', () => { fit(); retarget(); });
      setInterval(retarget, 1500);
      requestAnimationFrame(loop);
    },
    hear, idea, compose,
    visible(on) { viewTo = on ? 1 : 0; },
    debug() {
      const all = [...nodes.values()].filter(n => !n.dying), count = k => all.filter(n => n.kind === k).length;
      const p = lastPicture;
      return `cloud: ${count('motif')} motifs, ${count('word')} words, ${count('picture')} pictures · ${Math.round(fps)} fps, ${slow.toFixed(1)} ms a frame${skip ? ' (every other frame)' : ''}` +
        (p ? `\nlast picture ${Math.round((now() - p.at) / 1000)}s ago: "${p.label}" (${p.parts.join(' ' + (p.relation || 'linked') + ' ')})` : '') +
        `\nmotifs loaded: ${Object.keys(window.MOTIFS || {}).length}`;
    },
  };
})();
