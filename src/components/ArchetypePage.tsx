import { ARCHETYPES_BY_ID } from '../data/archetypes';
import { decksUsing } from '../data/decks';
import { hrefFor } from '../hooks/useHashRoute';

export function ArchetypePage({ id }: { id: string }) {
  const archetype = ARCHETYPES_BY_ID.get(id);

  if (!archetype) {
    return (
      <div className="stack">
        <a className="back" href={hrefFor({ name: 'browse' })}>← Archive</a>
        <h1>Not found</h1>
      </div>
    );
  }

  const decks = decksUsing(archetype.id);

  return (
    <article className="deck">
      <a className="back" href={hrefFor({ name: 'browse' })}>← Archive</a>
      <h1>{archetype.name}</h1>
      <p className="muted">Archetype — a card family decks are built from.</p>

      <section className="stack">
        <h2 className="label">Decks using it</h2>
        {decks.length > 0 ? (
          <ul className="tags">
            {decks.map((deck) => (
              <li key={deck.id}>
                <a className="tag tag--link" href={hrefFor({ name: 'deck', id: deck.id })}>
                  {deck.name}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">None yet.</p>
        )}
      </section>
    </article>
  );
}
