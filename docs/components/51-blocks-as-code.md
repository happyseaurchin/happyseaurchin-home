# 51 — Blocks-as-Code (General Principle)

**Category:** M. Primitives and Principles
**Products:** MAGI/Hermitcrab

---

## Description

The insight that spindle paths through JSON blocks ARE programs. The string content at each node IS the instruction sequence. Not code inside blocks — the block structure IS the logic. Frozen if-then statements captured as nested JSON where the walk through the tree executes the sequence. Cook block (recipes as spindles), institutional block (policies as spindles), and kernel-as-block (concerns as spindles) are all specific instances of this principle. The principle applies broadly: any decision tree, any branching logic, any sequential process can be encoded as a block where navigation IS execution.

---

## Standalone Use

A system designer who has a complex operational procedure (cooking a recipe, enacting a policy, routing a concern through the kernel) would represent it as a pscale block. The procedure becomes data, not code. The LLM navigates the block and executes the collected instructions. Benefits: the procedure is visible (no hidden logic), it's modifiable (edit the block, not the code), it's composable (spindles through different branches reuse shared ancestors), and it grows (new procedures add new paths, compression produces abstractions).

---

## How It Works

**The Translation**

Traditional branching code:

```javascript
if (concern === 'user_prompt') {
  compile_context();
  assemble_package();
  call_llm();
  process_response();
} else if (concern === 'heartbeat') {
  check_state();
  assess_work();
  // do not call LLM
}
```

Becomes a block:

```json
{
  "0": {
    "_": "Kernel operational logic",
    "1": {
      "_": "Setup and state assessment phase",
      ...
    },
    "6": {
      "_": "Package formation and routing phase",
      "5": {
        "_": "User prompt variant - deep full routing",
        "3": {...},
        "2": {...}
      },
      "1": {
        "_": "Heartbeat variant - shallow assessment",
        "2": {...}
      }
    }
  }
}
```

The spindle `0.6.5.3` (user prompt path) collects:

```
0._     → "Kernel operational logic"
0.6._   → "Package formation and routing phase"
0.6.5._ → "User prompt variant - deep full routing"
0.6.5.3._ → "specific user prompt step"
```

The collected chain IS the executable sequence.

**Nesting = Conditional Logic**

In code, nesting creates scope and dependency:

```javascript
if (A) {
  if (B) {
    do_C();
  } else {
    do_D();
  }
}
```

In blocks, nesting creates the same structure:

```
Node A exists (its ancestor)
  Node B branches from A
    Option C is child of B
    Option D is child of B (alternative)
```

Walking spindle `A.B.C` executes path A→B→C.
Walking spindle `A.B.D` executes path A→B→D.

The tree structure encodes the conditional branching.

**Three Core Instances**

**Cook block:** Recipes as spindles.

```json
{
  "0": {
    "_": "Cooking procedures",
    "3": {
      "_": "Bake procedure",
      "5": {"_": "Preheat to 375°F"},
      "2": {"_": "Mix ingredients"},
      "7": {"_": "Place in oven"}
    }
  }
}
```

Spindle `0.3.5.2.7` collects the steps in order. The LLM reads these and executes them (literally or metaphorically, by invoking other tools).

**Institutional block:** Policies as spindles.

```json
{
  "0": {
    "_": "Organization policies",
    "2": {
      "_": "Hiring policy",
      "4": {"_": "Check candidate qualifications"},
      "1": {"_": "Assess fit with team"},
      "3": {"_": "Make offer"}
    }
  }
}
```

Spindle `0.2.4.1.3` collects the hiring procedure. An agent navigating this block enacts the policy.

**Kernel-as-block:** Concerns as spindles.

```json
{
  "0": {
    "_": "Kernel logic",
    "6": {
      "_": "Package formation phase",
      "5": {"_": "User prompt - deep routing"},
      "1": {"_": "Heartbeat - shallow assessment"}
    }
  }
}
```

Spindle `0.6.5` collects user prompt instructions. Spindle `0.6.1` collects heartbeat instructions.

**Reusable Ancestry**

The principle creates reusability through shared ancestors, not copy-paste:

Two spindles starting `0.6...` both traverse the "package formation phase" node. They inherit its context. They then diverge based on their specific variant. No duplication of the shared content. No duplicate maintenance.

**Block Growth**

New spindles require new paths. New paths add children to existing nodes. When a node fills (9 children), compression produces a parent summary. The block evolves, accumulating patterns and compressing them. This is blocks-as-code growing through use.

**Why This Matters**

Separates data from interpretation. The block is the data (pure JSON, storable, version-controllable). The interpreter is the navigation and collection mechanism. The LLM IS the interpreter. This makes:

- **Transparency:** The procedure is visible in the block, not hidden in code.
- **Modifiability:** Edit the block to change the procedure; no recompile.
- **Composability:** Shared ancestors mean multiple spindles share logic.
- **Scalability:** Grow the block; don't fork the codebase.

---

*Key files: `cook-block-v1.json`, `kernel-as-block-spec.md`, process-block.json (0.6, 0.7)*
