import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../data/archetypes';
import { ALL_TAGS, DECKS, decksUsing } from '../data/decks';
import { slugify } from '../data/slugify';
import { entropy, optionDelta, scoreDecks, softmax } from './scoring';
import { nextQuestion, rankQuestions, STANDARD_QUIZ } from './selector';
import type { Answer, Deck, Question } from './types';

const POOL: Deck[] = [
  { id: 'a', name: 'A', archetypes: [], intro: '', keyCards: [], tags: ['fast', 'cheap'] },
  { id: 'b', name: 'B', archetypes: [], intro: '', keyCards: [], tags: ['slow', 'cheap'] },
  { id: 'c', name: 'C', archetypes: [], intro: '', keyCards: [], tags: ['fast', 'pricey'] },
  { id: 'd', name: 'D', archetypes: [], intro: '', keyCards: [], tags: ['slow', 'pricey'] },
];

const QUESTIONS: Question[] = [
  {
    id: 'speed',
    prompt: 'Fast or slow?',
    options: [
      { id: 'fast', label: 'Fast', effects: [{ tag: 'fast', weight: 1 }] },
      { id: 'slow', label: 'Slow', effects: [{ tag: 'slow', weight: 1 }] },
    ],
  },
  {
    id: 'cost',
    prompt: 'Cheap or pricey?',
    options: [
      { id: 'cheap', label: 'Cheap', effects: [{ tag: 'cheap', weight: 1 }] },
      { id: 'pricey', label: 'Pricey', effects: [{ tag: 'pricey', weight: 1 }] },
    ],
  },
];

describe('archetype registry', () => {
  it('has unique ids and names', () => {
    const ids = ARCHETYPES.map((a) => a.id);
    const names = ARCHETYPES.map((a) => a.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every id a url-safe slug shape', () => {
    for (const a of ARCHETYPES) {
      expect(a.id, a.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('bases each id on its name, allowing a suffix where slugs collide', () => {
    // "Abyss" and "Abyss-" are separate setcodes that slug identically, so the
    // second takes a numeric suffix rather than overwriting the first.
    for (const a of ARCHETYPES) {
      const base = slugify(a.name);
      expect(a.id === base || new RegExp(`^${base}-\\d+$`).test(a.id), `${a.name} -> ${a.id}`).toBe(
        true,
      );
    }
  });

  it('is reference data only — no tags, no ratings', () => {
    for (const a of ARCHETYPES) {
      expect(Object.keys(a).sort(), a.name).toEqual(['id', 'name']);
    }
  });
});

describe('deck list', () => {
  it('has unique ids', () => {
    const ids = DECKS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only references archetypes that exist', () => {
    const ids = new Set(ARCHETYPES.map((a) => a.id));
    for (const deck of DECKS) {
      for (const archetypeId of deck.archetypes) {
        expect(ids.has(archetypeId), `${deck.name} -> unknown archetype: ${archetypeId}`).toBe(true);
      }
    }
  });

  it('gives every deck at least one archetype and one tag', () => {
    for (const deck of DECKS) {
      expect(deck.archetypes.length, deck.name).toBeGreaterThan(0);
      expect(deck.tags.length, deck.name).toBeGreaterThan(0);
    }
  });

  it('has no blank tags', () => {
    for (const deck of DECKS) {
      for (const tag of deck.tags) expect(tag.trim().length, deck.name).toBeGreaterThan(0);
    }
  });

  it('lists every tag in use exactly once', () => {
    const used = new Set(DECKS.flatMap((d) => d.tags));
    expect(ALL_TAGS).toEqual([...used].sort());
  });

  it('resolves decks back from an archetype', () => {
    for (const deck of DECKS) {
      for (const archetypeId of deck.archetypes) {
        expect(decksUsing(archetypeId).map((d) => d.id)).toContain(deck.id);
      }
    }
  });
});

describe('scoring', () => {
  it('rewards a tag match and penalises a miss', () => {
    const option = QUESTIONS[0]!.options[0]!;
    expect(optionDelta(POOL[0]!, option)).toBeGreaterThan(0);
    expect(optionDelta(POOL[1]!, option)).toBeLessThan(0);
  });

  it('treats a negative weight as "I would rather not"', () => {
    const option = { id: 'x', label: 'x', effects: [{ tag: 'fast', weight: -1 }] };
    expect(optionDelta(POOL[0]!, option)).toBeLessThan(0);
    expect(optionDelta(POOL[1]!, option)).toBeGreaterThan(0);
  });

  it('scores every deck at zero before any answer', () => {
    expect(scoreDecks([], POOL)).toEqual([0, 0, 0, 0]);
  });

  it('separates the pool once both questions are answered', () => {
    const options = [QUESTIONS[0]!.options[0]!, QUESTIONS[1]!.options[0]!];
    const scores = scoreDecks(options, POOL);
    // A is fast + cheap, so it must outscore every other combination.
    expect(Math.max(...scores)).toBe(scores[0]);
  });
});

describe('question selection', () => {
  it('finds a question informative when the pool is split', () => {
    const best = rankQuestions([], 1, POOL, QUESTIONS)[0];
    expect(best).toBeDefined();
    expect(best!.gain).toBeGreaterThan(0);
  });

  it('never repeats a question', () => {
    const answers: Answer[] = [{ questionId: 'speed', optionId: 'fast' }];
    const ranked = rankQuestions(answers, 1, POOL, QUESTIONS);
    expect(ranked.map((r) => r.question.id)).not.toContain('speed');
  });

  it('stops once the questions run out', () => {
    const answers: Answer[] = [
      { questionId: 'speed', optionId: 'fast' },
      { questionId: 'cost', optionId: 'cheap' },
    ];
    expect(nextQuestion(answers, 1, STANDARD_QUIZ, POOL, QUESTIONS)).toBeNull();
  });

  it('stops at the question cap', () => {
    const answers: Answer[] = Array.from({ length: STANDARD_QUIZ.maxQuestions }, (_, i) => ({
      questionId: `q${i}`,
      optionId: null,
    }));
    expect(nextQuestion(answers, 1, STANDARD_QUIZ, POOL, QUESTIONS)).toBeNull();
  });

  it('asks nothing while no questions are defined', () => {
    expect(nextQuestion([], 1, STANDARD_QUIZ, POOL, [])).toBeNull();
  });
});

describe('maths helpers', () => {
  it('softmax normalises and survives extreme inputs', () => {
    const p = softmax([1000, 999, -1000]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(p.every(Number.isFinite)).toBe(true);
  });

  it('entropy is zero for certainty and maximal when flat', () => {
    expect(entropy([1, 0, 0])).toBeCloseTo(0, 9);
    expect(entropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(Math.log(4), 9);
  });
});
