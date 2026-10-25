#!/usr/bin/env python3
"""
html_blocks.py — an HTML page taken apart into pscale blocks that share one
address space, and put back together.

  form     the element tree. Each node's line is its tag; attributes sit in
           the node's hidden directory (digits inside the underscore), the
           way the starstone keeps what belongs to a node without being one
           of its parts. A comment is a line opening '!--'. A line that is a
           bare '…' is no element: it is a supernest — the parts of an
           element with more than nine, nine to a group, the group's
           underscore a summary slot.
  content  the words, at the same addresses. An element whose only child is
           text is a string leaf; otherwise its text runs stand at the
           digits where they fall among the elements.
  style    the CSS, at the address of its <style> element.
  script   the JS, at the address of its <script> element.

None of the four points at another. They agree on the address, and the
assembler reads across them at each one — the bond is the agreement.

  python3 html_blocks.py split page.html out/   → out/{form,content,style,script}.json
  python3 html_blocks.py join out/ > page2.html
  python3 html_blocks.py check page.html        → round trip, both modes
"""
import html5lib, json, os, re, sys

D = "123456789"
GROUP = "…"          # '…'
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr", "keygen", "frame", "basefont", "bgsound"}
RAW = {"script", "style"}                      # text is code: its own block
RCDATA = {"title", "textarea"}                 # text escaped, never markup
KEEP_WS = {"pre", "textarea", "listing", "plaintext", "xmp", "script", "style"}
# where whitespace between elements never renders (default CSS)
BLOCKISH = set("""html head body title meta link base script style noscript template
address article aside blockquote details dialog dd div dl dt fieldset figcaption figure
footer form h1 h2 h3 h4 h5 h6 header hgroup hr li main nav ol p pre section table ul
tbody thead tfoot tr td th caption colgroup col summary menu legend option optgroup
select datalist""".split())


# ── normalising whitespace (the 'clean' reading: what HTML renders anyway) ──

def _is_ws(t):
    return t.strip(" \t\n\r\f") == ""


def _blockish(n):
    return n is None or n.nodeType == n.COMMENT_NODE or (
        n.nodeType == n.ELEMENT_NODE and n.tagName in BLOCKISH)


def normalise(node, keep=False):
    """Collapse whitespace the way default CSS does, in place. Text inside
    pre/textarea/script/style is left exactly as written."""
    node.normalize()
    if node.nodeType == node.ELEMENT_NODE and node.tagName in KEEP_WS:
        keep = True
    for c in list(node.childNodes):
        if c.nodeType == c.ELEMENT_NODE:
            normalise(c, keep)
    if keep:
        return
    kids = list(node.childNodes)
    parent_blockish = node.nodeType != node.ELEMENT_NODE or node.tagName in BLOCKISH
    for i, c in enumerate(kids):
        if c.nodeType != c.TEXT_NODE:
            continue
        prev = kids[i - 1] if i else None
        nxt = kids[i + 1] if i + 1 < len(kids) else None
        t = re.sub(r"[ \t\n\r\f]+", " ", c.data)
        at_start = prev is None and parent_blockish or prev is not None and _blockish(prev)
        at_end = nxt is None and parent_blockish or nxt is not None and _blockish(nxt)
        if at_start:
            t = t.lstrip(" ")
        if at_end:
            t = t.rstrip(" ")
        if t == "":
            node.removeChild(c)
        else:
            c.data = t


def parse(html, clean):
    doc = html5lib.parse(html, treebuilder="dom", namespaceHTMLElements=False)
    if clean:
        normalise(doc)
    else:
        doc.normalize()
    return doc


# ── supernesting: more than nine parts fold nine to a group ──

def nest(items):
    """Lay a list onto digits 1-9, folding into groups of nine (and groups of
    groups) when it runs past nine — the accumulator's own growth."""
    if len(items) <= 9:
        return items
    size = 9
    while (len(items) + size - 1) // size > 9:
        size *= 9
    return [("group", nest(items[i:i + size])) for i in range(0, len(items), size)]


# ── taking a page apart ──

WORD_ATTRS = {"alt", "title", "aria-label", "aria-description", "placeholder"}
META_WORDS = {"description", "twitter:title", "twitter:description", "og:title", "og:description"}


def attr_kind(el, name):
    """Which block an attribute's value belongs to: words a person reads go to
    the content, inline CSS to the style, inline handlers to the script; the
    rest (href, src, class, id …) is form."""
    if name == "style":
        return "style"
    if name.startswith("on"):
        return "script"
    if name in WORD_ATTRS:
        return "word"
    if el.tagName == "meta" and name == "content" and \
            (el.getAttribute("name") in META_WORDS or el.getAttribute("property") in META_WORDS):
        return "word"
    return "form"


def _head(el, route=True):
    """The node's line, its hidden directory, and the three mirrors of that
    hidden directory (words, style, script) for the values routed away."""
    attrs = [{"n": a.name, "v": a.value, "k": attr_kind(el, a.name) if route else "form"}
             for a in el.attributes.values()]
    if not attrs:
        return el.tagName, {}, {}, {}
    f, w, st, sc = _lay_attrs(nest(attrs))
    return {"_": el.tagName, **f}, w, st, sc


def _lay_attrs(laid):
    form, words, style, script = {}, {}, {}, {}
    for d, a in zip(D, laid):
        if isinstance(a, tuple):                      # a supernest of attributes
            f, w, st, sc = _lay_attrs(a[1])
            form[d] = {"_": GROUP, **f}
            for mirror, part in ((words, w), (style, st), (script, sc)):
                if part:
                    mirror[d] = part
        elif a["k"] == "form" or a["v"] == "":
            form[d] = a["n"] if a["v"] == "" else '%s="%s"' % (a["n"], a["v"])
        else:
            form[d] = a["n"] + "="                    # its value stands in another block, same hidden address
            {"word": words, "style": style, "script": script}[a["k"]][d] = a["v"]
    return form, words, style, script


def bare(head):
    """A node with nothing beneath: its line alone, or its line with the
    hidden directory kept inside the underscore."""
    return head if isinstance(head, str) else {"_": head}


def split_node(node, ws_keep=False):
    """One DOM node → (form, content, style, script), each None where empty."""
    t = node.nodeType
    if t == node.COMMENT_NODE:
        return "!--" + node.data, None, None, None
    if t == node.DOCUMENT_TYPE_NODE:
        return "!DOCTYPE " + (node.name or "html"), None, None, None
    tag = node.tagName if t == node.ELEMENT_NODE else None
    head, w, st, sc = _head(node, route=tag not in RAW) if tag else (None, {}, {}, {})
    kids = list(node.childNodes)

    if tag in RAW:                                   # code, kept apart
        code = "".join(k.data for k in kids if k.nodeType == k.TEXT_NODE) or None
        return bare(head), None, (code if tag == "style" else None), (code if tag == "script" else None)

    if tag and len(kids) == 1 and kids[0].nodeType == kids[0].TEXT_NODE:
        text = kids[0].data                          # the common case: a string leaf
        content = text if not w else {"_": {"_": text, **w}}
        return bare(head), content, ({"_": st} if st else None), ({"_": sc} if sc else None)

    form, content, style, script = _split_list(head, [("node", k) for k in kids])
    if w:
        content = {"_": w, **(content or {})}       # headless: the hidden words, no text of its own
    if st:
        style = {"_": st, **(style or {})}
    if sc:
        script = {"_": sc, **(script or {})}
    return form, content, style, script


def _split_list(head, items):
    laid = nest(items)
    form = {"_": head} if head is not None else {}
    content, style, script = {}, {}, {}
    for d, it in zip(D, laid):
        if it[0] == "group":
            f, c, s, j = _split_list(GROUP, it[1])
        else:
            k = it[1]
            if k.nodeType == k.TEXT_NODE:
                f, c, s, j = None, k.data, None, None
            else:
                f, c, s, j = split_node(k)
        if f is not None:
            form[d] = f
        if c is not None:
            content[d] = c
        if s is not None:
            style[d] = s
        if j is not None:
            script[d] = j
    if list(form) == ["_"]:
        form = bare(form["_"])                       # nothing beneath: its line alone
    return form, content or None, style or None, script or None


def split(html, clean=True, label=""):
    doc = parse(html, clean)
    form, content, style, script = split_node(doc)
    form["_"] = form.get("_") or "document"
    title = doc.getElementsByTagName("title")
    t = "".join(c.data for c in title[0].childNodes) if title else ""
    blocks = {
        "form": form,
        "content": content or {},
        "style": style or {},
        "script": script or {},
    }
    # the root underscore of each block is free (the document node carries no
    # text of its own), so each gets its one line
    root = {
        "form": "the page as structure — " + (label or t),
        "content": t or label,
        "style": "the page's CSS, at the address of each <style> — " + (label or t),
        "script": "the page's JS, at the address of each <script> — " + (label or t),
    }
    for k, v in root.items():
        b = blocks[k]
        if k == "form":
            # the doctype is the document's first part; its own line stands there
            pass
        b_ = {"_": v}
        b_.update({d: b[d] for d in D if d in b})
        blocks[k] = b_
    return blocks


# ── putting it back together ──

def _esc_text(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _attr(a):
    """'name="raw value"' as stored → escaped for the page."""
    if "=" not in a:
        return a
    name, v = a.split("=", 1)
    v = v[1:-1]
    return '%s="%s"' % (name, v.replace("&", "&amp;").replace('"', "&quot;"))


def _esc_rc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;")


def _line(node):
    """The node's own line and its hidden directory, as (hidden address, attribute) pairs."""
    if isinstance(node, str):
        return node, []
    h = node.get("_", "")
    if isinstance(h, dict):
        return h.get("_", ""), _flat(h, ())
    return h, []


def _flat(h, path):
    out = []
    for d in D:
        if d in h:
            x = h[d]
            if isinstance(x, dict):                   # a group of attributes
                out += _flat(x, path + (d,))
            else:
                out.append((path + (d,), x))
    return out


def _hidden(node):
    """A node's hidden directory in a mirror block: the dict inside its '_'."""
    if isinstance(node, dict) and isinstance(node.get("_"), dict):
        return node["_"]
    return {}


def _at(h, path):
    for d in path:
        h = h.get(d) if isinstance(h, dict) else None
    return h


def _attrs(attrs, content, style, script):
    out = []
    for path, a in attrs:
        if a.endswith("=") and a.count("=") == 1:     # routed: its value stands in its own block
            name = a[:-1]
            src = style if name == "style" else script if name.startswith("on") else content
            v = _at(_hidden(src), path)
            out.append('%s="%s"' % (name, (v or "").replace("&", "&amp;").replace('"', "&quot;")))
        else:
            out.append(_attr(a))
    return out


def _sub(node, d):
    return node.get(d) if isinstance(node, dict) else None


def join_node(form, content, style, script, raw=False):
    line, attrs = _line(form)
    if line.startswith("!--"):
        return "<!--" + line[3:] + "-->"
    if line.startswith("!DOCTYPE"):
        return "<" + line + ">"
    inner = _join_children(form, content, style, script)
    if line == GROUP:
        return inner
    tag = line.split()[0]
    open_ = "<" + tag + "".join(" " + a for a in _attrs(attrs, content, style, script)) + ">"
    if tag in VOID:
        return open_
    if tag in RAW:
        code = style if tag == "style" else script
        return open_ + (code if isinstance(code, str) else "") + "</" + tag + ">"
    leaf = content if isinstance(content, str) else (
        _hidden(content).get("_") if not any(d in form for d in D if isinstance(form, dict)) else None)
    if isinstance(leaf, str):                        # the string leaf (its words in the hidden directory when it has word attributes)
        inner = _esc_rc(leaf) if tag in RCDATA else _esc_text(leaf)
    if tag in ("pre", "textarea", "listing") and inner.startswith("\n"):
        inner = "\n" + inner                        # a parser drops one newline straight after the tag
    return open_ + inner + "</" + tag + ">"


def _join_children(form, content, style, script):
    out = []
    for d in D:
        f, c = _sub(form, d), _sub(content, d)
        if f is not None:
            out.append(join_node(f, c, _sub(style, d), _sub(script, d)))
        elif isinstance(c, str):
            out.append(_esc_text(c))
    return "".join(out)


def join(blocks):
    f, c, s, j = blocks["form"], blocks["content"], blocks["style"], blocks["script"]
    return _join_children(f, c, s, j)


# ── checking: is the page that comes back the page that went in? ──

def canon(node):
    t = node.nodeType
    if t == node.TEXT_NODE:
        return ("T", node.data)
    if t == node.COMMENT_NODE:
        return ("C", node.data)
    if t == node.DOCUMENT_TYPE_NODE:
        return ("D", node.name)
    kids = tuple(canon(k) for k in node.childNodes)
    if t == node.ELEMENT_NODE:
        attrs = tuple(sorted((a.name, a.value) for a in node.attributes.values()))
        return ("E", node.namespaceURI, node.tagName, attrs, kids)
    return ("N", kids)


def first_diff(a, b, path="root"):
    if a == b:
        return None
    if a[0] != b[0] or a[0] in "TCD":
        return path, repr(a)[:160], repr(b)[:160]
    if a[0] == "E" and a[:4] != b[:4]:
        return path, repr(a[:4])[:160], repr(b[:4])[:160]
    ka, kb = a[-1], b[-1]
    for i, (x, y) in enumerate(zip(ka, kb)):
        r = first_diff(x, y, path + "/" + str(i + 1))
        if r:
            return r
    return path, "children %d" % len(ka), "children %d" % len(kb)


def check(html, clean):
    blocks = split(html, clean)
    back = join(blocks)
    a = canon(parse(html, clean))
    b = canon(parse(back, clean))
    return a == b, (None if a == b else first_diff(a, b)), blocks, back


# ── measuring what a page is made of ──

def walk_strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from walk_strings(v)


def depth(node, d=0):
    if not isinstance(node, dict):
        return d
    kids = [node[k] for k in D if k in node]
    return max([depth(k, d + 1) for k in kids] or [d])


def count_lines(node, pred):
    n = 0
    if isinstance(node, str):
        return 1 if pred(node) else 0
    if isinstance(node, dict):
        line, _ = _line(node)
        n += 1 if pred(line) else 0
        for k in D:
            if k in node:
                n += count_lines(node[k], pred)
    return n


def stats(blocks, html):
    words = sum(len(s) for s in walk_strings({k: v for k, v in blocks["content"].items() if k != "_"}))
    css = sum(len(s) for s in walk_strings({k: v for k, v in blocks["style"].items() if k != "_"}))
    js = sum(len(s) for s in walk_strings({k: v for k, v in blocks["script"].items() if k != "_"}))
    return {
        "bytes": len(html.encode()),
        "words_chars": words,
        "css_chars": css,
        "js_chars": js,
        "form_json": len(json.dumps(blocks["form"], ensure_ascii=False)),
        "elements": count_lines(blocks["form"], lambda l: l and l[0] not in "!" + GROUP and l != blocks["form"]["_"]),
        "supernests": count_lines(blocks["form"], lambda l: l == GROUP),
        "depth": depth(blocks["form"]),
    }


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "split":
        html = open(sys.argv[2], encoding="utf-8").read()
        out = sys.argv[3]
        os.makedirs(out, exist_ok=True)
        for k, v in split(html, label=os.path.basename(sys.argv[2])).items():
            json.dump(v, open(os.path.join(out, k + ".json"), "w"), ensure_ascii=False, indent=1)
    elif cmd == "join":
        d = sys.argv[2]
        blocks = {k: json.load(open(os.path.join(d, k + ".json"))) for k in ("form", "content", "style", "script")}
        sys.stdout.write(join(blocks))
    elif cmd == "check":
        html = open(sys.argv[2], encoding="utf-8").read()
        for clean in (False, True):
            ok, diff, blocks, _ = check(html, clean)
            print("exact" if not clean else "clean", "OK" if ok else "DIFF", diff or "", stats(blocks, html))
