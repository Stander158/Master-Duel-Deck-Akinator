import { useMemo, useState } from 'react';
import { ARCHETYPES } from '../data/archetypes';
import { ALL_TAGS } from '../data/tags';
import { hrefFor } from '../hooks/useHashRoute';

export function Archive() {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ARCHETYPES.filter(
      (a) =>
        (!needle || a.name.toLowerCase().includes(needle)) && (!tag || a.tags.includes(tag)),
    );
  }, [query, tag]);

  return (
    <div className="stack">
      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search archetypes"
        />
        {ALL_TAGS.length > 0 && (
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
            <option value="">All tags</option>
            {ALL_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <span className="count">{visible.length}</span>
      </div>

      <ul className="name-grid">
        {visible.map((a) => (
          <li key={a.id}>
            <a className="name-grid__item" href={hrefFor({ name: 'deck', id: a.id })}>
              {a.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
