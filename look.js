/* look.js — a maker's look, worn by any page that draws a family from its blocks.
 *
 * A look is a maker's design at the render layer (function:look): look:<handle> on the beach, written by its maker
 * alone. Its tokens stand at 1 to 3 — the palette light and dark, the letters, the measure — and its grammar at 4 to 6,
 * which is for a mind that renders the family in that look (function:look 3) and is never read here. A family's law
 * names its look at 6, 'look: <handle>', or gives the standard an accent, 'look: accent #rrggbb'. This puts the tokens on
 * the page's root over the standard every page here keeps (theme.css), as function:look 2 says: every token falls back;
 * ink and muted are kept only where they read on their ground at AA, and an accent — the look's, or the law's — that does
 * not read on the ground it will stand on is moved until it does (readable, below); a face off the allowlist keeps the
 * standard, one on it is loaded; an unreadable look changes nothing. A line is read in either hand, 'ground: #eee7d5' or
 * 'ground #eee7d5', 'measure: 46rem' or 'text measure 30rem'. Every property is cleared before it is set again, so
 * nothing good in light lingers in dark, and all of it is set again when ◐ switches the theme. Reads only.
 *
 * window.beachLook = { wear({ look, accent, map }), of(block) } — wear once the family's law is read. Without a map the
 * tokens go to theme.css's names (THEME, below), and a page that wants the measure (the longest line of running text),
 * the corner (its cards' radius), the scale (the body's size) and the headings' weight uses --measure, --radius,
 * --body-size and --display-weight in its own CSS, each falling back to its standard, as proposal.html does. A page that
 * keeps its own vocabulary passes a map naming its own properties, and the same checks run over them.
 */
(function () {
  'use strict';
  var BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';

  function voiceOf(n) { while (n && typeof n === 'object') { if (!('_' in n)) return ''; n = n._; } return typeof n === 'string' ? n.trim() : ''; }
  function textOf(n) { return typeof n === 'string' ? n.trim() : voiceOf(n); }
  function readBlock(name) {
    return fetch(BEACH + '?block=' + encodeURIComponent(name), { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('the beach answered ' + r.status);
      return r.json();
    });
  }

  var LOOK_FACES = { 'Syne': '', 'Newsreader': '', 'Space Mono': '', 'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500', 'JetBrains Mono': 'JetBrains+Mono:wght@400;700', 'Georgia': '', 'system-ui': '' };
  var LOOK_KEYS = ['ground', 'ink', 'muted', 'panel', 'line', 'light', 'dark', 'display', 'body', 'mono', 'scale', 'weights', 'step', 'radius', 'rule', 'measure'];
  /* where each token goes: theme.css's names unless the page passes its own map, each key naming the properties it sets
     (the plain schematic page: ground ['--paper', '--sheet'], ink ['--ink'], muted ['--ink-2'], line ['--rule'], accent
     ['--proc'], …). The first property of ground and of ink is what the accent is checked on when a look sets neither;
     lawAccent is where the law's 'look: accent #rrggbb' goes, accent where it has no place of its own */
  var THEME = {
    ground: ['--abyss', '--deep', '--ground-top'], ink: ['--foam', '--vapour'], inkRgb: ['--vapour-rgb'], muted: ['--vapour-dim'],
    panel: ['--card', '--card-hi'], panelRgb: ['--card-rgb'], line: ['--line', '--line-strong'],
    accent: ['--acc', '--liquid'], accentRgb: ['--liquid-rgb'], lawAccent: ['--acc'],
    display: ['--display'], body: ['--body'], mono: ['--mono'], weight: ['--display-weight'], size: ['--body-size'], measure: ['--measure'], radius: ['--radius']
  };
  function lookKV(node) {
    var out = {}; if (!node || typeof node !== 'object') return out;
    for (var d = 1; d <= 9; d++) {
      var m = /^\s*([a-z][a-z ]*?)\s*(?::\s*|\s+(?=[#\d]))(.+?)\s*$/i.exec(textOf(node[String(d)]) || ''); if (!m) continue;
      var words = m[1].toLowerCase().split(/\s+/), key = words.filter(function (w) { return LOOK_KEYS.indexOf(w) >= 0; })[0] || words.join(' ');
      if (!(key in out)) out[key] = m[2];
    }
    return out;
  }
  function hexIn(v) { var m = /#[0-9a-f]{6}\b/i.exec(v || ''); return m ? m[0] : ''; }
  function sizeIn(v, lo, hi) { var m = /(\d*\.?\d+)(rem|px)\b/.exec(v || ''); if (!m) return ''; var n = +m[1] / (m[2] === 'px' ? 16 : 1); return n >= lo && n <= hi ? m[1] + m[2] : ''; }
  function faceIn(v) { var f = String(v || '').split(',')[0].replace(/['"]/g, '').trim(); return LOOK_FACES.hasOwnProperty(f) ? f : ''; }
  function lum(h) { var r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255; function f(c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); } return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function rgbOf(h) { return parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16); }
  /* a look block read into its tokens: the accent stands as a node (light, dark) or as one line naming both —
     'accent: crimson, #c21d4e in light, #ef5d85 in dark' — and a line of two colours gives light then dark */
  function lookOf(b) {
    if (!b || typeof b !== 'object') return null;
    var pal = b['1'] || {}, a = pal['3'], at = typeof a === 'string' ? a : '', acc = lookKV(a), hx = at.match(/#[0-9a-f]{6}\b/ig) || [];
    var letters = lookKV(b['2']), measure = lookKV(b['3']), w = /weight\s+(\d00)\b/i.exec(letters.display || '') || /^\s*(\d00)\b/.exec(letters.weights || '');
    return {
      sets: { light: lookKV(pal['1']), dark: lookKV(pal['2']) },
      acc: { light: hexIn(acc.light) || hexIn((/(#[0-9a-f]{6})\s+in\s+light/i.exec(at) || [])[1]) || hx[0] || '', dark: hexIn(acc.dark) || hexIn((/(#[0-9a-f]{6})\s+in\s+dark/i.exec(at) || [])[1]) || hx[1] || hx[0] || '' },
      faces: { display: faceIn(letters.display), body: faceIn(letters.body), mono: faceIn(letters.mono) },
      weight: w ? w[1] : '', size: sizeIn(letters.scale, 0.85, 1.5), measure: sizeIn(measure.measure, 20, 80), radius: sizeIn(measure.radius, 0, 1.5)
    };
  }
  function dress(L, look) {
    var root = document.documentElement, st = root.style, scheme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', M = L.map || THEME;
    function put(k, v) { (M[k] || []).forEach(function (p) { st.setProperty(p, v); }); }
    Object.keys(M).forEach(function (k) { M[k].forEach(function (p) { st.removeProperty(p); }); });
    var t = look ? look.sets[scheme] : {}, ground = hexIn(t.ground), ink = hexIn(t.ink);
    if (!(ground && ink && contrast(ink, ground) >= 4.5)) ground = ink = '';
    if (ground) {
      put('ground', ground); put('ink', ink); put('inkRgb', rgbOf(ink));
      if (hexIn(t.muted) && contrast(hexIn(t.muted), ground) >= 4.5) put('muted', hexIn(t.muted));
      if (hexIn(t.panel)) { put('panel', hexIn(t.panel)); put('panelRgb', rgbOf(hexIn(t.panel))); }
      if (hexIn(t.line)) put('line', hexIn(t.line));
    }
    if (look) {
      ['display', 'body', 'mono'].forEach(function (k) { var f = look.faces[k]; if (f) put(k, "'" + f + "'," + (k === 'mono' ? 'ui-monospace,monospace' : k === 'body' ? 'Georgia,serif' : 'system-ui,sans-serif')); });
      if (look.weight) put('weight', look.weight);
      if (look.size) put('size', look.size);
      if (look.measure) put('measure', look.measure);
      if (look.radius) put('radius', look.radius);
    }
    var cs = getComputedStyle(root), first = function (k) { return hexIn(cs.getPropertyValue((M[k] || [])[0] || '')); };
    var base = ground || first('ground'), fg = ink || first('ink');
    var own = look && look.acc[scheme] && readable(look.acc[scheme], base, fg), law = L.accent && readable(L.accent, base, fg);
    if (own) { put('accent', own); put('accentRgb', rgbOf(own)); }
    else if (law) put(M.lawAccent ? 'lawAccent' : 'accent', law);
  }
  /* an accent that does not read on its ground at AA is moved toward that ground's ink a tenth at a time, its hue kept, so
     one colour named for both themes ('look: accent #c21d4e') stays the maker's in each; one that never reads keeps the standard */
  function readable(c, ground, ink) { if (!ground || !ink) return ''; for (var i = 0; i < 12 && contrast(c, ground) < 4.5; i++) c = mix(c, ink, 0.1); return contrast(c, ground) >= 4.5 ? c : ''; }
  function mix(a, b, t) { var o = '#'; for (var i = 1; i < 7; i += 2) { var x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16); o += ('0' + Math.round(x + (y - x) * t).toString(16)).slice(-2); } return o; }
  function wear(L) {
    var look = null, again = function () { dress(L, look); };
    again();
    new MutationObserver(again).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (L.look) readBlock('look:' + L.look).then(function (b) {
      look = lookOf(b); if (!look) return;
      var want = ['display', 'body', 'mono'].map(function (k) { return LOOK_FACES[look.faces[k]]; }).filter(function (f, i, all) { return f && all.indexOf(f) === i; });
      if (want.length) { var ln = document.createElement('link'); ln.rel = 'stylesheet'; ln.href = 'https://fonts.googleapis.com/css2?family=' + want.join('&family=') + '&display=swap'; document.head.appendChild(ln); }
      document.documentElement.setAttribute('data-look', L.look);
      again();
    }, function () {});
  }

  window.beachLook = { wear: wear, of: lookOf };
})();
