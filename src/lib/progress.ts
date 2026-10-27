import { useCallback, useSyncExternalStore } from 'react';
import { schedule, type CardState, type Grade } from './srs';

// Progress persistence. Everything goes through this module so the
// localStorage backend can later be replaced by a server API.

interface ProgressData {
  version: 1;
  cards: Record<string, CardState>;
  studied: Record<string, number>; // `${openingId}/${chunkId}` -> timestamp
  drilled: Record<string, number>;
  history: { id: string; grade: Grade; at: number }[];
}

const KEY = 'chess-tutor-progress-v1';
const empty = (): ProgressData => ({ version: 1, cards: {}, studied: {}, drilled: {}, history: [] });

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

let data = load();
const listeners = new Set<() => void>();

function commit(next: ProgressData) {
  data = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
}

export const progress = {
  get: () => data,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  grade(id: string, grade: Grade, now = Date.now()): CardState {
    const next = schedule(data.cards[id], grade, now);
    commit({
      ...data,
      cards: { ...data.cards, [id]: next },
      history: [...data.history, { id, grade, at: now }].slice(-2000),
    });
    return next;
  },
  markStudied(key: string) {
    commit({ ...data, studied: { ...data.studied, [key]: Date.now() } });
  },
  markDrilled(key: string) {
    commit({ ...data, drilled: { ...data.drilled, [key]: Date.now() } });
  },
  reset() {
    commit(empty());
  },
  /** Serialise progress for backup / moving to another device. */
  exportJson(): string {
    return JSON.stringify(data, null, 2);
  },
  /** Replace progress from an exported file. Returns false if the file isn't valid progress data. */
  importJson(raw: string): boolean {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || typeof parsed.cards !== 'object' || parsed.cards === null) return false;
      commit({ ...empty(), ...parsed });
      return true;
    } catch {
      return false;
    }
  },
};

export function useProgress(): ProgressData {
  return useSyncExternalStore(
    useCallback((l) => progress.subscribe(l), []),
    progress.get,
  );
}
