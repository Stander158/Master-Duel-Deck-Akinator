import { ARCHETYPES_BY_ID } from '../data/archetypes';
import { hrefFor } from '../hooks/useHashRoute';

export function Deck({ id }: { id: string }) {
  const archetype = ARCHETYPES_BY_ID.get(id);

  if (!archetype) {
    return (
      <div className="stack">
        <a className="back" href={hrefFor({ name: 'browse' })}>← Archive</a>
        <h1>Not found</h1>
      </div>
    );
  }

  const { name, intro, tags } = archetype;

  return (
    <article className="deck">
      <a className="back" href={hrefFor({ name: 'browse' })}>← Archive</a>
      <h1>{name}</h1>
      {intro && <p className="deck__intro">{intro}</p>}
      {tags.length > 0 && (
        <ul className="tags">
          {tags.map((tag) => (
            <li key={tag} className="tag">{tag}</li>
          ))}
        </ul>
      )}
      {!intro && tags.length === 0 && <p className="muted">Nothing written yet.</p>}
    </article>
  );
}
