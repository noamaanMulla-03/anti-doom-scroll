// Popup script
const toggle = document.getElementById('enableToggle');
const scrollsBlocked = document.getElementById('scrollsBlocked');

// Load current state
chrome.storage.sync.get(['enabled', 'blockedCount'], (result) => {
  toggle.checked = result.enabled !== false;
  scrollsBlocked.textContent = result.blockedCount || 0;
});

// Handle toggle changes
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });
});

// Update blocked count periodically
setInterval(() => {
  chrome.storage.sync.get(['blockedCount'], (result) => {
    scrollsBlocked.textContent = result.blockedCount || 0;
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