/**
 * Date each archetype by walking the card database's own git history.
 *
 *   npm run sync:ages -- /path/to/BabelCDB
 *
 * cards.cdb carries no release dates, and passcodes are not chronological
 * (Blue-Eyes is 89631133 from 1999, Fiendsmith Engraver 60764609 from 2024), so
 * the dates come from when Project Ignis first added each card to the database.
 * That tracks release closely: the database is updated as sets are announced.
 *
 * The history is sampled monthly rather than walked commit by commit — 4000+
 * commits each holding a 7.6 MB binary is far more work than the question
 * needs, and month granularity already answers "is this archetype still
 * getting support".
 *
 * Writes src/data/archetype-ages.json:
 *   id -> { firstSeen, lastNewCard, newCards12m, legacy }
 *
 * `legacy: true` means the archetype already existed at the start of the
 * history, so its true age is older than this method can see.
 */
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src/data');

const repo = process.argv[2];
if (!repo) {
  console.error('Usage: npm run sync:ages -- /path/to/BabelCDB');
  console.error('Clone it first: git clone https://github.com/ProjectIgnis/BabelCDB');
  process.exit(1);
}

const git = (...args) =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

// --- pick one commit per month --------------------------------------------
const commits = git('log', '--reverse', '--format=%H %cI', 'origin/master')
  .trim()
  .split('\n')
  .map((line) => {
    const [sha, date] = line.split(' ');
    return { sha, date, month: date.slice(0, 7) };
  });

const byMonth = new Map();
for (const commit of commits) {
  // Last commit of each month: everything released that month is in by then.
  byMonth.set(commit.month, commit);
}
const samples = [...byMonth.values()];
console.log(`${commits.length} commits spanning ${samples[0].month}..${samples.at(-1).month}`);
console.log(`Sampling ${samples.length} monthly snapshots\n`);

// --- first-seen month per card id ------------------------------------------
const scratch = mkdtempSync(join(tmpdir(), 'babel-'));
const dbPath = join(scratch, 'cards.cdb');
const firstSeen = new Map();
let failures = 0;

try {
  for (const [index, sample] of samples.entries()) {
    let blob;
    try {
      blob = execFileSync('git', ['-C', repo, 'show', `${sample.sha}:cards.cdb`], {
        maxBuffer: 256 * 1024 * 1024,
      });
    } catch {
      failures++;
      continue; // cards.cdb absent or renamed at this point in history
    }

    writeFileSync(dbPath, blob);
    let ids;
    try {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      const statement = db.prepare('SELECT id FROM datas');
      statement.setReadBigInts(true);
      ids = statement.all().map((row) => Number(row.id));
      db.close();
    } catch {
      failures++;
      continue; // a snapshot mid-rewrite; the next month covers it
    }

    for (const id of ids) if (!firstSeen.has(id)) firstSeen.set(id, sample.month);

    if ((index + 1) % 12 === 0 || index === samples.length - 1) {
      process.stdout.write(`  ${sample.month}: ${firstSeen.size} cards seen\n`);
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const firstMonth = samples[0].month;
console.log(`\n${firstSeen.size} card ids dated, ${failures} snapshots unreadable`);

// --- roll cards up to archetypes -------------------------------------------
const setcodes = JSON.parse(await readFile(join(dataDir, 'archetype-setcodes.json'), 'utf8'));

const db = new DatabaseSync(join(root, '.cache/edopro/cards.cdb'), { readOnly: true });
const statement = db.prepare('SELECT id, alias, setcode, type FROM datas');
statement.setReadBigInts(true);
const cards = statement.all().map((row) => ({
  id: Number(row.id),
  alias: Number(row.alias),
  setcode: BigInt(row.setcode),
  type: Number(row.type),
}));
db.close();

const TYPE_TOKEN = 0x4000;
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

const playable = cards
  .filter((card) => !(card.type & TYPE_TOKEN) && !card.alias)
  .map((card) => ({ id: card.id, codes: unpack(card.setcode) }))
  .filter((card) => card.codes.length > 0);

// Twelve months back from the newest snapshot, for the "still active" flag.
const cutoff = (() => {
  const [year, month] = samples.at(-1).month.split('-').map(Number);
  return `${year - 1}-${String(month).padStart(2, '0')}`;
})();

const ages = {};
for (const [id, entry] of Object.entries(setcodes)) {
  const months = [];
  for (const card of playable) {
    if (!entry.setcodes.some((target) => card.codes.some((code) => isSetCard(code, target)))) {
      continue;
    }
    const month = firstSeen.get(card.id);
    if (month) months.push(month);
  }
  if (months.length === 0) continue;

  months.sort();
  ages[id] = {
    firstSeen: months[0],
    lastNewCard: months.at(-1),
    newCards12m: months.filter((m) => m >= cutoff).length,
    // Present in the first snapshot, so the real debut predates the history.
    legacy: months[0] === firstMonth,
  };
}

await writeFile(join(dataDir, 'archetype-ages.json'), JSON.stringify(ages, null, 2) + '\n');

const active = Object.values(ages).filter((a) => a.newCards12m > 0).length;
const legacy = Object.values(ages).filter((a) => a.legacy).length;
console.log(`\n${Object.keys(ages).length} archetypes dated`);
console.log(`  ${legacy} predate the history (${firstMonth}) — age unknown, only "old"`);
console.log(`  ${active} got a new card in the last 12 months (since ${cutoff})`);
console.log(`\nWrote ${join(dataDir, 'archetype-ages.json')}`);
