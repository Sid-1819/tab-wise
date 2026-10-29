export function moveTabToWindow(tabId: number, windowId: number): Promise<void> {
  return chrome.tabs.move(tabId, { windowId, index: -1 }).then(() => undefined);
}

export function moveTabToNewWindow(tabId: number): Promise<void> {
  return chrome.windows.create({ tabId }).then(() => undefined);
}
