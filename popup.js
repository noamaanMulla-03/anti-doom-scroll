// Popup script
const toggle = document.getElementById('enableToggle');
const scrollsBlocked = document.getElementById('scrollsBlocked');
const timeLimitInput = document.getElementById('timeLimit');
const breakIntervalInput = document.getElementById('breakInterval');
const analyticsContainer = document.getElementById('analytics');
const siteToggles = document.querySelectorAll('.site-toggle');

// Load current state
chrome.storage.sync.get([
  'enabled', 
  'blockedCount', 
  'enabledSites',
  'timeLimit',
  'breakInterval',
  'analytics'
], (result) => {
  toggle.checked = result.enabled !== false;
  scrollsBlocked.textContent = result.blockedCount || 0;
  timeLimitInput.value = result.timeLimit || 0;
  breakIntervalInput.value = result.breakInterval || 0;
  
  // Load site-specific settings
  const enabledSites = result.enabledSites || {
    instagram: true,
    tiktok: true,
    youtube: true,
    facebook: true,
    twitter: true,
    reddit: true
  };
  
  siteToggles.forEach(toggle => {
    const site = toggle.dataset.site;
    toggle.checked = enabledSites[site] !== false;
  });

  // Display analytics
  displayAnalytics(result.analytics);
});

// Handle main toggle changes
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });
});

// Handle site toggle changes
siteToggles.forEach(toggle => {
  toggle.addEventListener('change', () => {
    chrome.storage.sync.get(['enabledSites'], (result) => {
      const enabledSites = result.enabledSites || {
        instagram: true,
        tiktok: true,
        youtube: true,
        facebook: true,
        twitter: true,
        reddit: true
      };
      
      const site = toggle.dataset.site;
      enabledSites[site] = toggle.checked;
      chrome.storage.sync.set({ enabledSites });
    });
  });
});

// Handle time limit changes
timeLimitInput.addEventListener('change', () => {
  const timeLimit = parseInt(timeLimitInput.value) || 0;
  chrome.storage.sync.set({ timeLimit });
});

// Handle break interval changes
breakIntervalInput.addEventListener('change', () => {
  const breakInterval = parseInt(breakIntervalInput.value) || 0;
  chrome.storage.sync.set({ breakInterval });
});

// Display analytics data
function displayAnalytics(analytics) {
  if (!analytics) {
    return;
  }
  
  const today = new Date().toDateString();
  const todayData = analytics[today];
  
  if (!todayData || Object.keys(todayData).length === 0) {
    return;
  }
  
  let html = '';
  for (const [site, minutes] of Object.entries(todayData)) {
    if (minutes > 0) {
      html += `
        <div class="analytics-item">
          <span class="analytics-site">${site}</span>
          <span class="analytics-time">${minutes} min</span>
        </div>
      `;
    }
  }
  
  if (html) {
    analyticsContainer.innerHTML = html;
  }
}

// Update blocked count periodically
setInterval(() => {
  chrome.storage.sync.get(['blockedCount', 'analytics'], (result) => {
    scrollsBlocked.textContent = result.blockedCount || 0;
    displayAnalytics(result.analytics);
  });
}, 1000);

// Reset count daily
const today = new Date().toDateString();
chrome.storage.sync.get(['lastResetDate'], (result) => {
  if (result.lastResetDate !== today) {
    chrome.storage.sync.set({ 
      blockedCount: 0,
      lastResetDate: today 
    });
  }
});