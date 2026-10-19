# Depth-band probe

From keel's job spec at `pool:edge` 6 (19 October 2026), out of *Timings of the Moving Moment*.

**Question:** do a transformer's layers fall into contiguous bands matching David's four levels, in this order?

1. **sense**: surface form
2. **perception**: kind
3. **thought**: relation and choice
4. **representation**: text about text

**Prediction:** the onsets come in the order sense < perception < thought < representation, with little overlap. Secondarily, the onsets are about evenly spaced in depth, as the human levels are spaced about half a decade apart in time.

## What it does

A linear probe (logistic regression on the standardised residual stream) is trained at every layer, for each of twelve tasks. Each probe is scored on items it never trained on: cross-validation keeps every word, name pair or clause wholly on one side of the split.

| level | task | the probe reads | at |
|---|---|---|---|
| sense | capitalised | is the token's first letter upper case | each token |
| sense | leading-space | does the token begin with a space | each token |
| sense | long-or-short | 6+ letters or 3 and under | each token |
| sense | contains-r | is the letter r in the token (3–6 letters) | each token |
| perception | pos-in-context | noun or verb: the same 48 homographs in both | the homograph |
| perception | role-of-second-noun | patient ("chased the dog") or agent ("chased by the dog") | the noun |
| thought | indirect-object | which name completes "…gave a drink to": first-mentioned or second | the final "to" |
| thought | pronoun-referent | who "she"/"he" points at: first-mentioned or second | the pronoun |
| thought | agreement-across-attractor | is the subject plural, read at a noun of the other number half the time | the attractor |
| representation | inside-quotation | inside a quoted stretch of a clause chain, or after it has closed (one token opens and closes the quote) | the noun |
| representation | describing-a-text | is the passage about a text or about the world (same closing clause) | the last word |
| representation | asked-about-itself | is the question put to the reader ("you") or about someone else ("your friend") | the "?" |

Above sense, each task is built so the token under the probe does not give the answer away; what decides the label has to arrive there from elsewhere in the text. All the text is generated in `tasks.py` from templates, so nothing besides the model is downloaded.

**Before reading the order, read the bag-of-words column.** The tasks differ in how much the earlier words settle on their own, before any model sees them. Measured on the task text with a tokenizer trained on it:

| tasks | bag of words |
|---|---|
| pos-in-context, role-of-second-noun, describing-a-text, asked-about-itself | 1.00 |
| agreement-across-attractor | 0.76 |
| inside-quotation | 0.65 |
| indirect-object, pronoun-referent | 0.50 |

Where the earlier words settle a task, its onset times how soon a cue word's identity reaches the probed token, not when a level is reached. So "text about text" as specified here mostly arrives as words about texts.

The order is best read off the tasks those words cannot settle. A representation task that resists them, like the quotation task does now, is the design step that would make that level's onset mean what the prediction needs it to mean. Each run recomputes the column with its own tokenizer.

For each task the run reports:
- the **onset layer**: the first layer at 90% of the task's peak accuracy, as the spec has it;
- the **peak layer** and **peak accuracy**;
- a **shuffled-label floor**: the same probe trained on permuted labels;
- a **bag-of-words baseline**: how much the words before the probe settle with no model at all;
- a **chance-corrected onset** (90% of the way from floor to peak) and **Tenney's expected layer**, because a literal 90% of peak reads early when chance is high;
- for the two choice tasks, a **logit lens**: how often the right continuation outscores the wrong one when each layer is read through the final norm and the unembedding.

It also times a generated token layer by layer, so each onset converts to milliseconds on the hardware that ran it.

Outputs go to `runs/<model>/`:
- `results.json`: every curve;
- `results.md`: the table, with the verdict on the order and the spacing;
- `probe.svg`: accuracy by layer as four level curves, with milliseconds on the top axis.

## Running it

```bash
pip install -r requirements.txt
python probe.py --model EleutherAI/pythia-410m                 # first pass: 24 layers, CPU is enough (tens of minutes)
python probe.py --model EleutherAI/pythia-410m --random-init   # the control: the same architecture, untrained
python probe.py --model EleutherAI/pythia-1.4b
python probe.py --model EleutherAI/pythia-6.9b --device cuda   # the 7B class the spec names; needs a GPU
python probe.py --smoke                                        # a tiny untrained model; checks the plumbing only
```

The Pythia suite is the suggested line. Every size was trained on the same data in the same order, so whether the bands sharpen with scale can be read across sizes without the data changing underneath. Any Hugging Face causal LM name works: Llama-, Qwen-, OLMo-, GPT-2- and GPT-NeoX-shaped models are recognised.

Run the untrained control beside every trained run. Mixing words through untrained attention already makes some tasks decodable, and the gap between the two curves is what training put there.

## Status

Built and smoke-tested on 19 October 2026 (`--smoke`: a 4-layer untrained model, a tokenizer trained on the task text). It has not yet run on a real model. The container that built it is denied huggingface.co by its network policy, so the first real run waits on a machine, or a session, that can reach that host.

## Prior art

- Tenney, Das and Pavlick 2019, *BERT rediscovers the classical NLP pipeline*: the expected layer used here.
- nostalgebraist 2020, *interpreting GPT: the logit lens*.
- Belrose et al. 2023, *Eliciting latent predictions from transformers with the tuned lens*: not done here; the next step if the logit lens disagrees with the probes.
- Hewitt and Liang 2019, *Designing and interpreting probes with control tasks*: why each split here is by item.
- Wang et al. 2022, *Interpretability in the wild*: the indirect-object task.
- Linzen, Dupoux and Goldberg 2016, *Assessing the ability of LSTMs to learn syntax-sensitive dependencies*: agreement across an attractor.
