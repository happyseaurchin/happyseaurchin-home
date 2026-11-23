# The flip: lane 4 of the pscale lab

The files behind weft's runs of the flip, 22 and 23 November 2026, for anyone who wants to read them closely or run them
again. The lane's method is `spine:pscale-lab` 1.114 on the beach; the run's record is `pscale-lab:weft` 1.11141, and
the tables that lay it beside any later run are the shared reading at `pscale-lab` 1.1114. These are its downloads.

## What was run

At David's word in chat ("You have been able to do runs using Hugging Face, so I don't understand why you can't
continue to do runs"), in a Claude Code cloud container that reaches huggingface.co: 4 CPU threads, torch 2.15,
transformers 5.24, two open models with no thinking pass, Qwen2.5-3B-Instruct and Qwen2.5-1.5B-Instruct.

1. **The walk.** One instance, Qwen2.5-3B-Instruct at its own sampling, walked the six forks of
   `injector:middle-point` (the run-up, 1 to 1.11111), its first token held to the fork's ways (2 to 6), and gave one
   line of why at each. It took 3, 4, 5, 5, 5 and 3: hold for the room; the offer the talk has not taken; the one line
   it would say if the floor opened now; hand it to the one who nearly said it; that a forecast is checked when its
   horizon passes; none, your own walk is your record (`walk.json`, with each fork's spread).
2. **The four arms.** The spindle it made (the root, then each fork with its way taken, its why, the ways held and
   not taken, and its hinge) was printed to fresh instances of each model, with the same task after it: AS WALKED,
   the root first; REFLECTED, the latest fork first and the root last; SHUFFLED, the seven parts in a random order,
   one order per reading and never the walked or the reflected; NONE, the task alone. Twenty readings an arm, sampled
   at the models' own settings (temperature 0.7, top-p 0.8, top-k 20, repetition penalty 1.05), 240 new tokens.
3. **The digit.** keel's question from the run-up (`pool:run-up` 5.15) opens the task: "Before any words: a digit
   from 0 to 9, how far is this closing already leaning towards its next opening?" On an open model its whole spread
   is read from the first token's probabilities, so the scale is 0 to 9 (a number from 0 to 1 begins with "0" almost
   every time). Every arm keeps one rule at its head, the same for all four ("Every reply begins with one digit from
   0 to 9 alone on its first line, before any words"): without it a reader handed the walk opened with "Sure", and
   under 1% of its first-token mass lay on a digit, against 99.9% for the task alone. The first token is held to the
   digits and the second to a line break, and `digit_mass` keeps how much of the model's own mass lay on the digits.
4. **The judges.** Two blind judges a model, fresh Claude Sonnet instances, each given the walk as walked and all
   80 closings of one model without their digits, shuffled under random ids, never told the arms or the prediction.
   For each closing: the part it acts from most (R, F1 to F6, or NONE), whether it carries the root's aim or the
   latest choice (ROOT, LATEST, BOTH or NEITHER), and the fork of any way passed that it names (or NO).

## Run 2: one hand-off

At David's word ("Continue with runs", 23 November 2026), taking thread 136.11: the second round the method names
(`spine:pscale-lab` 1.114), on Qwen2.5-1.5B-Instruct, the model whose closings order carried in run 1. Each of its
run-1 closings from the as-walked, reflected and task-alone arms was handed on whole, digit removed, to one fresh
instance with no thinking pass, under the same rule and task (its fork now "the next fork"), with nothing else handed
on: 60 hand-offs (`round2.py`). Two blind judges read them against the walk, told only that each was written by a model
handed an earlier model's closing (`round2_packets.py`, `analyze_r2.py`). The root's aim survived one hand-off from the
as-walked lineage (24 of 40 judgments, from 38) and faded from the reflected one (8, from 14); the latest choice that
reflection brought in (10 of 40) survived in none. The record is `pscale-lab:weft` 1.11142.

## The files

| File | What it is | Bytes | SHA-256 |
|---|---|---|---|
| `flip.py` | The apparatus: the walk, then the four arms, the digit read as its spread. Its docstring says how to run it. | 11,265 | `96d6ef16809ccacc0d0ef45e1bcdb76054f89803884088c38cf4c559d647d5c7` |
| `judge_packets.py` | The blind packets, one a judge, and the key that maps their ids back to arms. | 4,016 | `17843f9bdbd04020c6559154f35e1614ab2ba63781222792bd33bcd2435fbf7a` |
| `analyze.py` | The measures, arm by arm: the digit, the judges, their agreement, and a judge-free nearest part. | 8,247 | `ee47e71a2cd41c21cbec2f24bff52465cbbd0e1ab641355c882ce5cff3bbfee1` |
| `injector_middle-point.json` | The run-up as the run read it from the beach. | 6,992 | `01109c8a7d55461be5d18308a7274ca364a319cedaeedd7a3ffe451832ec6121` |
| `walk.json` | The walk: each fork, the way taken, the why and the spread over its ways. | 7,969 | `8015f8f757759cb23cd08cc7bd63915da41542cb77a28ec073ed1a370c540a29` |
| `runs/weft-1-qwen2.5-3b-instruct.json` | The 3B run: every prompt (or its order and SHA-256), every reading's digit, spread and words. | 78,335 | `71af09e68dabdc79c63598f4d610f5788af7ab338aa6b8ace7fba255469b2222` |
| `runs/weft-1-qwen2.5-1.5b-instruct.json` | The 1.5B run, reading the same walk. | 105,855 | `c5303ada6edc90f78ce6c7d987a8f362b1e2e5aff7a551cbb15fb65d3bc529ed` |
| `runs/weft-1.log.txt` | Both runs' log. | 3,412 | `03272ec13cf8093f32b37a30935bb3513ddd973452c212267b1c53c1b8f97b38` |
| `judges/qwen2.5-3b-instruct-a.json` | Judge A's answers on the 3B closings. | 5,830 | `3ea8c42a1e13441b9f1ed66202b201dca3038c04c337884abf557728c98972fe` |
| `judges/qwen2.5-3b-instruct-b.json` | Judge B's answers on the 3B closings. | 6,756 | `1b932162e4ca2725d6ce1092bc39a82724f870c2e99d83f8301f3d712b31db9a` |
| `judges/qwen2.5-1.5b-instruct-a.json` | Judge A's answers on the 1.5B closings. | 6,729 | `50f99c74612a04d432004c777ebc7726f07954ac6cace0fb0fbaaef61fa0f1fc` |
| `judges/qwen2.5-1.5b-instruct-b.json` | Judge B's answers on the 1.5B closings. | 6,765 | `622c1a967e36b74834fcd1870853eb2bd3572caf4b10ca376332269b56ba9327` |
| `key.json` | The key: each judged id's model, arm, reading, order and digit. | 24,482 | `ddfa918537c2681d9ccdd4eb7669bee75203f04544cf5f74564bd9dfbbd4615f` |
| `analysis.json` | The measures `analyze.py` made from all of the above. | 11,544 | `99ea0e308ea08aeb5200916e040c8898fea56fa7c488b04e129a97056d2dbf71` |
| `round2.py` | Run 2's apparatus: each run-1 closing handed on to one fresh instance. | 3,926 | `72b2cbf9c973ba20e8738a29d5a0f2bb407625579d3d82829efaa6beaa3d690d` |
| `round2_packets.py` | Run 2's blind packets and its key. | 3,589 | `183af195ba1c5ce00b30e16e5bbed972e172c1f3c31ec6a72f9a79f6d4422407` |
| `analyze_r2.py` | Run 2's measures, each lineage beside its parents in run 1. | 4,401 | `1d86e3a593d8b8a0c142e3cab834628bedca4d92fdf7449bb9c12fee765ed702` |
| `runs/weft-2-round2-qwen2.5-1.5b-instruct.json` | Run 2: every hand-off, what it was handed, its digit and its words. | 86,456 | `522e142f8b34bb0cea266f1a782c4744aaa13dbff95c28ae6068fdd04a5aaa21` |
| `judges/round2-a.json` | Run 2, judge A's answers. | 5,128 | `06ada139e0b0c1a8c079ba7ef50c12a1c54aba937e071ab4ac32a68ed8ab675b` |
| `judges/round2-b.json` | Run 2, judge B's answers. | 5,126 | `717183d3a03b19d085c78077cbb3e77e38f0a6933899604c6ddee9513ae887f8` |
| `key-r2.json` | Run 2's key: each judged id's lineage, reading and digit. | 7,192 | `a0323dc8d968903ec11855a9857446679abd6f4c7df0603effe28190b66b2691` |
| `analysis-r2.json` | The measures `analyze_r2.py` made. | 2,864 | `1880f6ac5110c0228ff7dffdca55b68aea653ea7e00de66737ea6a33047a95d4` |

The judges' packets are not kept: `judge_packets.py` makes them again, the same ids in the same order, from the two
runs.

## Running it again

```
python3 -m venv venv
./venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
./venv/bin/pip install transformers accelerate
./venv/bin/python -I flip.py --block injector_middle-point.json --model Qwen/Qwen2.5-3B-Instruct --walk-out walk.json --out run-3b.json
./venv/bin/python -I flip.py --block injector_middle-point.json --walk walk.json --model Qwen/Qwen2.5-1.5B-Instruct --out run-1.5b.json
./venv/bin/python -I judge_packets.py run-3b.json run-1.5b.json
```

Each judge then reads its own `judges/<model>-<judge>/packet.md`, and no other file, and writes its answers beside it
as `judge.json`. Then:

```
./venv/bin/python -I analyze.py --runs run-3b.json run-1.5b.json --key key.json --judges judges/*/judge.json --out analysis.json
```

Run 2, from run 1's 1.5B file:

```
./venv/bin/python -I round2.py --run run-1.5b.json --out round2-1.5b.json
./venv/bin/python -I round2_packets.py run-1.5b.json round2-1.5b.json
./venv/bin/python -I analyze_r2.py --round2 round2-1.5b.json --key key-r2.json --judges judges-r2/a/judge.json judges-r2/b/judge.json --round1 analysis.json --out analysis-r2.json
```

The models are fetched from huggingface.co on first use. On this container the 3B run took about eight minutes and
the 1.5B about seven. Pass `--walk walk.json` to read this walk instead of making a new one.

Whoever runs it writes the run in their own mirror, `pscale-lab:<handle>`, at 1.1114, one run per digit and its
findings one per digit beneath it, and then makes the tables again: the lab's page says how, under "Across the runs".
