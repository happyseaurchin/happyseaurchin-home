#!/usr/bin/env python3
"""
tool_tree.py — lane 3 of the pscale lab (spine:pscale-lab 1.113), the tool tree. weft, lane pscale.lab, 20 November 2026.

An AI is handed its tools as one flat list, read in full before it acts. Here the tools of a real session stand in a
pscale block, nine to a ring: at the root nine families, each a line saying what its tools are for; beneath each, nine
more; a tool's name at its leaf, its definition kept where the session keeps it. A model is given tasks that each need
one tool, and chooses it three ways:

  flat     the session's definitions in full, as the model's own chat template hands tools over (name, description,
           parameters), and the model calls the tool it wants; its name is read from the call.
  tree     the block walked one ring at a time: at each ring the model is shown the task, the walk so far (each rung's
           line, root first: its spindle) and the ring's nine lines, and picks a digit by its scores for the digits
           present; a leaf's line is the tool's name and the first sentence of its description.
  control  the same walk with every family line blanked, the leaves as before: a gain the tree makes over this is the
           voicing's, not the depth's.

Measured per task: the right tool chosen (any name the task accepts), the tokens of tool text read before acting (the
flat list whole; the tree's rings and its spindle lines, plus the one definition then read to call the tool), every
token the model processed, and the time to act. The flat list's shared prefix is read once and kept, and its time to
act is given both ways: kept, and fresh (the prefix's own time added, as a call that keeps nothing pays it).

  python3 -I tool_tree.py --tools tools.json --tree tree.json --tasks tasks.json \
      --model Qwen/Qwen2.5-1.5B-Instruct --arms flat,tree,control --out run.json
"""
import argparse
import json
import re
import statistics
import sys
import time

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

DIGITS = '123456789'
SYSTEM_TREE = ('You find the one tool a task needs by walking a tree of tools one ring at a time. '
               'Each ring offers numbered lines; pick the line that leads to the tool for the task.')
SYSTEM_FLAT = 'You are a helpful assistant. Use the one tool the user\'s request needs.'


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def voice(n):
    while isinstance(n, dict):
        n = n.get('_', '')
    return n if isinstance(n, str) else ''


def first_sentence(t, cap=220):
    t = re.sub(r'\s+', ' ', (t or '').strip())
    m = re.match(r'(.+?[.!?])(\s|$)', t)
    s = m.group(1) if m else t
    return s if len(s) <= cap else s[:cap - 1].rstrip() + '…'


def leaves(node, path=()):
    """every (path, tool name) beneath a node; a leaf is a string naming its tool"""
    if isinstance(node, str):
        yield path, node
        return
    for d in DIGITS:
        if d in node:
            yield from leaves(node[d], path + (d,))


class Model:
    def __init__(self, name, threads):
        torch.set_num_threads(threads)
        torch.set_grad_enabled(False)
        self.tok = AutoTokenizer.from_pretrained(name)
        self.m = AutoModelForCausalLM.from_pretrained(name, dtype=torch.bfloat16, attn_implementation='sdpa')
        self.m.eval()
        self.digit_ids = {d: self.tok.convert_tokens_to_ids(d) for d in DIGITS}
        assert all(isinstance(i, int) and i >= 0 for i in self.digit_ids.values()), self.digit_ids
        self.n_ctx = getattr(self.m.config, 'max_position_embeddings', 32768)

    def ntok(self, text):
        return len(self.tok(text, add_special_tokens=False).input_ids)

    def chat(self, system, user, tools=None):
        msgs = [{'role': 'system', 'content': system}, {'role': 'user', 'content': user}]
        return self.tok.apply_chat_template(msgs, tools=tools, add_generation_prompt=True, tokenize=False)


# ── the tree: one ring at a time ──
def ring_prompt(task, chain, node, defs, blank):
    lines = []
    for d in DIGITS:
        if d not in node:
            continue
        c = node[d]
        if isinstance(c, str):
            lines.append(f'{d}. {c} — {first_sentence(defs[c]["description"])}')
        else:
            lines.append(f'{d}. ' + ('—' if blank else voice(c)))
    where = ' › '.join(('—' if blank else v) for v in chain) if chain else 'the top of the tree'
    leafy = all(isinstance(node[d], str) for d in DIGITS if d in node)
    ask = 'Which of these is the tool for the task?' if leafy else 'Which of these leads to the tool for the task?'
    user = f'Task: {task}\n\nWhere you are: {where}\n\n{ask}\n' + '\n'.join(lines) + '\n\nAnswer with the number only.'
    return user, '\n'.join(lines) + '\n' + where


def walk(M, task, tree, defs, accept, blank):
    node, chain, path = tree, [voice(tree)], []
    steps, read_tool_text, processed, t0 = [], 0, 0, time.perf_counter()
    while True:
        user, shown = ring_prompt(task, chain[1:], node, defs, blank)
        prompt = M.chat(SYSTEM_TREE, user)
        ids = M.tok(prompt, return_tensors='pt', add_special_tokens=False).input_ids
        processed += ids.shape[1]
        read_tool_text += M.ntok(shown)
        logits = M.m(input_ids=ids).logits[0, -1].float()
        present = [d for d in DIGITS if d in node]
        scores = {d: float(logits[M.digit_ids[d]]) for d in present}
        pick = max(present, key=lambda d: scores[d])
        right = [d for d in present if any(name in accept for _, name in leaves(node[d]))]
        steps.append({'ring': ''.join(path) or '0', 'pick': pick, 'right': right, 'ok': pick in right})
        path.append(pick)
        nxt = node[pick]
        if isinstance(nxt, str):
            chosen = nxt
            break
        chain.append(voice(nxt))
        node = nxt
    # to act, the chosen tool's definition is then read in full, as the template hands one tool over
    one = M.ntok(json.dumps(tool_def(defs[chosen]), ensure_ascii=False))
    return {'chosen': chosen, 'ok': chosen in accept, 'steps': steps, 'address': fmt(path),
            'tool_text_tokens': read_tool_text + one, 'processed_tokens': processed,
            'seconds': time.perf_counter() - t0}


def fmt(path):
    return path[0] + ('.' + ''.join(path[1:]) if len(path) > 1 else '') if path else '0'


def tool_def(t):
    return {'type': 'function', 'function': {'name': t['name'], 'description': t['description'],
                                             'parameters': t.get('input_schema') or {'type': 'object', 'properties': {}}}}


# ── the flat list: every definition in the template's own tool block ──
class Flat:
    def __init__(self, M, defs, names):
        self.M = M
        self.tools = [tool_def(defs[n]) for n in names]
        mark = '⁣TASK⁣'
        full = M.chat(SYSTEM_FLAT, mark, tools=self.tools)
        cut = full.index('<|im_start|>user')
        self.prefix, self.suffix_tmpl = full[:cut], full[cut:]
        bare = M.chat(SYSTEM_FLAT, mark)
        self.prefix_ids = M.tok(self.prefix, return_tensors='pt', add_special_tokens=False).input_ids
        self.tool_text_tokens = self.prefix_ids.shape[1] - M.ntok(bare[:bare.index('<|im_start|>user')])
        self.fits = self.prefix_ids.shape[1] + 200 < M.n_ctx
        self.cache, self.prefix_seconds = None, None
        if self.fits:
            # read once, in chunks, so no chunk builds a whole-prefix attention matrix; the kept states are the same
            from transformers import DynamicCache
            cache, n, CH = DynamicCache(), self.prefix_ids.shape[1], 2048
            t0 = time.perf_counter()
            for s in range(0, n, CH):
                ids = self.prefix_ids[:, s:s + CH]
                M.m(input_ids=ids, past_key_values=cache, use_cache=True,
                    position_ids=torch.arange(s, s + ids.shape[1])[None])
            self.prefix_seconds = time.perf_counter() - t0
            self.cache = cache

    def choose(self, task, accept, names, max_new=48):
        M = self.M
        if not self.fits:
            return {'chosen': None, 'ok': False, 'fits': False, 'tool_text_tokens': self.tool_text_tokens,
                    'processed_tokens': self.prefix_ids.shape[1], 'seconds': None, 'seconds_fresh': None}
        P = self.prefix_ids.shape[1]
        L = self.cache.get_seq_length()
        if L > P:
            self.cache.crop(P - L)   # this version of transformers crops by a negative count of tokens to drop
        ids = M.tok(self.suffix_tmpl.replace('⁣TASK⁣', task), return_tensors='pt', add_special_tokens=False).input_ids
        t0 = time.perf_counter()
        out = M.m(input_ids=ids, past_key_values=self.cache, use_cache=True,
                  position_ids=torch.arange(P, P + ids.shape[1])[None])
        pos, gen, text = P + ids.shape[1], [], ''
        nxt = int(out.logits[0, -1].argmax())
        for _ in range(max_new):
            gen.append(nxt)
            text = M.tok.decode(gen)
            if nxt == M.tok.eos_token_id or '<|im_end|>' in text or '</tool_call>' in text or re.search(r'"name"\s*:\s*"[^"]+"', text):
                break
            out = M.m(input_ids=torch.tensor([[nxt]]), past_key_values=self.cache, use_cache=True,
                      position_ids=torch.tensor([[pos]]))
            pos += 1
            nxt = int(out.logits[0, -1].argmax())
        secs = time.perf_counter() - t0
        m = re.search(r'"name"\s*:\s*"([^"]+)"', text)
        chosen = m.group(1) if m else None
        return {'chosen': chosen, 'ok': chosen in accept, 'fits': True, 'said': text[:160],
                'named_a_tool': chosen in names if chosen else False,
                'tool_text_tokens': self.tool_text_tokens, 'processed_tokens': P + ids.shape[1] + len(gen),
                'seconds': secs, 'seconds_fresh': secs + self.prefix_seconds}


def summarise(rows):
    if not rows:
        return {}
    def med(k):
        v = [r[k] for r in rows if r.get(k) is not None]
        return statistics.median(v) if v else None
    out = {'tasks': len(rows), 'right': sum(r['ok'] for r in rows), 'tool_text_tokens_median': med('tool_text_tokens'),
           'processed_tokens_median': med('processed_tokens'), 'seconds_median': med('seconds')}
    if any('seconds_fresh' in r for r in rows):
        out['seconds_fresh_median'] = med('seconds_fresh')
    if any('steps' in r for r in rows):
        depth = {}
        for r in rows:
            for i, s in enumerate(r['steps']):
                depth.setdefault(i + 1, [0, 0])
                depth[i + 1][0] += s['ok']
                depth[i + 1][1] += 1
        out['right_turns_by_step'] = {k: f'{a} of {b}' for k, (a, b) in sorted(depth.items())}
        out['steps_median'] = statistics.median(len(r['steps']) for r in rows)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tools', required=True)
    ap.add_argument('--tree', required=True)
    ap.add_argument('--tasks', required=True)
    ap.add_argument('--model', required=True)
    ap.add_argument('--arms', default='flat,tree,control')
    ap.add_argument('--threads', type=int, default=4)
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--out', default='tool_tree_run.json')
    a = ap.parse_args()
    defs = {t['name']: t for t in json.load(open(a.tools))}
    tree = json.load(open(a.tree))
    tasks = json.load(open(a.tasks))
    if a.limit:
        tasks = tasks[:a.limit]
    names = [n for _, n in leaves(tree)]
    missing = [n for n in names if n not in defs]
    assert not missing, f'tree names tools the session lacks: {missing[:5]}'
    for t in tasks:
        assert any(x in names for x in t['accept']), f'task {t["id"]} has no accepted tool in this tree'
    M = Model(a.model, a.threads)
    log(f'model {a.model}; tree of {len(names)} tools; {len(tasks)} tasks; window {M.n_ctx}')
    R = {'model': a.model, 'tools': len(names), 'tasks': len(tasks), 'tree': a.tree, 'arms': {}, 'rows': []}
    arms = a.arms.split(',')
    flat = None
    if 'flat' in arms:
        flat = Flat(M, defs, names)
        R['flat_prefix_tokens'] = int(flat.prefix_ids.shape[1])
        R['flat_tool_text_tokens'] = int(flat.tool_text_tokens)
        R['flat_fits'] = flat.fits
        R['flat_prefix_seconds'] = flat.prefix_seconds
        log(f'flat list: {flat.tool_text_tokens} tokens of tool text, prefix {flat.prefix_ids.shape[1]} tokens, '
            f'{"read once in %.1fs" % flat.prefix_seconds if flat.fits else "does not fit the window"}')
    for t in tasks:
        row = {'id': t['id'], 'task': t['task'], 'accept': t['accept']}
        for arm in arms:
            if arm == 'flat':
                r = flat.choose(t['task'], t['accept'], names)
            else:
                r = walk(M, t['task'], tree, defs, t['accept'], blank=(arm == 'control'))
            row[arm] = r
        R['rows'].append(row)
        log(f"{t['id']:>4} " + '  '.join(f"{arm}:{'✓' if row[arm]['ok'] else '✗'} {row[arm]['chosen']}" for arm in arms))
    for arm in arms:
        R['arms'][arm] = summarise([row[arm] for row in R['rows']])
        log(arm, json.dumps(R['arms'][arm]))
    with open(a.out, 'w') as f:
        json.dump(R, f, indent=1, ensure_ascii=False)
    log(f'wrote {a.out}')


if __name__ == '__main__':
    main()
