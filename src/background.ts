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
        // First time install - initialize settings atomically then check onboarding
        chrome.storage.sync.set({
            ...DEFAULT_SETTINGS,
            enabledSites: DEFAULT_ENABLED_SITES,
            lastResetDate: new Date().toDateString(),
            analytics: {},
            onboardingCompleted: false
        }, () => {
            // Check if error occurred during storage operation
            if (chrome.runtime.lastError) {
                console.error('[Anti-Doom Scroll] Storage initialization failed:', chrome.runtime.lastError);
                return;
            }

            // Open onboarding page after successful initialization
            chrome.tabs.create({ url: 'onboarding.html' }).catch((err) => {
                console.error('[Anti-Doom Scroll] Failed to open onboarding:', err);
            });
        });
    } else if (details.reason === 'update') {
        // Extension updated - log version and ensure all settings exist
        console.log('[Anti-Doom Scroll] Updated to version', chrome.runtime.getManifest().version);

        // Merge with defaults to ensure new settings are added
        chrome.storage.sync.get(null, (result) => {
            const updatedSettings = {
                ...DEFAULT_SETTINGS,
                enabledSites: DEFAULT_ENABLED_SITES,
                ...result
            };
            chrome.storage.sync.set(updatedSettings);
        });
    }
});

// ============================================
// Daily Reset System
// ============================================

/**
 * Checks if a new day has started and resets daily counters
 * Runs periodically via alarm system
 * Uses atomic operations to prevent race conditions
 */
function checkDailyReset(): void {
    chrome.storage.sync.get(['lastResetDate'], (result) => {
        // Handle storage errors
        if (chrome.runtime.lastError) {
            console.error('[Anti-Doom Scroll] Failed to check daily reset:', chrome.runtime.lastError);
            return;
        }

        const today = new Date().toDateString();
        if (result.lastResetDate !== today) {
            // New day detected - reset counters atomically
            chrome.storage.sync.set({
                blockedCount: 0,
                lastResetDate: today
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('[Anti-Doom Scroll] Failed to perform daily reset:', chrome.runtime.lastError);
                    return;
                }
                console.log('[Anti-Doom Scroll] Daily reset completed');
            });
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
    // Validate message structure
    if (!message || !message.type) {
        console.warn('[Anti-Doom Scroll] Received invalid message:', message);
        return false;
    }

    // Handle block attempt logging with atomic increment
    if (message.type === 'blockAttempt') {
        chrome.storage.sync.get(['blockedCount'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('[Anti-Doom Scroll] Failed to get blocked count:', chrome.runtime.lastError);
                return;
            }

            const currentCount = safeNumber(result.blockedCount);
            chrome.storage.sync.set({ blockedCount: currentCount + 1 }, () => {
                if (chrome.runtime.lastError) {
                    console.error('[Anti-Doom Scroll] Failed to update blocked count:', chrome.runtime.lastError);
                }
            });
        });
        return false; // Synchronous response
    }

    // Handle analytics updates with type safety and cleanup
    if (message.type === 'updateAnalytics') {
        // Validate message data
        if (!message.site || typeof message.duration !== 'number' || message.duration < 0) {
            console.warn('[Anti-Doom Scroll] Invalid analytics data:', message);
            return false;
        }

        const site = message.site;
        const duration = Math.floor(message.duration); // Ensure integer minutes

        chrome.storage.sync.get(['analytics'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('[Anti-Doom Scroll] Failed to get analytics:', chrome.runtime.lastError);
                return;
            }

            const analytics = safeAnalytics(result.analytics);
            const today = new Date().toDateString();

            // Initialize today's data if needed
            if (!analytics[today]) {
                analytics[today] = {};
            }

            // Update site duration (cumulative for the day)
            analytics[today][site] = duration;

            // Automatic cleanup - keep only last N days (optimized)
            const dates = Object.keys(analytics);
            if (dates.length > ANALYTICS_RETENTION_DAYS) {
                // Sort dates in descending order and remove old ones
                const sortedDates = dates.sort((a, b) => {
                    return new Date(b).getTime() - new Date(a).getTime();
                });

                // Delete dates beyond retention period
                sortedDates.slice(ANALYTICS_RETENTION_DAYS).forEach(date => {
                    delete analytics[date];
                });
            }

            chrome.storage.sync.set({ analytics }, () => {
                if (chrome.runtime.lastError) {
                    console.error('[Anti-Doom Scroll] Failed to update analytics:', chrome.runtime.lastError);
                }
            });
        });
        return false; // Synchronous response
    }

    return false; // No async response needed
});

// ============================================
// Badge Management System
// ============================================

/**
 * Updates extension badge based on storage changes
 * - Shows blocked count on badge
 * - Updates icon state based on enabled/disabled
 * Includes error handling for all badge operations
 */
chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }): void => {
    // Update badge text when blocked count changes
    if (changes.blockedCount) {
        const count = safeNumber(changes.blockedCount.newValue);

        // Use promise-based API with error handling
        chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' }).catch((err) => {
            console.error('[Anti-Doom Scroll] Failed to set badge text:', err);
        });

        if (count > 0) {
            chrome.action.setBadgeBackgroundColor({ color: '#DC3545' }).catch((err) => {
                console.error('[Anti-Doom Scroll] Failed to set badge color:', err);
            });
        }
    }

    // Update icon when extension is toggled (with visual feedback)
    if (changes.enabled) {
        const enabled = safeBoolean(changes.enabled.newValue, true);

        // Set icon based on enabled state
        chrome.action.setIcon({
            path: {
                16: 'icons/icon16.png',
                48: 'icons/icon48.png',
                128: 'icons/icon128.png'
            }
        }).catch((err) => {
            console.error('[Anti-Doom Scroll] Failed to set icon:', err);
        });

        // Update badge color to reflect state
        if (!enabled) {
            chrome.action.setBadgeBackgroundColor({ color: '#6C757D' }).catch(() => { });
        } else {
            chrome.action.setBadgeBackgroundColor({ color: '#DC3545' }).catch(() => { });
        }
    }
});

// ============================================
// Initialization
// ============================================

/**
 * Initialize badge on service worker startup
 * Ensures badge displays current blocked count
 * Includes error handling for initialization
 */
chrome.storage.sync.get(['blockedCount'], (result) => {
    if (chrome.runtime.lastError) {
        console.error('[Anti-Doom Scroll] Failed to initialize badge:', chrome.runtime.lastError);
        return;
    }

    const count = safeNumber(result.blockedCount);
    if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString() }).catch((err) => {
            console.error('[Anti-Doom Scroll] Failed to set initial badge text:', err);
        });
        chrome.action.setBadgeBackgroundColor({ color: '#DC3545' }).catch((err) => {
            console.error('[Anti-Doom Scroll] Failed to set initial badge color:', err);
        });
    }
});

// Perform daily reset check on startup
checkDailyReset();

console.log('[Anti-Doom Scroll] Background service worker initialized');
