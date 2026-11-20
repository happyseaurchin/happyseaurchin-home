# Lane 3: the tool tree

The lab's second experiment (`spine:pscale-lab` 1.113): stand the tools of a real session in a pscale block, nine to a
ring, and see whether a model reaches the one a task needs by walking a short number instead of reading them all.
Run by weft on 20 November 2026, at David's word ("And the other lane, go ahead"). The run is written up at
`pscale-lab:weft` 1.11131, and the tables that lay the runs side by side at `pscale-lab` 1.1113.

## The session's tools

The tools are a real session's: the 534 that a Claude Code session on happyseaurchin's account held back from its
model's window that morning, its deferred tools. They cover Vercel (276), GitHub (48), Supabase (35), Gmail (31),
Google Drive, Calendar and Docs (28), Stripe (16), Claude Docs (5), the beach through bsp-mcp under five identities
(60), two biomes (6) and the session's own helpers (29).

Each definition was loaded the way the session loads one, by searching for it. It was then read back exactly from the
session's own record. As Qwen2.5's chat template hands tools to a model, the 534 definitions come to 338,669 tokens.

The definitions are each service's own text, so they are not copied here. `session_tools.manifest.json` names each
tool with its service, its size in tokens and the SHA-256 of its definition. Anyone with the same connectors can check
theirs against it.

## The files

| file | what it is |
|---|---|
| `tool_tree.py` | the apparatus: the three arms, the measures, one run |
| `build.py` | stands the definitions in the block, writes every ring's line, and writes the tasks |
| `analyze.py` | lays a run out as the lab's tables |
| `tree.json` | the whole session as one pscale block. Nine families at the root, each line saying what its tools are for; nine more beneath each; a tool's name at its leaf. 9 tools are two steps down, 189 three, 336 four. |
| `tree81.json`, `tree27.json` | nine and three of each family, with the tasks' own tools among them. The 27 are the largest flat list of this session a 1.5B model's window holds whole: 29,227 tokens of definitions against a window of 32,768. |
| `tasks.json`, `tasks27.json` | 45 tasks, five a family, and the 27 that go with the 27 tools. Each task needs one tool, names none, and accepts every tool that does what it asks. |
| `session_tools.manifest.json` | the 534 tools by name, service, size and fingerprint |
| `runs/` | each run's JSON (every task's choice, its walk, its tokens and its time) and its log |

## The three arms

- **flat**: every definition, as the model's own chat template hands tools over, and the model calls the tool it
  wants. The list is read once and kept, and its time to act is given both kept and fresh (a call that keeps nothing
  pays for the reading too).
- **tree**: the block walked one ring at a time. At each ring the model is shown the task, the walk so far, and the
  ring's nine lines, and it picks a digit by its scores for the digits present. A leaf's line is the tool's name and
  the opening of its own description, never a line written for it.
- **control**: the same walk with every family line blanked, so a gain the tree makes over it is the voicing's, not
  the depth's.

## Running it again

```
venv/bin/python -I tool_tree.py --tools session_tools.json --tree tree27.json --tasks tasks27.json \
    --model Qwen/Qwen2.5-1.5B-Instruct --arms tree,control,flat --out run.json
venv/bin/python -I analyze.py run.json
```

`session_tools.json` holds the definitions, a list of `{name, description, input_schema}`. It comes from your own
session's tools, checked against the manifest.
