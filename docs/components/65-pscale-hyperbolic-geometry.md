# Pscale and Hyperbolic Geometry: An Exploration

**Status:** Early exploration, written to lock formal correspondences before extending.
**Scope:** Conceptual mapping. No code changes implied yet.

---

## Origin Question

Does pscale's exponent-based nesting relate to Hilbert space? LLMs operate over high-dimensional vector spaces; pscale uses signed exponents `log_b(λ)` with hierarchical digit-key addressing. Is there a mathematical bridge?

The answer turned out to be: not flat Hilbert space directly, but two structures *built on* Hilbert space that match pscale closely — **wavelet / multiresolution analysis** and **hyperbolic geometry**. The wavelet bridge is the cleanest formal correspondence. The hyperbolic structure is the deeper one and the direction of travel.

---

## Why Not Flat Hilbert Space

Vanilla Hilbert space (where LLM token vectors live) is isotropic. Every direction is equivalent until you pick a basis. Similarity = inner product. Points are `R^n`.

Pscale doesn't sit naturally there. Its coordinates are anisotropic — depth means something different from breadth, and sign carries domain information. Forcing pscale into flat Hilbert space loses the hierarchy. Two pscale addresses that share a long common prefix should be "close" in some structural sense; two addresses with different leading digits should be "far" regardless of what's at deeper digits. Flat inner product can't see that distinction.

So pscale isn't *in* Hilbert space — it's in something with hierarchical structure that Hilbert space alone doesn't provide.

---

## The Wavelet Bridge (Tight Correspondence)

Wavelet / multiresolution analysis is built on Hilbert space but adds exactly the structure pscale has. A wavelet basis for `L²(R)` is indexed by pairs `(j, k)`:

- `j` = scale (depth)
- `k` = position at that scale

Nested subspaces `V₀ ⊂ V₁ ⊂ V₂ ⊂ ...` each have characteristic scale `b^j`.

**The correspondences:**

| Wavelet | Pscale |
|---|---|
| Scale index `j` | pscale value `log_b(λ)` |
| Position index `k` within scale | digit-key path |
| Subspace nesting `V_j ⊂ V_{j+1}` | prefix containment |
| Coefficient at cell `(j, k)` | underscore content `_` |

These are exact. The pscale value *is* the wavelet scale index. Both are `log_b(λ)`. The hierarchy isn't analogy; it's the same formal object viewed from two disciplines.

The address-as-polynomial framing lands too: an address `k₁k₂…k_d` is literally a base-`b` polynomial `Σ k_i · b^(d−i)`. The address *is* a number; depth *is* the exponent.

**Where the analogy stops:** wavelets decompose continuous functions over `R` into real-valued coefficients. Pscale decomposes semantic content authored by agents — the "coefficients" are LLM-readable strings, not numbers. Pscale is wavelet-*shaped* but operates in a semantic field rather than `L²`.

---

## The Hyperbolic Structure (Direction of Travel)

Hyperbolic geometry is the geometry of negatively curved spaces. Trees are essentially "discrete hyperbolic spaces" — not analogy, structural fact.

### The Gromov Product

In hyperbolic geometry there's a canonical inner product, the **Gromov product**, defined relative to a basepoint `w`:

```
(x | y)_w = ½ [d(w,x) + d(w,y) − d(x,y)]
```

It measures how much the geodesic from `w` toward `y` shares with the geodesic from `w` toward `x` — how long two paths from the basepoint travel together before diverging.

**For trees rooted at `w`, this collapses to:**

```
(x | y)_root = depth of LCA(x, y)
```

The inner product of two tree-points is the depth of their least common ancestor. Pure prefix length. No coordinates needed, no embedding chosen — just structure.

### Norm and Distance

From the inner product:

- `‖x‖² = (x | x) = depth(x)`
- `d(x, y) = ‖x‖ + ‖y‖ − 2(x | y) = depth(x) + depth(y) − 2·depth(LCA(x,y))`

**Norm = depth.** Distance from origin isn't magnitude in the usual sense — it's *specificity*. Root has zero norm. Deep leaves have high norm. This inverts Euclidean intuition where higher norm means "bigger / more important." In hyperbolic / pscale terms, higher norm means "more local."

### Why Hyperbolic, Not Euclidean

Volume growth. A ball of radius `r` in Euclidean `R^n` contains `~r^n` points (polynomial). In hyperbolic `H^n` it contains `~e^((n-1)r)` points (exponential). In a tree with branching factor `b`, the number of nodes at distance `r` is `~b^r` — also exponential.

Trees and hyperbolic space match in capacity. Trees and Euclidean space don't. Force a tree into Euclidean space and you must distort distances badly. Embed an infinite tree in the Poincaré ball and the hyperbolic metric blows up at the boundary — exactly what's needed.

### Pscale Examples

```
⟨"3", "5"⟩       = 0    (siblings at depth 1, share only root)
⟨"3", "31"⟩      = 1    (parent and child)
⟨"31", "32"⟩     = 1    (siblings under "3")
⟨"312", "315"⟩   = 2    (share two-digit prefix)
⟨"312", "412"⟩   = 0    (different first digit — zero shared lineage)
```

The last case is the critical one. In Euclidean / cosine geometry, `"312"` and `"412"` look similar — same digits in two of three positions. In hyperbolic / pscale geometry they have *zero* inner product. Different branches. The first digit decides everything; later digits cannot reconcile branches that diverged early.

This is the deep difference between embedding-space similarity and pscale similarity:

- **Cosine similarity** asks: do these vectors point in similar directions in semantic space?
- **Pscale proximity** asks: do these addresses share lineage?

These are independent measures answering different questions.

---

## Tight vs Suggestive

Locking the boundary before extending:

**Tight (formal):**
- Gromov product on a tree = depth of LCA
- Pscale norm = depth
- Distance formula `d(x,y) = depth(x) + depth(y) − 2·depth(LCA(x,y))`
- Address as base-`b` polynomial `Σ k_i · b^(d−i)`
- Wavelet scale index `j` = pscale value (both are `log_b(λ)`)
- Digit-key = position index within scale
- Prefix containment = multiresolution nesting `V_j ⊂ V_{j+1}`

**Suggestive (heuristic, useful framing):**
- Pscale curvature `≈ −(log 9)²` nats² per unit depth — dimensional analysis only, not derived
- Wavelet `V_j` (approximation) vs `W_j` (detail) as authoring discipline — useful framing, not a derived constraint
- Sparsity as signal of well-formed structure — heuristic from wavelet practice
- Boundary at infinity carrying "pure direction, not body" — geometrically right, interpretation pending

**Open / unresolved:**
- How sign (+/−) interacts with the geometry — different hyperbolic sheet, time-reversed copy, or something else
- BSP primitives (spindle, ring, disc, directory, star) as hyperbolic operations — spindle reads as geodesic descent, ring as a horocycle at shared depth, but formal statements not pinned
- Whether gyrovector / Möbius operations give a meaningful algebra on pscale addresses
- Connection to transformer attention itself

---

## Implications for Pscale Block Formation

### From the Wavelet Side

**Refinement principle.** The coarse representation at scale `j` is a weighted projection of the finer representation at `j+1`. Translated: a parent's `_` content should be a genuine coarse projection of its digit children, not arbitrary new prose. Compaction discipline.

**Detail, not elaboration.** Children should encode what's new at finer scale (`W_j`), not rephrasing of the parent. If a child cell just restates the parent's `_`, it's wasting that coordinate. Test: can you derive the child from the parent? If yes, the child is redundant.

**Sparsity.** Most wavelet coefficients are near zero; signal concentrates in a few cells. The same should hold for well-formed pscale blocks. Empty cells aren't failures of completeness — they're evidence you haven't forced semantic content into positions where there is none. A block where every cell is filled is suspicious.

**Compact support.** A cell's content should speak to *that coordinate*, not to global truths. Global content belongs at the root. Cross-cutting truths belong shallow. Deeper = more local. Discipline against semantic spillage.

### From the Hyperbolic Side

**Similarity for cell-coupling is Gromov product, not cosine.** When asking "should these cells inform each other?" — the relevant measure is shared prefix length, not content vector similarity. Two cells with high Gromov product belong to the same hyperbolic neighborhood and naturally inform each other. Cells with zero Gromov product live in different branches and should be relatively independent.

**Address composition is not linear.** You can average two embedding vectors to get a midpoint "between" them. You cannot do this with pscale addresses. The "midpoint" of two addresses is their LCA — and the LCA is *shallower* than either, not between them in a spatial sense. This explains why pscale coordinates can't be blended the way embeddings can.

**Norm = locality, not weight.** A deeper address isn't a stronger claim — it's a more local one. A claim at depth 1 is universal across that subtree; a claim at depth 4 speaks only to its immediate location.

**Asymmetry between specifying-down and summarizing-up has geometric content.** Going deeper is exponential expansion (cheap, lots of room). Going shallower is logarithmic compression (hard, must lose information). Authoring a child cell from a parent feels like elaboration; summarizing children into a parent's `_` feels like distillation — these *are* different operations with different costs.

**Natural neighborhood scales linearly with depth.** The hyperbolic ball around a cell — itself, parent, siblings, children, cells with high Gromov product — is small and structured. It scales linearly with depth, not with block size. Pscale-grounded reasoning is computationally cheap in a way embedding-similarity reasoning is not.

---

## Two Geometries Cooperating

LLMs operate in flat embedding space — high-dimensional Euclidean / cosine geometry. Pscale operates in hyperbolic / tree geometry. These aren't competitors; they're orthogonal.

- Embedding space gives you: "what does this content mean?"
- Pscale geometry gives you: "where does this content sit?"

An LLM reasoning over a pscale block is doing two things at once: cosine-similarity over content (its native operation) and prefix-matching over addresses (the structural operation). The medium LLM's job is exactly to compose these — given the hyperbolic neighborhood of a cell, find the cosine-relevant content within that neighborhood.

The address geometry does the prefiltering; the embedding geometry does the ranking. Two different geometries each doing what it's best at.

This is where the math pays off practically. Without the hyperbolic constraint, an LLM searching a pscale block would do a global similarity search and inherit all the failure modes of vector retrieval. With it, the search space is principally bounded — only cells in the relevant hyperbolic neighborhood are candidates.

---

## Best Routes for the Project

Four candidate threads, roughly ordered by directness of payoff:

### 1. Medium LLM as Gromov-product computer

Most directly buildable. The medium LLM's coordination work — deciding which cells inform which, which cells couple to which — is fundamentally a hyperbolic-neighborhood computation, not a cosine search. This is a concrete architectural claim about how the medium LLM should operate, and it can be specified, prompted, and tested. If it's right, it makes medium-LLM reasoning cheaper and more principled.

### 2. Compaction discipline as derived rule

The wavelet refinement principle gives a principled foundation for what a "well-formed" pscale block looks like. Beyond schema validity: parent `_` should be a genuine projection of children; children should carry detail that justifies their depth; sparsity is evidence of honest structure; cell content should be local to its coordinate. These could be made into authoring guidance the LLM stack uses directly.

### 3. Sign and geometry

The unresolved question. Negative pscale (projected/future, designer-side) vs positive pscale (settled/real, author-side) — does this correspond to a geometric structure? Two hyperbolic sheets glued at the origin? Time-reversed copy of the same geometry? Something else? Worth exploring because the sign carries a lot of architectural weight in pscale and right now the geometry of it is implicit.

### 4. BSP primitives as hyperbolic operations

Spindle reads as geodesic descent; ring as something like a horocycle at shared depth; star as overlay of a parallel hyperbolic structure on the same address space. If these can be pinned formally, the BSP primitives gain a derivation rather than being defined operationally — and that might surface primitives we haven't named yet.

---

## What to Decide Next

The cleanest first move is probably the medium-LLM-as-Gromov-product-computer thread, because it's actionable and tests whether the geometric framing buys real architectural clarity. The compaction discipline is the closest second — it's already half-implicit in pscale practice, and the wavelet framing names *why*.

The sign question is the deepest theoretically and may be worth chewing on in parallel even before committing to build. The BSP primitives thread wants the most preparation before being useful.

Open question for David: is the priority architectural clarity (which would push on threads 1 and 2) or theoretical depth (which would push on thread 3)?
