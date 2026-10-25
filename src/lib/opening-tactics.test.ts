import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import italian from '../openings/italian-game.json';
import ruy from '../openings/ruy-lopez.json';
import qg from '../openings/queens-gambit.json';
import sicilian from '../openings/sicilian.json';
import french from '../openings/french.json';

function position(moves: string[]) {
  const chess = new Chess();
  for (const san of moves) chess.move(san);
  return chess;
}

describe('tactical claims in the lessons', () => {
  it('the Alapin c3 pawn prevents an immediate Nc3 attack on Qd5', () => {
    const q = sicilian.chunks.find((c) => c.id === 'alapin')!.questions[1];
    const chess = position([...q.moves, q.answer]);
    expect(chess.get('d5')?.type).toBe('q');
    expect(chess.get('c3')?.type).toBe('p');
    expect(chess.moves({ square: 'b1' })).not.toContain('Nc3');
  });

  it('the French Advance e5 pawn can capture a knight carelessly placed on f6', () => {
    const q = french.chunks.find((c) => c.id === 'advance')!.questions[0];
    const chess = position([...q.moves, 'Nf6']);
    expect(chess.move('exf6').captured).toBe('n');
  });

  it('the Tarrasch exchange leaves Black an isolated d-pawn and an active bishop', () => {
    const q = french.chunks.find((c) => c.id === 'tarrasch')!.questions[2];
    const chess = position([...q.moves, q.answer]);
    expect(chess.get('d5')).toMatchObject({ color: 'b', type: 'p' });
    expect(chess.get('c5')).toMatchObject({ color: 'b', type: 'b' });
    const blackPawns = chess.board().flat().filter((p) => p?.color === 'b' && p.type === 'p');
    expect(blackPawns.some((p) => p!.square.startsWith('c') || p!.square.startsWith('e'))).toBe(false);
  });

  it.each([
    { opening: italian, chunkId: 'hungarian' },
    { opening: ruy, chunkId: 'steinitz' },
  ])('the queen recapture in $chunkId really loses the queen', ({ opening, chunkId }) => {
    const chunk = opening.chunks.find((c) => c.id === chunkId)!;
    const q = chunk.questions.find((q) => q.answer === 'Nxd4')!;
    const chess = position(q.moves);
    chess.move('Qxd4');
    const reply = chess.move('Nxd4');
    expect(reply.from).toBe('c6');
    expect(reply.captured).toBe('q');
  });

  it('the Elephant Trap continuation is legal and leaves Black an extra minor piece', () => {
    const q = qg.chunks.find((c) => c.id === 'traps')!.questions[2];
    const chess = position([...q.moves, 'Nxd5', 'Nxd5', 'Bxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8']);
    const minors = chess.board().flat().filter((p) => p && ['b', 'n'].includes(p.type));
    expect(minors.filter((p) => p!.color === 'b').length - minors.filter((p) => p!.color === 'w').length).toBe(1);
  });

  it('Qf3 can win the blocking knight in the pawn-holding trap', () => {
    const q = qg.chunks.find((c) => c.id === 'traps')!.questions[1];
    const chess = position([...q.moves, 'Qf3', 'Nc6']);
    expect(chess.move('Qxc6+').captured).toBe('n');
    expect(chess.isCheck()).toBe(true);
  });

  it('the immediate Ruy López pawn grab lets Black recover e4', () => {
    const chess = position(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'Nxe5', 'Qd4', 'Nf3']);
    expect(chess.move('Qxe4+').captured).toBe('p');
    const pawns = chess.board().flat().filter((p) => p?.type === 'p');
    expect(pawns.filter((p) => p!.color === 'w')).toHaveLength(7);
    expect(pawns.filter((p) => p!.color === 'b')).toHaveLength(7);
  });
});
