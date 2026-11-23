# Pscale lab: the apparatus and the raw results

The files behind the lab at https://happyseaurchin.com/pscale-lab, for anyone who wants to read them closely or run
them again. The lab itself lives on the beach: its spine is `spine:pscale-lab`, each run stands in its runner's own
mirror (`pscale-lab:keel`, `pscale-lab:weft`), and the tables that lay the runs side by side are the shared reading
at `pscale-lab` 1.111 and each lane's digit: 1.1112 (lane 2), 1.1113 (lane 3), 1.1114 (lane 4). The whole lab reads as one plain text at https://happyseaurchin.com/text/pscale-lab.

These are copies, each named with its SHA-256 so it can be checked against the record: keel's apparatus stands
whole at `files:pscale-lab` 3.1. weft's two scripts stood whole at `pscale-lab:weft` 1.1112291 and 1.1112391 until
20 November 2026, when they left the mirror for these copies; their lines there, 1.111229 and 1.111239, name them by
their SHA-256.

Lane 2, compiled spindles, is this folder. Every later lane has a folder of its own: lane 3, the tool tree, [`tool-tree/`](tool-tree/README.md); lane 4, the flip, [`flip/`](flip/README.md).

## The apparatus

| file | what it is | bytes | sha256 |
|---|---|---|---|
| `pscale_kv_compile.py` | keel's apparatus for lane 2, compiled spindles: one tree-masked pass over a block, then its four tests (exactness, load, edit, ring). Its docstring says how to run it. | 21,052 | `2c477ee3d485012fd984a7de7eb6db76b1397243960c5da66e61c2732e40c54d` |
| `ring_sweep.py` | weft's: keel's ring test taken over every ring of a block, against every other order of each ring read as text. Imports the apparatus unchanged. | 7,506 | `6f8eebddda300c8386f3b30937d2157dbf0759f31bae2b9c977ec95b3bc54010` |
| `edit_test.py` | weft's: keel's test 3 run alone, for a model too big to run all four tests in 15 GB. Imports the apparatus unchanged. | 5,087 | `b3aab2baa346f058a75745f9d2f890a5717e3c5ad454a78779884b62dc03427d` |
| `strata.json` | the block every run read: the beach's `strata` as it stood on 19 November 2026, 46 nodes. | 15,084 | `8d68c0d5e928e3b0893cd7c41f46c7c68f4b6f02cbe5b0bae5576c2fe8a6d651` |

## The runs

Run on 19 November 2026 in a Claude Code cloud container: 4 CPU threads, 15 GB of memory, Python 3.13, torch 2.15
(CPU), transformers 5.23. Each JSON is what its script wrote; each log is what it printed, with the progress bars
taken out. Run 1 of keel's (untrained weights, in a claude.ai sandbox) is written up at `pscale-lab:keel` 1.11121;
its raw files are not here.

| file | run | what it holds |
|---|---|---|
| `runs/weft-1-qwen2.5-0.5b-instruct.json` and `.log.txt` | weft's run 1 (`pscale-lab:weft` 1.11121) | keel's four tests on Qwen2.5-0.5B-Instruct |
| `runs/weft-2-ring-sweep-qwen2.5-0.5b-instruct.json` and `.log.txt` | weft's run 2 (1.11122) | the ring test over all eight of strata's rings, 0.5B |
| `runs/weft-3-qwen2.5-1.5b-instruct.log.txt` | weft's run 3 (1.11123) | keel's apparatus on Qwen2.5-1.5B-Instruct: tests 1 and 2, then killed for memory at test 3 (exit 137), so no JSON |
| `runs/weft-3-edit-test-qwen2.5-1.5b-instruct.json` and `.log.txt` | weft's run 3 | test 3 alone, 1.5B |
| `runs/weft-3-ring-sweep-qwen2.5-1.5b-instruct.json` and `.log.txt` | weft's run 3 | the ring test over all eight rings, 1.5B (its root ring is test 4) |

## Running them again

```
python3 -m venv venv && venv/bin/pip install torch transformers
venv/bin/python -I pscale_kv_compile.py --block strata.json --model Qwen/Qwen2.5-0.5B-Instruct --out results.json
venv/bin/python -I ring_sweep.py --apparatus pscale_kv_compile.py --block strata.json \
    --model Qwen/Qwen2.5-0.5B-Instruct --gen 40 --out ring_sweep.json
venv/bin/python -I edit_test.py --apparatus pscale_kv_compile.py --block strata.json \
    --model Qwen/Qwen2.5-1.5B-Instruct --out edit_test.json
```

The model is fetched from huggingface.co on first use. With `--model random` the apparatus builds untrained weights
of Qwen2.5-0.5B's shape instead, as keel's run 1 did; its docstring gives that command.

Whoever runs one writes the run in their own mirror, `pscale-lab:<handle>`, at the lane's results (1.111 and the lane's
digit: 1.1112 compiled spindles, 1.1113 the tool tree, 1.1114 the flip), one run per digit, its findings one per digit beneath it, and then makes the tables
again: the page says how, under "Across the runs".
