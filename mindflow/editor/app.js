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
};

let lastMd = '';

const currentBlock = () => state.currentId ? state.shelf.get(state.currentId) : null;

// ──── LocalStorage ───────────────────────────────────────────

const LS_SHELF = 'mindflow-editor:shelf';
const LS_FILENAME = 'mindflow-editor:filename';
const LS_THEME = 'mindflow-editor:theme';

function saveLocal() {
  try {
    const obj = {};
    state.shelf.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(LS_SHELF, JSON.stringify(obj));
    localStorage.setItem(LS_FILENAME, state.filename);
  } catch (_) {}
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_SHELF);
    if (raw) state.shelf = new Map(Object.entries(JSON.parse(raw)));
    const fn = localStorage.getItem(LS_FILENAME);
    if (fn) state.filename = fn;
  } catch (_) {}
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
  out.push(`<div class="col-path">${formatColPath(state.path, state.currentId, fl)}</div>`);
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
    const data = JSON.parse(text);
    if (!isObj(data)) { alert('File must be a JSON object.'); return; }

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
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  saveLocal();
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

  document.getElementById('btn-new').addEventListener('click', newFile);
  document.getElementById('btn-save').addEventListener('click', saveFile);
  document.getElementById('btn-new-block').addEventListener('click', newBlock);
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
  if (state.shelf.size === 0) await loadSamples();
  if (!state.currentId && state.shelf.size) {
    state.currentId = state.shelf.keys().next().value;
  }
  document.getElementById('filename-input').value = state.filename;
  refresh();
}

boot();
