import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { judge, toSan } from './answer';
import qg from '../openings/queens-gambit.json';
import { allCards, openings } from './openings';
import type { Opening } from './types';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('toSan', () => {
  it('normalises typed input', () => {
    expect(toSan(START, 'nf3')).toBe('Nf3');
    expect(toSan(START, 'e2e4')).toBe('e4');
    expect(toSan(START, 'd4')).toBe('d4');
    expect(toSan(START, 'Ke2')).toBeNull();
  });
  it('accepts 0-0 for castling', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    expect(toSan(fen, '0-0')).toBe('O-O');
  });
  it('distinguishes bxc4 (pawn) from Bxc4 (bishop)', () => {
    // QGA after 4...e6: Bxc4 is legal, bxc4 is not.
    const q = (qg as Opening).chunks[1].questions[1];
    expect(toSan(q.fen, 'Bxc4')).toBe('Bxc4');
  });
});

describe('judge', () => {
  const q = (qg as Opening).chunks[0].questions[2]; // answer Nc3, alt Nf3
  it('grades main, alternative and wrong moves', () => {
    expect(judge(q, 'Nc3')).toBe('correct');
    expect(judge(q, 'Nf3')).toBe('alternative');
    expect(judge(q, 'g3')).toBe('wrong');
    expect(judge(q, null)).toBe('illegal');
  });
});

describe('opening content', () => {
  it('passes the validator (legal lines, 3 questions per chunk, FENs match)', () => {
    expect(() => execFileSync('node', ['scripts/validate-openings.mjs'], { stdio: 'pipe' })).not.toThrow();
  });
  it('discovers all six courses and includes their cards in review', () => {
    expect(openings.map((o) => o.id)).toEqual(expect.arrayContaining([
      'queens-gambit', 'caro-kann', 'italian-game', 'ruy-lopez', 'sicilian', 'french',
    ]));
    for (const opening of openings) {
      expect(allCards().filter((c) => c.opening.id === opening.id)).toHaveLength(opening.chunks.length * 3);
    }
  });
  it('trains Black against the common White systems in the new defense courses', () => {
    for (const id of ['sicilian', 'french']) {
      const opening = openings.find((o) => o.id === id)!;
      expect(opening.side).toBe('black');
      expect(opening.chunks).toHaveLength(5);
      for (const chunk of opening.chunks) {
        for (const q of chunk.questions) {
          expect(q.moves.length % 2).toBe(1);
          expect(judge(q, q.answer)).toBe('correct');
          for (const alternative of q.alternatives ?? []) expect(judge(q, alternative)).toBe('alternative');
        }
      }
    }
  });
  it('provides explanations, decisions and both sides’ plans in the expanded courses', () => {
    for (const opening of openings.filter((o) => o.id !== 'caro-kann')) {
      for (const chunk of opening.chunks) {
        expect(chunk.line.every((m) => !!m.note?.trim())).toBe(true);
        expect(chunk.line.some((m) => m.checkpoint)).toBe(true);
        expect(chunk.line.some((m) => m.comparison)).toBe(true);
        expect(chunk.plans?.white).toBeTruthy();
        expect(chunk.plans?.black).toBeTruthy();
      }
    }
  });
});
