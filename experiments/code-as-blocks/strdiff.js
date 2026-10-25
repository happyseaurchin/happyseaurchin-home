// for each pair of scripts: did the change touch only string literals (words living in code), or the code itself?
const acorn = require('acorn');
const fs = require('fs');
function toks(src) {
  for (const sourceType of ['script', 'module']) {
    try {
      const out = [];
      for (const t of acorn.tokenizer(src, { ecmaVersion: 'latest', sourceType, allowHashBang: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true })) {
        const label = t.type.label;
        const isStr = label === 'string' || label === 'template';
        out.push([label, isStr ? '\u0000' : String(t.value ?? ''), isStr ? String(t.value) : null]);
      }
      return out;
    } catch (e) { /* try the other source type */ }
  }
  return null;
}
const pairs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const res = pairs.map(([a, b]) => {
  const ta = toks(a), tb = toks(b);
  if (!ta || !tb) return { kind: 'unparsed' };
  const sa = ta.map(t => t[0] + ' ' + t[1]).join('\n'), sb = tb.map(t => t[0] + ' ' + t[1]).join('\n');
  if (sa !== sb) return { kind: 'code' };
  const changed = ta.filter((t, i) => t[2] !== tb[i][2]).length;
  return { kind: changed ? 'strings' : 'comments-or-spacing', changed };
});
fs.writeFileSync(process.argv[3], JSON.stringify(res));
