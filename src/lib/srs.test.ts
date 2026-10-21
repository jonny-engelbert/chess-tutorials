import { describe, expect, it } from 'vitest';
import { isDue, schedule, status } from './srs';

const DAY = 86_400_000;
const t0 = 1_700_000_000_000;

describe('schedule', () => {
  it('grows intervals on successive good answers', () => {
    const a = schedule(undefined, 'good', t0);
    const b = schedule(a, 'good', a.due);
    const c = schedule(b, 'good', b.due);
    expect([a.interval, b.interval]).toEqual([1, 4]);
    expect(c.interval).toBeGreaterThan(b.interval * 2);
    expect(c.due).toBe(b.due + c.interval * DAY);
  });

  it('resets on again, lowers ease, relearns within minutes', () => {
    const a = schedule(schedule(undefined, 'good', t0), 'good', t0 + DAY);
    const lapse = schedule(a, 'again', t0 + 5 * DAY);
    expect(lapse.interval).toBe(0);
    expect(lapse.reps).toBe(0);
    expect(lapse.lapses).toBe(1);
    expect(lapse.ease).toBeLessThan(a.ease);
    expect(lapse.due - (t0 + 5 * DAY)).toBeLessThan(DAY);
    expect(status(lapse)).toBe('learning');
  });

  it('hard grows slower than good, easy faster', () => {
    const base = schedule(schedule(undefined, 'good', t0), 'good', t0);
    const [h, g, e] = (['hard', 'good', 'easy'] as const).map((gr) => schedule(base, gr, t0).interval);
    expect(h).toBeLessThan(g);
    expect(g).toBeLessThan(e);
  });

  it('never drops ease below 1.3', () => {
    let s = schedule(undefined, 'again', t0);
    for (let i = 0; i < 20; i++) s = schedule(s, 'again', t0);
    expect(s.ease).toBe(1.3);
  });

  it('reports due and mastered', () => {
    let s = schedule(undefined, 'easy', t0);
    expect(isDue(s, t0)).toBe(false);
    expect(isDue(s, s.due)).toBe(true);
    while (s.interval < 21) s = schedule(s, 'easy', s.due);
    expect(status(s)).toBe('mastered');
  });
});
