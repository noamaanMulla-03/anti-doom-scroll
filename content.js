// Content script to block doom scrolling
(function() {
  'use strict';

  let enabled = true;
  let blockedScrollAttempts = 0;

  // Load settings
  chrome.storage.sync.get(['enabled'], (result) => {
    enabled = result.enabled !== false;
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
  });

  function isInMediaView() {
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

  function blockScroll(e) {
    if (!enabled || !isInMediaView()) return;
    
    // Detect scroll attempts
    if (e.type === 'wheel' || e.type === 'touchmove' || e.type === 'scroll') {
      e.preventDefault();
      e.stopPropagation();
      blockedScrollAttempts++;
      
      if (blockedScrollAttempts === 1) {
        showNotification();
      }
      
      return false;
    }
  }

  function blockKeyboard(e) {
    if (!enabled || !isInMediaView()) return;
    
    // Block arrow keys and page up/down
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
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
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        animation: fadeIn 0.3s ease-in;
      ">
        🛑 Doom scrolling blocked!<br>
        <span style="font-size: 14px; opacity: 0.8;">Close this post to browse more content</span>
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
    
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s ease-out';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  function init() {
    // Block wheel events
    document.addEventListener('wheel', blockScroll, { passive: false, capture: true });
    
    // Block touch events
    document.addEventListener('touchmove', blockScroll, { passive: false, capture: true });
    
    // Block scroll events
    window.addEventListener('scroll', blockScroll, { passive: false, capture: true });
    
    // Block keyboard navigation
    document.addEventListener('keydown', blockKeyboard, { passive: false, capture: true });
    
    // Reset counter when URL changes
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        blockedScrollAttempts = 0;
      }
    }).observe(document, { subtree: true, childList: true });
  }

  function cleanup() {
    document.removeEventListener('wheel', blockScroll, { capture: true });
    document.removeEventListener('touchmove', blockScroll, { capture: true });
    window.removeEventListener('scroll', blockScroll, { capture: true });
    document.removeEventListener('keydown', blockKeyboard, { capture: true });
  }
})();