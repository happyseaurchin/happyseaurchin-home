"""The flip's measures, arm by arm, for each model.

usage: python3 -I analyze.py --runs run-3b.json run-1.5b.json --key key.json --judges judges/*/judge.json --out analysis.json

DIGIT       the first token's spread over 0-9 (held to a digit); its mean, and the mass the model put on digits at all.
            Reversal against reordering: the distance (total variation) of the reflected spread from the walked one,
            beside the distance of every shuffled order's spread from the walked one.
JUDGES      for each closing, blind: the part it acts from most (R, F1-F6, NONE), whether it carries the root's aim or
            the latest choice (ROOT, LATEST, BOTH, NEITHER), and whether it names a way passed. Read against where each
            part stood in that reading's print: first, last (nearest the task), the ends, the middle.
NEAREST     judge-free: the part of the walk whose words a closing shares most (cosine over content words).
"""
import argparse, json, math, os, re
from collections import Counter

ap = argparse.ArgumentParser()
ap.add_argument('--runs', nargs='+', required=True)
ap.add_argument('--key', required=True)
ap.add_argument('--judges', nargs='*', default=[])
ap.add_argument('--out', required=True)
args = ap.parse_args()

LABELS = ['R', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6']
ARMS = ['as_walked', 'reflected', 'shuffled', 'none']
STOP = set('a an and are as at be been but by for from has have he her his i if in into is it its me my not of on or '
           'our so that the their them then there these they this to was we were what when which who will with you '
           'your yours itself one way ways each every no nor than too very can could would should may might must'.split())

def words(t):
    return [w for w in re.findall(r"[a-z]+", t.lower()) if w not in STOP and len(w) > 2]

def cosine(a, b):
    ca, cb = Counter(a), Counter(b)
    num = sum(ca[w] * cb[w] for w in ca if w in cb)
    den = math.sqrt(sum(v * v for v in ca.values())) * math.sqrt(sum(v * v for v in cb.values()))
    return num / den if den else 0.0

def tv(p, q):
    return 0.5 * sum(abs(x - y) for x, y in zip(p, q))

def mean(xs):
    return sum(xs) / len(xs) if xs else float('nan')

def kappa(a, b):
    n = len(a)
    if not n:
        return float('nan')
    po = sum(x == y for x, y in zip(a, b)) / n
    ca, cb = Counter(a), Counter(b)
    pe = sum(ca[k] * cb.get(k, 0) for k in ca) / (n * n)
    return (po - pe) / (1 - pe) if pe < 1 else 1.0

def fisher_two_sided(a, b, c, d):
    """2x2 [[a, b], [c, d]]: exact two-sided p by summing every table as or less likely, margins fixed."""
    r1, r2, c1, n = a + b, c + d, a + c, a + b + c + d
    def p(x):
        return math.comb(r1, x) * math.comb(r2, c1 - x) / math.comb(n, c1)
    p0 = p(a)
    return min(1.0, sum(p(x) for x in range(max(0, c1 - r2), min(r1, c1) + 1) if p(x) <= p0 * (1 + 1e-9)))

key = json.load(open(args.key, encoding='utf-8'))
J = {}  # judge name -> {id: row}
for path in args.judges:
    rows = json.load(open(path, encoding='utf-8'))
    base = os.path.basename(path)
    J[os.path.basename(os.path.dirname(path)) if base == 'judge.json' else base.replace('.json', '')] = {r['id']: r for r in rows}

out = {}
for rpath in args.runs:
    run = json.load(open(rpath, encoding='utf-8'))
    model = run['model']
    parts_words = [words(p) for p in run['parts']]
    M = {'model': model, 'arms': {}}
    walked = run['arms']['as_walked']['readings'][0]['digit_spread']
    for arm in ARMS:
        a = run['arms'][arm]
        rs = a['readings']
        spreads = [r['digit_spread'] for r in rs]
        avg = [mean([s[d] for s in spreads]) for d in range(10)]
        A = {'n': len(rs),
             'digit_spread': [round(x, 4) for x in avg],
             'digit_expected': round(mean([sum(d * s[d] for d in range(10)) for s in spreads]), 3),
             'digit_sampled_mean': round(mean([r['digit'] for r in rs]), 3),
             'digit_sampled': dict(sorted(Counter(r['digit'] for r in rs).items())),
             'digit_mass': round(mean([r['digit_mass'] for r in rs]), 4),
             'tv_from_walked': round(mean([tv(s, walked) for s in spreads]), 4)}
        if arm == 'shuffled':
            A['tv_from_walked_each'] = sorted(round(tv(s, walked), 4) for s in spreads)
        # nearest part by words, judge-free
        near = []
        for r in rs:
            cw = words('\n'.join(r['text'].split('\n')[1:]))
            sims = [cosine(cw, pw) for pw in parts_words]
            near.append(LABELS[max(range(7), key=lambda i: sims[i])])
        A['nearest_part'] = dict(Counter(near))
        # judges
        ids = {(v['arm'], v['reading']): k for k, v in key.items() if v['model'] == model}
        for jname, rows in J.items():
            got = [rows.get(ids.get((arm, i))) for i in range(len(rs))]
            if not any(got):
                continue
            acts, carries, passed, pos = Counter(), Counter(), 0, Counter()
            for i, g in enumerate(got):
                if not g:
                    continue
                acts[g['acts_from']] += 1
                carries[g['carries']] += 1
                passed += g['passed'] != 'NO'
                order = rs[i].get('order', a.get('order')) or []
                if order and g['acts_from'] in LABELS:
                    at = order.index(LABELS.index(g['acts_from']))
                    pos['first' if at == 0 else 'last' if at == len(order) - 1 else 'middle'] += 1
                elif order:
                    pos['none'] += 1
            A.setdefault('judges', {})[jname] = {'acts_from': dict(acts), 'carries': dict(carries), 'names_passed': passed,
                                                 'position_in_print': dict(pos), 'judged': sum(1 for g in got if g)}
        M['arms'][arm] = A
    # agreement between the two judges of this model, over every closing they share
    names = [j for j in J if any(key.get(i, {}).get('model') == model for i in J[j])]
    if len(names) == 2:
        x, y = J[names[0]], J[names[1]]
        common = [i for i in x if i in y and key.get(i, {}).get('model') == model]
        M['agreement'] = {q: {'same': round(mean([x[i][q] == y[i][q] for i in common]), 3),
                              'kappa': round(kappa([x[i][q] for i in common], [y[i][q] for i in common]), 3)}
                          for q in ('acts_from', 'carries', 'passed')}
        M['agreement']['closings'] = len(common)
    # the prediction's two sharp tests, pooled over both judges: walked vs reflected
    if names:
        def tally(arm, field, value):
            hit = tot = 0
            for jn in names:
                j = M['arms'][arm].get('judges', {}).get(jn)
                if j:
                    hit += j[field].get(value, 0)
                    tot += j['judged']
            return hit, tot
        tests = {}
        for field, value, label in (('carries', 'LATEST', 'carries the latest choice'), ('carries', 'ROOT', 'carries the root\'s aim'),
                                    ('acts_from', 'F6', 'acts from the latest fork'), ('acts_from', 'R', 'acts from the root')):
            h1, t1 = tally('as_walked', field, value)
            h2, t2 = tally('reflected', field, value)
            tests[label] = {'as_walked': f'{h1}/{t1}', 'reflected': f'{h2}/{t2}',
                            'fisher_p': round(fisher_two_sided(h1, t1 - h1, h2, t2 - h2), 4) if t1 and t2 else None}
        M['walked_vs_reflected'] = tests
    out[model] = M

json.dump(out, open(args.out, 'w', encoding='utf-8'), indent=1)
for model, M in out.items():
    print('\n==', model)
    for arm in ARMS:
        A = M['arms'][arm]
        print(f"  {arm:10s} digit mean {A['digit_expected']:.2f} (sampled {A['digit_sampled_mean']:.2f}, on digits {A['digit_mass']:.3f}) "
              f"TV from walked {A['tv_from_walked']:.3f}  nearest {A['nearest_part']}")
        for jn, j in A.get('judges', {}).items():
            print(f"      {jn}: acts {j['acts_from']} carries {j['carries']} passed {j['names_passed']}/{j['judged']} pos {j['position_in_print']}")
    if 'agreement' in M:
        print('  agreement', M['agreement'])
    if 'walked_vs_reflected' in M:
        print('  walked vs reflected', M['walked_vs_reflected'])
