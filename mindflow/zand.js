/**
 * zand.js — Zero Applied Number Description for ztone JSON blocks.
 *
 * A ztone block is a JSON tree where every key is a single digit '0'..'9'.
 * Digit '0' carries voicing — the semantic that makes the surrounding digits
 * cohere. Digits '1'..'9' are lateral branches. No special characters; '0' is
 * a digit like any other in JSON.
 *
 * Signature:
 *   zand(block, number?, attention?, content?, opts?)
 *   opts: { star, blockLoader }
 *
 * Read shapes (no content):
 *   number=null, attention=null     → whole block
 *   number=null, attention=int      → disc (all positions at depth)
 *   number=N,    attention=null     → spindle (root-to-terminus zero-texts)
 *   number=N,    attention=terminus → point
 *   number=N,    attention>terminus → ring (siblings, rooted at terminus)
 *   number=N,    attention<terminus → dir  (subtree, rooted at terminus)
 *
 * JS port of zand2.py. Source of truth lives in
 * /Volumes/CORSAIR/pscale/ztone/zand2.py — keep this file in step.
 */

export class InvalidAddressError extends Error {
  constructor(msg) { super(msg); this.name = 'InvalidAddressError'; }
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ── Zero-spine helpers ───────────────────────────────────

/** Walk node's zero-spine to a terminal string. Null if none exists. */
export function collectZeroText(node) {
  if (!isObj(node) || !('0' in node)) return null;
  const val = node['0'];
  if (typeof val === 'string') return val;
  if (isObj(val)) return collectZeroText(val);
  return null;
}

/**
 * Floor depth — count of zero-key steps from root until a string.
 * Floor 1: root['0'] is a string. Floor N: walk '0' N times to reach a string.
 * Floor 0: root has no '0' key (unanchored block).
 */
export function floorDepth(block) {
  let node = block, depth = 0;
  while (isObj(node) && '0' in node) {
    depth++;
    node = node['0'];
    if (typeof node === 'string') return depth;
  }
  return depth;
}

// ── Address parsing ──────────────────────────────────────

/**
 * Split a pscale address into { left, right, hadDot }.
 * Throws InvalidAddressError on multi-dot or non-digit characters.
 */
export function parseAddress(s) {
  if (typeof s === 'number') {
    if (Number.isInteger(s)) {
      return { left: String(s).split(''), right: [], hadDot: false };
    }
    let formatted = s.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
    if (formatted.includes('.')) {
      const [l, r] = formatted.split('.');
      return { left: l.split(''), right: r.split(''), hadDot: true };
    }
    return { left: formatted.split(''), right: [], hadDot: true };
  }
  const text = String(s);
  const dotCount = (text.match(/\./g) || []).length;
  if (dotCount > 1) {
    throw new InvalidAddressError(
      `"${text}" has ${dotCount} decimal points; pscale addresses carry at most one`
    );
  }
  let left, right;
  if (dotCount === 1) {
    [left, right] = text.split('.');
  } else {
    left = text; right = '';
  }
  for (const ch of left + right) {
    if (!/\d/.test(ch)) {
      throw new InvalidAddressError(
        `"${text}" contains non-digit character "${ch}"`
      );
    }
  }
  return { left: left.split(''), right: right.split(''), hadDot: dotCount === 1 };
}

/**
 * Address → list of digit-walk steps. Floor-aware padding on dotted
 * addresses; bare addresses walked literally. Trailing zeros preserved.
 */
export function parseSpindle(number, floor) {
  if (number === null || number === undefined || number === '') return [];
  const { left, right, hadDot } = parseAddress(number);
  if (hadDot && floor >= 1 && left.length > floor) {
    throw new InvalidAddressError(
      `address "${number}" has ${left.length} digits left of decimal but block floor is ${floor}; left-of-decimal cannot exceed floor`
    );
  }
  let leftDigits = left;
  if (hadDot && floor >= 2 && leftDigits.length < floor) {
    leftDigits = Array(floor - leftDigits.length).fill('0').concat(leftDigits);
  }
  return leftDigits.concat(right);
}

/** Walk-digits → canonical pscale address string with floor-aware decimal. */
export function formatAddress(digits, floor) {
  let d = [...digits];
  if (!d.length) return '';
  if (d.length <= floor) {
    while (d.length > 1 && d[0] === '0') d.shift();
    return d.join('');
  }
  let left = d.slice(0, floor);
  let right = d.slice(floor);
  while (left.length > 1 && left[0] === '0') left.shift();
  return left.join('') + '.' + right.join('');
}

// ── Walk ─────────────────────────────────────────────────

/**
 * Walk by digits, collecting zero-text at each visited node.
 * Returns { chain, terminal, parent, lastKey }.
 *   chain — [{ text, depth }] root-to-terminus
 *   Walking '0' onto a terminal zero-spine string breaks (already collected).
 */
export function walk(block, digits) {
  const chain = [];
  let node = block, parent = null, lastKey = null, depth = 0;
  const rootText = collectZeroText(node);
  if (rootText !== null) chain.push({ text: rootText, depth });
  for (const d of digits) {
    if (!isObj(node) || !(d in node)) break;
    const target = node[d];
    if (d === '0' && typeof target === 'string') break;
    parent = node;
    lastKey = d;
    node = target;
    depth++;
    if (typeof node === 'string') {
      chain.push({ text: node, depth });
      break;
    } else if (isObj(node)) {
      const text = collectZeroText(node);
      if (text !== null) chain.push({ text, depth });
    }
  }
  return { chain, terminal: node, parent, lastKey };
}

// ── Star: leaf-reference recognition ─────────────────────

const REFERENCE_RE = /^([A-Za-z][A-Za-z0-9_:\-]*?)(?::(\d+(?:\.\d+)?))?$/;

/** Parse a leaf string as { name, address } if it matches the ref shape. */
export function parseReference(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().match(REFERENCE_RE);
  if (!m) return null;
  return { name: m[1], address: m[2] || null };
}

function resolveWithStar(value, blockLoader) {
  const ref = typeof value === 'string' ? parseReference(value) : null;
  if (!ref) return value;
  const target = blockLoader ? blockLoader(ref.name) : null;
  if (!target) return value;
  return ref.address ? zand(target, ref.address) : zand(target);
}

// ── ZAND dispatch ────────────────────────────────────────

export function zand(block, number = null, attention = null, content = null, opts = {}) {
  const { star = false, blockLoader = null } = opts;
  const fl = floorDepth(block);

  if (number === null && attention === null && content === null) {
    return { mode: 'whole', block, floor: fl };
  }

  if ((number === null || number === '') && attention !== null && content === null) {
    return discRead(block, attention, fl);
  }

  const digits = parseSpindle(number, fl);
  const { chain, terminal, parent, lastKey } = walk(block, digits);
  const terminusPscale = fl - digits.length;

  if (attention === null && content === null) {
    return spindleFromChain(chain, fl, star, blockLoader);
  }

  if (content !== null) {
    return zandWrite(block, digits, attention, terminusPscale, content);
  }

  if (attention === terminusPscale) return pointRead(chain, terminusPscale, star, blockLoader);
  if (attention > terminusPscale) return ringRead(parent, lastKey, attention, star, blockLoader);
  return dirRead(terminal, digits.length, fl - attention, star, blockLoader);
}

// ── Shape readers ────────────────────────────────────────

function spindleFromChain(chain, floor, star, blockLoader) {
  return {
    mode: 'spindle',
    nodes: chain.map(e => ({
      pscale: floor - e.depth,
      text: star ? resolveWithStar(e.text, blockLoader) : e.text,
    })),
  };
}

function pointRead(chain, pscale, star, blockLoader) {
  if (!chain.length) return { mode: 'point', pscale, text: null };
  let text = chain[chain.length - 1].text;
  if (star) text = resolveWithStar(text, blockLoader);
  return { mode: 'point', pscale, text };
}

function ringRead(parent, lastKey, attention, star, blockLoader) {
  if (!parent || !isObj(parent)) return { mode: 'ring', pscale: attention, siblings: [] };
  const siblings = [];
  for (const d of '0123456789') {
    if (!(d in parent)) continue;
    const v = parent[d];
    let text, isBranch;
    if (typeof v === 'string') { text = v; isBranch = false; }
    else if (isObj(v)) { text = collectZeroText(v); isBranch = true; }
    else { text = null; isBranch = false; }
    if (star && typeof text === 'string') text = resolveWithStar(text, blockLoader);
    siblings.push({ digit: d, text, isBranch, isWalked: d === lastKey });
  }
  return { mode: 'ring', pscale: attention, siblings };
}

function dirRead(terminal, terminusDepth, targetDepth, star, blockLoader) {
  if (!isObj(terminal)) {
    let t = terminal;
    if (star && typeof t === 'string') t = resolveWithStar(t, blockLoader);
    return { mode: 'dir', subtree: t };
  }
  const levels = targetDepth - terminusDepth;
  if (levels <= 0) return { mode: 'dir', subtree: terminal };
  function truncate(node, remaining) {
    if (remaining <= 0 || !isObj(node)) {
      return isObj(node) ? collectZeroText(node) : node;
    }
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (isObj(v)) out[k] = truncate(v, remaining - 1);
      else {
        let val = v;
        if (star && typeof val === 'string') val = resolveWithStar(val, blockLoader);
        out[k] = val;
      }
    }
    return out;
  }
  return { mode: 'dir', subtree: truncate(terminal, levels) };
}

function discRead(block, attention, floor) {
  const targetDepth = floor - attention;
  if (targetDepth < 0) return { mode: 'disc', pscale: attention, nodes: [] };
  const nodes = [];
  function collect(node, depth, walked) {
    if (depth === targetDepth) {
      let text = null;
      if (typeof node === 'string') text = node;
      else if (isObj(node)) text = collectZeroText(node);
      nodes.push({ address: walked.length ? formatAddress(walked, floor) : '', text });
      return;
    }
    if (!isObj(node)) return;
    for (const d of '0123456789') {
      if (d in node) collect(node[d], depth + 1, walked.concat([d]));
    }
  }
  collect(block, 0, []);
  return { mode: 'disc', pscale: attention, nodes };
}

// ── Write ────────────────────────────────────────────────

function zandWrite(block, digits, attention, terminusPscale, content) {
  if (!digits.length) {
    if (isObj(content)) {
      for (const k of Object.keys(block)) delete block[k];
      Object.assign(block, content);
      return { mode: 'whole-write', ok: true };
    }
    return { mode: 'error', error: 'whole-block write requires dict' };
  }
  let node = block;
  for (let i = 0; i < digits.length - 1; i++) {
    if (!isObj(node)) return { mode: 'error', error: 'non-dict on walk', depth: i };
    const d = digits[i];
    if (!(d in node) || !isObj(node[d])) node[d] = {};
    node = node[d];
  }
  const lastD = digits[digits.length - 1];
  if (attention === null || attention === terminusPscale) {
    node[lastD] = content;
    return { mode: 'point-write', ok: true };
  }
  if (attention > terminusPscale) {
    if (!isObj(content)) return { mode: 'error', error: 'ring-write requires dict' };
    if (digits.length < 2) {
      for (const k of Object.keys(block)) if (/^\d$/.test(k)) delete block[k];
      for (const [k, v] of Object.entries(content)) if (/^\d$/.test(k)) block[k] = v;
      return { mode: 'ring-write', ok: true };
    }
    let grandparent = block;
    for (let i = 0; i < digits.length - 2; i++) grandparent = grandparent[digits[i]];
    const target = digits[digits.length - 2];
    if (!isObj(grandparent[target])) grandparent[target] = {};
    const rp = grandparent[target];
    for (const k of Object.keys(rp)) if (/^\d$/.test(k)) delete rp[k];
    for (const [k, v] of Object.entries(content)) if (/^\d$/.test(k)) rp[k] = v;
    return { mode: 'ring-write', ok: true };
  }
  node[lastD] = content;
  return { mode: 'dir-write', ok: true };
}
