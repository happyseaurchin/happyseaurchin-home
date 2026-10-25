"""safe_join2 — a creator's page, as blocks, through a closed vocabulary onto someone else's domain.
Only the body is drawn (the host page supplies the frame); only the law's elements are emitted; words come
from the content block; inline style and handlers are refused; links resolve against the creator's own site."""
import re, collections
from urllib.parse import urljoin
from html_blocks import D, GROUP, VOID, _line, _sub, _esc_text, _hidden, _at

ELEMENTS = set("""article section header footer nav main aside div p span h1 h2 h3 h4 h5 h6
ul ol li dl dt dd blockquote figure figcaption img a em strong b i small br hr code pre
table thead tbody tr th td details summary time abbr mark sup sub picture source""".split())
# a drawing, admitted as geometry only: no links, no <use>, no foreignObject, no animation, no style
DRAWING = set("svg g path circle ellipse rect line polyline polygon".split())
GEOMETRY = set("""viewBox xmlns d cx cy r rx ry x y x1 y1 x2 y2 width height points transform fill stroke
stroke-width stroke-linecap stroke-linejoin stroke-miterlimit fill-rule clip-rule opacity fill-opacity
stroke-opacity preserveAspectRatio""".split())
KEEP = {"class", "id", "href", "src", "alt", "title", "lang", "datetime", "width", "height", "colspan", "rowspan", "open", "srcset", "hidden", "role"}
URLS = {"href", "src", "srcset"}
SAFE_URL = re.compile(r"^(https://|mailto:|tel:|#)", re.I)

def safe(form, content, base, tally):
    line, attrs = _line(form)
    if line == GROUP:
        return kids(form, content, base, tally)
    tag = (line.split() or [""])[0]
    drawing = tag in DRAWING
    if line.startswith("!") or (tag not in ELEMENTS and not drawing):
        tally["refused element"][tag or line[:10]] += 1
        return ""                                          # not in the law's vocabulary: nothing of it is drawn
    out = []
    for path, a in attrs:
        name = a.split("=", 1)[0]
        if a.endswith("=") and a.count("=") == 1:          # routed value
            if name.startswith("on") or name == "style":
                tally["refused attribute"][name if name == "style" else "on…"] += 1; continue
            v = _at(_hidden(content), path) or ""
        else:
            v = a.split("=", 1)[1][1:-1] if "=" in a else ""
        if drawing and name in GEOMETRY and not re.search(r"url\(|javascript:", v if not a.endswith("=") else "", re.I):
            out.append('%s="%s"' % (name, v.replace("&", "&amp;").replace('"', "&quot;"))); continue
        if name not in KEEP and not name.startswith("aria-"):
            tally["refused attribute"][name if not name.startswith("data-") else "data-*"] += 1; continue
        if name in URLS:
            v = urljoin(base, v.strip())
            if not SAFE_URL.match(v):
                tally["refused link"][v[:30]] += 1; continue
        out.append('%s="%s"' % (name, v.replace("&", "&amp;").replace('"', "&quot;")) if v != "" or name not in ("alt",) else 'alt=""')
    tally["kept element"][tag] += 1
    open_ = "<" + tag + "".join(" " + x for x in out) + ">"
    if tag in VOID:
        return open_
    text = content if isinstance(content, str) else (_hidden(content).get("_") if not any(d in form for d in D if isinstance(form, dict)) else None)
    inner = _esc_text(text) if isinstance(text, str) else kids(form, content, base, tally)
    return open_ + inner + "</" + tag + ">"

def kids(form, content, base, tally):
    out = []
    for d in D:
        f, c = _sub(form, d), _sub(content, d)
        if f is not None:
            out.append(safe(f, c, base, tally))
        elif isinstance(c, str):
            out.append(_esc_text(c))
    return "".join(out)

def body_of(blocks):
    """walk the form to <body>: the creator's page as a fragment"""
    f, c = blocks["form"], blocks["content"]
    for d in D:
        if d in f and _line(f[d])[0] == "html":
            f, c = f[d], _sub(c, d)
            for e in D:
                if e in f and _line(f[e])[0] == "body":
                    return f[e], _sub(c, e)
    return None, None

def words(node):
    if isinstance(node, str): return len(node.split())
    if isinstance(node, dict): return sum(words(v) for k, v in node.items())
    return 0
