/**
 * Regenerate src/data/archetype-names.json from YGOPRODeck.
 *
 *   npm run sync:archetypes
 *
 * The committed list started out hand-written and is almost certainly both
 * incomplete and slightly wrong; this replaces it with the database's own
 * list. Run it whenever a new set lands.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchArchetypes } from './ygoprodeck.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'src/data/archetype-names.json');

const before = JSON.parse(await readFile(target, 'utf8'));

console.log('Fetching archetype list…');
const names = [...new Set(await fetchArchetypes())].sort((a, b) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' }),
);

if (names.length === 0) throw new Error('refusing to write an empty archetype list');

const added = names.filter((n) => !before.includes(n));
const removed = before.filter((n) => !names.includes(n));

await writeFile(target, JSON.stringify(names, null, 2) + '\n');

console.log(`\n${before.length} -> ${names.length} archetypes`);
if (added.length) console.log(`  +${added.length}: ${added.slice(0, 12).join(', ')}${added.length > 12 ? '…' : ''}`);
if (removed.length) {
  console.log(`  -${removed.length}: ${removed.join(', ')}`);
  console.log('\n  Removed names were in the hand-written list but are not in the database.');
  console.log('  If a deck references one, `npm test` will fail — fix decks.ts.');
}
console.log(`\nWrote ${target}`);
