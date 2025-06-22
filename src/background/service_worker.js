import { TAB_LIMIT } from '../utils/constants.js';

function checkTabCount() {
  console.log('Checking tab count...');

  chrome.tabs.query({}, (tabs) => {
    const count = tabs.length;
    console.log(`Current tab count: ${count}, Limit: ${TAB_LIMIT}`);

    chrome.storage.local.get(['limitReached'], (result) => {
      const previouslyReached = result.limitReached || false;

      if (count <= TAB_LIMIT) {
        if (previouslyReached) {
          console.log('Tab count under limit, resetting flag');
          chrome.storage.local.set({ limitReached: false });
          chrome.action.setBadgeText({ text: "" });
        }
      } else {
        if (!previouslyReached) {
          console.log('Tab limit exceeded, showing reminder');
          chrome.storage.local.set({ limitReached: true });
          showReminder(count);
        } else {
          console.log('Still over limit, but notification already shown');
        }
      }
    });
  });
}

function showReminder(count) {
  console.log('Setting badge text and showing notification');
  chrome.action.setBadgeText({ text: `${count}` });
  chrome.action.setBadgeBackgroundColor({ color: "#FF4136" });

  const notificationId = `tab-limit-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon2.png'),
    title: 'Too Many Tabs!',
    message: `${count} tabs are open. Time to tidy up — Tab Wise has grouped them for you.`,
    priority: 2,
    requireInteraction: true,
    silent: false
  }, (id) => {
    if (chrome.runtime.lastError) {
      console.error('Notification error:', chrome.runtime.lastError);
    } else {
      console.log('Notification created:', id);
    }
  });
}

chrome.notifications.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.tabs.onCreated.addListener(checkTabCount);
chrome.tabs.onRemoved.addListener(checkTabCount);
chrome.tabs.onUpdated.addListener(checkTabCount);

checkTabCount();
