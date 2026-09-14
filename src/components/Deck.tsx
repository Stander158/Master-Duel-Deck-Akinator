import { ARCHETYPES_BY_ID } from '../data/archetypes';
import { DECKS_BY_ID } from '../data/decks';
import { hrefFor } from '../hooks/useHashRoute';

export function Deck({ id }: { id: string }) {
  const deck = DECKS_BY_ID.get(id);

  if (!deck) {
    return (
      <div className="stack">
        <a className="back" href={hrefFor({ name: 'browse' })}>← Archive</a>
        <h1>Not found</h1>
      </div>
    );
  }

  return (
    <article className="deck">
      <a className="back" href={hrefFor({ name: 'browse' })}>← Archive</a>
      <h1>{deck.name}</h1>
      {deck.intro && <p className="deck__intro">{deck.intro}</p>}

      {deck.tags.length > 0 && (
        <ul className="tags">
          {deck.tags.map((tag) => (
            <li key={tag} className="tag">{tag}</li>
          ))}
        </ul>
      )}

      {deck.archetypes.length > 0 && (
        <section className="stack">
          <h2 className="label">Built from</h2>
          <ul className="tags">
            {deck.archetypes.map((archetypeId) => {
              const archetype = ARCHETYPES_BY_ID.get(archetypeId);
              return (
                <li key={archetypeId}>
                  <a className="tag tag--link" href={hrefFor({ name: 'archetype', id: archetypeId })}>
                    {archetype?.name ?? archetypeId}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
