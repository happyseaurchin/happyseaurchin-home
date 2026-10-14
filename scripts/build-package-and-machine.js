#!/usr/bin/env node
// build-package-and-machine.js — render the public read-only copy of David's
// doc "The Package and the Machine" beside its pitch (Front-wheel drive) and
// its evidence (Tech-finance evolution). The doc itself is a Claude Doc that
// opens only to people signed in to Claude, so the site carries a copy:
//
//   node scripts/build-package-and-machine.js
//
// The .md is the doc's own Markdown export, unedited. To refresh it, export
// the doc's tab again (Docs connector: create a blob {from: the tab's file,
// format: markdown}, then read that asset to disk), replace the .md, set
// COPIED below, and rerun. The doc is canonical; never hand-edit the .html.
//
// Handles exactly the constructs the export uses: #/##/### headings, the
// byline, paragraphs, "- " and "1. " lists, "- [ ]" tasks, pipe tables,
// **bold**, *em*, [text](url) and [text](<url>), backslash and &#91; escapes,
// and the export's placeholder for the doc's chart, which a copy cannot carry.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SRC = 'animations/the-package-and-the-machine.md';
const OUT = 'animations/the-package-and-the-machine.html';
const URL = 'https://happyseaurchin.com/animations/the-package-and-the-machine';
const DOC = 'https://claude.ai/artifact/VQGG6rLZX7Vrn9FJu5oLAL';
const COPIED = '14 October 2026';
const DESCRIPTION = 'Every technology that outgrew the people who already trusted each other got, or waited for, an economic package, and the AI era does not have one yet: eleven packages from the ledger to the pitch, and a proposal for the gap.';

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

function render(md) {
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
    if ((m = line.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) · @(.+)$/))) {
      out.push('<p class="byline">' + m[2] + ' ' + MONTHS[m[1]] + ' ' + m[3] + ' · ' + esc(m[4]) + '</p>');
      out.push('<p class="copynote">A copy of the doc as it stood on ' + COPIED + ', to read without signing in. ' +
        'The living doc, where it is revised and commented on, opens to anyone signed in to Claude: ' +
        '<a href="' + DOC + '">claude.ai</a>.</p>');
      i++; continue;
    }
    if ((m = line.match(/^&#91;embedded content: (.*)\\\]$/))) {
      out.push('<p class="note">The doc draws the waits as a chart here (' + inline(m[1]) + '). The same waits are drawn in ' +
        '<a href="/animations/front-wheel-drive">Front-wheel drive</a> and tested across thirty-one technologies in ' +
        '<a href="/animations/tech-finance-evolution">Tech-finance evolution</a>.</p>');
      i++; continue;
    }
    if (line.startsWith('|')) {
      const rows = run((l) => l.startsWith('|')).map(cells);
      const head = rows[0], body = rows.slice(2);
      out.push('<div class="tablebox"><table' + (head.length >= 4 ? ' class="wide"' : '') + '>\n<thead><tr>' +
        head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead>\n<tbody>\n' +
        body.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('\n') +
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
    const buf = [lines[i++]].concat(run((l) => l.trim() && !/^(#|- |\||\d+\. )/.test(l)));
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out;
}

const md = fs.readFileSync(path.join(root, SRC), 'utf8');
const out = render(md);
const DARK = '--page:#090E0D;--ink:#E9E2D2;--ink-soft:#A49D8A;--rule:#26302D;--link:#E2C27E;--accent:#D2AE66;--card:#0E1513';
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Package and the Machine</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<meta property="og:title" content="The Package and the Machine">
<meta property="og:description" content="${esc(DESCRIPTION)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${URL}">
<link rel="canonical" href="${URL}">
<link rel="alternate" type="text/markdown" href="${URL}.md" title="raw markdown">
<link rel="icon" href="/assets/torus.png" type="image/png">
<script>if(window.self!==window.top)document.documentElement.classList.add('framed');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap">
<style>
:root{color-scheme:light;--page:#F3EEE3;--ink:#1B2521;--ink-soft:#56615C;--rule:#D9D0BE;--link:#7A5A1E;--accent:#9A7432;--card:#FBF8F1}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;${DARK}}}
:root[data-theme="dark"]{color-scheme:dark;${DARK}}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:19px/1.62 "Newsreader","Iowan Old Style",Georgia,serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.wrap{max-width:760px;margin:0 auto;padding:40px 16px 8px}
h1,h2,h3{font-family:"Bodoni Moda","Didot",Georgia,serif;font-weight:500;letter-spacing:-.005em}
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
.tablebox{overflow-x:auto;margin:.4em 0 1.4em}
table{border-collapse:collapse;width:100%;font-size:16px;line-height:1.45}
table.wide{min-width:620px}
th,td{text-align:left;vertical-align:top;padding:9px 12px 9px 0;border-bottom:1px solid var(--rule)}
th{font:500 11px/1.4 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft)}
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
<p class="home"><a href="/animations">All the animations</a></p>
</body>
</html>
`;
fs.writeFileSync(path.join(root, OUT), html);
console.log(OUT + ' written (' + out.length + ' blocks from ' + SRC + ')');
