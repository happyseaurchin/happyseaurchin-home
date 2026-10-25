#!/usr/bin/env python3
"""
py_blocks.py — a Python program taken apart into two pscale blocks that share
one address space, and put back together; plus the law that bonds them,
generated from Python's own grammar.

  form     the program's shape: each node's line is its kind (FunctionDef,
           Call, Name …). Its parts stand at the digits the law gives that
           kind: field i of the kind at digit i (no kind has more than
           seven, so 8 and 9 are always free). A sequence (a body, a list of
           arguments) is a node whose digits are its items, nine to a group
           when it runs past nine, a group's line '…'.
  content  the program's vocabulary, at the same addresses: every name and
           every literal. A node whose only word is its first field is a
           string leaf. A def's or class's underscore is a summary slot,
           filled here from the first line of its docstring.
  law      for each kind, which digit is which field and what it holds —
           the language, as a block (function:python).

  python3 py_blocks.py check file.py   → round trip (ast.dump equality)
"""
import ast, json, sys, types, typing

D = "123456789"
GROUP = "…"
NONE = "None"            # a None standing in a sequence (dict unpacking, kw_defaults)


def nest(items):
    if len(items) <= 9:
        return items
    size = 9
    while (len(items) + size - 1) // size > 9:
        size *= 9
    return [("group", nest(items[i:i + size])) for i in range(0, len(items), size)]


def kinds(t):
    """What a field holds, read off the grammar: ('seq', inner) | ('node',) | ('word', type)."""
    origin = typing.get_origin(t)
    if origin is list:
        return ("seq", typing.get_args(t)[0])
    if origin in (typing.Union, types.UnionType):
        args = [a for a in typing.get_args(t) if a is not type(None)]
        return kinds(args[0]) if len(args) == 1 else ("node",)
    if isinstance(t, type) and issubclass(t, ast.AST):
        return ("node",)
    return ("word", t)


def is_node_type(t):
    k = kinds(t)
    return k[0] == "node"


# ── words: names stay as written, literals go in as Python spells them ──

def word_out(v, t):
    if t is str:
        return v
    if t is int:
        return str(v)
    return "..." if v is Ellipsis else repr(v)       # a Constant's value, spelled as in source


def word_in(s, t):
    if t is str:
        return s
    if t is int:
        return int(s)
    return ast.literal_eval(s)


# ── taking a program apart ──

def split_node(n):
    cls = type(n)
    form, content = {"_": cls.__name__}, {}
    for i, field in enumerate(cls._fields, 1):
        d, v, t = str(i), getattr(n, field, None), cls._field_types[field]
        if v is None or v == []:
            continue
        k = kinds(t)
        if k[0] == "seq":
            f, c = split_seq(v, k[1])
        elif k[0] == "node":
            f, c = split_node(v)
        else:
            f, c = None, word_out(v, k[1])
        if f is not None:
            form[d] = f
        if c is not None:
            content[d] = c
    if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Module)):
        doc = ast.get_docstring(n)
        if doc:
            content["_"] = doc.strip().splitlines()[0]   # the summary slot, paid from the docstring
    if list(form) == ["_"]:
        form = form["_"]
    first = cls._fields[:1]
    if list(content) == ["1"] and isinstance(content["1"], str) and first and \
            kinds(cls._field_types[first[0]])[0] == "word":
        content = content["1"]                       # the node's one word, as a string leaf
    return form, (content or None)


def split_seq(items, inner):
    laid = nest(items)
    form, content = {}, {}
    for d, it in zip(D, laid):
        if isinstance(it, tuple) and it and it[0] == "group":
            f, c = split_seq(it[1], inner)
            f = {"_": GROUP, **(f or {})}
        elif it is None:
            f, c = NONE, None
        elif isinstance(it, ast.AST):
            f, c = split_node(it)
        else:
            f, c = None, word_out(it, kinds(inner)[1] if kinds(inner)[0] == "word" else str)
        if f is not None:
            form[d] = f
        if c is not None:
            content[d] = c
    return (form or None), (content or None)


def split(src, label=""):
    form, content = split_node(ast.parse(src))
    form = {"_": "the program as structure — " + label, **{d: form[d] for d in D if isinstance(form, dict) and d in form}}
    c = content if isinstance(content, dict) else {}
    content = {"_": c.get("_", label), **{d: c[d] for d in D if d in c}}
    return {"form": form, "content": content}


# ── putting it back together ──

def _sub(node, d):
    return node.get(d) if isinstance(node, dict) else None


def join_node(form, content):
    line = form if isinstance(form, str) else form["_"]
    cls = getattr(ast, line)
    kw = {}
    for i, field in enumerate(cls._fields, 1):
        d, t = str(i), cls._field_types[field]
        k = kinds(t)
        f, c = _sub(form, d), _sub(content, d)
        if i == 1 and isinstance(content, str) and k[0] == "word":
            c = content
        if k[0] == "seq":
            kw[field] = join_seq(f, c, k[1]) if (f is not None or c is not None) else []
        elif k[0] == "node":
            kw[field] = join_node(f, c) if f is not None else None
        else:
            kw[field] = word_in(c, k[1]) if c is not None else None
    return cls(**kw)


def join_seq(form, content, inner):
    out = []
    for d in D:
        f, c = _sub(form, d), _sub(content, d)
        if f is None and c is None:
            continue
        if isinstance(f, dict) and f.get("_") == GROUP:
            out += join_seq(f, c, inner)
        elif f == NONE:
            out.append(None)
        elif f is not None:
            out.append(join_node(f, c))
        else:
            k = kinds(inner)
            out.append(word_in(c, k[1] if k[0] == "word" else str))
    return out


def join(blocks):
    tree = join_node({**blocks["form"], "_": "Module"}, {**blocks["content"]})
    tree.type_ignores = tree.type_ignores or []
    return ast.unparse(ast.fix_missing_locations(tree))


def check(src, label=""):
    blocks = split(src, label)
    back = join(blocks)
    a = ast.dump(ast.parse(src))
    b = ast.dump(ast.parse(back))
    return a == b, blocks, back


# ── the law: Python's grammar, laid as a block ──

def law():
    groups = {"1": ("mod", ast.mod), "2": ("stmt", ast.stmt), "3": ("expr", ast.expr)}
    rest = []
    block = {"_": "THE PYTHON LAW — how a program's two blocks bond: the form holds each "
                  "node's kind, the content its words, at one address space. Under each kind "
                  "below, digit i names the field that stands at digit i of a node of that kind; "
                  "'*' marks a sequence (its items at 1-9, nine to a group past nine, a group's line "
                  "'…'), '?' a part that may be absent, 'word' a name or literal that stands in the "
                  "content. Digits 8 and 9 are free on every kind. Generated from the grammar "
                  "Python itself carries (ast._field_types), so it cannot drift from the language."}
    seen = set()

    def line_for(cls):
        parts = []
        for i, f in enumerate(cls._fields, 1):
            t = cls._field_types[f]
            k = kinds(t)
            opt = typing.get_origin(t) in (typing.Union, types.UnionType)
            mark = "*" if k[0] == "seq" else ("?" if opt else "")
            what = "word" if k[0] == "word" or (k[0] == "seq" and kinds(k[1])[0] == "word") else ""
            parts.append(f"{i} {f}{mark}" + (f" (word)" if what else ""))
        return cls.__name__ + (" — " + ", ".join(parts) if parts else " — no parts")

    for d, (name, base) in groups.items():
        subs = [c for c in vars(ast).values() if isinstance(c, type) and issubclass(c, base)
                and c is not base and c.__module__ == "ast" and c._fields is not None
                and not c.__name__.startswith("_") and c.__name__ not in ("Num", "Str", "Bytes", "NameConstant", "Ellipsis", "Index", "ExtSlice", "Suite", "AugLoad", "AugStore", "Param")]
        lines = [line_for(c) for c in subs]
        seen.update(subs)
        block[d] = _lay(name + " — the " + {"mod": "whole program", "stmt": "statements", "expr": "expressions"}[name], lines)
    others = [c for c in vars(ast).values() if isinstance(c, type) and issubclass(c, ast.AST)
              and c.__module__ == "ast" and c not in seen and c not in (ast.AST, ast.mod, ast.stmt, ast.expr)
              and not c.__name__.startswith("_") and c.__name__ not in ("Num", "Str", "Bytes", "NameConstant", "Ellipsis", "Index", "ExtSlice", "Suite", "AugLoad", "AugStore", "Param", "slice")
              and not any(c is b for b in (ast.boolop, ast.operator, ast.unaryop, ast.cmpop, ast.expr_context, ast.excepthandler, ast.pattern, ast.type_ignore, ast.type_param))]
    block["4"] = _lay("the other kinds — arguments, keywords, comprehensions, handlers, patterns, operators", [line_for(c) for c in others])
    return block


def _lay(head, lines):
    laid = nest(lines)
    node = {"_": head}
    for d, x in zip(D, laid):
        node[d] = _lay(GROUP, x[1]) if isinstance(x, tuple) else x
    return node


if __name__ == "__main__":
    sys.setrecursionlimit(20000)
    if sys.argv[1] == "check":
        for f in sys.argv[2:]:
            src = open(f, encoding="utf-8").read()
            ok, blocks, back = check(src, f)
            fj = len(json.dumps(blocks["form"], ensure_ascii=False))
            cj = len(json.dumps(blocks["content"], ensure_ascii=False))
            print(f"{'OK  ' if ok else 'DIFF'} {f}  source {len(src)} chars · form {fj} · content {cj}")
    elif sys.argv[1] == "law":
        json.dump(law(), sys.stdout, indent=1, ensure_ascii=False)
