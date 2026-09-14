import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'build' }
  | { name: 'akinator' }
  | { name: 'identity' }
  | { name: 'browse' }
  | { name: 'deck'; id: string };

export const MODE_ROUTES = ['build', 'akinator', 'identity'] as const;
export type ModeName = (typeof MODE_ROUTES)[number];

function parse(hash: string): Route {
  const segments = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [head, tail] = segments;
  switch (head) {
    case 'build':
      return { name: 'build' };
    case 'akinator':
      return { name: 'akinator' };
    case 'identity':
      return { name: 'identity' };
    case 'browse':
      return { name: 'browse' };
    case 'deck':
      return tail ? { name: 'deck', id: tail } : { name: 'browse' };
    default:
      return { name: 'home' };
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'deck':
      return `#/deck/${route.id}`;
    default:
      return `#/${route.name}`;
  }
}

/**
 * Minimal hash router. The app has six screens and no need for nested layouts
 * or data loaders, so a dependency-free reader of `location.hash` is plenty —
 * and it keeps the build deployable to any static host without server rewrites.
 */
export function useHashRoute(): { route: Route; navigate: (to: Route) => void } {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: Route) => {
    const next = hrefFor(to);
    if (window.location.hash === next) {
      setRoute(parse(next));
      return;
    }
    window.location.hash = next;
  }, []);

  // Scrolling back to the top on navigation matters because the question
  // screens are tall and the header is sticky.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route.name, route.name === 'deck' ? route.id : '']);

  return { route, navigate };
}
