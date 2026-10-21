#!/usr/bin/env node
// Validates every opening module in src/openings and (with --write) fills in
// each question's `fen` from its `moves`, so FENs are never hand-typed.
//
// Checks:
//  - every chunk's study line is a legal move sequence
//  - every chunk has exactly QUESTIONS_PER_CHUNK questions with unique ids
//  - each question's setup moves are legal, the learner's side is to move,
//    and the answer + alternatives are legal SAN in that position
//  - stored FEN matches the FEN derived from the moves
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const QUESTIONS_PER_CHUNK = 3;
const WRITE = process.argv.includes('--write');
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'openings');

const errors = [];
const warnings = [];
const ids = new Set();

function play(moves, ctx) {
  const chess = new Chess();
  for (const [i, san] of moves.entries()) {
    try {
      chess.move(san);
    } catch {
      errors.push(`${ctx}: illegal move #${i + 1} "${san}" in position ${chess.fen()}`);
      return null;
    }
  }
  return chess;
}

function legalSan(chess, san) {
  try {
    const c = new Chess(chess.fen());
    return c.move(san).san;
  } catch {
    return null;
  }
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const path = join(dir, file);
  const opening = JSON.parse(readFileSync(path, 'utf8'));
  const turn = opening.side === 'white' ? 'w' : opening.side === 'black' ? 'b' : null;
  if (!turn) errors.push(`${file}: side must be "white" or "black"`);
  if (!opening.chunks?.length) errors.push(`${file}: no chunks`);
  let changed = false;

  for (const chunk of opening.chunks ?? []) {
    const ctx = `${opening.id}/${chunk.id}`;
    play(chunk.line.map((m) => m.san), `${ctx} line`);

    if (chunk.questions.length !== QUESTIONS_PER_CHUNK) {
      errors.push(`${ctx}: expected ${QUESTIONS_PER_CHUNK} questions, found ${chunk.questions.length}`);
    }

    for (const q of chunk.questions) {
      const qctx = `${ctx}/${q.id}`;
      if (ids.has(q.id)) errors.push(`${qctx}: duplicate question id`);
      ids.add(q.id);

      const chess = play(q.moves, qctx);
      if (!chess) continue;
      if (chess.turn() !== turn) errors.push(`${qctx}: ${opening.side} is not to move`);

      for (const san of [q.answer, ...(q.alternatives ?? [])]) {
        const canonical = legalSan(chess, san);
        if (!canonical) errors.push(`${qctx}: "${san}" is not legal in ${chess.fen()}`);
        else if (canonical.replace(/[+#]/g, '') !== san.replace(/[+#]/g, '')) {
          warnings.push(`${qctx}: "${san}" normalizes to "${canonical}"`);
        }
      }

      const fen = chess.fen();
      if (q.fen !== fen) {
        if (WRITE) {
          q.fen = fen;
          changed = true;
        } else {
          errors.push(`${qctx}: stored fen ${q.fen ?? '(missing)'} != derived ${fen} (run npm run fens)`);
        }
      }
    }
  }

  if (changed) {
    writeFileSync(path, JSON.stringify(opening, null, 2) + '\n');
    console.log(`wrote FENs -> ${file}`);
  }
}

warnings.forEach((w) => console.warn(`warn: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`error: ${e}`));
  process.exit(1);
}
console.log(`✓ openings valid (${ids.size} questions)`);
