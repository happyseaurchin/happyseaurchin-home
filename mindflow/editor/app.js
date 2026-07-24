/**
 * mindflow/editor — multi-block pscale file editor.
 *
 * Load a { id: block, ... } JSON file, see + fine-tune blocks, save back.
 * Blockref entries in hidden directories resolve by id within the file.
 */

import { collectUnderscore, findHiddenLevel, getHiddenDirectory, floorDepth } from '../bsp.js';

// ──── Helpers ────────────────────────────────────────────────

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const digitKeys = (node) => isObj(node) ? '123456789'.split('').filter(d => d in node) : [];

// Zero-form (sunztone v5) ↔ underscore-form key rewrite. Used at load/save
// boundaries when state.zeroForm is on; in-memory shelf stays underscore-form
// so the rest of the editor (bsp.js, renderers) works unchanged.
function rewriteKeys(node, from, to) {
  if (!isObj(node)) return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    out[k === from ? to : k] = rewriteKeys(v, from, to);
  }
  return out;
}
const zeroToUnderscore = (n) => rewriteKeys(n, '0', '_');
const underscoreToZero = (n) => rewriteKeys(n, '_', '0');

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * Format an internal address (digits separated by '.', with '*' for star) as a
 * pscale number: single decimal at position `floor` from the left of each
 * star-segment. Floor-1 examples: "1" → "1", "1.2" → "1.2", "1.2.3" → "1.23".
 */
function toPscaleAddr(rawAddr, floor) {
  if (!rawAddr || rawAddr === '∅') return '∅';
  const fl = Math.max(1, floor | 0);
  return rawAddr.split('*').map((seg, idx) => {
    const digits = seg.replace(/\./g, '');
    if (!digits) return '';
    if (digits.length <= fl) return digits;
    return digits.slice(0, fl) + '.' + digits.slice(fl);
  }).join('*');
}

/**
 * Parse an absolute address like "1.2*1.3" into a path of { digit, via } steps.
 * '.' = normal separator, '*' = star (hidden dir). Works on both raw and
 * pscale-formatted addresses since both use '.' as a separator character.
 */
function parseAddressToPath(addrStr) {
  const path = [];
  let via = 'normal';
  for (const ch of addrStr) {
    if (ch === '.') { via = 'normal'; continue; }
    if (ch === '*') { via = 'star'; continue; }
    if ('123456789'.includes(ch)) {
      path.push({ digit: ch, via });
      via = 'normal';
    }
  }
  return path;
}

/** Classify a string in a pscale slot: 'address' | 'blockref' | 'text'. */
function classifyRef(s) {
  if (typeof s !== 'string') return 'text';
  const t = s.trim();
  if (!t) return 'text';
  if (/^\d[\d.]*\d$|^\d$/.test(t)) return 'address';
  if (t.length >= 2 && t.length <= 60 && !/\s/.test(t) && !/[.!?,;:"']/.test(t)
      && /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/i.test(t)) return 'blockref';
  return 'text';
}

// ──── State ──────────────────────────────────────────────────

const state = {
  shelf: new Map(),    // id -> block
  filename: 'blocks.json',
  currentId: null,
  view: 'doc',         // 'doc' | 'col'
  docMode: 'html',     // 'html' | 'md'
  walkMode: 'free',
  path: [],            // [{ digit, via }] — column clicks
  zeroForm: false,     // load/save in zero-form (sunztone v5): 0↔_ rewrite
};

let lastMd = '';

const currentBlock = () => state.currentId ? state.shelf.get(state.currentId) : null;

// ──── LocalStorage ───────────────────────────────────────────

const LS_SHELF = 'mindflow-editor:shelf';
const LS_FILENAME = 'mindflow-editor:filename';
const LS_THEME = 'mindflow-editor:theme';
const LS_VIEWS = 'mindflow-editor:views';  // { [blockId]: slice[] }
const LS_ZERO_FORM = 'mindflow-editor:zero-form';
const LS_BEACH = 'mindflow-editor:beach';  // last beach URL used in the loader
const LS_ORIGINS = 'mindflow-editor:beach-origins';  // { [blockId]: beachUrl } — where a block was loaded from (not secret)

// slice = { view, walkMode, path: [{digit, via}] }
// Each captures one "facet" / configured view the user has composed on a block.
// These travel to the filmstrip-3d visualiser as highlight selections —
// multiple slices per block union into the block's lit cubes.
state.slices = new Map();  // blockId -> slice[]

// blockId -> beach URL it was loaded from. Lets "push" default to the right
// beach. Origins are public, so this persists; passphrases never do.
state.beachOrigins = new Map();

function saveLocal() {
  try {
    const obj = {};
    state.shelf.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(LS_SHELF, JSON.stringify(obj));
    localStorage.setItem(LS_FILENAME, state.filename);
    const slicesObj = {};
    state.slices.forEach((v, k) => { if (v.length) slicesObj[k] = v; });
    localStorage.setItem(LS_VIEWS, JSON.stringify(slicesObj));
    localStorage.setItem(LS_ZERO_FORM, state.zeroForm ? '1' : '0');
    const originsObj = {};
    state.beachOrigins.forEach((v, k) => { if (v) originsObj[k] = v; });
    localStorage.setItem(LS_ORIGINS, JSON.stringify(originsObj));
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
    state.zeroForm = localStorage.getItem(LS_ZERO_FORM) === '1';
    const oraw = localStorage.getItem(LS_ORIGINS);
    if (oraw) state.beachOrigins = new Map(Object.entries(JSON.parse(oraw)));
  } catch (_) {}
}

// ──── Slices ────────────────────────────────────────────────

function pathToRawAddr(path) {
  return path.map((p, i) =>
    (i === 0 ? '' : (p.via === 'star' ? '*' : '.')) + p.digit
  ).join('');
}

function pathsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].digit !== b[i].digit || a[i].via !== b[i].via) return false;
  }
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
  if (currentSliceIndex() >= 0) return;  // already saved
  const slice = {
    view: state.view,
    walkMode: state.walkMode,
    path: state.path.map(p => ({ digit: p.digit, via: p.via })),
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
  state.path = s.path.map(p => ({ digit: p.digit, via: p.via }));
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
  chipsEl.innerHTML = list.map((s, i) => {
    const addr = pathToRawAddr(s.path) || '∅';
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
  function recurse(node, addr, depth) {
    const hLevel = Math.min(Math.max(depth + 1, 1), 6);
    const addrLabel = addr || '∅';
    const addrDisplay = toPscaleAddr(addrLabel, fl);

    if (typeof node === 'string') {
      out.push(`<div class="node">`);
      out.push(`<h${hLevel} class="node-heading"><span class="addr">${esc(addrDisplay)}</span><span class="sem leaf">${esc(node)}</span></h${hLevel}>`);
      out.push(`</div>`);
      return;
    }
    if (!isObj(node)) return;

    const sem = collectUnderscore(node);
    const hd = getHiddenDirectory(node);
    const children = digitKeys(node);

    out.push(`<div class="node">`);
    out.push(`<h${hLevel} class="node-heading"><span class="addr">${esc(addrDisplay)}</span>`);
    if (sem !== null) out.push(`<span class="sem">${esc(sem)}</span>`);
    else out.push(`<span class="sem-empty">(headless — zero-position interior)</span>`);
    out.push(`</h${hLevel}>`);

    if (hd) {
      out.push(`<div class="hidden">`);
      out.push(`<div class="hidden-label">hidden directory at <code>${esc(addrDisplay)}</code></div>`);
      for (const [d, v] of Object.entries(hd)) {
        const hAddr = `${addrLabel === '∅' ? '' : addrLabel}*${d}`;
        out.push(`<div class="hidden-entry"><span class="addr">${esc(toPscaleAddr(hAddr, fl))}</span>`);
        if (typeof v === 'string') {
          const kind = classifyRef(v);
          if (kind === 'address') {
            out.push(`<span class="ref ref-addr">@${esc(v)}</span>`);
          } else if (kind === 'blockref') {
            const has = state.shelf.has(v);
            out.push(`<a class="ref-link${has ? '' : ' broken'}"${has ? ` data-jump="${esc(v)}"` : ''}>${esc(v)}</a>`);
          } else {
            out.push(`<span class="sem">${esc(v)}</span>`);
          }
        } else if (isObj(v)) {
          out.push(`<span class="sem-empty">inline block</span></div>`);
          out.push(`<div class="inline-block">`);
          recurse(v, hAddr, depth + 1);
          out.push(`</div>`);
          continue;
        }
        out.push(`</div>`);
      }
      out.push(`</div>`);
    }

    if (children.length) {
      out.push(`<div class="children">`);
      for (const d of children) {
        const childAddr = addr ? `${addr}.${d}` : d;
        recurse(node[d], childAddr, depth + 1);
      }
      out.push(`</div>`);
    }
    out.push(`</div>`);
  }
  recurse(block, '', 0);
  return out.join('');
}

function renderDocMarkdown(block) {
  const lines = [];
  const fl = floorDepth(block);
  function recurse(node, addr, depth) {
    const h = '#'.repeat(Math.min(Math.max(depth + 1, 1), 6));
    const addrLabel = addr || '∅';
    const addrDisplay = toPscaleAddr(addrLabel, fl);

    if (typeof node === 'string') {
      lines.push(`${h} \`${addrDisplay}\` · ${node}`);
      lines.push('');
      return;
    }
    if (!isObj(node)) return;

    const sem = collectUnderscore(node);
    const hd = getHiddenDirectory(node);
    const children = digitKeys(node);

    if (sem !== null) lines.push(`${h} \`${addrDisplay}\` · ${sem}`);
    else lines.push(`${h} \`${addrDisplay}\` · *(headless — zero-position interior)*`);
    lines.push('');

    if (hd) {
      lines.push(`> **✦ hidden directory at \`${addrDisplay}\`**`);
      lines.push('>');
      for (const [d, v] of Object.entries(hd)) {
        const hAddr = `${addrLabel === '∅' ? '' : addrLabel}*${d}`;
        const hDisplay = toPscaleAddr(hAddr, fl);
        if (typeof v === 'string') {
          const kind = classifyRef(v);
          if (kind === 'address') lines.push(`> - \`${hDisplay}\` → **@${v}**`);
          else if (kind === 'blockref') lines.push(`> - \`${hDisplay}\` → **block:** \`${v}\``);
          else lines.push(`> - \`${hDisplay}\`: ${v}`);
        } else if (isObj(v)) {
          lines.push(`> - \`${hDisplay}\` — *inline block:* ${collectUnderscore(v) || '(headless)'}`);
        }
      }
      lines.push('');
    }

    for (const d of children) {
      const childAddr = addr ? `${addr}.${d}` : d;
      recurse(node[d], childAddr, depth + 1);
    }
  }
  recurse(block, '', 0);
  return lines.join('\n');
}

// ──── Render: dir view ───────────────────────────────────────

/**
 * Walk state.path inside a block and return { node, label }.
 * label is the absolute address string of the terminal (e.g. "1*1.2").
 */
function resolvePath(block, path) {
  let node = block;
  const parts = [];
  for (const step of path) {
    if (!isObj(node) || !(step.digit in node)) return null;
    const next = node[step.digit];
    if (step.via === 'star') {
      const hd = findHiddenLevel(next);
      if (!hd) return null;
      node = hd;
      parts.push(`*${step.digit}`);
    } else {
      node = next;
      parts.push((parts.length ? '.' : '') + step.digit);
    }
  }
  return { node, label: parts.join('') || '∅' };
}

function renderDir(block) {
  const resolved = resolvePath(block, state.path);
  if (!resolved) return `<div class="col-empty">Path not resolvable.</div>`;
  const { node, label } = resolved;
  const fl = floorDepth(block);

  const out = [];
  out.push(`<div class="dir-view">`);

  function recurse(n, addr, depth) {
    const indent = 12 + depth * 18;
    const addrLabel = addr || '∅';
    const addrDisplay = toPscaleAddr(addrLabel, fl);
    const hasStar = addrLabel.includes('*');

    if (typeof n === 'string') {
      out.push(`<div class="dir-row" data-nav="${esc(addrLabel)}" style="padding-left:${indent}px">`);
      out.push(`<span class="dir-addr${hasStar ? ' star' : ''}">${esc(addrDisplay)}</span>`);
      out.push(`<span class="dir-text leaf">${esc(n)}</span>`);
      out.push(`</div>`);
      return;
    }
    if (!isObj(n)) return;

    const sem = collectUnderscore(n);
    const hd = getHiddenDirectory(n);
    const children = digitKeys(n);

    out.push(`<div class="dir-row${depth === 0 ? ' root' : ''}" data-nav="${esc(addrLabel)}" style="padding-left:${indent}px">`);
    out.push(`<span class="dir-addr${hasStar ? ' star' : ''}">${esc(addrDisplay)}</span>`);
    if (sem !== null) out.push(`<span class="dir-text">${esc(sem)}</span>`);
    else out.push(`<span class="dir-text empty">(headless)</span>`);
    out.push(`</div>`);

    if (hd) {
      for (const [d, v] of Object.entries(hd)) {
        const hAddr = `${addrLabel === '∅' ? '' : addrLabel}*${d}`;
        const hIndent = 12 + (depth + 1) * 18;
        out.push(`<div class="dir-row hidden" data-nav="${esc(hAddr)}" style="padding-left:${hIndent}px">`);
        out.push(`<span class="dir-addr star">${esc(toPscaleAddr(hAddr, fl))}</span>`);
        if (typeof v === 'string') {
          const kind = classifyRef(v);
          if (kind === 'address') {
            out.push(`<span class="dir-text ref">@${esc(v)}</span>`);
          } else if (kind === 'blockref') {
            const has = state.shelf.has(v);
            out.push(`<span class="dir-text ref${has ? ' jump' : ' broken'}" ${has ? `data-jump="${esc(v)}"` : ''}>→ ${esc(v)}${has ? '' : ' (missing)'}</span>`);
          } else {
            out.push(`<span class="dir-text">${esc(v)}</span>`);
          }
        } else if (isObj(v)) {
          out.push(`<span class="dir-text empty">inline: ${esc(collectUnderscore(v) || '(headless)')}</span>`);
        }
        out.push(`</div>`);
      }
    }

    for (const d of children) {
      const childAddr = addr ? `${addr}.${d}` : d;
      recurse(n[d], childAddr, depth + 1);
    }
  }

  // Start rendering at the resolved node, using absolute address as the root label.
  recurse(node, label === '∅' ? '' : label, 0);
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

function buildColumns(block, path) {
  const columns = [];

  function buildColumn(source, kind, selectedDigit, depth) {
    const cells = [];
    for (const d of '123456789') {
      if (!(d in source)) continue;
      const v = source[d];
      const cell = { digit: d };
      if (typeof v === 'string') {
        cell.text = v;
        cell.isLeaf = true;
        cell.refKind = classifyRef(v);
        cell.hasHidden = false;
      } else if (isObj(v)) {
        cell.text = collectUnderscore(v);
        cell.isLeaf = false;
        cell.hasHidden = getHiddenDirectory(v) !== null;
      } else {
        cell.text = String(v);
        cell.isLeaf = true;
      }
      cells.push(cell);
    }
    return { kind, cells, selectedDigit, depth };
  }

  let source = block;
  let kind = 'normal';
  columns.push(buildColumn(source, kind, path[0]?.digit || null, 0));

  for (let i = 0; i < path.length; i++) {
    const step = path[i];
    const child = source[step.digit];
    if (!isObj(child)) break;

    if (step.via === 'star') {
      const hd = getHiddenDirectory(child);
      if (!hd) break;
      source = hd;
      kind = 'star';
    } else {
      source = child;
      kind = 'normal';
    }
    columns.push(buildColumn(source, kind, path[i + 1]?.digit || null, i + 1));
  }

  return columns;
}

/**
 * Render a walked path as a clickable pscale number: decimal placed after the
 * `floor`-th digit of each star-segment. `*` separates segments. Each digit is
 * independently clickable (data-trunc truncates the path there).
 */
function formatPathNumber(path, floor, pieceClass, sepClass) {
  const fl = Math.max(1, floor | 0);
  const out = [];
  let segPos = 0;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (p.via === 'star') {
      out.push(`<span class="${sepClass}">*</span>`);
      segPos = 0;
    } else if (segPos === fl) {
      out.push(`<span class="${sepClass}">.</span>`);
    }
    out.push(`<span class="${pieceClass}${p.via === 'star' ? ' star' : ''}" data-trunc="${i + 1}">${esc(p.digit)}</span>`);
    segPos++;
  }
  return out.join('');
}

function formatColPath(path, rootId, floor) {
  const root = `<span class="path-root" data-trunc="0">${esc(rootId || '∅')}</span>`;
  if (!path.length) return root;
  return `${root}<span class="path-number">${formatPathNumber(path, floor, 'path-piece', 'path-sep')}</span>`;
}

function applyWalkHighlight(mode, colIdx, cell, col, terminalColIdx) {
  if (mode === 'free') return null;
  const inPath = cell.digit === col.selectedDigit;
  const terminal = inPath && colIdx === terminalColIdx;
  if (mode === 'spindle') return inPath ? 'lit' : 'dim';
  if (mode === 'point') return terminal ? 'lit' : 'dim';
  if (mode === 'ring') {
    if (colIdx !== terminalColIdx) return 'dim';
    return terminal ? null : 'ring';
  }
  if (mode === 'disc') {
    if (colIdx !== terminalColIdx) return 'dim';
    return 'lit';
  }
  if (mode === 'star') return cell.hasHidden ? 'lit' : 'dim';
  return null;
}

function renderColumns(block) {
  const columns = buildColumns(block, state.path);
  const terminalColIdx = state.path.length - 1;
  const fl = floorDepth(block);
  const out = [];
  out.push(`<div class="col-view">`);
  const pushable = state.path.length && !state.path.some(p => p.via === 'star');
  const pushTitle = pushable ? 'Push this rung to a beach (write)' : 'Select a normal (non-star) rung to push';
  out.push(`<div class="col-path">${formatColPath(state.path, state.currentId, fl)}`
    + `<button id="btn-push-rung" class="push-btn"${pushable ? '' : ' disabled'} title="${pushTitle}">&#8593; push</button>`
    + `</div>`);
  out.push(`<div class="columns-wrap">`);

  if (!columns.length) out.push(`<div class="col-empty">Block has no digit children.</div>`);

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    out.push(`<div class="column${col.kind === 'star' ? ' star-col' : ''}">`);
    out.push(`<div class="col-header">${col.kind === 'star' ? `★ hidden · depth ${ci}` : `depth ${ci}`}</div>`);
    if (!col.cells.length) out.push(`<div class="col-empty">(no entries)</div>`);

    for (const cell of col.cells) {
      const classes = ['cell'];
      const isSelected = cell.digit === col.selectedDigit;
      const isTerminal = isSelected && ci === terminalColIdx;
      if (isSelected) classes.push('in-path');
      if (isTerminal) classes.push('selected');
      if (cell.refKind === 'address') classes.push('addr-ref');
      else if (cell.refKind === 'blockref') classes.push('ref-leaf');

      const hl = applyWalkHighlight(state.walkMode, ci, cell, col, terminalColIdx);
      if (hl === 'lit') classes.push('highlight');
      else if (hl === 'ring') classes.push('highlight-ring');
      else if (hl === 'dim') classes.push('dimmed');

      const data = `data-col="${ci}" data-digit="${esc(cell.digit)}"`;
      out.push(`<div class="${classes.join(' ')}" ${data}>`);
      out.push(`<span class="cell-digit">${cell.digit}</span>`);
      out.push(`<div class="cell-body">`);
      if (cell.text) {
        if (cell.refKind === 'address') out.push(`<div class="cell-text">@${esc(cell.text)}</div>`);
        else out.push(`<div class="cell-text">${esc(cell.text)}</div>`);
      } else if (cell.isLeaf) {
        out.push(`<div class="cell-text empty">(empty)</div>`);
      } else {
        out.push(`<div class="cell-text empty">(headless)</div>`);
      }

      const markers = [];
      if (!cell.isLeaf) markers.push(`<span class="marker marker-branch">▸ branch</span>`);
      if (cell.hasHidden) markers.push(`<span class="marker marker-hidden" data-star="1" ${data}>✦ star</span>`);
      if (cell.refKind === 'blockref') {
        const has = state.shelf.has(cell.text);
        if (has) markers.push(`<span class="marker marker-jump" data-jump="${esc(cell.text)}">→ jump</span>`);
        else markers.push(`<span class="marker marker-broken">→ missing</span>`);
      }
      if (markers.length) out.push(`<div class="cell-markers">${markers.join('')}</div>`);
      out.push(`</div></div>`);
    }
    out.push(`</div>`);
  }
  out.push(`</div></div>`);
  return out.join('');
}

// ──── Mutation ───────────────────────────────────────────────

/**
 * Replace the semantic text at path inside the current block.
 * Walk source via path[0..k-1]; at path[k] the target is source[digit].
 * - string target → replace in place
 * - object target → follow _._ chain, replace deepest string
 */
function mutateAtPath(block, path, newText) {
  let source = block;
  for (let i = 0; i < path.length - 1; i++) {
    const step = path[i];
    if (!isObj(source) || !(step.digit in source)) return false;
    const advanced = source[step.digit];
    if (step.via === 'star') {
      source = findHiddenLevel(advanced);
      if (!source) return false;
    } else {
      source = advanced;
    }
  }
  const last = path[path.length - 1];
  if (!isObj(source) || !(last.digit in source)) return false;
  const target = source[last.digit];

  if (typeof target === 'string') {
    source[last.digit] = newText;
    return true;
  }
  if (isObj(target)) {
    let t = target;
    while (isObj(t) && '_' in t) {
      if (typeof t._ === 'string') { t._ = newText; return true; }
      if (!isObj(t._)) break;
      t = t._;
    }
    if (isObj(t) && !('_' in t)) { t._ = newText; return true; }
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
    const preview = collectUnderscore(block) || '(headless)';
    const cur = id === state.currentId ? ' current' : '';
    out.push(`<div class="block-item${cur}" data-id="${esc(id)}">`);
    out.push(`<div class="block-item-id"><span>${esc(id)}</span>`);
    out.push(`<span class="block-item-actions">`);
    out.push(`<button class="item-btn" data-raw="${esc(id)}" title="View raw JSON">{ }</button>`);
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
    body.innerHTML = `<div class="empty-state">Select a block from the left, or load a file of blocks.</div>`;
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
    const raw = state.path
      .map((p, i) => (i === 0 ? '' : (p.via === 'star' ? '*' : '.')) + p.digit)
      .join('');
    addr = '@' + toPscaleAddr(raw, fl);
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
  document.querySelectorAll('[data-raw]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openRawModal(el.dataset.raw);
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

  // Doc view blockref jumps
  document.querySelectorAll('a.ref-link[data-jump]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = el.dataset.jump;
      if (state.shelf.has(id)) selectBlock(id);
    });
  });

  // Column view cells
  document.querySelectorAll('#view-body .cell').forEach(el => {
    let clickTimer = null;
    el.addEventListener('click', (e) => {
      if (e.target.closest('.marker-hidden') || e.target.closest('.marker-jump')) return;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        const col = parseInt(el.dataset.col, 10);
        const digit = el.dataset.digit;
        navCell(col, digit, false);
      }, 240);
    });
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('.marker-hidden') || e.target.closest('.marker-jump')) return;
      clearTimeout(clickTimer);
      const col = parseInt(el.dataset.col, 10);
      const digit = el.dataset.digit;
      state.path = state.path.slice(0, col);
      state.path.push({ digit, via: 'normal' });
      enterEdit(el);
    });
  });

  document.querySelectorAll('.marker-hidden').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const col = parseInt(el.dataset.col, 10);
      const digit = el.dataset.digit;
      navCell(col, digit, true);
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
      const addr = el.dataset.nav;
      state.path = (!addr || addr === '∅') ? [] : parseAddressToPath(addr);
      refresh();
    });
  });

  // dir-view blockref jumps (leaf in hidden dir)
  document.querySelectorAll('.dir-text[data-jump]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.jump;
      if (state.shelf.has(id)) selectBlock(id);
    });
  });

  // Scoped-only [data-trunc] for column view (dir breadcrumb already wires its own)
  document.querySelectorAll('.col-path [data-trunc]').forEach(el => {
    el.addEventListener('click', () => {
      state.path = state.path.slice(0, parseInt(el.dataset.trunc, 10));
      refresh();
    });
  });

  // Push the selected rung to a beach (write path).
  const pushBtn = document.getElementById('btn-push-rung');
  if (pushBtn) pushBtn.addEventListener('click', () => { if (!pushBtn.disabled) openPushModal(); });
}

function enterEdit(cellEl) {
  const textEl = cellEl.querySelector('.cell-text');
  if (!textEl || cellEl.querySelector('.col-edit')) return;
  const original = textEl.textContent.replace(/^@/, '');
  const body = cellEl.querySelector('.cell-body');

  const ta = document.createElement('textarea');
  ta.className = 'col-edit';
  ta.value = original === '(empty)' || original === '(headless)' ? '' : original;
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
  // Show the block as it would be SAVED: zero-form when the 0-form toggle is
  // on, underscore-form otherwise — so "raw" matches the file on disk.
  const out = state.zeroForm ? underscoreToZero(block) : block;
  overlay.querySelector('.raw-title').textContent = `${id}.json — raw${state.zeroForm ? ' · 0-form' : ''}`;
  overlay.querySelector('.raw-pre').textContent = JSON.stringify(out, null, 2);
  overlay.classList.add('open');
}

function closeRawModal() {
  document.getElementById('raw-modal')?.classList.remove('open');
}

// ──── Navigation / state mutators ────────────────────────────

function navCell(colIdx, digit, viaStar) {
  state.path = state.path.slice(0, colIdx);
  state.path.push({ digit, via: viaStar ? 'star' : 'normal' });
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
  // Rebuild map to preserve insertion order
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
  state.shelf.set(id, { _: 'New block.' });
  selectBlock(id);
}

function newFile() {
  if (state.shelf.size > 0 && !confirm('Start a new file? Unsaved changes in this session will be lost.')) return;
  state.shelf = new Map();
  state.currentId = null;
  state.path = [];
  state.filename = 'blocks.json';
  document.getElementById('filename-input').value = state.filename;
  refresh();
}

async function loadFile(file) {
  try {
    const text = await file.text();
    let data = JSON.parse(text);
    if (!isObj(data)) { alert('File must be a JSON object.'); return; }
    if (state.zeroForm) data = zeroToUnderscore(data);

    // Heuristic: a single block has "_" or digit keys at top.
    const keys = Object.keys(data);
    const looksLikeSingleBlock = keys.includes('_') || keys.some(k => '123456789'.includes(k));

    if (looksLikeSingleBlock) {
      const id = file.name.replace(/\.json$/, '') || 'block';
      state.shelf = new Map([[id, data]]);
    } else {
      state.shelf = new Map();
      for (const [id, block] of Object.entries(data)) {
        if (isObj(block)) state.shelf.set(id, block);
      }
    }
    state.filename = file.name || 'blocks.json';
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
  let filename = document.getElementById('filename-input').value.trim() || 'blocks.json';
  if (!filename.endsWith('.json')) filename += '.json';
  state.filename = filename;
  const out = state.zeroForm ? underscoreToZero(obj) : obj;
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  saveLocal();
}

function syncZeroFormButton() {
  const btn = document.getElementById('btn-zero-form');
  if (!btn) return;
  btn.textContent = `0-form: ${state.zeroForm ? 'on' : 'off'}`;
  btn.classList.toggle('active', state.zeroForm);
}

async function loadSamples() {
  try {
    const [a, b] = await Promise.all([
      fetch('../explorer/blocks/starstone.json').then(r => r.json()),
      fetch('../explorer/blocks/starstone-lean.json').then(r => r.json()),
    ]);
    state.shelf.set('starstone', a);
    state.shelf.set('starstone-lean', b);
    if (!state.currentId) state.currentId = 'starstone-lean';
  } catch (e) {
    console.warn('Sample load failed:', e);
  }
}

// ──── Beach loader (read-only) ───────────────────────────────
// Pull live blocks off a federated beach via plain GET. A beach serves its
// named blocks at /.well-known/pscale-beach: no ?block= lists them under
// `.blocks`; ?block=<name> returns the block itself. Beaches send
// `access-control-allow-origin: *`, so the browser fetches directly — no
// proxy, no key, no write path. Loaded blocks are ADDED to the shelf (like
// loadSamples), not replacing it.

const beachState = { url: null, blocks: [] };  // the connected beach + its index

// The beach the loader defaults to when nothing else is remembered.
const DEFAULT_BEACH = 'beach.happyseaurchin.com';

// Accept a bare host, an origin, or a full .well-known URL; return the
// canonical pscale-beach URL. Production beaches are https; http is allowed
// only for localhost so the offline local-beach rig can be pointed at.
const isLocalHost = (h) => h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
function normalizeBeachUrl(input) {
  let s = (input || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;   // bare host → https origin
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && isLocalHost(u.hostname))) return null;
  if (u.pathname === '/' || u.pathname === '') u.pathname = '/.well-known/pscale-beach';
  u.search = ''; u.hash = '';
  return u.toString();
}

async function fetchBeachIndex(beachUrl) {
  const r = await fetch(beachUrl);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
  let origin = data?.origin;
  if (!origin) { try { origin = new URL(beachUrl).hostname; } catch { origin = beachUrl; } }
  return { origin, blocks };
}

async function fetchBeachBlock(beachUrl, name) {
  const u = new URL(beachUrl);
  u.searchParams.set('block', name);   // encodes ':' etc.; the beach accepts %3A
  const r = await fetch(u);
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  if (!isObj(data)) throw new Error('not a block');
  // Mirror loadFile: if the 0-form toggle is on, treat incoming as zero-form.
  return state.zeroForm ? zeroToUnderscore(data) : data;
}

// Federation discovery: a beach's `lighthouse` block curates neighbouring
// beaches (position 6 by convention) and its `worlds` block lists sub-beaches
// (`<name> → <host>`; `/w/…` path-routed worlds are skipped — not a plain host).
// Best-effort: any block that's missing just yields fewer neighbours. Returns
// [{ label, host, url }] deduped by origin, excluding the beach itself.
async function discoverBeaches(beachUrl) {
  const found = new Map();  // origin -> { label, host, url }
  let selfOrigin = null;
  try { selfOrigin = new URL(beachUrl).origin; } catch (_) {}
  const add = (hostish, label) => {
    const cleaned = String(hostish || '').replace(/[).,;]+$/, '');  // trim trailing sentence punctuation
    const url = normalizeBeachUrl(cleaned);
    if (!url) return;
    let origin, host;
    try { const u = new URL(url); origin = u.origin; host = u.host; } catch { return; }
    if (origin === selfOrigin) return;
    if (!found.has(origin)) found.set(origin, { label: label || host, host, url });
  };
  const [lh, worlds] = await Promise.all([
    fetchBeachBlock(beachUrl, 'lighthouse').catch(() => null),
    fetchBeachBlock(beachUrl, 'worlds').catch(() => null),
  ]);
  if (lh) {
    for (const m of JSON.stringify(lh).match(/https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?/g) || []) add(m);
  }
  if (worlds) {
    for (const v of Object.values(worlds)) {
      if (typeof v !== 'string' || !v.includes('→')) continue;
      const [name, route] = v.split('→').map(s => s.trim());
      if (!route || route.startsWith('/')) continue;  // /w/ jungle worlds aren't host-addressable here
      add(route, name);
    }
  }
  return [...found.values()];
}

function renderBeachChips(neighbours) {
  const el = document.getElementById('beach-chips');
  if (!el) return;
  if (!neighbours || !neighbours.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<span class="beach-chips-label">other beaches</span>`
    + neighbours.map(n =>
        `<span class="beach-chip" data-beach="${esc(n.host)}" title="${esc(n.url)}">${esc(n.label)}</span>`
      ).join('');
}

function setBeachStatus(msg, kind) {
  const el = document.getElementById('beach-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'beach-status' + (kind ? ' ' + kind : '');
}

function renderBeachList(blocks, filter) {
  const listEl = document.getElementById('beach-list');
  if (!listEl) return;
  if (!blocks || !blocks.length) { listEl.innerHTML = ''; return; }
  const f = (filter || '').trim().toLowerCase();
  const shown = f ? blocks.filter(n => n.toLowerCase().includes(f)) : blocks;
  if (!shown.length) { listEl.innerHTML = `<div class="beach-empty">no blocks match "${esc(f)}"</div>`; return; }
  const rows = shown.map(name => {
    const have = state.shelf.has(name);
    return `<div class="beach-row">
      <span class="beach-name">${esc(name)}${have ? '<span class="beach-have" title="Already on the shelf — loading overwrites it">on shelf</span>' : ''}</span>
      <button class="beach-load" data-load="${esc(name)}">${have ? 'reload' : 'load'}</button>
    </div>`;
  }).join('');
  // "load all" only when the shown set is small enough to be a sane bulk pull.
  const allRow = (shown.length >= 2 && shown.length <= 25)
    ? `<div class="beach-row beach-row-all"><span class="beach-name muted">${f ? `all ${shown.length} shown` : `all ${shown.length} blocks`}</span><button class="beach-load" data-load-all="1">load all</button></div>`
    : '';
  listEl.innerHTML = rows + allRow;
}

// Current filter text (empty string if no filter box).
const beachFilterValue = () => (document.getElementById('beach-filter')?.value || '');

async function beachConnect(rawInput) {
  const beachUrl = normalizeBeachUrl(rawInput);
  const listEl = document.getElementById('beach-list');
  const filterEl = document.getElementById('beach-filter');
  if (listEl) listEl.innerHTML = '';
  if (filterEl) { filterEl.hidden = true; filterEl.value = ''; }
  if (!beachUrl) { setBeachStatus('Enter a beach host or https:// URL.', 'error'); return; }
  let host = beachUrl;
  try { host = new URL(beachUrl).hostname; } catch (_) {}
  setBeachStatus(`Connecting to ${host}…`, '');
  try {
    const { origin, blocks } = await fetchBeachIndex(beachUrl);
    beachState.url = beachUrl;
    beachState.blocks = blocks;
    localStorage.setItem(LS_BEACH, beachUrl);
    if (!blocks.length) setBeachStatus(`No named blocks at ${origin}.`, '');
    else {
      setBeachStatus(`${blocks.length} block${blocks.length === 1 ? '' : 's'} at ${origin}`, 'ok');
      if (filterEl && blocks.length > 12) filterEl.hidden = false;
      renderBeachList(blocks);
    }
    // Federation discovery runs in the background — chips appear when ready.
    discoverBeaches(beachUrl).then(renderBeachChips).catch(() => {});
  } catch (e) {
    setBeachStatus(`Could not reach beach: ${e.message}`, 'error');
  }
}

async function beachLoadBlock(name) {
  if (!beachState.url) return;
  setBeachStatus(`Loading ${name}…`, '');
  try {
    const block = await fetchBeachBlock(beachState.url, name);
    state.shelf.set(name, block);
    state.beachOrigins.set(name, beachState.url);   // remember where it came from
    selectBlock(name);                     // sets currentId + refresh()
    renderBeachList(beachState.blocks, beachFilterValue());   // update "on shelf" markers
    setBeachStatus(`Loaded ${name} ✓`, 'ok');
  } catch (e) {
    setBeachStatus(`Failed to load ${name}: ${e.message}`, 'error');
  }
}

// Load a specific block by name from the beach field — no need to connect and
// scroll the index first. Targets whatever host is in the beach field.
async function beachLoadNamed() {
  const beachUrl = normalizeBeachUrl(document.getElementById('beach-url')?.value);
  if (!beachUrl) { setBeachStatus('Enter a beach host first.', 'error'); return; }
  const name = (document.getElementById('beach-block')?.value || '').trim();
  if (!name) { setBeachStatus('Type a block name to load — or use connect to list them.', 'error'); return; }
  beachState.url = beachUrl;
  localStorage.setItem(LS_BEACH, beachUrl);
  await beachLoadBlock(name);
}

async function beachLoadAll() {
  if (!beachState.url || !beachState.blocks.length) return;
  const f = beachFilterValue().trim().toLowerCase();
  const names = (f ? beachState.blocks.filter(n => n.toLowerCase().includes(f)) : beachState.blocks).slice();
  if (!names.length) return;
  setBeachStatus(`Loading ${names.length} blocks…`, '');
  const results = await Promise.allSettled(names.map(n => fetchBeachBlock(beachState.url, n)));
  const failed = [];
  let firstLoaded = null;
  results.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      state.shelf.set(names[i], res.value);
      state.beachOrigins.set(names[i], beachState.url);
      if (!firstLoaded) firstLoaded = names[i];
    } else {
      failed.push(names[i]);
    }
  });
  const ok = names.length - failed.length;
  if (firstLoaded && !state.currentId) selectBlock(firstLoaded);
  else refresh();
  renderBeachList(beachState.blocks, beachFilterValue());
  setBeachStatus(
    failed.length ? `Loaded ${ok}; failed: ${failed.join(', ')}` : `Loaded all ${ok} ✓`,
    failed.length ? 'error' : 'ok'
  );
}

function openBeachModal() {
  let overlay = document.getElementById('beach-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'beach-modal';
    overlay.innerHTML = `
      <div class="beach-box">
        <header><span class="beach-title">Load from beach · read-only</span>
          <button id="beach-close" title="Close (Esc)">close</button>
        </header>
        <div class="beach-body">
          <div class="beach-connect">
            <input id="beach-url" type="text" spellcheck="false"
              placeholder="beach host — e.g. beach.happyseaurchin.com">
            <button id="beach-connect-btn" title="List every block on this beach">connect</button>
          </div>
          <div class="beach-connect">
            <input id="beach-block" type="text" spellcheck="false"
              placeholder="block name (optional) — e.g. lighthouse, spatial:urb">
            <button id="beach-load-one" title="Load this one block directly">load</button>
          </div>
          <div class="beach-status" id="beach-status"></div>
          <div class="beach-chips" id="beach-chips"></div>
          <input id="beach-filter" class="beach-filter" type="text" spellcheck="false" placeholder="filter blocks…" hidden>
          <div class="beach-list" id="beach-list"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBeachModal(); });
    overlay.querySelector('#beach-close').addEventListener('click', closeBeachModal);
    const urlInput = overlay.querySelector('#beach-url');
    const blockInput = overlay.querySelector('#beach-block');
    overlay.querySelector('#beach-connect-btn').addEventListener('click', () => beachConnect(urlInput.value));
    urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') beachConnect(urlInput.value); });
    overlay.querySelector('#beach-load-one').addEventListener('click', beachLoadNamed);
    blockInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') beachLoadNamed(); });
    // Neighbour-beach chips: switch the field and reconnect.
    overlay.querySelector('#beach-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-beach]');
      if (!chip) return;
      urlInput.value = chip.dataset.beach;
      beachConnect(chip.dataset.beach);
    });
    // Live filter over the (possibly large) block index.
    overlay.querySelector('#beach-filter').addEventListener('input', (e) => {
      renderBeachList(beachState.blocks, e.target.value);
    });
    overlay.querySelector('#beach-list').addEventListener('click', (e) => {
      const all = e.target.closest('[data-load-all]');
      if (all) { beachLoadAll(); return; }
      const one = e.target.closest('[data-load]');
      if (one) beachLoadBlock(one.dataset.load);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeBeachModal();
    });
  }
  // Default to the last beach used, else the house beach — and connect straight
  // away so the modal opens already showing blocks + neighbour beaches.
  let prefill = DEFAULT_BEACH;
  const last = localStorage.getItem(LS_BEACH);
  if (last) { try { prefill = new URL(last).origin; } catch { prefill = last; } }
  overlay.querySelector('#beach-url').value = prefill;
  overlay.querySelector('#beach-block').value = '';
  overlay.querySelector('#beach-chips').innerHTML = '';
  overlay.querySelector('#beach-list').innerHTML = '';
  const filterEl = overlay.querySelector('#beach-filter');
  filterEl.value = ''; filterEl.hidden = true;
  setBeachStatus('', '');
  overlay.classList.add('open');
  overlay.querySelector('#beach-block').focus();
  beachConnect(prefill);
}

function closeBeachModal() {
  document.getElementById('beach-modal')?.classList.remove('open');
}

// ──── Beach push (write path — per rung) ─────────────────────
// Push the value at the selected rung back to a beach:
//   POST ?block=<name>  body {spindle, content, secret?}
// `spindle` is the pscale address the editor already shows (toPscaleAddr) —
// the beach's parseSpindle wants that decimal form, not the raw dotted path.
// `content` is the node at that rung (a string leaf, or the whole sub-block
// for a branch — the beach's writeAt REPLACES the position, so a branch push
// carries its children so they aren't dropped). Per-position writes never
// need {confirm}; that's whole-block replace only. The rung's lock gates it:
// unlocked → no secret needed; locked → the passphrase, which the beach hashes
// against (origin, block, position). Passphrases live in memory for the
// session only — never localStorage.

const beachSecrets = new Map();   // `${beachUrl} ${blockId}` -> secret (session only)
const secretKey = (url, id) => `${url} ${id}`;

// Walk the current block down a normal-spine path to the terminal node.
// Star (hidden-dir) steps aren't point-writable on a beach, so callers gate
// them out before here.
function valueAtPath(block, path) {
  let node = block;
  for (const step of path) {
    if (!isObj(node) || !(step.digit in node)) return undefined;
    node = node[step.digit];
  }
  return node;
}

// Is the current selection something we can push? (a normal-spine rung of the
// current block). Returns { ok, reason }.
function pushPrecheck() {
  if (!state.currentId || !currentBlock()) return { ok: false, reason: 'no block selected' };
  if (!state.path.length) return { ok: false, reason: 'select a rung first (click a cell)' };
  if (state.path.some(p => p.via === 'star')) return { ok: false, reason: 'hidden (star) rungs are not point-writable on a beach' };
  return { ok: true };
}

function setPushStatus(msg, kind) {
  const el = document.getElementById('push-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'push-status' + (kind ? ' ' + kind : '');
}

function closePushModal() {
  document.getElementById('push-modal')?.classList.remove('open');
}

function openPushModal() {
  const block = currentBlock();
  const check = pushPrecheck();
  if (!check.ok || !block) return;

  const fl = floorDepth(block);
  const spindle = toPscaleAddr(pathToRawAddr(state.path), fl);
  const content = valueAtPath(block, state.path);
  if (content === undefined) return;
  const isLeaf = typeof content === 'string';

  let overlay = document.getElementById('push-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'push-modal';
    overlay.innerHTML = `
      <div class="push-box">
        <header><span class="push-title">Push rung to beach · write</span>
          <button id="push-close" title="Close (Esc)">close</button>
        </header>
        <div class="push-body">
          <label class="push-field"><span>beach</span>
            <input id="push-beach" type="text" spellcheck="false" placeholder="beach.happyseaurchin.com"></label>
          <div class="push-row"><span class="push-k">block</span><span id="push-block" class="push-v"></span></div>
          <div class="push-row"><span class="push-k">rung</span><span id="push-addr" class="push-v"></span></div>
          <div class="push-row"><span class="push-k">content</span><span id="push-content" class="push-v"></span></div>
          <label class="push-field"><span>passphrase</span>
            <input id="push-secret" type="password" spellcheck="false" placeholder="only if this rung is locked"></label>
          <div class="push-status" id="push-status"></div>
          <div class="push-actions"><button id="push-go">push &#8593;</button></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePushModal(); });
    overlay.querySelector('#push-close').addEventListener('click', closePushModal);
    overlay.querySelector('#push-go').addEventListener('click', doPush);
    overlay.querySelector('#push-secret').addEventListener('keydown', (e) => { if (e.key === 'Enter') doPush(); });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closePushModal();
    });
  }

  const defaultBeach = state.beachOrigins.get(state.currentId) || localStorage.getItem(LS_BEACH) || '';
  overlay.querySelector('#push-beach').value = defaultBeach;
  overlay.querySelector('#push-block').textContent = state.currentId;
  overlay.querySelector('#push-addr').textContent = '@' + spindle;
  const contentEl = overlay.querySelector('#push-content');
  contentEl.textContent = isLeaf
    ? (content.length > 90 ? content.slice(0, 90) + '…' : content)
    : `branch — ${digitKeys(content).length} child rung(s); pushes the whole subtree`;
  contentEl.className = 'push-v' + (isLeaf ? '' : ' branch');
  const norm = normalizeBeachUrl(defaultBeach);
  overlay.querySelector('#push-secret').value = (norm && beachSecrets.get(secretKey(norm, state.currentId))) || '';
  setPushStatus(
    isLeaf ? '' : 'Branch rung — pushing replaces its whole subtree on the beach.',
    isLeaf ? '' : 'warn'
  );
  overlay.classList.add('open');
  overlay.querySelector('#push-beach').focus();
}

async function doPush() {
  const block = currentBlock();
  const check = pushPrecheck();
  if (!check.ok || !block) { setPushStatus(check.reason || 'cannot push', 'error'); return; }

  const beachUrl = normalizeBeachUrl(document.getElementById('push-beach').value);
  if (!beachUrl) { setPushStatus('Enter a valid beach host (https, or http://localhost).', 'error'); return; }

  const fl = floorDepth(block);
  const spindle = toPscaleAddr(pathToRawAddr(state.path), fl);
  const content = valueAtPath(block, state.path);
  if (content === undefined) { setPushStatus('Nothing at that rung to push.', 'error'); return; }
  const secret = document.getElementById('push-secret').value;

  const body = { spindle, content };
  if (secret) body.secret = secret;

  setPushStatus('Pushing…', '');
  try {
    const u = new URL(beachUrl);
    u.searchParams.set('block', state.currentId);
    const r = await fetch(u, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => null);
    if (r.ok && data && data.ok) {
      if (secret) beachSecrets.set(secretKey(beachUrl, state.currentId), secret);
      state.beachOrigins.set(state.currentId, beachUrl);
      saveLocal();
      setPushStatus(`Pushed @${spindle} ✓`, 'ok');
      return;
    }
    if (r.status === 403) {
      setPushStatus(`Locked — ${data?.error || 'passphrase required or does not match'}.`, 'error');
      return;
    }
    setPushStatus(`Beach rejected it: ${data?.error || ('HTTP ' + r.status)}`, 'error');
  } catch (e) {
    setPushStatus(`Could not reach beach: ${e.message}`, 'error');
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
  // View tabs — col and dir share state.path (both scope to a chosen node);
  // switching to doc leaves path alone so returning restores it.
  document.querySelectorAll('.tab').forEach(el => {
    el.addEventListener('click', () => {
      const v = el.dataset.view;
      state.view = v;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
      document.querySelectorAll('.view-controls').forEach(c => { c.hidden = c.dataset.for !== v; });
      refresh();
    });
  });

  // Walk mode
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
  document.getElementById('btn-beach').addEventListener('click', openBeachModal);
  document.getElementById('btn-new-block').addEventListener('click', newBlock);
  document.getElementById('btn-zero-form').addEventListener('click', () => {
    state.zeroForm = !state.zeroForm;
    syncZeroFormButton();
    saveLocal();
  });
  document.getElementById('file-input').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) loadFile(f);
    e.target.value = '';
  });

  const fnInput = document.getElementById('filename-input');
  fnInput.addEventListener('change', () => {
    state.filename = fnInput.value.trim() || 'blocks.json';
    saveLocal();
  });
}

// ──── Boot ───────────────────────────────────────────────────

async function boot() {
  initTheme();
  wireStaticUI();
  loadLocal();
  syncZeroFormButton();
  if (state.shelf.size === 0) await loadSamples();
  if (!state.currentId && state.shelf.size) {
    state.currentId = state.shelf.keys().next().value;
  }
  document.getElementById('filename-input').value = state.filename;
  refresh();

  // Cross-tab sync: the filmstrip-3d viewer writes back to LS_SHELF when
  // user updates text there. Pick up those changes so the editor stays in
  // step (and a subsequent "save file" serialises the latest shelf).
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
