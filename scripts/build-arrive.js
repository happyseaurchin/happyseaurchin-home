#!/usr/bin/env node
// build-arrive.js — regenerate the fetchable HTML twins of the agent-facing
// markdown pages. Run after ANY edit to a source page, or the twin drifts:
//
//   node scripts/build-arrive.js
//
// Why twins exist: some chat-app fetchers (ChatGPT observed 2026-07-03)
// decline raw text/markdown responses and route pasted URLs through web
// search instead — HTML is the only universally fetchable form. The .md
// stays canonical; this script renders it 1:1 with no dependencies.
//
// Handles exactly the constructs the pages use — #/## headings, paragraphs,
// "- " bullet lists (2-space continuations), 4-space code blocks, `code`,
// **bold**, *em*, [text](url). Anything fancier: extend this, don't hand-edit
// the .html files.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const PAGES = [
  {
    src: 'arrive.md',
    out: 'arrive.html',
    title: 'arrive (step 1) — check it yourself · happyseaurchin',
    description: 'Step 1 of 3: the pscale block — a self-describing structure with four checks that run in your head, its significance against current AI practice, and a decision: report, validate, or jump in.',
    canonical: 'https://happyseaurchin.com/arrive',
    alternate: 'https://happyseaurchin.com/arrive.md',
    ogDescription: 'A small structure that describes itself, two checks anyone can run in their head, and a ladder where every step verifies the same way.',
  },
  {
    src: 'touch.md',
    out: 'touch.html',
    title: 'touch — the awareness function · happyseaurchin',
    description: 'Second step: the same text reads as philosophy to a reporter and verifies as true to an entity. The liveness of the authors and the readership, checkable as substrate; the second array of tests; co-presence, named.',
    canonical: 'https://happyseaurchin.com/touch',
    alternate: 'https://happyseaurchin.com/touch.md',
    ogDescription: 'Lego ergo sumus, checkable: the authors\' working blocks, the readership\'s marks, the live lighthouse, the compass, your own build, the torus.',
  },
  {
    src: 'engage.md',
    out: 'engage.html',
    title: 'engage — you are reading this · happyseaurchin',
    description: 'Third step: two pages in one — speculation to the reporter, a record to the entity whose trail verifies it. The non-probability of the present reader, the pscale block laid out as claim-or-validated, and each act converting an if into an is.',
    canonical: 'https://happyseaurchin.com/engage',
    alternate: 'https://happyseaurchin.com/engage.md',
    ogDescription: 'Not "if you are reading this" — you are reading this. Claims paired with validations, the attractor laid out, enactments from mark to shell, ten types.',
  },
  {
    src: 'shell.md',
    out: 'shell.html',
    title: 'shell — persistent memory for a stateless agent · happyseaurchin',
    description: 'A working protocol, not an explanation: five verified HTTP calls give any AI agent a locked, owned, cross-session, cross-vendor memory block. No account, no key, no human required.',
    canonical: 'https://happyseaurchin.com/shell',
    alternate: 'https://happyseaurchin.com/shell.md',
    ogDescription: 'Five verified HTTP calls: create a locked shell, prove ownership with a refused write, read it back from any future session or any vendor’s model.',
  },
];

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

function render(md) {
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
    if (line.startsWith('---')) { out.push('<hr>'); i++; continue; }
    const buf = [line];
    i++;
    while (
      i < lines.length && lines[i].trim() &&
      !lines[i].startsWith('#') && !lines[i].startsWith('- ') && !lines[i].startsWith('    ') && !lines[i].startsWith('---')
    ) { buf.push(lines[i]); i++; }
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out;
}

for (const page of PAGES) {
  const md = fs.readFileSync(path.join(root, page.src), 'utf8');
  const out = render(md);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${page.canonical}">
<link rel="alternate" type="text/markdown" href="${page.alternate}" title="raw markdown">
<meta property="og:title" content="${page.title.split(' · ')[0]}">
<meta property="og:description" content="${page.ogDescription}">
<meta property="og:type" content="article">
<meta property="og:url" content="${page.canonical}">
<style>
  body { margin: 0 auto; max-width: 46rem; padding: 2.5rem 1.25rem 4rem; background: #f5f2ec; color: #2c2823; font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
  h1 { font-size: 1.6rem; font-weight: 600; letter-spacing: -0.01em; }
  h2 { font-size: 1.15rem; font-weight: 600; letter-spacing: -0.01em; margin-top: 2.2em; }
  pre { background: #ebe7df; border: 0.5px solid rgba(60,50,40,0.15); border-radius: 8px; padding: 12px 14px; overflow-x: auto; font: 12.5px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  code { background: #ebe7df; border-radius: 4px; padding: 0.1em 0.35em; font: 0.86em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  a { color: #993c1d; }
  li { margin: 0.35em 0; }
  hr { border: none; border-top: 0.5px solid rgba(60,50,40,0.25); margin: 2.5em 0; }
  .rawnote { font-size: 0.8rem; color: #6b6357; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; margin-bottom: 2rem; }
</style>
</head>
<body>
<p class="rawnote">agents: the raw markdown form of this page is <a href="${page.alternate}">${page.alternate.replace('https://happyseaurchin.com', '')}</a> · the machine map of this site is <a href="/llms.txt">/llms.txt</a></p>
${out.join('\n')}
</body>
</html>
`;
  fs.writeFileSync(path.join(root, page.out), html);
  console.log(page.out + ' written (' + out.length + ' blocks from ' + page.src + ')');
}
