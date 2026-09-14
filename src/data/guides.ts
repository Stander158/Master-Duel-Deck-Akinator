import type { Guide } from '../engine/types';

/**
 * Long-form archetype guides, keyed by archetype id.
 *
 * Empty on purpose — written by hand, not generated. An archetype without an
 * entry just shows its name and tags.
 *
 *   export const GUIDES: Record<string, Guide> = {
 *     'blue-eyes': {
 *       intro: 'One sentence on what the deck is.',
 *       facts: [
 *         { label: 'Cost', value: '6 UR' },
 *         { label: 'Difficulty', value: 'Low' },
 *       ],
 *       sections: [
 *         {
 *           heading: 'How it plays',
 *           blocks: [
 *             { p: 'A paragraph.' },
 *             { list: ['A bullet', 'Another bullet'] },
 *             { cards: ['Card to craft', 'Another card'] },
 *             { note: 'A callout worth highlighting.' },
 *           ],
 *         },
 *       ],
 *     },
 *   };
 */
export const GUIDES: Record<string, Guide> = {};

export function guideFor(archetypeId: string): Guide | null {
  return GUIDES[archetypeId] ?? null;
}
