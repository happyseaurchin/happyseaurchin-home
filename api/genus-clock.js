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
const TIER_WORK = 'claude-sonnet-5'; // kernel mirror: working tier for a gap-close
const TIER_DRAW = 'claude-opus-4-8'; // γ=0 → the coarse vision-level draw
const MAX_TOKENS = 8192;

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

async function genusTool(sessionId, args, id) {
  const { result } = await rpc('tools/call', { name: 'pscale_genus', arguments: args }, id, sessionId);
  const blocks = (result && result.content) || [];
  return blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
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

    // 2 — one δ call IS the pulse. Fresh context, nothing but the window —
    // the model in this call is the instance for the turn (kernel tier rule:
    // γ=0 draws from vision on the coarse tier; a gap-close works the floor).
    const model = gamma === 0 ? TIER_DRAW : TIER_WORK;
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
    const fold = parseFold(outText);

    // 3 — fold through the same door; the trace to trace:<handle> rides it.
    const ack = await genusTool(session, { handle, passphrase, fold }, 3);

    return res.status(200).json({
      ok: true,
      handle,
      door: 'crab-clock via mcp',
      model,
      gamma,
      status: fold.status || 'continue',
      note: String(fold.note || '').slice(0, 300),
      ask: fold.ask || null, // reported, never granted here — the holder grants
      heartbeat: fold.heartbeat || null,
      usage: data.usage || null,
      fold_ack: ack.split('\n').slice(0, 8),
    });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e).slice(0, 300) });
  }
}
