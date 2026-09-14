import { ARCHETYPES_BY_ID } from '../data/archetypes';
import { guideFor } from '../data/guides';
import type { Block } from '../engine/types';
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

  const guide = guideFor(archetype.id);

  return (
    <article className="deck">
      <a className="back" href={hrefFor({ name: 'browse' })}>← Archive</a>

      <header className="deck__head">
        <h1>{archetype.name}</h1>
        {guide?.intro && <p className="deck__intro">{guide.intro}</p>}
        {archetype.tags.length > 0 && (
          <ul className="tags">
            {archetype.tags.map((tag) => (
              <li key={tag} className="tag">{tag}</li>
            ))}
          </ul>
        )}
      </header>

      {guide?.facts && guide.facts.length > 0 && (
        <dl className="facts">
          {guide.facts.map((fact) => (
            <div key={fact.label} className="facts__item">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {guide?.sections?.map((section) => (
        <section key={section.heading} className="guide-section">
          <h2>{section.heading}</h2>
          {section.blocks.map((block, i) => (
            <BlockView key={i} block={block} />
          ))}
        </section>
      ))}

      {!guide && archetype.tags.length === 0 && <p className="muted">No tags or guide yet.</p>}
      {!guide && archetype.tags.length > 0 && <p className="muted">No guide yet.</p>}
    </article>
  );
}

function BlockView({ block }: { block: Block }) {
  if ('p' in block) return <p className="guide-p">{block.p}</p>;

  if ('list' in block) {
    return (
      <ul className="guide-list">
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if ('cards' in block) {
    return (
      <ul className="guide-cards">
        {block.cards.map((card) => (
          <li key={card}>{card}</li>
        ))}
      </ul>
    );
  }

  return <p className="guide-note">{block.note}</p>;
}
