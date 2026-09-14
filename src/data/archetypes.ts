import type { Archetype } from '../engine/types';
import { slugify } from './slugify';
import names from './archetype-names.json';

/**
 * Archetype name registry — the card families, not the decks.
 *
 * Reference data: an archetype is a building block a deck is made from, so
 * nothing here is tagged, rated or recommended. Playable decks live in
 * `decks.ts` and point back at these ids.
 *
 * `archetype-names.json` is regenerated from YGOPRODeck by
 * `npm run sync:archetypes`, so do not hand-edit it — add names upstream or
 * re-run the sync.
 */
export const ARCHETYPE_NAMES: readonly string[] = names;

export const ARCHETYPES: Archetype[] = ARCHETYPE_NAMES.map((name) => ({
  id: slugify(name),
  name,
}));

export const ARCHETYPES_BY_ID: ReadonlyMap<string, Archetype> = new Map(
  ARCHETYPES.map((a) => [a.id, a]),
);
