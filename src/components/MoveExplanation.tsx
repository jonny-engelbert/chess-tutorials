import type { LineMove } from '../lib/types';

export function MoveExplanation({ move }: { move: LineMove }) {
  return (
    <>
      {move.note && <p>{move.note}</p>}
      {move.comparison && (
        <div className="comparison">
          <b>Compare with {move.comparison.san}</b>
          <p>{move.comparison.explanation}</p>
        </div>
      )}
    </>
  );
}
