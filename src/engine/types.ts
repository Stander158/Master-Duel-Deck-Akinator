/** Anything the engine can score: it only ever reads `tags`. */
export interface Guessable {
  id: string;
  name: string;
  tags: string[];
}

/**
 * A card family — the building block, not the thing you queue up with.
 *
 * Tags here are derived from the card database by `npm run sync:facts`, not
 * written by hand, so Akinator mode can guess archetypes without anyone
 * tagging 585 of them.
 */
export interface Archetype extends Guessable {
  /**
   * Root of the setcode family this belongs to, itself included.
   *
   * Crystal Beast, Advanced Crystal Beast and Ultimate Crystal all sit under
   * Crystal. A player names one and answers about another — the Rainbow Dragon
   * Fusions are Ultimate Crystal, not Crystal Beast — so a guess anywhere in
   * the family counts as finding the deck.
   */
  family: string;
  /** Direct parent, when this is a branch of a larger setcode. */
  parent?: string;
  /** How many cards carry this setcode, descendants included. */
  cards: number;
}

/**
 * A playable deck: what the recommender actually returns.
 *
 * A deck is one or more archetypes plus whatever engine glues them together,
 * so `Branded Despia` and `Tenyi Swordsoul` are decks built from two
 * archetypes each, while a pure build uses one.
 */
export interface Deck extends Guessable {
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

export interface Scored<T extends Guessable> {
  item: T;
  score: number;
  matchPercent: number;
  probability: number;
}

