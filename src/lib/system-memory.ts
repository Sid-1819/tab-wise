const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatMemoryBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < UNITS.length - 1) {
    n /= 1024;
    u += 1;
  }
  const decimals = u === 0 ? 0 : u === 1 ? 0 : n >= 10 ? 1 : 2;
  return `${n.toFixed(decimals)} ${UNITS[u]}`;
}

export async function getSystemMemoryInfo(): Promise<chrome.system.memory.MemoryInfo | null> {
  const api = chrome.system?.memory;
  if (!api?.getInfo) return null;
  try {
    return await api.getInfo();
  } catch {
    return null;
  }
}

export async function hasSystemMemoryPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.permissions.contains({ permissions: ['system.memory'] }, (ok) => {
      resolve(Boolean(ok && !chrome.runtime.lastError));
    });
  });
}

export async function requestSystemMemoryPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.permissions.request({ permissions: ['system.memory'] }, (granted) => {
      resolve(Boolean(granted && !chrome.runtime.lastError));
    });
  });
}
