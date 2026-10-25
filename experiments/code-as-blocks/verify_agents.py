import json, os, sys
sys.setrecursionlimit(20000)
from html_blocks import parse, canon, first_diff, join, D
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "..")

def compare(orig_html, new_html, label):
    a, b = canon(parse(orig_html, True)), canon(parse(new_html, True))
    if a == b:
        print(f"{label}: SAME PAGE (DOM identical to the original after the law's whitespace reading)")
        return
    # how close? count matching text runs and elements
    def flat(t, out):
        out.append(t[:4] if t[0] == "E" else t)
        for k in (t[-1] if t[0] in "EN" else ()):
            flat(k, out)
        return out
    fa, fb = flat(a, []), flat(b, [])
    import difflib
    sm = difflib.SequenceMatcher(None, fa, fb, autojunk=False)
    print(f"{label}: DIFFERS — {sm.ratio():.1%} of nodes in order match; first difference at {first_diff(a, b)}")
    shown = 0
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op != "equal" and shown < 6:
            print("   ", op, [repr(x)[:90] for x in fa[i1:i2][:2]], "→", [repr(x)[:90] for x in fb[j1:j2][:2]])
            shown += 1

def laws_kept(block, path="root"):
    bad = []
    if isinstance(block, dict):
        keys = set(block) - {"_"}
        if not keys <= set(D):
            bad.append((path, "keys outside 1-9: " + str(sorted(keys - set(D)))[:60]))
        for k in keys & set(D):
            bad += laws_kept(block[k], path + "." + k)
        if isinstance(block.get("_"), dict):
            bad += laws_kept(block["_"], path + "._")
    return bad

if os.path.exists(os.path.join(HERE, "agents/assembled/touch-by-agent.html")):
    compare(open(os.path.join(SITE, "touch.html")).read(), open(os.path.join(HERE, "agents/assembled/touch-by-agent.html")).read(), "assembly by an agent from the law alone (touch.html)")
else:
    print("assembly: no output yet")
p = os.path.join(HERE, "agents/taken-apart") + os.sep
if all(os.path.exists(p + k + ".json") for k in ("form", "content", "style", "script")):
    try:
        blocks = {k: json.load(open(p + k + ".json")) for k in ("form", "content", "style", "script")}
    except Exception as e:
        print("split: invalid JSON —", e); sys.exit()
    for k, b in blocks.items():
        v = laws_kept(b)
        print(f"   {k}: {'every key is _ or 1-9' if not v else 'off-law keys: ' + str(v[:3])}")
    compare(open(os.path.join(SITE, "connect.html")).read(), join(blocks), "disassembly by an agent from the law alone (connect.html), put back by the code")
else:
    print("split: no output yet")
