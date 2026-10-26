#!/usr/bin/env node
// build-doc-copies.js — render the site's public read-only copies of David's Claude Docs, kept at /read with
// the other pieces to read and linked from the animations they go with. A Claude Doc opens only to people
// signed in to Claude whom it is shared with, so the site carries a copy anyone can read:
//
//   node scripts/build-doc-copies.js
//
// Each .md is its doc's own Markdown export, unedited. To refresh one, export the doc's tab again (Docs
// connector: create a blob {from: the tab's file, format: markdown}, then read that asset to disk), replace
// the .md, set its copied date below, and rerun. The doc is canonical; never hand-edit an .html.
//
// The export leaves a placeholder line where the doc embeds a chart or a diagram. A diagram whose embed is a
// static SVG (the embed node's code returns one) is kept beside the .md as read/<slug>.<name>.svg, rendered once
// from that code, and inlined here by its caption, coloured by the page's own palette through the doc's
// --cds-* names. Any other embed gets a line saying what the doc draws there.
//
// Handles exactly the constructs the exports use: #/##/### headings, the byline (an author before its date or not), paragraphs, "- " and "1. "
// lists, "- [ ]" tasks, pipe tables, **bold**, *em*, [text](url) and [text](<url>), backslash and &#91;
// escapes, and the embed placeholders.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const DOCS = [
  {
    slug: 'the-package-and-the-machine',
    title: 'The Package and the Machine',
    doc: 'https://claude.ai/artifact/VQGG6rLZX7Vrn9FJu5oLAL',
    copied: '14 October 2026',
    living: 'The living doc, where it is revised and commented on, opens to anyone signed in to Claude',
    description: 'Every technology that outgrew the people who already trusted each other got, or waited for, an economic package, and the AI era does not have one yet: eleven packages from the ledger to the pitch, and a proposal for the gap.',
    embed: (caption) => '<p class="note">The doc draws the waits as a chart here (' + inline(caption) + '). The same waits are drawn in ' +
      '<a href="/animations/front-wheel-drive">Front-wheel drive</a> and tested across thirty-one technologies in ' +
      '<a href="/animations/tech-finance-evolution">Tech-finance evolution</a>.</p>',
    home: '<a href="/read">Everything to read</a> · <a href="/animations/front-wheel-drive">Front-wheel drive, the pitch</a> · ' +
      '<a href="/animations/tech-finance-evolution">Tech-finance evolution, the evidence</a>',
    // Front-wheel drive's palette and type, the pitch this doc argues
    fonts: 'family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400',
    light: '--page:#F3EEE3;--ink:#1B2521;--ink-soft:#56615C;--rule:#D9D0BE;--link:#7A5A1E;--accent:#9A7432;--card:#FBF8F1;' +
      '--display:"Bodoni Moda","Didot",Georgia,serif;--body:"Newsreader","Iowan Old Style",Georgia,serif;--size:19px',
    dark: '--page:#090E0D;--ink:#E9E2D2;--ink-soft:#A49D8A;--rule:#26302D;--link:#E2C27E;--accent:#D2AE66;--card:#0E1513',
  },
  {
    slug: 'ai-in-the-room',
    title: 'AI in the Room',
    doc: 'https://claude.ai/artifact/JeX4iUC98ePnqpKYLP8FfK',
    copied: '15 October 2026',
    living: 'The living doc, where it is revised, is kept in Claude for those it is shared with',
    description: 'A few labs hold the core of AI and everyone else works downstream. The alternative gives each person a persistent AI shell on a shared surface, where people leave traces instead of sending messages, and AI reflects the group back to itself: MAGI rather than Machus.',
    figures: {
      'four loci of agency · two held by the labs, two by people': 'loci',
      'direct messages beside stigmergy · the same four people': 'stigmergy',
    },
    home: '<a href="/read">Everything to read</a> · <a href="/animations/reflexive-cba">Reflexive CBA, the room’s app</a> · ' +
      '<a href="/read/the-two-turns">The Two Turns</a>',
    // The Two Turns' palette and type, the family Reflexive CBA links it from
    fonts: 'family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..600',
    light: '--page:#F3F6F5;--ink:#16212B;--ink-soft:#4E5B66;--rule:#B4C0C5;--link:#176A5C;--accent:#C27D0E;--card:#E7EDEB;' +
      '--display:"Newsreader",Georgia,serif;--body:"Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif;--size:18px;' +
      '--cds-text-primary:var(--ink);--cds-text-secondary:var(--ink-soft);--cds-chart-axis:#7F8D95;--cds-chart-grid:var(--rule);' +
      '--cds-chart-categorical-1:#1E7D6C;--cds-chart-reference-tint:var(--card)',
    dark: '--page:#0D1316;--ink:#E3EAEC;--ink-soft:#9EAEB6;--rule:#36464E;--link:#6FD3BC;--accent:#E6A63C;--card:#16201F;' +
      '--cds-chart-axis:#6B7C85;--cds-chart-categorical-1:#4FC3A9',
  },
  {
    slug: 'the-bond-table',
    title: 'The bond table, and two spines for one niche',
    doc: 'https://claude.ai/artifact/CsKKvPufjbsvs17H2WsYaD',
    copied: '26 October 2026',
    living: 'The living doc, where it is revised, is kept in Claude for those it is shared with',
    description: 'How blocks attach, in six bonds and two ways of gathering that are not bonds, each named by what joins it, what breaks it and whose write can; why a reader\u2019s zero can never re-address a block; and how two minds or two people with different spines for one niche can bond instead of merging or splitting.',
    embed: (caption) => '<p class="note">The doc draws today\u2019s fit here (' + inline(caption) + '). The same fit is sewn, a stitch at a time, on ' +
      '<a href="/two-spines">Two spines, one niche</a>.</p>',
    home: '<a href="/read">Everything to read</a> \u00b7 <a href="/two-spines">Two spines, one niche, the proposal</a> \u00b7 ' +
      '<a href="/time-nesting">Time Nesting, where it grew</a>',
    // Two spines, one niche's boro: indigo cloth, beni red and kihada gold
    fonts: 'family=IBM+Plex+Mono:wght@400;500&family=Shippori+Mincho+B1:wght@700;800&family=Zen+Kaku+Gothic+New:wght@400;700',
    light: '--page:#EEF2F8;--ink:#0F1A33;--ink-soft:#4A5877;--rule:#C4CFE2;--link:#B3322B;--accent:#8C6A0E;--card:#F8FAFD;' +
      '--display:"Shippori Mincho B1",Georgia,serif;--body:"Zen Kaku Gothic New",system-ui,-apple-system,"Segoe UI",sans-serif;--size:18px',
    dark: '--page:#070C1C;--ink:#E8EDF8;--ink-soft:#9EADD0;--rule:#1E2B55;--link:#F0716A;--accent:#E9C46A;--card:#0C1430',
  },
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MONTHS = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
  Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };

// Escaped characters and link targets are stashed behind NUL-framed indices
// (a NUL never occurs in the export) so the bold and em rules cannot reach them.
function inline(s) {
  const stash = [];
  const keep = (html) => { stash.push(html); return '\u0000' + (stash.length - 1) + '\u0000'; };
  s = s.replace(/&#91;/g, '[').replace(/&#93;/g, ']');
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|<>])/g, (_, c) => keep(esc(c)));
  s = s.replace(/\[([^\]]+)\]\((?:<([^>]+)>|([^)\s]+))\)/g, (_, text, angled, plain) => {
    const href = angled || plain;
    if (!/^(https?:\/\/|\/|#)/.test(href)) return text;
    return keep('<a href="' + esc(href) + '">') + text + keep('</a>');
  });
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function embed(d, caption) {
  const fig = d.figures && d.figures[caption];
  if (fig) {
    const svg = fs.readFileSync(path.join(root, 'read', d.slug + '.' + fig + '.svg'), 'utf8').trim();
    return '<figure class="fig"><div class="figbox">' + svg + '</div><figcaption>' + inline(caption) + '</figcaption></figure>';
  }
  return d.embed ? d.embed(caption) : '<p class="note">The doc draws a diagram here (' + inline(caption) + ').</p>';
}

function render(md, d) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  const run = (test) => { const buf = []; while (i < lines.length && test(lines[i])) buf.push(lines[i++]); return buf; };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if (line.startsWith('# ')) { out.push('<h1>' + inline(line.slice(2)) + '</h1>'); i++; continue; }
    if (line.startsWith('## ')) { out.push('<h2 id="' + slug(line.slice(3)) + '">' + inline(line.slice(3)) + '</h2>'); i++; continue; }
    if (line.startsWith('### ')) { out.push('<h3 id="' + slug(line.slice(4)) + '">' + inline(line.slice(4)) + '</h3>'); i++; continue; }
    if ((m = line.match(/^(?:(.+?) · )?([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) · @(.+)$/))) {
      out.push('<p class="byline">' + (m[1] ? esc(m[1]) + ' · ' : '') + m[3] + ' ' + MONTHS[m[2]] + ' ' + m[4] + ' · ' + esc(m[5]) + '</p>');
      out.push('<p class="copynote">A copy of the doc as it stood on ' + d.copied + ', to read without signing in. ' +
        d.living + ': <a href="' + d.doc + '">claude.ai</a>.</p>');
      i++; continue;
    }
    if ((m = line.match(/^&#91;embedded content: (.*)\\\]$/))) { out.push(embed(d, m[1])); i++; continue; }
    if (line.startsWith('|')) {
      const rows = run((l) => l.startsWith('|')).map(cells);
      const head = rows[0], body = rows.slice(2), wide = head.length >= 4;
      // a wide table scrolls sideways on a phone; a narrower one stacks each row under its column's labels
      const label = (j) => wide ? '' : ' data-label="' + inline(head[j] || '').replace(/<[^>]+>/g, '') + '"';
      out.push('<div class="tablebox' + (wide ? '' : ' stack') + '"><table' + (wide ? ' class="wide"' : '') + '>\n<thead><tr>' +
        head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead>\n<tbody>\n' +
        body.map((r) => '<tr>' + r.map((c, j) => '<td' + label(j) + '>' + inline(c) + '</td>').join('') + '</tr>').join('\n') +
        '\n</tbody></table></div>');
      continue;
    }
    if (line.startsWith('- [ ] ')) {
      const items = run((l) => l.startsWith('- [ ] ')).map((l) => l.slice(6));
      out.push('<ul class="tasks">\n' + items.map((t) => '<li><span class="box" aria-hidden="true"></span>' + inline(t) + '</li>').join('\n') + '\n</ul>');
      continue;
    }
    if (line.startsWith('- ')) {
      const items = run((l) => l.startsWith('- ')).map((l) => l.slice(2));
      out.push('<ul>\n' + items.map((t) => '<li>' + inline(t) + '</li>').join('\n') + '\n</ul>');
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items = run((l) => /^\d+\. /.test(l)).map((l) => l.replace(/^\d+\. /, ''));
      out.push('<ol>\n' + items.map((t) => '<li>' + inline(t) + '</li>').join('\n') + '\n</ol>');
      continue;
    }
    const buf = [lines[i++]].concat(run((l) => l.trim() && !/^(#|- |\||\d+\. |&#91;embedded content: )/.test(l)));
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out;
}

const page = (d, out) => {
  const URL = 'https://happyseaurchin.com/read/' + d.slug;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.description)}">
<meta property="og:title" content="${esc(d.title)}">
<meta property="og:description" content="${esc(d.description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${URL}">
<link rel="canonical" href="${URL}">
<link rel="alternate" type="text/markdown" href="${URL}.md" title="raw markdown">
<link rel="icon" href="/assets/torus.png" type="image/png">
<script>if(window.self!==window.top)document.documentElement.classList.add('framed');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${d.fonts}&display=swap">
<style>
:root{color-scheme:light;${d.light}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;${d.dark}}}
:root[data-theme="dark"]{color-scheme:dark;${d.dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:var(--size)/1.62 var(--body);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.wrap{max-width:760px;margin:0 auto;padding:40px 16px 8px}
h1,h2,h3{font-family:var(--display);font-weight:500;letter-spacing:-.005em}
h1{font-size:clamp(38px,7vw,60px);line-height:1.04;margin:0 0 .35em}
h2{font-size:clamp(26px,4vw,34px);line-height:1.12;margin:1.9em 0 .5em}
h3{font-size:23px;line-height:1.2;margin:1.6em 0 .45em}
p{margin:0 0 1em}
a{color:var(--link);text-underline-offset:2px}
strong{font-weight:600}
ul,ol{padding-left:1.2em;margin:0 0 1.1em}
li{margin:.45em 0;line-height:1.55}
.byline{font:500 12px/1.5 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 1.1em}
.copynote{font-size:16px;line-height:1.5;color:var(--ink-soft);padding:10px 14px;border:1px solid var(--rule);border-radius:8px;background:var(--card);margin:0 0 1.6em}
.note{font-size:17px;font-style:italic;color:var(--ink-soft);border-left:2px solid var(--accent);padding:.2em 0 .2em 1em;margin:1.2em 0 1.4em}
.fig{margin:1.4em 0 1.2em}
.figbox{overflow-x:auto}
.figbox svg{display:block;width:100%;height:auto;min-width:600px}
.fig figcaption{font:500 11px/1.5 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);margin-top:.6em}
.tablebox{overflow-x:auto;margin:.4em 0 1.4em}
table{border-collapse:collapse;width:100%;font-size:16px;line-height:1.45}
table.wide{min-width:620px}
th,td{text-align:left;vertical-align:top;padding:9px 12px 9px 0;border-bottom:1px solid var(--rule)}
th{font:500 11px/1.4 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft)}
@media (max-width:560px){
.stack table,.stack tbody,.stack tr,.stack td{display:block}
.stack thead{display:none}
.stack tr{padding:12px 0;border-bottom:1px solid var(--rule)}
.stack td{padding:0;border:0}
.stack td:first-child{font-weight:600}
.stack td+td::before{content:attr(data-label);display:block;margin-top:8px;font:500 10.5px/1.4 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft)}
}
.tasks{list-style:none;padding-left:0}
.tasks li{position:relative;padding-left:1.7em}
.tasks .box{position:absolute;left:0;top:.3em;width:1em;height:1em;border:1.5px solid var(--ink-soft);border-radius:3px}
.home{max-width:760px;margin:48px auto;padding:14px 16px 0;border-top:1px solid var(--rule);font:500 11.5px/1.4 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft)}
.home a{color:var(--link)}
.framed .home{display:none}
</style>
</head>
<body>
<main class="wrap">
${out.join('\n')}
</main>
<p class="home">${d.home}</p>
</body>
</html>
`;
};

for (const d of DOCS) {
  const src = 'read/' + d.slug + '.md', dest = 'read/' + d.slug + '.html';
  const out = render(fs.readFileSync(path.join(root, src), 'utf8'), d);
  fs.writeFileSync(path.join(root, dest), page(d, out));
  console.log(dest + ' written (' + out.length + ' blocks from ' + src + ')');
}
