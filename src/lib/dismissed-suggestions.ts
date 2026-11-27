const KEY = 'dismissedProjectSuggestions' as const;
const MAX = 30;

export function getDismissedSuggestions(): Promise<string[][]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([KEY], (r) => {
      const raw = r[KEY];
      resolve(
        Array.isArray(raw)
          ? raw.filter((x): x is string[] => Array.isArray(x) && x.every((u) => typeof u === 'string'))
          : [],
      );
    });
  });
}

export async function dismissSuggestion(keys: string[]): Promise<string[][]> {
  const next = [keys, ...(await getDismissedSuggestions())].slice(0, MAX);
  await new Promise<void>((resolve) => chrome.storage.local.set({ [KEY]: next }, () => resolve()));
  return next;
}
