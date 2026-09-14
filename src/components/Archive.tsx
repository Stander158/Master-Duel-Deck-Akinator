import { useMemo, useState } from 'react';
import { ARCHETYPES } from '../data/archetypes';
import { ALL_TAGS, DECKS } from '../data/decks';
import { hrefFor, type Route } from '../hooks/useHashRoute';

type View = 'decks' | 'archetypes';

export function Archive() {
  const [view, setView] = useState<View>('decks');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');

  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const match = (name: string) => !needle || name.toLowerCase().includes(needle);

    if (view === 'archetypes') {
      return ARCHETYPES.filter((a) => match(a.name)).map((a) => ({
        id: a.id,
        name: a.name,
        route: { name: 'archetype', id: a.id } as Route,
      }));
    }

    return DECKS.filter((d) => match(d.name) && (!tag || d.tags.includes(tag))).map((d) => ({
      id: d.id,
      name: d.name,
      route: { name: 'deck', id: d.id } as Route,
    }));
  }, [view, query, tag]);

  return (
    <div className="stack">
      <div className="segmented" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'decks'}
          onClick={() => setView('decks')}
        >
          Decks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'archetypes'}
          onClick={() => setView('archetypes')}
        >
          Archetypes
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search"
        />
        {view === 'decks' && ALL_TAGS.length > 0 && (
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
            <option value="">All tags</option>
            {ALL_TAGS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <span className="count">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="muted">
          {view === 'decks' ? 'No decks defined yet.' : 'Nothing matches.'}
        </p>
      ) : (
        <ul className="name-grid">
          {items.map((item) => (
            <li key={item.id}>
              <a className="name-grid__item" href={hrefFor(item.route)}>{item.name}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
