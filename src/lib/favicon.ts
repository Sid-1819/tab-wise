export const DEFAULT_FAVICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';

export function getTabFaviconUrl(pageUrl: string, size = 16): string {
  if (!pageUrl || pageUrl.startsWith('about:')) {
    return DEFAULT_FAVICON;
  }

  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', String(size));
  return url.toString();
}
