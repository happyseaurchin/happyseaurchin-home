import glob, json, sys, time
sys.setrecursionlimit(20000)
from html_blocks import check, stats
import os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..") + os.sep
files = sorted(glob.glob(root + "*.html") + glob.glob(root + "animations/*.html") + glob.glob(root + "read/*.html"))
rows, fails = [], []
t0 = time.time()
for f in files:
    html = open(f, encoding="utf-8", errors="replace").read()
    r = {"file": f[len(root):]}
    for mode, clean in (("exact", False), ("clean", True)):
        try:
            ok, diff, blocks, back = check(html, clean)
            r[mode] = ok
            if not ok: fails.append((r["file"], mode, diff))
            if clean: r.update(stats(blocks, html))
        except Exception as e:
            r[mode] = False; fails.append((r["file"], mode, repr(e)[:200]))
    rows.append(r)
json.dump(rows, open("all_pages.json", "w"), indent=1)
n = len(rows)
ex = sum(1 for r in rows if r.get("exact")); cl = sum(1 for r in rows if r.get("clean"))
print(f"{n} pages in {time.time()-t0:.0f}s — exact round trip {ex}/{n}, clean {cl}/{n}")
tot = {k: sum(r.get(k, 0) for r in rows) for k in ("bytes","words_chars","css_chars","js_chars","form_json","elements","supernests")}
print("totals:", tot)
print(f"share of page bytes — words {tot['words_chars']/tot['bytes']:.1%}, css {tot['css_chars']/tot['bytes']:.1%}, js {tot['js_chars']/tot['bytes']:.1%}")
print("max depth", max(r.get("depth",0) for r in rows), "· median depth", sorted(r.get("depth",0) for r in rows)[n//2])
for f in fails[:12]: print("FAIL", f)
