// Fixed popup.js
console.log("popup.js loaded ✅");

function createSearchBar() {
  const searchDiv = document.createElement('div');
  searchDiv.className = 'search-bar';

  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'search-wrapper';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'search-icon';
  searchIcon.textContent = '🔍';

  const search = document.createElement('input');
  search.className = 'search-input';
  search.placeholder = 'Search tabs...';
  search.addEventListener('input', filterTabs);

  const counts = document.createElement('div');
  counts.id = 'tabCounts';

  searchWrapper.appendChild(searchIcon);
  searchWrapper.appendChild(search);
  searchDiv.appendChild(searchWrapper);
  searchDiv.appendChild(counts);
  return searchDiv;
}

function groupTabs(tabs) {
  const groups = {};
  tabs.forEach(tab => {
    try {
      const url = new URL(tab.url);
      let groupName;
      
      // Handle special cases first
      if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
        groupName = 'Chrome';
      } else if (url.protocol === 'file:') {
        groupName = 'Local Files';
      } else {
        // Get the domain without www
        groupName = url.hostname.replace(/^www\./, '');
      }

      if (!groups[groupName]) {
        groups[groupName] = { tabs: [] };
      }
      groups[groupName].tabs.push(tab);
    } catch (e) {
      // Handle invalid URLs by putting them in an "Other" group
      const groupName = 'Other';
      if (!groups[groupName]) {
        groups[groupName] = { tabs: [] };
      }
      groups[groupName].tabs.push(tab);
    }
  });

  // Sort groups by tab count (descending)
  const sortedGroups = {};
  Object.keys(groups)
    .sort((a, b) => groups[b].tabs.length - groups[a].tabs.length)
    .forEach(key => {
      sortedGroups[key] = groups[key];
    });

  return sortedGroups;
}

function createGroupElement(domain, groupData) {
  const { tabs } = groupData;
  const groupDiv = document.createElement('div');
  groupDiv.className = 'tab-group';

  const headerDiv = document.createElement('div');
  headerDiv.className = 'tab-group-header';

  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'tab-group-title';

  const favicon = document.createElement('img');
  favicon.src = tabs[0].favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
  favicon.className = 'tab-group-favicon';
  favicon.onerror = function() {
    this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
  };

  const title = document.createElement('span');
  title.textContent = `${domain} (${tabs.length})`;

  titleWrapper.appendChild(favicon);
  titleWrapper.appendChild(title);

  const controls = document.createElement('div');
  controls.className = 'tab-group-controls';

  const closeAllBtn = document.createElement('button');
  closeAllBtn.textContent = '✖ Close All';
  closeAllBtn.className = 'btn btn-closeall';
  closeAllBtn.onclick = (e) => {
    e.stopPropagation();
    closeTabs(tabs);
  };

  controls.appendChild(closeAllBtn);
  headerDiv.appendChild(titleWrapper);
  headerDiv.appendChild(controls);
  groupDiv.appendChild(headerDiv);

  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'tabs-container';
  
  tabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab-item';
    tabEl.dataset.url = tab.url;
    tabEl.dataset.title = tab.title;

    const tabFavicon = document.createElement('img');
    tabFavicon.src = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
    tabFavicon.className = 'tab-item-favicon';
    tabFavicon.onerror = function() {
      this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
    };
    
    const label = document.createElement('span');
    label.textContent = tab.title.length > 50 ? tab.title.slice(0, 50) + '...' : tab.title;
    label.className = 'tab-item-title';
    label.onclick = () => {
      chrome.tabs.update(tab.id, { active: true });
      window.close(); // Close the popup after switching tabs
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✖';
    closeBtn.className = 'btn-tab-close';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      chrome.tabs.remove(tab.id, () => {
        tabEl.remove();
        updateTabCount();
      });
    };

    tabEl.appendChild(tabFavicon);
    tabEl.appendChild(label);
    tabEl.appendChild(closeBtn);
    tabsContainer.appendChild(tabEl);
  });

  groupDiv.appendChild(tabsContainer);
  return groupDiv;
}

function filterTabs(e) {
  const query = e.target.value.toLowerCase();
  const tabItems = document.querySelectorAll('.tab-item[data-url]');
  let visibleCount = 0;
  
  tabItems.forEach(tabEl => {
    const title = (tabEl.dataset.title || '').toLowerCase();
    const url = (tabEl.dataset.url || '').toLowerCase();
    const isVisible = title.includes(query) || url.includes(query);
    tabEl.style.display = isVisible ? 'flex' : 'none';
    if (isVisible) visibleCount++;
  });

  // Hide/show groups based on whether they have visible tabs
  document.querySelectorAll('.tab-group').forEach(group => {
    const visibleTabsInGroup = group.querySelectorAll('.tab-item[style*="flex"], .tab-item:not([style])').length;
    group.style.display = visibleTabsInGroup > 0 ? 'block' : 'none';
  });
}

function closeTabs(tabs) {
  const tabIds = tabs.map(tab => tab.id);
  chrome.tabs.remove(tabIds, () => {
    // Refresh the popup after closing tabs
    initializePopup();
  });
}

function updateTabCount() {
  const totalTabs = document.querySelectorAll('.tab-item').length;
  const totalGroups = document.querySelectorAll('.tab-group').length;
  const countsElement = document.getElementById('tabCounts');
  if (countsElement) {
    countsElement.textContent = `${totalTabs} tabs in ${totalGroups} groups`;
  }
}

function initializePopup() {
  chrome.tabs.query({}, tabs => {
    console.log("Tabs fetched:", tabs.length);
    
    const container = document.getElementById('tabGroups');
    if (!container) {
      console.error("tabGroups container not found!");
      return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    // Add search bar
    container.appendChild(createSearchBar());
    
    // Group and display tabs
    const grouped = groupTabs(tabs);
    console.log("Grouped tabs:", grouped);
    
    Object.keys(grouped).forEach(domain => {
      const groupEl = createGroupElement(domain, grouped[domain]);
      container.appendChild(groupEl);
    });

    updateTabCount();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}