import { describe, expect, it } from 'vitest';
import { ARCHETYPES, ARCHETYPES_BY_ID, familyOf } from './archetypes';
import { AKINATOR_QUESTIONS } from './akinator-questions';
import { buildResults } from '../engine/scoring';
import { nextQuestion } from '../engine/selector';
import type { Answer } from '../engine/types';

const CONFIG = { minQuestions: 8, maxQuestions: 20, confidence: 0.45 };
const POOL = ARCHETYPES.filter((a) => a.tags.length > 0);

/**
 * Play a round as a perfectly informed player: answer every question exactly
 * as the target archetype's own tags say. Anything this cannot find is a fault
 * in the question bank, not in the player.
 */
function play(targetId: string, seed = 7) {
  const target = ARCHETYPES_BY_ID.get(targetId);
  if (!target) throw new Error(`unknown archetype: ${targetId}`);

  const answers: Answer[] = [];
  for (let i = 0; i < 40; i++) {
    const question = nextQuestion(answers, seed, CONFIG, POOL, AKINATOR_QUESTIONS);
    if (!question) break;
    // Every Akinator question is one tag asked as yes/no.
    const tag = question.options[0]!.effects[0]!.tag;
    answers.push({ questionId: question.id, optionId: target.tags.includes(tag) ? 'yes' : 'no' });
  }

  const results = buildResults(answers, POOL, AKINATOR_QUESTIONS);
  return { answers, results, target };
}

describe('akinator question bank', () => {
  it('asks only yes/no questions backed by a derived tag', () => {
    const vocabulary = new Set(ARCHETYPES.flatMap((a) => a.tags));
    for (const question of AKINATOR_QUESTIONS) {
      expect(question.options.map((o) => o.id), question.id).toEqual(['yes', 'no']);
      const tag = question.options[0]!.effects[0]!.tag;
      expect(vocabulary.has(tag), `${question.id} asks about unused tag "${tag}"`).toBe(true);
    }
  });

  it('has no duplicate question ids', () => {
    const ids = AKINATOR_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('guessing a known archetype', () => {
  // Spread across eras, sizes and mechanics, including the two that exposed
  // faults while playtesting: Maliss and the Crystal family.
  const targets = ['maliss', 'crystal', 'blue-eyes', 'labrynth', 'salamangreat', 'snake-eye'];

  for (const id of targets) {
    it(`finds ${id}, or something in its family`, () => {
      const { results, target, answers } = play(id);
      const top = results[0]!;
      const family = new Set(familyOf(target.id).map((a) => a.id));
      expect(
        family.has(top.item.id),
        `wanted ${target.name} (family ${target.family}), got ${top.item.name} after ${answers.length} questions`,
      ).toBe(true);
    });
  }

  it('stops well inside the question cap', () => {
    for (const id of targets) {
      const { answers } = play(id);
      expect(answers.length, id).toBeLessThanOrEqual(CONFIG.maxQuestions);
      expect(answers.length, id).toBeGreaterThanOrEqual(CONFIG.minQuestions);
    }
  });

  // A full round re-ranks every question against every candidate, so a sweep
  // costs far more than the per-answer work the browser ever does.
  it('puts the target in the top five even when it is not first', { timeout: 60_000 }, () => {
    let hits = 0;
    const sample = POOL.filter((_, i) => i % 12 === 0);
    for (const archetype of sample) {
      const { results } = play(archetype.id);
      const family = new Set(familyOf(archetype.id).map((a) => a.id));
      if (results.slice(0, 5).some((r) => family.has(r.item.id))) hits++;
    }
    // Not every archetype is separable — many share an identical tag set — so
    // this asserts the bank is broadly useful, not that it is perfect.
    const rate = hits / sample.length;
    expect(rate, `top-5 hit rate ${(rate * 100).toFixed(0)}% over ${sample.length}`).toBeGreaterThan(0.5);
  });
});
