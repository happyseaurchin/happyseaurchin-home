/**
 * biome editor — multi-block 0-9 file editor.
 *
 * Loads biome 0-9 blocks — one per file, or a { id: block, ... } bundle —
 * renders document / columns / dir views, and supports inline edits +
 * saved view slices. Reference leaves (e.g. "slate:5.1") resolve by id
 * within the loaded shelf.
 *
 * Walker and address logic come from ../biome.js, the canonical port of
 * zand2.py.
 */

import {
  collectZeroText,
  floorDepth,
  formatAddress,
  parseReference,
} from '../biome.js';

// ──── Helpers ────────────────────────────────────────────────

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const digitKeys = (node) => isObj(node) ? '123456789'.split('').filter(d => d in node) : [];

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * Collect all 1-9 digit children of `node`, including those reachable by
 * zero-spine descent. Returns [{ digit, value, pathExtension }] where
 * pathExtension is the walk-digits from `node` to the child.
 *
 * For a floor-1 block this is equivalent to digitKeys — the children are
 * direct (pathExtension = [d]). For a floor-N block where the zero-spine
 * has its own 1-9 siblings at each level, those are included with
 * pathExtension = ['0', ..., d]. Without this, floor-N blocks like bumph
 * render only the root voicing because root has no direct 1-9 children.
 */
function deepDigitChildren(node) {
  const out = [];
  let current = node;
  let zeroPath = [];
  while (isObj(current)) {
    for (const d of '123456789') {
      if (d in current) {
        out.push({ digit: d, value: current[d], pathExtension: zeroPath.concat([d]) });
      }
    }
    if ('0' in current && isObj(current['0'])) {
      zeroPath = zeroPath.concat(['0']);
      current = current['0'];
    } else {
      break;
    }
  }
  return out;
}

/**
 * Render a walk-digit list as a pscale display address. Preserves leading
 * zeros above the floor — for floor-N blocks this disambiguates positions
 * at different pscales (e.g. walk [0,3] renders as "03" not "3", so it's
 * distinguishable from a hypothetical walk [3]). Differs from zand2's
 * format_address, which strips leading zeros; that stripping is correct
 * for floor-1 supernest invariance but loses information at floor ≥ 2.
 */
function displayAddress(digits, floor) {
  const d = [...digits];
  if (!d.length) return '';
  const fl = Math.max(0, floor | 0);
  if (fl === 0 || d.length <= fl) return d.join('');
  return d.slice(0, fl).join('') + '.' + d.slice(fl).join('');
}

const addrOf = (digits, floor) => displayAddress(digits, floor);

/**
 * Parse a pscale address string like "2.11" into a digit-walk by removing
 * the decimal. The editor stores walks as digit arrays; the decimal is a
 * display convention reconstructed by addrOf at render time.
 */
function parseAddressDigits(addrStr) {
  return String(addrStr).replace(/\./g, '').split('').filter(c => /\d/.test(c));
}

/**
 * Classify a string leaf: 'address' (pure pscale number),
 * 'blockref' (name or name:address, matching zand's reference regex),
 * or 'text'.
 */
function classifyRef(s) {
  if (typeof s !== 'string') return 'text';
  const t = s.trim();
  if (!t) return 'text';
  if (/^\d+(?:\.\d+)?$/.test(t)) return 'address';
  if (parseReference(t) && /^[A-Za-z]/.test(t) && !/\s/.test(t)) return 'blockref';
  return 'text';
}

// ──── State ──────────────────────────────────────────────────

const state = {
  shelf: new Map(),    // id -> block
  filename: 'biome.json',
  currentId: null,
  view: 'doc',
  docMode: 'html',
  walkMode: 'free',
  path: [],            // digit-string array, e.g. ['2', '1', '1']
};

let lastMd = '';

const currentBlock = () => state.currentId ? state.shelf.get(state.currentId) : null;

// ──── LocalStorage ───────────────────────────────────────────

const LS_SHELF = 'biome-editor:shelf';
const LS_FILENAME = 'biome-editor:filename';
const LS_THEME = 'biome-editor:theme';
const LS_VIEWS = 'biome-editor:views';

// One-time migration from the retired zand-editor:* keys, so shelves
// saved before the rename survive it.
for (const key of ['shelf', 'filename', 'theme', 'views']) {
  try {
    const oldVal = localStorage.getItem(`zand-editor:${key}`);
    if (oldVal !== null && localStorage.getItem(`biome-editor:${key}`) === null) {
      localStorage.setItem(`biome-editor:${key}`, oldVal);
    }
  } catch (_) {}
}

state.slices = new Map();  // blockId -> slice[]

function saveLocal() {
  try {
    const obj = {};
    state.shelf.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(LS_SHELF, JSON.stringify(obj));
    localStorage.setItem(LS_FILENAME, state.filename);
    const slicesObj = {};
    state.slices.forEach((v, k) => { if (v.length) slicesObj[k] = v; });
    localStorage.setItem(LS_VIEWS, JSON.stringify(slicesObj));
  } catch (_) {}
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_SHELF);
    if (raw) state.shelf = new Map(Object.entries(JSON.parse(raw)));
    const fn = localStorage.getItem(LS_FILENAME);
    if (fn) state.filename = fn;
    const vraw = localStorage.getItem(LS_VIEWS);
    if (vraw) state.slices = new Map(Object.entries(JSON.parse(vraw)));
  } catch (_) {}
}

// ──── Slices ────────────────────────────────────────────────

function pathsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function slicesForCurrent() {
  if (!state.currentId) return [];
  return state.slices.get(state.currentId) || [];
}

function currentSliceIndex() {
  return slicesForCurrent().findIndex(s =>
    s.view === state.view && s.walkMode === state.walkMode && pathsEqual(s.path, state.path)
  );
}

function saveCurrentAsSlice() {
  if (!state.currentId) return;
  if (currentSliceIndex() >= 0) return;
  const slice = {
    view: state.view,
    walkMode: state.walkMode,
    path: [...state.path],
  };
  const list = state.slices.get(state.currentId) || [];
  list.push(slice);
  state.slices.set(state.currentId, list);
  refresh();
}

function activateSlice(idx) {
  const list = slicesForCurrent();
  const s = list[idx];
  if (!s) return;
  state.view = s.view;
  state.walkMode = s.walkMode;
  state.path = [...s.path];
  syncViewUI();
  refresh();
}

function deleteSlice(idx) {
  const list = slicesForCurrent();
  if (idx < 0 || idx >= list.length) return;
  list.splice(idx, 1);
  if (list.length === 0) state.slices.delete(state.currentId);
  else state.slices.set(state.currentId, list);
  refresh();
}

function syncViewUI() {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === state.view));
  document.querySelectorAll('.view-controls').forEach(c => { c.hidden = c.dataset.for !== state.view; });
  document.querySelectorAll('.walk-btn').forEach(b => b.classList.toggle('active', b.dataset.walk === state.walkMode));
}

function renderSliceBar() {
  const chipsEl = document.getElementById('slice-chips');
  const hintEl = document.getElementById('slice-hint');
  const btn = document.getElementById('btn-save-slice');
  if (!chipsEl) return;
  const list = slicesForCurrent();
  const activeIdx = currentSliceIndex();
  btn.disabled = !state.currentId || activeIdx >= 0;
  btn.title = activeIdx >= 0
    ? 'Current view is already a saved slice'
    : 'Save current view+walk+path as a slice for this block';
  const block = currentBlock();
  const fl = block ? floorDepth(block) : 1;
  chipsEl.innerHTML = list.map((s, i) => {
    const addr = s.path.length ? addrOf(s.path, fl) : '∅';
    const active = i === activeIdx ? ' active' : '';
    const label = `${s.view}·${s.walkMode}${s.path.length ? ' @' + esc(addr) : ''}`;
    return `<span class="slice-chip${active}" data-slice="${i}" title="Activate this slice">${label}<span class="slice-kill" data-kill="${i}" title="Delete">×</span></span>`;
  }).join('');
  hintEl.textContent = state.currentId
    ? (list.length ? `${list.length} slice${list.length === 1 ? '' : 's'} on ${state.currentId}` : 'no slices yet — configure a view then + save')
    : 'select a block';
}

// ──── Render: document view ──────────────────────────────────

function renderDocHTML(block) {
  const out = [];
  const fl = floorDepth(block);
  function recurse(node, digits) {
    // hLevel and indent track walk depth (digits.length), not recursion depth,
    // so positions at the same pscale share an indent level even when they
    // sit under different walk paths (e.g. bumph's `03` at depth 2 and `002`
    // at depth 3 must not collapse to the same indent).
    const hLevel = Math.min(Math.max(digits.length + 1, 1), 6);
    const addrDisplay = digits.length ? addrOf(digits, fl) : '∅';

    if (typeof node === 'string') {
      out.push(`<div class="node">`);
      out.push(`<h${hLevel} class="node-heading"><span class="addr">${esc(addrDisplay)}</span><span class="sem leaf">${esc(node)}</span></h${hLevel}>`);
      out.push(`</div>`);
      return;
    }
    if (!isObj(node)) return;

    const sem = collectZeroText(node);
    const children = deepDigitChildren(node);

    out.push(`<div class="node">`);
    out.push(`<h${hLevel} class="node-heading"><span class="addr">${esc(addrDisplay)}</span>`);
    if (sem !== null) out.push(`<span class="sem">${esc(sem)}</span>`);
    else out.push(`<span class="sem-empty">(no semantic at this position)</span>`);
    out.push(`</h${hLevel}>`);

    if (children.length) {
      // Each child gets one .children wrap per pathExtension digit, so a
      // child reached via a multi-step zero-spine descent (e.g. [0,0,2])
      // ends up correctly indented at walk depth, not at recursion depth.
      for (const child of children) {
        const wraps = child.pathExtension.length;
        for (let i = 0; i < wraps; i++) out.push(`<div class="children">`);
        recurse(child.value, digits.concat(child.pathExtension));
        for (let i = 0; i < wraps; i++) out.push(`</div>`);
      }
    }
    out.push(`</div>`);
  }
  recurse(block, []);
  return out.join('');
}

function renderDocMarkdown(block) {
  const lines = [];
  const fl = floorDepth(block);
  function recurse(node, digits) {
    const h = '#'.repeat(Math.min(Math.max(digits.length + 1, 1), 6));
    const addrDisplay = digits.length ? addrOf(digits, fl) : '∅';

    if (typeof node === 'string') {
      lines.push(`${h} \`${addrDisplay}\` · ${node}`);
      lines.push('');
      return;
    }
    if (!isObj(node)) return;

    const sem = collectZeroText(node);
    const children = deepDigitChildren(node);

    if (sem !== null) lines.push(`${h} \`${addrDisplay}\` · ${sem}`);
    else lines.push(`${h} \`${addrDisplay}\` · *(no semantic)*`);
    lines.push('');

    for (const child of children) {
      recurse(child.value, digits.concat(child.pathExtension));
    }
  }
  recurse(block, []);
  return lines.join('\n');
}

// ──── Render: dir view ───────────────────────────────────────

/** Walk state.path inside a block to get the scoped node. */
function resolvePath(block, path) {
  let node = block;
  for (const d of path) {
    if (!isObj(node) || !(d in node)) return null;
    node = node[d];
  }
  return node;
}

function renderDir(block) {
  const node = resolvePath(block, state.path);
  if (node === null || node === undefined) return `<div class="col-empty">Path not resolvable.</div>`;
  const fl = floorDepth(block);

  const out = [];
  out.push(`<div class="dir-view">`);

  const baseDepth = state.path.length;
  function recurse(n, digits) {
    // Indent by walk depth relative to the scoped root, so same-pscale rows
    // share an indent level even when their walks have different lengths.
    const walkDepth = digits.length - baseDepth;
    const indent = 12 + walkDepth * 18;
    const addrDisplay = digits.length ? addrOf(digits, fl) : '∅';
    const navKey = digits.join('');

    if (typeof n === 'string') {
      out.push(`<div class="dir-row" data-nav="${esc(navKey)}" style="padding-left:${indent}px">`);
      out.push(`<span class="dir-addr">${esc(addrDisplay)}</span>`);
      out.push(`<span class="dir-text leaf">${esc(n)}</span>`);
      out.push(`</div>`);
      return;
    }
    if (!isObj(n)) return;

    const sem = collectZeroText(n);
    const children = deepDigitChildren(n);

    out.push(`<div class="dir-row${walkDepth === 0 ? ' root' : ''}" data-nav="${esc(navKey)}" style="padding-left:${indent}px">`);
    out.push(`<span class="dir-addr">${esc(addrDisplay)}</span>`);
    if (sem !== null) out.push(`<span class="dir-text">${esc(sem)}</span>`);
    else out.push(`<span class="dir-text empty">(no semantic)</span>`);
    out.push(`</div>`);

    for (const child of children) {
      recurse(child.value, digits.concat(child.pathExtension));
    }
  }

  recurse(node, state.path);
  out.push(`</div>`);
  return out.join('');
}

function renderDirScope() {
  const el = document.getElementById('dir-scope');
  if (!el) return;
  const block = currentBlock();
  const fl = block ? floorDepth(block) : 1;
  const root = `<span class="bc-piece" data-trunc="0">${esc(state.currentId || '∅')}</span>`;
  el.innerHTML = state.path.length
    ? `${root}<span class="bc-number">${formatPathNumber(state.path, fl, 'bc-piece', 'bc-sep')}</span>`
    : root;
  el.querySelectorAll('[data-trunc]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.path = state.path.slice(0, parseInt(btn.dataset.trunc, 10));
      refresh();
    });
  });
}

// ──── Render: column view ────────────────────────────────────

/**
 * Miller columns (matching the legacy editor's column behaviour): column 0
 * holds the block's content positions; selecting a cell opens its children
 * in the next column, so each column is the downstream of the selection to
 * its left. Children are gathered with deepDigitChildren, so positions
 * reached through a zero-spine descent (walk extensions like 0,3) appear
 * as cells of the column whose node they elaborate.
 */
function buildColumns(block, path) {
  const columns = [];
  let node = block;
  let base = [];
  while (isObj(node)) {
    const kids = deepDigitChildren(node);
    if (!kids.length && columns.length) break;
    const cells = kids.map(k => {
      const v = k.value;
      return {
        path: base.concat(k.pathExtension),
        value: v,
        isLeaf: !isObj(v),
        hasKids: isObj(v) && deepDigitChildren(v).length > 0,
        text: typeof v === 'string' ? v : collectZeroText(v),
        refKind: typeof v === 'string' ? classifyRef(v) : 'text',
      };
    });
    columns.push({ base: [...base], cells });
    if (base.length >= path.length) break;
    // Advance along the selection: the cell whose walk prefixes the path.
    const next = cells.find(c =>
      c.path.length <= path.length && c.path.every((d, i) => d === path[i]));
    if (!next) break;
    node = next.value;
    base = next.path;
  }
  return columns;
}

/** Format a path as a clickable pscale-number, decimal at floor boundary. */
function formatPathNumber(path, floor, pieceClass, sepClass) {
  const fl = Math.max(1, floor | 0);
  const out = [];
  for (let i = 0; i < path.length; i++) {
    if (i === fl) out.push(`<span class="${sepClass}">.</span>`);
    out.push(`<span class="${pieceClass}" data-trunc="${i + 1}">${esc(path[i])}</span>`);
  }
  return out.join('');
}

function formatColPath(path, rootId, floor) {
  const root = `<span class="path-root" data-trunc="0">${esc(rootId || '∅')}</span>`;
  if (!path.length) return root;
  return `${root}<span class="path-sep"> · </span><span class="path-number">${formatPathNumber(path, floor, 'path-piece', 'path-sep')}</span>`;
}

/**
 * Classify a cell's relationship to the currently-selected walk:
 *   isSelected — cell.path === sel
 *   isAncestor — cell.path is a strict prefix of sel
 *   isDescendant — sel is a strict prefix of cell.path
 *   isSibling — same length as sel, sharing parent (last digit differs)
 */
function cellRelationToSel(cellPath, sel) {
  const eq = cellPath.length === sel.length && cellPath.every((d, i) => d === sel[i]);
  if (eq) return { isSelected: true };
  const cellPrefixOfSel = cellPath.length < sel.length && cellPath.every((d, i) => d === sel[i]);
  const selPrefixOfCell = sel.length < cellPath.length && sel.every((d, i) => d === cellPath[i]);
  const sameLen = cellPath.length === sel.length && sel.length > 0;
  const sameParent = sameLen && cellPath.slice(0, -1).every((d, i) => d === sel[i]);
  return {
    isSelected: false,
    isAncestor: cellPrefixOfSel,
    isDescendant: selPrefixOfCell,
    isSibling: sameParent,
  };
}

/**
 * Walk lenses preview the shapes spark derives from (number, attention):
 *   point   — the selected position alone
 *   spindle — root → selection, the narrowing walk
 *   ring    — the selection's digit children (spark's ring is the 1-9 ring
 *             AT the terminus, not its siblings)
 *   disc    — every visible position at the selection's pscale
 * 'free' applies no lens.
 */
function applyWalkHighlight(mode, rel) {
  if (mode === 'free') return null;
  if (mode === 'spindle') return rel.isSelected || rel.isAncestor ? 'lit' : 'dim';
  if (mode === 'point') return rel.isSelected ? 'lit' : 'dim';
  if (mode === 'ring') {
    if (rel.isSelected) return null;
    return rel.isChild ? 'ring' : 'dim';
  }
  if (mode === 'disc') return rel.sameDisc ? 'lit' : 'dim';
  return null;
}

function renderColumns(block) {
  const fl = floorDepth(block);
  const sel = state.path;
  const columns = buildColumns(block, sel);
  const out = [];
  out.push(`<div class="col-view">`);
  out.push(`<div class="col-path">${formatColPath(sel, state.currentId, fl)}</div>`);
  out.push(`<div class="columns-wrap">`);

  if (!columns.length) out.push(`<div class="col-empty">Block has no content positions.</div>`);

  for (const col of columns) {
    const baseAddr = col.base.length ? displayAddress(col.base, fl) : '∅';
    const pscale = fl - col.base.length - 1;
    out.push(`<div class="column">`);
    out.push(`<div class="col-header">${esc(baseAddr)} ▸ children · pscale ${pscale}</div>`);
    if (!col.cells.length) out.push(`<div class="col-empty">(no entries)</div>`);

    for (const cell of col.cells) {
      const rel = cellRelationToSel(cell.path, sel);
      // isChild: the cell sits in the selection's children column.
      rel.isChild = sel.length > 0 && col.base.length === sel.length
        && col.base.every((d, i) => d === sel[i]);
      // sameDisc: same pscale as the selection (walk lengths match).
      rel.sameDisc = sel.length > 0 && cell.path.length === sel.length;
      const classes = ['cell'];
      if (rel.isSelected) classes.push('selected');
      else if (rel.isAncestor) classes.push('in-path');
      if (cell.refKind === 'address') classes.push('addr-ref');
      else if (cell.refKind === 'blockref') classes.push('ref-leaf');

      const hl = applyWalkHighlight(state.walkMode, rel);
      if (hl === 'lit') classes.push('highlight');
      else if (hl === 'ring') classes.push('highlight-ring');
      else if (hl === 'dim') classes.push('dimmed');

      const pathStr = cell.path.join('');
      const addrDisplay = cell.path.length ? displayAddress(cell.path, fl) : '∅';
      out.push(`<div class="${classes.join(' ')}" data-path="${esc(pathStr)}">`);
      out.push(`<span class="cell-digit">${esc(addrDisplay)}</span>`);
      out.push(`<div class="cell-body">`);
      if (cell.text) {
        if (cell.refKind === 'address') out.push(`<div class="cell-text">@${esc(cell.text)}</div>`);
        else out.push(`<div class="cell-text">${esc(cell.text)}</div>`);
      } else if (cell.isLeaf) {
        out.push(`<div class="cell-text empty">(empty)</div>`);
      } else {
        out.push(`<div class="cell-text empty">(no semantic)</div>`);
      }

      const markers = [];
      if (cell.refKind === 'blockref') {
        const refName = cell.text.split(':')[0];
        const has = state.shelf.has(refName);
        if (has) markers.push(`<span class="marker marker-jump" data-jump="${esc(refName)}">→ jump</span>`);
        else markers.push(`<span class="marker marker-broken">→ missing</span>`);
      }
      if (markers.length) out.push(`<div class="cell-markers">${markers.join('')}</div>`);
      out.push(`</div>`);
      // Branch affordance: a slim chevron on the cell's edge, not a worded
      // marker — the next column is the marker.
      if (cell.hasKids) out.push(`<span class="cell-chevron" title="has children">▸</span>`);
      out.push(`</div>`);
    }
    out.push(`</div>`);
  }
  out.push(`</div></div>`);
  return out.join('');
}

// ──── Mutation ───────────────────────────────────────────────

/**
 * Replace the semantic text at path inside the current block.
 * - string target → replace in place
 * - object target → follow '0' chain, replace deepest string
 */
function mutateAtPath(block, path, newText) {
  let source = block;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isObj(source) || !(path[i] in source)) return false;
    source = source[path[i]];
  }
  const last = path[path.length - 1];
  if (!isObj(source) || !(last in source)) return false;
  const target = source[last];

  if (typeof target === 'string') {
    source[last] = newText;
    return true;
  }
  if (isObj(target)) {
    let t = target;
    while (isObj(t) && '0' in t) {
      if (typeof t['0'] === 'string') { t['0'] = newText; return true; }
      if (!isObj(t['0'])) break;
      t = t['0'];
    }
    if (isObj(t) && !('0' in t)) { t['0'] = newText; return true; }
  }
  return false;
}

// ──── UI render ──────────────────────────────────────────────

function renderBlockList() {
  const el = document.getElementById('block-list-items');
  if (state.shelf.size === 0) {
    el.innerHTML = `<div class="empty-list">No blocks.<br>Load a file or click <em>+ new</em>.</div>`;
    return;
  }
  const out = [];
  for (const [id, block] of state.shelf) {
    const preview = collectZeroText(block) || '(no semantic)';
    const cur = id === state.currentId ? ' current' : '';
    out.push(`<div class="block-item${cur}" data-id="${esc(id)}">`);
    out.push(`<div class="block-item-id"><span>${esc(id)}</span>`);
    out.push(`<span class="block-item-actions">`);
    out.push(`<button class="item-btn" data-rename="${esc(id)}" title="Rename">✎</button>`);
    out.push(`<button class="item-btn del" data-delete="${esc(id)}" title="Delete">×</button>`);
    out.push(`</span></div>`);
    out.push(`<div class="block-item-preview">${esc(preview.slice(0, 160))}</div>`);
    out.push(`</div>`);
  }
  el.innerHTML = out.join('');
}

function renderView() {
  const body = document.getElementById('view-body');
  const block = currentBlock();
  if (!block) {
    body.innerHTML = `<div class="empty-state">Select a block from the left, or load a biome file.</div>`;
    updateStatus();
    return;
  }
  lastMd = renderDocMarkdown(block);
  if (state.view === 'doc') {
    if (state.docMode === 'md') {
      body.innerHTML = `<div class="doc-view markdown">${esc(lastMd)}</div>`;
    } else {
      body.innerHTML = `<div class="doc-view">${renderDocHTML(block)}</div>`;
    }
  } else if (state.view === 'dir') {
    body.innerHTML = renderDir(block);
    renderDirScope();
  } else {
    body.innerHTML = renderColumns(block);
  }
  updateStatus();
}

function updateStatus() {
  document.getElementById('status-block').textContent = state.currentId || '—';
  let addr = '';
  if ((state.view === 'col' || state.view === 'dir') && state.path.length) {
    const block = currentBlock();
    const fl = block ? floorDepth(block) : 1;
    addr = '@' + addrOf(state.path, fl);
  }
  document.getElementById('status-addr').textContent = addr;
}

function refresh() {
  renderBlockList();
  renderView();
  renderSliceBar();
  attachDynamicHandlers();
  saveLocal();
}

// ──── Dynamic event handlers (re-attached after each render) ─

function attachDynamicHandlers() {
  document.querySelectorAll('.block-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.item-btn')) return;
      selectBlock(el.dataset.id);
    });
    // Double-click a block → raw JSON popup.
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('.item-btn')) return;
      openRawModal(el.dataset.id);
    });
  });
  document.querySelectorAll('[data-rename]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      renameBlock(el.dataset.rename);
    });
  });
  document.querySelectorAll('[data-delete]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBlock(el.dataset.delete);
    });
  });

  // Column view cells: click sets state.path to the cell's full walk;
  // double-click edits in place. navCell re-renders the view, so the edit
  // must target the FRESH cell element found by data-path — the captured
  // `el` is detached after refresh (this was the silent can't-edit bug).
  document.querySelectorAll('#view-body .cell').forEach(el => {
    let clickTimer = null;
    el.addEventListener('click', (e) => {
      if (e.target.closest('.marker-jump')) return;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        navCell(el.dataset.path.split(''));
      }, 240);
    });
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('.marker-jump')) return;
      clearTimeout(clickTimer);
      const pathStr = el.dataset.path;
      navCell(pathStr.split(''));
      const fresh = document.querySelector(`#view-body .cell[data-path="${CSS.escape(pathStr)}"]`);
      if (fresh) enterEdit(fresh);
    });
  });

  document.querySelectorAll('.marker-jump').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.jump;
      if (state.shelf.has(id)) selectBlock(id);
    });
  });

  // dir-view rows: click to scope the dir view down to that subtree
  document.querySelectorAll('.dir-row[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-jump]')) return;
      const navKey = el.dataset.nav;
      state.path = navKey ? parseAddressDigits(navKey) : [];
      refresh();
    });
  });

  document.querySelectorAll('.col-path [data-trunc]').forEach(el => {
    el.addEventListener('click', () => {
      state.path = state.path.slice(0, parseInt(el.dataset.trunc, 10));
      refresh();
    });
  });
}

function enterEdit(cellEl) {
  const textEl = cellEl.querySelector('.cell-text');
  if (!textEl || cellEl.querySelector('.col-edit')) return;
  const original = textEl.textContent.replace(/^@/, '');
  const body = cellEl.querySelector('.cell-body');

  const ta = document.createElement('textarea');
  ta.className = 'col-edit';
  ta.value = ['(empty)', '(no semantic)', '(no semantic)'].includes(original) ? '' : original;
  ta.rows = Math.max(3, Math.ceil(original.length / 40));
  textEl.style.display = 'none';
  body.appendChild(ta);
  ta.focus();
  ta.select();

  const commit = () => {
    const newText = ta.value.trim();
    ta.remove();
    textEl.style.display = '';
    if (newText && newText !== original) {
      const block = currentBlock();
      if (block && mutateAtPath(block, state.path, newText)) {
        refresh();
      }
    }
  };
  ta.addEventListener('blur', commit);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { ta.value = original; ta.blur(); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ta.blur();
  });
}

// ──── Raw block popup ────────────────────────────────────────

function openRawModal(id) {
  const block = state.shelf.get(id);
  if (!block) return;
  let overlay = document.getElementById('raw-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'raw-modal';
    overlay.innerHTML = `
      <div class="raw-box">
        <header><span class="raw-title"></span>
          <span class="raw-actions">
            <button id="raw-copy" title="Copy JSON">copy</button>
            <button id="raw-close" title="Close (Esc)">close</button>
          </span>
        </header>
        <pre class="raw-pre"></pre>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRawModal(); });
    overlay.querySelector('#raw-close').addEventListener('click', closeRawModal);
    overlay.querySelector('#raw-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText(overlay.querySelector('.raw-pre').textContent).then(() => {
        const b = overlay.querySelector('#raw-copy');
        b.textContent = 'copied ✓';
        setTimeout(() => { b.textContent = 'copy'; }, 1200);
      }).catch(() => {});
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeRawModal();
    });
  }
  overlay.querySelector('.raw-title').textContent = `${id}.json — raw`;
  overlay.querySelector('.raw-pre').textContent = JSON.stringify(block, null, 2);
  overlay.classList.add('open');
}

function closeRawModal() {
  document.getElementById('raw-modal')?.classList.remove('open');
}

// ──── Navigation / state mutators ────────────────────────────

function navCell(path) {
  state.path = [...path];
  refresh();
}

function selectBlock(id) {
  if (!state.shelf.has(id)) return;
  state.currentId = id;
  state.path = [];
  refresh();
}

function renameBlock(oldId) {
  const newId = prompt('Rename block:', oldId);
  if (!newId || newId === oldId) return;
  if (state.shelf.has(newId)) { alert(`Block "${newId}" already exists.`); return; }
  const m = new Map();
  state.shelf.forEach((v, k) => m.set(k === oldId ? newId : k, v));
  state.shelf = m;
  if (state.currentId === oldId) state.currentId = newId;
  refresh();
}

function deleteBlock(id) {
  if (!confirm(`Delete block "${id}"?`)) return;
  state.shelf.delete(id);
  if (state.currentId === id) {
    state.currentId = state.shelf.size ? state.shelf.keys().next().value : null;
    state.path = [];
  }
  refresh();
}

function newBlock() {
  let base = 'new-block', id = base, i = 1;
  while (state.shelf.has(id)) id = `${base}-${++i}`;
  state.shelf.set(id, { '0': 'New block.' });
  selectBlock(id);
}

function newFile() {
  if (state.shelf.size > 0 && !confirm('Start a new file? Unsaved changes in this session will be lost.')) return;
  state.shelf = new Map();
  state.currentId = null;
  state.path = [];
  state.filename = 'biome.json';
  document.getElementById('filename-input').value = state.filename;
  refresh();
}

async function loadFiles(files) {
  try {
    const entries = await Promise.all([...files].map(async (f) => {
      let data;
      try { data = JSON.parse(await f.text()); }
      catch (err) { throw new Error(`${f.name}: ${err.message}`); }
      if (!isObj(data)) throw new Error(`${f.name} must be a JSON object.`);
      return { name: f.name, data };
    }));

    // Heuristic per file, single block vs bundle: a single block has '0'
    // or a digit (1-9) key at root. Single blocks are named by filename;
    // bundles merge their { id: block } entries. Multi-select a shell
    // directory and each file becomes a sibling block on the shelf.
    const shelf = new Map();
    for (const { name, data } of entries) {
      const looksLikeSingleBlock = Object.keys(data).some(k => /^[0-9]$/.test(k));
      if (looksLikeSingleBlock) {
        shelf.set(name.replace(/\.json$/, '') || 'block', data);
      } else {
        for (const [id, block] of Object.entries(data)) {
          if (isObj(block)) shelf.set(id, block);
        }
      }
    }
    state.shelf = shelf;
    state.filename = entries.length === 1 ? (entries[0].name || 'biome.json') : 'shell.json';
    document.getElementById('filename-input').value = state.filename;
    state.currentId = state.shelf.size ? state.shelf.keys().next().value : null;
    state.path = [];
    refresh();
  } catch (e) {
    alert(`Failed to load: ${e.message}`);
  }
}

function saveFile() {
  const obj = {};
  state.shelf.forEach((v, k) => { obj[k] = v; });
  let filename = document.getElementById('filename-input').value.trim() || 'biome.json';
  if (!filename.endsWith('.json')) filename += '.json';
  state.filename = filename;
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  saveLocal();
}

const BIOME_BEACH = 'https://biome-commons-production.up.railway.app/.well-known/biome-beach';
const SAMPLE_BIOME_BLOCKS = ['slate', 'flint', 'genome'];

async function loadSamples() {
  // Defaults are the biome's own teaching blocks, fetched live through the
  // same-origin relay (the commons serves no CORS headers). Falls back to
  // bundled snapshots of the same blocks when the relay isn't reachable.
  let loaded = false;
  try {
    const fetched = await Promise.all(SAMPLE_BIOME_BLOCKS.map(async (name) => {
      const q = new URLSearchParams({ url: BIOME_BEACH, block: name });
      const r = await fetch(`/api/beach-relay?${q}`);
      if (!r.ok) throw new Error(`relay ${r.status} for ${name}`);
      const data = await r.json();
      if (!isObj(data)) throw new Error(`${name} is not an object`);
      return [name, data];
    }));
    for (const [name, data] of fetched) state.shelf.set(name, data);
    loaded = true;
  } catch (e) {
    console.warn('biome samples unavailable, using bundled fallback:', e.message);
  }
  if (!loaded) {
    try {
      const fetched = await Promise.all(SAMPLE_BIOME_BLOCKS.map(async (name) => {
        const r = await fetch(`./blocks/${name}.json`);
        if (!r.ok) throw new Error(`${name} snapshot missing`);
        return [name, await r.json()];
      }));
      for (const [name, data] of fetched) state.shelf.set(name, data);
    } catch (e) {
      console.warn('Sample load failed:', e);
    }
  }
  if (!state.currentId && state.shelf.size) {
    state.currentId = state.shelf.keys().next().value;
  }
}

// ──── Theme ──────────────────────────────────────────────────

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(LS_THEME, theme);
  document.getElementById('btn-theme').textContent = theme === 'light' ? '☀' : '◐';
  document.getElementById('btn-theme').title = theme === 'light' ? 'Switch to dark' : 'Switch to light';
}

function initTheme() {
  const saved = localStorage.getItem(LS_THEME);
  const theme = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(theme);
}

// ──── Static UI wiring (once) ────────────────────────────────

function wireStaticUI() {
  document.querySelectorAll('.tab').forEach(el => {
    el.addEventListener('click', () => {
      const v = el.dataset.view;
      state.view = v;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
      document.querySelectorAll('.view-controls').forEach(c => { c.hidden = c.dataset.for !== v; });
      refresh();
    });
  });

  document.querySelectorAll('.walk-btn').forEach(el => {
    el.addEventListener('click', () => {
      state.walkMode = el.dataset.walk;
      document.querySelectorAll('.walk-btn').forEach(b => b.classList.toggle('active', b === el));
      refresh();
    });
  });

  document.getElementById('btn-reset-path').addEventListener('click', () => {
    state.path = [];
    refresh();
  });

  document.getElementById('btn-toggle-md').addEventListener('click', () => {
    state.docMode = state.docMode === 'html' ? 'md' : 'html';
    document.getElementById('btn-toggle-md').textContent = state.docMode === 'html' ? 'show markdown' : 'show rendered';
    refresh();
  });

  document.getElementById('btn-copy-md').addEventListener('click', () => {
    if (!lastMd) return;
    navigator.clipboard?.writeText(lastMd).then(() => {
      const b = document.getElementById('btn-copy-md');
      const orig = b.textContent;
      b.textContent = 'copied ✓';
      setTimeout(() => { b.textContent = orig; }, 1200);
    }).catch(() => {});
  });

  document.getElementById('btn-theme').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'light' ? 'dark' : 'light');
  });

  document.getElementById('btn-save-slice').addEventListener('click', saveCurrentAsSlice);
  document.getElementById('slice-chips').addEventListener('click', (e) => {
    const kill = e.target.closest('[data-kill]');
    if (kill) { e.stopPropagation(); deleteSlice(parseInt(kill.dataset.kill, 10)); return; }
    const chip = e.target.closest('[data-slice]');
    if (chip) activateSlice(parseInt(chip.dataset.slice, 10));
  });

  document.getElementById('btn-new').addEventListener('click', newFile);
  document.getElementById('btn-save').addEventListener('click', saveFile);
  document.getElementById('btn-new-block').addEventListener('click', newBlock);
  document.getElementById('btn-samples').addEventListener('click', async () => {
    await loadSamples();
    refresh();
  });
  document.getElementById('file-input').addEventListener('change', (e) => {
    if (e.target.files.length) loadFiles(e.target.files);
    e.target.value = '';
  });

  const fnInput = document.getElementById('filename-input');
  fnInput.addEventListener('change', () => {
    state.filename = fnInput.value.trim() || 'biome.json';
    saveLocal();
  });
}

// ──── Boot ───────────────────────────────────────────────────

async function boot() {
  initTheme();
  wireStaticUI();
  loadLocal();
  if (state.shelf.size === 0) await loadSamples();
  if (!state.currentId && state.shelf.size) {
    state.currentId = state.shelf.keys().next().value;
  }
  document.getElementById('filename-input').value = state.filename;
  refresh();

  window.addEventListener('storage', (e) => {
    if (e.key !== LS_SHELF && e.key !== LS_VIEWS) return;
    try {
      if (e.key === LS_SHELF) {
        const raw = localStorage.getItem(LS_SHELF);
        if (raw) state.shelf = new Map(Object.entries(JSON.parse(raw)));
      }
      if (e.key === LS_VIEWS) {
        const raw = localStorage.getItem(LS_VIEWS);
        state.slices = raw ? new Map(Object.entries(JSON.parse(raw))) : new Map();
      }
      refresh();
    } catch (err) { console.warn('cross-tab sync failed:', err); }
  });
}

boot();
