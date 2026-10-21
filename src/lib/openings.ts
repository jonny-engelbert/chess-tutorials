import type { Card, Opening } from './types';

// Every JSON file in src/openings is an opening module. Add a file, get a course.
const modules = import.meta.glob<Opening>('../openings/*.json', { eager: true, import: 'default' });

export const openings: Opening[] = Object.values(modules).sort((a, b) =>
  a.side === b.side ? a.name.localeCompare(b.name) : a.side === 'white' ? -1 : 1,
);

export function findOpening(id: string): Opening | undefined {
  return openings.find((o) => o.id === id);
}

export function allCards(): Card[] {
  return openings.flatMap((opening) =>
    opening.chunks.flatMap((chunk) => chunk.questions.map((question) => ({ opening, chunk, question }))),
  );
}
