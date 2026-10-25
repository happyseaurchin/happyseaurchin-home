"""outline — the other molecule: content as the spine, the form a small block keyed by depth.
A document page's words are read into a block shaped by their own meaning (a heading opens
a node at its level; paragraphs and list items are its leaves; wrappers that only lay out
vanish). A dialect is a form block that says, rung by rung down its digit 1, what a node's
line is at each depth, and at 9 what a leaf is. One content, any dialect."""
import json, re, html5lib, sys
from html_blocks import parse, nest, GROUP, D, _esc_text

LEAF = {"p", "li", "blockquote", "pre", "figcaption", "dt", "dd", "td", "th", "summary"}
SKIP = {"script", "style", "nav", "footer", "head", "button", "svg", "template", "noscript"}

def text_of(n):
    if n.nodeType == n.TEXT_NODE:
        return n.data
    if n.nodeType != n.ELEMENT_NODE or n.tagName in SKIP:
        return ""
    t = "".join(text_of(c) for c in n.childNodes)
    if n.tagName == "a" and n.getAttribute("href") and t.strip():
        return "[" + t.strip() + "](" + n.getAttribute("href") + ")"     # a reference stays a reference
    if n.tagName == "br":
        return " "
    return t

def read_outline(html):
    doc = parse(html, clean=True)
    title = doc.getElementsByTagName("title")
    root = {"_": (title[0].firstChild.data if title and title[0].firstChild else ""), "parts": [], "level": 0}
    stack = [root]
    def visit(n):
        if n.nodeType != n.ELEMENT_NODE or n.tagName in SKIP:
            return
        t = n.tagName
        if re.fullmatch(r"h[1-6]", t):
            lvl = int(t[1])
            while len(stack) > 1 and stack[-1]["level"] >= lvl:
                stack.pop()
            node = {"_": re.sub(r"\s+", " ", text_of(n)).strip(), "parts": [], "level": lvl}
            stack[-1]["parts"].append(node); stack.append(node)
            return
        if t in LEAF:
            s = re.sub(r"\s+", " ", text_of(n)).strip()
            if s:
                stack[-1]["parts"].append(s)
            return
        for c in n.childNodes:
            visit(c)
    body = doc.getElementsByTagName("body")[0]
    for c in body.childNodes:
        visit(c)
    # a page whose only top part is its own h1 lifts it into the root line
    if len(root["parts"]) == 1 and isinstance(root["parts"][0], dict) and root["parts"][0]["level"] == 1:
        h1 = root["parts"][0]; root = {"_": h1["_"], "parts": h1["parts"], "level": 0}
    return to_block(root)

def to_block(node):
    out = {"_": node["_"]}
    for d, p in zip(D, nest(node["parts"])):
        if isinstance(p, tuple):
            out[d] = to_block({"_": "", "parts": p[1]}) | {"_": ""}   # a summary slot, unpaid
        elif isinstance(p, dict):
            out[d] = to_block(p)
        else:
            out[d] = p
    return out

def md(s):
    s = _esc_text(s)
    return re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: '<a href="%s">%s</a>' % (m.group(2).replace('"', "&quot;"), m.group(1)), s)

def rung(form, depth):
    """the form's rung for a node at this depth: walk down digit 1, the deepest standing rung if it ends sooner"""
    r = form
    for _ in range(depth):
        if isinstance(r, dict) and "1" in r:
            r = r["1"]
    return r if isinstance(r, str) else r["_"]

def render(content, form, depth=0):
    wrap, _, line_el = rung(form, depth).partition(" ")
    tag, _, cls = wrap.partition(".")
    out = ['<%s%s>' % (tag, ' class="%s"' % cls if cls else "")]
    if content.get("_"):
        out.append("<%s>%s</%s>" % (line_el, md(content["_"]), line_el))
    leaf = form["9"]
    for d in D:
        if d not in content:
            continue
        p = content[d]
        if isinstance(p, dict) and p.get("_") == "":            # a group: its parts stand in its place
            out.append(render_group(p, form, depth, leaf))
        elif isinstance(p, dict):
            out.append(render(p, form, depth + 1))
        else:
            out.append("<%s>%s</%s>" % (leaf, md(p), leaf))
    out.append("</%s>" % tag)
    return "".join(out)

def render_group(g, form, depth, leaf):
    parts = []
    for d in D:
        if d in g:
            p = g[d]
            if isinstance(p, dict) and p.get("_") == "":
                parts.append(render_group(p, form, depth, leaf))
            elif isinstance(p, dict):
                parts.append(render(p, form, depth + 1))
            else:
                parts.append("<%s>%s</%s>" % (leaf, md(p), leaf))
    return "".join(parts)
