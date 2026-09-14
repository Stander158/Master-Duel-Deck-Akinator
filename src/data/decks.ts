/**
 * Per-archetype data: tags and a short description.
 *
 * Empty on purpose — written by hand, not guessed. Anything missing just shows
 * as an untagged name, and untagged archetypes are never recommended.
 *
 * Deliberately no cost, difficulty or tier numbers: those go stale with every
 * banlist and shop rotation, and a wrong number is worse than none.
 *
 * Keys are archetype ids — see `slugify` in archetypes.ts (`D/D/D` -> `d-d-d`).
 */
export interface DeckInfo {
  tags?: string[];
  intro?: string;
}

export const DECKS: Record<string, DeckInfo> = {
  // 'blue-eyes': {
  //   tags: ['dragon', 'beatdown'],
  //   intro: 'One or two sentences on what the deck is and how it wins.',
  // },
};

/** Every tag currently in use, for the archive filter and question authoring. */
export const ALL_TAGS: string[] = [
  ...new Set(Object.values(DECKS).flatMap((d) => d.tags ?? [])),
].sort();
