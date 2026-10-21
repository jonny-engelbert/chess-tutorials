import { openings, allCards } from '../lib/openings';
import { progress, useProgress } from '../lib/progress';
import { isDue, status } from '../lib/srs';
import { ChunkMeter } from './OpeningView';

interface Props {
  onOpen: (id: string) => void;
  onReview: () => void;
}

export function Home({ onOpen, onReview }: Props) {
  const p = useProgress();
  const cards = allCards();
  const due = cards.filter((c) => isDue(p.cards[c.question.id])).length;
  const seen = cards.filter((c) => p.cards[c.question.id]).length;
  const mastered = cards.filter((c) => status(p.cards[c.question.id]) === 'mastered').length;

  return (
    <div className="home">
      <section className="hero">
        <div>
          <h1>Opening Tutor</h1>
          <p className="muted">
            Study a line, drill it from memory, then lock it in with spaced-repetition quizzes.
          </p>
        </div>
        <div className="stats">
          <Stat n={due} label="due now" />
          <Stat n={seen} label={`of ${cards.length} learned`} />
          <Stat n={mastered} label="mastered" />
        </div>
        <button className="review-btn" onClick={onReview} disabled={due === 0}>
          {due ? `Review ${due} due card${due > 1 ? 's' : ''}` : 'No reviews due'}
        </button>
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
          <li><b>Study</b>: step through each chunk's main line with a note on every key move.</li>
          <li><b>Drill</b>: play the whole line from memory against an auto-replying opponent.</li>
          <li><b>Quiz</b>: find the move in 3 key positions. Hints cost you grade points.</li>
          <li><b>Review</b>: cards come back on an SM-2 schedule, mixed across openings. Missed cards repeat within the same session.</li>
        </ol>
        <button className="link small" onClick={() => confirm('Reset all progress?') && progress.reset()}>
          Reset progress
        </button>
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
