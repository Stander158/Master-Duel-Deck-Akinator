import { useCallback, useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions';
import { buildResults } from '../engine/scoring';
import { nextQuestion, STANDARD_QUIZ } from '../engine/selector';
import type { Answer } from '../engine/types';
import { hrefFor } from '../hooks/useHashRoute';

/** Shared interview screen. All three modes run the same loop. */
export function Quiz({ title, resultCount = 5 }: { title: string; resultCount?: number }) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [seed] = useState(() => Math.floor(Math.random() * 0x7fffffff));

  const question = useMemo(
    () => nextQuestion(answers, seed, STANDARD_QUIZ),
    [answers, seed],
  );

  const answer = useCallback(
    (optionId: string | null) => {
      if (!question) return;
      setAnswers((prev) => [...prev, { questionId: question.id, optionId }]);
    },
    [question],
  );

  if (QUESTIONS.length === 0) {
    return (
      <div className="stack">
        <h1>{title}</h1>
        <p className="muted">No questions yet — they need decks and tags first.</p>
        <a className="tile" href={hrefFor({ name: 'browse' })}>
          Archive <span aria-hidden="true">→</span>
        </a>
      </div>
    );
  }

  if (question) {
    return (
      <div className="stack">
        <p className="step">
          {answers.length + 1} / {STANDARD_QUIZ.maxQuestions}
        </p>
        <h1>{question.prompt}</h1>
        <ul className="options">
          {question.options.map((option) => (
            <li key={option.id}>
              <button type="button" className="tile" onClick={() => answer(option.id)}>
                {option.label}
              </button>
            </li>
          ))}
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
          <button type="button" className="link-btn" onClick={() => answer(null)}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  const results = buildResults(answers).slice(0, resultCount);

  return (
    <div className="stack">
      <h1>Results</h1>
      <ol className="results">
        {results.map((r) => (
          <li key={r.deck.id}>
            <a className="result" href={hrefFor({ name: 'deck', id: r.deck.id })}>
              <span>{r.deck.name}</span>
              <span className="result__pct">{r.matchPercent}%</span>
            </a>
          </li>
        ))}
      </ol>
      <button type="button" className="link-btn" onClick={() => setAnswers([])}>
        Start over
      </button>
    </div>
  );
}
