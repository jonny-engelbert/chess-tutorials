import { useEffect, useMemo, useState } from 'react';
import type { Square } from 'chess.js';
import { Board, applyMove } from './Board';
import { linePositions, moveLabel } from './StudyView';
import { MoveExplanation } from './MoveExplanation';
import { progress } from '../lib/progress';
import type { Chunk, Opening } from '../lib/types';

interface Props {
  opening: Opening;
  chunk: Chunk;
  onQuiz: () => void;
  onExit: () => void;
}

/**
 * Active recall of the whole line: the learner plays their side's moves,
 * the opponent's replies are played automatically.
 */
export function DrillView({ opening, chunk, onQuiz, onExit }: Props) {
  const positions = useMemo(() => linePositions(chunk), [chunk]);
  const learnerParity = opening.side === 'white' ? 0 : 1;
  const total = chunk.line.length;
  const [ply, setPly] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [miss, setMiss] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  const learnersTurn = ply < total && ply % 2 === learnerParity;
  const finished = ply === total;

  // Auto-play the opponent's move.
  useEffect(() => {
    if (ply < total && !learnersTurn && !miss) {
      const t = setTimeout(() => setPly((p) => p + 1), 550);
      return () => clearTimeout(t);
    }
  }, [ply, total, learnersTurn, miss, run]);

  useEffect(() => {
    if (finished) progress.markDrilled(`${opening.id}/${chunk.id}`);
  }, [finished, opening.id, chunk.id]);

  function onMove(from: string, to: string) {
    if (!learnersTurn || miss) return false;
    const r = applyMove(positions[ply].fen, from, to);
    if (!r) return false;
    if (r.san === chunk.line[ply].san) {
      setPly((p) => p + 1);
      return true;
    }
    setMistakes((m) => m + 1);
    setMiss(r.san);
    return false;
  }

  function restart() {
    setPly(0);
    setMistakes(0);
    setMiss(null);
    setRun((r) => r + 1);
  }

  const cur = positions[ply];
  const expected = ply < total ? positions[ply + 1] : null;
  const arrows: [Square, Square, string][] =
    miss && expected ? [[expected.from as Square, expected.to as Square, 'rgba(46,160,67,.85)']] : [];
  const lastNote = ply > 0 ? chunk.line[ply - 1].note : undefined;

  return (
    <div className="session">
      <div className="session-head">
        <button className="link" onClick={onExit}>← {opening.name}</button>
        <span className="muted">Drill · {chunk.title}</span>
        <span className="muted">mistakes: {mistakes}</span>
      </div>
      <div className="progressbar"><div style={{ width: `${(ply / total) * 100}%` }} /></div>
      <div className="play">
        <Board fen={cur.fen} orientation={opening.side} onMove={finished ? undefined : onMove} arrows={arrows} lastMove={ply ? cur : undefined} />
        <div className="panel">
          <h2>Play the line from memory</h2>
          <p className="muted">You play {opening.side === 'white' ? 'White' : 'Black'}. Your opponent replies automatically.</p>
          {miss && expected && (
            <div className="feedback wrong">
              <b>{miss}</b> leaves the line. The move is <b>{moveLabel(ply, chunk.line[ply].san)}</b>.
              <MoveExplanation move={chunk.line[ply]} />
              <div className="actions">
                <button onClick={() => { setMiss(null); setPly((p) => p + 1); }}>Play it & continue</button>
              </div>
            </div>
          )}
          {!miss && !finished && (
            <div className="note">
              {learnersTurn ? <b>Your move.</b> : <span className="muted">Opponent is thinking…</span>}
              {lastNote && ply > 0 && <p className="small muted">{moveLabel(ply - 1, chunk.line[ply - 1].san)}: {lastNote}</p>}
            </div>
          )}
          {finished && (
            <div className="next-steps">
              <p>
                {mistakes === 0 ? '🎯 Perfect run!' : `Finished with ${mistakes} mistake${mistakes > 1 ? 's' : ''}. Run it again until it's clean.`}
              </p>
              <div className="actions">
                <button className="secondary" onClick={restart}>Drill again</button>
                <button onClick={onQuiz}>Take the quiz</button>
              </div>
            </div>
          )}
          <ol className="movelist">
            {chunk.line.slice(0, ply).map((m, i) => (
              <li key={i}><span className="mv">{moveLabel(i, m.san)}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
