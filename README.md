# Master Duel Deck Akinator

A deck recommender for Yu-Gi-Oh! Master Duel. React + TypeScript + Vite, no backend.

## Deck vs archetype

Two different things, kept separate:

- **Archetype** — a card family (`Branded`, `Despia`, `Swordsoul`). Reference
  data, 266 of them, never tagged and never recommended.
- **Deck** — a playable list built from one or more archetypes
  (`Branded Despia`, `Tenyi Swordsoul`, or a pure single-archetype build).
  Decks carry the tags, and decks are what this tool recommends.

## Modes

- **Which deck should I build?** — `#/build`
- **Akinator** — guess the deck you are thinking of — `#/akinator`
- **Which deck is mine?** — `#/identity`
- **Archive** — decks and archetypes — `#/browse`

## Data

| File | Contents |
| --- | --- |
| `src/data/archetypes.ts` | 266 archetype names. Names only — no tags, no ratings. |
| `src/data/decks.ts` | Decks: name, the archetypes they use, tags, description. Currently empty. |
| `src/data/questions.ts` | Questions. Each option points at tag names. Currently empty. |

The quiz modes stay inactive until `decks.ts` and `questions.ts` are filled in.

No cost, difficulty or tier fields on purpose: those go stale with every banlist
and shop rotation, and a wrong number is worse than none.

### Adding a deck

```ts
// src/data/decks.ts
const DECK_LIST: DeckInput[] = [
  {
    name: 'Branded Despia',
    archetypes: ['branded', 'despia'],
    tags: ['fusion', 'midrange'],
    intro: 'One or two sentences on what the deck is and how it wins.',
  },
];
```

Archetype ids come from `slugify(name)` — lowercase, non-alphanumeric runs
become `-` (`D/D/D` → `d-d-d`, `@Ignister` → `ignister`). Tests fail on unknown
archetype ids. Tags feed the archive filter automatically.

### Adding questions

```ts
// src/data/questions.ts
export const QUESTIONS: Question[] = [
  {
    id: 'speed',
    prompt: 'How fast should games end?',
    options: [
      { id: 'fast', label: 'Fast', effects: [{ tag: 'otk', weight: 1 }] },
      { id: 'slow', label: 'Slow', effects: [{ tag: 'grind', weight: 1 }] },
    ],
  },
];
```

A negative weight means "rather not". Question order is not fixed: the engine
asks whichever question best separates the decks still in contention.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

## Disclaimer

Fan-made. Yu-Gi-Oh! and Master Duel are trademarks of Konami.
