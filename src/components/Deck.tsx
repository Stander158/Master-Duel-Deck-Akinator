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

  return (
    <div className="stack">
      <a className="back" href={hrefFor({ name: 'browse' })}>← Archive</a>
      <h1>{archetype.name}</h1>
      {archetype.tags.length > 0 ? (
        <ul className="tags">
          {archetype.tags.map((tag) => (
            <li key={tag} className="tag">{tag}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">No tags yet.</p>
      )}
    </div>
  );
}
