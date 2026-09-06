import { describe, expect, it } from 'vitest';

import {
  getDomainGroupName,
  getHostnameKey,
  getSubGroupLabel,
  getSubGroupSortKey,
  isApexHostname,
  normalizeHostname,
} from './domain-utils';

describe('normalizeHostname', () => {
  it('strips www and lowercases', () => {
    expect(normalizeHostname('https://WWW.Admin.Encatch.com/path')).toBe(
      'admin.encatch.com'
    );
  });
});

describe('getDomainGroupName', () => {
  it('groups subdomains under the registrable label', () => {
    expect(getDomainGroupName('admin.encatch.com')).toBe('Encatch');
    expect(getDomainGroupName('infisical.encatch.com')).toBe('Encatch');
  });

  it('uses known domain mappings', () => {
    expect(getDomainGroupName('meet.google.com')).toBe('Google Meet');
  });
});

describe('getSubGroupLabel', () => {
  it('labels apex hostnames as Root', () => {
    expect(getSubGroupLabel('encatch.com', 'Encatch')).toBe('Root');
  });

  it('labels subdomains from the full prefix before the registrable domain', () => {
    expect(getSubGroupLabel('admin.encatch.com', 'Encatch')).toBe('Admin');
    expect(getSubGroupLabel('infisical.encatch.com', 'Encatch')).toBe('Infisical');
    expect(getSubGroupLabel('admin.dev.encatch.com', 'Encatch')).toBe('Admin Dev');
  });

  it('gives distinct labels to nested subdomains that share a first segment', () => {
    expect(getSubGroupLabel('admin.encatch.com', 'Encatch')).not.toBe(
      getSubGroupLabel('admin.dev.encatch.com', 'Encatch')
    );
  });
});

describe('isApexHostname', () => {
  it('detects apex domains', () => {
    expect(isApexHostname('encatch.com')).toBe(true);
    expect(isApexHostname('admin.encatch.com')).toBe(false);
  });
});

describe('getSubGroupSortKey', () => {
  it('sorts Root before other labels', () => {
    expect(getSubGroupSortKey('Root').localeCompare(getSubGroupSortKey('Admin'))).toBeLessThan(
      0
    );
  });
});

describe('getHostnameKey', () => {
  it('returns normalized hostname', () => {
    expect(getHostnameKey('https://admin.encatch.com')).toBe('admin.encatch.com');
  });
});
