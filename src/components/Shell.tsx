import type { ReactNode } from 'react';
import { hrefFor, type Route } from '../hooks/useHashRoute';

const NAV: { label: string; route: Route }[] = [
  { label: 'Build', route: { name: 'build' } },
  { label: 'Akinator', route: { name: 'akinator' } },
  { label: 'Mine', route: { name: 'identity' } },
  { label: 'Archive', route: { name: 'browse' } },
];

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <div className="shell">
        <header className="header">
          <a className="brand" href={hrefFor({ name: 'home' })}>
            <span className="brand__mark" aria-hidden="true">◈</span>
            Deck Akinator
          </a>
          <nav className="nav">
            {NAV.map((item) => (
              <a
                key={item.label}
                className="nav__link"
                href={hrefFor(item.route)}
                aria-current={item.route.name === route.name ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>
        <main className="main">{children}</main>
      </div>
    </>
  );
}
