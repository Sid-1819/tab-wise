export const DEFAULT_FAVICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';

/** True when the visible pixels are almost all near-white, so the mark disappears on a light background. */
export function isMostlyLightIcon(data: Uint8ClampedArray): boolean {
  let light = 0;
  let other = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 40) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luminance > 210 && max - min < 28) light += 1;
    else other += 1;
  }
  return light >= 8 && other <= light * 0.25;
}

export function getTabFaviconUrl(pageUrl: string, size = 16): string {
  if (!pageUrl || pageUrl.startsWith('about:')) {
    return DEFAULT_FAVICON;
  }

  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', String(size));
  return url.toString();
}
