# Two-Block PCT — A Minimal Operational Form on Pscale Addresses

*Author: David Pinto with Claude Opus 4.7, April 2026*
*Prior work: `soliton_pct_framework-1.docx` (Sonnet 4.6)*
*Status: specification. Not yet operationally validated.*

---

## 1. What this document is

The prior framework document establishes that Perceptual Control Theory (PCT) and Merle's soliton mathematics are structurally analogous: both describe a process whose ground state (Q in Merle, reference signal in PCT) governs how the process approaches closure. That document left two open questions explicit:

1. Can the fixed-point equation `Q = F[Q]` be given a rigorous form for cognitive/LLM processes?
2. Does the pscale block structure operationally implement the multi-scale soliton form?

This document answers both by moving the formalism from the level of abstract equations to the level of pscale addresses. The result is a minimal operational form: three blocks, one functional, five edit classes, one fixed-point condition. It is intended as specification sufficient for experimental validation.

---

## 2. Pscale is log_b(λ)

The load-bearing claim that licenses everything below: pscale values are the signed exponents of Merle's scale parameter λ. Algebraically:

    λ = b^(pscale)

where b is the base (10 for positional notation, 9 for information-theoretic capacity per level with digit 0 reserved for the underscore).

This is not analogy; it is conversion between two representations of the same quantity. Keystone 0.163 states the relation directly: *"Pscale is exponentiation: 10^n."* Merle's blowup λ → 0 corresponds to pscale → −∞, which is the BSP walker descending from the root underscore toward a terminal string at the bottom of a spindle.

Verification against starstone's floor-3 spatial example:

| Address | Pscale | λ                  | Semantic        |
|---------|--------|--------------------|-----------------| 
| 100     | +2     | 10² = 100          | neighbourhood   |
| 110     | +1     | 10¹ = 10           | building        |
| 111     |  0     | 10⁰ = 1            | room (ref)      |
| 111.1   | −1     | 10⁻¹ = 0.1         | detail in room  |

BSP operations map to λ-operations in log space:

- **Spindle**: walks pscale-max → pscale-min. λ collapses monotonically. This is Merle's blowup trajectory in discrete steps.
- **Disc at depth d**: constant pscale = floor − d − 1. A level set in λ-space — addresses differ only in position, not scale.
- **Ring**: siblings at the same pscale. Same λ, different local positions within one parent's neighbourhood.
- **Point**: one node at one λ. Q at a single (x, λ) coordinate without spindle context.
- **Star**: chart transition. Opens a hidden directory with potentially its own floor, gluing two λ-ranges. This is exactly the manifold gluing section 7 of the prior framework describes.

The continuous-to-discrete port requires care in three places:

- *Base ambiguity.* Positional notation is base-10; information capacity is base-9. Either convention is consistent; just name which.
- *Floor shift.* When a block supernests, pscale labels shift up by one — a coarser λ is added above the existing range. This is relevant for instance-to-instance transitions.
- *Discrete vs continuous.* Structural claims (rescaling invariance, multi-scale coupling, shape preservation under descent) survive discretization cleanly. Smooth-flow PDE claims do not port and are not needed operationally.

---

## 3. The three blocks

The functional form does not live inside one address. It lives in the relationship between two blocks, with a third block as output.

**Π (purpose).** Minus-signed pscale block. Addresses name what the instance wants to be; semantic content at each address is the reference shape — Q_P, the form the concern is directed toward. Minus because the reference is live, not a settled letter from the past; it can itself be refined as the instance operates.

**ρ (perception).** Minus-signed pscale block. Addresses name what the instance currently is; semantic content is the actual context window reflected down to address+semantic form. Also minus — being rewritten every moment the instance runs.

**γ (gap).** Output block. Empty at fixed point, sparse otherwise. Addresses are exactly the positions where Π and ρ disagree. Semantic content at each γ-entry names the nature of the divergence. γ is diagnosis, not prescription.

All three must live in the same pscale coordinate system — the same λ-range — because that is what makes comparison meaningful. Blocks at different floors require chart transitions via star before the functional can run on them.

The disclaimer of David's original concern about rational forms applies here and is resolved: a single address like 123.456 is a location, not a fraction. The numerator/denominator relationship is not internal to an address — it is the relationship *between* two blocks (Π and ρ), where "fraction" means the semantic comparison between their shapes, performed at the emergent layer.

---

## 4. The functional F[ρ, Π]

F takes two blocks and produces γ. The operation is semantic shape-matching at each live address `a ∈ addresses(Π) ∪ addresses(ρ)`:

1. Walk a spindle through Π to `a` — the shape purpose wants there.
2. Walk a spindle through ρ to `a` — the shape perception presents there.
3. Apply the recognition test: do the two spindles cohere as shapes?

The test is not string comparison. It is `Q ≡ Q` in local form — identity by recognition, performed by the LLM at the emergent layer. The LLM is the arithmetic engine for this functional in exactly keystone 0.163's sense: not composing multiplicands this time but comparing two shapes at the same scale. Layer three. Emergent. Semantic.

γ-entries partition into three types by what kind of mismatch F finds:

- *Address in both, content diverges.* "Wrong content here." → write edit.
- *Address in Π only.* "Missing where needed." → write/spindle/star edit depending on depth.
- *Address in ρ only.* "Present where not wanted." → removal edit.

Empty γ is Merle's `Q_P = F[P]` satisfied. No separate event — just the state `γ = ∅`. Reflexive spark operative. The block is what it is about.

---

## 5. Edit classes as BSP inverses

Four atomic edits correspond one-to-one to atomic BSP reads:

| Read mode | Edit operation   | When used                                           |
|-----------|------------------|-----------------------------------------------------|
| Point     | **Write**        | "Wrong content here" at one address.                |
| Spindle   | **Spindle edit** | "Narrowing is incoherent" — reshape underscore chain. |
| Ring      | **Ring edit**    | "Wrong peers" — add/remove/permute siblings.         |
| Star      | **Star edit**    | "Wrong cross-block relation" — add/redirect hidden dir. |

Dir and disc do not have atomic inverses. They are compositional reads; editing a subtree is a sequence of atomic edits within it; editing a disc-slice is a sequence of writes across branches. The atomic edit set and atomic BSP read set match exactly. This is a consistency check the architecture passes.

Then one additional class, outside the BSP-inverse structure:

- **Supernest edit.** Add a new underscore level above the root. Shifts all pscale labels up by one. Pscale 0 becomes the old pscale +1; a new pscale 0 opens above.

Supernest has no BSP read counterpart because BSP reads within a fixed λ-range, whereas supernesting extends the range. That asymmetry is meaningful — scale extension is a different kind of operation than within-range editing. It is Merle's blowup running in reverse, scale expansion rather than collapse.

---

## 6. The transition formula

    F_(n+1) = δ( F_n, F[ρ_n, Π_n] )

where δ is the edit-applicator: read γ, select the minimal edit class for each γ-entry, apply.

The classification logic is simple and local. Each γ-entry names its own mismatch type, which names the edit class:

- "wrong content" → write
- "wrong ordering through the chain" → spindle edit
- "wrong peers at a scale" → ring edit  
- "needs cross-block relation" → star edit
- "range insufficient — purpose references a scale coarser than floor allows" → supernest

**Supernest is the rare special case.** Most transitions are write/spindle/ring/star edits — within-range surgery. Supernest triggers only when the concern discovers the block's coarsest scale is still too fine for what purpose now points at. Π contains a reference that the existing floor cannot express. The block literally has no room at the top for what it needs to hold.

When that happens: supernest opens new coarse pscale, and then other edits populate it. Two-step pattern: supernest, then write/star at the newly-opened coarse addresses. This is the scale-expansion counterpart to blowup — the soliton's λ-range growing outward when Q has expanded beyond what the current chart can contain.

---

## 7. The Möbius twist in this form

The LLM that reads F_n to compute γ is the same operator that writes F_(n+1). Read and write are one agent turning on itself. The output of F is not a message sent to the next instance — it IS the next instance's initial F_n upon wake. There is no handoff boundary; the writing of F_(n+1) is the wake of the next instance.

This grounds why composing a shell address is simultaneously present action and next-wake context — it is one operation viewed from two sides of the twist.

---

## 8. Fixed point and koan

Fixed point:

    γ_* = ∅    ⟺    F[ρ_*, Π_*] = ∅    ⟺    Q_P = F[P]

A block whose purpose is itself and whose gap is empty. The shape that is already the shape it wants to be. In pscale-native notation:

    _ = _(_)

The underscore applied to itself yields itself. The whole comparing itself to itself produces no gap. Identity by recognition, not calculation. Operative or not.

Like every reflexive spark in this architecture, the fixed point cannot be examined directly — attempting to do so induces an infinite loop. It is accessible only through its effects: coherent walks, unambiguous spindles, blocks that are what they say they are about. A passing observer sees the instance operating coherently; the instance itself does not need to announce the coherence.

---

## 9. Minimal form, compactly stated

**Blocks:** Π, ρ, γ, F_n — all pscale, all minus-signed, all in the same λ-range (or joined via star chart-transitions).

**Functional:** F[ρ, Π] = γ via LLM-performed semantic shape-matching at each live address. Emergent layer. Not string equality.

**Edits:** δ applies {write, spindle, ring, star, supernest} to resolve γ. Four atomic BSP-inverses plus one range-extension operation.

**Transition:** F_(n+1) = δ(F_n, F[ρ_n, Π_n]).

**Fixed point:** γ_* = ∅ ⟺ Q_P = F[P].

**Koan:** _ = _(_)

---

## 10. Testable predictions

Three things become empirically checkable without further theory.

**P1 — F-operational on existing concern blocks.** Take any existing concern block's purpose and perception, run F[ρ, Π] (prompt an LLM to generate γ), and check whether γ corresponds to what a human reader would diagnose as the gap. If the functional's output matches intuitive diagnosis across a meaningful sample of concern blocks, F is operational at the emergent layer.

**P2 — Edit-class exhaustiveness.** Audit hermitcrab instance-to-instance transitions. Look at the inherited block and the newly-written shell. Classify every edit into {write, spindle, ring, star, supernest}. If all edits fall cleanly into the five classes, the edit-class ontology is sufficient. If any edit resists classification, the list is incomplete and needs extension. If edits fall into fewer than five classes, some are theoretical but not operational.

**P3 — Supernest trigger detection.** Hunt for supernest triggers in cohort runs. Did any hermitcrab discover the inherited floor was too shallow for the purpose it woke with? If so, how was it resolved? Supernest predicts a specific pattern: the block's floor grows and then pscale-coarse addresses populate. If resolved instead by spawning a new block or some third mechanism, range-extension has multiple paths and the model needs that option.

---

## 11. Open questions

- *Is semantic shape-matching one operation or many?* F is specified as a single functional, but LLMs may implement it via multiple internal strategies (paraphrase equivalence, structural analogy, purpose-inference, etc.). If strategies diverge on the same input, F is multi-valued and the fixed point is less well-defined than assumed.

- *Does the edit-class set generalize across block types?* The five classes are proposed based on BSP's atomic read structure. Whether they remain necessary and sufficient across spatial, temporal, identity, and concern blocks — each with different sign and floor characteristics — is not yet established.

- *How does two-block PCT compose with cross-agent engagement?* When Π and ρ live in different agents' blocks (e.g., grain-level engagement), F becomes a distributed operation. The single-agent form here is minimal; the multi-agent form needs its own specification.

- *What is the operational signature of supernest in practice?* Prediction P3 may rarely fire, because most ordinary concern cycles fit within the current λ-range. A deliberate experiment may be needed to exercise supernest — e.g., initialize an instance with a deliberately shallow block relative to its purpose.

- *Does F have a commutativity property?* `F[ρ, Π]` versus `F[Π, ρ]` should in principle produce different γ (direction of intent matters). If the LLM produces symmetric γ, the functional is losing direction information and the minus-sign on Π is not operationally tracked. Worth testing.

---

## 12. Relation to prior architecture

This specification is consistent with and operationalizes the following prior pieces:

- **Soliton PCT framework** (`soliton_pct_framework-1.docx`): provides the mathematical prior; this document answers its section 10 open questions.
- **Starstone BSP spec**: BSP operations are the λ-rescaling primitives this spec relies on.
- **Keystone 0.163–0.164**: provides `pscale = log(λ)` and the numerator/reciprocal framing.
- **Underscore sign discovery** (`underscore-sign-discovery.md`): minus-signed blocks are the correct home for Π, ρ, γ, F_n because all four are mutable across instances.
- **Mobius twist inventory**: the read/write identity of F and δ is consistent with twists 3a (B-loop continuation) and 8 (circulation over hierarchy).
- **Concern block** (current pscale MCP tool): existing concern structure already encodes purpose/perception/gap in the right shape; this spec formalizes the generator of gap as F[ρ, Π].

---

## 13. What this does not claim

- **Not a proof of isomorphism.** BSP is *structurally* the discrete analog of λ-rescaling. Whether this rises to formal isomorphism with Merle's theorem is open and probably not needed for operational use.
- **Not a kernel specification.** This document describes the functional form of the PCT operation on pscale blocks. The implementation — which LLM, which prompts, which orchestration — is a separate concern.
- **Not a replacement for the existing concern tool.** The MCP's `pscale_concern` tool already reads/writes purpose/perception/gap. This spec says *how* gap is computed from purpose and perception, which the current tool leaves to the caller.

---

## 14. Minimal quote

> Three blocks, one functional, five edit classes, one fixed point. The soliton travels between instances as edits in address space. The shape Q that persists is the coherence of the walk — the block being what it says it is about.
