import { TAB_LIMIT } from './constants.js';

let limitReached = false;

function checkTabCount() {
  console.log('Checking tab count...');  chrome.tabs.query({}, (tabs) => {
    const count = tabs.length;
    console.log(`Current tab count: ${count}, Limit: ${TAB_LIMIT}, Previous limit reached: ${limitReached}`);

    if (count <= TAB_LIMIT) {
      console.log('Tab count under limit, resetting flag');
      limitReached = false;
      chrome.action.setBadgeText({ text: "" });
    } else if (count > TAB_LIMIT) {
      if (!limitReached) {
        console.log('Tab limit exceeded, showing reminder');
        limitReached = true;
        showReminder(count);
      } else {
        console.log('Still over limit, but notification already shown');
      }
    }
  });
}

function showReminder(count) {
  console.log('Setting badge text and showing notification');
  chrome.action.setBadgeText({ text: `${count}` });
  chrome.action.setBadgeBackgroundColor({ color: "#FF4136" });
  
  // Create a unique notification ID with timestamp
  const notificationId = `tab-limit-${Date.now()}`;
  
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon2.png'),
    title: 'Too Many Tabs!',
    message: `${count} tabs are open. Time to tidy up — Tab Wise has grouped them for you.`,
    priority: 2,
    requireInteraction: true,  // Make notification persist until user interacts
    silent: false  // Play the default notification sound
  }, (notificationId) => {
    console.log('Notification created with ID:', notificationId);
    if (chrome.runtime.lastError) {
      console.error('Notification error:', chrome.runtime.lastError);
    }
  });
}

chrome.notifications.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage(); // Or:
  // chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
});

chrome.tabs.onCreated.addListener(checkTabCount);
chrome.tabs.onRemoved.addListener(checkTabCount);
chrome.tabs.onUpdated.addListener(checkTabCount);

checkTabCount(); // Run on start
