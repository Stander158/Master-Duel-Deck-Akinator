/**
 * A card family — the building block, not the thing you queue up with.
 * Reference data only: archetypes carry no tags and are never recommended.
 */
export interface Archetype {
  id: string;
  name: string;
}

/**
 * A playable deck: what the recommender actually returns.
 *
 * A deck is one or more archetypes plus whatever engine glues them together,
 * so `Branded Despia` and `Tenyi Swordsoul` are decks built from two
 * archetypes each, while a pure build uses one.
 */
export interface Deck {
  id: string;
  name: string;
  /** Archetype ids this deck is built from. */
  archetypes: string[];
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

export interface ScoredDeck {
  deck: Deck;
  score: number;
  matchPercent: number;
  probability: number;
}

