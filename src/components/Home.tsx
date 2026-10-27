import { useRef, useState } from 'react';
import { openings, allCards } from '../lib/openings';
import { progress, useProgress } from '../lib/progress';
import { isDue, status } from '../lib/srs';
import { ChunkMeter, type Mode } from './OpeningView';
import type { Chunk, Opening } from '../lib/types';

interface Props {
  onOpen: (id: string) => void;
  onReview: () => void;
  onContinue: (openingId: string, chunkId: string, mode: Mode) => void;
}

interface Step {
  opening: Opening;
  chunk: Chunk;
  mode: Mode;
}

/** The next unfinished chunk, starting with the opening the learner touched last. */
function nextStep(p: ReturnType<typeof useProgress>): Step | null {
  const lastId = p.history[p.history.length - 1]?.id;
  const lastOpening = allCards().find((c) => c.question.id === lastId)?.opening;
  const lastStudied = Object.entries(p.studied).sort((a, b) => b[1] - a[1])[0]?.[0].split('/')[0];
  const start = lastOpening?.id ?? lastStudied;
  const ordered = [...openings].sort((a, b) => Number(b.id === start) - Number(a.id === start));
  for (const opening of ordered) {
    for (const chunk of opening.chunks) {
      const key = `${opening.id}/${chunk.id}`;
      if (!p.studied[key]) return { opening, chunk, mode: 'study' };
      if (!p.drilled[key]) return { opening, chunk, mode: 'drill' };
      if (chunk.questions.some((q) => !p.cards[q.id])) return { opening, chunk, mode: 'quiz' };
    }
  }
  return null;
}

const MODE_LABEL: Record<Mode, string> = { study: 'Study', drill: 'Drill', quiz: 'Quiz' };

export function Home({ onOpen, onReview, onContinue }: Props) {
  const p = useProgress();
  const cards = allCards();
  const due = cards.filter((c) => isDue(p.cards[c.question.id])).length;
  const seen = cards.filter((c) => p.cards[c.question.id]).length;
  const mastered = cards.filter((c) => status(p.cards[c.question.id]) === 'mastered').length;
  const step = nextStep(p);
  const fresh = !step || (seen === 0 && Object.keys(p.studied).length === 0);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  function exportProgress() {
    const url = URL.createObjectURL(new Blob([progress.exportJson()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `opening-tutor-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importProgress(file: File | undefined) {
    if (!file) return;
    if (!confirm('Replace your current progress with this file?')) return;
    setMessage(progress.importJson(await file.text()) ? 'Progress imported.' : "That file isn't valid progress data.");
    if (fileInput.current) fileInput.current.value = '';
  }

  return (
    <div className="home">
      <section className="hero">
        <div>
          <h1>Opening Tutor</h1>
          <p className="muted">
            Understand the plan, compare candidate moves, then build recall with drills and spaced-repetition quizzes.
          </p>
        </div>
        <div className="stats">
          <Stat n={due} label="due now" />
          <Stat n={seen} label={`of ${cards.length} learned`} />
          <Stat n={mastered} label="mastered" />
        </div>
        <div className="hero-actions">
          {due > 0 && (
            <button className="review-btn" onClick={onReview}>
              Review {due} due card{due > 1 ? 's' : ''}
            </button>
          )}
          {step && (
            <button
              className={`review-btn ${due > 0 ? 'secondary' : ''}`}
              onClick={() => onContinue(step.opening.id, step.chunk.id, step.mode)}
            >
              {fresh ? `Start with ${step.opening.name}` : `Continue: ${MODE_LABEL[step.mode]}`}
              <span className="continue-sub">{fresh ? step.chunk.title : `${step.opening.name} · ${step.chunk.title}`}</span>
            </button>
          )}
          {!step && due === 0 && <button className="review-btn" disabled>All caught up</button>}
        </div>
      </section>

      <div className="opening-grid">
        {openings.map((o) => (
          <button key={o.id} className="opening-card" onClick={() => onOpen(o.id)}>
            <div className="opening-top">
              <span className={`side side-${o.side}`}>{o.side === 'white' ? '♔ White' : '♚ Black'}</span>
              <span className="muted small">{o.eco}</span>
            </div>
            <h2>{o.name}</h2>
            <p className="muted small clamp">{o.summary}</p>
            <div className="meters">
              {o.chunks.map((c) => (
                <div key={c.id} className="meter-row">
                  <span className="small">{c.title}</span>
                  <ChunkMeter chunk={c} />
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <section className="method">
        <h3>How it works</h3>
        <ol>
          <li><b>Study</b>: step through the line, compare moves and explain your choice at the “Think first” prompts. Read both sides' plans.</li>
          <li><b>Drill</b>: play the whole line from memory against an auto-replying opponent.</li>
          <li><b>Quiz</b>: find the move in 3 key positions. Hints cost you grade points.</li>
          <li><b>Review</b>: cards come back on an SM-2 schedule, mixed across openings. Missed cards repeat within the same session.</li>
        </ol>
        <div className="data-tools">
          <button className="link small" onClick={exportProgress}>Export progress</button>
          <button className="link small" onClick={() => fileInput.current?.click()}>Import progress</button>
          <input ref={fileInput} type="file" accept="application/json,.json" aria-label="Import progress file" onChange={(e) => importProgress(e.target.files?.[0])} />
          <button className="link small" onClick={() => confirm('Reset all progress?') && progress.reset()}>
            Reset progress
          </button>
          {message && <span className="muted small" role="status">{message}</span>}
        </div>
        <p className="muted small">Progress is saved only in this browser. Export it to back it up or move it to another device.</p>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat">
      <b>{n}</b>
      <span className="muted small">{label}</span>
    </div>
  );
}
