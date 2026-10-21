# Opening Tutor

A modular chess-opening tutor. Each opening is split into learning chunks. Each chunk has an annotated main line and 3 quiz positions (a FEN plus the move you must find), and spaced repetition schedules the reviews.

Shipped courses:

| Opening | You play | Chunks |
|---|---|---|
| Queen's Gambit | White | Introduction & Main Line · Accepted · Declined: Orthodox · Slav · Traps & Pitfalls |
| Caro-Kann Defense | Black | Introduction · Classical (4...Bf5) · Advance · Exchange · Panov–Botvinnik · Traps to Avoid |

## Use it

**In the browser, nothing to install:** https://jonny-engelbert.github.io/chess-tutorials/

Progress is saved in your own browser (localStorage), so each person and each device has its own review schedule.

## Run locally

You need [Node.js](https://nodejs.org) 20 or later.

```bash
git clone https://github.com/jonny-engelbert/chess-tutorials.git
cd chess-tutorials
npm install
npm run dev       # http://localhost:5173
```

Other scripts:

```bash
npm test          # SRS + answer-checking unit tests, plus the content validator
npm run build     # validates content, type-checks, builds static site into dist/
```

The build is a static site with no backend, so you can host `dist/` anywhere. Every push to `main` runs the tests and redeploys GitHub Pages (`.github/workflows/deploy.yml`).

## Pedagogy

1. **Study.** Step through the chunk's main line with ← and →. Key moves have a note, and each chunk lists its key ideas.
2. **Drill.** Play your side of the whole line from memory while the opponent replies automatically. A wrong move shows the right one with an arrow and its note.
3. **Quiz.** Find the move in 3 key positions, on the board or by typing it (`Nf3`, `0-0`, `e2e4` all work).
   - **Hints:** two levels, a text hint and then highlighting the piece to move.
   - **Retries:** one retry after a wrong move.
   - **Alternatives:** sound alternative moves are accepted, but the repertoire move is shown.
4. **Review.** Due cards from every opening, shuffled together (interleaving), up to 20 per session.
   - **Scheduling:** SM-2 (`src/lib/srs.ts`) grades your first attempt only:
     - clean and fast → *easy*
     - clean → *good*
     - hint, retry or alternative move → *hard*
     - wrong or revealed → *again*, back in 10 min
   - **Relearning:** missed cards come back later in the same session.
   - **Mastered:** a card with an interval of 21 days or more.

On each opening page the recommended next step for every chunk is highlighted (Study → Drill → Quiz).

## Architecture

```
src/openings/*.json        one file per opening, auto-discovered (import.meta.glob)
scripts/validate-openings.mjs
                           replays every line with chess.js, checks 3 questions/chunk,
                           legal answers, correct side to move; --write derives FENs
src/lib/types.ts           Opening → Chunk → Question schema
src/lib/srs.ts             pure SM-2 scheduler
src/lib/answer.ts          typed-move parsing and grading (correct / alternative / wrong)
src/lib/progress.ts        persistence (localStorage today; swap for an API later)
src/components/            Board, StudyView, DrillView, QuizSession, OpeningView, Home
```

Stack: Vite + React 18 + TypeScript, `chess.js` for rules, `react-chessboard` for the board.

## Adding an opening

1. Create `src/openings/<id>.json` with `id`, `name`, `eco`, `side` (`"white"`/`"black"`), `summary` and `chunks[]`.
2. For each chunk, write `title`, `summary`, `keyIdeas[]`, `line[]` (`{ san, note? }` from the initial position) and exactly 3 `questions[]`.
3. Each question needs:
   - `moves`: the SAN moves that lead to the position
   - `prompt`
   - `answer`: SAN
   - optional `alternatives[]`
   - `hint`
   - `explanation`
4. Run `npm run fens` to fill in each question's `fen`, then `npm run validate`.

The opening then shows up on the home page, with no code changes needed.
