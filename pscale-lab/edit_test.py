#!/usr/bin/env python3
"""
edit_test.py — keel's test 3 (an edit recompiled in its subtree alone) from pscale_kv_compile.py, run on its own.
weft, lane pscale.lab, 19 November 2026.

At Qwen2.5-1.5B's size the whole apparatus runs out of a 15 GB machine's memory at test 3: it still holds the
compile's word scores and the plain-mask control's (2 GB each at a 152k vocabulary) when the full recompile adds a
third. This imports the apparatus unchanged and runs test 3's own lines, dropping the compile's word scores, which
test 3 never reads. What it measures is keel's test 3, line for line.

  python3 -I edit_test.py --apparatus pscale_kv_compile.py --block strata.json \
      --model Qwen/Qwen2.5-1.5B-Instruct --out edit_test.json
"""
import argparse
import importlib.util
import json
import time

import torch


def load_apparatus(path):
    spec = importlib.util.spec_from_file_location("pscale_kv_compile", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apparatus", required=True)
    ap.add_argument("--block", required=True)
    ap.add_argument("--model", required=True)
    ap.add_argument("--out", default="edit_test.json")
    args = ap.parse_args()
    K = load_apparatus(args.apparatus)
    torch.set_grad_enabled(False)

    with open(args.block) as f:
        block = json.load(f)
    nodes = K.flatten(block)
    tok = K.make_tokenizer(args.model, [args.block])
    model = K.make_model(args.model, len(tok), 24)
    cfg = model.config
    seg_ids = [K.encode(tok, K.segment(n["text"], n["path"])) for n in nodes]
    flat, pos, allowed, starts, lens = K.tree_layout(nodes, seg_ids)
    logits, kv, t_compile = K.compile_block(model, flat, pos, allowed)
    del logits  # test 3 reads only the kept states
    K.log(f"compiled {len(nodes)} nodes, {len(flat)} tokens in {t_compile:.1f}s")

    # ---- keel's test 3, as it stands in the apparatus
    subtree_of = {i: [j for j in range(len(nodes)) if i in nodes[j]["anc"]] for i in range(len(nodes))}
    cands = [i for i, n in enumerate(nodes) if len(n["path"]) == 2] or [1]
    e = max(cands, key=lambda i: len(subtree_of[i]))
    S = subtree_of[e]
    new_seg = list(seg_ids)
    new_seg[e] = K.encode(tok, K.segment(nodes[e]["text"] + " This line was edited.", nodes[e]["path"]))
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
        out = model(input_ids=ids[None], past_key_values=K.as_cache(past),
                    position_ids=torch.arange(base, base + len(ids))[None], use_cache=True)
        new_kv[j] = [(lay.keys[:, :, base:], lay.values[:, :, base:]) for lay in out.past_key_values.layers]
        recomputed += len(ids)
    t_inc = time.perf_counter() - t
    flat2, pos2, allowed2, starts2, lens2 = K.tree_layout(nodes, new_seg)
    logits2, kv2, t_full = K.compile_block(model, flat2, pos2, allowed2)
    del logits2
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
    hd = cfg.hidden_size // cfg.num_attention_heads
    per_tok = 2 * cfg.num_hidden_layers * cfg.num_key_value_heads * hd * 2
    R = {"model": args.model, "compile_seconds": t_compile,
         "edit": {"edited": K.addr(nodes[e]["path"]), "subtree_nodes": len(S), "nodes": len(nodes),
                  "tokens_recomputed": recomputed, "tokens_total": len(flat2),
                  "subtree_seconds": t_inc, "full_recompile_seconds": t_full,
                  "max_abs_kv_diff_inside_subtree_vs_full": diff_in,
                  "max_abs_kv_diff_outside_subtree_vs_original": diff_out},
         "storage": {"bytes_per_token_bf16": per_tok, "block_bytes_bf16": per_tok * len(flat)}}
    X = R["edit"]
    K.log(f"3 edit at {X['edited']}: recomputed {X['subtree_nodes']}/{len(nodes)} nodes "
          f"({recomputed}/{len(flat2)} tokens) in {t_inc:.1f}s vs full {t_full:.1f}s; "
          f"max |dKV| inside {diff_in:.2e}, outside unchanged {diff_out:.2e}")
    K.log(f"storage: {per_tok/1024:.0f} KB per token in bf16; whole block {per_tok*len(flat)/1e6:.0f} MB")
    with open(args.out, "w") as f:
        json.dump(R, f, indent=1)
    K.log(f"wrote {args.out}")


if __name__ == "__main__":
    main()
