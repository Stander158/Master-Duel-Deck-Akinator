import { hrefFor, type Route } from '../hooks/useHashRoute';

const MODES: { label: string; route: Route }[] = [
  { label: 'Which deck should I build?', route: { name: 'build' } },
  { label: 'Akinator — guess my archetype', route: { name: 'akinator' } },
  { label: 'Which deck is mine?', route: { name: 'identity' } },
  { label: 'Archive', route: { name: 'browse' } },
];

export function Home() {
  return (
    <div className="home">
      <h1 className="home__title">Deck Akinator</h1>
      <ul className="home__modes">
        {MODES.map((mode, i) => (
          <li key={mode.label}>
            <a className={i === 0 ? 'tile tile--primary' : 'tile'} href={hrefFor(mode.route)}>
              {mode.label}
              <span aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
