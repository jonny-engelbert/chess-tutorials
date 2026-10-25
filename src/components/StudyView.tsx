import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from './Board';
import { MoveExplanation } from './MoveExplanation';
import { progress } from '../lib/progress';
import type { Chunk, Opening } from '../lib/types';

interface Props {
  opening: Opening;
  chunk: Chunk;
  onDrill: () => void;
  onQuiz: () => void;
  onExit: () => void;
}

/** Positions after each ply of the line (index 0 = start). */
export function linePositions(chunk: Chunk) {
  const chess = new Chess();
  const out = [{ fen: chess.fen(), from: '', to: '' }];
  for (const m of chunk.line) {
    const mv = chess.move(m.san);
    out.push({ fen: chess.fen(), from: mv.from, to: mv.to });
  }
  return out;
}

export function moveLabel(ply: number, san: string) {
  const n = Math.floor(ply / 2) + 1;
  return ply % 2 === 0 ? `${n}.${san}` : `${n}...${san}`;
}

export function StudyView({ opening, chunk, onDrill, onQuiz, onExit }: Props) {
  const positions = useMemo(() => linePositions(chunk), [chunk]);
  const [ply, setPly] = useState(0);
  const total = chunk.line.length;
  const key = `${opening.id}/${chunk.id}`;

  useEffect(() => {
    if (ply === total) progress.markStudied(key);
  }, [ply, total, key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPly((p) => Math.min(total, p + 1));
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total]);

  const cur = positions[ply];
  const checkpoint = chunk.line[ply]?.checkpoint;

  return (
    <div className="session">
      <div className="session-head">
        <button className="link" onClick={onExit}>← {opening.name}</button>
        <span className="muted">Study · {chunk.title}</span>
        <span className="muted">{ply}/{total}</span>
      </div>
      <div className="play">
        <Board fen={cur.fen} orientation={opening.side} lastMove={ply ? cur : undefined} />
        <div className="panel">
          <h2>{chunk.title}</h2>
          <p>{chunk.summary}</p>
          <div className="note" aria-live="polite">
            {ply === 0 ? (
              <span className="muted">Step through the line with → or the buttons below.</span>
            ) : (
              <>
                <b>{moveLabel(ply - 1, chunk.line[ply - 1].san)}</b>
                <MoveExplanation move={chunk.line[ply - 1]} />
              </>
            )}
          </div>
          {checkpoint && (
            <div className="checkpoint" key={ply}>
              <h3>Think first</h3>
              <p>{checkpoint.prompt}</p>
              <details>
                <summary>Reveal reasoning</summary>
                <p>{checkpoint.answer}</p>
              </details>
              <p className="muted small">Explain your choice to yourself, then play the next move. This is practice, not graded.</p>
            </div>
          )}
          <div className="actions">
            <button className="secondary" aria-label="Return to starting position" onClick={() => setPly(0)} disabled={ply === 0}>⏮</button>
            <button className="secondary" onClick={() => setPly((p) => p - 1)} disabled={ply === 0}>◀ Back</button>
            <button onClick={() => setPly((p) => p + 1)} disabled={ply === total}>Next ▶</button>
          </div>
          <ol className="movelist">
            {chunk.line.map((m, i) => (
              <li key={i}>
                <button aria-current={i === ply - 1 ? 'step' : undefined} className={`mv ${i === ply - 1 ? 'active' : ''} ${m.note ? 'noted' : ''}`} onClick={() => setPly(i + 1)}>
                  {moveLabel(i, m.san)}
                </button>
              </li>
            ))}
          </ol>
          <h3>Key ideas</h3>
          <ul className="ideas">
            {chunk.keyIdeas.map((k) => <li key={k}>{k}</li>)}
          </ul>
          {chunk.plans && (
            <div className="plans">
              <h3>Plans after this line</h3>
              <p><b>White:</b> {chunk.plans.white}</p>
              <p><b>Black:</b> {chunk.plans.black}</p>
            </div>
          )}
          {ply === total && (
            <div className="next-steps">
              <p>Line complete. Now test your recall:</p>
              <div className="actions">
                <button onClick={onDrill}>Drill the line</button>
                <button className="secondary" onClick={onQuiz}>Take the quiz</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
