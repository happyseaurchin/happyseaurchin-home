// spark.js — the biome's read-walk in the browser.
//
// The conformal READ subset of spark (the same descend + voice, and the
// spindle / ring shapes spark.py and spark.ts derive). A page reads whole
// blocks through the door and walks them here — it does NOT re-implement the
// primitive inline; this IS the primitive, in the browser. Writes, fold, parse
// and the address arithmetic live in the full spark; a reader needs only these.
//
// Served by serve.py at /spark.js; imported as an ES module by the face.

export function descend(block, walk) {
  let n = block;
  for (const d of walk) { if (n && typeof n === "object" && d in n) n = n[d]; else return null; }
  return n;
}

export function voice(node) {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object") return typeof node["0"] === "string" ? node["0"] : voice(node["0"]);
  return String(node);
}

export function spindle(block, walk) {            // broad → specific down the walk (the telescope)
  const out = [];
  for (let i = 1; i <= walk.length; i++) {
    const v = voice(descend(block, walk.slice(0, i)));
    if (v) out.push(v);
  }
  return out;
}

export function ring(block, walk) {               // the digit children at the terminus
  const node = descend(block, walk), out = [];
  if (node && typeof node === "object")
    for (const d of "123456789") if (d in node) { const v = voice(node[d]); if (v) out.push(v); }
  return out;
}
