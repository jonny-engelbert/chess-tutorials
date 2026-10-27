import { useEffect, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Board, applyMove } from './Board';
import { answerSquares, judge, toSan, type Verdict } from '../lib/answer';
import { progress } from '../lib/progress';
import { formatInterval, type CardState, type Grade } from '../lib/srs';
import type { Card } from '../lib/types';

interface Props {
  title: string;
  cards: Card[];
  onExit: () => void;
}

interface Entry {
  card: Card;
  /** Re-queued after a miss: practise again, but don't re-grade. */
  relearn: boolean;
}

interface Result {
  card: Card;
  grade: Grade;
  next: CardState;
}

const FAST_MS = 8000;
const RELEARN_GAP = 2;

type Phase =
  | { kind: 'ask' }
  | { kind: 'retry'; tried: string }
  | { kind: 'done'; verdict: Verdict | 'revealed'; played?: string; fen: string; grade?: Grade; next?: CardState };

export function QuizSession({ title, cards, onExit }: Props) {
  const [queue, setQueue] = useState<Entry[]>(() => cards.map((card) => ({ card, relearn: false })));
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'ask' });
  const [hints, setHints] = useState(0);
  const [typed, setTyped] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  // Touch devices: tap the board by default, typing is opt-in (the keyboard would cover the board).
  const [typing, setTyping] = useState(() => !window.matchMedia?.('(pointer: coarse)').matches);
  const started = useRef(Date.now());

  const entry = queue[pos];
  useEffect(() => {
    started.current = Date.now();
  }, [pos]);

  if (!entry) return <Summary title={title} results={results} onExit={onExit} />;

  const { card, relearn } = entry;
  const q = card.question;
  const orientation = card.opening.side;
  const sideName = orientation === 'white' ? 'White' : 'Black';

  function finish(verdict: Verdict | 'revealed', played?: string, fenAfter?: string) {
    const firstTry = phase.kind === 'ask';
    let grade: Grade;
    if (verdict === 'correct') {
      // Only a clean first attempt earns good/easy; any help means "hard".
      if (!firstTry || hints > 0) grade = 'hard';
      else grade = Date.now() - started.current < FAST_MS ? 'easy' : 'good';
    } else if (verdict === 'alternative') {
      grade = 'hard';
    } else grade = 'again';

    let next: CardState | undefined;
    if (!relearn) {
      next = progress.grade(q.id, grade);
      setResults((r) => [...r, { card, grade, next: next! }]);
    }
    if (grade === 'again' || (relearn && verdict !== 'correct')) {
      // In-session relearning: see the card again a little later.
      setQueue((qq) => {
        const copy = [...qq];
        copy.splice(Math.min(pos + 1 + RELEARN_GAP, copy.length), 0, { card, relearn: true });
        return copy;
      });
    }
    setPhase({ kind: 'done', verdict, played, fen: fenAfter ?? q.fen, grade: relearn ? undefined : grade, next });
  }

  function submit(san: string | null, fenAfter?: string) {
    const verdict = judge(q, san);
    if (verdict === 'illegal') return false;
    if (verdict === 'wrong' && phase.kind === 'ask') {
      setPhase({ kind: 'retry', tried: san! });
      return false;
    }
    finish(verdict, san!, fenAfter);
    return true;
  }

  function onBoardMove(from: string, to: string) {
    if (phase.kind === 'done') return false;
    const r = applyMove(q.fen, from, to);
    if (!r) return false;
    return submit(r.san, r.fen);
  }

  function onType(e: React.FormEvent) {
    e.preventDefault();
    if (phase.kind === 'done') return;
    const san = toSan(q.fen, typed);
    if (!san) {
      setTyped('');
      flash(`"${typed}" isn't a legal move here.`);
      return;
    }
    const fenAfter = new Chess(q.fen);
    fenAfter.move(san);
    setTyped('');
    submit(san, fenAfter.fen());
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function next() {
    setPos((p) => p + 1);
    setPhase({ kind: 'ask' });
    setHints(0);
    setTyped('');
    window.scrollTo(0, 0);
  }

  const sq = answerSquares(q);
  const done = phase.kind === 'done';
  const arrows: [Square, Square, string][] = done ? [[sq.from as Square, sq.to as Square, 'rgba(46,160,67,.85)']] : [];
  const highlight = !done && hints >= 2 ? { [sq.from]: { boxShadow: 'inset 0 0 0 4px #e0a800' } } : {};
  const remaining = queue.length - pos;

  return (
    <div className="session">
      <div className="session-head">
        <button className="link" onClick={onExit}>← Exit</button>
        <span className="muted">{title}</span>
        <span className="muted">{remaining} left</span>
      </div>
      <div className="progressbar"><div style={{ width: `${(pos / queue.length) * 100}%` }} /></div>

      <div className="play">
        <Board
          fen={done ? phase.fen : q.fen}
          orientation={orientation}
          onMove={done ? undefined : onBoardMove}
          arrows={arrows}
          highlight={highlight}
        />

        <div className="panel">
          <div className="crumb">
            {card.opening.name} · {card.chunk.title}
            {relearn && <span className="tag">relearn</span>}
          </div>
          <h2 className="prompt">{q.prompt}</h2>
          <p className="muted">{sideName} to move. Play it on the board{typing ? ' or type it in' : ''}.</p>

          {!done && (
            <>
              {typing && (
                <form onSubmit={onType} className="type-row">
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="e.g. Nf3, O-O, exd5"
                    aria-label="Type your move"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <button type="submit" disabled={!typed.trim()}>Submit</button>
                </form>
              )}
              {phase.kind === 'retry' && (
                <div className="feedback wrong">
                  <strong>{phase.tried}</strong> isn't the move we're looking for. You get one more try.
                </div>
              )}
              {hints >= 1 && <div className="hint">💡 {q.hint}</div>}
              {hints >= 2 && <div className="hint">The piece to move is highlighted.</div>}
              <div className="actions">
                {hints < 2 && (
                  <button className="secondary" onClick={() => setHints((h) => h + 1)}>
                    {hints === 0 ? 'Hint' : 'Bigger hint'}
                  </button>
                )}
                <button className="secondary" onClick={() => finish('revealed')}>Show answer</button>
                <button className="secondary" onClick={() => setTyping((t) => !t)}>
                  {typing ? 'Hide keyboard input' : '⌨ Type instead'}
                </button>
              </div>
              <details className="fen-details">
                <summary>Position (FEN)</summary>
                <p className="fen">{q.fen}</p>
              </details>
            </>
          )}

          {done && (
            <>
              <Feedback verdict={phase.verdict} played={phase.played} answer={q.answer} />
              <p className="explain">{q.explanation}</p>
              {phase.grade && phase.next && (
                <p className="muted small">
                  Graded <b>{phase.grade}</b>. You'll see this again in {formatInterval(phase.next)}.
                </p>
              )}
              {phase.verdict !== 'correct' && phase.verdict !== 'alternative' && (
                <p className="muted small">This card comes back later in this session.</p>
              )}
              <div className="actions">
                <button onClick={next} autoFocus>Continue →</button>
              </div>
            </>
          )}
          {toast && <div className="toast">{toast}</div>}
        </div>
      </div>
    </div>
  );
}

function Feedback({ verdict, played, answer }: { verdict: Verdict | 'revealed'; played?: string; answer: string }) {
  if (verdict === 'correct') return <div className="feedback right">✓ Correct: <b>{answer}</b></div>;
  if (verdict === 'alternative')
    return (
      <div className="feedback alt">
        <b>{played}</b> is a good move too, but this repertoire plays <b>{answer}</b>.
      </div>
    );
  if (verdict === 'revealed') return <div className="feedback wrong">The move is <b>{answer}</b>.</div>;
  return (
    <div className="feedback wrong">
      ✗ <b>{played}</b> isn't it. The move is <b>{answer}</b>.
    </div>
  );
}

function Summary({ title, results, onExit }: { title: string; results: Result[]; onExit: () => void }) {
  const firstTry = results.filter((r) => r.grade === 'good' || r.grade === 'easy').length;
  return (
    <div className="summary">
      <h2>{title}: complete</h2>
      {results.length === 0 ? (
        <p className="muted">Nothing was graded this time.</p>
      ) : (
        <>
          <p className="big">
            {firstTry} / {results.length} <span className="muted">clean on the first try</span>
          </p>
          <ul className="result-list">
            {results.map((r) => (
              <li key={r.card.question.id}>
                <span className={`grade g-${r.grade}`}>{r.grade}</span>
                <span>{r.card.chunk.title}: {r.card.question.answer}</span>
                <span className="muted">next in {formatInterval(r.next)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <button onClick={onExit}>Done</button>
    </div>
  );
}
