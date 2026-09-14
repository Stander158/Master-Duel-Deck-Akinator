# Master Duel Deck Akinator

A deck recommender for Yu-Gi-Oh! Master Duel. React + TypeScript + Vite, no backend.

## Modes

- **Which deck should I build?** — `#/build`
- **Akinator** — guess the archetype you are thinking of — `#/akinator`
- **Which deck is mine?** — `#/identity`
- **Archive** — all 266 archetypes — `#/browse`

## Data

| File | Contents |
| --- | --- |
| `src/data/archetypes.ts` | Archetype names. Names only — nothing here rates a deck. |
| `src/data/decks.ts` | Tags and a short description per archetype. Currently empty. |
| `src/data/questions.ts` | Questions. Each option points at tag names. Currently empty. |

The quiz modes stay inactive until `decks.ts` and `questions.ts` are filled in.
Archetypes without tags score zero and are never recommended.

No cost, difficulty or tier fields on purpose: those go stale with every banlist
and shop rotation, and a wrong number is worse than none.

### Adding a deck entry

```ts
// src/data/decks.ts
export const DECKS: Record<string, DeckInfo> = {
  'blue-eyes': {
    tags: ['dragon', 'beatdown'],
    intro: 'One or two sentences on what the deck is and how it wins.',
  },
};
```

Ids come from `slugify(name)` — lowercase, non-alphanumeric runs become `-`
(`D/D/D` → `d-d-d`, `@Ignister` → `ignister`). Tests fail on unknown ids.
Tags feed the archive filter automatically.

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
