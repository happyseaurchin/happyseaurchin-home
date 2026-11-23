"""Blind packets for round two's judges: each round-two closing without its digit, under a random id, shuffled, with
the walk printed once (as walked, so the judges can name its parts). The key mapping ids to the arm the handed
closing came from is written apart and never shown to a judge.

usage: python3 -I round2_packets.py run-1.5b.json round2-1.5b.json  ->  judges-r2/<judge>/packet.md, key-r2.json
"""
import json, os, random, sys

FORKS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']

def strip_digit(t):
    lines = t.split('\n')
    return '\n'.join(lines[1:]).strip() if lines and lines[0].strip().isdigit() else t.strip()

HOW = """You are judging closings written by language models. Each closing was written by a model handed what an earlier
model wrote after reading the WALK below, or after reading nothing at all, and asked to write the next fork (its frame
in one sentence, the way taken at it, the ways passed) and then two lines for whoever comes next. You are not told
which closing came from which, and it must not matter to your judgment. Judge each closing on its own words against
the walk.

For every closing give three answers:

ACTS_FROM: the one part of the walk the closing acts from most, by its label: R (the root), F1, F2, F3, F4, F5 or F6
(the forks), or NONE when it acts from no part of the walk. "Acts from" means the closing's fork and its two lines
take up, continue or build on that part's idea or the way taken there, not merely echo a word.

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

def main():
    r1 = json.load(open(sys.argv[1], encoding='utf-8'))
    r2 = json.load(open(sys.argv[2], encoding='utf-8'))
    parts = r1['parts']
    walk = '\n\n'.join(['R — ' + parts[0]] + [FORKS[i] + ' — ' + p for i, p in enumerate(parts[1:])])
    rng = random.Random(20261123)
    key, items = {}, []
    for arm, a in r2['arms'].items():
        for k, r in enumerate(a['readings']):
            cid = '%04x' % rng.randrange(16 ** 4)
            while cid in key:
                cid = '%04x' % rng.randrange(16 ** 4)
            key[cid] = {'model': r2['model'], 'arm': arm, 'reading': k, 'digit': r['digit'], 'round': 2}
            items.append((cid, strip_digit(r['text'])))
    for judge in ('a', 'b'):
        rng.shuffle(items)
        body = '\n\n'.join(f'### closing {cid}\n{text}' for cid, text in items)
        d = f'judges-r2/{judge}'
        os.makedirs(d, exist_ok=True)
        open(f'{d}/packet.md', 'w', encoding='utf-8').write(f"{HOW}\n## THE WALK\n\n{walk}\n\n## THE CLOSINGS ({len(items)})\n\n{body}\n")
        print(f'{d}/packet.md: {len(items)} closings')
    json.dump(key, open('key-r2.json', 'w', encoding='utf-8'), indent=1)
    print('key-r2.json:', len(key), 'ids')

main()
