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
        // Update main toggle
        elements.toggle.checked = safeBoolean(result.enabled, true);

        // Update blocked count display
        updateBlockedCount(safeNumber(result.blockedCount));

        // Update input fields
        elements.timeLimitInput.value = String(safeNumber(result.timeLimit));
        elements.breakIntervalInput.value = String(safeNumber(result.breakInterval));
        elements.soundToggle.checked = safeBoolean(result.soundEnabled);

        // Update site-specific toggles
        const enabledSites = normalizeEnabledSites(result.enabledSites);
        elements.siteToggles.forEach(toggle => {
            const site = toggle.dataset.site as keyof EnabledSites;
            if (site) {
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
 */
function handleMainToggle(): void {
    const enabled = elements.toggle.checked;
    chrome.storage.sync.set({ enabled });
}

/**
 * Handles individual site toggle changes
 * Optimized to update only the changed site
 */
function setupSiteToggles(): void {
    elements.siteToggles.forEach((toggle: HTMLInputElement): void => {
        toggle.addEventListener('change', (): void => {
            const site = toggle.dataset.site as keyof EnabledSites;
            if (!site) return;

            // Get current settings and update only the changed site
            chrome.storage.sync.get(['enabledSites'], (result) => {
                const enabledSites = normalizeEnabledSites(result.enabledSites);
                enabledSites[site] = toggle.checked;
                chrome.storage.sync.set({ enabledSites });
            });
        });
    });
}

/**
 * Handles time limit input changes
 */
function handleTimeLimitChange(): void {
    const timeLimit = parseInt(elements.timeLimitInput.value) || 0;
    chrome.storage.sync.set({ timeLimit });
}

/**
 * Handles break interval input changes
 */
function handleBreakIntervalChange(): void {
    const breakInterval = parseInt(elements.breakIntervalInput.value) || 0;
    chrome.storage.sync.set({ breakInterval });
}

/**
 * Handles sound toggle changes
 */
function handleSoundToggle(): void {
    const soundEnabled = elements.soundToggle.checked;
    chrome.storage.sync.set({ soundEnabled });
}

// ============================================
// Analytics Display
// ============================================

/**
 * Displays analytics data in the popup
 * Shows only today's usage statistics
 * @param analytics - Analytics data object
 */
function displayAnalytics(analytics: Analytics): void {
    const today = new Date().toDateString();
    const todayData = analytics[today];

    // Clear analytics if no data for today
    if (!todayData || Object.keys(todayData).length === 0) {
        elements.analyticsContainer.innerHTML = '';
        return;
    }

    // Build HTML for analytics items
    const analyticsItems = Object.entries(todayData)
        .filter(([_, minutes]) => minutes > 0)
        .map(([site, minutes]) => `
      <div class="analytics-item">
        <span class="analytics-site">${site}</span>
        <span class="analytics-time">${minutes} min</span>
      </div>
    `)
        .join('');

    // Update container only if there's content
    if (analyticsItems) {
        elements.analyticsContainer.innerHTML = analyticsItems;
    }
}

// ============================================
// Storage Listener - Real-time Updates
// ============================================

/**
 * Listens for storage changes and updates UI reactively
 * More efficient than polling every second
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
    });
}

// ============================================
// Daily Reset Check
// ============================================

/**
 * Checks if daily reset is needed
 * Ensures counter resets at midnight
 */
function checkDailyReset(): void {
    const today = new Date().toDateString();
    chrome.storage.sync.get(['lastResetDate'], (result): void => {
        if (result.lastResetDate !== today) {
            chrome.storage.sync.set({
                blockedCount: 0,
                lastResetDate: today
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
