#!/usr/bin/env python3
"""session-flow.py — a Claude Code session drawn as semantic flow, passively, from its log.

Reads one Claude Code transcript (~/.claude/projects/<project>/<session>.jsonl) and writes a
flow document that mindflow/flow/ draws. Nothing is added to the loop to get this: the
harness already records every call's measured usage and every tool result. This is the
"produced passively from logs" answer.

The export carries LABELS and SIZES only. A tool result's body is never copied; a tool
input is reduced to its address (a bsp call's agent_id / block / spindle / pscale, a Bash
call's description, a Read's basename) and every `secret`, `new_lock`, `enc_secret` and
similar field is dropped unread. The transcript may hold keys; the flow document cannot.

    python3 session-flow.py <transcript.jsonl> [-o data/session.json] [--title "..."]

Model (shared with index.html — `flow: 1`):
  rows[].moments[] alternate window / output. A window's `tokens` is the measured prompt
  size of that call (input + cache_creation + cache_read); an output's `tokens` is its
  measured output_tokens. Span `tokens` inside a window are estimated shares (chars / 4)
  scaled so the coloured spans plus the harness residual equal the measured total. The
  harness band is fixed from the first call's residual and carried unchanged — it IS the
  stable band, and the drift it would otherwise show is estimation noise, not semantics.
"""
import argparse
import json
import os
import re
import sys
from collections import OrderedDict

CHARS_PER_TOKEN = 4.0
DROP_KEYS = {'secret', 'new_lock', 'enc_secret', 'passphrase', 'password', 'token', 'apikey', 'api_key'}

# Which lodestone rung a beach block belongs to, by name family. The page carries the
# same table for windows it adapts itself; keep the two in step.
RUNG_BY_BLOCK = [
    (r'^(identity|orientation|shell|passport|reflexive|purpose|cook|declaration)', '1'),
    (r'^(whetstone|sunstone|block-conventions|manifest|ways|strata|agent-id|open-commons|sundial)', '2'),
    (r'^(history|daily|review|order|solid|trace|conditions|vision|task)', '3'),
    (r'^(watch|now|spatial|temporal|marks|lighthouse|news|calendar)', '4'),
    (r'^(grain|sed|pool|liquid|relationships|passport:|between|room)', '5'),
    (r'^(lodestone|genome|recipe|frame|function|compile)', '7'),
]


def rung_for_block(block):
    for pat, rung in RUNG_BY_BLOCK:
        if re.match(pat, block or ''):
            return rung
    return None


def est_tokens(chars):
    return chars / CHARS_PER_TOKEN


def text_len(content):
    if content is None:
        return 0
    if isinstance(content, str):
        return len(content)
    if isinstance(content, list):
        n = 0
        for b in content:
            if isinstance(b, dict):
                if b.get('type') == 'text':
                    n += len(b.get('text') or '')
                elif 'content' in b:
                    n += text_len(b['content'])
                else:
                    n += len(json.dumps(b))
            else:
                n += len(str(b))
        return n
    return len(json.dumps(content))


def label_tool(name, inp):
    """A tool call reduced to its address. Never returns a value from a dropped key."""
    inp = {k: v for k, v in (inp or {}).items() if k.lower() not in DROP_KEYS}
    short = name.split('__')[-1] if name.startswith('mcp__') else name
    if short == 'bsp':
        parts = [str(inp.get('agent_id', '?'))]
        if inp.get('block'):
            parts.append(str(inp['block']))
        s = ':'.join(parts)
        if inp.get('spindle') not in (None, ''):
            s += f" @{inp['spindle']}"
        if inp.get('pscale_attention') is not None:
            s += f" P{inp['pscale_attention']}"
        verb = 'write' if 'content' in inp or 'new_lock' in (inp or {}) else 'read'
        return f"bsp {verb} {s}", str(inp.get('block') or inp.get('agent_id') or '')
    if short == 'Bash':
        return f"bash · {inp.get('description') or (inp.get('command') or '')[:60]}", None
    if short in ('Read', 'Write', 'Edit'):
        return f"{short.lower()} · {os.path.basename(str(inp.get('file_path', '')))}", None
    if short == 'execute_sql':
        return "sql · " + (inp.get('query') or '')[:50].replace('\n', ' '), None
    if short == 'pscale_pool_engage':
        return f"pool {inp.get('pool_name', '?')}", 'pool'
    return short, None


def load_transcript(path):
    calls = OrderedDict()   # message id -> {usage, blocks:[...]}
    results = {}            # tool_use_id -> chars
    prompt = None
    first_user_seen = False
    with open(path) as fh:
        for line in fh:
            try:
                o = json.loads(line)
            except Exception:
                continue
            t = o.get('type')
            m = o.get('message') or {}
            c = m.get('content')
            if t == 'user':
                if isinstance(c, list):
                    for b in c:
                        if isinstance(b, dict) and b.get('type') == 'tool_result':
                            results[b.get('tool_use_id')] = text_len(b.get('content'))
                if not first_user_seen:
                    if isinstance(c, str) and c.strip():
                        prompt = c
                        first_user_seen = True
                    elif isinstance(c, list) and any(isinstance(b, dict) and b.get('type') == 'text' for b in c):
                        prompt = '\n'.join(b.get('text', '') for b in c if isinstance(b, dict) and b.get('type') == 'text')
                        first_user_seen = True
            elif t == 'assistant':
                mid = m.get('id') or o.get('uuid')
                entry = calls.setdefault(mid, {'usage': None, 'blocks': [], 'ts': o.get('timestamp')})
                if m.get('usage'):
                    entry['usage'] = m['usage']
                if isinstance(c, list):
                    for b in c:
                        if isinstance(b, dict):
                            entry['blocks'].append(b)
    return prompt, list(calls.values()), results


def build(prompt, calls, results, title):
    """A span's tokens are fixed the moment it ENTERS a window and never rescaled: the
    window it entered is byte-identical in every later call. Call 0 splits its measured
    total between the ask (chars / 4) and the harness (the residual); every later call's
    measured GROWTH is shared, by chars, among that call's entrants only — the previous
    reply's text and calls, and the tool results they fetched. The estimate therefore
    touches only the split within a step; the steps themselves are measured."""
    moments = []
    carried = []            # spans already in the window, tokens fixed at entry
    harness_tokens = None
    prompt_chars = len(prompt or '')
    prev_total = None
    pending = []            # entrants for the next window: [{span, chars}]
    for k, call in enumerate(calls):
        u = call['usage'] or {}
        total = (u.get('input_tokens') or 0) + (u.get('cache_creation_input_tokens') or 0) + (u.get('cache_read_input_tokens') or 0)
        if harness_tokens is None:
            ask_tokens = min(round(est_tokens(prompt_chars)), total)
            harness_tokens = max(total - ask_tokens, 0)
            carried.append({'key': 'prompt', 'label': 'the ask (David)', 'cls': 'prompt', 'rung': '6', 'chars': prompt_chars,
                            'tokens': ask_tokens, 'text': (prompt or '')[:600]})
        else:
            growth = max(total - (prev_total or 0), 0)
            est = sum(est_tokens(s['chars']) for s in pending) or 1
            for s in pending:
                s['tokens'] = round(est_tokens(s['chars']) * growth / est) if growth else round(est_tokens(s['chars']))
                carried.append(s)
            pending = []
        prev_total = total
        spans = [{'key': 'harness', 'label': 'harness — system prompt, tool schemas, CLAUDE.md, memory index',
                  'cls': 'harness', 'rung': None, 'chars': None, 'tokens': round(harness_tokens),
                  'text': 'The part of the window the beach never sees: measured as the residual of the first call (its total prompt tokens minus the ask at four chars a token).'}]
        spans += [dict(s) for s in carried]
        moments.append({'id': f'w{k}', 'label': f'call {k + 1}', 'kind': 'window', 'tokens': total,
                        'measured': True, 'ts': call.get('ts'), 'spans': spans})
        # ── what the model emitted ──
        out_spans = []
        think_chars = sum(len(b.get('thinking') or '') for b in call['blocks'] if b.get('type') == 'thinking')
        text_chars = sum(len(b.get('text') or '') for b in call['blocks'] if b.get('type') == 'text')
        tool_uses = [b for b in call['blocks'] if b.get('type') == 'tool_use']
        if think_chars:
            out_spans.append({'key': f'think:{k}', 'label': 'thinking (not carried)', 'cls': 'thinking', 'rung': None,
                              'chars': think_chars, 'feeds': []})
        if text_chars:
            out_spans.append({'key': f'out:{k}', 'label': f'reply text, call {k + 1}', 'cls': 'output', 'rung': None,
                              'chars': text_chars})
            pending.append({'key': f'out:{k}', 'label': f'reply text, call {k + 1}', 'cls': 'output', 'rung': None, 'chars': text_chars})
        for tu in tool_uses:
            lab, block = label_tool(tu.get('name', '?'), tu.get('input') or {})
            tid = tu.get('id')
            call_chars = len(json.dumps({k2: v for k2, v in (tu.get('input') or {}).items() if k2.lower() not in DROP_KEYS}))
            out_spans.append({'key': f'call:{tid}', 'label': f'call → {lab}', 'cls': 'call', 'rung': rung_for_block(block),
                              'chars': call_chars, 'feeds': [f'tool:{tid}']})
            pending.append({'key': f'tool:{tid}', 'label': lab, 'cls': 'tool', 'rung': rung_for_block(block),
                            'chars': results.get(tid, 0), 'new': True})
        out_total = u.get('output_tokens') or 0
        est_out = sum(est_tokens(s['chars']) for s in out_spans) or 1
        for s in out_spans:
            s['tokens'] = round(est_tokens(s['chars']) * (out_total / est_out)) if out_total else round(est_tokens(s['chars']))
        moments.append({'id': f'o{k}', 'label': f'reply {k + 1}', 'kind': 'output', 'tokens': out_total,
                        'measured': bool(out_total), 'reads': 'all', 'spans': out_spans})
    return {
        'flow': 1,
        'kind': 'session',
        'title': title,
        'meta': {
            'source': 'Claude Code transcript (labels and sizes only)',
            'notes': [
                'Window heights are the measured prompt tokens of each call (input + cache creation + cache read).',
                'The harness band is the first call\'s residual, carried unchanged. Each later call\'s measured growth is shared by chars among that call\'s entrants only; a span\'s tokens are fixed at entry and never rescaled.',
                'Thinking is drawn in the reply column and not carried forward.',
            ],
        },
        'rows': [{'label': 'loop A — one session, one row', 'moments': moments}],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('transcript')
    ap.add_argument('-o', '--out', default=None)
    ap.add_argument('--title', default=None)
    ap.add_argument('--max-calls', type=int, default=0, help='cap the number of calls drawn (0 = all)')
    a = ap.parse_args()
    prompt, calls, results = load_transcript(a.transcript)
    if a.max_calls:
        calls = calls[:a.max_calls]
    title = a.title or f'Claude Code session — {os.path.basename(a.transcript)[:8]}'
    doc = build(prompt, calls, results, title)
    out = a.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'session.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as fh:
        json.dump(doc, fh, indent=1)
    n_calls = len(calls)
    print(f'{out}: {n_calls} calls, {len(results)} tool results, harness ≈ {doc["rows"][0]["moments"][0]["spans"][0]["tokens"]} tokens', file=sys.stderr)


if __name__ == '__main__':
    main()
