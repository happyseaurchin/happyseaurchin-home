"""Every edit to a page in the site's history, classified by which of the four blocks it moved."""
import subprocess, json, sys, collections, time
sys.setrecursionlimit(20000)
from html_blocks import split, D
import os
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")

def git(*a):
    return subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True, errors="replace").stdout

def strings(node, out):
    """every string in a block, in address order (hidden directories included)"""
    if isinstance(node, str):
        out.append(node); return out
    if isinstance(node, dict):
        if "_" in node: strings(node["_"], out)
        for d in D:
            if d in node: strings(node[d], out)
    return out

def facets(html):
    b = split(html, clean=True)
    for k in b: b[k].pop("_", None)                 # root titles are free
    return {"words": strings(b["content"], []), "form": json.dumps(b["form"], sort_keys=True),
            "css": strings(b["style"], []), "js": strings(b["script"], [])}

if __name__ == "__main__":
    log = git("log", "origin/main", "--no-merges", "--format=@%H %P", "--name-status", "--", "*.html")
    pairs, cur = [], None
    for line in log.splitlines():
        if line.startswith("@"):
            parts = line[1:].split(); cur = (parts[0], parts[1] if len(parts) > 1 else None)
        elif line and line[0] in "MR" and cur and cur[1]:
            f = line.split("\t")
            pairs.append((cur[0], cur[1], f[-2] if line[0] == "R" else f[1], f[-1]))
    rows, t0 = [], time.time()
    for i, (c, p, old, new) in enumerate(pairs):
        a, b = git("show", f"{p}:{old}"), git("show", f"{c}:{new}")
        if not a or not b:
            continue
        try:
            fa, fb = facets(a), facets(b)
        except Exception as e:
            continue
        moved = [k for k in ("words", "form", "css", "js") if fa[k] != fb[k]]
        rows.append({"commit": c[:7], "file": new, "moved": moved})
    json.dump(rows, open("history.json", "w"), indent=0)
    n = len(rows)
    cat = collections.Counter()
    for r in rows:
        m = set(r["moved"])
        if not m: cat["nothing a reader or browser sees (whitespace, formatting)"] += 1
        elif m == {"words"}: cat["words only"] += 1
        elif m <= {"words", "form"}: cat["words and markup, no CSS or JS"] += 1
        elif m == {"css"}: cat["CSS only"] += 1
        elif m == {"js"}: cat["JS only"] += 1
        else: cat["CSS or JS together with other blocks"] += 1
    print(f"{n} page edits classified in {time.time()-t0:.0f}s, across {len(set(r['commit'] for r in rows))} commits")
    for k, v in cat.most_common():
        print(f"  {v:5d}  {v/n:5.1%}  {k}")
