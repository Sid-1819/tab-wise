import { describe, expect, it } from 'vitest';

import { changelogUrl, isMajorBump, majorVersion, welcomeUrl } from './release-landing';

describe('release landing', () => {
  it('reads the major version segment', () => {
    expect(majorVersion('2.5.0')).toBe(2);
    expect(majorVersion('10.0.1')).toBe(10);
    expect(majorVersion('not-a-version')).toBe(0);
  });

  it('treats only an increased major version as a major bump', () => {
    expect(isMajorBump('2.5.0', '3.0.0')).toBe(true);
    expect(isMajorBump('2.4.0', '2.5.0')).toBe(false);
    expect(isMajorBump('3.0.0', '3.1.0')).toBe(false);
  });

  it('builds the install and changelog urls', () => {
    expect(welcomeUrl()).toBe('https://tabwise.visionly.dev/welcome?source=install');
    expect(changelogUrl('2.4.0', '3.0.0')).toBe(
      'https://tabwise.visionly.dev/changelog?from=2.4.0&to=3.0.0',
    );
  });
});
