/**
 * filmstrip/app.js — Filmstrip viewer for LLM kernel logs.
 *
 * Loads filmstrip frames (C-loop) and optional LOG files (B-loop detail).
 * Three views: C-loop (context window + output), B-loop (HTTP round-trips),
 * A-loop (content blocks within a single response).
 *
 * Connects to filmstrip-server.mjs via WebSocket for live updates,
 * or works standalone with manual file upload / drag-drop.
 */

import { ColumnRenderer } from './column-renderer.js';

// ── State ────────────────────────────────────────────────────────────────────

const frames = [];         // filmstrip frames, sorted by ts
const logs = new Map();    // ts → log data (b_loops array)
let selectedIdx = -1;
let selectedBLoop = 0;
let currentView = 'c-loop';

// ── DOM refs ─────────────────────────────────────────────────────────────────

const app = document.getElementById('app');
const frameListInner = document.getElementById('frame-list-inner');
const fileUpload = document.getElementById('file-upload');
const toggleRaw = document.getElementById('toggle-raw');
const viewTabs = document.querySelectorAll('.view-tab');
const emptyView = document.getElementById('empty-view');
const wsStatus = document.getElementById('ws-status');
const toggleTheme = document.getElementById('toggle-theme');
let rawMode = false;

// ── Theme ────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  toggleTheme.textContent = theme === 'dark' ? 'Light' : 'Dark';
  localStorage.setItem('filmstrip-theme', theme);
}

// Restore saved preference, default to light
applyTheme(localStorage.getItem('filmstrip-theme') || 'light');

toggleTheme.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// View panels
const cView = document.getElementById('c-view');
const bView = document.getElementById('b-view');
const aView = document.getElementById('a-view');

// C-loop elements
const cInput = document.getElementById('c-input');
const cOutput = document.getElementById('c-output');
const cSections = document.getElementById('c-sections');
const cOutputText = document.getElementById('c-output-text');
const cTools = document.getElementById('c-tools');

// Panel toggles
const toggleInput = document.getElementById('toggle-input');
const toggleOutput = document.getElementById('toggle-output');
let showInput = true;
let showOutput = true;

// B-loop elements
const bList = document.getElementById('b-list');
const bDetail = document.getElementById('b-detail');

// A-loop elements
const aBlocks = document.getElementById('a-blocks');

// ── File loading ─────────────────────────────────────────────────────────────

function detectFormat(data) {
  if (data.meta && data.b_loops) return 'log';
  // A frame needs a system prompt and either an output (a full LLM wake) or a
  // message (a compose-only wake — structural F, no LLM call, so no output).
  if (data.system !== undefined && (data.output !== undefined || data.message !== undefined)) return 'filmstrip';
  return 'unknown';
}

function ingestFile(data, filename) {
  const fmt = detectFormat(data);
  if (fmt === 'filmstrip') {
    // Avoid duplicates by ts
    if (!frames.some(f => f.ts === data.ts)) {
      frames.push(data);
      frames.sort((a, b) => a.ts.localeCompare(b.ts));
    }
  } else if (fmt === 'log') {
    const ts = data.meta?.ts;
    if (ts) logs.set(ts, data);
  } else {
    console.warn('Unknown format:', filename);
    return;
  }
  renderFrameList();
  if (selectedIdx === -1 && frames.length > 0) selectFrame(0);
}

function loadFiles(fileList) {
  for (const file of fileList) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        ingestFile(data, file.name);
      } catch (e) {
        console.error('Failed to parse', file.name, e);
      }
    };
    reader.readAsText(file);
  }
}

// File upload
fileUpload.addEventListener('change', (e) => {
  loadFiles(e.target.files);
  e.target.value = '';
});

// Drag and drop on body
const dropOverlay = document.createElement('div');
dropOverlay.className = 'drop-overlay';
dropOverlay.textContent = 'Drop filmstrip / log files';
document.body.appendChild(dropOverlay);

let dragCounter = 0;
document.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  dropOverlay.classList.add('active');
});
document.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) { dropOverlay.classList.remove('active'); dragCounter = 0; }
});
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove('active');
  if (e.dataTransfer.files.length) loadFiles(e.dataTransfer.files);
});

// ── Frame list ───────────────────────────────────────────────────────────────

function renderFrameList() {
  frameListInner.innerHTML = '';
  if (frames.length === 0) {
    frameListInner.innerHTML = '<div class="empty-state">Drop .json files here or click Upload</div>';
    return;
  }

  frames.forEach((f, i) => {
    const card = document.createElement('div');
    card.className = 'frame-card' + (i === selectedIdx ? ' selected' : '');

    const concern = document.createElement('div');
    concern.className = 'frame-concern';
    concern.textContent = f.concern || f.note || 'unnamed';

    const meta = document.createElement('div');
    meta.className = 'frame-meta';

    const tier = document.createElement('span');
    tier.className = `tier-badge tier-${f.tier || 'haiku'}`;
    tier.textContent = f.tier || '?';

    const time = document.createElement('span');
    const d = new Date(f.ts);
    time.textContent = d.toLocaleTimeString();

    const bCount = document.createElement('span');
    const bc = f.b_loop_count || f.tools?.length || 0;
    bCount.textContent = bc > 1 ? `${bc} calls` : '1 call';

    meta.append(tier, time, bCount);
    card.append(concern, meta);

    card.addEventListener('click', () => {
      if (selectedIdx === i) {
        // Already selected — show raw file modal
        showRawModal(f);
      } else {
        selectFrame(i);
      }
    });

    frameListInner.appendChild(card);
  });
}

// ── View switching ───────────────────────────────────────────────────────────

viewTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    currentView = tab.dataset.view;
    viewTabs.forEach(t => t.classList.toggle('active', t === tab));
    showCurrentView();
  });
});

toggleRaw.addEventListener('click', () => {
  rawMode = !rawMode;
  toggleRaw.classList.toggle('active', rawMode);
  showCurrentView(); // re-render with raw/parsed mode
});

function applyPanelToggles() {
  cInput.classList.toggle('hidden', !showInput);
  cOutput.classList.toggle('hidden', !showOutput);
  // Remove solo border when only input visible
  cInput.classList.toggle('solo', showInput && !showOutput);
  toggleInput.classList.toggle('active', showInput);
  toggleOutput.classList.toggle('active', showOutput);
}

toggleInput.addEventListener('click', () => {
  // Can't turn off if it's the only one on
  if (showInput && !showOutput) return;
  showInput = !showInput;
  applyPanelToggles();
});

toggleOutput.addEventListener('click', () => {
  if (showOutput && !showInput) return;
  showOutput = !showOutput;
  applyPanelToggles();
});

function showCurrentView() {
  emptyView.classList.remove('active');
  cView.classList.remove('active');
  bView.classList.remove('active');
  aView.classList.remove('active');

  if (selectedIdx === -1) {
    emptyView.classList.add('active');
    return;
  }

  const frame = frames[selectedIdx];
  const log = logs.get(frame.ts);

  if (currentView === 'c-loop') {
    cView.classList.add('active');
    renderCLoop(frame);
  } else if (currentView === 'b-loop') {
    bView.classList.add('active');
    renderBLoop(frame, log);
  } else if (currentView === 'a-loop') {
    aView.classList.add('active');
    renderALoop(frame, log);
  }
}

function selectFrame(idx) {
  selectedIdx = idx;
  selectedBLoop = 0;
  renderFrameList();
  showCurrentView();
}

// ── C-loop view ──────────────────────────────────────────────────────────────

function parseSections(text) {
  if (!text) return [];
  const parts = text.split(/^(=== .+ ===)$/m);
  const sections = [];
  for (let i = 0; i < parts.length; i++) {
    const trimmed = parts[i].trim();
    if (!trimmed) continue;
    const headerMatch = trimmed.match(/^=== (.+) ===$/);
    if (headerMatch) {
      const body = (parts[i + 1] || '').trim();
      sections.push({ label: headerMatch[1], body });
      i++; // skip body part
    } else if (sections.length === 0) {
      // Text before first header
      sections.push({ label: 'PREAMBLE', body: trimmed });
    }
  }
  return sections;
}

function tryParsePscale(text) {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && '_' in obj) {
      return obj;
    }
  } catch {}
  return null;
}

/**
 * Mobius (v007+) window: system is a JSON string {recipe, index, self};
 * message is a JSON string {gap, between}. Returns one section per shell
 * current (system.self, labelled by system.index / reflexive_current) and
 * one per peer face (message.between), or null when the frame isn't a
 * mobius window (legacy === sections handle it instead). Recipe/index/gap
 * are deliberately omitted — the context window stays a uniform list of
 * blocks, not a mix of formats.
 */
function parseMobiusWindow(frame) {
  let sys;
  try { sys = JSON.parse(frame.system); } catch { return null; }
  if (!sys || typeof sys !== 'object' || !sys.self || typeof sys.self !== 'object') return null;

  let msg = null;
  try { msg = JSON.parse(frame.message); } catch {}

  const index = (sys.index && typeof sys.index === 'object') ? sys.index
    : (frame.reflexive_current && typeof frame.reflexive_current === 'object' ? frame.reflexive_current : {});

  const sections = [];
  for (const [slot, value] of Object.entries(sys.self)) {
    const id = index[slot] ? ` · ${index[slot]}` : '';
    sections.push({ label: `current ${slot}${id}`, value });
  }
  if (msg && msg.between && typeof msg.between === 'object') {
    for (const [peer, value] of Object.entries(msg.between)) {
      sections.push({ label: `face · ${peer}`, value });
    }
  }
  return { sections };
}

/** The deepest semantic string of a leaf block: digit 0 chain, then _. */
function leafText(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    let z = value['0'];
    while (z && typeof z === 'object') z = z['0'];
    if (typeof z === 'string') return z;
    if (typeof value['_'] === 'string') return value['_'];
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Append one labelled context-window section. A block with digit children
 * renders as navigable columns; a leaf (a string, or a block with only a
 * semantic and no branches) shows its text rather than an empty column.
 */
function addContextSection(label, value) {
  const secEl = document.createElement('div');
  secEl.className = 'ctx-section';

  const header = document.createElement('div');
  header.className = 'ctx-section-header';
  header.textContent = label;
  secEl.appendChild(header);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'ctx-section-body';

  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const hasDigitChildren = isObject && '123456789'.split('').some(d => d in value);

  if (hasDigitChildren) {
    const colContainer = document.createElement('div');
    colContainer.className = 'ctx-columns';
    bodyEl.appendChild(colContainer);
    new ColumnRenderer(colContainer, () => {}, () => {}).render(value);
  } else {
    const pre = document.createElement('pre');
    pre.textContent = leafText(value);
    bodyEl.appendChild(pre);
  }

  secEl.appendChild(bodyEl);
  cSections.appendChild(secEl);
}

function renderCLoop(frame) {
  cSections.innerHTML = '';
  cOutputText.textContent = '';
  cTools.innerHTML = '';

  if (rawMode) {
    renderCLoopRaw(frame);
    return;
  }

  // Two window grammars. Mobius (v007+): system/message are JSON strings —
  // the shell lives in system.self, peer faces in message.between; render
  // each current/face as its own column block. Legacy: system/message are
  // === sections, some of them _-keyed pscale blocks. Mobius first.
  const win = parseMobiusWindow(frame);
  if (win) {
    for (const sec of win.sections) addContextSection(sec.label, sec.value);
  } else {
    const allSections = [...parseSections(frame.system), ...parseSections(frame.message)];
    for (const sec of allSections) addContextSection(sec.label, tryParsePscale(sec.body) || sec.body);
  }

  // Output
  cOutputText.textContent = frame.output || '(no output)';

  // Tool summary
  if (frame.tools && frame.tools.length > 0) {
    const toolLabel = document.createElement('div');
    toolLabel.className = 'c-label';
    toolLabel.textContent = `Tools (${frame.tools.length})`;
    cTools.appendChild(toolLabel);

    for (const t of frame.tools) {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.innerHTML = `
        <div class="tool-name">${esc(t.name)}</div>
        <div class="tool-io">in: ${esc(t.input)}</div>
        <div class="tool-io">out: ${esc(t.output)}</div>
      `;
      cTools.appendChild(card);
    }
  }
}

function renderCLoopRaw(frame) {
  // Input side: raw "system" and "message" strings as they exist in the frame
  const inputLabel = document.createElement('div');
  inputLabel.className = 'ctx-section-header';
  inputLabel.textContent = 'system (raw string)';
  cSections.appendChild(inputLabel);

  const systemRaw = document.createElement('div');
  systemRaw.className = 'raw-json';
  systemRaw.textContent = frame.system || '(empty)';
  cSections.appendChild(systemRaw);

  const msgLabel = document.createElement('div');
  msgLabel.className = 'ctx-section-header';
  msgLabel.style.marginTop = '12px';
  msgLabel.textContent = 'message (raw string)';
  cSections.appendChild(msgLabel);

  const msgRaw = document.createElement('div');
  msgRaw.className = 'raw-json';
  msgRaw.textContent = frame.message || '(empty)';
  cSections.appendChild(msgRaw);

  // Output side: raw frame fields
  const outputRaw = document.createElement('div');
  outputRaw.className = 'raw-json';
  // Show the output and all other frame fields as syntax-highlighted JSON
  const outputObj = {
    output: frame.output,
    tools: frame.tools,
    tokens: frame.tokens,
    ts: frame.ts,
    concern: frame.concern,
    path: frame.path,
    tier: frame.tier,
    model: frame.model,
    echo: frame.echo,
    b_loop_count: frame.b_loop_count,
    log_file: frame.log_file,
  };
  outputRaw.innerHTML = syntaxHighlight(JSON.stringify(outputObj, null, 2));
  cOutputText.appendChild(outputRaw);
}

function syntaxHighlight(json) {
  return json.replace(/("(?:\\.|[^"\\])*")\s*:/g, '<span class="raw-key">$1</span>:')
    .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span class="raw-str">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="raw-num">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="raw-bool">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="raw-null">$1</span>');
}

// ── B-loop view ──────────────────────────────────────────────────────────────

function renderBLoop(frame, log) {
  bList.innerHTML = '';
  bDetail.innerHTML = '';

  if (!log || !log.b_loops || log.b_loops.length === 0) {
    bList.innerHTML = '<div class="empty-state">No LOG file loaded for this frame.<br>Upload the matching .log.json file.</div>';
    return;
  }

  // B-loop list
  for (let i = 0; i < log.b_loops.length; i++) {
    const bl = log.b_loops[i];
    const card = document.createElement('div');
    card.className = 'b-card' + (i === selectedBLoop ? ' selected' : '');

    const stopReason = bl.response?.stop_reason || '?';
    const inTok = bl.response?.usage?.input_tokens || '?';
    const outTok = bl.response?.usage?.output_tokens || '?';

    card.innerHTML = `
      <div class="b-card-label">Round ${i + 1}</div>
      <div class="b-card-info">${stopReason} &middot; ${bl.duration_ms || '?'}ms</div>
      <div class="b-card-info meta-only">${inTok} in / ${outTok} out</div>
    `;

    card.addEventListener('click', () => {
      selectedBLoop = i;
      renderBLoop(frame, log);
    });
    bList.appendChild(card);
  }

  // Detail for selected B-loop
  const bl = log.b_loops[selectedBLoop];
  if (!bl) return;

  // Request side
  const reqLabel = document.createElement('div');
  reqLabel.className = 'b-section-label';
  reqLabel.textContent = 'Request';
  bDetail.appendChild(reqLabel);

  // Meta: model, max_tokens
  const reqMeta = document.createElement('div');
  reqMeta.className = 'meta-only meta-row';
  reqMeta.textContent = `model: ${bl.request?.model || '?'} | max_tokens: ${bl.request?.max_tokens || '?'}`;
  bDetail.appendChild(reqMeta);

  // Messages
  const messages = bl.request?.messages || [];
  for (const msg of messages) {
    const msgCard = document.createElement('div');
    msgCard.className = 'msg-card';

    const role = document.createElement('div');
    role.className = `msg-role msg-role-${msg.role}`;
    role.textContent = msg.role;
    msgCard.appendChild(role);

    const content = document.createElement('div');
    content.className = 'msg-content';
    content.textContent = formatMessageContent(msg.content);
    msgCard.appendChild(content);

    bDetail.appendChild(msgCard);
  }

  // Tool schemas (meta)
  if (bl.request?.tools) {
    const toolsMeta = document.createElement('div');
    toolsMeta.className = 'meta-only';
    const label = document.createElement('div');
    label.className = 'b-section-label';
    label.textContent = `Tool schemas (${bl.request.tools.length})`;
    toolsMeta.appendChild(label);
    for (const t of bl.request.tools) {
      const pre = document.createElement('pre');
      pre.className = 'meta-row';
      pre.textContent = `${t.name}: ${t.description || ''}`;
      toolsMeta.appendChild(pre);
    }
    bDetail.appendChild(toolsMeta);
  }

  // Response side
  const respLabel = document.createElement('div');
  respLabel.className = 'b-section-label';
  respLabel.textContent = 'Response';
  bDetail.appendChild(respLabel);

  // Meta: stop_reason, usage, duration
  const respMeta = document.createElement('div');
  respMeta.className = 'meta-only meta-row';
  respMeta.textContent = `stop: ${bl.response?.stop_reason || '?'} | ${bl.duration_ms || '?'}ms | ${bl.response?.usage?.input_tokens || '?'} in / ${bl.response?.usage?.output_tokens || '?'} out`;
  bDetail.appendChild(respMeta);

  // Content blocks
  const contentBlocks = bl.response?.content || [];
  for (const block of contentBlocks) {
    const blockEl = document.createElement('div');
    blockEl.className = `resp-block type-${block.type}`;

    const typeEl = document.createElement('div');
    typeEl.className = `resp-type resp-type-${block.type}`;
    typeEl.textContent = block.type;
    blockEl.appendChild(typeEl);

    const contentEl = document.createElement('div');
    contentEl.className = 'resp-content';
    contentEl.textContent = formatContentBlock(block);
    blockEl.appendChild(contentEl);

    bDetail.appendChild(blockEl);
  }
}

// ── A-loop view ──────────────────────────────────────────────────────────────

function renderALoop(frame, log) {
  aBlocks.innerHTML = '';

  if (!log || !log.b_loops) {
    // Fall back to filmstrip tool log
    if (frame.tools && frame.tools.length > 0) {
      const note = document.createElement('div');
      note.className = 'empty-state';
      note.textContent = 'No LOG file — showing filmstrip tool summary only';
      aBlocks.appendChild(note);

      for (const t of frame.tools) {
        const block = document.createElement('div');
        block.className = 'a-block type-tool_use';
        block.innerHTML = `
          <div class="a-block-header">
            <span class="a-block-type atype-tool_use">tool_use</span>
            <span class="a-block-detail">${esc(t.name)}</span>
          </div>
          <div class="a-block-content">Input: ${esc(t.input)}\nOutput: ${esc(t.output)}</div>
        `;
        aBlocks.appendChild(block);
      }
    } else {
      aBlocks.innerHTML = '<div class="empty-state">No LOG file loaded and no tool data in filmstrip</div>';
    }
    return;
  }

  // Show ALL content blocks across ALL B-loops, interleaved with tool results
  for (const bl of log.b_loops) {
    // Round header
    const roundHeader = document.createElement('div');
    roundHeader.className = 'b-section-label';
    roundHeader.textContent = `B-loop round ${bl.index + 1}`;
    aBlocks.appendChild(roundHeader);

    // Response content blocks
    const contentBlocks = bl.response?.content || [];
    for (const block of contentBlocks) {
      const blockEl = document.createElement('div');
      blockEl.className = `a-block type-${block.type}`;

      const header = document.createElement('div');
      header.className = 'a-block-header';

      const typeBadge = document.createElement('span');
      typeBadge.className = `a-block-type atype-${block.type}`;
      typeBadge.textContent = block.type;
      header.appendChild(typeBadge);

      if (block.name) {
        const detail = document.createElement('span');
        detail.className = 'a-block-detail';
        detail.textContent = block.name;
        header.appendChild(detail);
      }

      blockEl.appendChild(header);

      const content = document.createElement('div');
      content.className = 'a-block-content';
      content.textContent = formatContentBlock(block);
      blockEl.appendChild(content);

      aBlocks.appendChild(blockEl);
    }

    // If there was a tool_result in the next message, show it
    const nextMsg = findToolResults(bl, log.b_loops);
    if (nextMsg) {
      for (const tr of nextMsg) {
        const trEl = document.createElement('div');
        trEl.className = 'a-block type-tool_result';
        trEl.innerHTML = `
          <div class="a-block-header">
            <span class="a-block-type atype-tool_result">tool_result</span>
            <span class="a-block-detail">${esc(tr.tool_use_id || '')}</span>
          </div>
          <div class="a-block-content">${esc(typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content, null, 2))}</div>
        `;
        aBlocks.appendChild(trEl);
      }
    }
  }
}

function findToolResults(currentBLoop, allBLoops) {
  // The tool results are in the NEXT b-loop's request messages (as user role with tool_result content)
  const nextIdx = currentBLoop.index + 1;
  const next = allBLoops.find(b => b.index === nextIdx);
  if (!next) return null;

  const msgs = next.request?.messages || [];
  for (const msg of msgs) {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      const results = msg.content.filter(c => c.type === 'tool_result');
      if (results.length > 0) return results;
    }
  }
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMessageContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(c => {
      if (c.type === 'text') return c.text;
      if (c.type === 'tool_use') return `[tool_use: ${c.name}] ${JSON.stringify(c.input, null, 2)}`;
      if (c.type === 'tool_result') return `[tool_result: ${c.tool_use_id}] ${typeof c.content === 'string' ? c.content : JSON.stringify(c.content)}`;
      if (c.type === 'thinking') return `[thinking] ${c.thinking}`;
      return JSON.stringify(c, null, 2);
    }).join('\n\n');
  }
  return JSON.stringify(content, null, 2);
}

function formatContentBlock(block) {
  if (block.type === 'text') return block.text;
  if (block.type === 'thinking') return block.thinking;
  if (block.type === 'tool_use') return `${block.name}\n${JSON.stringify(block.input, null, 2)}`;
  if (block.type === 'server_tool_use') return `${block.name}\n${JSON.stringify(block.input, null, 2)}`;
  return JSON.stringify(block, null, 2);
}

function esc(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

// ── Raw file modal ───────────────────────────────────────────────────────────

function showRawModal(frame) {
  // Remove existing modal if any
  const existing = document.getElementById('raw-modal');
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'raw-modal';
  overlay.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box';

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.textContent = `${frame.concern || 'Frame'} — ${frame.tier} — ${frame.ts}`;

  const headerButtons = document.createElement('div');
  headerButtons.style.cssText = 'display:flex;gap:8px;align-items:center;';

  const remove = document.createElement('button');
  remove.className = 'modal-remove';
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => {
    const idx = frames.indexOf(frame);
    if (idx !== -1) frames.splice(idx, 1);
    if (selectedIdx >= frames.length) selectedIdx = frames.length - 1;
    if (selectedIdx < 0) selectedIdx = -1;
    overlay.remove();
    renderFrameList();
    showCurrentView();
  });

  const close = document.createElement('button');
  close.className = 'modal-close';
  close.textContent = '\u2715';
  close.addEventListener('click', () => overlay.remove());

  headerButtons.append(remove, close);
  header.appendChild(headerButtons);

  const content = document.createElement('pre');
  content.className = 'modal-content';
  content.textContent = JSON.stringify(frame, null, 2);

  box.append(header, content);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Escape to close
  const escHandler = (e) => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

// ── WebSocket live connection ────────────────────────────────────────────────

function setWsStatus(state) {
  if (!wsStatus) return;
  wsStatus.className = 'ws-indicator ws-' + state;
  wsStatus.title = state === 'connected' ? 'Live' : state === 'connecting' ? 'Connecting...' : '';
}

let wsRetries = 0;
const WS_MAX_RETRIES = 3;

function connectWebSocket() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${proto}//${location.host}/ws`;
  setWsStatus('connecting');

  let ws;
  try {
    ws = new WebSocket(wsUrl);
  } catch {
    setWsStatus('disconnected');
    loadExample();
    return;
  }

  ws.onopen = () => {
    setWsStatus('connected');
    wsRetries = 0; // reset on success
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'frame' || msg.type === 'log') {
        ingestFile(msg.data, msg.filename || 'ws-frame.json');
        // Auto-select the newest frame when a new frame arrives
        if (msg.type === 'frame' && frames.length > 0) {
          selectFrame(frames.length - 1);
        }
      }
      // batch-start / batch-end are informational, no action needed
    } catch (e) {
      console.error('WebSocket message parse error:', e);
    }
  };

  ws.onclose = () => {
    setWsStatus('disconnected');
    wsRetries++;
    if (wsRetries <= WS_MAX_RETRIES) {
      setTimeout(connectWebSocket, 3000);
    } else {
      // No server — fall back to example + manual upload
      loadExample();
    }
  };

  ws.onerror = () => {
    // Will trigger onclose
  };
}

async function loadExample() {
  // ?example=<name> lets an embed pick which example loads (basename only,
  // always from examples/). Defaults to the birth wake.
  const param = new URLSearchParams(location.search).get('example');
  const name = param ? param.replace(/^.*\//, '') : 'birth-first-awakening.json';
  try {
    const resp = await fetch('examples/' + name);
    if (resp.ok) {
      const data = await resp.json();
      ingestFile(data, name);
    }
  } catch (e) {
    console.log('No example file loaded:', e.message);
  }
}

// ── Startup ──────────────────────────────────────────────────────────────────

// Try WebSocket first (works when filmstrip-server is running).
// On static sites (happyseaurchin.com etc), WS fails after 3 retries
// and falls back to loading the example file + manual upload.
// An explicit ?example= (used by embeds) loads immediately — no WebSocket wait.
const hasExampleParam = new URLSearchParams(location.search).has('example');
if (hasExampleParam) loadExample();
if (location.protocol === 'http:' || location.protocol === 'https:') {
  connectWebSocket();   // live mode; on a static host it falls back to loadExample()
} else if (!hasExampleParam) {
  loadExample();        // file:// mode — load example directly
}

// Expose for testing / programmatic loading
window.filmstrip = { ingestFile, frames, logs };
