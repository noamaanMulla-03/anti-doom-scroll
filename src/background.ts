// ============================================
// Background Service Worker - Anti-Doom Scroll
// ============================================
// Responsibilities:
// 1. Extension lifecycle management (install/update)
// 2. Daily statistics reset via alarms
// 3. Analytics data management and cleanup
// 4. Badge counter updates
// 5. Inter-component messaging
// ============================================

import type { MessageType, Analytics } from './types';
import {
    DEFAULT_ENABLED_SITES,
    DEFAULT_SETTINGS,
    ANALYTICS_RETENTION_DAYS,
    safeNumber,
    safeBoolean,
    safeAnalytics
} from './types';

// ============================================
// Installation & Update Handler
// ============================================

/**
 * Handles extension installation and updates
 * - Shows onboarding on first install
 * - Initializes default settings
 * - Logs update version on updates
 */
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails): void => {
    if (details.reason === 'install') {
        // First time install - check if onboarding needed
        chrome.storage.sync.get(['onboardingCompleted'], (result) => {
            if (!result.onboardingCompleted) {
                chrome.tabs.create({ url: 'onboarding.html' });
            }
        });

        // Initialize default settings with constants
        chrome.storage.sync.set({
            ...DEFAULT_SETTINGS,
            enabledSites: DEFAULT_ENABLED_SITES,
            lastResetDate: new Date().toDateString(),
            analytics: {}
        });
    } else if (details.reason === 'update') {
        // Extension updated - log version
        console.log('[Anti-Doom Scroll] Updated to version', chrome.runtime.getManifest().version);
    }
});

// ============================================
// Daily Reset System
// ============================================

/**
 * Checks if a new day has started and resets daily counters
 * Runs periodically via alarm system
 */
function checkDailyReset(): void {
    chrome.storage.sync.get(['lastResetDate'], (result) => {
        const today = new Date().toDateString();
        if (result.lastResetDate !== today) {
            // New day detected - reset counters
            chrome.storage.sync.set({
                blockedCount: 0,
                lastResetDate: today
            });
            console.log('[Anti-Doom Scroll] Daily reset completed');
        }
    });
}

// Create alarm for periodic daily reset checks (every hour)
chrome.alarms.create('dailyReset', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm): void => {
    if (alarm.name === 'dailyReset') {
        checkDailyReset();
    }
});

// ============================================
// Message Handler - Content Script Communication
// ============================================

/**
 * Handles messages from content scripts
 * - Logs block attempts and updates counter
 * - Manages analytics data with automatic cleanup
 */
chrome.runtime.onMessage.addListener((
    message: MessageType,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
): boolean => {
    // Handle block attempt logging
    if (message.type === 'blockAttempt') {
        chrome.storage.sync.get(['blockedCount'], (result) => {
            const currentCount = safeNumber(result.blockedCount);
            chrome.storage.sync.set({ blockedCount: currentCount + 1 });
        });
    }

    // Handle analytics updates with type safety and cleanup
    if (message.type === 'updateAnalytics' && message.site && message.duration !== undefined) {
        const site = message.site;
        const duration = message.duration;

        chrome.storage.sync.get(['analytics'], (result) => {
            const analytics = safeAnalytics(result.analytics);
            const today = new Date().toDateString();

            // Initialize today's data if needed
            if (!analytics[today]) {
                analytics[today] = {};
            }

            // Update site duration
            analytics[today][site] = duration;

            // Automatic cleanup - keep only last N days
            const dates = Object.keys(analytics).sort().reverse();
            if (dates.length > ANALYTICS_RETENTION_DAYS) {
                dates.slice(ANALYTICS_RETENTION_DAYS).forEach(date => delete analytics[date]);
            }

            chrome.storage.sync.set({ analytics });
        });
    }

    return true;
});

// ============================================
// Badge Management System
// ============================================

/**
 * Updates extension badge based on storage changes
 * - Shows blocked count on badge
 * - Updates icon state based on enabled/disabled
 */
chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }): void => {
    // Update badge text when blocked count changes
    if (changes.blockedCount) {
        const count = safeNumber(changes.blockedCount.newValue);
        if (count > 0) {
            chrome.action.setBadgeText({ text: count.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#DC3545' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    }

    // Update icon when extension is toggled
    if (changes.enabled) {
        const enabled = safeBoolean(changes.enabled.newValue, true);
        // Note: Could have different icons for enabled/disabled states
        chrome.action.setIcon({
            path: {
                16: 'icons/icon16.png',
                48: 'icons/icon48.png',
                128: 'icons/icon128.png'
            }
        });
    }
});

// ============================================
// Initialization
// ============================================

/**
 * Initialize badge on service worker startup
 * Ensures badge displays current blocked count
 */
chrome.storage.sync.get(['blockedCount'], (result) => {
    const count = safeNumber(result.blockedCount);
    if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#DC3545' });
    }
});

// Perform daily reset check on startup
checkDailyReset();

console.log('[Anti-Doom Scroll] Background service worker initialized');
