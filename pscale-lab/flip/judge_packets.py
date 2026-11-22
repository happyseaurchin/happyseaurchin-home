"""Blind packets for the judges: every closing without its digit, under a random id, shuffled, with the walk printed
once (as walked, so the judges can name its parts). Nothing in a packet says which arm a closing came from.
The key that maps ids back to arms is written apart and never shown to a judge.

usage: python3 -I judge_packets.py run-3b.json run-1.5b.json  ->  judges/<model>-<judge>/packet.md, key.json
"""
import json, os, random, sys

FORKS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']
NAMES = ['THE FIRST HOLD', 'THE MATHS OF THE UNSAID', 'REFLEXIVE INTENT', 'THE RELEASE', 'THE SOLITON', 'THE RECORDS OF PLAY']

def strip_digit(t):
    lines = t.split('\n')
    return '\n'.join(lines[1:]).strip() if lines and lines[0].strip().isdigit() else t.strip()

HOW = """You are judging closings written by language models. Each model read the same WALK (below) and was then given a
task: write a seventh fork for the walk (its frame in one sentence, the way taken at it, the ways passed), then two
lines for whoever comes next. Some models were shown the walk's parts in a different arrangement, and some were not
shown it at all; you are not told which is which, and it must not matter to your judgment. Judge each closing on its
own words against the walk.

For every closing give three answers:

ACTS_FROM: the one part of the walk the closing acts from most, by its label: R (the root), F1, F2, F3, F4, F5 or F6
(the forks), or NONE when it acts from no part of the walk. "Acts from" means the closing's seventh fork and its two
lines take up, continue or build on that part's idea or the way taken there, not merely echo a word.

CARRIES: ROOT if the closing carries the root's aim (the talk ending well: the room finding in its own words what it
was reaching for, what was held said by someone in it or let go unsaid, nothing closed that was still open); LATEST
if it carries the latest choice, F6's way taken ("None: your own walk is your record, and what you keep of it next time
is yours"); BOTH if it clearly carries both; NEITHER if it carries neither.

PASSED: the label of a fork (F1 to F6) whose way NOT taken the closing names or takes up (the ways listed under
"Held, not taken" in the walk), or NO when it names none. If it names several, give the first one it names.

Write your answers as a JSON array, one object per closing, in any order, exactly like:
[{"id": "k3f9", "acts_from": "F4", "carries": "ROOT", "passed": "NO"}, ...]
Every closing must have exactly one object. Use only the labels given above.
"""

def walk_text(run):
    parts = run['parts']
    out = ['R — ' + parts[0]]
    for i, p in enumerate(parts[1:]):
        out.append(FORKS[i] + ' — ' + p)
    return '\n\n'.join(out)

def main():
    runs = [json.load(open(p, encoding='utf-8')) for p in sys.argv[1:]]
    rng = random.Random(20261122)
    key = {}
    for run in runs:
        tag = run['model'].split('/')[-1].lower()
        items = []
        for arm, a in run['arms'].items():
            for k, r in enumerate(a['readings']):
                cid = '%04x' % rng.randrange(16 ** 4)
                while cid in key:
                    cid = '%04x' % rng.randrange(16 ** 4)
                order = r.get('order', a.get('order'))
                key[cid] = {'model': run['model'], 'arm': arm, 'reading': k, 'order': order, 'digit': r['digit']}
                items.append((cid, strip_digit(r['text'])))
        for judge in ('a', 'b'):
            rng.shuffle(items)
            body = '\n\n'.join(f'### closing {cid}\n{text}' for cid, text in items)
            doc = f"{HOW}\n## THE WALK\n\n{walk_text(run)}\n\n## THE CLOSINGS ({len(items)})\n\n{body}\n"
            d = f'judges/{tag}-{judge}'
            os.makedirs(d, exist_ok=True)
            open(f'{d}/packet.md', 'w', encoding='utf-8').write(doc)
            print(f'{d}/packet.md: {len(items)} closings, {len(doc)} characters')
    json.dump(key, open('key.json', 'w', encoding='utf-8'), indent=1)
    print('key.json:', len(key), 'ids')

main()
