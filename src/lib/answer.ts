import { Chess } from 'chess.js';
import type { Question } from './types';

export type Verdict = 'correct' | 'alternative' | 'wrong' | 'illegal';

const strip = (san: string) => san.replace(/[+#!?]/g, '').trim();

/** Normalise typed input (e.g. "nf3", "0-0", "e2e4") to SAN in the given position. */
export function toSan(fen: string, input: string): string | null {
  const chess = new Chess(fen);
  const raw = input.trim().replace(/0/g, 'O');
  const candidates = [raw, raw.charAt(0).toUpperCase() + raw.slice(1)];
  for (const c of candidates) {
    try {
      return chess.move(c).san;
    } catch {
      /* try next */
    }
    chess.load(fen);
  }
  const uci = raw.toLowerCase().match(/^([a-h][1-8])-?([a-h][1-8])([qrbn])?$/);
  if (uci) {
    try {
      return chess.move({ from: uci[1], to: uci[2], promotion: uci[3] ?? 'q' }).san;
    } catch {
      return null;
    }
  }
  return null;
}

export function judge(question: Question, san: string | null): Verdict {
  if (!san) return 'illegal';
  if (strip(san) === strip(question.answer)) return 'correct';
  if (question.alternatives?.some((a) => strip(a) === strip(san))) return 'alternative';
  return 'wrong';
}

/** Squares of the expected move, for hints and arrows. */
export function answerSquares(question: Question): { from: string; to: string } {
  const m = new Chess(question.fen).move(question.answer);
  return { from: m.from, to: m.to };
}
