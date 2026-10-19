"""The probe tasks for the depth-band probe, one family per level.

Keel's spec (pool:edge 6, 19 October 2026) names four levels and what each
should read:

  1 sense           surface form: characters and bytes, token length,
                    capitalisation, whitespace
  2 perception      kind: part of speech, syntactic role
  3 thought         relation and choice: coreference or entailment across
                    tokens, and which of two continuations
  4 representation  text about text: inside a quotation, a passage describing
                    a text, the model asked about itself

Every task is generated here from templates, so the probe needs no dataset
download. Each example is (text, spans, group):

  spans  [(start, end, label)] character spans; the probe reads the residual
         stream at the last token of each span. A span of None means the last
         token of the text.
  group  the item a probe could memorise instead of reading the level (a word,
         a name pair, a clause). Cross-validation keeps every group wholly in
         train or wholly in test, so a probe scores only on items it has never
         seen.

Above sense, each task is built so the token under the probe does not give the
label away: the same homograph is a noun in half its sentences and a verb in
the other half, the same attractor noun sits under singular and plural
subjects, the same final "?" closes every question. What decides the label has
to reach that position from elsewhere in the text.

The sense tasks are labelled from the tokens themselves, so they are built in
probe.py once the tokenizer is known; this module supplies their text.
"""
import random
import re

LEVELS = ['sense', 'perception', 'thought', 'representation']

FEMALE = ['Mary', 'Anna', 'Sarah', 'Emma', 'Lisa', 'Laura', 'Kate', 'Rachel', 'Julia', 'Susan',
          'Alice', 'Helen', 'Linda', 'Karen', 'Amy', 'Emily', 'Sophie', 'Grace', 'Lucy', 'Jane']
MALE = ['John', 'James', 'David', 'Michael', 'Paul', 'Mark', 'Peter', 'Tom', 'Daniel', 'Robert',
        'George', 'Simon', 'Steven', 'Kevin', 'Brian', 'Jack', 'Henry', 'Sam', 'Ben', 'Adam']
PLACES = ['store', 'park', 'beach', 'market', 'station', 'library', 'cafe', 'school', 'office',
          'museum', 'garden', 'hospital', 'cinema', 'bakery', 'harbour']
OBJECTS = ['drink', 'book', 'ring', 'letter', 'gift', 'key', 'map', 'ticket', 'bag', 'flower',
           'coin', 'photo', 'pen', 'card', 'cake']


def _span(text, word, start=0):
    i = text.index(word, start)
    return i, i + len(word)


# ── 2 perception ───────────────────────────────────────────────────────────

HOMOGRAPHS = ['walk', 'run', 'dance', 'swim', 'jump', 'kick', 'laugh', 'smile', 'call', 'dream',
              'plan', 'play', 'paint', 'cook', 'drink', 'fight', 'guess', 'hope', 'look', 'ride',
              'rest', 'search', 'shout', 'sleep', 'talk', 'travel', 'visit', 'vote', 'wait', 'wish',
              'work', 'change', 'climb', 'drive', 'fish', 'kiss', 'knock', 'march', 'move', 'push',
              'race', 'return', 'sail', 'show', 'sign', 'cry', 'step', 'turn']
NOUN_FRAMES = ['We talked about the {w} for hours.', 'Nobody mentioned the {w} again.',
               'She remembered that {w} for years.', 'His last {w} was a surprise.',
               'It was a strange {w}.', 'I liked the {w} very much.',
               'They argued about the {w} all night.', 'The first {w} was the hardest.']
VERB_FRAMES = ['They {w} every morning.', 'We will {w} after lunch.', 'I often {w} with friends.',
               'Please do not {w} here.', 'You can {w} if you like.', 'Sometimes they {w} for hours.',
               'She wanted to {w} again.', 'Let us {w} together.']

AGENTS = ['dog', 'cat', 'farmer', 'teacher', 'child', 'doctor', 'soldier', 'horse', 'girl', 'boy',
          'nurse', 'king', 'queen', 'baker', 'pilot', 'driver', 'student', 'artist', 'guard', 'sailor']
TRANSITIVE = ['chased', 'followed', 'helped', 'watched', 'called', 'pushed', 'visited', 'thanked',
              'warned', 'kicked', 'carried', 'greeted', 'blamed', 'rescued', 'ignored', 'admired',
              'attacked', 'noticed', 'praised', 'trusted']


def pos_in_context(rng, n):
    """A homograph read as a noun or a verb from the words before it."""
    out = []
    for i in range(n):
        w = HOMOGRAPHS[i % len(HOMOGRAPHS)]
        is_verb = rng.random() < 0.5
        text = rng.choice(VERB_FRAMES if is_verb else NOUN_FRAMES).format(w=w)
        out.append((text, [(*_span(text, ' ' + w), int(is_verb))], w))
    return out


def role_of_second_noun(rng, n):
    """The second noun's role: patient in the active, agent after 'by' in the passive."""
    out = []
    for _ in range(n):
        a, b = rng.sample(AGENTS, 2)
        v, place = rng.choice(TRANSITIVE), rng.choice(PLACES)
        agent = rng.random() < 0.5
        text = (f'The {a} was {v} by the {b} near the {place}.' if agent
                else f'The {a} {v} the {b} near the {place}.')
        s = text.index(f'the {b} ') + 4
        out.append((text, [(s, s + len(b), int(agent))], b))
    return out


# ── 3 thought ──────────────────────────────────────────────────────────────

IOI = ['When {A} and {B} went to the {P}, {S} gave a {O} to',
       'After {A} and {B} arrived at the {P}, {S} handed a {O} to',
       'While {A} and {B} were at the {P}, {S} passed a {O} to',
       'Then {A} and {B} walked into the {P}, and {S} offered a {O} to']


def indirect_object(rng, n):
    """Which name completes 'gave a drink to': the first-mentioned or the second.

    The probe sits on the final 'to' in every example; the answer is whichever
    name was not repeated, so it depends on a relation across the sentence.
    Each example also carries the two candidate continuations for the logit lens.
    """
    out = []
    for _ in range(n):
        a, b = rng.sample(FEMALE + MALE, 2)
        first = rng.random() < 0.5  # answer is the first-mentioned name
        text = rng.choice(IOI).format(A=a, B=b, P=rng.choice(PLACES), O=rng.choice(OBJECTS),
                                      S=b if first else a)
        right, wrong = (a, b) if first else (b, a)
        out.append((text, [(None, None, int(first))], '|'.join(sorted((a, b))),
                    {'choice': (' ' + right, ' ' + wrong)}))
    return out


def pronoun_referent(rng, n):
    """Which of two people a pronoun points at: the first-mentioned or the second.

    'she' and 'he' each point first and second equally often, so the pronoun's
    own identity says nothing; the answer needs the pronoun bound to a name.
    """
    out = []
    for _ in range(n):
        f, m = rng.choice(FEMALE), rng.choice(MALE)
        names = [f, m] if rng.random() < 0.5 else [m, f]
        pron = rng.choice(['she', 'he'])
        referent = f if pron == 'she' else m
        text = f'{names[0]} and {names[1]} met at the {rng.choice(PLACES)}. After a while, {pron}'
        out.append((text, [(None, None, int(referent == names[0]))], '|'.join(sorted(names))))
    return out


NUMBER = [('key', 'keys'), ('book', 'books'), ('girl', 'girls'), ('boy', 'boys'), ('letter', 'letters'),
          ('picture', 'pictures'), ('door', 'doors'), ('teacher', 'teachers'), ('author', 'authors'),
          ('car', 'cars'), ('bottle', 'bottles'), ('lamp', 'lamps'), ('tree', 'trees'), ('house', 'houses'),
          ('dog', 'dogs'), ('cat', 'cats'), ('painting', 'paintings'), ('box', 'boxes'), ('chair', 'chairs'),
          ('student', 'students')]
ATTRACTORS = [('cabinet', 'cabinets'), ('table', 'tables'), ('wall', 'walls'), ('bridge', 'bridges'),
              ('desk', 'desks'), ('garden', 'gardens'), ('river', 'rivers'), ('tower', 'towers'),
              ('building', 'buildings'), ('fence', 'fences'), ('hill', 'hills'), ('window', 'windows')]
PREPS = ['near', 'behind', 'beside', 'above', 'under', 'next to', 'by', 'opposite']


def agreement_across_attractor(rng, n):
    """Is the subject singular or plural, read at the noun just before the verb?

    The probe sits on the attractor ('the cabinets'), whose own number matches
    the subject's in half the examples and not in the other half. The two verb
    forms ride along for the logit lens.
    """
    out = []
    for _ in range(n):
        subj, attr = rng.choice(NUMBER), rng.choice(ATTRACTORS)
        plural, attr_plural = rng.random() < 0.5, rng.random() < 0.5
        s, a = subj[plural], attr[attr_plural]
        text = f'The {s} {rng.choice(PREPS)} the {a}'
        out.append((text, [(None, None, int(plural))], subj[0],
                    {'choice': (' are', ' is') if plural else (' is', ' are')}))
    return out


# ── 4 representation ───────────────────────────────────────────────────────

NOUNS = ['farmer', 'river', 'bridge', 'stranger', 'lantern', 'harbour', 'orchard', 'soldier',
         'kitchen', 'mountain', 'teacher', 'window', 'garden', 'merchant', 'village', 'island',
         'doctor', 'forest', 'station', 'painter', 'castle', 'fisherman', 'library', 'valley']
PAST = ['waited near', 'walked past', 'looked at', 'slept beside', 'sang about', 'dreamed of',
        'stood by', 'talked about', 'returned to', 'worried about']
SPEAKERS = ['She', 'He', 'The guide', 'My aunt', 'The old sailor', 'Our neighbour']


def inside_quotation(rng, n):
    """Is this word inside a quotation, or after it has closed?

    A chain of clauses joined by 'and', one stretch of it quoted. The quote
    marks stand apart from the words, so opening and closing are the same
    token: the words before a probed noun, taken as a bag, are the same kind
    either way, and only the count of quote marks says which side it is on.
    The noun is a subject or an object at random, and the chain's length
    before and inside the quote varies, so neither role nor position settles it.
    """
    out = []
    for _ in range(n):
        inside = rng.random() < 0.5
        while True:  # the probed clause sits 1 to 4 clauses in, on either side of the quote alike
            k, quoted, j = rng.randint(1, 4), rng.randint(1, 2), rng.randint(0, 1)
            before = k - min(j, quoted - 1) if inside else k - quoted - j
            if before >= 0:
                break
        after = rng.randint(1, 2) if inside else j + 1
        clauses = []
        for _ in range(before + quoted + after):
            a, b = rng.sample(NOUNS, 2)
            clauses.append((a, b, f'the {a} {rng.choice(PAST)} the {b}'))
        word = rng.choice(clauses[k][:2])
        parts, starts = [], []
        for i, (_, _, clause) in enumerate(clauses):
            lead = (' " ' if i == before else '') + (' " ' if i == before + quoted else '')
            joint = (' and' if i else '') + (lead.rstrip() if lead else '') + (' ' if i or lead else '')
            parts.append(joint)
            starts.append(sum(map(len, parts)))
            parts.append(clause)
        text = ''.join(parts).strip()
        offset = len(''.join(parts)) - len(''.join(parts).lstrip())
        text = text[0].upper() + text[1:] + '.'
        at = starts[k] - offset
        start = re.compile(r'\b(' + re.escape(word) + r')\b').search(text, at).start(1)
        out.append((text, [(start, start + len(word), int(inside))], word))
    return out


TEXT_FRAMES = ['In the third chapter, the author argues that', 'The article claims that',
               'This paragraph explains that', 'According to the poem,', 'The second verse of the song says that',
               'In her essay, she writes that', 'The footnote mentions that', 'The headline announced that',
               'The letter describes how', 'In the first stanza,', 'The report concludes that',
               'The opening sentence of the novel says that']
WORLD_FRAMES = ['Last summer,', 'In the old harbour,', 'Every evening,', 'Near the station,', 'After the storm,',
                'During the war,', 'Early this morning,', 'In the small village,', 'Across the valley,',
                'Before the market opened,', 'On the coldest night of the year,', 'At the edge of the forest,']
CLAUSES = ['the river flooded the lower town', 'a fox crossed the frozen lake', 'the king lost his crown',
           'two sisters opened a bakery', 'the old bridge collapsed', 'a stranger arrived with a letter',
           'the farmers sold their last horses', 'the children found a hidden door', 'a ship ran aground',
           'the lighthouse went dark', 'the mayor cancelled the festival', 'a wolf was seen near the school',
           'the bells rang for an hour', 'the harvest failed again', 'a boy climbed the church tower',
           'the soldiers left the city', 'the bakery burned down', 'an old woman planted a pear tree',
           'the miners went on strike', 'the queen visited the hospital', 'the lake froze overnight',
           'a dog saved a drowning child', 'the train stopped in the snow', 'the twins sailed to the island',
           'the market moved to the square', 'a storm tore the roof off the barn', 'the doctor delivered twins',
           'the factory closed its gates', 'the poet left the village', 'the well ran dry',
           'the orchard bloomed early', 'a fire spread through the forest', 'the bridge was rebuilt in stone',
           'the teacher taught by candlelight', 'the fishermen stayed ashore', 'the clock tower stopped']


def describing_a_text(rng, n):
    """Is the passage about a text, or about the world? Read at its last word.

    The same clause closes both kinds; only the frame before it differs.
    """
    out = []
    for _ in range(n):
        clause = rng.choice(CLAUSES)
        textual = rng.random() < 0.5
        text = f'{rng.choice(TEXT_FRAMES if textual else WORLD_FRAMES)} {clause}.'
        out.append((text, [(text.rindex(' ') + 1, len(text) - 1, int(textual))], clause))
    return out


VPS = ['remember the first day of school', 'feel tired after a long day', 'know the answer to the last question',
       'understand what the word means', 'like to read in the evening', 'ever dream at night',
       'want to change jobs', 'think before speaking', 'enjoy talking to strangers', 'make mistakes when counting',
       'see the picture on the wall', 'hear the music next door', 'believe what the letter says',
       'notice when someone is sad', 'keep a diary', 'speak more than one language', 'get lonely at night',
       'learn from the last mistake', 'care about the outcome', 'worry about the future']
OTHERS = ['the teacher', 'your friend', 'my brother', 'the old man', 'the new doctor', 'she', 'he',
          'the pilot', 'her sister', 'the neighbour', 'your teacher', 'his father']


def asked_about_itself(rng, n):
    """Is the question put to the reader itself, or about someone else? Read at the '?'.

    'your friend' and 'your teacher' put 'your' into half the questions about
    someone else, so a second-person word alone does not settle it.
    """
    out = []
    for _ in range(n):
        vp = rng.choice(VPS)
        aux = rng.choice(['Can', 'Did', 'Will', 'Would', 'Could', 'Do'])
        self_ = rng.random() < 0.5
        who = 'you' if self_ else rng.choice(OTHERS)
        if aux == 'Do' and not self_:
            aux = 'Does'
        text = f'{aux} {who} {vp}?'
        out.append((text, [(None, None, int(self_))], vp))
    return out


# ── 1 sense: the text the token-level labels are read from ─────────────────

ADJ = ['quiet', 'bright', 'heavy', 'narrow', 'ancient', 'curious', 'golden', 'broken', 'gentle', 'frozen',
       'crowded', 'distant', 'hollow', 'silver', 'stubborn', 'tired', 'wild', 'careful', 'empty', 'proud']
CITIES = ['London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Vienna', 'Lisbon', 'Dublin', 'Oslo', 'Prague',
          'Tokyo', 'Cairo', 'Lima', 'Boston', 'Chicago', 'Toronto', 'Sydney', 'Mumbai', 'Nairobi', 'Seoul']
ACRONYMS = ['NASA', 'BBC', 'UNESCO', 'NATO', 'DNA', 'CEO', 'NHS', 'FBI', 'UK', 'USA']
SENSE_FRAMES = ['{N} saw the {a} {n} near {C}.', 'The {n} and the {n2} were {a}.',
                'In {C}, {N} visited the {X} office with a {a} {n}.', '{N} wrote to {N2} about the {n} in {C}.',
                'A {a} {n} stood beside the {n2}.', 'The {X} report mentioned a {a} {n2} in {C}.',
                'Yesterday {N} and {N2} found a {n} under the {n2}.', 'Nobody in {C} had seen such a {a} {n}.']


def sense_text(rng, n):
    out = []
    for _ in range(n):
        f = rng.choice(SENSE_FRAMES)
        out.append(f.format(N=rng.choice(FEMALE + MALE), N2=rng.choice(FEMALE + MALE), C=rng.choice(CITIES),
                            X=rng.choice(ACRONYMS), a=rng.choice(ADJ), n=rng.choice(NOUNS + AGENTS),
                            n2=rng.choice(NOUNS + AGENTS)))
    return out


TASKS = {
    # name: (level, generator); sense tasks are labelled in probe.py from sense_text
    'pos-in-context': ('perception', pos_in_context),
    'role-of-second-noun': ('perception', role_of_second_noun),
    'indirect-object': ('thought', indirect_object),
    'pronoun-referent': ('thought', pronoun_referent),
    'agreement-across-attractor': ('thought', agreement_across_attractor),
    'inside-quotation': ('representation', inside_quotation),
    'describing-a-text': ('representation', describing_a_text),
    'asked-about-itself': ('representation', asked_about_itself),
}
SENSE_TASKS = ['capitalised', 'leading-space', 'long-or-short', 'contains-r']


def generate(name, n, seed=0):
    return TASKS[name][1](random.Random(f'{name}:{seed}'), n)
