/**
 * Filmstrip producer — records LLM input/output in a format readable by
 * the filmstrip viewer (see FILMSTRIP-SPEC.md).
 *
 * Emits two JSON objects per concern cycle:
 *   frame — { ts, concern, path, tier, model, echo, system, message, output,
 *             tools[], tokens, b_loop_count, log_file }   ← C-loop view
 *   log   — { meta, b_loops[] }                           ← B/A-loop view
 *
 * Two usage modes:
 *   1) Wrapper: startCycle → run({...}) → endCycle
 *   2) Manual:  startCycle → recordBLoop / recordTool (your own HTTP) → endCycle
 *
 * Works in browser and Node 20+ (global fetch). No dependencies.
 */

const API_URL_DEFAULT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

function isoSecondsUTC(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T` +
         `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+00:00`;
}

function filenameSafe(concern, ts, tier) {
  const c = (concern || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return `${ts}-${c}-${tier || 'unknown'}.json`.replace(/:/g, '');
}

function truncateStr(v, n = 200) {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) : s;
}

export class Filmstrip {
  constructor(opts = {}) {
    this.apiKey = opts.apiKey ?? null;
    this.apiUrl = opts.apiUrl ?? API_URL_DEFAULT;
    this.maxIterations = opts.maxIterations ?? 10;
    this._cycle = null;
  }

  /** Begin a concern cycle. Call once before any API call. */
  startCycle({ concern, path = '', tier = 'unknown', model = '', ts } = {}) {
    this._cycle = {
      meta: {
        ts: ts ?? isoSecondsUTC(),
        concern: concern ?? 'unknown',
        path,
        tier,
        model,
      },
      bLoops: [],
      toolLog: [],
      tokens: { input: 0, output: 0 },
    };
  }

  /** Manual: record one HTTP round-trip. */
  recordBLoop({ request, response, durationMs }) {
    if (!this._cycle) throw new Error('call startCycle() first');
    const reqCopy = { ...request };
    delete reqCopy.system; // already captured in the frame; saves space
    this._cycle.bLoops.push({
      index: this._cycle.bLoops.length,
      request: reqCopy,
      response,
      duration_ms: durationMs,
    });
    const usage = response?.usage ?? {};
    this._cycle.tokens.input += usage.input_tokens ?? 0;
    this._cycle.tokens.output += usage.output_tokens ?? 0;
  }

  /** Manual: record one executed tool use (for the tools[] summary). */
  recordTool({ name, input, output }) {
    if (!this._cycle) throw new Error('call startCycle() first');
    this._cycle.toolLog.push({
      name,
      input: truncateStr(input ?? ''),
      output: truncateStr(output ?? ''),
    });
  }

  /** Close the cycle. Returns { frame, log } ready for the viewer. */
  endCycle({ system, message, output, echo = 0 }) {
    if (!this._cycle) throw new Error('call startCycle() first');
    const { meta, bLoops, toolLog, tokens } = this._cycle;
    const logFile = filenameSafe(meta.concern, meta.ts, meta.tier)
      .replace(/\.json$/, '.log.json');
    const frame = {
      ts: meta.ts,
      concern: meta.concern,
      path: meta.path,
      tier: meta.tier,
      model: meta.model,
      echo,
      system,
      message,
      output,
      tools: toolLog,
      tokens,
      b_loop_count: bLoops.length,
      log_file: logFile,
    };
    const log = { meta, b_loops: bLoops };
    this._cycle = null;
    return { frame, log };
  }

  /**
   * Wrapper mode: run the full A-loop. Handles tool_use iterations.
   *   system       — system prompt string (also stored on the frame)
   *   messages     — initial messages array
   *   tools        — Anthropic tool schemas (optional)
   *   model        — overrides model set in startCycle
   *   maxTokens    — defaults to 4096
   *   executeTool  — async (name, input) => string  (required if tools given)
   * Returns { text, tokens, toolLog }.
   */
  async run({ system, messages, tools = [], model, maxTokens = 4096, executeTool }) {
    if (!this._cycle) throw new Error('call startCycle() first');
    if (!this.apiKey) throw new Error('apiKey required for run()');
    const modelId = model ?? this._cycle.meta.model;
    if (!modelId) throw new Error('model required (pass to startCycle or run)');

    const current = [...messages];
    let lastTexts = [];

    for (let i = 0; i < this.maxIterations; i++) {
      const body = { model: modelId, max_tokens: maxTokens, system, messages: current };
      if (tools.length) body.tools = tools;

      const t0 = Date.now();
      const resp = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      this.recordBLoop({ request: body, response: data, durationMs: Date.now() - t0 });
      if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${JSON.stringify(data)}`);

      const blocks = data.content ?? [];
      lastTexts = blocks.filter(b => b.type === 'text').map(b => b.text);
      const toolUses = blocks.filter(b => b.type === 'tool_use');

      if (data.stop_reason !== 'tool_use' || toolUses.length === 0 || !executeTool) {
        return {
          text: lastTexts.join('\n'),
          tokens: { ...this._cycle.tokens },
          toolLog: this._cycle.toolLog.slice(),
        };
      }

      current.push({ role: 'assistant', content: blocks });
      const toolResults = [];
      for (const tu of toolUses) {
        const out = await executeTool(tu.name, tu.input ?? {});
        const outStr = typeof out === 'string' ? out : JSON.stringify(out);
        this.recordTool({ name: tu.name, input: tu.input ?? {}, output: outStr });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: outStr.slice(0, 4000) });
      }
      current.push({ role: 'user', content: toolResults });
    }
    throw new Error(`exceeded ${this.maxIterations} tool iterations`);
  }
}

/** POST { frame, log } to an ingest endpoint. */
export async function postPair(url, frame, log) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frame, log }),
  });
  if (!r.ok) throw new Error(`filmstrip ingest failed: ${r.status}`);
  return r.json().catch(() => ({}));
}

/** Browser helper: download both JSON files. Names match the Python producer. */
export function downloadPair(frame, log) {
  const frameName = filenameSafe(frame.concern, frame.ts, frame.tier);
  const logName = frameName.replace(/\.json$/, '.log.json');
  _download(frameName, frame);
  _download(logName, log);
}

function _download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Browser helper: stash a pair under localStorage (viewer can later read these). */
export function stashPair(frame, log, prefix = 'filmstrip') {
  const key = `${prefix}:${frame.ts}:${frame.concern}`;
  localStorage.setItem(key + ':frame', JSON.stringify(frame));
  localStorage.setItem(key + ':log', JSON.stringify(log));
  return key;
}
