import type { Answer, Guessable, Question } from './types';
import { QUESTIONS } from '../data/questions';
import { entropy, optionDelta, resolveAnswers, scoreItems, softmax } from './scoring';

export interface QuizConfig {
  minQuestions: number;
  maxQuestions: number;
  /** Stop early once the leading deck holds at least this much belief. */
  confidence: number;
}

export const STANDARD_QUIZ: QuizConfig = { minQuestions: 6, maxQuestions: 12, confidence: 0.3 };

/** Softmax temperature for modelling which option a player would choose. */
const CHOICE_TEMPERATURE = 0.9;

/** Deterministic per-session jitter, so replays vary but the back button does not. */
function jitter(seed: number, questionId: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < questionId.length; i++) {
    h ^= questionId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 1 + ((h / 0xffffffff) * 2 - 1) * 0.08;
}

/**
 * Rank unasked questions by expected information gain: for each option, build
 * the posterior that answer would produce, weight it by how likely a player
 * holding each deck's profile would be to pick it, and compare the expected
 * posterior entropy against today's.
 */
export function rankQuestions(
  answers: Answer[],
  seed: number,
  pool: readonly Guessable[],
  questions: readonly Question[] = QUESTIONS,
): { question: Question; gain: number }[] {
  const asked = new Set(answers.map((a) => a.questionId));
  const candidates = questions.filter((q) => !asked.has(q.id));
  if (candidates.length === 0) return [];

  const priorScores = scoreItems(resolveAnswers(answers, questions), pool);
  const prior = softmax(priorScores);
  const priorEntropy = entropy(prior);

  return candidates
    .map((question) => {
      const deltas = question.options.map((o) => pool.map((item) => optionDelta(item, o)));

      const likelihood = new Array<number>(question.options.length).fill(0);
      for (let a = 0; a < pool.length; a++) {
        const choice = softmax(
          deltas.map((d) => d[a] ?? 0),
          CHOICE_TEMPERATURE,
        );
        for (let o = 0; o < choice.length; o++) {
          likelihood[o] = (likelihood[o] ?? 0) + (prior[a] ?? 0) * (choice[o] ?? 0);
        }
      }

      let expected = 0;
      for (let o = 0; o < question.options.length; o++) {
        const p = likelihood[o] ?? 0;
        const row = deltas[o];
        if (p <= 0 || !row) continue;
        expected += p * entropy(softmax(priorScores.map((s, a) => s + (row[a] ?? 0))));
      }

      return { question, gain: (priorEntropy - expected) * jitter(seed, question.id) };
    })
    .sort((a, b) => b.gain - a.gain);
}

/** The next question, or null when the interview is over. */
export function nextQuestion(
  answers: Answer[],
  seed: number,
  config: QuizConfig,
  pool: readonly Guessable[],
  questions: readonly Question[] = QUESTIONS,
): Question | null {
  if (answers.length >= config.maxQuestions) return null;

  const ranked = rankQuestions(answers, seed, pool, questions);
  if (ranked.length === 0) return null;
  if (answers.length < config.minQuestions) return ranked[0]?.question ?? null;

  const beliefs = softmax(scoreItems(resolveAnswers(answers, questions), pool));
  if (Math.max(0, ...beliefs) >= config.confidence) return null;

  return ranked[0]?.question ?? null;
}
