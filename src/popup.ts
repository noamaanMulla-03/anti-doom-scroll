// ============================================
// Popup Script - Settings & Analytics UI
// ============================================
// Responsibilities:
// 1. Load and display current settings
// 2. Handle user input and update storage
// 3. Display analytics data
// 4. Real-time updates via storage listener
// ============================================

import type { EnabledSites, Analytics } from './types';
import {
    DEFAULT_ENABLED_SITES,
    safeNumber,
    safeBoolean,
    normalizeEnabledSites,
    safeAnalytics
} from './types';

// ============================================
// DOM Elements Cache
// ============================================

/**
 * Cache DOM elements on load for better performance
 * Avoids repeated querySelector calls
 */
const elements = {
    toggle: document.getElementById('enableToggle') as HTMLInputElement,
    scrollsBlocked: document.getElementById('scrollsBlocked') as HTMLDivElement,
    timeLimitInput: document.getElementById('timeLimit') as HTMLInputElement,
    breakIntervalInput: document.getElementById('breakInterval') as HTMLInputElement,
    soundToggle: document.getElementById('soundToggle') as HTMLInputElement,
    analyticsContainer: document.getElementById('analytics') as HTMLDivElement,
    siteToggles: document.querySelectorAll<HTMLInputElement>('.site-toggle')
};

// ============================================
// Settings Management
// ============================================

/**
 * Loads all settings from storage and updates UI
 * Single batched storage read for efficiency
 * Includes comprehensive error handling
 */
function loadSettings(): void {
    chrome.storage.sync.get([
        'enabled',
        'blockedCount',
        'enabledSites',
        'timeLimit',
        'breakInterval',
        'soundEnabled',
        'analytics'
    ], (result) => {
        // Handle storage errors gracefully
        if (chrome.runtime.lastError) {
            console.error('[Anti-Doom Scroll] Failed to load settings:', chrome.runtime.lastError);
            // Set default values on error
            elements.toggle.checked = true;
            updateBlockedCount(0);
            return;
        }

        // Update main toggle
        elements.toggle.checked = safeBoolean(result.enabled, true);

        // Update blocked count display
        updateBlockedCount(safeNumber(result.blockedCount));

        // Update input fields with validation
        elements.timeLimitInput.value = String(safeNumber(result.timeLimit));
        elements.breakIntervalInput.value = String(safeNumber(result.breakInterval));
        elements.soundToggle.checked = safeBoolean(result.soundEnabled);

        // Update site-specific toggles
        const enabledSites = normalizeEnabledSites(result.enabledSites);
        elements.siteToggles.forEach(toggle => {
            const site = toggle.dataset.site as keyof EnabledSites;
            if (site && site in enabledSites) {
                toggle.checked = enabledSites[site] !== false;
            }
        });

        // Display analytics
        displayAnalytics(safeAnalytics(result.analytics));
    });
}

/**
 * Updates the blocked count display
 * Separated for reuse by storage listener
 */
function updateBlockedCount(count: number): void {
    elements.scrollsBlocked.textContent = String(count);
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handles main extension toggle
 * Includes error handling for storage operations
 */
function handleMainToggle(): void {
    const enabled = elements.toggle.checked;
    chrome.storage.sync.set({ enabled }, () => {
        if (chrome.runtime.lastError) {
            console.error('[Anti-Doom Scroll] Failed to update enabled state:', chrome.runtime.lastError);
            // Revert toggle on error
            elements.toggle.checked = !enabled;
        }
    });
}

/**
 * Handles individual site toggle changes
 * Optimized to update only the changed site
 * Includes error handling and validation
 */
function setupSiteToggles(): void {
    elements.siteToggles.forEach((toggle: HTMLInputElement): void => {
        toggle.addEventListener('change', (): void => {
            const site = toggle.dataset.site as keyof EnabledSites;
            if (!site) {
                console.warn('[Anti-Doom Scroll] Invalid site toggle:', toggle);
                return;
            }

            // Get current settings and update only the changed site
            chrome.storage.sync.get(['enabledSites'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('[Anti-Doom Scroll] Failed to get site settings:', chrome.runtime.lastError);
                    return;
                }

                const enabledSites = normalizeEnabledSites(result.enabledSites);
                enabledSites[site] = toggle.checked;

                chrome.storage.sync.set({ enabledSites }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[Anti-Doom Scroll] Failed to update site settings:', chrome.runtime.lastError);
                        // Revert toggle on error
                        toggle.checked = !toggle.checked;
                    }
                });
            });
        });
    });
}

/**
 * Handles time limit input changes
 * Validates input and includes error handling
 */
function handleTimeLimitChange(): void {
    const timeLimit = Math.max(0, parseInt(elements.timeLimitInput.value) || 0);
    // Update input to reflect validated value
    elements.timeLimitInput.value = String(timeLimit);

    chrome.storage.sync.set({ timeLimit }, () => {
        if (chrome.runtime.lastError) {
            console.error('[Anti-Doom Scroll] Failed to update time limit:', chrome.runtime.lastError);
        }
    });
}

/**
 * Handles break interval input changes
 * Validates input and includes error handling
 */
function handleBreakIntervalChange(): void {
    const breakInterval = Math.max(0, parseInt(elements.breakIntervalInput.value) || 0);
    // Update input to reflect validated value
    elements.breakIntervalInput.value = String(breakInterval);

    chrome.storage.sync.set({ breakInterval }, () => {
        if (chrome.runtime.lastError) {
            console.error('[Anti-Doom Scroll] Failed to update break interval:', chrome.runtime.lastError);
        }
    });
}

/**
 * Handles sound toggle changes
 * Includes error handling for storage operations
 */
function handleSoundToggle(): void {
    const soundEnabled = elements.soundToggle.checked;
    chrome.storage.sync.set({ soundEnabled }, () => {
        if (chrome.runtime.lastError) {
            console.error('[Anti-Doom Scroll] Failed to update sound setting:', chrome.runtime.lastError);
            // Revert toggle on error
            elements.soundToggle.checked = !soundEnabled;
        }
    });
}

// ============================================
// Analytics Display
// ============================================

/**
 * Displays analytics data in the popup
 * Shows only today's usage statistics
 * Improved with better empty state handling
 * @param analytics - Analytics data object
 */
function displayAnalytics(analytics: Analytics): void {
    const today = new Date().toDateString();
    const todayData = analytics[today];

    // Clear analytics if no data for today
    if (!todayData || Object.keys(todayData).length === 0) {
        elements.analyticsContainer.innerHTML = '<div style="text-align: center; opacity: 0.7; font-size: 13px;">No usage data yet today</div>';
        return;
    }

    // Build HTML for analytics items (sorted by time descending)
    const analyticsItems = Object.entries(todayData)
        .filter(([_, minutes]) => minutes > 0)
        .sort(([_, a], [__, b]) => b - a) // Sort by time spent descending
        .map(([site, minutes]) => {
            const capitalizedSite = site.charAt(0).toUpperCase() + site.slice(1);
            return `
        <div class="analytics-item">
          <span class="analytics-site">${capitalizedSite}</span>
          <span class="analytics-time">${minutes} min</span>
        </div>
      `;
        })
        .join('');

    // Update container with content or show empty state
    if (analyticsItems) {
        elements.analyticsContainer.innerHTML = analyticsItems;
    } else {
        elements.analyticsContainer.innerHTML = '<div style="text-align: center; opacity: 0.7; font-size: 13px;">No usage data yet today</div>';
    }
}

// ============================================
// Storage Listener - Real-time Updates
// ============================================

/**
 * Listens for storage changes and updates UI reactively
 * More efficient than polling every second
 * Includes proper error handling
 */
function setupStorageListener(): void {
    chrome.storage.onChanged.addListener((changes) => {
        // Update blocked count if changed
        if (changes.blockedCount) {
            updateBlockedCount(safeNumber(changes.blockedCount.newValue));
        }

        // Update analytics display if changed
        if (changes.analytics) {
            displayAnalytics(safeAnalytics(changes.analytics.newValue));
        }

        // Update enabled toggle if changed externally
        if (changes.enabled) {
            elements.toggle.checked = safeBoolean(changes.enabled.newValue, true);
        }

        // Update site toggles if changed externally
        if (changes.enabledSites) {
            const enabledSites = normalizeEnabledSites(changes.enabledSites.newValue);
            elements.siteToggles.forEach(toggle => {
                const site = toggle.dataset.site as keyof EnabledSites;
                if (site && site in enabledSites) {
                    toggle.checked = enabledSites[site] !== false;
                }
            });
        }
    });
}

// ============================================
// Daily Reset Check
// ============================================

/**
 * Checks if daily reset is needed
 * Ensures counter resets at midnight
 * Includes error handling
 */
function checkDailyReset(): void {
    const today = new Date().toDateString();
    chrome.storage.sync.get(['lastResetDate'], (result): void => {
        if (chrome.runtime.lastError) {
            console.error('[Anti-Doom Scroll] Failed to check daily reset:', chrome.runtime.lastError);
            return;
        }

        if (result.lastResetDate !== today) {
            chrome.storage.sync.set({
                blockedCount: 0,
                lastResetDate: today
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('[Anti-Doom Scroll] Failed to perform daily reset:', chrome.runtime.lastError);
                }
            });
        }
    });
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize popup when DOM is ready
 */
function init(): void {
    // Load current settings
    loadSettings();

    // Setup event listeners
    elements.toggle.addEventListener('change', handleMainToggle);
    elements.timeLimitInput.addEventListener('change', handleTimeLimitChange);
    elements.breakIntervalInput.addEventListener('change', handleBreakIntervalChange);
    elements.soundToggle.addEventListener('change', handleSoundToggle);

    // Setup site toggles
    setupSiteToggles();

    // Setup real-time storage listener (replaces polling)
    setupStorageListener();

    // Check for daily reset
    checkDailyReset();

    console.log('[Anti-Doom Scroll] Popup initialized');
}

// Run initialization
init();
