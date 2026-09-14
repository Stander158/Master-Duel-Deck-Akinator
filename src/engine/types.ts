/** An archetype. Tags come from `src/data/tags.ts` and are the only ratings. */
export interface Archetype {
  id: string;
  name: string;
  tags: string[];
}

/** One option's contribution: a tag it points at and how strongly. */
export interface Effect {
  tag: string;
  weight: number;
}

export interface QuestionOption {
  id: string;
  label: string;
  effects: Effect[];
}

export interface Question {
  id: string;
  prompt: string;
  options: QuestionOption[];
}

/** `optionId === null` means the player skipped. */
export interface Answer {
  questionId: string;
  optionId: string | null;
}

export interface ScoredArchetype {
  archetype: Archetype;
  score: number;
  matchPercent: number;
  probability: number;
}
