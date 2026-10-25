"""safe_join — assemble a creator's form + content through a closed vocabulary.
The vocabulary is the law; anything the law does not name is not emitted.
No style or script block is read at all: a creator's look comes from tokens."""
import re
from html_blocks import D, GROUP, VOID, _line, _sub, _esc_text, _attr

ELEMENTS = set("""article section header footer nav main aside div p span h1 h2 h3 h4 h5 h6
ul ol li dl dt dd blockquote figure figcaption img a em strong b i small br hr code pre
table thead tbody tr th td details summary time abbr mark sup sub""".split())
ATTRS = {"class", "id", "href", "src", "alt", "title", "lang", "datetime", "width", "height", "colspan", "rowspan", "open"}
URL_ATTRS = {"href", "src"}
SAFE_URL = re.compile(r"^(https://|/|#|mailto:)", re.I)

def ok_attr(a):
    name = a.split("=", 1)[0].lower()
    if name not in ATTRS:
        return False
    if name in URL_ATTRS:
        v = a.split("=", 1)[1][1:-1].strip() if "=" in a else ""
        return bool(SAFE_URL.match(v))
    return True

def safe_node(form, content, refused):
    line, attrs = _line(form)
    if line == GROUP:
        return safe_children(form, content, refused)
    tag = line.split()[0] if line else ""
    if line.startswith("!") or tag not in ELEMENTS:
        refused.append(tag or line[:12])
        return ""                                    # the law names no such thing: nothing is emitted, nor anything beneath it
    kept = [a for a in attrs if ok_attr(a)]
    refused += ["@" + a.split("=")[0] for a in attrs if a not in kept]
    open_ = "<" + tag + "".join(" " + _attr(a) for a in kept) + ">"
    if tag in VOID:
        return open_
    inner = _esc_text(content) if isinstance(content, str) else safe_children(form, content, refused)
    return open_ + inner + "</" + tag + ">"

def safe_children(form, content, refused):
    out = []
    for d in D:
        f, c = _sub(form, d), _sub(content, d)
        if f is not None:
            out.append(safe_node(f, c, refused))
        elif isinstance(c, str):
            out.append(_esc_text(c))
    return "".join(out)
