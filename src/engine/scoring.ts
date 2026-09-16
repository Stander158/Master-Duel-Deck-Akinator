import type { Answer, Guessable, QuestionOption, Scored } from './types';
import type { Question } from './types';
import { QUESTIONS_BY_ID } from '../data/questions';

/** Missing a tag costs less than having it pays, because tag lists are sparse. */
const MISS = 0.45;

/** Softmax temperature. Lower is more decisive. */
export const TEMPERATURE = 1.15;

export function optionDelta(item: Guessable, option: QuestionOption): number {
  let total = 0;
  for (const { tag, weight } of option.effects) {
    total += item.tags.includes(tag) ? weight : -MISS * weight;
  }
  return total;
}

function optionRange(option: QuestionOption): { high: number; low: number } {
  let high = 0;
  let low = 0;
  for (const { weight } of option.effects) {
    // A negative weight means "I would rather not", so the best outcome is the
    // archetype not having the tag.
    high += weight >= 0 ? weight : MISS * -weight;
    low += weight >= 0 ? -MISS * weight : weight;
  }
  return { high, low };
}

export function resolveAnswers(
  answers: Answer[],
  questions?: readonly Question[],
): QuestionOption[] {
  const lookup = questions
    ? new Map(questions.map((q) => [q.id, q]))
    : QUESTIONS_BY_ID;
  const options: QuestionOption[] = [];
  for (const answer of answers) {
    if (answer.optionId === null) continue;
    const option = lookup.get(answer.questionId)?.options.find((o) => o.id === answer.optionId);
    if (option) options.push(option);
  }
  return options;
}

export function scoreItems(
  options: QuestionOption[],
  pool: readonly Guessable[],
): number[] {
  return pool.map((item) => options.reduce((sum, o) => sum + optionDelta(item, o), 0));
}

export function softmax(scores: readonly number[], temperature = TEMPERATURE): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return sum === 0 ? scores.map(() => 1 / scores.length) : exps.map((e) => e / sum);
}

/** Shannon entropy in nats. Lower means the interview has made up its mind. */
export function entropy(probabilities: readonly number[]): number {
  let total = 0;
  for (const p of probabilities) if (p > 0) total -= p * Math.log(p);
  return total;
}

/** Every candidate, scored and sorted best first. Untagged ones score zero. */
export function buildResults<T extends Guessable>(
  answers: Answer[],
  pool: readonly T[],
  questions?: readonly Question[],
): Scored<T>[] {
  const options = resolveAnswers(answers, questions);
  const scores = scoreItems(options, pool);
  const probabilities = softmax(scores);

  let high = 0;
  let low = 0;
  for (const option of options) {
    const range = optionRange(option);
    high += range.high;
    low += range.low;
  }
  const span = Math.max(high - low, 1e-6);

  return pool
    .map((item, i) => {
      const score = scores[i] ?? 0;
      return {
        item,
        score,
        matchPercent: options.length === 0 ? 0 : Math.round(((score - low) / span) * 100),
        probability: probabilities[i] ?? 0,
      };
    })
    .sort((a, b) => b.score - a.score);
}
