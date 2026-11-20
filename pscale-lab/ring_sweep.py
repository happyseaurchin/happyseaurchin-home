#!/usr/bin/env python3
"""
ring_sweep.py — the ring test of pscale_kv_compile.py (files:pscale-lab 3, keel), taken over EVERY ring of a block,
with a fuller control. weft, lane pscale.lab, 19 November 2026.

keel's test 4 reads one ring, the root's children, four ways: (a) as text, one after another; (b) loaded in parallel
from the tree-masked compile, siblings sharing positions; (c) loaded in parallel with the keys re-rotated to
sequential positions; (d) the control, the same text with two siblings swapped. This takes every node with two or more
children and adds the baseline the swap stands for: (e) every other order of the siblings read as text, its mean and
its largest divergence from (a), so a parallel load can be set against how much the order of a ring already moves the
model. Divergence is KL(a || x) of the next word after the question, and how many of the greedy words agree.

It imports keel's apparatus unchanged, from the path given, and reuses its compile, gather, rotate and kl.

  python3 -I ring_sweep.py --apparatus pscale_kv_compile.py --block strata.json \
      --model Qwen/Qwen2.5-0.5B-Instruct --gen 40 --out ring_sweep.json
"""
import argparse
import importlib.util
import itertools
import json
import statistics
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
    ap.add_argument("--gen", type=int, default=40)
    ap.add_argument("--max-orders", type=int, default=24)
    ap.add_argument("--out", default="ring_sweep.json")
    args = ap.parse_args()
    K = load_apparatus(args.apparatus)
    torch.set_grad_enabled(False)

    with open(args.block) as f:
        block = json.load(f)
    nodes = K.flatten(block)
    tok = K.make_tokenizer(args.model, [args.block])
    model = K.make_model(args.model, len(tok), 24)
    seg_ids = [K.encode(tok, K.segment(n["text"], n["path"])) for n in nodes]
    flat, pos, allowed, starts, lens = K.tree_layout(nodes, seg_ids)
    _, kv, t_compile = K.compile_block(model, flat, pos, allowed)
    K.log(f"compiled {len(nodes)} nodes, {len(flat)} tokens in {t_compile:.1f}s")
    q = torch.tensor(K.encode(tok, K.QUESTION))

    def seg(j):
        return flat[starts[j]:starts[j] + lens[j]]

    def text_read(parent_idx, order):
        ids = torch.cat([flat[parent_idx]] + [seg(j) for j in order] + [q])
        logits, cache, _ = K.linear_read(model, ids)
        return logits[-1], cache, len(ids)

    def parallel(parent_idx, kids, rotate_keys):
        parts = K.gather(kv, parent_idx)
        offset = 0
        for j in kids:
            ks = [(k[:, :, starts[j]:starts[j] + lens[j]], v[:, :, starts[j]:starts[j] + lens[j]]) for k, v in kv]
            if rotate_keys:
                ks = [(K.rotate(model, k, offset), v) for k, v in ks]
            parts = [(torch.cat([pk, k], 2), torch.cat([pv, v], 2)) for (pk, pv), (k, v) in zip(parts, ks)]
            offset += lens[j]
        start = len(parent_idx) + (offset if rotate_keys else max(lens[j] for j in kids))
        out = model(input_ids=q[None], past_key_values=K.as_cache(parts),
                    position_ids=torch.arange(start, start + len(q))[None], use_cache=True)
        g = K.greedy(model, out.past_key_values, out.logits[0, -1], start + len(q), args.gen)
        return out.logits[0, -1], g

    rings = []
    for p, n in enumerate(nodes):
        kids = [j for j in range(len(nodes)) if nodes[j]["parent"] == p]
        if len(kids) < 2:
            continue
        t0 = time.perf_counter()
        pidx = K.spindle_index(n, starts, lens)
        a, a_cache, a_len = text_read(pidx, kids)
        g_a = K.greedy(model, a_cache, a, a_len, args.gen)
        b, g_b = parallel(pidx, kids, False)
        c, g_c = parallel(pidx, kids, True)
        swapped = kids[:]
        swapped[0], swapped[1] = swapped[1], swapped[0]
        d, _, _ = text_read(pidx, swapped)
        orders = [list(o) for o in itertools.permutations(kids) if list(o) != kids][:args.max_orders]
        kl_orders, top1_orders, gp_orders = [], [], []
        for o in orders:
            e, e_cache, e_len = text_read(pidx, o)
            kl_orders.append(K.kl(a, e))
            top1_orders.append(int(a.argmax()) == int(e.argmax()))
            g_e = K.greedy(model, e_cache, e, e_len, args.gen)
            gp_orders.append(K.common_prefix(g_a, g_e))
        row = {"parent": K.addr(n["path"]), "children": [K.addr(nodes[j]["path"]) for j in kids],
               "parent_spindle_tokens": len(pidx), "children_tokens": [lens[j] for j in kids],
               "kl_parallel_shared_positions": K.kl(a, b),
               "kl_parallel_rerotated": K.kl(a, c),
               "kl_control_two_swapped": K.kl(a, d),
               "kl_other_orders_mean": statistics.mean(kl_orders),
               "kl_other_orders_max": max(kl_orders),
               "kl_other_orders_min": min(kl_orders),
               "other_orders": len(orders),
               "top1_parallel_shared": int(a.argmax()) == int(b.argmax()),
               "top1_parallel_rerotated": int(a.argmax()) == int(c.argmax()),
               "top1_other_orders_share": sum(top1_orders) / len(top1_orders),
               "greedy_prefix_shared": K.common_prefix(g_a, g_b),
               "greedy_prefix_rerotated": K.common_prefix(g_a, g_c),
               "greedy_prefix_other_orders_mean": statistics.mean(gp_orders),
               "greedy_tokens": args.gen,
               "text_read": tok.decode(g_a), "parallel_shared": tok.decode(g_b), "parallel_rerotated": tok.decode(g_c),
               "seconds": time.perf_counter() - t0}
        K.log(f"ring {row['parent']} ({len(kids)}): KL shared {row['kl_parallel_shared_positions']:.4f}, "
              f"rerotated {row['kl_parallel_rerotated']:.4f}, swap {row['kl_control_two_swapped']:.4f}, "
              f"other orders mean {row['kl_other_orders_mean']:.4f} max {row['kl_other_orders_max']:.4f}; "
              f"greedy words matching: shared {row['greedy_prefix_shared']}, rerotated {row['greedy_prefix_rerotated']}, "
              f"orders {row['greedy_prefix_other_orders_mean']:.1f} of {args.gen}")
        rings.append(row)
    R = {"apparatus": args.apparatus, "model": args.model, "block": args.block, "nodes": len(nodes),
         "tokens": len(flat), "compile_seconds": t_compile, "rings": rings,
         "summary": {
             "rings": len(rings),
             "rerotated_within_order_range": sum(r["kl_parallel_rerotated"] <= r["kl_other_orders_max"] for r in rings),
             "shared_within_order_range": sum(r["kl_parallel_shared_positions"] <= r["kl_other_orders_max"] for r in rings),
             "median_kl_shared": statistics.median(r["kl_parallel_shared_positions"] for r in rings),
             "median_kl_rerotated": statistics.median(r["kl_parallel_rerotated"] for r in rings),
             "median_kl_orders_mean": statistics.median(r["kl_other_orders_mean"] for r in rings),
             "median_kl_swap": statistics.median(r["kl_control_two_swapped"] for r in rings)}}
    with open(args.out, "w") as f:
        json.dump(R, f, indent=1)
    K.log("summary " + json.dumps(R["summary"]))
    K.log(f"wrote {args.out}")


if __name__ == "__main__":
    main()
