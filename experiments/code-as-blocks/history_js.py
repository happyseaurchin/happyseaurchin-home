"""For every page edit that moved the script block: was it code, or only words living inside the code's strings?"""
import json, subprocess, sys, collections
sys.setrecursionlimit(20000)
from history import git, split, strings
rows = json.load(open("history.json"))
log = git("log", "origin/main", "--no-merges", "--format=@%H %P", "--name-status", "--", "*.html")
parent, renames = {}, {}
for line in log.splitlines():
    if line.startswith("@"):
        parts = line[1:].split(); cur = parts[0]; parent[cur[:7]] = (parts[0], parts[1] if len(parts) > 1 else None)
    elif line and line[0] == "R":
        f = line.split("\t"); renames[(cur[:7], f[-1])] = f[-2]
def js_of(html):
    b = split(html, clean=True); b["script"].pop("_", None); return strings(b["script"], [])
pairs, index = [], []
for r in rows:
    if "js" not in r["moved"]: continue
    full, p = parent[r["commit"]]
    a = js_of(git("show", f"{p}:{renames.get((r['commit'], r['file']), r['file'])}"))
    b = js_of(git("show", f"{full}:{r['file']}"))
    if len(a) != len(b):
        r["js_kind"] = "code"; continue           # a script added or removed is code
    diff = [(x, y) for x, y in zip(a, b) if x != y]
    r["_pairs"] = list(range(len(pairs), len(pairs) + len(diff)))
    pairs += diff
import tempfile, os
tmp = tempfile.mkdtemp()
json.dump(pairs, open(os.path.join(tmp, "pairs.json"), "w"))
subprocess.run(["node", os.path.join(os.path.dirname(os.path.abspath(__file__)), "strdiff.js"), os.path.join(tmp, "pairs.json"), os.path.join(tmp, "res.json")], check=True)
res = json.load(open(os.path.join(tmp, "res.json")))
for r in rows:
    if "_pairs" in r:
        kinds = {res[i]["kind"] for i in r.pop("_pairs")}
        r["js_kind"] = "code" if "code" in kinds else "unparsed" if "unparsed" in kinds else "strings" if "strings" in kinds else "comments-or-spacing"
json.dump(rows, open("history.json", "w"), indent=0)
n = len(rows)
def cat(r):
    m = set(r["moved"]); jk = r.get("js_kind")
    if "css" in m or ("form" in m and jk == "code") or ("js" in m and jk in ("code", "unparsed")):
        return "code (CSS, JS logic, or markup with them)"
    if m == {"words"}:
        return "words only"
    if "js" in m and jk == "strings":
        return "words, living inside the JS's strings" + (" (and markup)" if "form" in m else "")
    if m <= {"words", "form"} or jk == "comments-or-spacing":
        return "words and markup, no CSS or JS"
    return "other"
c = collections.Counter(cat(r) for r in rows)
print(f"{n} page edits:")
for k, v in c.most_common():
    print(f"  {v:5d}  {v/n:5.1%}  {k}")
