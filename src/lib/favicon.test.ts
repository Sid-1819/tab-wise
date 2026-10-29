import { describe, expect, it } from 'vitest';

import { isMostlyLightIcon } from './favicon';

function pixels(fill: [number, number, number, number], count: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i += 1) {
    data.set(fill, i * 4);
  }
  return data;
}

describe('isMostlyLightIcon', () => {
  it('flags a white glyph on a transparent background', () => {
    const data = pixels([255, 255, 255, 255], 20);
    const transparent = pixels([0, 0, 0, 0], 40);
    const combined = new Uint8ClampedArray(data.length + transparent.length);
    combined.set(data, 0);
    combined.set(transparent, data.length);
    expect(isMostlyLightIcon(combined)).toBe(true);
  });

  it('leaves a dark or colored icon alone', () => {
    expect(isMostlyLightIcon(pixels([20, 20, 20, 255], 40))).toBe(false);
    expect(isMostlyLightIcon(pixels([20, 90, 200, 255], 40))).toBe(false);
  });
});
