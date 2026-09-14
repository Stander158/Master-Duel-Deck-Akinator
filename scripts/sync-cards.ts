/**
 * Fetch card info and images for every card a deck names in `keyCards`.
 *
 *   npm run sync:cards
 *
 * Writes src/data/cards.json and downloads images into public/cards/, because
 * YGOPRODeck asks that their images are not hotlinked. Only cards the app
 * actually shows are fetched, so the repo grows with your deck list rather
 * than with the whole database.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DECKS } from '../src/data/decks';
// @ts-expect-error — plain JS module, no types
import { downloadImage, fetchCardByName, slimCard } from './ygoprodeck.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cardsFile = join(root, 'src/data/cards.json');
const imageDir = join(root, 'public/cards');

const wanted = [...new Set(DECKS.flatMap((deck) => deck.keyCards))].sort();

if (wanted.length === 0) {
  console.log('No decks name any keyCards yet — nothing to fetch.');
  process.exit(0);
}

let cached: Record<string, unknown> = {};
try {
  cached = JSON.parse(await readFile(cardsFile, 'utf8'));
} catch {
  // First run — no cache yet.
}

console.log(`${wanted.length} cards referenced by ${DECKS.length} decks\n`);

const cards: Record<string, unknown> = {};
const missing: string[] = [];

for (const name of wanted) {
  if (cached[name]) {
    cards[name] = cached[name];
    console.log(`  cached   ${name}`);
    continue;
  }

  const card = await fetchCardByName(name);
  if (!card) {
    missing.push(name);
    console.warn(`  MISSING  ${name}  (no exact name match)`);
    continue;
  }

  cards[name] = slimCard(card);
  console.log(`  fetched  ${name}`);
}

const sorted = Object.fromEntries(Object.keys(cards).sort().map((k) => [k, cards[k]]));
await writeFile(cardsFile, JSON.stringify(sorted, null, 2) + '\n');
console.log(`\nWrote ${cardsFile} (${Object.keys(sorted).length} cards)`);

// Images second, so a network failure here still leaves the card data written.
let downloaded = 0;
let skipped = 0;
for (const card of Object.values(sorted) as { imageId?: number; name: string }[]) {
  if (!card.imageId) continue;
  const result = await downloadImage(card.imageId, imageDir, 'small');
  if (result.skipped) skipped++;
  else downloaded++;
}
console.log(`Images: ${downloaded} downloaded, ${skipped} already present, in ${imageDir}`);

if (missing.length) {
  console.log(`\n${missing.length} card name(s) did not match exactly:`);
  for (const name of missing) console.log(`  ${name}`);
  console.log('Card names must match the database exactly, punctuation included.');
  process.exitCode = 1;
}
