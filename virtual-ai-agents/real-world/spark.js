// spark.js — the coded kernel for pscale blocks, in the browser.
//
// A faithful JS port of pscale-biome's reference spark.py (genome v5): a block is
// JSON whose keys are single digits "0"-"9". Digit "0" is a node's voicing (its
// semantic, a fact for its parent); "1"-"9" are its elaboration. The zero-spine
// (the chain of "0"s from the root) sets the floor: floor is the depth at which it
// first reaches a string, and pscale = floor - depth.
//
// spark(block, number, attention, content?) is one call over two coordinates.
// With content omitted it reads; with content it writes the same shape. The shape
// (point, ring, directory, disc, spindle, whole) is derived from (number, attention),
// never chosen. Conforms to spark-battery (see spark.battery.mjs).

export const DIGITS = "123456789";

export class AddressError extends Error {}

const isObj = n => n !== null && typeof n === "object" && !Array.isArray(n);

// --- core walk --------------------------------------------------------------

export function descend(block, digits) {            // walk the digits from the root; node, or null off-tree
  let node = block;
  for (const d of digits) {
    if (isObj(node) && d in node) node = node[d];
    else return null;
  }
  return node;
}

export function voice(node) {                        // descend "0" to the first string, or null if headless
  while (isObj(node)) {
    if (!("0" in node)) return null;
    node = node["0"];
  }
  return typeof node === "string" ? node : null;
}

export function floor(block) {                       // floor depth: "0"-steps from the root to the first string
  let n = 0, node = block;
  while (isObj(node)) {
    if (!("0" in node)) return n;
    node = node["0"];
    n += 1;
  }
  return n;
}

export function status(node) {
  if (node === null || node === undefined) return "absent";
  if (typeof node === "string") return "voiced";
  return voice(node) !== null ? "voiced" : "headless";
}

// --- address ----------------------------------------------------------------

export function parse(number, flr) {                 // a pscale address to a walk (array of digit strings)
  const s = number === null || number === undefined ? "" : String(number);
  if (s === "") return [];
  if ([...s].some(c => !"0123456789.".includes(c)))
    throw new AddressError("address holds a non-digit: " + JSON.stringify(number));
  if ((s.match(/\./g) || []).length > 1)
    throw new AddressError("address has more than one decimal: " + JSON.stringify(number));
  if (s.includes(".")) {
    const [left, right] = s.split(".");
    if (left.length > flr)
      throw new AddressError("left of decimal exceeds floor " + flr + ": " + JSON.stringify(number));
    return [...(left.padStart(flr, "0") + right)];
  }
  return [...(s.length >= flr ? s : s.padStart(flr, "0"))];
}

// The here-and-now display form (the inverse a human reads): the walk's digits with
// one decimal pinned at the floor — integer digits at/above the floor, decimals below.
// Empty walk -> "" (no marker at the origin; the only dot is the floor).
export function address(walk, flr) {
  if (walk.length <= flr) return walk.join("");
  return walk.slice(0, flr).join("") + "." + walk.slice(flr).join("");
}

// --- reference (refer / star) -----------------------------------------------

const _NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;
const _ADDR = /^\d+(\.\d+)?$/;
const _ATT = /^-?\d+$/;

export function parseReference(leaf) {               // name | name:address | name:address:attention, else null
  if (typeof leaf !== "string" || leaf === "" || leaf.includes(" ")) return null;
  const parts = leaf.split(":");
  let i = 0; const nameSegs = [];
  while (i < parts.length && _NAME.test(parts[i])) { nameSegs.push(parts[i]); i++; }
  if (!nameSegs.length) return null;
  const name = nameSegs.join(":");
  let addr = null, att = null;
  if (i < parts.length) {
    if (_ADDR.test(parts[i])) { addr = parts[i]; i++; } else return null;
  }
  if (i < parts.length) {
    if (_ATT.test(parts[i])) { att = parseInt(parts[i], 10); i++; } else return null;
  }
  return i === parts.length ? [name, addr, att] : null;
}

function _resolve(text, loader) {
  if (!loader || typeof text !== "string") return null;
  const ref = parseReference(text);
  if (ref === null) return null;
  const [name, addr, att] = ref;
  const target = loader(name);
  if (target === null || target === undefined) return null;
  return spark(target, addr, att, { star: true, loader });
}

// --- the function -----------------------------------------------------------

export function spark(block, number = null, attention = null, opts = {}) {
  const { content = null, star = false, loader = null } = opts;
  const flr = floor(block);
  if (content !== null) return _write(block, number, attention, content, flr);
  if (number === null || String(number) === "") {
    if (attention === null) return { mode: "whole", floor: flr, block };
    return _disc(block, attention, flr);
  }
  const walk = parse(number, flr);
  const term = flr - walk.length;
  if (attention === null) return _spindle(block, walk, flr);
  if (attention === term) {
    const res = _point(block, walk, term);
    if (star && res.status === "voiced") {
      const followed = _resolve(res.text, loader);
      if (followed !== null) return followed;
    }
    return res;
  }
  if (attention > term) return _ring(block, walk, attention, flr);
  return _directory(block, walk, attention, flr);
}

function _spindle(block, walk, flr) {
  const entries = []; let node = block, off = false;
  walk.forEach((d, i) => {
    node = (!off && isObj(node) && d in node) ? node[d] : null;
    if (node === null) off = true;
    entries.push({ depth: i + 1, pscale: flr - (i + 1),
                   text: off ? null : voice(node), status: status(node) });
  });
  return { mode: "spindle", floor: flr, entries };
}

function _point(block, walk, term) {
  const node = descend(block, walk);
  return { mode: "point", pscale: term,
           text: node !== null ? voice(node) : null, status: status(node) };
}

function _ring(block, walk, attention, flr) {
  const depth = flr - attention;
  if (depth < 1) return { mode: "ring", pscale: attention, head: voice(block), siblings: [] };
  const parent = descend(block, walk.slice(0, depth - 1));
  const walked = depth - 1 < walk.length ? walk[depth - 1] : null;
  const sibs = [];
  if (isObj(parent)) {
    for (const d of DIGITS) if (d in parent) {
      const ch = parent[d];
      sibs.push({ digit: d, text: isObj(ch) ? voice(ch) : ch, status: status(ch),
                  is_branch: isObj(ch), is_walked: d === walked });
    }
  }
  return { mode: "ring", pscale: attention,
           head: parent !== null ? voice(parent) : null, siblings: sibs };
}

function _directory(block, walk, attention, flr) {
  const node = descend(block, walk);
  const remaining = (flr - attention) - walk.length;
  const build = (n, depthLeft) => {
    if (!isObj(n)) return n;
    if (depthLeft <= 0) return voice(n);
    const out = {};
    if ("0" in n) out["0"] = voice(n);
    for (const d of DIGITS) if (d in n) out[d] = build(n[d], depthLeft - 1);
    return out;
  };
  return { mode: "directory", pscale: attention,
           subtree: isObj(node) ? build(node, remaining) : node };
}

function _disc(block, attention, flr) {
  const target = flr - attention, nodes = [];
  const rec = (n, depth, addr) => {
    if (depth === target) {
      nodes.push({ address: addr, text: isObj(n) ? voice(n) : n, status: status(n) });
      return;
    }
    if (isObj(n)) for (const d of ["0", ...DIGITS]) if (d in n) rec(n[d], depth + 1, addr + d);
  };
  rec(block, 0, "");
  return { mode: "disc", pscale: attention, nodes };
}

// --- write (conjugate of read) ----------------------------------------------

function _ensure(block, digits) {                    // create missing intermediates headless; lift strings to a 0
  let node = block;
  for (const d of digits) {
    if (!(d in node)) node[d] = {};
    else if (typeof node[d] === "string") node[d] = { "0": node[d] };
    node = node[d];
  }
  return node;
}

function _write(block, number, attention, content, flr) {
  if (number === null || String(number) === "") {
    if (attention === null && isObj(content)) {
      for (const k of Object.keys(block)) delete block[k];
      Object.assign(block, content);
      return { mode: "whole-write", ok: true };
    }
    throw new AddressError("a write with no number needs a whole-block object");
  }
  const walk = parse(number, flr);
  const term = flr - walk.length;
  if (attention === null || attention === term) {
    const parent = _ensure(block, walk.slice(0, -1));
    parent[walk[walk.length - 1]] = content;
    return { mode: "point-write", ok: true };
  }
  if (attention > term) {
    if (!isObj(content))
      throw new AddressError("a ring write replaces the digit children — content must be an object of digit keys");
    const depth = flr - attention;
    const parent = _ensure(block, walk.slice(0, depth - 1));
    for (const d of DIGITS) delete parent[d];
    for (const [k, v] of Object.entries(content)) parent[k] = v;
    return { mode: "ring-write", ok: true };
  }
  const parent = _ensure(block, walk.slice(0, -1));
  parent[walk[walk.length - 1]] = content;
  return { mode: "directory-write", ok: true };
}

// --- fold -------------------------------------------------------------------

export function fold(blocks, attention) {
  const rows = blocks.map((b, i) => ({ block: i, nodes: _disc(b, attention, floor(b)).nodes }));
  return { mode: "fold", pscale: attention, blocks: rows };
}
