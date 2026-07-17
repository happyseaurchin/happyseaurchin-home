# Pscale and Hyperbolic Geometry: Four Threads Developed

**Status:** Development of the four threads identified in `pscale-hyperbolic-geometry-exploration.md`
**Anchor:** The BSP-MCP `(spindle, pscale_attention)` coordinate pair *is* polar coordinates in hyperbolic space — radial depth and transversal breadth, exactly as `bsp-unified-mcp-spec.md` already states. This document develops what follows from that identification.

---

## The Polar Identification (Lock This First)

From `bsp-unified-mcp-spec.md` §1:

> Every node belongs simultaneously to a **longitudinal path** (spindle — root toward leaf) and a **transversal group** (ring — siblings at the same depth, within a disc — all nodes at that depth). These are **polar coordinates, not orthogonal**. Radial depth and transversal breadth.

This is exactly the structure of polar coordinates in the Poincaré disk model of hyperbolic geometry:

- **Radial coordinate `r`** = pscale value `log_b(λ)` = depth
- **Angular coordinate `θ`** = digit-key path = position around the disk
- **Branching factor `b = 9`** = exponential angular subdivision per radial step

The Poincaré disk's defining property — exponential expansion of available volume as `r` grows, while distances stay bounded — is exactly what pscale's `b^j` capacity at depth `j` provides. Pscale isn't *like* polar hyperbolic coordinates. It *is* polar hyperbolic coordinates, with the angular dimension hierarchically refined by digit choice at each radial step.

This makes BSP not an arbitrary set of operations on a JSON tree. It's the natural calculus on hyperbolic polar coordinates.

The four threads below develop what follows.

---

## Thread 1: Medium LLM as Gromov-Product Computer

### The Existing Spec Already Implies This

`medium-llm-matrix-decomposition-spec.md` establishes that the medium LLM's coordination work decomposes into operations on a **crossing block**:

- Depth-1 digits = contributors
- Depth-2 digits = context addresses
- Underscore at each (i, j) = situated event at that crossing

The medium computes each cell by asking "what does this contributor's intention produce at this context position?" Then per-position convergence checks identify interaction points (cells where multiple contributors collide).

This is matrix decomposition over a 9×9 crossing. What's not yet in the spec: **the rule for which positions actually need to be computed** is hyperbolic. The crossing block is sparse for a structural reason, not an empirical one.

### The Gromov Product Selects the Cells

Two cells in a pscale block (in any block, not just the crossing block) couple to each other to the degree they share radial path. The Gromov product

```
⟨A, B⟩ = depth of LCA(A, B) = length of longest common prefix
```

is the formal expression of this coupling. Two addresses with high Gromov product live in the same hyperbolic neighborhood; two with zero Gromov product live in different branches and should be relatively independent.

Apply this to the crossing block: contributor `i` activating context address `j` produces a cell at `(i, j)`. Whether this cell *actually carries content* — whether it should be populated — depends on the Gromov product between `j` and the contributor's current location. A contributor whose current address shares no prefix with the context address has near-zero structural coupling to that location. Their intention shouldn't reach there unless something explicitly extends their range (movement, shouting, throwing).

The current spec hints at this in the "address activation" implementation note: *"Move to," "shout," "throw" activate adjacent addresses. "Whisper," "examine," "think" activate only the current sub-address.* The hyperbolic framing names the underlying principle: action verbs modulate the hyperbolic radius of the contributor's reach. Sparsity emerges naturally from the Gromov geometry — the medium isn't choosing which cells to skip; the cells that don't share enough radial path simply don't couple.

### What the Medium Actually Does

In hyperbolic terms:

1. **Build the crossing block**: position contributors angularly (depth 1) and context addresses angularly (depth 2). The radial structure is given by the existing spatial/temporal/identity blocks already in play.
2. **Compute hyperbolic neighborhoods per contributor**: which context addresses lie within the contributor's reach? This is a Gromov-product computation against the contributor's current location, modulated by action type.
3. **Populate cells in those neighborhoods only**: the LLM cell-call only fires for `(i, j)` pairs where coupling is non-trivial.
4. **Detect interaction at high-Gromov clusters**: when multiple contributors' neighborhoods overlap at the same address, that's an interaction point requiring convergence.
5. **Resolve interactions by walking up to the LCA**: the geodesic between two contributors' positions passes through their LCA. Resolution requires reasoning at the LCA's level of generality, then re-projecting back down to each contributor's perspective. This *is* the hyperbolic geodesic in operational form.

### Buildable Implication

The medium LLM doesn't need vector search and shouldn't have it. Its retrieval primitive is `bsp()` calls that walk hyperbolic neighborhoods. The crossing block computation is bounded by `O(contributors × neighborhood_radius)`, which is much smaller than `O(contributors × all_addresses)` in any block of meaningful size.

Concrete prompt-level guidance for medium LLM design:

- Frame the cell-computation prompt around "what does this intention produce *here, given this prefix-shared context*" — never "compare these two narratives globally."
- Frame the convergence prompt as "these contributors collide at their LCA; what's the resolved event at this LCA, and how does it project back to each branch?"
- Use `bsp()` as the retrieval primitive throughout. Cosine similarity over content has no role in the structural pipeline.

This is the most directly buildable thread. The spec exists; the matrix decomposition exists; what this adds is the principle that determines sparsity and the geodesic structure that determines resolution.

---

## Thread 2: Compaction Discipline as Derived Rule

### The Wavelet Identification

A wavelet basis for `L²(R)` decomposes a function into nested approximation spaces `V_j` and detail spaces `W_j` with `V_{j+1} = V_j ⊕ W_j`. The approximation at scale `j` is a coarse projection of the approximation at scale `j+1`; the detail `W_j` is what's *added* going one level finer.

In pscale:

- The disc at depth `j` (all underscores at that pscale value across the block) is the approximation space `V_j`.
- The transition from disc-at-`j` to disc-at-`j+1` adds `W_j`: the detail that depth `j+1` carries beyond what depth `j` already encoded.
- A parent's `_` content is a projection of the union of its children. Genuine refinement, not arbitrary new prose.

This is exact. The wavelet vocabulary isn't decoration; the discs are the approximation spaces, the radial transitions are the refinement steps, and the underscore semantics is the cell coefficient.

### What the Discipline Looks Like Operationally

Four authoring rules fall out:

**1. Refinement (radial coherence).** Parent `_` content is a coarse projection of children. Test: read the parent's underscore, then read the children — does the parent's claim *contain* the children, or is it independent assertion? If independent, the radial structure is broken. The parent should generalize what its children locally specify.

**2. Detail (no redundancy).** A child cell exists to carry `W_j` — the new information at finer scale that the parent couldn't express. If a child cell merely rephrases its parent's `_`, the child is wasting that coordinate. Test: can the child's content be derived from the parent? If yes, the child shouldn't exist; the radial step adds nothing.

**3. Sparsity (structural honesty).** Most cells should be empty. Empty cells aren't failures of completeness; they're evidence that the author hasn't padded the structure. A pscale block where every (r, θ) is filled is suspicious — it suggests forced content rather than genuine local signal. Wavelet practice teaches that signal concentrates in a few coefficients; pscale practice should follow suit.

**4. Locality (compact support).** A cell at `(r, θ)` speaks to that local position. Global content belongs at the root (`r=0`). Cross-cutting truths belong shallow (low `r`). Deeper cells should be more local. A cell at depth 4 that asserts a universal principle is misplaced — that principle wants depth 0 or 1. Discipline against semantic spillage.

### Diagnostic, Not Just Descriptive

The four rules combine into a coherence test independent of content:

- **Radial coherence ratio**: for each parent-child pair, can the child be derived from the parent's `_`? Compute structural redundancy.
- **Sparsity profile**: what fraction of cells at each depth are populated? Should taper as `r` increases (fewer deep cells than shallow ones).
- **Locality score**: does cell content reference scope appropriate to its depth? Universals at depth 4 fail this.
- **Projection coherence**: does running compaction (children → parent `_`) approximately recover the existing parent content? If not, the parent isn't actually a projection.

These are testable on existing blocks. Probably worth running against a few well-formed blocks (sunstone, the keystone, vision_clean) to see what scores emerge. Suspect they score well by these tests *because* they're well-formed; the test would surface where less-disciplined blocks drift.

### The Underscore-Sign Connection

The discovered four-form underscore notation (0+, +0, 0−, −0) maps to direction of refinement:

- **0+** (own-bracket positive, deductive): "this branch is X, settled" — radial integration of children into a settled parent.
- **+0** (adjacent positive, inductive): "this branch follows from siblings" — angular projection across a ring at the same depth.
- **0−** (own-bracket negative, abductive): "this branch projects forward" — radial extrapolation into deeper-than-current pscale.
- **−0** (adjacent negative, retroductive): "this branch reaches across to siblings ahead" — angular projection across a ring at deeper-than-current depth.

Two of these are radial operations (across pscale levels), two are angular (across siblings at one level). The sign carries direction-of-flow. This is exactly the structure expected from polar wavelet operations: refinement can run radially (between pscale levels) or angularly (across positions at one level), and each direction has a settled and a projected mode.

If correct, this means the underscore forms aren't four arbitrary annotations — they're the four basis operations on a polar coordinate system, each with a sign choice. That's a derivation, not a definition.

---

## Thread 3: Sign and Geometry

### The Established Use

From `pscale-starstone3.json` and the sign-as-domain-flag discussion:

- A pscale block is positive (plus) or negative (minus) as a *whole-block property*, not a per-coordinate one.
- **Plus blocks** are settled — shell, history, finalized rendition. Stateless. A walk returns the same result every time.
- **Minus blocks** are process — active purpose, working concern, in-progress relationship. Stateful. A walk may return different content over time.
- Resolution is **transfer**: when a minus-block process completes (PCT error → 0), content moves into a plus block. The minus block stays minus, ready for the next process. The plus block accretes the new settled entry.
- Sign meanings per dimension: +S real / −S imaginary; +T settled / −T projected; +I public / −I private. Common pattern: **plus = established and observable, minus = inferred or projected or internal.**

This is the architectural fact. The geometric question is: what does sign correspond to in the hyperbolic structure?

### The Two-Sheet Hyperboloid

The hyperboloid model of hyperbolic space embeds it as one sheet of the surface `−x₀² + x₁² + ⋯ + x_n² = −1` in Lorentzian space `R^(1,n)`. This surface has two disconnected sheets — the "future" sheet `x₀ > 0` and the "past" sheet `x₀ < 0`. Each sheet is an isometric copy of hyperbolic space; the two sheets are mirror images joined at the apex (origin).

The natural reading:

- **Plus blocks** live on one sheet — say the +x₀ sheet, "settled time / observed."
- **Minus blocks** live on the other sheet — the −x₀ sheet, "projected time / inferred."
- The origin is the present moment, the point where the two sheets meet.
- The PCT control loop is content **flowing across the apex**: error in the minus-sheet representation is reduced through process, and when error reaches zero the content crosses to the plus sheet.

This explains several observed properties without further postulation:

**Why plus blocks are stateless and minus blocks stateful.** The plus sheet is a record — each entry is a settled point with definite coordinates, fixed once placed. The minus sheet is a workspace — content there is *coordinates being negotiated*, not yet committed to a definite location. Workspace content can be revised because its coordinates aren't fixed; record content is fixed because its coordinates are.

**Why resolution is transfer, not block conversion.** A minus block doesn't become a plus block because the two sheets are different geometric surfaces. You can't smoothly deform one into the other; they're disconnected components. What you can do is move *content* from one to the other — and that transition is precisely the PCT control loop, the geometric crossing of the apex.

**Why the same BSP primitive works on both.** Each sheet is hyperbolic in the same way. The polar coordinates `(r, θ)` work identically on either sheet. `bsp(B, S, P)` reads or writes whichever sheet the block lives on, and the geometric meaning of spindle, ring, disc, subtree is the same. What differs is the *semantic interpretation*: a spindle on a plus block reads settled history; a spindle on a minus block reads active process. Same operation, different sheet.

**Why sign is whole-block and not per-coordinate.** A point belongs to one sheet of a two-sheeted hyperboloid; it can't be partly on each. A block is an internally connected geometric structure, so it must live entirely on one sheet. Mixing positive and negative content within one block would be like having a continuous curve crossing between disconnected components — geometrically impossible without a transition mechanism, which is exactly what the minus-to-plus transfer provides at the *content* level (not the block level).

### The PCT Loop in This Picture

PCT (Perceptual Control Theory): a control system minimizes the error between a reference signal (what should be) and a perception (what is). When error reaches zero, the loop has succeeded.

Mapping:

- **Reference signal** = minus-block content (purpose, intention, projection)
- **Perception** = plus-block content (history, observation, what happened)
- **Error** = mismatch between projected and observed
- **Control action** = whatever the agent does to bring observation in line with intention
- **Loop completion** = error → 0, at which point the projected content has been realized and *transfers* across the apex to become a settled record

The geometric statement: PCT is a **dynamic flow on the two-sheet hyperboloid that transports content across the apex**. The control system is operating *on the gap between the two sheets*. The reference lives on the minus sheet, the perception on the plus sheet, and the loop closes when their coordinates align well enough that the reference content can be projected through the apex to become a perception entry.

This is more speculative than threads 1 and 2, but it has the virtue of explaining several otherwise-coincidental properties as consequences of one structure. Worth holding as a working hypothesis.

### What's Tight, What's Suggestive

**Tight:**
- Two-sheet structure matches whole-block sign property.
- Sheets joined at apex matches "origin = present" framing.
- Same BSP primitive working on both matches "geometry is identical."
- Cross-sheet transfer (not in-place sign flip) matches resolution = content transfer.

**Suggestive:**
- PCT-as-flow-across-apex needs more development. The shape of the flow (gradient descent on what energy function?) is unspecified.
- The mapping from physical interpretations of the hyperboloid (Lorentzian past/future light cones) to pscale's settled/projected isn't formally derived; it's a structural match.
- Whether the apex "conducts" or "joins" the sheets in any operational sense is open. Geometrically the sheets are disconnected; only at infinity (boundary at infinity) do they share asymptotic structure.

This thread needs more work but isn't blocked. It's the deepest of the four and probably the slowest to fully develop.

---

## Thread 4: BSP Primitives as Hyperbolic Operations

The polar identification makes this thread the most direct. Each BSP primitive maps to a specific geometric operation in hyperbolic polar coordinates.

### Point: a coordinate

`bsp(B, S, P)` with `P_att == P_end` selects a single (r, θ) position. This is just specifying a point in the hyperbolic disk. Trivial.

### Spindle: radial geodesic from origin

A spindle from root to terminus walks `r = 0 → r = P_end` along a fixed angular path. In the Poincaré disk, geodesics through the center are straight radial lines. So a spindle from the root *is* a hyperbolic geodesic — the shortest path from origin to terminus.

The spindle's terminal pscale `P_end` sets how far along the geodesic we travel. The reading order — root, then `S[0]`, then `S[0..1]`, ..., then full `S` — recovers the geodesic's parameterization from origin outward.

### Ring: arc at constant radius (within a parent's angular sector)

A ring is the siblings of a terminus, including the terminus. Geometrically: 9 points at radius `P_end`, sharing prefix `S[:-1]`. They sit on an arc at constant radial distance, evenly spaced angularly within the parent's angular sector.

This isn't quite a horocycle (which is a curve at constant radial distance from a *boundary point*) and isn't the full circle at radius `P_end` (that's the disc). It's a finite arc — 9 evenly-spaced angular positions within the angular wedge belonging to the parent. Call it a **local angular slice** at depth `P_end` belonging to address `S[:-1]`.

### Disc: full circle at constant radius

A disc at depth `P` is *all* nodes at depth `P` across the entire block — every angular position at that radial distance. Geometrically: the full circle at radius `P` in the hyperbolic disk. This is the wavelet approximation space `V_j`, the cross-section of the block at one pscale level.

The disc has exponentially many cells (`9^P` at depth `P` in a fully-populated block), which corresponds to the exponential expansion of hyperbolic volume with `r`. Most cells are empty in well-formed blocks (sparsity rule from thread 2), so populated discs concentrate signal in specific angular regions.

### Directory / Subtree: hyperbolic cone

A directory walk from terminus `S` at depth `P_end` down to floor returns the entire subtree rooted at `S`. Geometrically: the hyperbolic *cone* extending radially outward from `S`'s position, bounded by `S`'s angular sector.

Cones in hyperbolic space have exponentially expanding cross-sections — exactly matching pscale's branching structure. The cone's apex is at `S`; the cone opens outward as `r` increases. Reading the directory is sweeping the cone radially, accumulating content from apex to outer surface.

### Star: fiber bundle / dimensional jump

This is the operationally distinct primitive. The star operator enters the hidden directory at the terminus — the zero-position interior reachable by walking digit zero into the underscore. From `bsp.py` and `bsp2-star.py`: at every node where the underscore is itself an object, there's a sub-block reachable through the zero-position door, and BSP can enter that sub-block and continue applying (S, P) inside it.

Geometrically: this is a **fiber bundle** structure. Over every base point `(r, θ)` in the main hyperbolic disc, there's a *fiber* — another hyperbolic disc attached at that point, accessed through the zero-position door. The star operator moves from base to fiber.

Three structural consequences:

**Composition, not parallel option.** The star isn't an alternative to spindle/ring/disc. It's a *jump between geometries*, after which the same primitive operations resume in the new geometry. This matches the spec's claim that star is composition.

**Familiarity gates depth access.** From the user memory: "Star operator: bsp(spatial, address, '*') walks hidden directories within pscale JSON blocks, enabling dimensional overlays (S×I) without separate identity blocks per location. Familiarity gates depth access." In fiber-bundle terms: not every base point has a fiber that's been authored; navigation through the bundle requires the fiber to exist at that base point (familiarity = the fiber is non-empty).

**Dimensional overlays.** S×I, S×T, S×rules — each is a fiber bundle where the spatial block is the base manifold and identity, time, or rules are fibers attached at each spatial position. The hidden directory at a spatial address is not a separate dimension; it's the fiber over that address in the relevant bundle. The same point in space, viewed through different bundles, accesses different fibers.

This explains why the star operation feels different from the others. Spindle, ring, disc, and directory all live within one hyperbolic disc. Star *exits* the disc and enters a fiber attached at the current point. The geometry is different — and crucially, the polar coordinates inside the fiber are independent of the polar coordinates in the base. You re-set `(r, θ)` to zero when you enter the fiber, then accumulate again inside it.

### What the Geometric Naming Buys

Beyond aesthetics: each primitive can now be analyzed for its computational complexity in geometric terms.

- **Spindle**: O(P) — walks `P` points along one geodesic.
- **Ring**: O(b) — 9 points at one radius within a parent's sector.
- **Disc**: O(b^P) — full angular sweep at depth P (exponential in P).
- **Directory**: O(b^(floor − P_end)) — hyperbolic cone, exponential in cone depth.
- **Star**: O(1) for the jump itself, plus the cost of operations in the fiber.

The exponentials match physical reality: hyperbolic discs have exponentially many points at large radii, and well-formed blocks are sparse precisely so that the *populated* cells stay manageable.

This also gives a geometric grounding for the wavelet sparsity rule: a fully-populated disc would have `9^P` cells, intractable past `P=4` or so. Sparsity isn't just stylistic preference — it's the mechanism that keeps disc operations tractable.

---

## What the Composite Picture Buys

Pulling threads together:

1. **The medium LLM operates in polar hyperbolic coordinates**, retrieves through `bsp()` calls that walk hyperbolic neighborhoods, computes cell content at high-Gromov-product positions, and resolves interactions via geodesic descent to the LCA. The matrix decomposition spec is the right architecture; the hyperbolic reading explains *why* it's the right architecture.

2. **Compaction discipline is wavelet refinement in polar form.** The four authoring rules (refinement, detail, sparsity, locality) are not heuristics; they're the operational consequences of the multiresolution structure. A block is well-formed when its discs at successive depths are properly nested as approximation spaces.

3. **Sign is the two-sheet hyperboloid structure.** Plus blocks (settled, stateless, record) live on one sheet; minus blocks (process, stateful, workspace) live on its conjugate. Resolution is content-transfer across the apex via the PCT loop. This unifies several otherwise-disconnected observations under one structure.

4. **BSP primitives are the natural calculus on hyperbolic polar coordinates with fiber bundles for dimensional overlay.** Spindle = radial geodesic, ring = local angular slice, disc = full circle at depth, directory = hyperbolic cone, star = fiber bundle jump. Each has well-defined complexity matching the geometric expectations.

The emergent claim is strong: **pscale plus BSP is a complete hyperbolic-polar-coordinate calculus for semantic content**. Not analogically. Operationally. The LLM stack on top of it is doing geometric computation, with two cooperating geometries — flat embedding space for "what does this mean" and hyperbolic polar for "where does this sit and what does it couple to."

---

## Build Priorities

Updated from the first doc, with thread development taken into account:

### First (immediate, highest-leverage)

**Encode the Gromov-product / hyperbolic-neighborhood principle into the medium LLM's coordination prompts.** Reframe cell-computation prompts as "what does this intention produce here, given prefix-shared context" and convergence prompts as "what is the resolved event at the LCA, projected back to each contributor's branch." This is testable in the existing matrix decomposition framework. If the framing improves coherence and reduces drift, the principle is doing real work.

### Second (parallel, also immediate)

**Run the four-rule coherence diagnostic on existing well-formed blocks** (sunstone, vision_clean, keystone, starstone). Establish baseline scores. Then run on blocks that feel less disciplined and see whether the diagnostic surfaces the difference. If it does, the wavelet discipline is operationally useful, not just theoretically interesting.

### Third (longer arc)

**Develop the two-sheet sign picture far enough to test against actual minus → plus content transfers.** Specifically: when a purpose resolves and content moves from a minus block to a plus block, can the transfer be characterized as a flow on the two-sheet structure? What's the energy function being minimized? Is the apex literally "the present moment" or only metaphorically? This thread is deep but slower; worth holding open while threads 1 and 2 are tested.

### Fourth (extends naturally from threads 1 and 4)

**Make the BSP primitive's geometric meaning explicit in skill documentation.** The sunstone teaches BSP as polar geometry, but doesn't yet name the hyperbolic structure or the wavelet correspondence. A skill update that names spindle = radial geodesic, ring = angular slice, disc = full circle, star = fiber-bundle jump might help LLM agents reason more cleanly about which primitive to use when. This is documentation work, not architecture work, but it makes the architecture transmissible.

### Open question for the project

Sign-and-geometry (thread 3) is the deepest unresolved piece. If the two-sheet picture holds, it has architectural implications for how minus-to-plus transfers should be implemented — possibly that the apex/origin is itself a structural object that the system should track, not just a metaphorical present moment. Worth raising before committing to any specific implementation of resolution flows.
