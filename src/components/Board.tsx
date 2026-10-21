import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import type { Side } from '../lib/types';

type Arrow = [Square, Square, string?];

interface Props {
  fen: string;
  orientation: Side;
  /** Return true if the move was accepted. Omit for a read-only board. */
  onMove?: (from: string, to: string) => boolean;
  arrows?: Arrow[];
  highlight?: Record<string, CSSProperties>;
  lastMove?: { from: string; to: string };
}

const SELECT: CSSProperties = { background: 'rgba(255, 213, 79, 0.55)' };
const LAST: CSSProperties = { background: 'rgba(155, 199, 0, 0.38)' };
const DOT: CSSProperties = { background: 'radial-gradient(circle, rgba(0,0,0,.28) 22%, transparent 24%)' };
const ANIMATION_MS = 180;
const RING: CSSProperties = { background: 'radial-gradient(circle, transparent 58%, rgba(0,0,0,.28) 60%)' };

export function Board({ fen, orientation, onMove, arrows = [], highlight = {}, lastMove }: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const interactive = !!onMove;
  useEffect(() => setSelected(null), [fen]);

  // react-chessboard drops position updates that arrive mid-animation (e.g.
  // holding → in study mode). Remount without animation on rapid changes.
  const lastFen = useRef(fen);
  const lastChange = useRef(0);
  const [epoch, setEpoch] = useState(0);
  if (lastFen.current !== fen) {
    const now = Date.now();
    if (now - lastChange.current < ANIMATION_MS + 60) setEpoch((e) => e + 1);
    lastFen.current = fen;
    lastChange.current = now;
  }

  const targets = useMemo(
    () => (selected ? chess.moves({ square: selected, verbose: true }) : []),
    [chess, selected],
  );

  const styles: Record<string, CSSProperties> = {};
  if (lastMove) {
    styles[lastMove.from] = LAST;
    styles[lastMove.to] = LAST;
  }
  if (selected) styles[selected] = SELECT;
  for (const m of targets) styles[m.to] = m.captured ? RING : DOT;
  Object.assign(styles, highlight);

  const ownPiece = (sq: Square) => {
    const p = chess.get(sq);
    return !!p && p.color === chess.turn();
  };

  const tryMove = (from: Square, to: Square) => {
    setSelected(null);
    return onMove ? onMove(from, to) : false;
  };

  return (
    <div className="board">
      <Chessboard
        key={epoch}
        id="tutor-board"
        position={fen}
        boardOrientation={orientation}
        arePiecesDraggable={interactive}
        isDraggablePiece={({ sourceSquare }) => interactive && ownPiece(sourceSquare)}
        onPieceDrop={(from, to) => tryMove(from, to)}
        onSquareClick={(sq) => {
          if (!interactive) return;
          if (selected && targets.some((m) => m.to === sq)) tryMove(selected, sq);
          else setSelected(ownPiece(sq) && sq !== selected ? sq : null);
        }}
        autoPromoteToQueen
        customArrows={arrows}
        customSquareStyles={styles}
        customDarkSquareStyle={{ backgroundColor: 'var(--sq-dark)' }}
        customLightSquareStyle={{ backgroundColor: 'var(--sq-light)' }}
        customBoardStyle={{ borderRadius: '6px', boxShadow: '0 4px 18px rgba(0,0,0,.25)' }}
        animationDuration={ANIMATION_MS}
      />
    </div>
  );
}

/** Play a move from/to on a FEN; returns the SAN and resulting FEN, or null if illegal. */
export function applyMove(fen: string, from: string, to: string) {
  const chess = new Chess(fen);
  try {
    const m = chess.move({ from, to, promotion: 'q' });
    return { san: m.san, fen: chess.fen(), from: m.from, to: m.to };
  } catch {
    return null;
  }
}
