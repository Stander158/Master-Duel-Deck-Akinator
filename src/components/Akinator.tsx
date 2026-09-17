import { useCallback, useMemo, useState } from 'react';
import { ARCHETYPES, familyOf } from '../data/archetypes';
import { AKINATOR_QUESTIONS } from '../data/akinator-questions';
import { buildResults } from '../engine/scoring';
import { nextQuestion } from '../engine/selector';
import type { Answer } from '../engine/types';
import { hrefFor } from '../hooks/useHashRoute';

/** Guessing stops once one archetype is this far ahead, or questions run out. */
const CONFIG = { minQuestions: 8, maxQuestions: 20, confidence: 0.45 };

/** Belief as a readable percentage, without rounding a real value to zero. */
function formatBelief(probability: number): string {
  const pct = probability * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return '<1%';
}

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

  /**
   * Ranked candidates, ties broken by how many cards the archetype has.
   *
   * Early on, hundreds match every answer exactly and score identically. The
   * default order then falls back to registry order, which surfaces whatever
   * happens to sort first — Alien, Ancient Warriors. Preferring the larger
   * setcode is a better guess at what someone has in mind than the alphabet.
   */
  const results = useMemo(() => {
    const ranked = buildResults(answers, pool, AKINATOR_QUESTIONS);
    return ranked.sort((a, b) => b.score - a.score || b.item.cards - a.item.cards);
  }, [answers, pool]);

  /**
   * How many archetypes are still genuinely in contention.
   *
   * Scoring is soft — a wrong answer must not delete the right archetype — so
   * nothing is ever eliminated and a raw pool count would sit at 585 forever.
   * Counting how many candidates it takes to cover most of the belief is the
   * honest version of "how many are left", and it does fall as answers land.
   */
  const inPlay = useMemo(() => {
    let mass = 0;
    let count = 0;
    for (const result of results) {
      mass += result.probability;
      count++;
      if (mass >= 0.9) break;
    }
    return count;
  }, [results]);

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
          Question {answers.length + 1} · {inPlay} still in play
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

        {answers.length > 0 && (
          <section className="stack">
            <h2 className="label">Currently leading</h2>
            <ol className="results">
              {results.slice(0, 3).map((result) => (
                <li key={result.item.id}>
                  <span className="result">
                    <span>{result.item.name}</span>
                    <span className="result__pct">{formatBelief(result.probability)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
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
        {formatBelief(top.probability)} confident after {answers.length} questions
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
