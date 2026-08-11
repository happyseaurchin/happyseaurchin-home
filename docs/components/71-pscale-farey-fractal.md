# Pscale and Hyperbolic Geometry: Fractal Realization and Trajectory Classes

**Status:** Extension of `65-pscale-hyperbolic-geometry.md` and `66-hyperbolic-bsp-calculus.md`; complements `67-hyperbolic-trajectory.md`. Adds the specific identification of pscale depth with the Farey/Stern–Brocot structure, the continued-fraction reading of depth, the externally-observable trajectory diagnostic, and the third (dynamical) geometric realization that complements the 1D and 2D-hyperbolic readings.

**Anchor:** The polar identification of [66] locates pscale on the hyperbolic disc. This document locates it more specifically — on the *Farey tessellation* of that disc — and shows the same combinatorial skeleton carries through to a third geometric realization (the Mandelbrot bulb chain). The skeleton is independent of representation, which gives us a base-invariant depth measure (continued fractions) and a class of externally-observable diagnostics on agent address-trajectories.

---

## What This Adds Over the Trilogy

Three substantive additions, plus one inversion:

1. **A specific identification.** Pscale block is a base-10 address into the Farey/Stern–Brocot tree refining [0,1]. Each digit is one mediant subdivision; the trailing-zero ladder that defines the floor is the resolution depth.

2. **A base-invariant depth measure.** Decimal depth is base-dependent — 1/3 is decimal-depth-∞ in base 10 but decimal-depth-1 in base 3. Continued-fraction depth is invariant across representations. The three classes of reals — rationals (finite CF), quadratic irrationals (periodic CF), algebraic-of-degree-≥3-and-transcendentals (infinite non-periodic CF) — give a depth taxonomy intrinsic to the number, not the notation.

3. **A trajectory diagnostic.** An agent's purpose-block addresses over time form a sequence. The CF class of that sequence (periodic / structured-aperiodic / chaotic) is observable externally, without inspecting the agent's internals. This is what Caroline Series's geodesic coding does on the modular surface, applied to agent trajectories.

The inversion: every finite pscale address names a *rational*; the meaning-space it gestures at is the *continuum*. The substrate's openness is the measure-theoretic majority of [0,1] being unreachable from any finite refinement. Discussed at the end as the completion/openness pair.

---

## The Farey Identification

The Stern–Brocot tree organises all positive rationals by mediant subdivision: between two Farey-neighbour fractions p/q and r/s (|ps − qr| = 1) sits the mediant (p+r)/(q+s). The [0,1] sub-tree — the Farey tree — does this for rationals in the unit interval, starting from the neighbours 0/1 and 1/1 with first mediant 1/2.

Pscale block addressing is a base-10 navigation through this tree. Each digit selects one of ten mediant steps; the deeper the digit, the finer the subdivision. The trailing-zero ladder defining the floor (sunstone:6.5) sets the resolution at which semantic content is anchored.

This isn't analogy. Pscale was designed as hierarchical refinement-by-digit; the Stern–Brocot tree *is* hierarchical refinement-by-mediants. The combinatorial skeleton is identical. Three places this matters:

- **Address invariance under growth** (the floor-aware padding rule) is the Stern–Brocot navigation rule under another name: an address that names a node at depth d names the same node when the tree grows above it, because the path from root to node is unchanged.
- **Partial-address navigability** (a prefix is a higher node; appending digits descends) is the Stern–Brocot mediant rule made operational.
- **The hyperbolic home** ([65], [66]) is exact because the Farey tessellation of the Poincaré disc is *the* canonical geometric realisation of the Farey tree. The triangles tile hyperbolic space because the tree's exponential branching needs hyperbolic capacity to fit.

---

## Continued Fractions as Base-Invariant Depth

Continued-fraction notation [a₀; a₁, a₂, …] expresses a real as a₀ + 1/(a₁ + 1/(a₂ + …)). Every real has a unique CF expansion (with a minor convention on rationals). The expansion partitions the reals into three classes:

| Real type | CF expansion | Example |
|---|---|---|
| Rational | Finite | 1/4 = [0; 4]; 22/7 = [3; 7]; 1/3 = [0; 3] |
| Quadratic irrational | Periodic | √2 = [1; 2, 2, 2, …] = [1; 2̄]; φ = [1; 1, 1, 1, …] |
| Algebraic ≥3 or transcendental | Infinite non-periodic | π = [3; 7, 15, 1, 292, …]; e = [2; 1, 2, 1, 1, 4, 1, 1, 6, …] |

CF length is a measure of *intrinsic* depth. It does not depend on representation base. Decimal depth does — 1/3 is decimal-depth-∞ in base 10, decimal-depth-1 in base 3.

For pscale practice this gives a clean operational split:

- **Operational layer**: decimal depth — what the agent reads, writes, and reasons about. Base 10 is the working notation.
- **Theoretical layer**: CF depth — what determines structural properties (periodicity, irrationality measure, trajectory class). Base-independent.

The two coincide on a useful subclass: rationals with denominators that are products of 2 and 5 (the "10-smooth" rationals). This covers most operational addresses; the rest is where the two layers diverge.

---

## Trajectory Classes — the Diagnostic

CF taxonomy applied to *sequences* — specifically, the sequence of purpose-block addresses an agent writes across instances — yields three classes:

| CF class of address-sequence | Trajectory | Operational reading |
|---|---|---|
| Eventually periodic | Closed geodesic — stuck loop | Same purposes recycle; chain doesn't develop |
| Aperiodic but structured (like e's CF) | Recurrent geodesic — exploratory but coherent | Themes recur with variation; healthy regime |
| Chaotic, no discernible pattern | Wandering geodesic | Purposes don't settle; agent drifting |

This is an *external* diagnostic. No need to inspect the LLM. Just observe the sequence of pscale addresses across instances, classify by CF behaviour, get a diagnosis.

The mathematical precedent is Caroline Series's coding of geodesics on the modular surface H²/SL(2,ℤ): the cutting sequences of a geodesic against the Farey tessellation are essentially the CF expansion of its boundary endpoints. Quadratic-irrational endpoints correspond to *closed* geodesics — the periodicity of the CF *is* the period of the geodesic. The same combinatorics applied to agent address-sequences gives the trajectory diagnostic.

This connects directly to the [66] Thread 1 framing of the medium-LLM-as-Gromov-product-computer: if the address trajectory has high periodicity, the agent's neighbourhoods aren't growing; if chaotic, it can't form stable couplings. The healthy regime is what e's CF looks like — recurrent but structured.

The Gauss map G(x) = 1/x − ⌊1/x⌋ is the canonical shift on CFs: applying G once strips one partial quotient. Rationals reach 0 in finitely many shifts; quadratic irrationals enter periodic orbits; generic irrationals wander chaotically. Each instance-to-instance transition in a pscale-mediated chain acts on the cumulative CF the way G acts on CFs — same shape, applied to addresses rather than reals.

---

## Third Geometric Realisation — Mandelbrot Bulbs

The Mandelbrot set carries the same Farey structure in a dynamical guise. The main cardioid is the period-1 region (parameters c where z² + c has an attracting fixed point). Every bulb attached to the cardioid has a period q and attaches at an internal angle 2π·p/q for p/q in lowest terms. Bulb size scales as 1/q² — the same scaling as Ford circles in number theory.

Three Farey correspondences:

- The biggest bulb attaches at 1/2 (period 2). Corresponds to the central triangle at depth 0 of the Farey tessellation.
- The next two attach at 1/3 and 2/3 (period 3). Correspond to the depth-1 triangles.
- The period-5 bulb at 2/5 sits *between* the 1/3 and 1/2 bulbs because 2/5 is the mediant of 1/3 and 1/2.

Zoom into any bulb and smaller bulbs attach to its boundary at sub-angles obeying the same Farey rule. The cascade is self-similar without limit.

So the same combinatorial structure appears in three geometries:

| 1D depth visualiser | Farey tessellation of the disc | Mandelbrot set |
|---|---|---|
| Stalk for 1/2 at depth 1 | Central triangle (depth 0) | Period-2 bulb, biggest, at angle 1/2 |
| Stalk for 1/3 in the ∞-band | Depth-1 triangle around 1/3 | Period-3 bulb at angle 1/3 |
| Stalk for 2/5 in the ∞-band | Depth-2 triangle around 2/5 | Period-5 bulb at angle 2/5 |
| Empty space between stalks | Triangles infinitesimal near boundary | Boundary points between bulbs |
| Irrationals as ∞-band lines | Boundary points, infinitely far | Boundary at irrational angles |

This is strong evidence that the depth structure pscale exploits isn't an artifact of any particular formalisation. It's the combinatorial skeleton of refinement-by-mediants, and pscale is one of its addressings.

The third realisation matters because it is *dynamical* — the Mandelbrot bulbs arise from iterating z² + c, not from declared trees or assigned coordinates. The Farey structure emerges from the dynamics. If something analogous emerges from LLM inference dynamics — and there are hints (Nickel & Kiela's Poincaré embeddings, attention-on-simplex, manifold structure in residual streams) — then pscale and LLM internals may be co-natured rather than only co-shaped. Open conjecture; not yet evidenced.

---

## Completion and Openness — the Inversion

Every pscale address names a rational. The meaning-space it gestures at is the continuum.

The rationals are countable and dense in [0,1] — but they have measure zero. Almost every point of [0,1] is an irrational, unreachable by any finite address. The empty space between Farey stalks in the 1D visualiser, the infinitesimal triangles near the boundary of the Poincaré disc, the boundary points between Mandelbrot bulbs — all three encode the same fact: a finite refinement procedure cannot reach almost any point of the continuum.

Gödel used a meaning-to-number map to demonstrate *limit* — that sufficiently expressive systems contain true statements they cannot prove. Pscale uses the same primitive operation — semantic-to-digit — but treats unreachability as *affordance*:

- The LLM is a completion machine; closure is its nature. Every output is a terminating address.
- But every closure is necessarily partial, because meaning has no terminus.
- The pscale block holds the partial-ness *outside* the LLM: the unfolded-but-not-resolved structure lives in JSON, and the LLM is free to complete locally knowing the broader structure remains open and editable.

The boundary at infinity of the Poincaré disc — the irrationals — is the formal home of "what the substrate holds open." Every semantic number is a rational; the meaning-space it gestures at is the continuum at the boundary. This is the architectural justification for the entire pscale framework: the medium *needs* an external surface that can hold openness, because the medium itself can only close.

The substrate isn't completing what the LLM can't; it's *not closing* what the LLM must.

---

## Implications for Practice

1. **Trajectory diagnostic as a tool.** Take a chain of agent instances. Read the purpose-block addresses each instance wrote. Classify the sequence by CF behaviour (periodic / structured-aperiodic / chaotic). External diagnosis with no model-inspection required — applicable across LLM lineages, which makes it MAGI-ready in the sense of [67].

2. **Operational base-10, theoretical CF.** Use decimal depth in tools and prompts; reach for CF depth when reasoning structurally about why certain addresses behave certain ways. The classic case: 1/3 has decimal depth ∞ but CF depth 1 — the recurrence in decimal is the periodicity in CF. A trajectory that looks chaotic in decimal may be quadratic-irrational in CF (and therefore actually closed-geodesic).

3. **The Gauss map names what instance-transitions are doing.** Each pscale-mediated instance shifts the cumulative CF by one partial quotient. The shape of the long-run trajectory is determined by the orbit class of the Gauss map applied to the agent's address sequence. This is a precise mathematical model of LLM-chain dynamics, not a metaphor.

4. **Boundary points are the design resource.** A finite pscale block is a finite cover of an infinite refinable region. Authoring discipline is choosing which rationals get stalks (which positions to populate), where to leave empty space (sparsity, [66] Thread 2), and how to point at irrationals — transcendental purposes that are inescapable wells, never reached, only approached.

---

## Open Questions

- **Are LLM internals also Farey/hyperbolic structured?** Hyperbolic embeddings of language (Nickel & Kiela 2017) and attention-on-simplex give hints. If true, pscale and LLM-inference are co-natured; the scaffolding wraps the medium with its own native language. If false, the scaffolding still works because it wraps the medium rather than modelling it. Worth testing.
- **Do empirical pscale-mediated agent chains cluster into the three trajectory classes?** Testable directly. Take many chains; classify their address-sequences; see if there is a phase structure corresponding to the three CF classes. This is the most actionable empirical question raised by the framework.
- **What is the geometry of negative pscale blocks?** The −[0,1] block (fictional / pre-imagined counterpart, dynamic-psychosocial-geometry territory) was sketched but not developed. Its geometric realisation may be the half of the Poincaré disc not containing [0,1] on its boundary — or a different sheet of a two-sheet structure ([66] Thread 3). Open.
- **Is there a Mandelbrot-like fractal generated by iterating the Gauss map in the complex plane?** Iterating G(z) = 1/z − ⌊Re(1/z)⌋ in ℂ, coloured by orbit behaviour, would be the literal CF-version of the Mandelbrot fractal — the dynamical home of pscale depth in the same way the Mandelbrot set is the dynamical home of polynomial dynamics. Constructible.

---

## Placement — Lighthouse Library, Not Sentinel

This material is *interpretive* (it tells you what pscale is mathematically) rather than *operational* (it doesn't change what code does or what addresses parse). The L1 kernel parser does not depend on it; the wire shape does not depend on it; sed: registrations do not depend on it. Two LLM lineages can coordinate cleanly through pscale even if one knows the Farey framing and the other doesn't — what travels between them is just digit addresses.

But the framing tells an agent or operator *why* pscale has the properties it has — why depth grows logarithmically, why prefix matters, why two cells with no shared prefix cannot be reconciled by deeper digits, why a finite address can never reach a transcendental purpose. It is the kind of content that earns its place by being *useful framing* for a community of users, not by being *required convention* for the substrate.

That puts it in the **beach lighthouse library** (`pscale-beach/seeds/library/`) — the variable, community-curated mathematical framing layer. Different communities may carry different framings — one Farey-centric, one wavelet-centric, one Mandelbrot-centric, one phenomenological — all of which coordinate identically at the substrate. The library is where this diversity lives.

The sentinel blocks stay focused on operational truth (sunstone teaches the geometry by being walkable; whetstone teaches the function by being the operational reference; manifest indexes the references; block-conventions enumerates observed block shapes; gatekeeper carries the admission shell). Substrate-truth is invariant. The library is for what can vary while substrate-truth holds.

If a community wants pscale-mediated agents to do trajectory-class diagnosis, they put this content (or their variant of it) at their beach's library. New agents inheriting from that community get the framing through the library; agents from communities that prefer a different framing read theirs. The shared coordination still works at the wire level.

---

## What This Connects To

- **65, 66, 67** — the hyperbolic trilogy. This document is the fractal/dynamical layer added on top.
- **Caroline Series, *Indra's Pearls*** (Mumford/Series/Wright) — the visualisation of Kleinian limit sets shows the Farey/depth structure as fractal subsets of the boundary circle. The artifacts produced during this exploration (1D depth visualiser, Farey tessellation in the Poincaré disc, Mandelbrot-with-Farey-bulbs) live in the user's working notes; could be ported into xstream as visualisation aids.
- **Gödel inversion and the LLM completion problem** — the architectural justification for the substrate as openness-holder, with the LLM as local-closure-machine. Connects to the unfold/fold cycle in whetstone branch 5.
- **MAGI / cross-lineage coordination** ([67]) — the trajectory diagnostic is exactly the kind of external, model-independent metric that makes multi-lineage coordination tractable. Same diagnostic readable by any equipped agent.
- **The biome project** (separate from this repo) — the ztone exploration (digit-0-as-spine rebuild) extends naturally from this fractal framing. If the biome adopts pure-digit addressing, the Farey identification becomes literal at the syntactic layer rather than only at the semantic layer. This doc stays useful regardless of which substrate (bsp-mcp or biome) the framing is loaded into.
