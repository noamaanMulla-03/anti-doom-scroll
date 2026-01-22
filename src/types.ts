// Type definitions for Anti-Doom Scroll extension

// ============================================
// Core Interfaces
// ============================================

export interface EnabledSites {
    instagram: boolean;
    tiktok: boolean;
    youtube: boolean;
    facebook: boolean;
    twitter: boolean;
    reddit: boolean;
}

export type SiteName = keyof EnabledSites;

// ============================================
// Constants - Default Values
// ============================================

export const DEFAULT_ENABLED_SITES: EnabledSites = {
    instagram: true,
    tiktok: true,
    youtube: true,
    facebook: true,
    twitter: true,
    reddit: true
};

export const DEFAULT_SETTINGS = {
    enabled: true,
    timeLimit: 0,
    breakInterval: 0,
    soundEnabled: false,
    blockedCount: 0
} as const;

// Snooze duration in milliseconds (5 minutes)
export const SNOOZE_DURATION = 5 * 60 * 1000;

// Analytics retention period in days
export const ANALYTICS_RETENTION_DAYS = 7;

// Session tracking update interval in milliseconds (1 minute)
export const SESSION_UPDATE_INTERVAL = 60000;

export interface Settings {
    enabled: boolean;
    enabledSites: EnabledSites;
    timeLimit: number;
    breakInterval: number;
    soundEnabled: boolean;
    blockedCount: number;
    lastResetDate: string;
    analytics: Analytics;
    onboardingCompleted?: boolean;
}

export interface Analytics {
    [date: string]: {
        [site: string]: number; // minutes spent
    };
}

export interface StorageResult {
    enabled?: boolean;
    enabledSites?: EnabledSites;
    timeLimit?: number;
    breakInterval?: number;
    soundEnabled?: boolean;
    blockedCount?: number;
    lastResetDate?: string;
    analytics?: Analytics;
    onboardingCompleted?: boolean;
}

export interface StorageChanges {
    enabled?: chrome.storage.StorageChange;
    enabledSites?: chrome.storage.StorageChange;
    timeLimit?: chrome.storage.StorageChange;
    breakInterval?: chrome.storage.StorageChange;
    soundEnabled?: chrome.storage.StorageChange;
    blockedCount?: chrome.storage.StorageChange;
}

export interface MessageType {
    type: 'blockAttempt' | 'updateAnalytics';
    site?: string;
    duration?: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Safely extracts a number from storage result
 * @param value - The value from storage that might be a number
 * @param defaultValue - Default value if conversion fails
 * @returns The number value or default
 */
export function safeNumber(value: unknown, defaultValue: number = 0): number {
    return typeof value === 'number' ? value : defaultValue;
}

/**
 * Safely extracts a boolean from storage result
 * @param value - The value from storage that might be a boolean
 * @param defaultValue - Default value if conversion fails
 * @returns The boolean value or default
 */
export function safeBoolean(value: unknown, defaultValue: boolean = false): boolean {
    return typeof value === 'boolean' ? value : defaultValue;
}

/**
 * Merges enabled sites with defaults to ensure all sites have values
 * @param sites - Partial enabled sites object from storage (unknown type from chrome.storage)
 * @returns Complete enabled sites object
 */
export function normalizeEnabledSites(sites: unknown): EnabledSites {
    if (sites && typeof sites === 'object') {
        return { ...DEFAULT_ENABLED_SITES, ...(sites as Partial<EnabledSites>) };
    }
    return { ...DEFAULT_ENABLED_SITES };
}

/**
 * Extracts analytics from storage with type safety
 * @param value - The analytics value from storage
 * @returns Typed analytics object
 */
export function safeAnalytics(value: unknown): Analytics {
    return (value && typeof value === 'object' ? value : {}) as Analytics;
}

// ============================================
// Browser Compatibility
// ============================================

// Declare webkitAudioContext for older browsers
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}

