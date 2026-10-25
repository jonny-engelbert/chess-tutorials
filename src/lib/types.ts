export type Side = 'white' | 'black';

export interface LineMove {
  san: string;
  note?: string;
  /** Compare a legal candidate in the position BEFORE this move. */
  comparison?: { san: string; explanation: string };
  /** Ungraded reasoning prompt shown before playing this move. */
  checkpoint?: { prompt: string; answer: string };
}

export interface Question {
  id: string;
  /** SAN moves from the initial position that reach the quiz position. */
  moves: string[];
  /** Derived from `moves` by `npm run fens`; validated at build time. */
  fen: string;
  prompt: string;
  /** The move the learner must find, in SAN. */
  answer: string;
  /** Other sound moves: accepted, but the learner is shown the main move. */
  alternatives?: string[];
  hint: string;
  explanation: string;
}

export interface Chunk {
  id: string;
  title: string;
  summary: string;
  keyIdeas: string[];
  plans?: { white: string; black: string };
  line: LineMove[];
  questions: Question[];
}

export interface Opening {
  id: string;
  name: string;
  eco: string;
  side: Side;
  summary: string;
  chunks: Chunk[];
  sources?: { title: string; url: string }[];
}

/** A question together with where it lives — the unit of spaced repetition. */
export interface Card {
  opening: Opening;
  chunk: Chunk;
  question: Question;
}
