// SM-2 style scheduler (the algorithm behind SuperMemo/Anki), kept pure so it
// can be unit-tested and swapped without touching the UI.

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface CardState {
  ease: number;
  /** Days until next review; 0 while (re)learning. */
  interval: number;
  reps: number;
  lapses: number;
  /** Epoch ms when the card is next due. */
  due: number;
  lastReviewed: number;
}

const MINUTE = 60_000;
const DAY = 86_400_000;
const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };
export const MASTERED_DAYS = 21;

export function newCardState(now: number): CardState {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, lastReviewed: 0 };
}

export function schedule(prev: CardState | undefined, grade: Grade, now = Date.now()): CardState {
  const s = prev ?? newCardState(now);
  const q = QUALITY[grade];
  const ease = Math.max(1.3, s.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  if (grade === 'again') {
    // Lapse: relearn soon, keep the hit to ease.
    return { ease, interval: 0, reps: 0, lapses: s.lapses + (s.reps > 0 ? 1 : 0), due: now + 10 * MINUTE, lastReviewed: now };
  }

  const reps = s.reps + 1;
  let interval: number;
  if (reps === 1) interval = grade === 'easy' ? 3 : 1;
  else if (reps === 2) interval = grade === 'hard' ? 2 : grade === 'easy' ? 6 : 4;
  else {
    const mult = grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease;
    interval = Math.max(s.interval + 1, Math.round(s.interval * mult));
  }
  return { ease, interval, reps, lapses: s.lapses, due: now + interval * DAY, lastReviewed: now };
}

export type CardStatus = 'new' | 'learning' | 'review' | 'mastered';

export function status(s: CardState | undefined): CardStatus {
  if (!s) return 'new';
  if (s.interval === 0) return 'learning';
  return s.interval >= MASTERED_DAYS ? 'mastered' : 'review';
}

export function isDue(s: CardState | undefined, now = Date.now()): boolean {
  return !!s && s.due <= now;
}

export function formatInterval(s: CardState, now = Date.now()): string {
  const ms = s.due - now;
  if (ms < 60 * MINUTE) return `${Math.max(1, Math.round(ms / MINUTE))} min`;
  if (ms < 20 * 60 * MINUTE) return `${Math.round(ms / (60 * MINUTE))} h`;
  const d = Math.max(1, Math.round(ms / DAY));
  return d === 1 ? '1 day' : `${d} days`;
}
