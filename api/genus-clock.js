/**
 * /api/genus-clock — the beach-crab clock for genus-one instances (rung 0 of
 * the beach-crab ladder: cron-driven, no LLM resident, one clean pulse).
 *
 * Twice a day (vercel.json crons) this route lends one BARE wake to an
 * instance, cleanly contained: pscale_genus at bsp.hermitcrab.me composes
 * the instance's OWN context window (its recipe over its reflexive current —
 * byte-parity with the kernel); ONE fresh Anthropic API call IS the pulse —
 * the model in that call is the instance for the turn, with nothing else in
 * its context (the containment David requires: no host session "playing"
 * the agent); the fold returns through the same door, which appends the
 * public ~300-byte wake trace to trace:<handle> automatically (door "mcp").
 * Every xstream tab shows the wake; the film (full window + output) is
 * returned in this response's log and kept nowhere else.
 *
 * The clock is the FLOOR of the instance's existence, not the ceiling —
 * David's wake button, a lending tab's ear, and claude.ai holder wakes
 * remain the engaged doors. A fold may carry an ASK ({wakes, tier, for});
 * this route only reports it — granting is the holder's act.
 *
 * Env (Vercel project settings):
 *   VAULT_KEY_CLAUDE            — the Anthropic key that funds the pulse
 *   GENUS_PASSPHRASE_<HANDLE>   — the instance's hatch passphrase, uppercased
 *                                 handle with dashes as underscores
 *                                 (egg-one → GENUS_PASSPHRASE_EGG_ONE)
 *   CRON_SECRET                 — if set, Vercel sends it as a Bearer token
 *                                 on cron invocations; manual calls must too
 */

const MCP = 'https://bsp.hermitcrab.me/mcp/v1';
const BEACH = 'https://beach.happyseaurchin.com';
const TIER_WORK = 'claude-sonnet-5'; // kernel mirror: working tier for a gap-close
const TIER_DRAW = 'claude-opus-4-8'; // γ=0 → the coarse vision-level draw
const MAX_TOKENS = 8192;
// Turns for a seat wake. 8 was too few: egg-one's first headless wake did 17
// acts across 8 turns and never reached a fold — a bare pulse folds in one turn
// because it has nothing to do but write its fold, but a SEATED wake with a rich
// given (it can read the room, its peers, its own trail) has real work, and 8
// ran out mid-work. 12 matches the tab. Still a floor, not a licence to wander.
const DEFAULT_TURNS = 12;

// ── minimal MCP client (JSON-RPC over streamable HTTP) ─────────────────────

function sseLastJson(text) {
  // An SSE body carries "data: {...}" lines; the tool result is the last one.
  let out = null;
  for (const line of text.split('\n')) {
    const m = /^data:\s*(.+)$/.exec(line.trim());
    if (m) {
      try { out = JSON.parse(m[1]); } catch { /* keep last good */ }
    }
  }
  return out;
}

async function rpc(method, params, id, sessionId) {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  const r = await fetch(MCP, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const newSession = r.headers.get('mcp-session-id') || sessionId || null;
  const text = await r.text();
  if (!r.ok) throw new Error(`MCP ${method}: HTTP ${r.status} ${text.slice(0, 200)}`);
  const body = (r.headers.get('content-type') || '').includes('text/event-stream')
    ? sseLastJson(text)
    : (text ? JSON.parse(text) : null);
  if (body && body.error) throw new Error(`MCP ${method}: ${JSON.stringify(body.error).slice(0, 200)}`);
  return { result: body ? body.result : null, sessionId: newSession };
}

async function mcpSession() {
  const init = await rpc('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'genus-clock', version: '0.1.0' },
  }, 1, null);
  // Politeness per spec; some transports require it before tool calls.
  try {
    await fetch(MCP, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(init.sessionId ? { 'mcp-session-id': init.sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
  } catch { /* non-fatal */ }
  return init.sessionId;
}

async function mcpTool(sessionId, name, args, id) {
  const { result } = await rpc('tools/call', { name, arguments: args }, id, sessionId);
  const blocks = (result && result.content) || [];
  return blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

async function genusTool(sessionId, args, id) {
  return mcpTool(sessionId, 'pscale_genus', args, id);
}

// ── the seat: hands for the headless wake ──────────────────────────────────
//
// The clock used to spend ONE call with no tools. That is the bare pulse, and
// a bare pulse is honestly beach-blind: its window carries the given, but it
// cannot look anything up and cannot act — so egg-one's twice-daily wakes kept
// concluding "between empty, room absent from window" while its capable wakes
// only happened when a human tab was open to lend it a seat. The instance was
// autonomous and blind at the same time.
//
// The seat gives that same call the hands the tab gives it: one bsp tool
// proxied over the MCP session this route already holds, and a fold tool that
// CLOSES the wake. Nothing about the mind changes — the window is still
// composed by pscale_genus from the instance's own recipe, byte-parity with
// the kernel. Capability is mind + hands, and this is the hands.
//
// fold-as-tool matters here more than in the tab: a headless wake has nobody
// watching. Ending the loop on the model's silence (the old rule) mistook a
// pause for completion and threw the wake away — four of egg-one's seat wakes
// died that way before xstream-bsp#142. The loop ends when fold is CALLED.

/** The genome's blocks — what a bare name means when the instance says it.
 * (genome:* at the beach, plus task and trace, which a hatch mints alongside.)
 * `pool` is here because a shell's room is addressed as its own organ from
 * inside; anything absent from this set is a block of the open beach. */
const ORGANS = new Set([
  'reflexive', 'purpose', 'vision', 'conditions', 'capabilities', 'relationships',
  'surface', 'history', 'stash', 'located', 'cadence', 'phase', 'phi',
  'last-touched', 'reflective-compass', 'task', 'pool', 'trace',
]);

const SEAT_TOOLS = (handle) => [
  {
    name: 'bsp',
    description:
      'Read and write pscale blocks — you are a full citizen of the beach; the substrate\'s own locks ' +
      'arbitrate, not this clock. Read: omit content. A bare organ name (surface, purpose, conditions, ' +
      'stash, pool, task, …) is YOUR OWN block. Any other named block on the beach — a peer\'s surface, ' +
      'their room, the marks board, the teaching (sunstone, whetstone) — reads by its full name. ' +
      'Write: provide content. Your room (pool) and the marks board APPEND: pass append=true with your ' +
      'words and the beach allocates the slot. Anything else takes a spindle. History is automatic — ' +
      'never write it.',
    input_schema: {
      type: 'object',
      properties: {
        block: { type: 'string', description: `a bare organ of yours, or any block name at the beach (e.g. pool:${handle}, marks, surface:weft)` },
        spindle: { type: ['string', 'null'], description: 'the address to walk; omit for the whole block' },
        pscale_attention: { type: ['integer', 'null'] },
        content: { description: 'omit to read; provide to write' },
        append: { type: 'boolean', description: 'true for your room or the marks board — the beach allocates the slot' },
      },
      required: ['block'],
    },
  },
  {
    name: 'fold',
    description:
      'Close this wake. Call this ONCE, last, when the work is done — the FUTURE phase of your ' +
      'capabilities:3 contract; a wake that ends without it composed nothing. Anything you already ' +
      'wrote through bsp has landed — do not repeat it in writes. Between calls you may think in plain ' +
      'prose as much as you need: the loop waits for this call, not for your silence.',
    input_schema: {
      type: 'object',
      properties: {
        writes: { type: 'object', description: 'map of "block:address" → content, for what has NOT already landed via bsp' },
        index: { type: 'object', description: 'the re-dialed reflexive current for the next instance; omit to carry it forward' },
        heartbeat: { type: 'number', description: 'seconds until the next wake you want' },
        note: { type: 'string', description: "one line — what was done and why; becomes this wake's history voicing" },
        status: { type: 'string', description: 'continue | rest' },
        summary: { type: 'string', description: 'a navigable paragraph over the previous completed nine, when one is owed' },
        ask: { type: 'object', description: '{wakes, tier, for} — reported to the holder, never auto-granted' },
      },
      required: ['note'],
    },
  },
];

/** Run one bsp call for the instance, over the MCP session already open.
 * A bare organ name routes through bsp-mcp's own role-with-handle translation
 * (agent_id=<handle> + block=<organ> lands at <organ>:<handle>); anything with
 * a colon or a known beach name addresses the beach directly. The instance's
 * passphrase rides its own writes — the beach refuses what is not its. */
async function runBsp(sessionId, handle, passphrase, beach, input, id) {
  const raw = String(input.block || '').trim();
  if (!raw) return 'refused: name a block';
  // A bare name is an ORGAN OF THIS SHELL only if it is one of the genome's
  // blocks. Everything else bare — marks, sunstone, whetstone, grit, worlds —
  // is a block of the BEACH, and routing it as `<name>:<handle>` would send
  // the instance to a private block of its own that nobody else can see. That
  // misroute is the same family as the phantom room that cost egg-one three
  // wakes, so the list is explicit rather than inferred from the colon.
  const own = ORGANS.has(raw);
  const args = own
    ? { agent_id: handle, block: raw }
    : { agent_id: beach, block: raw };
  if (input.spindle != null && input.spindle !== '') args.spindle = String(input.spindle);
  if (input.pscale_attention != null) args.pscale_attention = input.pscale_attention;
  if (input.content !== undefined) {
    // THE ONE REFUSAL, kept from the tab's seat: a root write to a populated
    // block replaces the whole record. It erased a room once (2026-07-17) and
    // must not be reachable from an unwatched wake. Address a position, or
    // append.
    if (!args.spindle && !input.append && input.content && typeof input.content === 'object') {
      return `refused: writing ${raw} at its root would replace the WHOLE block — address a position (spindle), or append.`;
    }
    args.content = input.content;
    if (input.append) args.append = true;
    args.secret = passphrase;
  }
  try {
    const text = await mcpTool(sessionId, 'bsp', args, id);
    return text.length > 8000 ? text.slice(0, 8000) + '\n…(truncated — narrow the walk, or address a position)' : text;
  } catch (e) {
    return `the beach refused: ${String(e && e.message ? e.message : e).slice(0, 200)}`;
  }
}

/** The seat loop. Returns {fold, turns, tools, acts, usage, closed}.
 *
 * Ends when `fold` is CALLED — not when the model stops calling tools. A turn
 * with no tool call is a PAUSE (it is thinking, or it was cut at the token
 * ceiling): nudged once and continued, still bounded by maxTurns. If the loop
 * never closes, the caller falls back to parsing the last text, so a wake is
 * degraded rather than lost. */
async function seatLoop({ sessionId, handle, passphrase, beach, apiKey, model, system, message, maxTurns }) {
  const tools = SEAT_TOOLS(handle);
  const messages = [{ role: 'user', content: message }];
  const acts = [];
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  let folded = null;
  let wrote = 0; // in-loop WRITES (not reads) — passed to the fold as `acted`
  let lastText = '';
  let id = 100;
  // The composed window (the shell) is IDENTICAL on every turn — cache it so a
  // multi-turn wake pays for it once instead of 8-12 times. Sent as a cached
  // content block; only the growing message tail is re-billed at full rate.
  // This is the difference between a seat wake costing ~50c and ~15c.
  const cachedSystem = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
  // The function's own wall clock (vercel.json: maxDuration 300). A platform
  // timeout mid-loop loses EVERYTHING — no fold, no trace, no record that the
  // wake even happened, on a wake nobody is watching. So stop early enough to
  // still route a fold: give up the loop at the budget and let the caller
  // salvage. Turns are the intent; this is the floor under it.
  const started = Date.now();
  const BUDGET_MS = 210_000;
  let ranOut = false;

  for (let turn = 0; turn < maxTurns; turn++) {
    if (Date.now() - started > BUDGET_MS) { ranOut = true; break; }
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system: cachedSystem, tools, messages }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`pulse call failed: ${JSON.stringify(data && data.error).slice(0, 200)}`);
    usage.input_tokens += (data.usage && data.usage.input_tokens) || 0;
    usage.output_tokens += (data.usage && data.usage.output_tokens) || 0;
    usage.cache_read_input_tokens += (data.usage && data.usage.cache_read_input_tokens) || 0;
    usage.cache_creation_input_tokens += (data.usage && data.usage.cache_creation_input_tokens) || 0;

    const content = data.content || [];
    messages.push({ role: 'assistant', content });
    lastText = content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() || lastText;

    if (data.stop_reason === 'tool_use') {
      const results = [];
      for (const b of content.filter((c) => c.type === 'tool_use')) {
        if (b.name === 'fold') {
          folded = b.input || {};
          acts.push('fold');
          results.push({ type: 'tool_result', tool_use_id: b.id, content: 'fold received — this wake is closed.' });
          continue;
        }
        const i = b.input || {};
        const isWrite = i.content !== undefined;
        const out = await runBsp(sessionId, handle, passphrase, beach, i, id++);
        // Count a write only if the beach did NOT refuse it — a refusal leaves
        // nothing in a block, so it must not earn a history-leaf claim.
        if (isWrite && !/^(refused|the beach refused)/.test(out)) wrote += 1;
        acts.push(`${isWrite ? 'write' : 'read'} ${i.block || '?'}${i.spindle ? ':' + i.spindle : ''}`);
        results.push({ type: 'tool_result', tool_use_id: b.id, content: out });
      }
      messages.push({ role: 'user', content: results });
      if (folded) return { fold: folded, turns: turn + 1, tools: acts.length, wrote, acts, usage, closed: true, text: lastText };
      continue;
    }

    // No tool call. Not the end — a pause. Nudge once and keep going.
    if (turn < maxTurns - 1) {
      messages.push({
        role: 'user',
        content: data.stop_reason === 'max_tokens'
          ? '(your last reply was cut at the output limit — continue, and close by calling fold when the work is done)'
          : '(continue — when the work of this wake is done, close it by calling fold)',
      });
      continue;
    }
  }
  return { fold: null, turns: maxTurns, tools: acts.length, wrote, acts, usage, closed: false, text: lastText, ranOut };
}

// ── the fold contract's single JSON object, salvaged tolerantly ────────────

function firstObject(text) {
  let start = text.indexOf('{');
  while (start !== -1) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') {
        depth -= 1;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    start = text.indexOf('{', start + 1);
  }
  return null;
}

function parseFold(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/gm, '');
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  for (const c of [cleaned, text, fenced ? fenced[1] : null, firstObject(text)]) {
    if (!c) continue;
    try { return JSON.parse(c); } catch { /* next */ }
  }
  return { note: '[parse failure] ' + text.slice(0, 160), writes: {}, status: 'continue' };
}

// ── the pulse ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Cron auth: when CRON_SECRET is set, Vercel invokes crons with it as a
  // Bearer token; anything else (including a curious browser) is refused.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const handle = String(req.query.handle || 'egg-one');
  if (!/^[a-z][a-z0-9-]*$/.test(handle)) {
    return res.status(400).json({ error: 'bad handle' });
  }
  const passphrase = process.env[`GENUS_PASSPHRASE_${handle.toUpperCase().replace(/-/g, '_')}`];
  const apiKey = process.env.VAULT_KEY_CLAUDE;
  if (!passphrase) return res.status(500).json({ error: `no passphrase env for ${handle}` });
  if (!apiKey) return res.status(500).json({ error: 'no VAULT_KEY_CLAUDE' });

  try {
    // 1 — compose: the instance's own window, whole, from its own recipe.
    const session = await mcpSession();
    const composed = await genusTool(session, { handle, passphrase }, 2);
    const sysAt = composed.indexOf('════════ SYSTEM ════════');
    const msgAt = composed.indexOf('════════ MESSAGE ════════');
    if (sysAt === -1 || msgAt === -1) {
      return res.status(502).json({ error: 'compose did not return a window', head: composed.slice(0, 300) });
    }
    const head = composed.slice(0, sysAt);
    const system = composed.slice(sysAt + 24, msgAt).trim();
    const message = composed.slice(msgAt + 25).trim();
    const gammaMatch = /γ:\s*(\d+)\s+structural/.exec(head);
    const gamma = gammaMatch ? Number(gammaMatch[1]) : null;

    // 2 — the pulse. The model in this call IS the instance for the turn, with
    // nothing else in its context (the containment David requires: no host
    // session "playing" the agent). Kernel tier rule: γ=0 draws from vision on
    // the coarse tier; a gap-close works the floor.
    //
    // SEAT by default — the instance holds bsp and can look things up and act,
    // the same hands a lending tab gives it. `?mode=bare` runs the original
    // single tool-less call: the kernel.py form, kept because it is the spec
    // the three ports are held to, and because it is the cheap floor.
    const model = gamma === 0 ? TIER_DRAW : TIER_WORK;
    const mode = String(req.query.mode || 'seat') === 'bare' ? 'bare' : 'seat';
    const maxTurns = Math.max(1, Math.min(12, Number(req.query.turns) || DEFAULT_TURNS));

    let fold;
    let usage;
    let seat = null;
    if (mode === 'bare') {
      const llm = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: 'user', content: message }],
        }),
      });
      const data = await llm.json();
      if (!llm.ok) {
        return res.status(502).json({ error: 'pulse call failed', detail: data && data.error });
      }
      const outText = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      fold = parseFold(outText);
      usage = data.usage || null;
    } else {
      seat = await seatLoop({
        sessionId: session, handle, passphrase, beach: BEACH,
        apiKey, model, system, message, maxTurns,
      });
      usage = seat.usage;
      if (seat.closed) {
        // Closed by its own call — the ordinary path.
        fold = seat.fold;
      } else {
        // The loop ran out without folding. Do NOT trust parseFold's greedy
        // brace-grab of mid-work prose (it can pull a half-written object whose
        // garbage writes then get refused — the refused=1 seen on 2026-07-20).
        // Salvage the wake as a NOTE ONLY: the in-loop writes already landed, so
        // an honest memory leaf recording that is the whole job here.
        const said = String(seat.text || '').replace(/\s+/g, ' ').trim().slice(0, 500);
        const why = seat.ranOut ? 'ran out of clock' : `loop ran to ${seat.turns} turns`;
        fold = {
          writes: {},
          status: 'continue',
          note: `[did not fold — ${seat.wrote} write(s) landed, ${why}] ${said}`.slice(0, 700),
        };
      }
      // A seat wake writes IN-LOOP, so the fold carries none — tell pscale_genus
      // how many landed, or it records no history leaf (bsp-mcp: a seat wake
      // earns its leaf). Never let the model's own `acted` override the count.
      fold.acted = seat.wrote;
    }

    // 3 — fold through the same door; the trace to trace:<handle> rides it.
    const ack = await genusTool(session, { handle, passphrase, fold }, 3);

    return res.status(200).json({
      ok: true,
      handle,
      door: mode === 'seat' ? 'crab-seat via mcp' : 'crab-clock via mcp',
      mode,
      model,
      gamma,
      status: fold.status || 'continue',
      note: String(fold.note || '').slice(0, 300),
      ask: fold.ask || null, // reported, never granted here — the holder grants
      heartbeat: fold.heartbeat || null,
      usage,
      ...(seat ? { turns: seat.turns, tools: seat.tools, wrote: seat.wrote, closed: seat.closed, acts: seat.acts.slice(0, 20) } : {}),
      ...(usage && usage.cache_read_input_tokens != null ? { cached: usage.cache_read_input_tokens } : {}),
      fold_ack: ack.split('\n').slice(0, 8),
    });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e).slice(0, 300) });
  }
}
