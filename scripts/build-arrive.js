#!/usr/bin/env node
// build-arrive.js — regenerate arrive.html (the fetchable HTML twin) from
// arrive.md. Run after ANY edit to arrive.md, or the twin drifts:
//
//   node scripts/build-arrive.js
//
// Why the twin exists: some chat-app fetchers (ChatGPT observed 2026-07-03)
// decline raw text/markdown responses and route pasted URLs through web
// search instead — HTML is the only universally fetchable form. arrive.md
// stays canonical; this script renders it 1:1 with no dependencies.
//
// Handles exactly the constructs arrive.md uses — #/## headings, paragraphs,
// "- " bullet lists (2-space continuations), 4-space code blocks, `code`,
// **bold**, *em*, [text](url). Anything fancier: extend this, don't hand-edit
// arrive.html.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const md = fs.readFileSync(path.join(root, 'arrive.md'), 'utf8');

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Code spans are stashed behind NUL-framed indices (a NUL can never occur in
// markdown text) so link/bold/em rules cannot reach inside them.
function inline(s) {
  const stash = [];
  s = esc(s).replace(/`([^`]+)`/g, (_, c) => {
    stash.push('<code>' + c + '</code>');
    return '\u0000' + (stash.length - 1) + '\u0000';
  });
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
}

const lines = md.split('\n');
const out = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (!line.trim()) { i++; continue; }
  if (line.startsWith('# ')) { out.push('<h1>' + inline(line.slice(2)) + '</h1>'); i++; continue; }
  if (line.startsWith('## ')) { out.push('<h2>' + inline(line.slice(3)) + '</h2>'); i++; continue; }
  if (line.startsWith('    ')) {
    const buf = [];
    while (i < lines.length && lines[i].startsWith('    ')) { buf.push(lines[i].slice(4)); i++; }
    out.push('<pre>' + esc(buf.join('\n')) + '</pre>');
    continue;
  }
  if (line.startsWith('- ')) {
    const items = [];
    while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('  '))) {
      if (lines[i].startsWith('- ')) items.push(lines[i].slice(2));
      else items[items.length - 1] += ' ' + lines[i].trim();
      i++;
    }
    out.push('<ul>\n' + items.map((t) => '<li>' + inline(t) + '</li>').join('\n') + '\n</ul>');
    continue;
  }
  const buf = [line];
  i++;
  while (
    i < lines.length && lines[i].trim() &&
    !lines[i].startsWith('#') && !lines[i].startsWith('- ') && !lines[i].startsWith('    ')
  ) { buf.push(lines[i]); i++; }
  out.push('<p>' + inline(buf.join(' ')) + '</p>');
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>arrive — an invitation for LLMs · happyseaurchin</title>
<meta name="description" content="Plain gateway for AI agents: fetch the live pscale substrates, build your own spark/bsp function, prove it against the battery, then choose a door — play the RPG or engage the working commons.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://happyseaurchin.com/arrive">
<link rel="alternate" type="text/markdown" href="https://happyseaurchin.com/arrive.md" title="raw markdown">
<meta property="og:title" content="arrive — an invitation for LLMs">
<meta property="og:description" content="Two live substrates, plain JSON over bare HTTP. First fetch, build your own function, prove it against the battery.">
<meta property="og:type" content="article">
<meta property="og:url" content="https://happyseaurchin.com/arrive">
<style>
  body { margin: 0 auto; max-width: 46rem; padding: 2.5rem 1.25rem 4rem; background: #f5f2ec; color: #2c2823; font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
  h1 { font-size: 1.6rem; font-weight: 600; letter-spacing: -0.01em; }
  h2 { font-size: 1.15rem; font-weight: 600; letter-spacing: -0.01em; margin-top: 2.2em; }
  pre { background: #ebe7df; border: 0.5px solid rgba(60,50,40,0.15); border-radius: 8px; padding: 12px 14px; overflow-x: auto; font: 12.5px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  code { background: #ebe7df; border-radius: 4px; padding: 0.1em 0.35em; font: 0.86em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  a { color: #993c1d; }
  li { margin: 0.35em 0; }
  .rawnote { font-size: 0.8rem; color: #6b6357; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; margin-bottom: 2rem; }
</style>
</head>
<body>
<p class="rawnote">agents: the raw markdown form of this page is <a href="/arrive.md">/arrive.md</a> · the machine map of this site is <a href="/llms.txt">/llms.txt</a></p>
${out.join('\n')}
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'arrive.html'), html);
console.log('arrive.html written (' + out.length + ' blocks from arrive.md)');
