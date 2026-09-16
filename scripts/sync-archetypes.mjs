/**
 * Regenerate the archetype list from Project Ignis' own data.
 *
 *   npm run sync:archetypes                # every setname that has a card
 *   npm run sync:archetypes -- --min 8     # only the ones with 8+ cards
 *
 * Two sources, both public repos:
 *
 *   strings.conf   ProjectIgnis/Distribution  — setcode -> archetype name
 *   cards.cdb      ProjectIgnis/BabelCDB      — the official card database
 *
 * Why both: strings.conf lists every setcode the duel engine recognises, which
 * is far more than the set of buildable archetypes — "Armored Xyz", "Barian's"
 * and "Aqua Jet" are card-text markers, and 149 of the names have no cards at
 * all. The cdb supplies the card count that makes those visible.
 *
 * The count is a hint, not a rule, which is why nothing is filtered by default.
 * It cuts the wrong way in both directions: Eldlich counts 2 because its spells
 * and traps sit under Golden Land, Tenpai Dragon counts 4, and "of-the-forest"
 * counts 8 while being no deck at all. Which setcodes are real decks is a
 * judgement call made by hand in the tagging sheet, not a threshold.
 *
 * Writes:
 *   src/data/archetype-names.json     [{ id, name }]
 *   src/data/archetype-setcodes.json  id -> { setcodes, cards, parent? }
 *   src/data/archetype-excluded.json  anything a --min cutoff left out
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src/data');
const cacheDir = join(root, '.cache/edopro');

const STRINGS_URL =
  'https://raw.githubusercontent.com/ProjectIgnis/Distribution/master/config/strings.conf';
const CDB_URL = 'https://raw.githubusercontent.com/ProjectIgnis/BabelCDB/master/cards.cdb';

/** Card types we never count: tokens are not deck cards. */
const TYPE_TOKEN = 0x4000;

/** Mirror of slugify() in src/data/slugify.ts. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Assign a unique id to each entry, in the order given.
 *
 * Slugs are not unique on their own: EDOPro has both "Abyss" and "Abyss-" as
 * separate setcodes, and they slug identically. The first entry in sort order
 * keeps the bare slug and later ones take a numeric suffix, which keeps ids
 * stable as long as the input stays sorted by name.
 */
function assignIds(entries) {
  const taken = new Map();
  for (const entry of entries) {
    const base = slugify(entry.name) || 'archetype';
    const seen = taken.get(base) ?? 0;
    taken.set(base, seen + 1);
    entry.id = seen === 0 ? base : `${base}-${seen + 1}`;
  }
  return entries;
}

/**
 * EDOPro's own IsSetCard test.
 *
 * A setcode's low 12 bits identify the family and the high bits the branch, so
 * Elemental HERO (0x3008) is inside HERO (0x008) but not the reverse. Equality
 * would lose every sub-archetype; masking the wrong way would merge them.
 */
function isSetCard(cardCode, target) {
  return (cardCode & 0xfff) === (target & 0xfff) && (cardCode & target) === target;
}

/** setcode packs up to four 16-bit codes into one 64-bit column. */
function unpack(setcode) {
  const codes = [];
  let value = BigInt(setcode);
  for (let i = 0; i < 4; i++) {
    const code = Number(value & 0xffffn);
    if (code) codes.push(code);
    value >>= 16n;
  }
  return codes;
}

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  await writeFile(dest, Buffer.from(await response.arrayBuffer()));
  return dest;
}

const args = process.argv.slice(2);
const minIndex = args.indexOf('--min');
const minCards = minIndex === -1 ? 1 : Number(args[minIndex + 1]);
if (!Number.isFinite(minCards) || minCards < 1) throw new Error('--min needs a positive number');

await mkdir(cacheDir, { recursive: true });
const stringsPath = join(cacheDir, 'strings.conf');
const cdbPath = join(cacheDir, 'cards.cdb');

console.log('Fetching strings.conf and cards.cdb from Project Ignis…');
await Promise.all([download(STRINGS_URL, stringsPath), download(CDB_URL, cdbPath)]);

// --- names -----------------------------------------------------------------
const bySetName = new Map();
for (const line of (await readFile(stringsPath, 'utf8')).split(/\r?\n/)) {
  const match = /^!setname\s+(0x[0-9a-fA-F]+)\s+(.+?)\s*$/.exec(line);
  if (!match) continue;
  const name = match[2];
  if (!bySetName.has(name)) bySetName.set(name, []);
  bySetName.get(name).push(Number.parseInt(match[1], 16));
}
if (bySetName.size === 0) throw new Error('no !setname lines found — is that a strings.conf?');

// --- cards -----------------------------------------------------------------
const db = new DatabaseSync(cdbPath, { readOnly: true });
const statement = db.prepare('SELECT alias, setcode, type FROM datas');
// setcode packs four 16-bit codes into 64 bits, which overflows a JS number —
// without this the read throws on any card in a fourth-tier setcode.
statement.setReadBigInts(true);
const rows = statement.all();
db.close();

// Alternate artworks carry an alias to the original; counting both would
// inflate every archetype that has a reprint.
const deck = rows
  .filter((row) => !(Number(row.type) & TYPE_TOKEN) && !Number(row.alias))
  .map((row) => unpack(row.setcode))
  .filter((codes) => codes.length > 0);

console.log(`${rows.length} rows, ${deck.length} distinct non-token cards with a setcode\n`);

// --- count and split -------------------------------------------------------
const entries = [];
for (const [name, codes] of bySetName) {
  let cards = 0;
  for (const card of deck) {
    if (codes.some((target) => card.some((code) => isSetCard(code, target)))) cards++;
  }
  entries.push({ name, setcodes: codes, cards });
}

entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
assignIds(entries);

// Parent links resolve against the assigned ids, so they must come after.
const idByBaseCode = new Map();
for (const entry of entries) {
  for (const code of entry.setcodes) if (code <= 0xfff) idByBaseCode.set(code, entry.id);
}
for (const entry of entries) {
  const sub = entry.setcodes.find((code) => code > 0xfff && idByBaseCode.has(code & 0xfff));
  if (sub === undefined) continue;
  const parent = idByBaseCode.get(sub & 0xfff);
  if (parent && parent !== entry.id) entry.parent = parent;
}
const kept = entries.filter((e) => e.cards >= minCards);
const excluded = entries.filter((e) => e.cards < minCards && e.cards > 0);
const empty = entries.filter((e) => e.cards === 0);

if (kept.length === 0) throw new Error('cutoff kept nothing — check --min');

// A parent resolved against every setname, including the ones with no cards
// that never get written. Drop links that would dangle: Paleozoic's second
// setcode pointed at an archetype that is not in the output at all.
const keptIds = new Set(kept.map((e) => e.id));
for (const entry of kept) {
  if (entry.parent && !keptIds.has(entry.parent)) delete entry.parent;
}

const setcodes = {};
for (const e of kept) {
  setcodes[e.id] = { setcodes: e.setcodes, cards: e.cards, ...(e.parent ? { parent: e.parent } : {}) };
}

let previous = [];
try {
  const raw = JSON.parse(await readFile(join(dataDir, 'archetype-names.json'), 'utf8'));
  // Tolerate the older shape, which was a plain array of names.
  previous = raw.map((entry) => (typeof entry === 'string' ? entry : entry.name));
} catch {
  // First run.
}

await writeFile(
  join(dataDir, 'archetype-names.json'),
  JSON.stringify(kept.map((e) => ({ id: e.id, name: e.name })), null, 2) + '\n',
);
await writeFile(join(dataDir, 'archetype-setcodes.json'), JSON.stringify(setcodes, null, 2) + '\n');
await writeFile(
  join(dataDir, 'archetype-excluded.json'),
  JSON.stringify(
    excluded.map((e) => ({ name: e.name, cards: e.cards })),
    null,
    2,
  ) + '\n',
);

const added = kept.map((e) => e.name).filter((n) => !previous.includes(n));
const removed = previous.filter((n) => !kept.some((e) => e.name === n));

console.log(`${bySetName.size} setnames -> ${kept.length} archetypes (cutoff: ${minCards}+ cards)`);
console.log(`  ${empty.length} had no cards at all`);
console.log(`  ${excluded.length} fell below the cutoff -> archetype-excluded.json`);
console.log(`  ${kept.filter((e) => e.parent).length} are sub-archetypes of another`);
console.log(`\nvs the previous list: +${added.length}, -${removed.length}`);
if (removed.length) {
  console.log(`  dropped: ${removed.slice(0, 15).join(', ')}${removed.length > 15 ? '…' : ''}`);
}
console.log('\nWrote archetype-names.json, archetype-setcodes.json, archetype-excluded.json');
