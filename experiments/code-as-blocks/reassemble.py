#!/usr/bin/env python3
"""reassemble.py page.html … — write each page, taken apart into its four blocks and put back, to back/<page> (for pixels.js)."""
import os, sys
sys.setrecursionlimit(20000)
from html_blocks import split, join
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "..")
for name in sys.argv[1:]:
    out = os.path.join(HERE, "back", name)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w").write(join(split(open(os.path.join(SITE, name), encoding="utf-8").read(), clean=True)))
    print("wrote", os.path.relpath(out, HERE))
