/**
 * Derive the Akinator answers that are facts, not opinions.
 *
 *   npm run sync:facts
 *
 * Most "is this archetype X?" questions are answerable from the card database
 * itself — what its cards are, what they summon, what they look like. Those
 * belong here, computed, so the hand-written tags can be spent only on the
 * questions that genuinely need a human: meta history, lore, how the deck is
 * piloted.
 *
 * Writes src/data/archetype-facts.json, keyed by archetype id.
 *
 * Percentages are of the archetype's own cards, so "monsterPct: 0.8" reads as
 * "four in five of its cards are monsters". A question like "is it monster
 * focused" then becomes a threshold the question bank chooses, not a fact the
 * data has to pre-judge.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src/data');

// EDOPro card type bits, verified against known cards.
const TYPE = {
  monster: 0x1,
  spell: 0x2,
  trap: 0x4,
  normal: 0x10,
  effect: 0x20,
  fusion: 0x40,
  ritual: 0x80,
  trapMonster: 0x100,
  spirit: 0x200,
  union: 0x400,
  gemini: 0x800,
  tuner: 0x1000,
  synchro: 0x2000,
  token: 0x4000,
  quickPlay: 0x10000,
  continuous: 0x20000,
  equip: 0x40000,
  field: 0x80000,
  counter: 0x100000,
  flip: 0x200000,
  toon: 0x400000,
  xyz: 0x800000,
  pendulum: 0x1000000,
  link: 0x4000000,
};

const RACE = {
  warrior: 0x1, spellcaster: 0x2, fairy: 0x4, fiend: 0x8, zombie: 0x10,
  machine: 0x20, aqua: 0x40, pyro: 0x80, rock: 0x100, windBeast: 0x200,
  plant: 0x400, insect: 0x800, thunder: 0x1000, dragon: 0x2000, beast: 0x4000,
  beastWarrior: 0x8000, dinosaur: 0x10000, fish: 0x20000, seaSerpent: 0x40000,
  reptile: 0x80000, psychic: 0x100000, divine: 0x200000, creatorGod: 0x400000,
  wyrm: 0x800000, cyberse: 0x1000000, illusion: 0x2000000,
};

const ATTRIBUTE = {
  earth: 0x01, water: 0x02, fire: 0x04, wind: 0x08,
  light: 0x10, dark: 0x20, divine: 0x40,
};

/** Extra Deck summoning methods, in the order a player would name them. */
const EXTRA_DECK = ['fusion', 'synchro', 'xyz', 'link'];

/** Monster subtypes a player would call unusual. */
const ODD_SUBTYPES = ['spirit', 'union', 'gemini', 'flip', 'toon', 'trapMonster'];

/**
 * EDOPro tags each card's effects in `category`, the same data its deck-editor
 * search filters use. Only bits verified against known cards are listed —
 * Raigeki for destroy, Dimensional Fissure for banish, Ookazi for damage, and
 * so on. These are signals, not verdicts: `banishPct` says how much of an
 * archetype touches banishing, not that banishing is its gameplan.
 */
const CATEGORY = {
  destroy: 0x1,
  toGrave: 0x4,
  banish: 0x80,
  draw: 0x100,
  search: 0x200,
  negate: 0x10000,
  damage: 0x40000,
  specialSummon: 0x100000,
};

const isSetCard = (cardCode, target) =>
  (cardCode & 0xfff) === (target & 0xfff) && (cardCode & target) === target;

function unpack(setcode) {
  const codes = [];
  let value = setcode;
  for (let i = 0; i < 4; i++) {
    const code = Number(value & 0xffffn);
    if (code) codes.push(code);
    value >>= 16n;
  }
  return codes;
}

/** The most common value in a list, with the share of the list it holds. */
function dominant(values) {
  if (values.length === 0) return null;
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return { value: best, share: round(bestCount / values.length) };
}

const round = (n) => Math.round(n * 100) / 100;
const nameOf = (table, bits) =>
  Object.entries(table).find(([, bit]) => bit === bits)?.[0] ?? null;

const setcodes = JSON.parse(await readFile(join(dataDir, 'archetype-setcodes.json'), 'utf8'));

const db = new DatabaseSync(join(root, '.cache/edopro/cards.cdb'), { readOnly: true });
const statement = db.prepare(
  'SELECT id, alias, setcode, type, race, attribute, level, category FROM datas',
);
statement.setReadBigInts(true);
const rows = statement.all();
db.close();

const cards = rows
  .map((row) => ({
    alias: Number(row.alias),
    type: Number(row.type),
    race: Number(row.race),
    attribute: Number(row.attribute),
    // The level column packs pendulum scales into its high bytes.
    level: Number(row.level) & 0xff,
    category: Number(row.category),
    codes: unpack(BigInt(row.setcode)),
  }))
  .filter((card) => !(card.type & TYPE.token) && !card.alias && card.codes.length > 0);

const facts = {};

for (const [id, entry] of Object.entries(setcodes)) {
  const own = cards.filter((card) =>
    entry.setcodes.some((target) => card.codes.some((code) => isSetCard(code, target))),
  );
  if (own.length === 0) continue;

  const has = (bit) => own.some((card) => card.type & TYPE[bit]);
  const monsters = own.filter((card) => card.type & TYPE.monster);
  const mainDeck = monsters.filter(
    (card) => !EXTRA_DECK.some((method) => card.type & TYPE[method]),
  );

  const extraDeck = EXTRA_DECK.filter((method) => has(method));

  const fact = {
    cards: own.length,
    monsterPct: round(monsters.length / own.length),
    spellPct: round(own.filter((c) => c.type & TYPE.spell).length / own.length),
    trapPct: round(own.filter((c) => c.type & TYPE.trap).length / own.length),

    race: dominant(monsters.map((c) => nameOf(RACE, c.race)).filter(Boolean)),
    attribute: dominant(monsters.map((c) => nameOf(ATTRIBUTE, c.attribute)).filter(Boolean)),
    level: dominant(mainDeck.filter((c) => c.level > 0).map((c) => c.level)),

    hasNormalMonster: monsters.some((c) => (c.type & TYPE.normal) && !(c.type & TYPE.effect)),
    hasRitual: has('ritual'),
    extraDeck,
    extraDeckMethods: extraDeck.length,
    hasPendulum: has('pendulum'),
    hasCounterTrap: own.some((c) => (c.type & TYPE.trap) && (c.type & TYPE.counter)),
    hasFieldSpell: own.some((c) => (c.type & TYPE.spell) && (c.type & TYPE.field)),
    oddSubtypes: ODD_SUBTYPES.filter((subtype) => has(subtype)),

    // Level 7+ main-deck monsters: "mostly big monsters".
    highLevelPct: mainDeck.length
      ? round(mainDeck.filter((c) => c.level >= 7).length / mainDeck.length)
      : 0,

    isSubArchetype: Boolean(entry.parent),
  };

  // What the archetype's effects actually do, as a share of its cards.
  for (const [label, bit] of Object.entries(CATEGORY)) {
    fact[`${label}Pct`] = round(own.filter((card) => card.category & bit).length / own.length);
  }

  // Which Extra Deck method dominates, when one does.
  if (extraDeck.length > 0) {
    const counts = extraDeck.map((method) => ({
      method,
      count: monsters.filter((c) => c.type & TYPE[method]).length,
    }));
    counts.sort((a, b) => b.count - a.count);
    const total = counts.reduce((sum, c) => sum + c.count, 0);
    fact.extraDeckPrimary = counts[0].method;
    fact.extraDeckPrimaryShare = round(counts[0].count / total);
  }

  facts[id] = fact;
}

await writeFile(join(dataDir, 'archetype-facts.json'), JSON.stringify(facts, null, 2) + '\n');

const all = Object.values(facts);
console.log(`${all.length} archetypes profiled\n`);
console.log(`  monster-focused (>=70% monsters): ${all.filter((f) => f.monsterPct >= 0.7).length}`);
console.log(`  spell-focused   (>=40% spells):   ${all.filter((f) => f.spellPct >= 0.4).length}`);
console.log(`  trap-focused    (>=40% traps):    ${all.filter((f) => f.trapPct >= 0.4).length}`);
console.log(`  single Type     (>=80%):          ${all.filter((f) => f.race?.share >= 0.8).length}`);
console.log(`  single Attribute(>=80%):          ${all.filter((f) => f.attribute?.share >= 0.8).length}`);
console.log(`  no Extra Deck monsters:           ${all.filter((f) => f.extraDeckMethods === 0).length}`);
console.log(`  one ED method only:               ${all.filter((f) => f.extraDeckMethods === 1).length}`);
console.log(`  two or more ED methods:           ${all.filter((f) => f.extraDeckMethods >= 2).length}`);
console.log(`  has a Normal Monster:             ${all.filter((f) => f.hasNormalMonster).length}`);
console.log(`  has a Counter Trap:               ${all.filter((f) => f.hasCounterTrap).length}`);
console.log(`  has a Field Spell:                ${all.filter((f) => f.hasFieldSpell).length}`);
console.log(`  uses an odd subtype:              ${all.filter((f) => f.oddSubtypes.length).length}`);
console.log(`  banishes  (>=25% of cards):       ${all.filter((f) => f.banishPct >= 0.25).length}`);
console.log(`  uses GY   (>=25% of cards):       ${all.filter((f) => f.toGravePct >= 0.25).length}`);
console.log(`  burns     (>=15% of cards):       ${all.filter((f) => f.damagePct >= 0.15).length}`);
console.log(`  negates   (>=15% of cards):       ${all.filter((f) => f.negatePct >= 0.15).length}`);
console.log(`\nWrote ${join(dataDir, 'archetype-facts.json')}`);
