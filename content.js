// Content script to block doom scrolling
(function() {
  'use strict';

  let enabled = true;
  let blockedScrollAttempts = 0;
  let urlObserver = null;
  let initialized = false;
  let sessionStartTime = null;
  let sessionDuration = 0;
  let lastBreakReminder = Date.now();
  let snoozedUntil = null;
  let enabledSites = {};
  let timeLimit = 0; // 0 means no limit, otherwise in minutes
  let breakInterval = 0; // 0 means no reminders, otherwise in minutes
  let soundEnabled = false;

  // Load settings
  chrome.storage.sync.get([
    'enabled', 
    'enabledSites',
    'timeLimit',
    'breakInterval',
    'soundEnabled'
  ], (result) => {
    enabled = result.enabled !== false;
    enabledSites = result.enabledSites || {
      instagram: true,
      tiktok: true,
      youtube: true,
      facebook: true,
      twitter: true,
      reddit: true
    };
    timeLimit = result.timeLimit || 0;
    breakInterval = result.breakInterval || 0;
    soundEnabled = result.soundEnabled || false;
    
    if (enabled) init();
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      enabled = changes.enabled.newValue;
      if (enabled) {
        init();
      } else {
        cleanup();
      }
    }
    if (changes.enabledSites) {
      enabledSites = changes.enabledSites.newValue;
    }
    if (changes.timeLimit) {
      timeLimit = changes.timeLimit.newValue;
    }
    if (changes.breakInterval) {
      breakInterval = changes.breakInterval.newValue;
    }
    if (changes.soundEnabled) {
      soundEnabled = changes.soundEnabled.newValue;
    }
  });

  function getCurrentSite() {
    const url = window.location.href;
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('youtube.com')) return 'youtube';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    return null;
  }

  function isSiteEnabled() {
    const site = getCurrentSite();
    return site && enabledSites[site] !== false;
  }

  function isInMediaView() {
    if (!isSiteEnabled()) return false;
    
    const url = window.location.href;
    
    // Instagram reels, posts
    if (url.includes('instagram.com')) {
      return url.includes('/reel/') || url.includes('/p/') || url.includes('/stories/');
    }
    
    // TikTok videos
    if (url.includes('tiktok.com')) {
      return url.includes('/video/') || url.includes('/@');
    }
    
    // YouTube Shorts
    if (url.includes('youtube.com')) {
      return url.includes('/shorts/');
    }
    
    // Facebook stories/reels
    if (url.includes('facebook.com')) {
      return url.includes('/reel/') || url.includes('/stories/');
    }
    
    // Twitter/X media viewer
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return url.includes('/status/') && url.includes('/photo/');
    }
    
    // Reddit media viewer
    if (url.includes('reddit.com')) {
      return document.querySelector('[data-testid="post-container"]') !== null;
    }
    
    return false;
  }

  function updateSessionTracking() {
    if (!sessionStartTime) {
      sessionStartTime = Date.now();
    }
    
    sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000 / 60); // in minutes
    
    // Update analytics
    const site = getCurrentSite();
    if (site) {
      chrome.storage.sync.get(['analytics'], (result) => {
        const analytics = result.analytics || {};
        const today = new Date().toDateString();
        
        if (!analytics[today]) {
          analytics[today] = {};
        }
        
        if (!analytics[today][site]) {
          analytics[today][site] = 0;
        }
        
        analytics[today][site] = sessionDuration;
        chrome.storage.sync.set({ analytics });
      });
    }
    
    // Check time limit
    if (timeLimit > 0 && sessionDuration >= timeLimit) {
      showTimeLimitNotification();
    }
    
    // Check break reminder
    if (breakInterval > 0) {
      const timeSinceLastBreak = (Date.now() - lastBreakReminder) / 1000 / 60;
      if (timeSinceLastBreak >= breakInterval) {
        showBreakReminder();
        lastBreakReminder = Date.now();
      }
    }
  }

  function isSnoozeActive() {
    if (snoozedUntil && Date.now() < snoozedUntil) {
      return true;
    }
    if (snoozedUntil && Date.now() >= snoozedUntil) {
      snoozedUntil = null;
    }
    return false;
  }

  function playBlockSound() {
    if (!soundEnabled) return;
    
    // Create a short "boop" sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 400; // Frequency in Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Silently fail if audio isn't available
      console.log('Audio feedback unavailable');
    }
  }

  function blockScroll(e) {
    if (!enabled || !isInMediaView() || isSnoozeActive()) return;
    
    // Update session tracking
    updateSessionTracking();
    
    // Detect scroll attempts
    if (e.type === 'wheel' || e.type === 'touchmove' || e.type === 'scroll') {
      e.preventDefault();
      e.stopPropagation();
      blockedScrollAttempts++;
      
      // Persist to storage
      chrome.storage.sync.get(['blockedCount'], (result) => {
        const currentCount = result.blockedCount || 0;
        chrome.storage.sync.set({ blockedCount: currentCount + 1 });
      });
      
      // Play sound feedback
      playBlockSound();
      
      if (blockedScrollAttempts === 1) {
        showNotification();
      }
      
      return false;
    }
  }

  function blockKeyboard(e) {
    if (!enabled || !isInMediaView() || isSnoozeActive()) return;
    
    // Block arrow keys and page up/down
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      blockedScrollAttempts++;
      
      // Persist to storage
      chrome.storage.sync.get(['blockedCount'], (result) => {
        const currentCount = result.blockedCount || 0;
        chrome.storage.sync.set({ blockedCount: currentCount + 1 });
      });
      
      return false;
    }
  }

  function showNotification() {
    const existing = document.getElementById('anti-doom-scroll-notification');
    if (existing) return;
    
    const notification = document.createElement('div');
    notification.id = 'anti-doom-scroll-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 25px 35px;
        border-radius: 16px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        animation: fadeIn 0.3s ease-in;
        max-width: 400px;
      ">
        <div style="font-size: 48px; margin-bottom: 10px;">🛑</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Doom scrolling blocked!</div>
        <div style="font-size: 14px; opacity: 0.8; margin-bottom: 15px;">Close this post to browse more content</div>
        <button id="snooze-btn" style="
          background: rgba(76, 175, 80, 0.9);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          margin-right: 10px;
        ">Snooze 5 min</button>
        <button id="close-notification-btn" style="
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        ">Close</button>
      </div>
    `;
    
    // Add fade in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Add snooze button handler
    const snoozeBtn = document.getElementById('snooze-btn');
    snoozeBtn.addEventListener('click', () => {
      snoozedUntil = Date.now() + (5 * 60 * 1000); // 5 minutes
      notification.remove();
      showSnoozeConfirmation();
    });
    
    // Add close button handler
    const closeBtn = document.getElementById('close-notification-btn');
    closeBtn.addEventListener('click', () => {
      notification.remove();
    });
  }

  function showSnoozeConfirmation() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(76, 175, 80, 0.95);
      color: white;
      padding: 15px 25px;
      border-radius: 12px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    notification.textContent = '✓ Snoozed for 5 minutes';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s ease-out';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function showTimeLimitNotification() {
    const existing = document.getElementById('time-limit-notification');
    if (existing) return;
    
    const notification = document.createElement('div');
    notification.id = 'time-limit-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(220, 53, 69, 0.95);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 300px;
    `;
    notification.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 8px;">⏰</div>
      <div style="font-weight: 600; margin-bottom: 5px;">Time limit reached!</div>
      <div style="font-size: 13px; opacity: 0.9;">You've spent ${timeLimit} minutes here.</div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s ease-out';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  function showBreakReminder() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(102, 126, 234, 0.95);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 300px;
    `;
    notification.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 8px;">🧘</div>
      <div style="font-weight: 600; margin-bottom: 5px;">Time for a break!</div>
      <div style="font-size: 13px; opacity: 0.9;">You've been scrolling for a while. Take a moment to rest your eyes.</div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s ease-out';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  function init() {
    // Prevent duplicate initialization
    if (initialized) return;
    initialized = true;
    
    // Block wheel events
    document.addEventListener('wheel', blockScroll, { passive: false, capture: true });
    
    // Block touch events
    document.addEventListener('touchmove', blockScroll, { passive: false, capture: true });
    
    // Block scroll events
    window.addEventListener('scroll', blockScroll, { passive: false, capture: true });
    
    // Block keyboard navigation
    document.addEventListener('keydown', blockKeyboard, { passive: false, capture: true });
    
    // Reset counter and start session tracking when URL changes
    let lastUrl = location.href;
    urlObserver = new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        blockedScrollAttempts = 0;
        sessionStartTime = null;
        sessionDuration = 0;
      }
    });
    urlObserver.observe(document, { subtree: true, childList: true });
    
    // Update session tracking periodically
    setInterval(updateSessionTracking, 60000); // Every minute
  }

  function cleanup() {
    initialized = false;
    document.removeEventListener('wheel', blockScroll, { capture: true });
    document.removeEventListener('touchmove', blockScroll, { capture: true });
    window.removeEventListener('scroll', blockScroll, { capture: true });
    document.removeEventListener('keydown', blockKeyboard, { capture: true });
    
    // Disconnect MutationObserver to prevent memory leak
    if (urlObserver) {
      urlObserver.disconnect();
      urlObserver = null;
    }
    
    // Reset session
    sessionStartTime = null;
    sessionDuration = 0;
  }
})();