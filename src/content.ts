// ============================================
// Content Script - Doom Scroll Blocker
// ============================================
// Responsibilities:
// 1. Detect and block scroll attempts on social media
// 2. Track session time and usage analytics
// 3. Enforce time limits and break reminders
// 4. Provide user notifications and snooze functionality
// 5. Manage sound feedback
// ============================================

import type { EnabledSites, SiteName, StorageResult, Analytics } from './types';
import {
    DEFAULT_ENABLED_SITES,
    SNOOZE_DURATION,
    SESSION_UPDATE_INTERVAL,
    safeNumber,
    safeBoolean,
    normalizeEnabledSites
} from './types';

// ============================================
// State Management
// ============================================

/**
 * Application state container
 * Centralizes all mutable state for easier debugging
 */
const state = {
    // Core settings
    enabled: true as boolean,
    enabledSites: { ...DEFAULT_ENABLED_SITES } as EnabledSites,
    timeLimit: 0 as number,
    breakInterval: 0 as number,
    soundEnabled: false as boolean,

    // Tracking state
    blockedScrollAttempts: 0 as number,
    sessionStartTime: null as number | null,
    sessionDuration: 0 as number,
    lastBreakReminder: Date.now() as number,
    snoozedUntil: null as number | null,

    // Lifecycle state
    initialized: false as boolean,
    urlObserver: null as MutationObserver | null,
    sessionUpdateInterval: null as ReturnType<typeof setInterval> | null
};

// ============================================
// Settings Management
// ============================================

/**
 * Loads settings from Chrome storage
 * Uses centralized utility functions for type safety
 */
function loadSettings(): void {
    chrome.storage.sync.get([
        'enabled',
        'enabledSites',
        'timeLimit',
        'breakInterval',
        'soundEnabled'
    ], (result: StorageResult) => {
        state.enabled = safeBoolean(result.enabled, true);
        state.enabledSites = normalizeEnabledSites(result.enabledSites);
        state.timeLimit = safeNumber(result.timeLimit);
        state.breakInterval = safeNumber(result.breakInterval);
        state.soundEnabled = safeBoolean(result.soundEnabled);

        if (state.enabled) init();
    });
}

/**
 * Listens for settings changes and updates state reactively
 */
function setupSettingsListener(): void {
    chrome.storage.onChanged.addListener((changes) => {
        let needsReinit = false;

        if (changes.enabled) {
            const newEnabled = safeBoolean(changes.enabled.newValue, true);
            if (newEnabled !== state.enabled) {
                state.enabled = newEnabled;
                needsReinit = true;
            }
        }

        if (changes.enabledSites) {
            state.enabledSites = normalizeEnabledSites(changes.enabledSites.newValue as EnabledSites);
        }

        if (changes.timeLimit) {
            state.timeLimit = safeNumber(changes.timeLimit.newValue);
        }

        if (changes.breakInterval) {
            state.breakInterval = safeNumber(changes.breakInterval.newValue);
        }

        if (changes.soundEnabled) {
            state.soundEnabled = safeBoolean(changes.soundEnabled.newValue);
        }

        // Reinitialize if enabled state changed
        if (needsReinit) {
            if (state.enabled) {
                init();
            } else {
                cleanup();
            }
        }
    });
}

// ============================================
// Site Detection
// ============================================

/**
 * Detects current social media site from URL
 * @returns Site name or null if not a tracked site
 */
function getCurrentSite(): SiteName | null {
    const url = window.location.href;

    // Optimized URL matching using early returns
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('youtube.com')) return 'youtube';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';

    return null;
}

/**
 * Checks if current site is enabled for blocking
 * @returns True if site should be blocked
 */
function isSiteEnabled(): boolean {
    const site = getCurrentSite();
    return site !== null && state.enabledSites[site] !== false;
}

/**
 * Detects if user is viewing media content (posts/reels/shorts)
 * @returns True if in a view that should be blocked
 */
function isInMediaView(): boolean {
    if (!isSiteEnabled()) return false;

    const url = window.location.href;

    // Instagram - reels, posts, stories
    if (url.includes('instagram.com')) {
        return url.includes('/reel/') || url.includes('/p/') || url.includes('/stories/');
    }

    // TikTok - videos
    if (url.includes('tiktok.com')) {
        return url.includes('/video/') || url.includes('/@');
    }

    // YouTube - Shorts
    if (url.includes('youtube.com')) {
        return url.includes('/shorts/');
    }

    // Facebook - reels, stories
    if (url.includes('facebook.com')) {
        return url.includes('/reel/') || url.includes('/stories/');
    }

    // Twitter/X - media viewer
    if (url.includes('twitter.com') || url.includes('x.com')) {
        return url.includes('/status/') && url.includes('/photo/');
    }

    // Reddit - post view
    if (url.includes('reddit.com')) {
        return document.querySelector('[data-testid="post-container"]') !== null;
    }

    return false;
}

// ============================================
// Session Tracking & Analytics
// ============================================

/**
 * Updates session duration and enforces limits
 * Called periodically and on scroll attempts
 */
function updateSessionTracking(): void {
    // Initialize session start time
    if (!state.sessionStartTime) {
        state.sessionStartTime = Date.now();
    }

    // Calculate session duration in minutes
    state.sessionDuration = Math.floor((Date.now() - state.sessionStartTime) / 1000 / 60);

    // Send analytics update to background
    const site = getCurrentSite();
    if (site && state.sessionDuration > 0) {
        chrome.runtime.sendMessage({
            type: 'updateAnalytics',
            site: site,
            duration: state.sessionDuration
        });
    }

    // Check and enforce time limit
    if (state.timeLimit > 0 && state.sessionDuration >= state.timeLimit) {
        showTimeLimitNotification();
    }

    // Check and show break reminder
    if (state.breakInterval > 0) {
        const timeSinceLastBreak = (Date.now() - state.lastBreakReminder) / 1000 / 60;
        if (timeSinceLastBreak >= state.breakInterval) {
            showBreakReminder();
            state.lastBreakReminder = Date.now();
        }
    }
}

/**
 * Checks if snooze is currently active
 * @returns True if snoozed
 */
function isSnoozeActive(): boolean {
    if (state.snoozedUntil && Date.now() < state.snoozedUntil) {
        return true;
    }

    // Clear expired snooze
    if (state.snoozedUntil && Date.now() >= state.snoozedUntil) {
        state.snoozedUntil = null;
    }

    return false;
}

// ============================================
// Audio Feedback
// ============================================

/**
 * Plays a short audio feedback sound when scroll is blocked
 * Uses Web Audio API for browser compatibility
 */
function playBlockSound(): void {
    if (!state.soundEnabled) return;

    try {
        // Create audio context with fallback for webkit
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Connect audio nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configure sound parameters
        oscillator.frequency.value = 400; // 400 Hz
        oscillator.type = 'sine';

        // Fade out envelope
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        // Play sound
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        // Silently fail if audio isn't available
        console.debug('[Anti-Doom Scroll] Audio feedback unavailable');
    }
}

// ============================================
// Event Handlers
// ============================================

/**
 * Blocks scroll events (wheel, touch, scroll)
 * Centralized handler for all scroll-related events
 */
function blockScroll(e: Event): boolean | void {
    if (!state.enabled || !isInMediaView() || isSnoozeActive()) return;

    // Update session tracking on user interaction
    updateSessionTracking();

    // Prevent scroll event
    if (e.type === 'wheel' || e.type === 'touchmove' || e.type === 'scroll') {
        e.preventDefault();
        e.stopPropagation();

        state.blockedScrollAttempts++;

        // Notify background of block attempt
        chrome.runtime.sendMessage({ type: 'blockAttempt' });

        // Play sound feedback
        playBlockSound();

        // Show notification on first block
        if (state.blockedScrollAttempts === 1) {
            showNotification();
        }

        return false;
    }
}

/**
 * Blocks keyboard navigation (arrow keys, page up/down)
 */
function blockKeyboard(e: KeyboardEvent): boolean | void {
    if (!state.enabled || !isInMediaView() || isSnoozeActive()) return;

    // Block navigation keys
    const blockedKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home'];
    if (blockedKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        state.blockedScrollAttempts++;

        // Notify background of block attempt
        chrome.runtime.sendMessage({ type: 'blockAttempt' });

        return false;
    }
}

// ============================================
// Notification System
// ============================================

/**
 * Creates and displays main block notification with snooze option
 */
function showNotification(): void {
    // Prevent duplicate notifications
    const existing = document.getElementById('anti-doom-scroll-notification');
    if (existing) return;

    // Create notification container
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

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
  `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Snooze button handler
    const snoozeBtn = document.getElementById('snooze-btn');
    if (snoozeBtn) {
        snoozeBtn.addEventListener('click', () => {
            state.snoozedUntil = Date.now() + SNOOZE_DURATION;
            notification.remove();
            showSnoozeConfirmation();
        });
    }

    // Close button handler
    const closeBtn = document.getElementById('close-notification-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
    }
}

/**
 * Shows snooze confirmation toast
 */
function showSnoozeConfirmation(): void {
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

    // Auto-remove with fade out
    setTimeout(() => {
        notification.style.transition = 'opacity 0.3s ease-out';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Shows time limit reached notification
 */
function showTimeLimitNotification(): void {
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
    <div style="font-size: 13px; opacity: 0.9;">You've spent ${state.timeLimit} minutes here.</div>
  `;
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.transition = 'opacity 0.3s ease-out';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Shows break reminder notification
 */
function showBreakReminder(): void {
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

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.transition = 'opacity 0.3s ease-out';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ============================================
// Lifecycle Management
// ============================================

/**
 * Initializes the content script
 * Sets up event listeners and observers
 */
function init(): void {
    // Prevent duplicate initialization
    if (state.initialized) return;
    state.initialized = true;

    console.log('[Anti-Doom Scroll] Initializing content script');

    // Register event listeners with capture phase for priority
    document.addEventListener('wheel', blockScroll, { passive: false, capture: true });
    document.addEventListener('touchmove', blockScroll, { passive: false, capture: true });
    window.addEventListener('scroll', blockScroll, { passive: false, capture: true });
    document.addEventListener('keydown', blockKeyboard, { passive: false, capture: true });

    // Monitor URL changes to reset session state
    let lastUrl = location.href;
    state.urlObserver = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            // Reset session on navigation
            state.blockedScrollAttempts = 0;
            state.sessionStartTime = null;
            state.sessionDuration = 0;
        }
    });

    state.urlObserver.observe(document, { subtree: true, childList: true });

    // Start periodic session tracking
    state.sessionUpdateInterval = setInterval(updateSessionTracking, SESSION_UPDATE_INTERVAL);
}

/**
 * Cleans up the content script
 * Removes event listeners and observers to prevent memory leaks
 */
function cleanup(): void {
    console.log('[Anti-Doom Scroll] Cleaning up content script');

    state.initialized = false;

    // Remove event listeners
    document.removeEventListener('wheel', blockScroll, { capture: true });
    document.removeEventListener('touchmove', blockScroll, { capture: true });
    window.removeEventListener('scroll', blockScroll, { capture: true });
    document.removeEventListener('keydown', blockKeyboard, { capture: true });

    // Disconnect and clean up observer
    if (state.urlObserver) {
        state.urlObserver.disconnect();
        state.urlObserver = null;
    }

    // Clear interval
    if (state.sessionUpdateInterval) {
        clearInterval(state.sessionUpdateInterval);
        state.sessionUpdateInterval = null;
    }

    // Reset session state
    state.sessionStartTime = null;
    state.sessionDuration = 0;
}

// ============================================
// Initialization
// ============================================

// Self-executing initialization
(function () {
    'use strict';

    // Load settings and initialize
    loadSettings();

    // Setup settings change listener
    setupSettingsListener();
})();
