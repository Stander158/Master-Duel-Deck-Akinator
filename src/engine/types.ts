/** An archetype. Tags and intro come from `src/data/decks.ts`. */
export interface Archetype {
  id: string;
  name: string;
  tags: string[];
  /** Short description. Empty until written. */
  intro: string;
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

