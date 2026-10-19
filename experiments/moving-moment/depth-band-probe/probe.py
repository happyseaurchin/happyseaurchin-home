"""Depth-band probe: do a transformer's layers fall into contiguous bands for
sense, perception, thought and representation, in that order?

Keel's job spec, pool:edge 6, 19 October 2026, from the Timings of the Moving
Moment work. For each task (tasks.py) a linear probe is trained on the residual
stream at every layer, and the layer where each task's accuracy arrives is
compared across the four levels. The prediction: onsets order sense <
perception < thought < representation with little overlap, and roughly even
spacing in depth.

    python probe.py --model EleutherAI/pythia-410m           # a first pass, CPU is enough
    python probe.py --model EleutherAI/pythia-410m --random-init   # the same architecture untrained
    python probe.py --smoke                                  # a tiny untrained model: checks the plumbing only

Writes results.json, results.md, probe.svg and probe.png into --out.

Onset is the first layer at 90% of the task's peak accuracy, as the spec has
it; a chance-corrected onset (90% of the way from the shuffled-label floor to
the peak) and Tenney's expected layer are reported beside it, because a
literal 90%-of-peak reads early whenever chance is high.
"""
import argparse
import json
import math
import os
import random
import time

import numpy as np
import torch
from joblib import Parallel, delayed
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

import tasks as T

HERE = os.path.dirname(os.path.abspath(__file__))


# ── model ──────────────────────────────────────────────────────────────────

def load(args):
    from transformers import AutoConfig, AutoModelForCausalLM, AutoTokenizer
    if args.smoke:
        return smoke_model()
    tok = AutoTokenizer.from_pretrained(args.model)
    dtype = torch.bfloat16 if args.device == 'cuda' else torch.float32
    if args.random_init:
        torch.manual_seed(args.seed)
        model = AutoModelForCausalLM.from_config(AutoConfig.from_pretrained(args.model), dtype=dtype)
    else:
        model = AutoModelForCausalLM.from_pretrained(args.model, dtype=dtype)
    return tok, model


def smoke_model():
    """A four-layer untrained model with a tokenizer trained here: no download, no finding."""
    from tokenizers import ByteLevelBPETokenizer
    from transformers import GPTNeoXConfig, GPTNeoXForCausalLM, PreTrainedTokenizerFast
    texts = T.sense_text(random.Random(0), 300)
    for name in T.TASKS:
        texts += [e[0] for e in T.generate(name, 100)]
    bpe = ByteLevelBPETokenizer()
    bpe.train_from_iterator(texts, vocab_size=1200, min_frequency=1, special_tokens=['<|endoftext|>'])
    tok = PreTrainedTokenizerFast(tokenizer_object=bpe._tokenizer, eos_token='<|endoftext|>')
    torch.manual_seed(0)
    cfg = GPTNeoXConfig(vocab_size=len(tok), hidden_size=64, num_hidden_layers=4, num_attention_heads=4,
                        intermediate_size=256, max_position_embeddings=256)
    return tok, GPTNeoXForCausalLM(cfg)


def find(model, paths):
    for path in paths:
        obj = model
        try:
            for part in path.split('.'):
                obj = getattr(obj, part)
            return obj
        except AttributeError:
            continue
    raise SystemExit(f'cannot find any of {paths} on {type(model).__name__}')


def blocks(model):
    return find(model, ['model.layers', 'gpt_neox.layers', 'transformer.h', 'model.decoder.layers'])


def final_norm(model):
    return find(model, ['model.norm', 'gpt_neox.final_layer_norm', 'transformer.ln_f',
                        'model.final_layernorm', 'model.decoder.final_layer_norm'])


# ── reading the residual stream ────────────────────────────────────────────

def surface(tok, tid):
    """A token's own text, with the leading space its tokenizer marks."""
    piece = tok.convert_ids_to_tokens(int(tid))
    text = tok.convert_tokens_to_string([piece])
    if isinstance(piece, str) and piece[:1] in ('Ġ', '▁') and not text.startswith(' '):
        text = ' ' + text.lstrip()
    return text


@torch.no_grad()
def read(model, tok, texts, spans, args):
    """Residual stream at each span's last token, every layer: [n, layers + 1, d]."""
    tok.padding_side = 'right'
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    rows, where = [], []
    for i in range(0, len(texts), args.batch):
        chunk = texts[i:i + args.batch]
        enc = tok(chunk, return_offsets_mapping=True, padding=True, return_tensors='pt')
        offsets = enc.pop('offset_mapping')
        out = model(**{k: v.to(args.device) for k, v in enc.items()}, output_hidden_states=True)
        hs = torch.stack(out.hidden_states, 1)  # [b, layers + 1, t, d]
        for j, text_spans in enumerate(spans[i:i + args.batch]):
            mask = enc['attention_mask'][j].bool()
            real = [k for k in range(len(mask)) if mask[k] and offsets[j, k, 1] > offsets[j, k, 0]]
            for s, e in text_spans:
                if s is None:
                    k = real[-1]
                else:
                    k = max(k for k in real if offsets[j, k, 0] < e and offsets[j, k, 1] > s)
                rows.append(hs[j, :, k, :].float().cpu().numpy().astype(np.float16))
                where.append((i + j, k, enc['input_ids'][j, :k + 1].tolist()))
    return np.stack(rows), where


def sense_examples(tok, n, seed):
    """Token-level surface labels read off the tokens of plain sentences."""
    texts = T.sense_text(random.Random(f'sense:{seed}'), max(200, n))
    enc = tok(texts, return_offsets_mapping=True)
    pools = {name: [] for name in T.SENSE_TASKS}
    for ti, (ids, offs) in enumerate(zip(enc['input_ids'], enc['offset_mapping'])):
        for tid, (s, e) in zip(ids, offs):
            if e <= s:
                continue
            text = surface(tok, tid)
            word = text.strip()
            letters = [c for c in word if c.isalpha()]
            group = word.lower()
            span = [(ti, s, e)]
            if letters:
                pools['capitalised'].append((span, int(letters[0].isupper()), group))
            pools['leading-space'].append((span, int(text.startswith(' ')), group))
            if word.isalpha() and (len(word) >= 6 or len(word) <= 3):
                pools['long-or-short'].append((span, int(len(word) >= 6), group))
            if word.isalpha() and 3 <= len(word) <= 6:
                pools['contains-r'].append((span, int('r' in word.lower()), group))
    rng = random.Random(seed)
    out = {}
    for name, pool in pools.items():
        by = [[p for p in pool if p[1] == lab] for lab in (0, 1)]
        k = min(n // 2, *map(len, by))
        picked = rng.sample(by[0], k) + rng.sample(by[1], k)
        out[name] = (texts, picked)
    return out


def choice_ids(tok, text, pair):
    """The first token of each candidate continuation, as the tokenizer splits it in place."""
    base = tok(text)['input_ids']
    ids = []
    for cand in pair:
        full = tok(text + cand)['input_ids']
        ids.append(full[len(base)] if full[:len(base)] == base and len(full) > len(base) else None)
    return ids


# ── probing ────────────────────────────────────────────────────────────────

def accuracy(X, y, groups, folds, C):
    pred = np.zeros_like(y)
    for tr, te in GroupKFold(n_splits=min(folds, len(set(groups)))).split(X, y, groups):
        clf = make_pipeline(StandardScaler(), LogisticRegression(C=C, max_iter=3000))
        clf.fit(X[tr], y[tr])
        pred[te] = clf.predict(X[te])
    return float((pred == y).mean())


def curve(X, y, groups, args):
    run = lambda l: accuracy(X[:, l, :].astype(np.float32), y, groups, args.folds, args.C)
    return Parallel(n_jobs=args.jobs)(delayed(run)(l) for l in range(X.shape[1]))


def bag_of_words(prefixes, y, groups, args):
    """How much of the task the input's words settle with no model at all."""
    docs = [' '.join(map(str, p)) for p in prefixes]
    X = CountVectorizer(token_pattern=r'\S+', binary=True).fit_transform(docs)
    pred = np.zeros_like(y)
    for tr, te in GroupKFold(n_splits=min(args.folds, len(set(groups)))).split(X, y, groups):
        clf = LogisticRegression(C=args.C, max_iter=3000).fit(X[tr], y[tr])
        pred[te] = clf.predict(X[te])
    return float((pred == y).mean())


def landmarks(acc, floor):
    acc = np.asarray(acc)
    peak = float(acc.max())
    lift = np.maximum(np.diff(np.concatenate([[floor], acc])), 0)
    return {
        'onset': int(np.argmax(acc >= 0.9 * peak)),
        'onset_chance_corrected': int(np.argmax(acc - floor >= 0.9 * (peak - floor))) if peak > floor else None,
        'peak_layer': int(acc.argmax()),
        'peak_accuracy': peak,
        'expected_layer': float((lift * np.arange(len(acc))).sum() / lift.sum()) if lift.sum() > 0 else None,
    }


@torch.no_grad()
def logit_lens(model, X, choices):
    """Per layer: how often the right continuation outscores the wrong one, read through the unembedding."""
    norm, W = final_norm(model), model.get_output_embeddings()
    keep = [i for i, c in enumerate(choices) if None not in c]
    if not keep:
        return None
    ids = torch.tensor([choices[i] for i in keep])
    w = W.weight[ids].float().cpu()  # [n, 2, d]
    bias = W.bias[ids].float().cpu() if getattr(W, 'bias', None) is not None else torch.zeros(ids.shape)
    wins, diffs = [], []
    for l in range(X.shape[1]):
        h = torch.from_numpy(X[keep, l, :].astype(np.float32))
        if l < X.shape[1] - 1:  # the last hidden state already carries the final norm
            h = norm.float().cpu()(h)
        logits = torch.einsum('nd,nkd->nk', h, w) + bias
        d = logits[:, 0] - logits[:, 1]
        wins.append(float((d > 0).float().mean()))
        diffs.append(float(d.mean()))
    return {'win_rate': wins, 'mean_logit_diff': diffs, 'n': len(keep)}


# ── depth to time ──────────────────────────────────────────────────────────

@torch.no_grad()
def latency(model, tok, args, steps=24):
    """Milliseconds per generated token, and when each layer finishes within it."""
    marks = []

    def stamp(*_):
        if args.device == 'cuda':
            torch.cuda.synchronize()
        marks.append(time.perf_counter())

    hooks = [model.get_input_embeddings().register_forward_pre_hook(stamp)]
    hooks += [b.register_forward_hook(stamp) for b in blocks(model)]
    ids = tok('The tiger is seen as an animal before it is seen as a tiger, and', return_tensors='pt')['input_ids']
    out = model(input_ids=ids.to(args.device), use_cache=True)
    past, nxt = out.past_key_values, out.logits[:, -1:].argmax(-1)
    per_step, totals = [], []
    for step in range(steps):
        marks.clear()
        t0 = time.perf_counter()
        out = model(input_ids=nxt, past_key_values=past, use_cache=True)
        stamp()
        past, nxt = out.past_key_values, out.logits[:, -1:].argmax(-1)
        if step >= 3:  # warm-up
            per_step.append([1000 * (m - marks[0]) for m in marks[:-1]])
            totals.append(1000 * (marks[-1] - t0))
    for h in hooks:
        h.remove()
    cumulative = np.mean(per_step, 0)  # index 0 the embedding's start, l the end of block l
    return {'ms_per_token': float(np.mean(totals)), 'ms_at_layer': [float(x) for x in cumulative],
            'device': args.device, 'threads': torch.get_num_threads()}


# ── report ─────────────────────────────────────────────────────────────────

def report(res, out):
    lines = [f"# Depth-band probe — {res['model']}{' (untrained)' if res['random_init'] else ''}", '',
             f"{res['layers']} layers, {res['params'] / 1e6:.1f}M parameters, on {res['latency']['device']}: "
             f"{res['latency']['ms_per_token']:.1f} ms per generated token. Layer 0 is the embedding.", '',
             '| level | task | onset layer | peak layer | peak accuracy | shuffled floor | bag of words | '
             'chance-corrected onset | expected layer | onset in ms |',
             '|---|---|---|---|---|---|---|---|---|---|']
    ms = res['latency']['ms_at_layer']
    for name, t in res['tasks'].items():
        lm = t['landmarks']
        lines.append(f"| {t['level']} | {name} | {lm['onset']} | {lm['peak_layer']} | {lm['peak_accuracy']:.2f} | "
                     f"{np.mean(t['shuffled']):.2f} | {t['bag_of_words']:.2f} | {lm['onset_chance_corrected']} | "
                     f"{lm['expected_layer']:.1f} | {ms[min(lm['onset'], len(ms) - 1)]:.1f} |")
    lines += ['', '| level | onset of the level\'s mean curve | peak layer | mean chance-corrected onset |',
              '|---|---|---|---|']
    for level, lv in res['levels'].items():
        lines.append(f"| {level} | {lv['onset']} | {lv['peak_layer']} | {lv['mean_onset_chance_corrected']:.1f} |")
    v = res['verdict']
    lines += ['', f"Order of onsets: {' < '.join(v['order_found'])} — "
                  f"{'as predicted' if v['ordered'] else 'not the predicted order'}. "
                  f"Spacing between successive level onsets, in layers: {v['spacing_layers']}."]
    for name, t in res['tasks'].items():
        if t.get('logit_lens'):
            w = t['logit_lens']['win_rate']
            lines.append(f"Logit lens, {name}: the right continuation outscores the wrong one in "
                         f"{w[-1]:.0%} of examples at the last layer; first layer at 90% of that: "
                         f"{int(np.argmax(np.asarray(w) >= 0.9 * w[-1]))}.")
    with open(os.path.join(out, 'results.md'), 'w') as f:
        f.write('\n'.join(lines) + '\n')


def plot(res, out):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    colours = dict(zip(T.LEVELS, ['#7a9a3a', '#2f7fa3', '#b5632f', '#7b4fa0']))
    fig, ax = plt.subplots(figsize=(8.5, 5))
    layers = np.arange(res['layers'] + 1)
    floor = np.mean([np.mean(t['shuffled']) for t in res['tasks'].values()])
    ax.axhspan(0, floor, color='#e8e4dc', zorder=0)
    for name, t in res['tasks'].items():
        ax.plot(layers, t['accuracy'], color=colours[t['level']], lw=0.7, alpha=0.45)
    for level, lv in res['levels'].items():
        ax.plot(layers, lv['mean_accuracy'], color=colours[level], lw=2.4, label=f"{level} (onset {lv['onset']})")
        ax.axvline(lv['onset'], color=colours[level], lw=0.8, ls=':')
    from matplotlib.ticker import MaxNLocator
    ax.xaxis.set_major_locator(MaxNLocator(integer=True))
    ax.set_xlabel('layer (0 = embedding)')
    ax.set_ylabel('linear probe accuracy, held-out items')
    ax.set_ylim(0.4, 1.0)
    ax.set_xlim(0, res['layers'])
    ax.legend(frameon=False, fontsize=8, loc='lower right')
    ms = res['latency']['ms_at_layer']
    top = ax.secondary_xaxis('top', functions=(lambda l: np.interp(l, layers[:len(ms)], ms),
                                               lambda m: np.interp(m, ms, layers[:len(ms)])))
    top.set_xlabel(f"ms into a generated token ({res['latency']['device']})", fontsize=8)
    ax.set_title(f"Accuracy by layer, four levels — {res['model']}{' (untrained)' if res['random_init'] else ''}",
                 fontsize=10)
    fig.tight_layout()
    fig.savefig(os.path.join(out, 'probe.svg'))
    fig.savefig(os.path.join(out, 'probe.png'), dpi=120)


# ── main ───────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='EleutherAI/pythia-410m')
    ap.add_argument('--random-init', action='store_true', help='the same architecture with untrained weights')
    ap.add_argument('--smoke', action='store_true', help='a tiny untrained model, to check the plumbing')
    ap.add_argument('--n', type=int, default=None, help='examples per task (600; 120 with --smoke)')
    ap.add_argument('--batch', type=int, default=32)
    ap.add_argument('--folds', type=int, default=5)
    ap.add_argument('--C', type=float, default=0.1)
    ap.add_argument('--jobs', type=int, default=-1)
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--device', default='cuda' if torch.cuda.is_available() else 'cpu')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()
    if args.smoke:
        args.model = 'smoke-4-layer'
    args.n = args.n or (120 if args.smoke else 600)
    out = args.out or os.path.join(HERE, 'runs', args.model.replace('/', '--') + ('--untrained' if args.random_init else ''))
    os.makedirs(out, exist_ok=True)

    tok, model = load(args)
    model.to(args.device).eval()
    res = {'model': args.model, 'random_init': args.random_init or args.smoke,
           'layers': len(blocks(model)), 'params': sum(p.numel() for p in model.parameters()),
           'n_per_task': args.n, 'folds': args.folds, 'C': args.C, 'seed': args.seed, 'tasks': {}}
    res['latency'] = latency(model, tok, args)

    jobs = []
    for name, (texts, picked) in sense_examples(tok, args.n, args.seed).items():
        by_text = {}
        for (span, label, group) in picked:
            by_text.setdefault(span[0][0], []).append((span[0][1], span[0][2], label, group))
        jobs.append((name, 'sense', texts, by_text, None))
    for name, (level, _) in T.TASKS.items():
        examples = T.generate(name, args.n, args.seed)
        texts = [e[0] for e in examples]
        by_text = {i: [(s, e, lab, ex[2]) for (s, e, lab) in ex[1]] for i, ex in enumerate(examples)}
        choices = [ex[3]['choice'] if len(ex) > 3 else None for ex in examples]
        jobs.append((name, level, texts, by_text, choices if any(choices) else None))

    for name, level, texts, by_text, choices in jobs:
        idx = sorted(by_text)
        X, where = read(model, tok, [texts[i] for i in idx], [[(s, e) for s, e, _, _ in by_text[i]] for i in idx], args)
        meta = [m for i in idx for m in by_text[i]]
        y = np.array([m[2] for m in meta])
        groups = np.array([m[3] for m in meta])
        rng = np.random.default_rng(args.seed)
        acc = curve(X, y, groups, args)
        shuffled = curve(X, rng.permutation(y), groups, args)
        floor = float(np.mean(shuffled))
        t = {'level': level, 'n': int(len(y)), 'groups': int(len(set(groups))), 'accuracy': acc,
             'shuffled': shuffled, 'bag_of_words': bag_of_words([w[2] for w in where], y, groups, args),
             'landmarks': landmarks(acc, floor)}
        if choices:
            pairs = [choice_ids(tok, texts[i], choices[i]) for i in idx]
            t['logit_lens'] = logit_lens(model, X, pairs)
        res['tasks'][name] = t
        print(f"{level:15s} {name:28s} onset {t['landmarks']['onset']:3d} peak {t['landmarks']['peak_layer']:3d} "
              f"acc {t['landmarks']['peak_accuracy']:.2f} floor {floor:.2f} bow {t['bag_of_words']:.2f}", flush=True)

    res['levels'] = {}
    for level in T.LEVELS:
        members = [t for t in res['tasks'].values() if t['level'] == level]
        mean = np.mean([t['accuracy'] for t in members], 0)
        floor = float(np.mean([np.mean(t['shuffled']) for t in members]))
        cc = [t['landmarks']['onset_chance_corrected'] for t in members if t['landmarks']['onset_chance_corrected'] is not None]
        res['levels'][level] = {'mean_accuracy': mean.tolist(), **landmarks(mean, floor),
                                'mean_onset_chance_corrected': float(np.mean(cc)) if cc else float('nan')}
    onsets = [(res['levels'][l]['onset'], i, l) for i, l in enumerate(T.LEVELS)]
    found = [l for _, _, l in sorted(onsets)]
    res['verdict'] = {'order_found': found,
                      'ordered': [res['levels'][l]['onset'] for l in T.LEVELS] == sorted(res['levels'][l]['onset'] for l in T.LEVELS)
                      and len({res['levels'][l]['onset'] for l in T.LEVELS}) == 4,
                      'spacing_layers': [res['levels'][b]['onset'] - res['levels'][a]['onset']
                                         for a, b in zip(T.LEVELS, T.LEVELS[1:])]}
    with open(os.path.join(out, 'results.json'), 'w') as f:
        json.dump(res, f, indent=1)
    report(res, out)
    plot(res, out)
    print(f'wrote {out}/results.json, results.md, probe.svg')


if __name__ == '__main__':
    main()
