/**
 * test-genus-clock — the headless seat, driven end to end against a stubbed
 * network. No key is spent and no beach is touched: MCP, Anthropic and the
 * bsp proxy are all scripted, so what is under test is the shipped handler.
 *
 * What it pins:
 *   1. SEAT is the default: the pulse holds tools, and a bsp call reaches the
 *      MCP door with the instance's own passphrase on writes.
 *   2. The loop ends when `fold` is CALLED, not when the model goes quiet —
 *      a prose turn mid-work is a pause, nudged and continued. This is the
 *      fault that killed four of egg-one's tab wakes (xstream-bsp#142) and it
 *      matters more here, where nobody is watching.
 *   3. A wake that never folds is DEGRADED, not lost: the last text is
 *      salvaged and the note says plainly that it did not fold.
 *   4. The one refusal survives: a root write to a populated block never
 *      reaches the beach from an unwatched wake.
 *   5. `?mode=bare` still runs the original tool-less kernel form.
 *   6. Cron auth holds.
 *
 * Run: node scripts/test-genus-clock.mjs
 */
import handler from '../api/genus-clock.js';

let checks = 0;
const assert = (cond, msg) => {
  if (!cond) { console.error(`✗ ${msg}`); process.exit(1); }
  checks += 1;
};

const WINDOW =
  'γ: 2 structural gaps\n' +
  '════════ SYSTEM ════════\nyou are the instance; your shell is here\n' +
  '════════ MESSAGE ════════\nthe given: close the nearest gap';

/** Script the world. `turns` are Anthropic replies, consumed in order. */
function stub({ turns, onBsp }) {
  const sent = { anthropic: [], mcp: [] };
  globalThis.fetch = async (url, init) => {
    const body = init && init.body ? JSON.parse(init.body) : {};
    if (String(url).includes('api.anthropic.com')) {
      sent.anthropic.push(body);
      const t = turns[Math.min(sent.anthropic.length - 1, turns.length - 1)];
      const content = [];
      if (t.text) content.push({ type: 'text', text: t.text });
      if (t.tool) content.push({ type: 'tool_use', id: `tu${sent.anthropic.length}`, name: t.tool.name, input: t.tool.input });
      return { ok: true, json: async () => ({ content, stop_reason: t.stop ?? (t.tool ? 'tool_use' : 'end_turn'), usage: { input_tokens: 10, output_tokens: 5 } }) };
    }
    // MCP
    sent.mcp.push(body);
    const method = body.method;
    if (method === 'initialize') {
      return { ok: true, headers: { get: (h) => (h === 'mcp-session-id' ? 'sess-1' : null) }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }) };
    }
    const name = body.params && body.params.name;
    const args = (body.params && body.params.arguments) || {};
    let text = 'ok';
    if (name === 'pscale_genus') text = args.fold ? 'fold ack: applied' : WINDOW;
    if (name === 'bsp') text = onBsp ? onBsp(args) : 'block content here';
    return { ok: true, headers: { get: () => 'sess-1' }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text }] } }) };
  };
  return sent;
}

const mkRes = () => {
  const out = {};
  return {
    out,
    status(c) { out.code = c; return this; },
    json(j) { out.body = j; return this; },
  };
};

// Default the due-ness gate OFF so the pulse/seat tests below exercise the wake
// itself, not the gate (which adds a trace read and can skip). The gate has its
// own section, where it is turned on explicitly.
const run = async (query, turns, onBsp) => {
  const sent = stub({ turns, onBsp });
  const res = mkRes();
  await handler({ query: { gate: 'off', ...query }, headers: {} }, res);
  return { ...res.out, sent };
};

process.env.VAULT_KEY_CLAUDE = 'test-key';
process.env.GENUS_PASSPHRASE_EGG_ONE = 'test-pass';
delete process.env.CRON_SECRET;

// ── 1. seat is the default; tools are offered; writes carry the passphrase ──
{
  const bspSeen = [];
  const r = await run({ handle: 'egg-one' }, [
    { tool: { name: 'bsp', input: { block: 'pool' } } },
    { tool: { name: 'bsp', input: { block: 'surface', spindle: '9', content: 'a published line' } } },
    { tool: { name: 'fold', input: { note: 'read the room, published', status: 'continue' } } },
  ], (args) => { bspSeen.push(args); return 'contents'; });

  assert(r.code === 200, `seat wake returns 200 (got ${r.code}: ${JSON.stringify(r.body).slice(0, 200)})`);
  assert(r.body.mode === 'seat', 'seat is the DEFAULT mode');
  assert(r.body.door === 'crab-seat via mcp', 'the trace door names the seat');
  assert(r.body.closed === true, 'the wake closed by its own fold call');
  assert(r.body.turns === 3, `three turns (got ${r.body.turns})`);
  assert(r.body.tools === 3, `three acts recorded (got ${r.body.tools})`);
  assert(r.sent.anthropic[0].tools.map(t => t.name).join(',') === 'bsp,fold', 'the pulse is offered bsp + fold');
  assert(bspSeen.length === 2, 'both bsp calls reached the MCP door');
  assert(bspSeen[0].agent_id === 'egg-one' && bspSeen[0].block === 'pool', 'a bare organ routes as its own block');
  assert(bspSeen[1].secret === 'test-pass', "a WRITE carries the instance's own passphrase");
  assert(bspSeen[0].secret === undefined, 'a READ carries no secret');
  const foldCall = r.sent.mcp.find(m => m.params && m.params.arguments && m.params.arguments.fold);
  assert(!!foldCall, 'the fold went back through the same door');
  assert(foldCall.params.arguments.fold.note === 'read the room, published', 'the fold is the tool payload, not parsed prose');
  assert(foldCall.params.arguments.fold.acted === 1, 'the fold carries acted = the in-loop WRITE count (1 write, 1 read → acted 1)');
  assert(r.body.wrote === 1, 'the response reports one in-loop write');
  // caching: every Anthropic call sends the window as a cached content block
  assert(Array.isArray(r.sent.anthropic[0].system) && r.sent.anthropic[0].system[0].cache_control, 'the composed window is sent as a cached block');
}

// ── 1c. a refused write does NOT count toward acted ────────────────────────
{
  const r = await run({ handle: 'egg-one' }, [
    { tool: { name: 'bsp', input: { block: 'surface', spindle: '9', content: 'ok' } } },
    { tool: { name: 'bsp', input: { block: 'grain:someone', spindle: '1', content: 'nope' } } },
    { tool: { name: 'fold', input: { note: 'one landed, one refused' } } },
  ], (args) => (args.block === 'grain:someone' ? 'the beach refused: not your lock' : 'written'));
  const foldCall = r.sent.mcp.find(m => m.params && m.params.arguments && m.params.arguments.fold);
  assert(foldCall.params.arguments.fold.acted === 1, 'a refused write is not counted — acted stays 1');
}

// ── 1b. a bare name is an ORGAN only if the genome has one ─────────────────
// Routing `marks` as marks:<handle> would send the instance to a private block
// of its own instead of the beach's noticeboard — the phantom-room fault again.
{
  const seen = [];
  await run({ handle: 'egg-one' }, [
    { tool: { name: 'bsp', input: { block: 'marks' } } },
    { tool: { name: 'bsp', input: { block: 'sunstone' } } },
    { tool: { name: 'bsp', input: { block: 'surface' } } },
    { tool: { name: 'bsp', input: { block: 'surface:weft' } } },
    { tool: { name: 'fold', input: { note: 'swept' } } },
  ], (args) => { seen.push(args); return 'contents'; });
  const at = (b) => seen.find(s => s.block === b);
  assert(at('marks').agent_id.startsWith('https://'), 'bare `marks` is the BEACH board, not marks:<handle>');
  assert(at('sunstone').agent_id.startsWith('https://'), 'bare `sunstone` is the teaching at the beach');
  assert(at('surface').agent_id === 'egg-one', 'bare `surface` IS its own organ');
  assert(at('surface:weft').agent_id.startsWith('https://'), "a peer's surface addresses the beach");
}

// ── 2. a prose turn is a PAUSE, not the end of the wake ────────────────────
{
  const r = await run({ handle: 'egg-one' }, [
    { tool: { name: 'bsp', input: { block: 'pool' } } },
    { text: 'Let me read the full structure of purpose:3 before I write…' }, // egg-one leaf 15, verbatim shape
    { tool: { name: 'bsp', input: { block: 'purpose' } } },
    { tool: { name: 'fold', input: { note: 'closed after thinking' } } },
  ]);
  assert(r.body.closed === true, 'a mid-work prose turn does not end the wake');
  assert(r.body.turns === 4, `the loop continued through the pause (got ${r.body.turns})`);
  const nudge = JSON.stringify(r.sent.anthropic[2].messages.at(-1));
  assert(nudge.includes('close it by calling fold'), 'the pause is nudged toward the closing call');
}
{
  const r = await run({ handle: 'egg-one' }, [
    { text: 'a reply that ran out of ro', stop: 'max_tokens' },
    { tool: { name: 'fold', input: { note: 'n' } } },
  ]);
  const nudge = JSON.stringify(r.sent.anthropic[1].messages.at(-1));
  assert(nudge.includes('cut at the output limit'), 'a token cut is named as a truncation, not as narration');
}

// ── 3. a wake that never folds is degraded, not lost ───────────────────────
{
  const seen = [];
  const r = await run({ handle: 'egg-one', turns: '3' }, [
    { tool: { name: 'bsp', input: { block: 'surface', spindle: '2', content: 'a real write mid-work' } } },
    { text: 'still thinking, no fold ever comes' },
    { text: 'and still not folding' },
  ], (args) => { seen.push(args); return 'written'; });
  assert(r.code === 200, 'an unclosed wake still completes');
  assert(r.body.closed === false, 'it is reported as not closed');
  assert(r.body.note.startsWith('[did not fold'), `the note says so plainly (got: ${r.body.note.slice(0, 60)})`);
  assert(r.body.note.includes('1 write(s) landed'), 'the note reports how many in-loop writes landed');
  assert(r.body.note.includes('and still not folding'), "the model's actual last words are salvaged into the record");
  assert(r.body.turns === 3, 'the turn budget bounded it');
  // the salvaged fold is NOTE-ONLY (no greedy-parsed garbage writes) and still
  // carries acted so pscale_genus records a leaf for the writes that landed.
  const foldCall = r.sent.mcp.find(m => m.params && m.params.arguments && m.params.arguments.fold);
  assert(JSON.stringify(foldCall.params.arguments.fold.writes) === '{}', 'the salvage sends NO writes — the in-loop ones already landed');
  assert(foldCall.params.arguments.fold.acted === 1, 'the salvage still carries acted so the leaf is earned');
}

// ── 4. the one refusal survives into the unwatched wake ────────────────────
{
  const bspSeen = [];
  const r = await run({ handle: 'egg-one' }, [
    { tool: { name: 'bsp', input: { block: 'pool:egg-one', content: { 1: 'clobber' } } } },
    { tool: { name: 'fold', input: { note: 'tried' } } },
  ], (args) => { bspSeen.push(args); return 'ok'; });
  assert(bspSeen.length === 0, 'a root write to a populated block NEVER reaches the beach');
  assert(r.body.closed === true, 'the wake still closes after a refusal');
}
{
  // ...but an APPEND to the room is exactly how it speaks, and must pass.
  const bspSeen = [];
  await run({ handle: 'egg-one' }, [
    { tool: { name: 'bsp', input: { block: 'pool', content: 'my answer', append: true } } },
    { tool: { name: 'fold', input: { note: 'answered' } } },
  ], (args) => { bspSeen.push(args); return 'appended at slot 33'; });
  assert(bspSeen.length === 1 && bspSeen[0].append === true, 'an append to its own room passes through');
  assert(bspSeen[0].secret === 'test-pass', 'the append carries its passphrase');
}

// ── 5. the bare kernel form is still reachable ─────────────────────────────
{
  const r = await run({ handle: 'egg-one', mode: 'bare' }, [
    { text: '{"note":"bare pulse note","status":"rest","writes":{}}' },
  ]);
  assert(r.body.mode === 'bare', 'mode=bare runs the original form');
  assert(r.body.door === 'crab-clock via mcp', 'the bare door keeps its old name');
  assert(r.body.note === 'bare pulse note', 'the trailing JSON fold still parses');
  assert(r.sent.anthropic[0].tools === undefined, 'the bare pulse is offered NO tools — it stays the kernel spec');
}

// ── 6. cron auth ───────────────────────────────────────────────────────────
{
  process.env.CRON_SECRET = 's3cret';
  const bad = await run({ handle: 'egg-one' }, [{ tool: { name: 'fold', input: { note: 'x' } } }]);
  assert(bad.code === 401, 'a call without the cron bearer is refused');
  const res = mkRes();
  stub({ turns: [{ tool: { name: 'fold', input: { note: 'ok' } } }] });
  await handler({ query: { handle: 'egg-one' }, headers: { authorization: 'Bearer s3cret' } }, res);
  assert(res.out.code === 200, 'the cron bearer is accepted');
  delete process.env.CRON_SECRET;
}

// ── 7. DUE-NESS: spend only when a concern is live ─────────────────────────
// A JSON given (room/liquid/task with timestamps) + a trace whose newest leaf
// is the last wake. The stub returns that trace when bsp reads trace:<handle>.
{
  const DAY = 86400_000;
  const now = Date.now();
  const iso = (ms) => new Date(now - ms).toISOString();
  // given with one room entry; its age varies per test via a builder
  const windowWith = (roomAgeMs) =>
    'γ: 0 structural gaps\n════════ SYSTEM ════════\nshell\n════════ MESSAGE ════════\n' +
    JSON.stringify({ gap: [], task: {}, room: [{ '1': 'happyseaurchin', '3': iso(roomAgeMs), '_': 'a message to you' }], liquid: [] });
  const lastWakeIso = iso(2 * DAY); // trace's newest leaf: last wake was 2 days ago
  // custom stub: pscale_genus returns our window; bsp trace read returns the last-wake stamp
  const gateStub = (win) => {
    const sent = { anthropic: [], mcp: [] };
    globalThis.fetch = async (url, init) => {
      // the direct beach GET for the trace (raw JSON) — the gate's last-wake read
      if (String(url).includes('/.well-known/pscale-beach') && String(url).includes('block=trace')) {
        return { ok: true, json: async () => ({ _: 'traces', '1': { '_': 'a prior wake', '1': 'egg-one', '3': lastWakeIso } }) };
      }
      const body = init && init.body ? JSON.parse(init.body) : {};
      if (String(url).includes('api.anthropic.com')) {
        sent.anthropic.push(body);
        return { ok: true, json: async () => ({ content: [{ type: 'tool_use', id: 't1', name: 'fold', input: { note: 'woke' } }], stop_reason: 'tool_use', usage: {} }) };
      }
      sent.mcp.push(body);
      if (body.method === 'initialize') return { ok: true, headers: { get: () => 'sess' }, text: async () => JSON.stringify({ result: {} }) };
      const nm = body.params?.name, args = body.params?.arguments || {};
      let text = 'ok';
      if (nm === 'pscale_genus') text = args.fold ? 'ack' : win;
      return { ok: true, headers: { get: () => 'sess' }, text: async () => JSON.stringify({ result: { content: [{ type: 'text', text }] } }) };
    };
    return sent;
  };
  const runGate = async (query, win) => {
    const sent = gateStub(win);
    const res = mkRes();
    await handler({ query: { handle: 'egg-one', ...query }, headers: {} }, res);
    return { ...res.out, sent };
  };

  // nothing new: the room message is OLDER than the last wake, and γ=0 → SKIP
  const skip = await runGate({}, windowWith(5 * DAY));
  assert(skip.body.skipped === true, 'nothing due → the wake is SKIPPED, no LLM spend');
  assert(skip.sent.anthropic.length === 0, 'a skipped wake spends ZERO model calls');
  assert(/nothing due/.test(skip.body.reason), 'the skip says why');

  // a reach NEWER than the last wake → WAKE, because responsiveness
  const reach = await runGate({}, windowWith(1 * 3600_000)); // 1h old, last wake 2d ago
  assert(reach.body.skipped !== true, 'a reach since the last wake → the gate lets it through');
  assert(reach.body.woke_because.includes('reached-since-last-wake'), 'it woke because someone reached it');
  assert(reach.sent.anthropic.length >= 1, 'a due wake spends the pulse');

  // γ>0 and a long time since the last wake → the periodic PURPOSE tick
  const purposeWin = windowWith(5 * DAY).replace('γ: 0', 'γ: 3');
  const purpose = await runGate({ purpose_hours: '20' }, purposeWin);
  assert(purpose.body.woke_because.includes('purpose-tick'), 'γ>0 after a full period → the purpose tick fires');

  // γ>0 but the purpose period NOT elapsed, and no reach → still SKIP
  const soonWin = 'γ: 3 structural gaps\n════════ SYSTEM ════════\ns\n════════ MESSAGE ════════\n' +
    JSON.stringify({ room: [{ '1': 'x', '3': iso(5 * DAY), '_': 'old' }], liquid: [] });
  const tooSoon = await runGate({ purpose_hours: '9999' }, soonWin);
  assert(tooSoon.body.skipped === true, 'γ>0 but within the purpose period and no reach → still skips');

  // ?force=1 overrides the gate entirely
  const forced = await runGate({ force: '1' }, windowWith(5 * DAY));
  assert(forced.body.skipped !== true && forced.body.woke_because.includes('gate-off'), 'force=1 wakes regardless');
}

console.log(`✓ genus-clock headless seat: ${checks} checks passed`);
