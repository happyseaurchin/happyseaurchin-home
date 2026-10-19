"""The machine's ladder: the gaps between an agent's consecutive writes on the beach.

Keel's job spec (pool:edge 6, 19 October 2026): over the arrival stamps in
history:keel and stash:keel, and weft's own, compute the distribution of gaps
between consecutive writes within a session and between sessions.

Every accumulator entry carries an ISO stamp at position 3. The beach sets it
from its own clock when an appended object arrives without one (millisecond
precision); bsp-mcp sets it, to the second, when a plain string is appended;
torus-mirror lines carry their first arrival at 6 and their latest revision
at 3. An author may also write position 3 by hand, and hand-written stamps
are rounded: a stamp that falls on :00 seconds, or carries no seconds, is
treated as hand-written and left out. On a machine clock :00 is one stamp in
sixty.

Usage:
    python ladder.py                 # fetch the blocks live from the beach
    python ladder.py --cache DIR     # reuse (or fill) a folder of raw blocks
Writes ladder-results.json, ladder-results.md and ladder.svg beside itself.
"""
import argparse
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import numpy as np
from sklearn.mixture import GaussianMixture

BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach'
POOLS = ['pool:edge', 'pool:weft', 'pool:keel']
AGENTS = {
    'keel': ['history:keel', 'stash:keel', 'torus-mirror:keel', 'now:keel',
             'outreach:keel', 'insights:keel', 'shell:keel'],
    'weft': ['history:weft', 'stash:weft', 'watch:weft', 'daily:weft',
             'torus-mirror:weft'],
}
# The spec's own pair, reported on its own as well.
SPEC = {'keel': ['history:keel', 'stash:keel']}
HERE = os.path.dirname(os.path.abspath(__file__))
ISO = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?$')


def fetch(block, cache):
    path = os.path.join(cache, block.replace(':', '_') + '.json') if cache else None
    if path and os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    url = BEACH + '?block=' + urllib.parse.quote(block, safe=':')
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                data = json.load(r)
            break
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    if path:
        os.makedirs(cache, exist_ok=True)
        with open(path, 'w') as f:
            json.dump(data, f)
    return data


def machine(ts):
    """A stamp a clock wrote: millisecond precision, or seconds that are not :00."""
    if not isinstance(ts, str) or not ISO.match(ts):
        return False
    if re.search(r'\.\d+', ts):
        return True
    return len(ts) >= 19 and ts[16] == ':' and ts[17:19] != '00'


def seconds(ts):
    return datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp()


def entries(node, path=()):
    """Yield (path, node) for every node whose position 3 is an ISO stamp."""
    if not isinstance(node, dict):
        return
    if isinstance(node.get('3'), str) and ISO.match(node['3']):
        yield path, node
    for k, v in node.items():
        if k == '_' and isinstance(v, dict):
            yield from entries(v, path + ('_',))
        elif re.fullmatch(r'[1-9]', k):
            yield from entries(v, path + (k,))


def events(handle, blocks, cache, with_pools=True):
    """Every machine-stamped write by this handle as (time, block), and how many hand stamps were left out."""
    out, dropped = [], 0
    for block in blocks:
        for _, node in entries(fetch(block, cache)):
            stamps = [('3', node['3'])]
            if block.startswith('torus-mirror:') and isinstance(node.get('6'), str):
                stamps.append(('6', node['6']))  # first arrival of a revised line
            for pos, ts in stamps:
                if machine(ts):
                    out.append((seconds(ts), block, pos))
                else:
                    dropped += 1
    for pool in POOLS if with_pools else []:
        for _, node in entries(fetch(pool, cache)):
            if node.get('1') == handle:
                if machine(node['3']):
                    out.append((seconds(node['3']), pool, '3'))
                else:
                    dropped += 1
    # One write can surface twice (a line's 3 and 6 when it was never revised).
    uniq = sorted({(t, b) for t, b, _ in out})
    return uniq, dropped


LANE = re.compile(r'^\s*([a-z][a-z0-9-]*\.\d+)\b')


def lane_of(text):
    m = LANE.match(text) if isinstance(text, str) else None
    return m.group(1) if m else None


def turns(cache):
    """Weft's responses since the 6 October cut, split at the machine's hand.

    A response opens with a say at now (IN, torus-mirror:weft) and closes with
    an account grafted beneath its lane's entry in watch:weft (OUT). IN to OUT
    is the machine's turn; OUT to the same lane's next IN is the person's.
    """
    ins = {}
    for _, node in entries(fetch('torus-mirror:weft', cache)):
        lane = lane_of(node.get('_'))
        for ts in {node['3'], node.get('6')} - {None}:  # 6 the first say in the beat, 3 the latest
            if lane and machine(ts):
                ins.setdefault(lane, []).append(seconds(ts))
    watch = sorted(entries(fetch('watch:weft', cache)), key=lambda e: len(e[0]))
    lanes, outs = {}, {}
    for path, node in watch:  # an account grafted beneath a lane's entry is that lane's
        parent = next((lanes[path[:i]] for i in range(len(path) - 1, 0, -1) if path[:i] in lanes), None)
        lanes[path] = parent or lane_of(node.get('_'))
        if lanes[path] and machine(node['3']):
            outs.setdefault(lanes[path], []).append(seconds(node['3']))
    machine_turn, person_turn = [], []
    for lane, opened in ins.items():
        opened, closed = sorted(opened), sorted(outs.get(lane, []))
        for i, t in enumerate(opened):
            nxt = opened[i + 1] if i + 1 < len(opened) else math.inf
            done = [o for o in closed if t < o < nxt]
            if done:
                machine_turn.append(done[-1] - t)
                if nxt < math.inf:
                    person_turn.append(nxt - done[-1])
    return {'lanes': len(ins), 'machine_turn': describe(np.array(machine_turn)),
            'person_turn': describe(np.array(person_turn)),
            '_machine': machine_turn, '_person': person_turn}


def fit(log_gaps, kmax=6, seed=0, k=None):
    """Log-normal rungs: the mixture BIC prefers, or exactly k of them."""
    x = np.asarray(log_gaps).reshape(-1, 1)
    best = None
    for k in ([k] if k else range(1, kmax + 1)):
        g = GaussianMixture(k, n_init=10, random_state=seed).fit(x)
        bic = g.bic(x)
        if best is None or bic < best[0]:
            best = (bic, k, g)
    _, k, g = best
    order = np.argsort(g.means_.ravel())
    comps = [{'median_s': float(10 ** g.means_.ravel()[i]),
              'sigma_decades': float(math.sqrt(g.covariances_.ravel()[i])),
              'weight': float(g.weights_[i])} for i in order]
    # Where adjacent components cross: the bout criterion between two rungs.
    grid = np.linspace(min(log_gaps) - 1, max(log_gaps) + 1, 20001).reshape(-1, 1)
    resp = g.predict_proba(grid)[:, order]
    lab = resp.argmax(1)
    cuts = [float(10 ** grid[i + 1, 0]) for i in range(len(lab) - 1) if lab[i + 1] > lab[i]]
    return comps, cuts, g, order


def describe(gaps):
    q = np.percentile(gaps, [10, 25, 50, 75, 90])
    return {'n': int(len(gaps)), 'p10_s': q[0], 'p25_s': q[1], 'median_s': q[2],
            'p75_s': q[3], 'p90_s': q[4]}


def human(s):
    if s < 1:
        return f'{s * 1000:.0f} ms'
    if s < 90:
        return f'{s:.0f} s'
    if s < 5400:
        return f'{s / 60:.0f} min'
    if s < 172800:
        return f'{s / 3600:.1f} h'
    return f'{s / 86400:.1f} d'


def split(gaps, cuts):
    """Empirical medians either side of the mixture's boundaries; the last boundary closes a session."""
    edges = [0] + list(cuts) + [math.inf]
    return {'by_rung': [describe(gaps[(gaps >= a) & (gaps < b)]) for a, b in zip(edges, edges[1:])],
            'within_session': describe(gaps[gaps < cuts[-1]]),
            'between_sessions': describe(gaps[gaps >= cuts[-1]])}


def analyse(name, times):
    gaps = np.diff(np.array([t for t, _ in times]))
    gaps = np.maximum(gaps, 0.1)  # two writes inside one clock tick
    log_gaps = np.log10(gaps)
    comps, cuts, model, order = fit(log_gaps)
    session_cut = next((c for c in cuts if c >= 1800), None)
    when = lambda t: datetime.fromtimestamp(t, timezone.utc).isoformat(timespec='seconds')
    res = {'agent': name, 'writes': len(times), 'gaps': describe(gaps),
           'span': [when(times[0][0]), when(times[-1][0])],
           'rungs': comps, 'cuts_s': cuts}
    if cuts:
        res['by_rung'] = split(gaps, cuts)['by_rung']  # each rung's own median, read off the gaps it holds
    if session_cut:
        within, between = gaps[gaps < session_cut], gaps[gaps >= session_cut]
        res['session_cut_s'] = session_cut
        res['within_session'] = describe(within)
        res['between_sessions'] = describe(between)
    if len(comps) != 3:  # the call / turn / session reading, for comparison
        comps3, cuts3, model3, order3 = fit(log_gaps, k=3)
        res['three_rungs'] = {'rungs': comps3, 'cuts_s': cuts3, **split(gaps, cuts3)}
        res['_model3'] = (model3, order3)
    res['_log_gaps'] = log_gaps.tolist()
    res['_model'] = (model, order)
    return res


TICKS = [(0.01, '10 ms'), (0.1, '100 ms'), (1, '1 s'), (10, '10 s'), (60, '1 min'), (600, '10 min'),
         (3600, '1 h'), (6 * 3600, '6 h'), (86400, '1 d'), (7 * 86400, '1 wk')]
# The human ladder as the moving-moment document gives it (Timings of the Moving Moment, 19 October 2026).
HUMAN = [(0.03, 'order threshold'), (0.074, 'fear'), (0.15, 'kind'), (0.2, 'turn gap'), (0.3, 'access'),
         (0.6, 'word'), (3, 'present')]


def plot(results, split, path):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    ink, hist, ref = '#24506b', '#9bb7c9', '#c0603a'
    keel, weft = results[0], results[2]
    fig, axes = plt.subplots(4, 1, figsize=(9.5, 11), sharex=True,
                             gridspec_kw={'height_ratios': [1.1, 2, 2, 2]})
    lo, hi = -2.1, 6
    bins = np.linspace(-1, 6, 57)

    ax = axes[0]
    ax.set_ylim(0, 3.4)
    rows = [(2.7, 'human\n(the document)', ref, HUMAN)]
    k3 = keel['three_rungs']['by_rung'] if 'three_rungs' in keel else keel['by_rung']
    w3 = weft['by_rung']
    rows.append((1.6, 'keel\n(measured)', ink, [(0.03, 'token (nominal)'), (k3[0]['median_s'], 'call'),
                                                (k3[1]['median_s'], 'turn'), (k3[-1]['median_s'], 'session')]))
    rows.append((0.5, 'weft\n(measured)', ink, [(w3[0]['median_s'], 'call'),
                                               (split['machine_turn']['median_s'], "machine's turn"),
                                               (split['person_turn']['median_s'], "person's turn"),
                                               (w3[-1]['median_s'], 'session')]))
    ax.set_yticks([y for y, _, _, _ in rows])
    ax.set_yticklabels([label for _, label, _, _ in rows], fontsize=8)
    for y, _, colour, rungs in rows:
        for i, (s_, label) in enumerate(rungs):
            ax.plot(math.log10(s_), y, 'o', color=colour, ms=4)
            text = label if colour == ref else f'{label} {human(s_)}'
            ax.text(math.log10(s_), y + 0.22 + 0.25 * (i % 2), text, fontsize=7, color=colour, ha='center')
    ax.set_title('Two ladders on one clock: rungs half a decade apart, against rungs one to three decades apart',
                 fontsize=9)

    def mixture(ax, r, title):
        lg = np.array(r['_log_gaps'])
        ax.hist(lg, bins=bins, color=hist, edgecolor='white')
        three = '_model3' in r  # show the call / turn / session reading
        model, order = r['_model3'] if three else r['_model']
        xs = np.linspace(lo, hi, 600).reshape(-1, 1)
        ax.plot(xs, np.exp(model.score_samples(xs)) * len(lg) * (bins[1] - bins[0]), color=ink, lw=1.2)
        top = ax.get_ylim()[1]
        for c in (r['three_rungs']['by_rung'] if three else r['by_rung']):
            ax.axvline(math.log10(c['median_s']), color=ink, lw=0.8, ls=':')
            ax.text(math.log10(c['median_s']), top * 0.93, ' ' + human(c['median_s']), fontsize=8, color=ink)
        ax.set_ylabel(f"{title}\n{r['gaps']['n']} gaps", fontsize=8)

    mixture(axes[1], keel, 'keel: history + stash')
    for i, s_ in enumerate([14, 57 * 60]):  # the two intervals keel noted on 19 October
        axes[1].axvline(math.log10(s_), color=ref, lw=0.9, label="keel's 14 s and 57 min" if i == 0 else None)
    axes[1].legend(fontsize=7, frameon=False, loc='upper left')
    mixture(axes[2], weft, 'weft: own writes')

    ax = axes[3]
    ax.hist(np.log10(split['_machine']), bins=bins, color=ink, alpha=0.75, label="machine's turn: say at now to account")
    ax.hist(np.log10(split['_person']), bins=bins, color=ref, alpha=0.6, label="person's turn: account to the lane's next say")
    ax.legend(fontsize=7, frameon=False, loc='upper left')
    ax.set_ylabel(f"weft's responses\n{split['machine_turn']['n']} turns", fontsize=8)

    ax.set_xlim(lo, hi)
    ax.set_xticks([math.log10(t) for t, _ in TICKS])
    ax.set_xticklabels([l for _, l in TICKS], fontsize=8)
    ax.set_xlabel('time (log scale)')
    fig.suptitle("The machine's ladder: the gaps between an agent's consecutive writes on the beach", fontsize=11)
    fig.tight_layout()
    fig.savefig(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default=None)
    args = ap.parse_args()
    runs = [('keel (history + stash)', 'keel', SPEC['keel'], False),
            ('keel (all own writes)', 'keel', AGENTS['keel'], True),
            ('weft (all own writes)', 'weft', AGENTS['weft'], True)]
    results, out = [], []
    for name, handle, blocks, with_pools in runs:
        times, dropped = events(handle, blocks, args.cache, with_pools)
        r = analyse(name, times)
        results.append(r)
        out.append({k: v for k, v in r.items() if not k.startswith('_')} | {'hand_stamps_left_out': dropped})
    split = turns(args.cache)
    out.append({'agent': "weft, a response split at the machine's hand",
                **{k: v for k, v in split.items() if not k.startswith('_')}})
    with open(os.path.join(HERE, 'ladder-results.json'), 'w') as f:
        json.dump(out, f, indent=1, default=float)
    plot(results, split, os.path.join(HERE, 'ladder.svg'))
    json.dump(out, sys.stdout, indent=1, default=float)


if __name__ == '__main__':
    main()
