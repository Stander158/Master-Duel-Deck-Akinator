/**
 * Regenerate the archetype list from EDOPro's strings.conf.
 *
 *   npm run sync:archetypes -- /path/to/ProjectIgnis/strings.conf
 *
 * strings.conf is the authority on what an archetype is called and which
 * setcode identifies it — it is the same table the duel engine matches
 * `IsSetCard` against. Writes two files:
 *
 *   src/data/archetype-names.json     sorted display names
 *   src/data/archetype-setcodes.json  id -> { setcodes, parent? }
 *
 * Two structural details from the format:
 *
 *  - **A name can carry several setcodes.** Fourteen names do in a 2022 file
 *    (Number, Puppet, Magician…). They are one archetype with more than one
 *    code, so they merge into a single entry rather than colliding.
 *  - **Sub-archetypes share their parent's low 12 bits.** Elemental HERO
 *    (0x3008) sits under HERO (0x008), so a card in the sub-archetype is also
 *    in the parent. Matching a setcode is therefore a masked comparison, and
 *    the parent link is recorded here so the app does not have to re-derive it.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const namesFile = join(root, 'src/data/archetype-names.json');
const setcodesFile = join(root, 'src/data/archetype-setcodes.json');

/** Mirror of slugify() in src/data/slugify.ts — ids must match exactly. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run sync:archetypes -- /path/to/ProjectIgnis/strings.conf');
  process.exit(1);
}

const text = await readFile(source, 'utf8');

/** name -> setcodes, preserving the order they appear in. */
const bySetName = new Map();
for (const line of text.split(/\r?\n/)) {
  const match = /^!setname\s+(0x[0-9a-fA-F]+)\s+(.+?)\s*$/.exec(line);
  if (!match) continue;
  const code = Number.parseInt(match[1], 16);
  const name = match[2];
  if (!bySetName.has(name)) bySetName.set(name, []);
  bySetName.get(name).push(code);
}

if (bySetName.size === 0) {
  throw new Error(`no !setname lines found in ${source} — is that an EDOPro strings.conf?`);
}

const names = [...bySetName.keys()].sort((a, b) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' }),
);

// A base setcode fits in 12 bits; anything wider is a sub-archetype whose low
// 12 bits name its parent.
const baseCodes = new Map();
for (const [name, codes] of bySetName) {
  for (const code of codes) {
    if (code <= 0xfff) baseCodes.set(code, slugify(name));
  }
}

const setcodes = {};
for (const name of names) {
  const codes = bySetName.get(name);
  const entry = { setcodes: codes };
  const sub = codes.find((code) => code > 0xfff && baseCodes.has(code & 0xfff));
  if (sub !== undefined) {
    const parent = baseCodes.get(sub & 0xfff);
    if (parent && parent !== slugify(name)) entry.parent = parent;
  }
  setcodes[slugify(name)] = entry;
}

let previous = [];
try {
  previous = JSON.parse(await readFile(namesFile, 'utf8'));
} catch {
  // First run.
}

await writeFile(namesFile, JSON.stringify(names, null, 2) + '\n');
await writeFile(setcodesFile, JSON.stringify(setcodes, null, 2) + '\n');

const added = names.filter((n) => !previous.includes(n));
const removed = previous.filter((n) => !names.includes(n));
const withParent = Object.values(setcodes).filter((e) => e.parent).length;
const multiCode = Object.values(setcodes).filter((e) => e.setcodes.length > 1).length;

console.log(`${previous.length} -> ${names.length} archetypes`);
console.log(`  ${withParent} sub-archetypes, ${multiCode} with more than one setcode`);
if (added.length) {
  console.log(`  +${added.length}: ${added.slice(0, 10).join(', ')}${added.length > 10 ? '…' : ''}`);
}
if (removed.length) {
  console.log(`  -${removed.length}: ${removed.slice(0, 20).join(', ')}${removed.length > 20 ? '…' : ''}`);
  console.log('\n  Removed names are gone from strings.conf. If a deck or a filled');
  console.log('  tag row references one, it needs remapping — `npm test` will catch decks.');
}
console.log(`\nWrote ${namesFile}`);
console.log(`Wrote ${setcodesFile}`);
