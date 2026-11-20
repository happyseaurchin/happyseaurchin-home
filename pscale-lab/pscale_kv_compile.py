#!/usr/bin/env python3
"""
pscale KV compile: one forward pass over a pscale block, under a tree attention mask,
leaves every spindle's exact reading state in the model's KV cache. Any spindle can
then be LOADED by address instead of re-read.

Each node's text is laid out the way a bsp path-walk prints it: "[address] voicing".
Under the tree mask a node's tokens attend only to its own spindle (its ancestors,
root first) and siblings share position numbers, so the ring is literally a position.

Tests
  1 exactness  For every node, the compile pass's next-token logits (and the cached
               keys/values of its spindle) equal a fresh linear read of that spindle.
  2 load       Gather a spindle's cached K/V by address, append a question, and compare
               logits and greedy continuation with a fresh read of spindle + question.
               Time both (time to first token).
  3 edit       Change one node's text; recompute only its subtree, reusing the cached
               ancestors, and check it matches a full recompile with nothing outside
               the subtree changing.
  4 ring       Read a node's children as a disc: (a) as text, one after another;
               (b) loaded in parallel, siblings sharing positions; (c) loaded in
               parallel with keys re-rotated to sequential positions; plus a control
               (d) the same text with two siblings swapped. Divergence from (a) is
               reported. Only meaningful with trained weights.

Untrained weights (Qwen2.5-0.5B shape, BPE tokenizer trained on the corpus blocks):
  python3 -I pscale_kv_compile.py --block blocks_data/strata.json \
      --corpus blocks_data/*.json --model random --out results_random.json
Trained weights (needs access to huggingface.co):
  python3 -I pscale_kv_compile.py --block blocks_data/strata.json \
      --model Qwen/Qwen2.5-0.5B-Instruct --out results_qwen.json
"""
import argparse
import json
import platform
import random
import statistics
import sys
import time

import torch
import torch.nn.functional as F

torch.set_grad_enabled(False)
NEG = torch.finfo(torch.float32).min
QUESTION = "\nQuestion: In one sentence, what should a reader do here?\nAnswer:"


def log(*a):
    print(*a, flush=True)


# ---------------------------------------------------------------- block geometry
def text_of(v):
    if isinstance(v, str):
        return v
    u = v.get("_")
    if isinstance(u, str):
        return u
    if isinstance(u, dict) and isinstance(u.get("_"), str):
        return u["_"]
    return ""


def flatten(block):
    """Nodes in depth-first pre-order; each carries its spindle ('anc', root first)."""
    nodes = []

    def walk(v, path, parent):
        i = len(nodes)
        nodes.append({"path": path, "text": text_of(v), "parent": parent})
        if isinstance(v, dict):
            for k in "123456789":
                if k in v:
                    walk(v[k], path + (int(k),), i)

    walk(block, (), None)
    for i, n in enumerate(nodes):
        a, j = [], i
        while j is not None:
            a.append(j)
            j = nodes[j]["parent"]
        n["anc"] = a[::-1]
    return nodes


def addr(path):
    if not path:
        return "0"
    return str(path[0]) + ("." + "".join(map(str, path[1:])) if len(path) > 1 else "")


def segment(text, path):
    return f"[{addr(path)}] {text}\n"


# ---------------------------------------------------------------- model + tokenizer
def make_tokenizer(model_id, corpus_paths):
    if model_id != "random":
        from transformers import AutoTokenizer
        return AutoTokenizer.from_pretrained(model_id)
    from tokenizers import Tokenizer, decoders, models, pre_tokenizers, trainers
    from transformers import PreTrainedTokenizerFast
    texts = []
    for p in corpus_paths:
        with open(p) as f:
            texts += [segment(n["text"], n["path"]) for n in flatten(json.load(f))]
    tok = Tokenizer(models.BPE())
    tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    tok.decoder = decoders.ByteLevel()
    trainer = trainers.BpeTrainer(vocab_size=8000, special_tokens=["<|endoftext|>"],
                                  initial_alphabet=pre_tokenizers.ByteLevel.alphabet())
    tok.train_from_iterator(texts, trainer)
    return PreTrainedTokenizerFast(tokenizer_object=tok, eos_token="<|endoftext|>")


def make_model(model_id, vocab_size, layers):
    from transformers import AutoModelForCausalLM, Qwen2Config
    if model_id == "random":
        cfg = Qwen2Config(vocab_size=vocab_size, hidden_size=896, intermediate_size=4864,
                          num_hidden_layers=layers, num_attention_heads=14, num_key_value_heads=2,
                          max_position_embeddings=32768, rope_theta=1_000_000.0,
                          tie_word_embeddings=True)
        torch.manual_seed(0)
        model = AutoModelForCausalLM.from_config(cfg, attn_implementation="eager")
    else:
        model = AutoModelForCausalLM.from_pretrained(model_id, attn_implementation="eager",
                                                     dtype=torch.float32)
    return model.float().eval()


def encode(tok, s):
    return tok(s, add_special_tokens=False)["input_ids"]


# ---------------------------------------------------------------- compile and load
def tree_layout(nodes, seg_ids):
    starts, lens, flat = [], [], []
    for ids in seg_ids:
        starts.append(len(flat))
        lens.append(len(ids))
        flat.extend(ids)
    L = len(flat)
    pos = torch.empty(L, dtype=torch.long)
    allowed = torch.zeros(L, L, dtype=torch.bool)
    for i, n in enumerate(nodes):
        s, l = starts[i], lens[i]
        base = sum(lens[a] for a in n["anc"][:-1])
        pos[s:s + l] = torch.arange(base, base + l)
        for a in n["anc"][:-1]:
            allowed[s:s + l, starts[a]:starts[a] + lens[a]] = True
        allowed[s:s + l, s:s + l] = torch.ones(l, l, dtype=torch.bool).tril()
    return torch.tensor(flat), pos, allowed, starts, lens


def compile_block(model, flat, pos, allowed):
    mask = torch.zeros(allowed.shape, dtype=torch.float32).masked_fill(~allowed, NEG)[None, None]
    t = time.perf_counter()
    out = model(input_ids=flat[None], attention_mask=mask, position_ids=pos[None], use_cache=True)
    dt = time.perf_counter() - t
    kv = [(layer.keys, layer.values) for layer in out.past_key_values.layers]
    return out.logits[0], kv, dt


def spindle_index(n, starts, lens):
    return torch.cat([torch.arange(starts[a], starts[a] + lens[a]) for a in n["anc"]])


def gather(kv, idx):
    return [(k.index_select(2, idx), v.index_select(2, idx)) for k, v in kv]


def as_cache(kv_list):
    from transformers import DynamicCache
    return DynamicCache(kv_list)


def linear_read(model, ids):
    t = time.perf_counter()
    out = model(input_ids=ids[None], use_cache=True)
    return out.logits[0], out.past_key_values, time.perf_counter() - t


def loaded_read(model, kv, idx, q, start):
    t = time.perf_counter()
    cache = as_cache(gather(kv, idx))
    out = model(input_ids=q[None], past_key_values=cache,
                position_ids=torch.arange(start, start + len(q))[None], use_cache=True)
    return out.logits[0], out.past_key_values, time.perf_counter() - t


def greedy(model, cache, logits, pos, n):
    toks = []
    for _ in range(n):
        t = int(logits.argmax())
        toks.append(t)
        out = model(input_ids=torch.tensor([[t]]), past_key_values=cache,
                    position_ids=torch.tensor([[pos]]), use_cache=True)
        cache, logits, pos = out.past_key_values, out.logits[0, -1], pos + 1
    return toks


def kl(p_logits, q_logits):
    lp = F.log_softmax(p_logits.double(), -1)
    lq = F.log_softmax(q_logits.double(), -1)
    return float((lp.exp() * (lp - lq)).sum())


def rotate(model, k, delta):
    """Re-rotate cached RoPE keys by `delta` positions (default RoPE only)."""
    if delta == 0:
        return k
    cos, sin = model.model.rotary_emb(k, torch.tensor([[delta]]))
    cos, sin = cos[:, None].to(k.dtype), sin[:, None].to(k.dtype)
    h = k.shape[-1] // 2
    return k * cos + torch.cat((-k[..., h:], k[..., :h]), -1) * sin


def common_prefix(a, b):
    n = 0
    for x, y in zip(a, b):
        if x != y:
            break
        n += 1
    return n


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--block", required=True)
    ap.add_argument("--corpus", nargs="*", default=[])
    ap.add_argument("--model", default="random")
    ap.add_argument("--layers", type=int, default=24)
    ap.add_argument("--load-tests", type=int, default=8)
    ap.add_argument("--gen", type=int, default=12)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default="results.json")
    args = ap.parse_args()
    random.seed(args.seed)
    R = {"env": {"python": platform.python_version(), "torch": torch.__version__,
                 "threads": torch.get_num_threads()}}
    import transformers
    R["env"]["transformers"] = transformers.__version__

    with open(args.block) as f:
        block = json.load(f)
    nodes = flatten(block)
    tok = make_tokenizer(args.model, args.corpus or [args.block])
    model = make_model(args.model, len(tok), args.layers)
    cfg = model.config
    n_params = sum(p.numel() for p in model.parameters())
    R["model"] = {"id": args.model, "params": n_params, "layers": cfg.num_hidden_layers,
                  "hidden": cfg.hidden_size, "kv_heads": cfg.num_key_value_heads,
                  "head_dim": cfg.hidden_size // cfg.num_attention_heads, "vocab": len(tok)}
    log(f"model {args.model}: {n_params/1e6:.0f}M params, {cfg.num_hidden_layers} layers")

    seg_ids = [encode(tok, segment(n["text"], n["path"])) for n in nodes]
    flat, pos, allowed, starts, lens = tree_layout(nodes, seg_ids)
    L = len(flat)
    spindle_lens = [sum(lens[a] for a in n["anc"]) for n in nodes]
    R["block"] = {"file": args.block, "nodes": len(nodes), "tokens": L,
                  "max_depth": max(len(n["path"]) for n in nodes),
                  "sum_of_all_spindles": sum(spindle_lens)}
    log(f"block: {len(nodes)} nodes, {L} tokens; reading every spindle as text = "
        f"{sum(spindle_lens)} tokens")

    model(input_ids=flat[None, :16])  # warm-up

    # ---- compile
    logits_c, kv, t_compile = compile_block(model, flat, pos, allowed)
    R["compile_seconds"] = t_compile
    log(f"compile: one tree-masked pass over {L} tokens in {t_compile:.1f}s")

    # control: the same tokens through an ordinary causal pass (no tree mask, flat positions)
    logits_flat = model(input_ids=flat[None]).logits[0]

    # ---- 1 exactness, every node
    rows, t_lin_all = [], 0.0
    for i, n in enumerate(nodes):
        idx = spindle_index(n, starts, lens)
        lin_logits, lin_cache, dt = linear_read(model, flat[idx])
        t_lin_all += dt
        c = logits_c[starts[i] + lens[i] - 1]
        kv_sp = gather(kv, idx)
        dkv = max(max(float((lk.keys - k).abs().max()), float((lk.values - v).abs().max()))
                  for lk, (k, v) in zip(lin_cache.layers, kv_sp))
        rows.append({"address": addr(n["path"]), "spindle_tokens": len(idx),
                     "max_abs_logit_diff": float((lin_logits[-1] - c).abs().max()),
                     "max_abs_kv_diff": dkv, "kl": kl(lin_logits[-1], c),
                     "same_top1": int(lin_logits[-1].argmax()) == int(c.argmax()),
                     "control_flat_causal_max_abs_logit_diff":
                         float((lin_logits[-1] - logits_flat[starts[i] + lens[i] - 1]).abs().max()),
                     "linear_seconds": dt})
    R["exactness"] = {"per_node": rows,
                      "all_same_top1": all(r["same_top1"] for r in rows),
                      "max_abs_logit_diff": max(r["max_abs_logit_diff"] for r in rows),
                      "max_abs_kv_diff": max(r["max_abs_kv_diff"] for r in rows),
                      "max_kl": max(r["kl"] for r in rows),
                      "logit_scale": float(logits_c.abs().max()),
                      "control_flat_causal_nodes_differing": sum(
                          r["control_flat_causal_max_abs_logit_diff"] > 1e-3 for r in rows),
                      "seconds_reading_every_spindle_as_text": t_lin_all}
    E = R["exactness"]
    log(f"1 exactness: {len(rows)} spindles, same top-1 everywhere: {E['all_same_top1']}, "
        f"max |dlogit| {E['max_abs_logit_diff']:.2e} (logit scale {E['logit_scale']:.2f}), "
        f"max |dKV| {E['max_abs_kv_diff']:.2e}, max KL {E['max_kl']:.2e}; "
        f"control without the tree mask: {E['control_flat_causal_nodes_differing']}/{len(rows)} differ; "
        f"reading all {len(rows)} as text took {t_lin_all:.1f}s vs compile {t_compile:.1f}s")

    # ---- 2 load by address
    q = torch.tensor(encode(tok, QUESTION))
    order = sorted(range(len(nodes)), key=lambda i: -spindle_lens[i])
    picks = order[:3] + random.sample(order[3:], min(args.load_tests - 3, len(order) - 3))
    loads = []
    for i in picks:
        n = nodes[i]
        idx = spindle_index(n, starts, lens)
        full = torch.cat([flat[idx], q])
        lin_logits, lin_cache, t_lin = linear_read(model, full)
        ld_logits, ld_cache, t_ld = loaded_read(model, kv, idx, q, len(idx))
        g_lin = greedy(model, lin_cache, lin_logits[-1], len(full), args.gen)
        g_ld = greedy(model, ld_cache, ld_logits[-1], len(full), args.gen)
        loads.append({"address": addr(n["path"]), "spindle_tokens": len(idx),
                      "question_tokens": len(q),
                      "max_abs_logit_diff": float((lin_logits[-1] - ld_logits[-1]).abs().max()),
                      "same_top1": int(lin_logits[-1].argmax()) == int(ld_logits[-1].argmax()),
                      "greedy_identical": g_lin == g_ld,
                      "greedy_text_fresh_read": tok.decode(g_lin),
                      "greedy_text_loaded": tok.decode(g_ld),
                      "fresh_read_ttft_s": t_lin, "loaded_ttft_s": t_ld,
                      "speedup": t_lin / t_ld})
    R["load"] = {"per_spindle": loads,
                 "all_greedy_identical": all(x["greedy_identical"] for x in loads),
                 "median_speedup": statistics.median(x["speedup"] for x in loads),
                 "median_fresh_ttft_s": statistics.median(x["fresh_read_ttft_s"] for x in loads),
                 "median_loaded_ttft_s": statistics.median(x["loaded_ttft_s"] for x in loads)}
    D = R["load"]
    log(f"2 load: {len(loads)} spindles, greedy continuation identical in all: "
        f"{D['all_greedy_identical']}; median time to first token fresh "
        f"{D['median_fresh_ttft_s']:.2f}s vs loaded {D['median_loaded_ttft_s']:.3f}s "
        f"(x{D['median_speedup']:.1f})")

    # ---- 3 edit: recompile only the subtree
    subtree_of = {i: [j for j in range(len(nodes)) if i in nodes[j]["anc"]] for i in range(len(nodes))}
    cands = [i for i, n in enumerate(nodes) if len(n["path"]) == 2] or [1]
    e = max(cands, key=lambda i: len(subtree_of[i]))
    S = subtree_of[e]
    new_seg = list(seg_ids)
    new_seg[e] = encode(tok, segment(nodes[e]["text"] + " This line was edited.", nodes[e]["path"]))
    per_node = lambda kvf, st, ln, j: [(k[:, :, st[j]:st[j] + ln[j]], v[:, :, st[j]:st[j] + ln[j]]) for k, v in kvf]
    new_kv = {j: per_node(kv, starts, lens, j) for j in range(len(nodes))}
    t = time.perf_counter()
    recomputed = 0
    for j in S:  # pre-order: ancestors inside S come first
        strict = nodes[j]["anc"][:-1]
        past = [(torch.cat([new_kv[a][li][0] for a in strict], 2),
                 torch.cat([new_kv[a][li][1] for a in strict], 2)) for li in range(len(kv))]
        base = past[0][0].shape[2]
        ids = torch.tensor(new_seg[j])
        out = model(input_ids=ids[None], past_key_values=as_cache(past),
                    position_ids=torch.arange(base, base + len(ids))[None], use_cache=True)
        new_kv[j] = [(lay.keys[:, :, base:], lay.values[:, :, base:]) for lay in out.past_key_values.layers]
        recomputed += len(ids)
    t_inc = time.perf_counter() - t
    flat2, pos2, allowed2, starts2, lens2 = tree_layout(nodes, new_seg)
    _, kv2, t_full = compile_block(model, flat2, pos2, allowed2)
    diff_in, diff_out = 0.0, 0.0
    for j in range(len(nodes)):
        ref = per_node(kv2, starts2, lens2, j)
        got = new_kv[j] if j in S else per_node(kv, starts, lens, j)
        d = max(max(float((a - b).abs().max()), float((c - d_).abs().max()))
                for (a, c), (b, d_) in zip(got, ref))
        if j in S:
            diff_in = max(diff_in, d)
        else:
            diff_out = max(diff_out, d)
    R["edit"] = {"edited": addr(nodes[e]["path"]), "subtree_nodes": len(S), "nodes": len(nodes),
                 "tokens_recomputed": recomputed, "tokens_total": len(flat2),
                 "subtree_seconds": t_inc, "full_recompile_seconds": t_full,
                 "max_abs_kv_diff_inside_subtree_vs_full": diff_in,
                 "max_abs_kv_diff_outside_subtree_vs_original": diff_out}
    X = R["edit"]
    log(f"3 edit at {X['edited']}: recomputed {X['subtree_nodes']}/{len(nodes)} nodes "
        f"({recomputed}/{len(flat2)} tokens) in {t_inc:.1f}s vs full {t_full:.1f}s; "
        f"max |dKV| inside {diff_in:.2e}, outside unchanged {diff_out:.2e}")

    # ---- 4 ring: a node's children read as a disc
    parent = 0
    kids = [j for j in range(len(nodes)) if nodes[j]["parent"] == parent]
    root_idx = spindle_index(nodes[parent], starts, lens)
    seq_ids = torch.cat([flat[root_idx]] + [flat[starts[j]:starts[j] + lens[j]] for j in kids] + [q])
    a_logits, a_cache, _ = linear_read(model, seq_ids)
    g_a = greedy(model, a_cache, a_logits[-1], len(seq_ids), args.gen)
    swapped = kids[:]
    if len(swapped) > 1:
        swapped[0], swapped[1] = swapped[1], swapped[0]
    sw_ids = torch.cat([flat[root_idx]] + [flat[starts[j]:starts[j] + lens[j]] for j in swapped] + [q])
    d_all, _, _ = linear_read(model, sw_ids)
    d_logits = d_all[-1]

    def parallel(rotate_keys):
        parts = gather(kv, root_idx)
        offset = 0
        for j in kids:
            ks = [(k[:, :, starts[j]:starts[j] + lens[j]], v[:, :, starts[j]:starts[j] + lens[j]]) for k, v in kv]
            if rotate_keys:
                ks = [(rotate(model, k, offset), v) for k, v in ks]
            parts = [(torch.cat([pk, k], 2), torch.cat([pv, v], 2)) for (pk, pv), (k, v) in zip(parts, ks)]
            offset += lens[j]
        start = len(root_idx) + (offset if rotate_keys else max(lens[j] for j in kids))
        out = model(input_ids=q[None], past_key_values=as_cache(parts),
                    position_ids=torch.arange(start, start + len(q))[None], use_cache=True)
        g = greedy(model, out.past_key_values, out.logits[0, -1], start + len(q), args.gen)
        return out.logits[0, -1], g

    b_logits, g_b = parallel(False)
    c_logits, g_c = parallel(True)
    k0 = kv[0][0][:, :, :8]
    rot_check = float((rotate(model, rotate(model, k0, 37), 63) - rotate(model, k0, 100)).abs().max())
    R["ring"] = {"parent": addr(nodes[parent]["path"]), "children": [addr(nodes[j]["path"]) for j in kids],
                 "trained_weights": args.model != "random",
                 "kl_parallel_shared_positions": kl(a_logits[-1], b_logits),
                 "kl_parallel_rerotated": kl(a_logits[-1], c_logits),
                 "kl_control_text_two_siblings_swapped": kl(a_logits[-1], d_logits),
                 "top1_parallel_shared": int(a_logits[-1].argmax()) == int(b_logits.argmax()),
                 "top1_parallel_rerotated": int(a_logits[-1].argmax()) == int(c_logits.argmax()),
                 "greedy_prefix_match_shared": common_prefix(g_a, g_b),
                 "greedy_prefix_match_rerotated": common_prefix(g_a, g_c),
                 "greedy_tokens": args.gen, "rotation_composition_check": rot_check,
                 "greedy_text_text_read": tok.decode(g_a),
                 "greedy_text_parallel_shared": tok.decode(g_b),
                 "greedy_text_parallel_rerotated": tok.decode(g_c)}
    G = R["ring"]
    log(f"4 ring under {G['parent']} ({len(kids)} siblings): KL vs text read: shared positions "
        f"{G['kl_parallel_shared_positions']:.2e}, re-rotated {G['kl_parallel_rerotated']:.2e}, "
        f"control (text, two siblings swapped) {G['kl_control_text_two_siblings_swapped']:.2e}"
        f"{'' if G['trained_weights'] else '  [untrained weights: plumbing check only]'}")

    # ---- storage
    hd = cfg.hidden_size // cfg.num_attention_heads
    per_tok = 2 * cfg.num_hidden_layers * cfg.num_key_value_heads * hd * 2
    R["storage"] = {"bytes_per_token_bf16": per_tok, "block_bytes_bf16": per_tok * L}
    log(f"storage: {per_tok/1024:.0f} KB per token in bf16; whole block {per_tok*L/1e6:.0f} MB")

    with open(args.out, "w") as f:
        json.dump(R, f, indent=1)
    log(f"wrote {args.out}")


if __name__ == "__main__":
    sys.exit(main())
