import type { Question } from '../engine/types';

/**
 * The interview. Empty until the tag vocabulary is settled — each option's
 * effects point at tag names from `tags.ts`, so questions cannot be written
 * before the tags exist.
 *
 *   { id: 'speed', prompt: 'How fast should games end?', options: [
 *       { id: 'fast', label: 'Fast', effects: [{ tag: 'otk', weight: 1 }] },
 *   ]}
 */
export const QUESTIONS: Question[] = [];

export const QUESTIONS_BY_ID: ReadonlyMap<string, Question> = new Map(
  QUESTIONS.map((q) => [q.id, q]),
);
