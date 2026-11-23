"""The flip, second round (spine:pscale-lab 1.114: 'If the order shows, a second round hands each closing on, as walked
and reflected, to see whether the effect survives a hand-off'). The order showed on Qwen2.5-1.5B-Instruct in run 1, so
each of its closings is handed on whole, digit removed, to one fresh instance of the same model with no thinking pass,
under the same rule at the head and the same task (its fork now 'the next fork'): the as-walked closings, the
reflected ones, and the task-alone ones as the control. Nothing else is handed on: not the walk, not its order.

usage: python3 -I round2.py --run run-1.5b.json --out round2-1.5b.json
"""
import argparse, hashlib, json, time

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, LogitsProcessor, LogitsProcessorList

ap = argparse.ArgumentParser()
ap.add_argument('--run', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--gen', type=int, default=240)
ap.add_argument('--seed', type=int, default=1114)
args = ap.parse_args()

R1 = json.load(open(args.run, encoding='utf-8'))
RULE = R1['rule']
TASK = R1['task'].replace('Then write the seventh fork:', 'Then write the next fork:')
assert TASK != R1['task'], 'the task should name the next fork'
SAMPLING = R1['sampling']

tok = AutoTokenizer.from_pretrained(R1['model'])
tok.padding_side = 'left'
model = AutoModelForCausalLM.from_pretrained(R1['model'], dtype=torch.bfloat16).eval()
DIGITS = [tok.convert_tokens_to_ids(str(d)) for d in range(10)]
NL = tok.encode('\n')[0]

class Hold(LogitsProcessor):
    def __init__(self, start, plan):
        self.start, self.plan = start, {k: torch.tensor(v) for k, v in plan.items()}
    def __call__(self, input_ids, scores):
        k = input_ids.shape[1] - self.start
        if k in self.plan:
            mask = torch.full_like(scores, float('-inf')); mask[:, self.plan[k]] = 0; scores = scores + mask
        return scores

def strip_digit(t):
    lines = t.split('\n')
    return '\n'.join(lines[1:]).strip() if lines and lines[0].strip().isdigit() else t.strip()

OUT = {'model': R1['model'], 'rule': RULE, 'task': TASK, 'sampling': SAMPLING, 'gen': args.gen, 'seed': args.seed,
       'from_run_sha256': hashlib.sha256(open(args.run, 'rb').read()).hexdigest(), 'arms': {}}
for i, arm in enumerate(('as_walked', 'reflected', 'none')):
    t0 = time.time()
    handed = [strip_digit(r['text']) for r in R1['arms'][arm]['readings']]
    texts = [tok.apply_chat_template([{'role': 'system', 'content': RULE}, {'role': 'user', 'content': h + '\n\n' + TASK}],
                                     tokenize=False, add_generation_prompt=True) for h in handed]
    rows = []
    for b in range(0, len(texts), 10):
        enc = tok(texts[b:b + 10], return_tensors='pt', padding=True)
        L = enc.input_ids.shape[1]
        torch.manual_seed(args.seed + 100 * i + b)
        with torch.no_grad():
            out = model.generate(**enc, max_new_tokens=args.gen, logits_processor=LogitsProcessorList([Hold(L, {0: DIGITS, 1: [NL]})]),
                                 return_dict_in_generate=True, output_logits=True, pad_token_id=tok.pad_token_id, **SAMPLING)
        for k in range(enc.input_ids.shape[0]):
            gen = out.sequences[k, L:]
            p = torch.softmax(out.logits[0][k].float(), -1)[DIGITS]
            rows.append({'handed': handed[b + k], 'digit': int(tok.decode(gen[:1])),
                         'digit_spread': [round(float(x), 6) for x in p / p.sum()], 'digit_mass': round(float(p.sum()), 6),
                         'text': tok.decode(gen, skip_special_tokens=True).strip()})
    OUT['arms'][arm] = {'readings': rows, 'seconds': round(time.time() - t0, 1)}
    print(f'{arm}: {len(rows)} hand-offs in {time.time() - t0:.0f}s; digits {[r["digit"] for r in rows]}', flush=True)
json.dump(OUT, open(args.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('written', args.out)
