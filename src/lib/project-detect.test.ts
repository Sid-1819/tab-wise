import { describe, expect, it } from 'vitest';
import { detectProject, isAuthPage, isDismissed, projectKeyOf, registrableDomain, suggestionKeys, type TabLite } from './project-detect';

const t = (url: string, title = '', extra: Partial<TabLite> = {}): TabLite => ({ url, title, ...extra });

describe('registrableDomain / projectKeyOf', () => {
  it('handles subdomains and two-level TLDs', () => {
    expect(registrableDomain('docs.stripe.com')).toBe('stripe.com');
    expect(registrableDomain('shop.example.co.uk')).toBe('example.co.uk');
    expect(registrableDomain('localhost')).toBe('localhost');
  });

  it('extracts repo, localhost, figma and ticket keys', () => {
    expect(projectKeyOf('https://github.com/Sid-1819/tab-wise/pull/12')).toMatchObject({ key: 'github.com/Sid-1819/tab-wise', label: 'tab-wise', kind: 'repo' });
    expect(projectKeyOf('https://github.com/settings/profile')?.kind).toBe('domain'); // reserved
    expect(projectKeyOf('http://localhost:3000/app')).toMatchObject({ key: 'localhost:3000', kind: 'repo' });
    expect(projectKeyOf('https://www.figma.com/design/abc123/Homepage-Redesign?node-id=1')).toMatchObject({ label: 'Homepage Redesign' });
    expect(projectKeyOf('https://acme.atlassian.net/browse/WEB-42')).toMatchObject({ label: 'WEB' });
    expect(projectKeyOf('not a url')).toBeNull();
  });
});

describe('detectProject', () => {
  it('needs at least 3 project tabs', () => {
    expect(detectProject([t('https://a.com/1'), t('https://a.com/2')])).toBeNull();
  });

  it('ignores pinned, ambient and non-web tabs when counting', () => {
    const tabs = [
      t('https://mail.google.com/'),
      t('https://app.slack.com/'),
      t('https://a.com/1', '', { pinned: true }),
      t('chrome://settings'),
      t('https://a.com/2'),
    ];
    expect(detectProject(tabs)).toBeNull();
  });

  it('prefers a named Chrome tab group', () => {
    const s = detectProject([
      t('https://a.com/1', '', { groupTitle: 'Client X' }),
      t('https://b.com/1', '', { groupTitle: 'Client X' }),
      t('https://c.com/1', '', { groupTitle: 'Client X' }),
      t('https://d.com/1'),
    ]);
    expect(s).toMatchObject({ name: 'Client X', source: 'tab_group' });
    expect(s!.tabs).toHaveLength(3);
  });

  it('names a project after a shared repo', () => {
    const s = detectProject([
      t('https://github.com/acme/billing-api/pull/5', 'Fix invoice rounding'),
      t('https://github.com/acme/billing-api/issues/9', 'Rounding bug'),
      t('https://github.com/acme/billing-api', 'billing-api'),
      t('https://stackoverflow.com/q/1', 'Decimal rounding'),
    ]);
    expect(s).toMatchObject({ name: 'Billing-api', source: 'repo' });
  });

  it('falls back to a shared domain', () => {
    const s = detectProject([t('https://docs.stripe.com/a'), t('https://dashboard.stripe.com/b'), t('https://stripe.com/c'), t('https://x.org/')]);
    expect(s).toMatchObject({ name: 'Stripe work', source: 'domain' });
  });

  it('uses a shared title word when domains differ', () => {
    const s = detectProject([
      t('https://a.com/1', 'Kubernetes ingress guide'),
      t('https://b.org/2', 'Debugging Kubernetes DNS'),
      t('https://c.net/3', 'Kubernetes networking basics'),
      t('https://d.io/4', 'Unrelated'),
    ]);
    expect(s).toMatchObject({ name: 'Kubernetes', source: 'title_topic' });
  });

  it('suggests nothing for an unrelated mix', () => {
    expect(
      detectProject([t('https://a.com/', 'Cats'), t('https://b.org/', 'Mortgage rates'), t('https://c.net/', 'Pasta recipe'), t('https://d.io/', 'Flights')]),
    ).toBeNull();
  });
});

describe('isAuthPage', () => {
  it('recognises sign-in screens, including mail redirects', () => {
    expect(isAuthPage('https://accounts.google.com/v3/signin/identifier?continue=https://mail.google.com')).toBe(true);
    expect(isAuthPage('https://github.com/login')).toBe(true);
    expect(isAuthPage('https://app.example.com/oauth/authorize')).toBe(true);
    expect(isAuthPage('https://github.com/acme/billing-api')).toBe(false);
    expect(isAuthPage('https://docs.example.com/authoring-guide')).toBe(false);
  });
  it('does not count auth pages toward a project', () => {
    expect(
      detectProject([t('https://github.com/a/b/1'), t('https://github.com/a/b/2'), t('https://accounts.google.com/signin'), t('https://github.com/login')]),
    ).toBeNull();
  });
});

describe('isDismissed', () => {
  const s = detectProject([t('https://github.com/a/b/1'), t('https://github.com/a/b/2'), t('https://github.com/a/b/3')])!;
  it('matches a slightly changed tab set, not an unrelated one', () => {
    const keys = suggestionKeys(s);
    expect(isDismissed(s, [keys])).toBe(true);
    expect(isDismissed(s, [keys.slice(0, 2).concat('https://zzz.com/')])).toBe(true); // 2/3 shared ≥ 0.6
    expect(isDismissed(s, [['https://other.com/1', 'https://other.com/2']])).toBe(false);
    expect(isDismissed(s, [])).toBe(false);
  });
});
