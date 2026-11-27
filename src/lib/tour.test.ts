import { describe, expect, it } from 'vitest';
import { TOUR_STEPS, shouldShowTour } from './tour';

describe('tour', () => {
  it('shows until marked seen', () => {
    expect(shouldShowTour(undefined)).toBe(true);
    expect(shouldShowTour(false)).toBe(true);
    expect(shouldShowTour(true)).toBe(false);
  });
  it('has short, complete steps', () => {
    expect(TOUR_STEPS.length).toBe(3);
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(5);
      expect(s.body.length).toBeLessThan(260);
    }
  });
});
