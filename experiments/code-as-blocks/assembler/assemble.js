// assemble.js — the one piece of code left: it walks a spine against a form and dresses it in a look.
// It knows a closed vocabulary of components and nothing about any family; the form says which
// component each position of the spine becomes, and the look gives named tokens and nothing else.
const D = '123456789';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const line = n => typeof n === 'string' ? n : (n && typeof n === 'object' && '_' in n ? line(n._) : '');   // follows the underscore chain, as the walker does
const comp = f => line(f).split(/\s/)[0];
const at = (b, path) => path.reduce((n, d) => (n && typeof n === 'object' ? n[d] : undefined), b);
const titled = t => { const i = t.indexOf(' — '); return i > 0 ? [t.slice(0, i), t.slice(i + 3)] : [t, '']; };
const casing = (title, text) => {
  // a title set in capitals is written as its words stand mid-sentence in the text beneath it:
  // an acronym stays capitals (LERO), a name keeps its capital (Sundial), every other word goes lower
  const mid = text.replace(/(^|[.!?]\s+)\S+/g, '$1');            // drop each sentence's first word: its capital says nothing
  const t = title.replace(/[A-Za-z][A-Za-z0-9']*/g, w => {
    const re = new RegExp('(?<![A-Za-z])' + w + '(?![a-z])', 'gi'), seen = mid.match(re) || [];
    const n = { upper: 0, name: 0, lower: 0 };                    // a word takes the form it has most often mid-sentence
    for (const x of seen) n[x.length > 1 && x === x.toUpperCase() ? 'upper' : x[0] === x[0].toUpperCase() ? 'name' : 'lower']++;
    const top = n.upper > Math.max(n.name, n.lower) ? 'upper' : n.name > n.lower ? 'name' : 'lower';
    return top === 'upper' ? w.toUpperCase() : top === 'name' ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase();
  });
  return t.replace(/^./, c => c.toUpperCase());
};
const cap = t => t.replace(/^./, c => c.toUpperCase());
const addr = p => p.length ? p[0] + (p.length > 1 ? '.' + p.slice(1).join('') : '') : '0';

// ── the look: named tokens merged over the standard, validated, contrast held at AA ──
const FONTS = new Set(['Syne', 'Newsreader', 'Space Mono', 'Cormorant Garamond', 'Inter', 'Lora', 'Source Serif 4']);
const HEX = /^#[0-9a-f]{6}$/i;
function tokens(block) {
  const t = {};
  (function walk(n, path) {
    for (const d of D) if (n && typeof n === 'object' && d in n) {
      const v = n[d];
      if (typeof v === 'string') { const [k, ...r] = v.split(' '); t[path.concat(k).join('.')] = r.join(' '); }
      else walk(v, path.concat(line(v).split(' ').pop() || d));
    }
  })(block, []);
  return t;
}
function lum(hex) { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function contrast(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
function resolve(look, standard) {
  const s = tokens(standard), l = look ? tokens(look) : {}, out = {}, notes = [];
  for (const k of Object.keys(l)) if (!(k in s) && /^palette\.(light|dark)\./.test(k)) { if (HEX.test(l[k])) out[k] = l[k]; else notes.push(`${k}: '${l[k]}' is not a colour — left out`); }
  for (const k of Object.keys(s)) {
    let v = l[k] ?? s[k];
    const colour = /^palette\./.test(k);
    if (colour && !HEX.test(v)) { notes.push(`${k}: '${v}' is not a colour — standard kept`); v = s[k]; }
    if (/letters\./.test(k) && !FONTS.has(v)) { notes.push(`${k}: '${v}' is not on the allowlist — standard kept`); v = s[k]; }
    out[k] = v;
  }
  for (const mode of ['light', 'dark']) {
    const p = k => out[Object.keys(out).find(x => x.includes(mode) && x.endsWith('.' + k))];
    const g = p('ground'), ink = p('ink'), acc = out[Object.keys(out).find(x => x.includes('accent') && x.endsWith('.' + mode))];
    if (contrast(ink, g) < 4.5) { const k = Object.keys(out).find(x => x.includes(mode) && x.endsWith('.ink')); out[k] = s[k]; notes.push(`${mode}: ink on ground below AA — standard ink used`); }
    if (contrast(acc, g) < 3) notes.push(`${mode}: accent on ground below 3:1 — check it`);
  }
  return { t: out, notes };
}
function css({ t }) {
  const v = (mode, k) => t[Object.keys(t).find(x => x.includes(mode) && x.endsWith('.' + k))];
  const a = mode => t[Object.keys(t).find(x => x.includes('accent') && x.endsWith('.' + mode))];
  const f = k => t[Object.keys(t).find(x => x.endsWith('.' + k))];
  const pal = m => Object.keys(t).filter(k => k.startsWith('palette.' + m + '.')).map(k => `--${k.split('.').pop()}:${t[k]};`).join('') + `--accent:${a(m)};`;
  return `:root{${pal('light')}--display:'${f('display')}',system-ui,sans-serif;--body:'${f('body')}',Georgia,serif;--radius:${f('radius')}px;--measure:${f('measure')}rem}
@media (prefers-color-scheme:dark){:root{${pal('dark')}}}
*{box-sizing:border-box}body{margin:0;background:var(--ground);color:var(--ink);font:18px/1.6 var(--body)}
main{max-width:var(--measure);margin:0 auto;padding:2.5rem 1rem 4rem}
h1,h2{font-family:var(--display);line-height:1.15;font-weight:600}h1{font-size:2.1rem;margin:0 0 .6rem}
h2{font-size:1.35rem;margin:0 0 .4rem;color:var(--accent)}.lead{color:var(--muted);margin:.2rem 0 1rem}
section{border-top:1px solid var(--line);padding:1.6rem 0 1rem}
details{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);margin:.45rem 0;padding:.5rem .9rem}
summary{cursor:pointer;font-family:var(--display);font-size:.95rem}details div{margin:.4rem 0 .2rem;font-size:.95rem}
.decision{border:1.5px solid var(--accent);border-radius:var(--radius);padding:.9rem 1rem;margin:1rem 0 .4rem}
.decision b{font-family:var(--display);color:var(--accent);font-size:.8rem;letter-spacing:.08em}
.answer{display:flex;gap:.6rem;margin:.5rem 0 0;font-size:.92rem}.mark{font-family:var(--display);font-size:.72rem;padding:.1rem .45rem;border-radius:99px;background:var(--accent);color:var(--ground);white-space:nowrap;height:fit-content}
.who{color:var(--muted)}.state{font-size:.75rem;border:1px solid var(--accent);border-radius:99px;padding:.05rem .5rem;margin-left:.5rem}
.summary{margin:1.5rem 0}.row{display:grid;grid-template-columns:7.5rem 1fr auto;gap:.8rem;padding:.55rem 0;border-bottom:1px solid var(--line);color:inherit;text-decoration:none;align-items:center}.row code{color:var(--accent);font-size:.8rem}
footer{color:var(--muted);font-size:.8rem;border-top:1px solid var(--line);margin-top:2rem;padding-top:1rem}`;
}

// ── the walk: each spine position drawn as the component its form names ──
function render(node, form, path, ctx) {
  let inside = '', after = '';
  for (const d of D) {
    if (!node || typeof node !== 'object' || !(d in node)) continue;
    const f = form && typeof form === 'object' ? form[d] : undefined;
    if (f === undefined) continue;                                  // the form names nothing here: nothing drawn
    const next = comp(f) === 'next';
    const [i, a] = render(node[d], next ? form : f, path.concat(d), ctx);
    if (next) after += i + a; else inside += i + a;
  }
  const [title, rest] = titled(line(node));
  const id = 'a' + path.join('');
  switch (comp(form)) {
    case 'page': {
      const tools = form && typeof form._ === 'object' ? D.split('').filter(d => d in form._).map(d => instrument(comp(form._[d]), ctx)) : [];
      return [`<header><h1>${esc(title)}</h1><p class="lead">${esc(cap(rest.split(/(?<=\.)\s/)[0]))}</p></header>${tools.join('')}${inside}`, after];
    }
    case 'section': return [`<section id="${id}"><h2>${esc(casing(title, ctx.corpus))}</h2>${rest ? `<p class="lead">${esc(cap(rest))}</p>` : ''}${inside}</section>`, after];
    case 'room': return [`<details><summary>${esc(casing(title, ctx.corpus))}</summary><div>${esc(cap(rest))}${inside}</div></details>`, after];
    case 'decision': {
      const q = cap(line(node).replace(/^DECIDE — /, ''));
      const answers = Object.entries(ctx.mirrors).map(([h, m]) => [h, line(at(m, path))]).filter(([, x]) => x);
      return [`<div class="decision"><b>DECIDE · ${addr(path)}</b><p>${esc(q)}</p>${answers.map(([h, x]) => { const [w, why] = titled(x); return `<div class="answer"><span class="mark">${esc(w)}</span><span>${esc(why)} <span class="who">— ${esc(h)}</span></span></div>`; }).join('')}</div>`, after];
    }
    case 'state': return [`<span class="state">${esc(line(node))}</span>`, after];
    case 'footer': return [`<footer>${esc(line(node))}</footer>`, after];
    default: return ['', after];                                    // 'hidden', or a word the vocabulary does not have
  }
}

// an instrument reads the whole family at once; 'summary' lists every decision down the spine with its answers counted
function instrument(name, ctx) {
  if (name !== 'summary') return '';
  const rows = [];
  (function walk(n, f, path) {
    for (const d of D) if (n && typeof n === 'object' && d in n && f && typeof f === 'object' && d in f) {
      const c = comp(f[d]), p = path.concat(d);
      if (c === 'decision') {
        const step = line(n), counts = {};
        for (const m of Object.values(ctx.mirrors)) { const a = line(at(m, p)); if (a) { const w = titled(a)[0]; counts[w] = (counts[w] || 0) + 1; } }
        rows.push(`<a class="row" href="#a${path.join('')}"><code>${addr(p)}</code><span>${esc(casing(titled(step)[0], ctx.corpus))}</span><span class="marks">${Object.entries(counts).map(([w, k]) => `<span class="mark">${esc(w)} ${k}</span>`).join(' ') || '<span class="who">no answers yet</span>'}</span></a>`);
      }
      walk(n[d], c === 'next' ? f : f[d], p);
    }
  })(ctx.spine, ctx.form, []);
  rows.sort((a, b) => a.length && (a.match(/<code>([^<]*)/)[1].length - b.match(/<code>([^<]*)/)[1].length));
  return `<nav class="summary"><h2>Where it stands</h2>${rows.join('')}</nav>`;
}

function assemble({ spine, form, look, standard, mirrors, law }) {
  const resolved = resolve(look, standard);
  const words = []; (function w(n) { if (typeof n === 'string') words.push(titled(n)[1] || n); else if (n && typeof n === 'object') Object.values(n).forEach(w); })(spine);
  const corpus = words.join('. ');   // the family's running text (never its capital titles), to read each word's casing from
  const [body, after] = render(spine, form, [], { mirrors: mirrors || {}, spine, form, corpus });
  const room = (JSON.stringify(law || '').match(/pool:([a-z0-9-]+)/) || [])[1];
  const fonts = [...new Set(Object.entries(resolved.t).filter(([k]) => /letters\./.test(k)).map(([, v]) => v))].map(f => 'family=' + f.replace(/ /g, '+') + ':wght@400;600').join('&');
  return { notes: resolved.notes, html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titled(line(spine))[0])}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap"><style>${css(resolved)}</style></head><body><main>${body}${after}${room ? `<footer>Talk about it in its room: <a href="https://mirror.onen.ai/?pool=${esc(room)}">pool:${esc(room)}</a></footer>` : ''}</main></body></html>` };
}

if (typeof module !== 'undefined') module.exports = { assemble };
if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('fs'), r = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  const [spine, form, look, out] = process.argv.slice(2);
  const res = assemble({ spine: r(spine), form: r(form), look: r(look), standard: r('look-standard.json'), mirrors: r('mirrors.json').mirrors, law: r('law.json') });
  fs.writeFileSync(out, res.html);
  console.log(out, res.html.length, 'chars', res.notes.length ? '· notes: ' + res.notes.join('; ') : '· look valid, contrast holds');
}
