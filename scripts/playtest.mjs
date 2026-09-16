/**
 * Playtest harness for the Akinator question bank.
 *
 *   node scripts/playtest.mjs q1=yes q17=no ...
 *
 * Narrows the archetype pool against the answers given so far, then reports
 * which unasked question would split what remains most evenly. Exists to find
 * out which questions actually discriminate before any of them is written into
 * the app — and to expose the ones a human cannot answer, which is where a
 * hand-written tag is genuinely needed.
 *
 * Only the questions the data can answer are here. The rest need tags that do
 * not exist yet, so the harness cannot filter on them.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(readFileSync(join(root, 'src/data', name), 'utf8'));

const names = Object.fromEntries(read('archetype-names.json').map((e) => [e.id, e.name]));
const facts = read('archetype-facts.json');
const ages = read('archetype-ages.json');

/**
 * Each question is a predicate over one archetype. Thresholds are first
 * guesses — the point of playing is to find out which ones are set wrong.
 */
const QUESTIONS = {
  q1: ['Monster focused?', (f) => f.monsterPct >= 0.7],
  q2: ['Spell focused?', (f) => f.spellPct >= 0.35],
  q3: ['Trap focused?', (f) => f.trapPct >= 0.35],
  q4: ['Old? (predates 2019)', (f, a) => Boolean(a?.legacy)],
  q5: ['Modern? (2021 or later)', (f, a) => Boolean(a && !a.legacy && a.firstSeen >= '2021')],
  q6: ['Primarily one Type?', (f) => (f.race?.share ?? 0) >= 0.8],
  q7: ['Primarily one Attribute?', (f) => (f.attribute?.share ?? 0) >= 0.8],
  q8: ['Primarily one Level?', (f) => (f.level?.share ?? 0) >= 0.5],
  q9: ['Still getting support?', (f, a) => Boolean(a && a.newCards12m > 0)],
  q11: ['Has a Normal monster?', (f) => f.hasNormalMonster],
  q14: ['Multiple Extra Deck types?', (f) => f.extraDeckMethods >= 2],
  q15: ['No Extra Deck monsters of its own?', (f) => f.extraDeckMethods === 0],
  q16: ['Primarily one ED method?', (f) => f.extraDeckMethods >= 1 && (f.extraDeckPrimaryShare ?? 0) >= 0.7],
  q17: ['Has a Fusion monster?', (f) => f.extraDeck.includes('fusion')],
  q18: ['Has a Synchro monster?', (f) => f.extraDeck.includes('synchro')],
  q19: ['Has an Xyz monster?', (f) => f.extraDeck.includes('xyz')],
  q20: ['Has a Link monster?', (f) => f.extraDeck.includes('link')],
  q21: ['Has a Pendulum monster?', (f) => f.hasPendulum],
  q23: ['Uses an obscure subtype?', (f) => f.oddSubtypes.length > 0],
  q24: ['Mostly high-level monsters?', (f) => f.highLevelPct >= 0.5],
  q25: ['Likes to banish?', (f) => f.banishPct >= 0.25],
  q26: ['Likes its cards in the GY?', (f) => f.toGravePct >= 0.2],
  q30: ['Is a sub-archetype?', (f) => f.isSubArchetype],
  q32: ['Has a Counter Trap?', (f) => f.hasCounterTrap],
  q33: ['Deals effect damage?', (f) => f.damagePct >= 0.15],
  q36: ['Primarily machines?', (f) => f.race?.value === 'machine'],
  q37: ['Has dragon-looking monsters?', (f) => f.race?.value === 'dragon'],
  q40: ['Has a Field Spell?', (f) => f.hasFieldSpell],
  q41: ['Almost forgotten?', (f, a) => Boolean(a && a.lastNewCard < '2022')],
  // Ritual has no question of its own yet, but it splits the pool well.
  q42: ['Has a Ritual monster?', (f) => f.hasRitual],
};

const answers = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.split('=');
  if (QUESTIONS[key]) answers.set(key, value.toLowerCase());
}

// "somewhat" is deliberately not a filter: half-answers should not eliminate,
// and seeing how often they come up is part of what the playtest is for.
let pool = Object.keys(facts).filter((id) =>
  [...answers].every(([key, value]) => {
    if (value !== 'yes' && value !== 'no') return true;
    const [, test] = QUESTIONS[key];
    return test(facts[id], ages[id]) === (value === 'yes');
  }),
);

console.log(`Answers: ${[...answers].map(([k, v]) => `${k}=${v}`).join(' ') || '(none)'}`);
console.log(`Candidates: ${pool.length} of ${Object.keys(facts).length}\n`);

if (pool.length <= 25) {
  console.log('Remaining:');
  for (const id of pool.sort((a, b) => facts[b].cards - facts[a].cards)) {
    console.log(`  ${String(facts[id].cards).padStart(3)} cards  ${names[id]}`);
  }
  console.log();
}

// The most useful next question is whichever splits the pool closest to half.
const ranked = Object.entries(QUESTIONS)
  .filter(([key]) => !answers.has(key))
  .map(([key, [label, test]]) => {
    const yes = pool.filter((id) => test(facts[id], ages[id])).length;
    return { key, label, yes, no: pool.length - yes, split: Math.abs(0.5 - yes / pool.length) };
  })
  .filter((entry) => entry.yes > 0 && entry.no > 0)
  .sort((a, b) => a.split - b.split);

console.log('Best next questions (closest to an even split):');
for (const entry of ranked.slice(0, 6)) {
  console.log(`  ${entry.key.padEnd(4)} ${entry.label.padEnd(36)} yes ${entry.yes} / no ${entry.no}`);
}
