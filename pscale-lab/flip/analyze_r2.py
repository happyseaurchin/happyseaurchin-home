"""The flip, second round's measures: what the hand-offs carry, by the arm their handed closing came from, set beside
what those parents carried in round one (the same two-judge reading, from analysis.json), each judge tested apart.

usage: python3 -I analyze_r2.py --round2 round2-1.5b.json --key key-r2.json --judges judges-r2/a/judge.json judges-r2/b/judge.json
                                --round1 analysis.json --out analysis-r2.json
"""
import argparse, json, math, os
from collections import Counter

ap = argparse.ArgumentParser()
ap.add_argument('--round2', required=True)
ap.add_argument('--key', required=True)
ap.add_argument('--judges', nargs='+', required=True)
ap.add_argument('--round1', required=True)
ap.add_argument('--out', required=True)
args = ap.parse_args()

def fisher(a, b, c, d):
    r1, r2, c1, n = a + b, c + d, a + c, a + b + c + d
    p = lambda x: math.comb(r1, x) * math.comb(r2, c1 - x) / math.comb(n, c1)
    p0 = p(a)
    return min(1.0, sum(p(x) for x in range(max(0, c1 - r2), min(r1, c1) + 1) if p(x) <= p0 * (1 + 1e-9)))

def kappa(a, b):
    n = len(a); po = sum(x == y for x, y in zip(a, b)) / n
    ca, cb = Counter(a), Counter(b); pe = sum(ca[k] * cb.get(k, 0) for k in ca) / (n * n)
    return (po - pe) / (1 - pe) if pe < 1 else 1.0

r2 = json.load(open(args.round2, encoding='utf-8'))
key = json.load(open(args.key, encoding='utf-8'))
J = {os.path.basename(os.path.dirname(p)) or p: {r['id']: r for r in json.load(open(p, encoding='utf-8'))} for p in args.judges}
r1 = json.load(open(args.round1, encoding='utf-8'))[r2['model']]
ARMS = ('as_walked', 'reflected', 'none')
out = {'model': r2['model'], 'arms': {}, 'round1': {}}
for arm in ARMS:
    ids = [i for i, v in key.items() if v['arm'] == arm]
    rs = r2['arms'][arm]['readings']
    A = {'n': len(rs), 'digit_mean': round(sum(sum(d * s[d] for d in range(10)) for s in [r['digit_spread'] for r in rs]) / len(rs), 3),
         'digit_mass': round(sum(r['digit_mass'] for r in rs) / len(rs), 4), 'judges': {}}
    for jn, rows in J.items():
        got = [rows[i] for i in ids if i in rows]
        A['judges'][jn] = {'carries': dict(Counter(g['carries'] for g in got)), 'acts_from': dict(Counter(g['acts_from'] for g in got)),
                           'names_passed': sum(g['passed'] != 'NO' for g in got), 'judged': len(got)}
    out['arms'][arm] = A
    R1 = r1['arms'][arm]['judges']
    out['round1'][arm] = {'carries': {k: sum(j['carries'].get(k, 0) for j in R1.values()) for k in ('ROOT', 'LATEST', 'BOTH', 'NEITHER')},
                          'acts_none': sum(j['acts_from'].get('NONE', 0) for j in R1.values()), 'judged': sum(j['judged'] for j in R1.values())}
names = sorted(J)
common = [i for i in J[names[0]] if i in J[names[1]]]
out['agreement'] = {q: {'same': round(sum(J[names[0]][i][q] == J[names[1]][i][q] for i in common) / len(common), 3),
                        'kappa': round(kappa([J[names[0]][i][q] for i in common], [J[names[1]][i][q] for i in common]), 3)}
                    for q in ('acts_from', 'carries', 'passed')}
tests = {}
for field, val, label in (('carries', 'ROOT', "carries the root's aim"), ('carries', 'LATEST', 'carries the latest choice'), ('acts_from', 'NONE', 'acts from nothing in the walk')):
    row = {}
    for jn in names:
        w = out['arms']['as_walked']['judges'][jn][field].get(val, 0); r = out['arms']['reflected']['judges'][jn][field].get(val, 0)
        nw = out['arms']['as_walked']['judges'][jn]['judged']; nr = out['arms']['reflected']['judges'][jn]['judged']
        row[jn] = {'as_walked': f'{w}/{nw}', 'reflected': f'{r}/{nr}', 'fisher_p': round(fisher(w, nw - w, r, nr - r), 4)}
    tests[label] = row
out['walked_vs_reflected'] = tests
json.dump(out, open(args.out, 'w', encoding='utf-8'), indent=1)
for arm in ARMS:
    A = out['arms'][arm]; pool = lambda f, k: sum(j[f].get(k, 0) for j in A['judges'].values())
    tot = sum(j['judged'] for j in A['judges'].values())
    print(f"{arm:10s} round 2: root's aim {pool('carries', 'ROOT')}/{tot}, latest {pool('carries', 'LATEST')}/{tot}, acts from nothing {pool('acts_from', 'NONE')}/{tot}, "
          f"digit mean {A['digit_mean']} | round 1 parents: root's aim {out['round1'][arm]['carries']['ROOT']}/{out['round1'][arm]['judged']}, latest {out['round1'][arm]['carries']['LATEST']}")
print('agreement', out['agreement'])
print('walked vs reflected', json.dumps(tests))
