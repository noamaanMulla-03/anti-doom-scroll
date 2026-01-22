// Background service worker for Anti-Doom Scroll
// Handles installation, state management, and analytics

// Install event - Show onboarding on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time install - show onboarding
    chrome.storage.sync.get(['onboardingCompleted'], (result) => {
      if (!result.onboardingCompleted) {
        chrome.tabs.create({
          url: 'onboarding.html'
        });
      }
    });
    
    // Initialize default settings
    chrome.storage.sync.set({
      enabled: true,
      enabledSites: {
        instagram: true,
        tiktok: true,
        youtube: true,
        facebook: true,
        twitter: true,
        reddit: true
      },
      timeLimit: 0,
      breakInterval: 0,
      soundEnabled: false,
      blockedCount: 0,
      lastResetDate: new Date().toDateString(),
      analytics: {}
    });
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Anti-Doom Scroll updated to version', chrome.runtime.getManifest().version);
  }
});

// Reset daily statistics at midnight
function checkDailyReset() {
  chrome.storage.sync.get(['lastResetDate'], (result) => {
    const today = new Date().toDateString();
    if (result.lastResetDate !== today) {
      // New day - reset counters
      chrome.storage.sync.set({
        blockedCount: 0,
        lastResetDate: today
      });
    }
  });
}

// Check for daily reset every hour
chrome.alarms.create('dailyReset', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    checkDailyReset();
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'blockAttempt') {
    // Log block attempt
    chrome.storage.sync.get(['blockedCount'], (result) => {
      const currentCount = result.blockedCount || 0;
      chrome.storage.sync.set({ blockedCount: currentCount + 1 });
    });
  }
  
  if (message.type === 'updateAnalytics') {
    // Update analytics data
    chrome.storage.sync.get(['analytics'], (result) => {
      const analytics = result.analytics || {};
      const today = new Date().toDateString();
      
      if (!analytics[today]) {
        analytics[today] = {};
      }
      
      analytics[today][message.site] = message.duration;
      
      // Keep only last 7 days of data
      const dates = Object.keys(analytics).sort().reverse();
      if (dates.length > 7) {
        dates.slice(7).forEach(date => delete analytics[date]);
      }
      
      chrome.storage.sync.set({ analytics });
    });
  }
  
  return true;
});

// Badge text to show blocked count
chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedCount) {
    const count = changes.blockedCount.newValue || 0;
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#DC3545' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
  
  if (changes.enabled) {
    // Update icon when extension is enabled/disabled
    const enabled = changes.enabled.newValue;
    chrome.action.setIcon({
      path: {
        16: enabled ? 'icons/icon16.png' : 'icons/icon16.png',
        48: enabled ? 'icons/icon48.png' : 'icons/icon48.png',
        128: enabled ? 'icons/icon128.png' : 'icons/icon128.png'
      }
    });
  }
});

// Initialize badge on startup
chrome.storage.sync.get(['blockedCount'], (result) => {
  const count = result.blockedCount || 0;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#DC3545' });
  }
});

// Check daily reset on startup
checkDailyReset();

console.log('Anti-Doom Scroll background service worker initialized');
