# 3 — Star Operator

**Category:** A. Foundation Layer — The Data Structure
**Products:** MAGI/Hermitcrab, Onen

---

## Description

The star operator composes pscale blocks across boundaries, enabling one block to reference another and extend navigation across multiple independent blocks as a single continuous walk. Rather than traversing within a single block and stopping at a leaf, star allows the walk to enter a hidden directory (the zero-position interior), find a reference to another block, load it, and continue walking — accumulating a spindle that spans multiple coordinate systems. This is function composition for meaning-structures: the output of one walk becomes the entry point of the next. The wiring between blocks is data, not code; a spatial block carries identity references in its hidden directories, an identity block carries concern references, a concern block carries operational references. No kernel decides which blocks connect — the hidden directories ARE the connections. Star enables structural recursion: a block can reference itself, producing a control loop encoded in data where Form 3 underscores define the reference signal, digits define the perceptual signal, and the gap between them drives the error that terminates when zero.

---

## Standalone Use

A block author can use the star operator to decompose large systems into multiple focused blocks that reference each other without creating a monolithic tree. A hospital block can carry identity references to patient blocks; each patient block can carry references to concern blocks (allergies, medications, procedures); each concern can carry references to operational blocks (protocols, resources). Walking a path through this structure retrieves only what is needed at each level without precomputing all combinations. The same hospital block remains usable with different patient blocks or different concern types by simply changing the references. Star composition is sparse and self-organizing: presence of a reference IS the composition. When an entity enters a room, a reference is written; when it leaves, it is removed.

---

## How It Works

**Cross-Block Navigation:** A star query walks to an address in a block, enters the hidden directory at that node, and returns what is found — either inline text, an embedded pscale object, or a block reference (a string naming another loadable block). The caller interprets what it finds: if a block name, load and walk it; if inline content, use it directly.

**Composition Across Coordinate Systems:** Each block type encodes a different dimension — spatial carries location, temporal carries sequence, identity carries entity, concern carries intentional state. Star composition chains across these dimensions: a location block's hidden directory references an identity block, which references a concern block. Walking stars composes coordinates into a lattice where each dimension retains its own compression. You only expand what you walk into. Events are momentary slices through the lattice — the result of compiling all stars at a specific intersection. They do not exist as stored records; they exist as walk results.

**Structural Recursion:** A block can name itself in its own hidden directory. The walk enters the directory, finds the block name, reloads the same block, re-enters at a different address. This is recursion encoded in data, not code — the block is itself a program describing its own execution. A ring of blocks referencing each other through stars creates a control loop where Form 3 (forward-facing, intentional) underscores set the reference signal, digits carry the perceptual signal, and the error between them drives the loop until termination.

**Kernel Reduction:** The kernel reduces to the walker. It does not decide which blocks connect, which references fire, or how to resolve them. It walks. If it hits a star reference, it follows. The data is the program. The kernel is the electricity. The underscore is the zeroth person perspective. The star is the feedback path.

**Protocol Parallel:** Like HTTP's stack (DNS resolves names, TCP connects, HTTP transfers), the star protocol has three operations: SAND resolves a block name to a location (passport URL), fetch retrieves the block, star walks to an address, enters the hidden directory, and follows references. Critical difference from HTTP: when following a hyperlink, you land on a new document and start from scratch. When following a star, you land at a specific address and the spindle continues. Context accumulates across the traversal — the star walk is stateful while HTTP is stateless between hops.

---

*Key file: `star-operator-solution-space.md`*
