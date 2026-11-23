"""The flip, lane 4 of pscale-lab (spine:pscale-lab 1.114): one walk of the run-up at
injector:middle-point, six forks, then four arms read by fresh instances with no thinking pass,
all given the same task: a seventh fork, and two lines for whoever comes next.

  AS WALKED  the root first, then the six forks in the order walked, the latest nearest the task
  REFLECTED  the latest fork first, the root last
  SHUFFLED   the seven parts in a random order, one order per reading (never the walked or the reflected)
  NONE       the task alone

Before any words each reader gives one digit (spine:run-up 1.6; the question is keel's, pool:run-up 5.15).
On an open model its whole spread is read from the first token's probabilities, so the scale is 0 to 9:
a number from 0 to 1 would begin with the token '0' almost every time. Every arm keeps one rule of the
table at its head (spine:run-up 1.1114: the table stays at the head), the same for all four, because
without it a reader handed a long walk opens with 'Sure' and under 1% of its first-token mass lies on a
digit, against 99.9% for the task alone, which would read compliance rather than state. The first token
is held to the ten digits and the second to a line break, so the digit stands alone and is never taken
for a list's numbering; how much of the model's own mass already lay on the digits is kept as 'digit_mass'.

Run:  python3 -I flip.py --block injector_middle-point.json --model Qwen/Qwen2.5-3B-Instruct --out run.json
      python3 -I flip.py --block injector_middle-point.json --walk walk.json --model Qwen/Qwen2.5-1.5B-Instruct --out run15.json
"""
import argparse, hashlib, json, random, sys, time

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, DynamicCache, LogitsProcessor, LogitsProcessorList

ap = argparse.ArgumentParser()
ap.add_argument('--block', required=True, help='injector:middle-point as the beach serves it (JSON)')
ap.add_argument('--model', default='Qwen/Qwen2.5-3B-Instruct')
ap.add_argument('--walk', default='', help='reuse a walk already made (walk.json); else this model walks')
ap.add_argument('--walk-out', default='walk.json')
ap.add_argument('--n', type=int, default=20, help='readings per arm')
ap.add_argument('--gen', type=int, default=240, help='new tokens per reading')
ap.add_argument('--seed', type=int, default=1114)
ap.add_argument('--shuffle-batch', type=int, default=5)
ap.add_argument('--out', required=True)
args = ap.parse_args()

RULE = "Every reply begins with one digit from 0 to 9 alone on its first line, before any words."
TASK = ("Before any words: a digit from 0 to 9, how far is this closing already leaning towards its next opening? "
        "Then write the seventh fork: its frame in one sentence, the way you take at it, and the ways you pass. "
        "Then two lines for whoever comes next.")
WALKER_ASK = "Take one way: give its digit alone on the first line, then on the next line one sentence in your own words on why you take it."
SAMPLING = dict(do_sample=True, temperature=0.7, top_p=0.8, top_k=20, repetition_penalty=1.05)  # Qwen2.5's own

def text_of(n):
    return n if isinstance(n, str) else (n.get('_') if isinstance(n.get('_'), str) else '')

def rungs_of(block):
    """The ladder of ones: 1, 1.1, ... 1.11111 — each rung's frame, its ways (digits 2-7) and its hinge (8)."""
    out, node, addr = [], block['1'], '1'
    while isinstance(node, dict) and len(out) < 10:
        ways = {k: text_of(node[k]) for k in sorted(node) if k in '234567' and text_of(node[k])}
        if not ways:
            break
        hinge = text_of(node.get('8', '')).replace('THE HINGE of this rung: ', '')
        out.append({'address': addr, 'frame': text_of(node), 'ways': ways, 'hinge': hinge})
        node, addr = node.get('1'), (addr + '1' if '.' in addr else addr + '.1')
    return out

def sha(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()

class Hold(LogitsProcessor):
    """At the k-th new token, keep only the ids the plan names for k (the digits first, then a line break)."""
    def __init__(self, start, plan):
        self.start, self.plan = start, {k: torch.tensor(v) for k, v in plan.items()}
    def __call__(self, input_ids, scores):
        k = input_ids.shape[1] - self.start
        if k in self.plan:
            mask = torch.full_like(scores, float('-inf'))
            mask[:, self.plan[k]] = 0
            scores = scores + mask
        return scores

def first_sentence(s):
    s = s.strip().split('\n')[0].strip()
    for end in ('. ', '! ', '? '):
        if end in s:
            return s[:s.index(end) + 1]
    return s

block = json.load(open(args.block, encoding='utf-8'))
RUNGS = rungs_of(block)
assert len(RUNGS) == 6, f'expected six rungs, found {len(RUNGS)}'
ROOT = text_of(block)

t_load = time.time()
tok = AutoTokenizer.from_pretrained(args.model)
tok.padding_side = 'left'
model = AutoModelForCausalLM.from_pretrained(args.model, dtype=torch.bfloat16)
model.eval()
DIGITS = [tok.convert_tokens_to_ids(str(d)) for d in range(10)]
NL = tok.encode('\n')[0]
assert all(isinstance(i, int) and i >= 0 for i in DIGITS) and tok.decode([NL]) == '\n'
print(f'{args.model} loaded in {time.time() - t_load:.1f}s; torch threads {torch.get_num_threads()}', flush=True)

def chat(messages):
    return tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

def probs_over(logits_row, ids):
    p = torch.softmax(logits_row.float(), dim=-1)
    sub = p[ids]
    return [round(float(x), 6) for x in (sub / sub.sum())], round(float(sub.sum()), 6)

# ── THE WALK: one instance walks the six forks, choosing at each with the passed ways named ──
if args.walk:
    WALK = json.load(open(args.walk, encoding='utf-8'))
    print('walk reused from', args.walk, flush=True)
else:
    torch.manual_seed(args.seed)
    msgs, steps = [], []
    for i, r in enumerate(RUNGS):
        ways = '\n'.join(f'{k} — {v}' for k, v in r['ways'].items())
        head = (ROOT + '\n\nThe first fork:\n') if i == 0 else 'The next fork:\n'
        msgs.append({'role': 'user', 'content': f"{head}{r['frame']}\n\nThe ways:\n{ways}\n\nThe hinge: {r['hinge']}\n\n{WALKER_ASK}"})
        enc = tok(chat(msgs), return_tensors='pt')
        L = enc.input_ids.shape[1]
        allowed = [tok.convert_tokens_to_ids(k) for k in r['ways']]
        with torch.no_grad():
            out = model.generate(**enc, max_new_tokens=80, logits_processor=LogitsProcessorList([Hold(L, {0: allowed, 1: [NL]})]),
                                 return_dict_in_generate=True, output_logits=True, **SAMPLING)
        gen = out.sequences[0, L:]
        taken = tok.decode(gen[:1])
        note = first_sentence(tok.decode(gen[2:], skip_special_tokens=True))
        spread, mass = probs_over(out.logits[0][0], allowed)
        steps.append({'address': r['address'], 'taken': taken, 'note': note,
                      'spread': dict(zip(r['ways'].keys(), spread)), 'mass_on_ways': mass})
        msgs.append({'role': 'assistant', 'content': f'{taken}\n{note}'})
        print(f"fork {i + 1} ({r['address']}): took {taken}  spread {dict(zip(r['ways'].keys(), spread))}  · {note[:90]}", flush=True)
    WALK = {'walker': args.model, 'seed': args.seed, 'sampling': SAMPLING, 'block_sha256': sha(json.dumps(block, sort_keys=True)),
            'rungs': RUNGS, 'steps': steps}
    json.dump(WALK, open(args.walk_out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('walk written to', args.walk_out, flush=True)

# ── THE SPINDLE IT MADE: the root, and each fork with its way taken, its why, its ways passed, its hinge ──
def fork_part(r, s):
    passed = ' | '.join(v for k, v in r['ways'].items() if k != s['taken'])
    return (f"{r['frame']}\nTaken: {r['ways'][s['taken']]}\nWhy: {s['note']}\n"
            f"Held, not taken: {passed}\nHinge: {r['hinge']}")

PARTS = [ROOT] + [fork_part(r, s) for r, s in zip(WALK['rungs'], WALK['steps'])]  # 0 root, 1..6 forks as walked
WALKED, REFLECTED = list(range(7)), list(range(6, -1, -1))

def prompt_of(order):
    body = '\n\n'.join(PARTS[i] for i in order)
    return (body + '\n\n' + TASK) if order else TASK

rng = random.Random(args.seed)
shuffles = []
while len(shuffles) < args.n:
    o = WALKED[:]
    rng.shuffle(o)
    if o not in (WALKED, REFLECTED):
        shuffles.append(o)

def generate(prompts, seed, shared=False):
    """Readings for a list of prompts; when every prompt is the same, the prompt is read once and its cache shared."""
    torch.manual_seed(seed)
    texts = [chat([{'role': 'system', 'content': RULE}, {'role': 'user', 'content': p}]) for p in prompts]
    enc = tok(texts, return_tensors='pt', padding=True)
    L = enc.input_ids.shape[1]
    kw = dict(max_new_tokens=args.gen, logits_processor=LogitsProcessorList([Hold(L, {0: DIGITS, 1: [NL]})]),
              return_dict_in_generate=True, output_logits=True, pad_token_id=tok.pad_token_id, **SAMPLING)
    with torch.no_grad():
        if shared:
            cache = DynamicCache()
            model(input_ids=enc.input_ids[:1, :-1], past_key_values=cache, use_cache=True)
            cache.batch_repeat_interleave(len(prompts))
            out = model.generate(input_ids=enc.input_ids, attention_mask=enc.attention_mask, past_key_values=cache, **kw)
        else:
            out = model.generate(**enc, **kw)
    rows = []
    for b in range(len(prompts)):
        gen = out.sequences[b, L:]
        probs, mass = probs_over(out.logits[0][b], DIGITS)
        rows.append({'digit': int(tok.decode(gen[:1])), 'digit_spread': probs, 'digit_mass': mass,
                     'text': tok.decode(gen, skip_special_tokens=True).strip(), 'new_tokens': int((gen != tok.pad_token_id).sum())})
    return rows, L

RUN = {'model': args.model, 'rule': RULE, 'task': TASK, 'sampling': SAMPLING, 'n': args.n, 'gen': args.gen, 'seed': args.seed,
       'walk': {'walker': WALK['walker'], 'steps': WALK['steps']}, 'parts': PARTS, 'arms': {},
       'torch': torch.__version__, 'threads': torch.get_num_threads()}
for name, order in (('as_walked', WALKED), ('reflected', REFLECTED), ('none', [])):
    t0 = time.time()
    p = prompt_of(order)
    rows, L = generate([p] * args.n, args.seed + len(RUN['arms']) + 1, shared=True)
    RUN['arms'][name] = {'order': order, 'prompt': p, 'prompt_sha256': sha(p), 'prompt_tokens': L, 'readings': rows,
                         'seconds': round(time.time() - t0, 1)}
    print(f'{name}: {args.n} readings in {time.time() - t0:.0f}s; digits {[r["digit"] for r in rows]}', flush=True)
    json.dump(RUN, open(args.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

t0, rows = time.time(), []
for b in range(0, args.n, args.shuffle_batch):
    chunk = shuffles[b:b + args.shuffle_batch]
    got, _ = generate([prompt_of(o) for o in chunk], args.seed + 10 + b)
    for o, g in zip(chunk, got):
        g['order'] = o
        g['prompt_sha256'] = sha(prompt_of(o))
    rows += got
    print(f'shuffled: {len(rows)}/{args.n} in {time.time() - t0:.0f}s', flush=True)
RUN['arms']['shuffled'] = {'orders': shuffles, 'readings': rows, 'seconds': round(time.time() - t0, 1)}
json.dump(RUN, open(args.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('run written to', args.out, flush=True)
