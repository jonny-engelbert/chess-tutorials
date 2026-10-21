import { useProgress } from '../lib/progress';
import { formatInterval, isDue, status, type CardStatus } from '../lib/srs';
import type { Chunk, Opening } from '../lib/types';

export type Mode = 'study' | 'drill' | 'quiz';

interface Props {
  opening: Opening;
  onStart: (chunkId: string, mode: Mode) => void;
  onExit: () => void;
}

const LABEL: Record<CardStatus, string> = { new: 'New', learning: 'Learning', review: 'Reviewing', mastered: 'Mastered' };

export function ChunkMeter({ chunk }: { chunk: Chunk }) {
  const p = useProgress();
  return (
    <span className="meter" aria-label="card progress">
      {chunk.questions.map((q) => {
        const s = status(p.cards[q.id]);
        return <i key={q.id} className={`dot s-${s}`} title={LABEL[s]} />;
      })}
    </span>
  );
}

export function OpeningView({ opening, onStart, onExit }: Props) {
  const p = useProgress();
  const firstIncomplete = opening.chunks.findIndex((c) => c.questions.some((q) => !p.cards[q.id]));

  return (
    <div className="opening">
      <button className="link" onClick={onExit}>← All openings</button>
      <header>
        <span className={`side side-${opening.side}`}>{opening.side === 'white' ? '♔ You play White' : '♚ You play Black'}</span>
        <h1>{opening.name}</h1>
        <p>{opening.summary}</p>
      </header>

      <ol className="chunks">
        {opening.chunks.map((c, i) => {
          const key = `${opening.id}/${c.id}`;
          const studied = !!p.studied[key];
          const drilled = !!p.drilled[key];
          const states = c.questions.map((q) => p.cards[q.id]);
          const due = states.filter((s) => isDue(s)).length;
          const quizzed = states.every(Boolean);
          const nextDue = states.filter(Boolean).sort((a, b) => a!.due - b!.due)[0];
          const recommended: Mode = !studied ? 'study' : !drilled ? 'drill' : 'quiz';
          return (
            <li key={c.id} className={`chunk ${i === firstIncomplete ? 'current' : ''}`}>
              <div className="chunk-head">
                <span className="chunk-num">{i + 1}</span>
                <div>
                  <h3>{c.title}</h3>
                  <p className="muted small">{c.summary}</p>
                </div>
              </div>
              <div className="chunk-foot">
                <div className="checks small">
                  <span className={studied ? 'ok' : ''}>{studied ? '✓' : '○'} Studied</span>
                  <span className={drilled ? 'ok' : ''}>{drilled ? '✓' : '○'} Drilled</span>
                  <span className={quizzed ? 'ok' : ''}>
                    <ChunkMeter chunk={c} /> Quiz
                  </span>
                  {due > 0 && <span className="due">{due} due</span>}
                  {!due && nextDue && <span className="muted">next review in {formatInterval(nextDue)}</span>}
                </div>
                <div className="actions">
                  {(['study', 'drill', 'quiz'] as Mode[]).map((m) => (
                    <button key={m} className={m === recommended ? '' : 'secondary'} onClick={() => onStart(c.id, m)}>
                      {m[0].toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
