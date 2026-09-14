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
  /**
   * Card names to show on the deck page, exactly as printed. Info and images
   * are fetched for these by `npm run sync:cards`.
   */
  keyCards: string[];
}

/** Slim card record from YGOPRODeck, written by `npm run sync:cards`. */
export interface Card {
  id: number;
  name: string;
  type: string;
  desc: string;
  archetype?: string;
  atk?: number;
  def?: number;
  level?: number;
  attribute?: string;
  race?: string;
  /** Image filename stem under public/cards/. Absent when no art exists. */
  imageId?: number;
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

