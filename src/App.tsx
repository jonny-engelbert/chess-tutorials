import { useEffect, useMemo, useState } from 'react';
import { Home } from './components/Home';
import { OpeningView, type Mode } from './components/OpeningView';
import { StudyView } from './components/StudyView';
import { DrillView } from './components/DrillView';
import { QuizSession } from './components/QuizSession';
import { allCards, findOpening } from './lib/openings';
import { progress } from './lib/progress';
import { isDue } from './lib/srs';
import type { Card } from './lib/types';

// Hash routes: #/  #/o/:opening  #/o/:opening/:chunk/:mode  #/review
function useHashRoute(): [string[], (path: string) => void] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => {
      setParts(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [parts, (path) => (window.location.hash = path)];
}

const MAX_REVIEW = 20;

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function App() {
  const [route, go] = useHashRoute();
  const [section, openingId, chunkId, mode] = route;

  // Freeze the review deck when the session starts (interleaved across openings).
  const reviewDeck = useMemo<Card[]>(() => {
    if (section !== 'review') return [];
    const cards = progress.get().cards;
    return shuffle(allCards().filter((c) => isDue(cards[c.question.id]))).slice(0, MAX_REVIEW);
  }, [section, route.join('/')]);

  let body: JSX.Element;
  const opening = openingId ? findOpening(openingId) : undefined;
  const chunk = opening?.chunks.find((c) => c.id === chunkId);
  const toOpening = () => go(`/o/${openingId}`);
  const start = (c: string, m: Mode) => go(`/o/${openingId}/${c}/${m}`);

  if (section === 'review') {
    body = <QuizSession key={route.join('/')} title="Review" cards={reviewDeck} onExit={() => go('/')} />;
  } else if (section === 'o' && opening && chunk && mode) {
    const k = route.join('/');
    if (mode === 'study') body = <StudyView key={k} opening={opening} chunk={chunk} onDrill={() => start(chunk.id, 'drill')} onQuiz={() => start(chunk.id, 'quiz')} onExit={toOpening} />;
    else if (mode === 'drill') body = <DrillView key={k} opening={opening} chunk={chunk} onQuiz={() => start(chunk.id, 'quiz')} onExit={toOpening} />;
    else body = <QuizSession key={k} title={`Quiz · ${chunk.title}`} cards={chunk.questions.map((question) => ({ opening, chunk, question }))} onExit={toOpening} />;
  } else if (section === 'o' && opening) {
    body = <OpeningView opening={opening} onStart={start} onExit={() => go('/')} />;
  } else {
    body = <Home onOpen={(id) => go(`/o/${id}`)} onReview={() => go('/review')} onContinue={(o, c, m) => go(`/o/${o}/${c}/${m}`)} />;
  }

  return (
    <>
      <nav className="topbar">
        <a href="#/" className="brand">♞ Opening Tutor</a>
      </nav>
      <main>{body}</main>
    </>
  );
}
