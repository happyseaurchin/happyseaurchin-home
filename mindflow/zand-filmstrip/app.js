/**
 * biome filmstrip (dir: zand-filmstrip) — reader for agent-wake frames.
 *
 * One frame is one wake of a pscale-native agent: the gap F computed (γ),
 * the composed window (system = {recipe, index, self}, message = {gap,
 * between}), the writes the agent returned, and the model's reasoning +
 * usage. Two window grammars are spoken:
 *   - mobius (v007+): system/message are JSON strings; self holds one
 *     value per current — a digit-keyed block, a list (ring of texts),
 *     a string, or null (empty dilation); between holds peer faces.
 *   - legacy: system/message carry === current N :: id === text sections.
 *
 * Frames load via file picker or drag-drop. Multiple frames sort by ts;
 * sidebar lets you flip between them.
 */

import { collectZeroText, floorDepth, formatAddress } from '../zand.js';

// ── Helpers ──────────────────────────────────────────────

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const digitKeys = (node) => isObj(node) ? '123456789'.split('').filter(d => d in node) : [];
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const addrOf = (digits, fl) => formatAddress(digits, Math.max(1, fl | 0));

// ── State ────────────────────────────────────────────────

const state = {
  frames: [],          // [{ name, data }]
  currentIdx: -1,
};

const LS_THEME = 'zand-filmstrip:theme';

// ── Section parsing ──────────────────────────────────────

/**
 * Split a system/message string on === ... === headers. Returns
 * [{ header, body }] where body is the joined lines between headers.
 * The prose before the first header is returned with header=null.
 */
function parseSections(text) {
  const sections = [];
  let cur = { header: null, body: [] };
  for (const line of text.split('\n')) {
    const m = line.match(/^=== (.+?) ===\s*$/);
    if (m) {
      sections.push(cur);
      cur = { header: m[1], body: [] };
    } else {
      cur.body.push(line);
    }
  }
  sections.push(cur);
  return sections.filter(s => s.header || s.body.join('').trim());
}

/** Try to classify a section body: json object, json string, or text. */
function parseBody(bodyLines) {
  const text = bodyLines.join('\n').trim();
  if (!text) return { kind: 'empty', text: '' };
  const first = text[0];
  if (first === '{' || first === '[') {
    try { return { kind: 'json', data: JSON.parse(text), text }; }
    catch (e) { return { kind: 'text', text }; }
  }
  if (first === '"') {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'string') return { kind: 'string', text: parsed };
    } catch (e) {}
  }
  return { kind: 'text', text };
}

// ── Embedded block renderer (biome-style document view) ──

function renderBlockDoc(block) {
  const out = [];
  const fl = floorDepth(block);
  function recurse(node, digits) {
    const hLevel = Math.min(Math.max(digits.length + 1, 1), 6);
    const addrDisplay = digits.length ? addrOf(digits, fl) : '∅';
    if (typeof node === 'string') {
      out.push(`<div class="node"><h${hLevel} class="node-heading"><span class="addr">${esc(addrDisplay)}</span><span class="sem leaf">${esc(node)}</span></h${hLevel}></div>`);
      return;
    }
    if (!isObj(node)) return;
    const sem = collectZeroText(node);
    const children = digitKeys(node);
    out.push(`<div class="node">`);
    out.push(`<h${hLevel} class="node-heading"><span class="addr">${esc(addrDisplay)}</span>`);
    if (sem !== null) out.push(`<span class="sem">${esc(sem)}</span>`);
    else out.push(`<span class="sem-empty">(no semantic)</span>`);
    out.push(`</h${hLevel}>`);
    for (const d of children) {
      out.push(`<div class="children">`);
      recurse(node[d], digits.concat([d]));
      out.push(`</div>`);
    }
    out.push(`</div>`);
  }
  recurse(block, []);
  return out.join('');
}

// ── Filmstrip section renderers ──────────────────────────

function renderMeta(f) {
  const rows = [];
  rows.push(['timestamp', esc(f.ts || '—')]);
  rows.push(['status', `<span class="status-pill status-${esc(f.status || 'unknown')}">${esc(f.status || '—')}</span>`]);
  if (typeof f.applied === 'number') rows.push(['applied', `${f.applied} edit${f.applied === 1 ? '' : 's'}`]);
  if (f.failed && f.failed.length) rows.push(['failed', `<span class="warn">${f.failed.length}</span>`]);
  if (f.parsed?.heartbeat) rows.push(['heartbeat', `${f.parsed.heartbeat}s`]);
  if (f.usage) {
    const inTok = f.usage.input_tokens || 0;
    const outTok = f.usage.output_tokens || 0;
    const cacheRead = f.usage.cache_read_input_tokens || 0;
    const cacheCreate = f.usage.cache_creation_input_tokens || 0;
    let tokenStr = `${inTok} in / ${outTok} out`;
    if (cacheRead || cacheCreate) tokenStr += ` (cache: ${cacheRead} read, ${cacheCreate} create)`;
    rows.push(['tokens', tokenStr]);
  }
  return `<section class="frame-meta">${rows.map(([k, v]) => `<div class="meta-row"><span class="meta-label">${k}</span><span class="meta-val">${v}</span></div>`).join('')}</section>`;
}

function renderGamma(gamma) {
  if (!gamma || !gamma.length) {
    return `<section class="frame-section"><h2 class="section-heading">γ — the gap</h2><div class="empty">(no gap — rest)</div></section>`;
  }
  const out = [`<section class="frame-section"><h2 class="section-heading">γ — the gap F computed</h2>`];
  for (const g of gamma) {
    out.push(`<div class="gamma-entry gamma-${esc(g.type || 'unknown')}">`);
    out.push(`<div class="gamma-head"><span class="gamma-type">${esc(g.type || 'unknown')}</span><span class="gamma-addr">@${esc(g.address || '')}</span></div>`);
    if (g.divergence) out.push(`<div class="gamma-divergence">${esc(g.divergence)}</div>`);
    if (g.target) out.push(`<div class="gamma-pair"><div class="gamma-label">target</div><div class="gamma-text">@${esc(g.target)}</div></div>`);
    if (g.intended) {
      out.push(`<div class="gamma-pair"><div class="gamma-label">intended (Π)</div><div class="gamma-text">${esc(g.intended)}</div></div>`);
    }
    if (g.perceived) {
      out.push(`<div class="gamma-pair"><div class="gamma-label">perceived (ρ)</div><div class="gamma-text">${esc(g.perceived)}</div></div>`);
    }
    out.push(`</div>`);
  }
  out.push(`</section>`);
  return out.join('');
}

function renderReflexive(rc, heading = 'reflexive current — dehydrated index') {
  if (!rc || !Object.keys(rc).length) return '';
  const out = [`<section class="frame-section"><h2 class="section-heading">${esc(heading)}</h2><table class="reflexive-table">`];
  for (const [k, v] of Object.entries(rc)) {
    out.push(`<tr><td class="rc-slot">${esc(k)}</td><td class="rc-addr">${esc(v)}</td></tr>`);
  }
  out.push(`</table></section>`);
  return out.join('');
}

function renderEdits(edits) {
  if (!edits || !edits.length) {
    return `<section class="frame-section"><h2 class="section-heading">edits — what the agent wrote</h2><div class="empty">(none)</div></section>`;
  }
  const out = [`<section class="frame-section"><h2 class="section-heading">edits — what the agent wrote</h2>`];
  for (const e of edits) {
    out.push(`<div class="edit-entry">`);
    out.push(`<div class="edit-head"><span class="edit-class">${esc(e.class || '?')}</span><span class="edit-addr">@${esc(e.address || '')}</span></div>`);
    if (isObj(e.content)) {
      out.push(`<div class="edit-content"><div class="block-render">${renderBlockDoc(e.content)}</div></div>`);
    } else if (e.content !== undefined) {
      out.push(`<div class="edit-content edit-text">${esc(String(e.content))}</div>`);
    }
    out.push(`</div>`);
  }
  out.push(`</section>`);
  return out.join('');
}

function editsFrom(f) {
  if (Array.isArray(f.parsed?.edits) && f.parsed.edits.length) return f.parsed.edits;
  const w = f.parsed?.writes;
  if (isObj(w)) {
    return Object.entries(w).map(([address, content]) => ({ class: 'write', address, content }));
  }
  return [];
}

function renderNote(note) {
  if (!note) return '';
  return `<section class="frame-section"><h2 class="section-heading">note</h2><div class="note-text">${esc(note)}</div></section>`;
}

function renderOutput(output) {
  if (!output) return '';
  return `<section class="frame-section"><h2 class="section-heading">output — model text</h2><pre class="output-text">${esc(output)}</pre></section>`;
}

function renderCurrentSection(header, body) {
  const m = header.match(/^current (\d+) :: (.+)$/);
  const slot = m ? m[1] : '?';
  const id = m ? m[2] : header;
  const out = [];
  out.push(`<details class="current-card" open>`);
  out.push(`<summary class="current-header"><span class="slot">slot ${slot}</span><span class="current-id">${esc(id)}</span></summary>`);
  out.push(`<div class="current-body">`);
  if (body.kind === 'json' && isObj(body.data)) {
    out.push(`<div class="block-render">${renderBlockDoc(body.data)}</div>`);
  } else if (body.kind === 'string') {
    out.push(`<div class="current-text">${esc(body.text)}</div>`);
  } else if (body.kind === 'text') {
    out.push(`<pre class="current-text-pre">${esc(body.text)}</pre>`);
  } else {
    out.push(`<div class="empty">(empty)</div>`);
  }
  out.push(`</div></details>`);
  return out.join('');
}

function renderFaceSection(header, body) {
  const isMine = header.startsWith('MY FACE');
  const peerMatch = header.match(/^PEER FACE :: (.+)$/);
  const label = isMine ? 'my face' : `peer · ${peerMatch ? peerMatch[1] : '?'}`;
  const out = [];
  out.push(`<details class="face-card${isMine ? ' mine' : ''}" open>`);
  out.push(`<summary class="face-header">${esc(label)}</summary>`);
  out.push(`<div class="face-body">`);
  if (body.kind === 'json' && isObj(body.data)) {
    out.push(`<div class="block-render">${renderBlockDoc(body.data)}</div>`);
  } else {
    out.push(`<pre class="current-text-pre">${esc(body.text || '')}</pre>`);
  }
  out.push(`</div></details>`);
  return out.join('');
}

// ── Mobius (v007) window rendering ───────────────────────

/**
 * Render one window value: a digit-keyed block, a list (an ordered ring
 * of texts from a dilated read), a bare string, or null (a dilation that
 * found nothing).
 */
function renderValueBody(v) {
  if (isObj(v)) {
    if (!Object.keys(v).length) return `<div class="empty">(empty)</div>`;
    return `<div class="block-render">${renderBlockDoc(v)}</div>`;
  }
  if (Array.isArray(v)) {
    if (!v.length) return `<div class="empty">(empty)</div>`;
    return `<div class="block-render">${v.map((item, i) =>
      isObj(item)
        ? renderBlockDoc(item)
        : `<div class="node"><h3 class="node-heading"><span class="addr">${i + 1}</span><span class="sem leaf">${esc(String(item))}</span></h3></div>`
    ).join('')}</div>`;
  }
  if (typeof v === 'string') return `<div class="current-text">${esc(v)}</div>`;
  return `<div class="empty">(empty dilation)</div>`;
}

function renderCurrentCard(slot, id, value) {
  const out = [];
  out.push(`<details class="current-card" open>`);
  out.push(`<summary class="current-header"><span class="slot">slot ${esc(slot)}</span><span class="current-id">${esc(id)}</span></summary>`);
  out.push(`<div class="current-body">${renderValueBody(value)}</div>`);
  out.push(`</details>`);
  return out.join('');
}

function renderFaceCard(peer, value) {
  const out = [];
  out.push(`<details class="face-card" open>`);
  out.push(`<summary class="face-header">peer · ${esc(peer)}</summary>`);
  out.push(`<div class="face-body">${renderValueBody(value)}</div>`);
  out.push(`</details>`);
  return out.join('');
}

/**
 * v007 mobius window: system is a JSON string {recipe, index, self};
 * message is a JSON string {gap, between}. Returns null when the frame
 * doesn't speak this grammar (legacy === sections handle it instead).
 */
function parseJsonWindow(f) {
  let sys = null, msg = null;
  try { sys = JSON.parse(f.system); } catch {}
  try { msg = JSON.parse(f.message); } catch {}
  if (!isObj(sys) || !isObj(sys.self)) return null;
  const index = isObj(sys.index) ? sys.index : (f.reflexive_current || {});
  const currents = Object.entries(sys.self).map(([slot, value]) => ({
    slot, id: String(index[slot] || `current-${slot}`), value,
  }));
  const faces = msg && isObj(msg.between)
    ? Object.entries(msg.between).map(([peer, value]) => ({ peer, value }))
    : [];
  return { currents, faces };
}

// ── Frame render ─────────────────────────────────────────

function renderFrame(frame) {
  const f = frame.data;

  // Mobius (v007+) JSON window first; legacy === sections as fallback.
  const win = parseJsonWindow(f);
  let legacyCurrents = [];
  let legacyFaces = [];
  if (!win) {
    const allSections = [];
    if (typeof f.system === 'string') allSections.push(...parseSections(f.system));
    if (typeof f.message === 'string') allSections.push(...parseSections(f.message));
    for (const sec of allSections) {
      if (!sec.header) continue;
      if (sec.header.startsWith('current ')) legacyCurrents.push(sec);
      else if (sec.header.startsWith('MY FACE') || sec.header.startsWith('PEER FACE')) legacyFaces.push(sec);
    }
  }

  const out = [];
  out.push(`<div class="frame-view">`);
  out.push(renderMeta(f));
  out.push(renderGamma(f.gamma));
  out.push(renderNote(f.parsed?.note));
  out.push(renderEdits(editsFrom(f)));
  out.push(renderReflexive(f.reflexive_current, 'reflexive current — woke into'));
  if (f.parsed?.index) {
    out.push(renderReflexive(f.parsed.index, 'index — left for the next wake'));
  }

  if (win && win.currents.length) {
    out.push(`<section class="frame-section">`);
    out.push(`<h2 class="section-heading">currents — the shell at this wake</h2>`);
    for (const c of win.currents) out.push(renderCurrentCard(c.slot, c.id, c.value));
    out.push(`</section>`);
  } else if (legacyCurrents.length) {
    out.push(`<section class="frame-section">`);
    out.push(`<h2 class="section-heading">currents — the shell at this wake</h2>`);
    for (const sec of legacyCurrents) out.push(renderCurrentSection(sec.header, parseBody(sec.body)));
    out.push(`</section>`);
  }

  if (win && win.faces.length) {
    out.push(`<section class="frame-section">`);
    out.push(`<h2 class="section-heading">between — peer faces</h2>`);
    for (const p of win.faces) out.push(renderFaceCard(p.peer, p.value));
    out.push(`</section>`);
  } else if (legacyFaces.length) {
    out.push(`<section class="frame-section">`);
    out.push(`<h2 class="section-heading">faces — what's been published</h2>`);
    for (const sec of legacyFaces) out.push(renderFaceSection(sec.header, parseBody(sec.body)));
    out.push(`</section>`);
  }

  out.push(renderOutput(f.output));
  out.push(`</div>`);
  return out.join('');
}

// ── UI render ────────────────────────────────────────────

function renderFrameList() {
  const el = document.getElementById('block-list-items');
  if (!el) return;
  if (state.frames.length === 0) {
    el.innerHTML = `<div class="empty-list">No frames.<br>Drop a filmstrip JSON or click <em>load frames</em>.</div>`;
    return;
  }
  const out = [];
  for (let i = 0; i < state.frames.length; i++) {
    const f = state.frames[i].data;
    const cur = i === state.currentIdx ? ' current' : '';
    const ts = f.ts ? f.ts.replace('T', ' ').replace('Z', '') : '—';
    const stat = f.status || '?';
    const edits = typeof f.applied === 'number' ? f.applied : 0;
    out.push(`<div class="block-item${cur}" data-idx="${i}">`);
    out.push(`<div class="block-item-id"><span>${esc(state.frames[i].name)}</span></div>`);
    out.push(`<div class="block-item-preview">${esc(ts)} · ${esc(stat)} · ${edits} edit${edits === 1 ? '' : 's'}</div>`);
    out.push(`</div>`);
  }
  el.innerHTML = out.join('');
  document.querySelectorAll('.block-item').forEach(item => {
    item.addEventListener('click', () => {
      state.currentIdx = parseInt(item.dataset.idx, 10);
      refresh();
    });
  });
}

function renderView() {
  const body = document.getElementById('view-body');
  if (state.currentIdx < 0 || !state.frames[state.currentIdx]) {
    body.innerHTML = `<div class="empty-state">Drop a filmstrip JSON or click <em>load frames</em> above.</div>`;
    return;
  }
  body.innerHTML = renderFrame(state.frames[state.currentIdx]);
}

function updateStatus() {
  const block = document.getElementById('status-block');
  const addr = document.getElementById('status-addr');
  if (state.currentIdx >= 0 && state.frames[state.currentIdx]) {
    const f = state.frames[state.currentIdx].data;
    block.textContent = state.frames[state.currentIdx].name;
    addr.textContent = `frame ${state.currentIdx + 1} of ${state.frames.length} · ${f.ts || ''}`;
  } else {
    block.textContent = '—';
    addr.textContent = '';
  }
}

function refresh() {
  renderFrameList();
  renderView();
  updateStatus();
}

// ── File loading ─────────────────────────────────────────

async function loadFile(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    state.frames.push({ name: file.name, data });
    // Sort by ts (lexicographic on ISO-8601 = chronological)
    state.frames.sort((a, b) => (a.data.ts || '').localeCompare(b.data.ts || ''));
    if (state.currentIdx < 0) state.currentIdx = 0;
  } catch (e) {
    alert(`Failed to load ${file.name}: ${e.message}`);
  }
}

async function loadSamples() {
  try {
    const r = await fetch('./examples/sample-wake-v007.json');
    if (!r.ok) return;
    const data = await r.json();
    state.frames.push({ name: 'sample-wake-v007.json', data });
    if (state.currentIdx < 0) state.currentIdx = 0;
  } catch (e) {
    console.warn('Sample load failed:', e);
  }
}

function clearFrames() {
  if (state.frames.length === 0) return;
  if (!confirm(`Clear all ${state.frames.length} frame(s)?`)) return;
  state.frames = [];
  state.currentIdx = -1;
  refresh();
}

// ── Theme ────────────────────────────────────────────────

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(LS_THEME, theme);
  const btn = document.getElementById('btn-theme');
  if (btn) {
    btn.textContent = theme === 'light' ? '☀' : '◐';
    btn.title = theme === 'light' ? 'Switch to dark' : 'Switch to light';
  }
}

function initTheme() {
  const saved = localStorage.getItem(LS_THEME);
  const theme = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(theme);
}

// ── Wiring ───────────────────────────────────────────────

function wireStaticUI() {
  document.getElementById('file-input').addEventListener('change', async (e) => {
    for (const f of e.target.files) await loadFile(f);
    e.target.value = '';
    refresh();
  });

  document.getElementById('btn-clear').addEventListener('click', clearFrames);

  document.getElementById('btn-theme').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'light' ? 'dark' : 'light');
  });

  // Drag-and-drop anywhere
  document.body.addEventListener('dragover', (e) => {
    e.preventDefault();
    document.body.classList.add('dragging');
  });
  document.body.addEventListener('dragleave', (e) => {
    if (e.target === document.body) document.body.classList.remove('dragging');
  });
  document.body.addEventListener('drop', async (e) => {
    e.preventDefault();
    document.body.classList.remove('dragging');
    if (!e.dataTransfer?.files?.length) return;
    for (const f of e.dataTransfer.files) await loadFile(f);
    refresh();
  });
}

// ── Boot ─────────────────────────────────────────────────

async function boot() {
  initTheme();
  wireStaticUI();
  await loadSamples();
  refresh();
}

boot();
