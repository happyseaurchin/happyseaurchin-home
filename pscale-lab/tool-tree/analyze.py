#!/usr/bin/env python3
"""analyze.py — the tool tree's runs as tables: python3 -I analyze.py runs/qwen15-n27.json runs/qwen15-n81.json ..."""
import collections
import json
import statistics
import sys


def med(v):
    v = [x for x in v if x is not None]
    return statistics.median(v) if v else None


for path in sys.argv[1:]:
    R = json.load(open(path))
    print(f"\n== {path}: {R['model']}, {R['tools']} tools, {R['tasks']} tasks")
    if 'flat_tool_text_tokens' in R:
        print(f"   flat list: {R['flat_tool_text_tokens']:,} tokens of tool text; fits the window: {R['flat_fits']}; read once in {R['flat_prefix_seconds']:.1f}s" if R['flat_fits'] else f"   flat list: {R['flat_tool_text_tokens']:,} tokens, does not fit")
    fam = collections.defaultdict(lambda: collections.Counter())
    for arm in R['arms']:
        rows = [r[arm] for r in R['rows']]
        ok = sum(r['ok'] for r in rows)
        line = f"   {arm:8} right {ok:>2} of {len(rows)}  tool text {med([r['tool_text_tokens'] for r in rows]):>8,.0f}  processed {med([r['processed_tokens'] for r in rows]):>8,.0f}  time {med([r['seconds'] for r in rows]):6.2f}s"
        if arm == 'flat':
            # the tool it plainly meant: a called name that is not on the list but whose last part (after the last
            # '__') names exactly one tool on the list. A call by a wrong name fails as a call; this only counts intent.
            listed = [r2['accept'][0] for r2 in R['rows']] if R['tools'] == len(R['rows']) else None
            names = R.get('names') or listed or []
            def meant(c):
                if not c or c in names:
                    return c
                tail = c.split('__')[-1]
                hit = [n for n in names if n.split('__')[-1] == tail]
                return hit[0] if len(hit) == 1 else c
            lenient = sum(meant(r['chosen']) in row['accept'] for r, row in zip(rows, R['rows']))
            line += f"  (by the tool it meant: {lenient})"
            line += f"  fresh {med([r.get('seconds_fresh') for r in rows]):.1f}s"
            bad = [r for r in rows if r['chosen'] and not r.get('named_a_tool')]
            none = [r for r in rows if not r['chosen']]
            line += f"  · named a tool not on the list {len(bad)}, called none {len(none)}"
            if bad:
                line += ' (' + ', '.join(sorted({r['chosen'].replace('mcp__', '') for r in bad}))[:200] + ')'
        else:
            first_wrong = collections.Counter(next((i + 1 for i, s in enumerate(r['steps']) if not s['ok']), 0) for r in rows)
            ones = sum(s['pick'] == '1' for r in rows for s in r['steps'])
            allsteps = sum(len(r['steps']) for r in rows)
            line += f"  steps {med([len(r['steps']) for r in rows])}  first wrong turn at step {dict(sorted((k, v) for k, v in first_wrong.items() if k))}  picks of line 1: {ones} of {allsteps}"
        print(line)
        for r, row in zip(rows, R['rows']):
            f = 'beach' if 'bsp' in row['accept'][0] or 'biome' in row['accept'][0] or 'SALT' in row['accept'][0] or 'janus' in row['accept'][0] else row['accept'][0].split('__')[1] if row['accept'][0].startswith('mcp__') else 'built-in'
            fam[f][arm] += r['ok']
            fam[f]['n_' + arm] += 1
    print('   by service:', '; '.join(f"{k} " + ' '.join(f"{a} {c[a]}/{c['n_' + a]}" for a in R['arms']) for k, c in fam.items()))
