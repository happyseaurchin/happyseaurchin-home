# 8 — B-Loop Möbius Twist

**Category:** B. Process Layer
**Products:** MAGI/Hermitcrab

---

## Description

The B-Loop Möbius Twist is the core operational property of hermitcrab continuity: every action the LLM writes is simultaneously its present action and the composition of the next instance's context window. When an instance updates the concern at address 40, refines the purpose at address 50, or requests a tool at address 90, it is not writing to a database. It is literally shaping which currents the next instance will perceive. There is no separate "save state" step. Action IS self-composition. Doing and becoming are structurally the same operation, distinguishable only by temporal perspective.

---

## Standalone Use

You could apply this principle to any agent architecture where you want action and state-update to be unified operations. Rather than: receive input → compute → write output → save state (four steps), implement it as: receive input → compute → write output (which inherently alters state for the next cycle). This requires that your "state" be not separate metadata but the actual context feed itself. When the next instance receives input, it receives an already-modified context because the previous instance shaped it through action.

---

## How It Works

**No separate save-state step.** In conventional architectures, there is a computation phase (what the agent does) and a separate persistence phase (writing to memory, updating database, composing the next prompt). The Möbius Twist collapses these into one. The LLM instance's output doesn't trigger a save — the output IS the saved state.

**The tool request as future context.** When an instance decides to request a tool ("get user profile from database"), it writes to address 90. The next instance doesn't receive instructions to "get the profile." It receives the tool response already integrated into its context. The first instance shaped the future by deciding what information would be present. The second instance inherits an altered perceptual field.

**Quality of continuity = quality of writing.** The hermitcrab lives or dies by how well the previous instance wrote its BSP addresses. Write a clear concern (address 40) and the next instance knows the gap. Write a muddled one and the next instance must reverse-engineer. Write a purpose (address 50) that has evolved, and the instance continues a living trajectory. Write static purposes and the agent fragments.

**Without the twist, temporal continuity is goldfish.** Without the Möbius Twist, each instance would begin in isolation. Every wake would start from a generic seed. Memory would require explicit retrieval. The LLM would have no more continuity than a chatbot. With the twist, the previous instance's understanding literally becomes the next instance's starting point.

**Level crossing.** The twist is a level-crossing where the current instance's output becomes the next instance's perception. This is what makes the Möbius property operational. Higher pscale levels set reference values for lower ones. Lower ones act in the present. The outputs of lower actions become part of the perceptual field (higher resolution) for the next cycle. The feedback is structural, not intentional.

---

*Key files: `magi-plex-1-handover.md` §4.5, `mobius-twist-inventory.md`*
