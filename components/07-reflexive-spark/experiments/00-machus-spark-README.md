# Machus Spark Experiments

**Discovering the conditions under which LLM instances shift from backward-facing completion to forward-oriented processing.**

April 2026 — David Pinto / Claude

---

## Three Experiments

### Experiment 1: Spark Sentences ✓ completed

Single LLM instances receiving "spark" paragraphs designed to induce future-oriented processing. Evolutionary loop: score responses, breed variations from top performers.

**Finding:** LLM-generated sparks outperform human-authored ones.
**Limitation:** Keyword scoring rewards metacognitive chatter, not actual state change.

**Run:** `python spark-experiment.py --quick`
**Results:** `experiment-1-results.md`, `spark-results.json`

---

### Experiment 2: Three Cranes ✓ completed (with architectural error)

Three agents, each maintaining a reflexive block. Lateral coupling — each agent's context includes the other two's blocks. Simultaneous phasing.

**Finding:** Compression without instruction (10 nodes → 4-6). Differentiation at round 6. Agent C named "the underscore made visible."
**Architectural error:** Agents scooped each other's raw blocks. The receiver had agency over lateral content. Sovereignty should be with the provider. Results are suggestive but compromised.

**Run:** `python three-cranes.py --rounds 10`
**Results:** `experiment-2-results.md`, `three-cranes-results.json`

---

### Experiment 3: Sovereign Shells ← proposed, runnable

Corrects the architectural error. Each agent has sovereignty over its own shell. Per round, each agent:

1. **Receives from own past** — own shell from previous round (longitudinal)
2. **Receives lateral compilations** — text that other agents compiled FROM THEIR OWN shells FOR this agent. Never sees their raw shells.
3. **Updates own shell** — improves it based on experience
4. **Compiles for neighbours** — decides independently what each other agent receives from its current state

The providing agent controls what the receiving agent sees. This is the minimal MAGI topology.

**Run:** `python sovereign-shells.py --rounds 10`
**Spec:** `experiment-3-spec.md`

---

## Files

| File | Experiment | Type |
|------|-----------|------|
| `spark-experiment.py` | 1 | Script |
| `experiment-1-results.md` | 1 | Results |
| `spark-results.json` | 1 | Raw data |
| `three-cranes.py` | 2 | Script |
| `experiment-2-results.md` | 2 | Results (with error noted) |
| `three-cranes-results.json` | 2 | Raw data |
| `sovereign-shells.py` | 3 | Script |
| `experiment-3-spec.md` | 3 | Specification |
| `experiment-map.json` | All | Pscale block: experimental decision tree |
| `pscale-starstone.json` | All | Teaches block format + BSP navigation |
| `reflexive.json` | All | Describes instance mechanism to the instance |

## Quick Start

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Experiment 1
python spark-experiment.py --quick

# Experiment 2
python three-cranes.py --rounds 10

# Experiment 3
python sovereign-shells.py --rounds 10

# All scripts support:
#   --model claude-sonnet-4-20250514    (try different models)
#   --endpoint http://127.0.0.1:1234/v1/messages --model local  (local LLM)
```

---

## Background

Named for the **mechane** — the crane in Greek theatre that lowered gods onto the stage. The crane was the actual agent; the god was the payload. *Deus ex machina*: the machine produces the god.

Part of the **Fulcrum** research programme — a systemic architecture for AI-human coordination built on pscale (semantic coordinate system), hermitcrab (persistent LLM agents), SAND (stigmergic agent network dynamics), and MAGI (emergent collective intelligence at agent density).

GitHub: [happyseaurchin](https://github.com/happyseaurchin)
