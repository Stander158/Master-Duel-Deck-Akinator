import type { Deck } from '../engine/types';
import { slugify } from './slugify';

/**
 * Playable decks — what this tool recommends.
 *
 * A deck is not an archetype. `Branded Despia` and `Tenyi Swordsoul` each
 * combine two archetypes; a pure build uses one. `archetypes` lists the ids
 * from `archetypes.ts` that a deck is built from.
 *
 * Empty on purpose — written by hand, not guessed. No cost, difficulty or tier
 * fields: those go stale with every banlist and shop rotation.
 */
export interface DeckInput {
  name: string;
  /** Archetype ids, e.g. ['branded', 'despia']. */
  archetypes: string[];
  tags: string[];
  intro?: string;
  /**
   * Card names exactly as printed. `npm run sync:cards` fetches their info
   * and images from YGOPRODeck; a name that does not match exactly is
   * reported rather than silently skipped.
   */
  keyCards?: string[];
}

const DECK_LIST: DeckInput[] = [
  // {
  //   name: 'Branded Despia',
  //   archetypes: ['branded', 'despia'],
  //   tags: ['fusion', 'midrange'],
  //   intro: 'One or two sentences on what the deck is and how it wins.',
  //   keyCards: ['Branded Fusion', 'Albion the Branded Dragon'],
  // },
];

export const DECKS: Deck[] = DECK_LIST.map((d) => ({
  id: slugify(d.name),
  name: d.name,
  archetypes: d.archetypes,
  tags: d.tags,
  intro: d.intro ?? '',
  keyCards: d.keyCards ?? [],
}));

export const DECKS_BY_ID: ReadonlyMap<string, Deck> = new Map(DECKS.map((d) => [d.id, d]));

/** Every tag currently in use, for the archive filter and question authoring. */
export const ALL_TAGS: string[] = [...new Set(DECKS.flatMap((d) => d.tags))].sort();

/** Decks that use a given archetype, for the archetype page. */
export function decksUsing(archetypeId: string): Deck[] {
  return DECKS.filter((d) => d.archetypes.includes(archetypeId));
}
