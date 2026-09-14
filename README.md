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
| `src/data/tags.ts` | Tags per archetype, keyed by id. Currently empty. |
| `src/data/questions.ts` | Questions. Each option points at tag names. Currently empty. |

The quiz modes stay inactive until `tags.ts` and `questions.ts` are filled in.
Archetypes without tags score zero and are never recommended.

### Adding tags

```ts
// src/data/tags.ts
export const TAGS: Record<string, string[]> = {
  'blue-eyes': ['dragon', 'beatdown'],
};
```

Ids come from `slugify(name)` — lowercase, non-alphanumeric runs become `-`
(`D/D/D` → `d-d-d`, `@Ignister` → `ignister`). Tests fail on unknown ids.

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
