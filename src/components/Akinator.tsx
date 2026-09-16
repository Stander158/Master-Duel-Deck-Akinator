import { useCallback, useMemo, useState } from 'react';
import { ARCHETYPES, familyOf } from '../data/archetypes';
import { AKINATOR_QUESTIONS } from '../data/akinator-questions';
import { buildResults } from '../engine/scoring';
import { nextQuestion } from '../engine/selector';
import type { Answer } from '../engine/types';
import { hrefFor } from '../hooks/useHashRoute';

/** Guessing stops once one archetype is this far ahead, or questions run out. */
const CONFIG = { minQuestions: 8, maxQuestions: 20, confidence: 0.45 };

export function Akinator() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [seed] = useState(() => Math.floor(Math.random() * 0x7fffffff));

  const pool = useMemo(
    () => ARCHETYPES.filter((a) => a.tags.length > 0 && !rejected.includes(a.family)),
    [rejected],
  );

  const question = useMemo(
    () => nextQuestion(answers, seed, CONFIG, pool, AKINATOR_QUESTIONS),
    [answers, seed, pool],
  );

  const results = useMemo(
    () => (question ? [] : buildResults(answers, pool, AKINATOR_QUESTIONS)),
    [question, answers, pool],
  );

  const answer = useCallback(
    (optionId: string | null) => {
      if (!question) return;
      setAnswers((prev) => [...prev, { questionId: question.id, optionId }]);
    },
    [question],
  );

  if (question) {
    return (
      <div className="stack">
        <p className="step">
          Question {answers.length + 1} · {pool.length} archetypes left
        </p>
        <h1>{question.prompt}</h1>
        <ul className="options">
          <li>
            <button type="button" className="tile" onClick={() => answer('yes')}>Yes</button>
          </li>
          <li>
            <button type="button" className="tile" onClick={() => answer('no')}>No</button>
          </li>
          <li>
            {/* Unsure records the question as asked without eliminating anyone —
                a Link-only archetype genuinely has no Level to answer about. */}
            <button type="button" className="tile" onClick={() => answer(null)}>Not sure</button>
          </li>
        </ul>
        <div className="row">
          <button
            type="button"
            className="link-btn"
            onClick={() => setAnswers((prev) => prev.slice(0, -1))}
            disabled={answers.length === 0}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const top = results[0];
  if (!top) {
    return (
      <div className="stack">
        <h1>I have nothing left</h1>
        <p className="muted">Every archetype has been ruled out. Start again?</p>
        <button type="button" className="tile" onClick={() => { setAnswers([]); setRejected([]); }}>
          Start over
        </button>
      </div>
    );
  }

  // A guess anywhere in the family counts: the player names one member and
  // answers about another, so the siblings are shown rather than hidden.
  const family = familyOf(top.item.id).filter((a) => a.id !== top.item.id);

  return (
    <div className="stack">
      <p className="step">My guess</p>
      <h1>{top.item.name}</h1>
      <p className="muted">
        {top.matchPercent}% match after {answers.length} questions
      </p>

      {family.length > 0 && (
        <section className="stack">
          <h2 className="label">Same family</h2>
          <ul className="tags">
            {family.map((a) => (
              <li key={a.id}>
                <a className="tag tag--link" href={hrefFor({ name: 'archetype', id: a.id })}>
                  {a.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="row">
        <button
          type="button"
          className="link-btn"
          onClick={() => setRejected((prev) => [...prev, top.item.family])}
        >
          Wrong — keep going
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={() => { setAnswers([]); setRejected([]); }}
        >
          Start over
        </button>
      </div>
    </div>
  );
}
