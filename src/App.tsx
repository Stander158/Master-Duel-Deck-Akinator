import { Archive } from './components/Archive';
import { ArchetypePage } from './components/ArchetypePage';
import { Deck } from './components/Deck';
import { Home } from './components/Home';
import { Quiz } from './components/Quiz';
import { Shell } from './components/Shell';
import { useHashRoute } from './hooks/useHashRoute';

export default function App() {
  const { route } = useHashRoute();

  return (
    <Shell route={route}>
      {route.name === 'home' && <Home />}
      {route.name === 'build' && <Quiz title="Which deck should I build?" />}
      {route.name === 'akinator' && <Quiz title="Akinator" resultCount={3} />}
      {route.name === 'identity' && <Quiz title="Which deck is mine?" resultCount={1} />}
      {route.name === 'browse' && <Archive />}
      {route.name === 'deck' && <Deck id={route.id} />}
      {route.name === 'archetype' && <ArchetypePage id={route.id} />}
    </Shell>
  );
}
