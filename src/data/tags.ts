/**
 * Archetype tags, keyed by archetype id (see `slugify` in archetypes.ts).
 *
 * Empty on purpose — tags are defined by hand, not guessed. Fill entries in as
 * you decide them; anything missing is treated as untagged and simply will not
 * be recommended yet.
 *
 *   export const TAGS: Record<string, string[]> = {
 *     'blue-eyes': ['dragon', 'beatdown', 'nostalgia'],
 *   };
 */
export const TAGS: Record<string, string[]> = {};

/** Every tag currently in use, for filters and question authoring. */
export const ALL_TAGS: string[] = [
  ...new Set(Object.values(TAGS).flat()),
].sort();
