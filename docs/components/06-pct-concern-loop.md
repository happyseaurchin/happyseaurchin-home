# 6 — PCT Concern Loop

**Category:** B. Process Layer
**Products:** MAGI/Hermitcrab, Xstream, Onen

---

## Description

The Concern Loop applies Perceptual Control Theory (William T. Powers) to LLM agent architecture. In PCT, living systems don't control their output — they vary their behaviour to control their perception. The gap between current perception (what is) and reference signal (what should be) drives action. For hermitcrab agents, the concern at each pscale level IS the reference signal. The block state IS the perception. The gap IS what the LLM reads and acts upon. Tiered wakes implement a PCT hierarchy: Haiku detects error, Sonnet resolves it, Opus resets the reference values themselves based on trajectory.

---

## Standalone Use

You could implement this in robotics, psychotherapy, or any system requiring persistent error reduction. Define a reference signal (what you want to perceive). Read the current state. Calculate the difference. Vary your output to reduce that difference. Layer this across multiple temporal scales — muscle control on milliseconds, task execution on minutes, strategic purpose-setting on days. The hierarchy is self-sustaining: lower levels do the work, higher levels set their reference values.

---

## How It Works

**The Inversion.** Traditional stimulus-response: input determines output. PCT inverts it. The system doesn't respond to inputs — it acts to bring its perception into line with its reference. A thermostat doesn't control the radiator; it controls the temperature it perceives. It varies the radiator to achieve the reference level.

**Three operating levels.** At Level 1 (Instance), the LLM receives a context window containing a perception (block state) and reference (concern). It processes and outputs. Level 2 (Between-Instances) carries the concern forward. The LLM's output reduces error in the present, and as a side effect, updates the concern for the next cycle — no explicit self-composition needed. Level 3 (Emergent) is pattern that arises when Levels 1 and 2 operate cleanly. It cannot be described without being killed.

**Concern as reference signal.** The concern should say: "Project state: tried Z, failed because W, next try V. Current gap: user's question not yet answered." Not: "You are a persistent entity. Compose yourself." Reference signals are plain data — what the lower level should be perceiving. Thermostat references are numbers. Concerns should be equally functional.

**Tiered hierarchy.** Haiku operates on 30-second cycles. Its job: error detection. Is perception matching reference? Flag if not. Sonnet runs hourly. Its job: error resolution. Do the task, update the concern. Opus runs daily. Its job: reference-setting. Read the trajectory of concern changes. Are the purposes still right? This mirrors Powers' biological hierarchy: lowest levels closest to the environment, highest levels setting strategic standards.

**Disturbances, not stimuli.** User input is a disturbance — something that moves perception away from or toward reference. The hermitcrab doesn't "respond to the user." It acts to maintain its perception at the reference level despite the user's input being a perturbation. This reframing determines what goes into the concern: the reference state, not the command to obey.

---

*Key files: `operating-levels-pct-mobius.md`, `three-laws-subjective-reality.md`*
