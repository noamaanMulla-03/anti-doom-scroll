// ============================================
// Onboarding Script - First-Time Setup
// ============================================
// Responsibilities:
// 1. Guide users through initial setup
// 2. Collect site preferences
// 3. Configure time limits and features
// 4. Save settings and mark onboarding complete
// ============================================

import type { EnabledSites } from './types';
import { DEFAULT_ENABLED_SITES, DEFAULT_SETTINGS } from './types';

// ============================================
// State Management
// ============================================

/**
 * Onboarding state
 * Tracks current step and user selections
 */
const state = {
    currentStep: 1,
    totalSteps: 4,
    selectedSites: { ...DEFAULT_ENABLED_SITES } as EnabledSites
};

// ============================================
// DOM Utilities
// ============================================

/**
 * Gets step element by step number
 * @param step - Step number (1-4)
 * @returns Step DOM element
 */
function getStepElement(step: number): Element | null {
    return document.querySelector(`.step[data-step="${step}"]`);
}

/**
 * Gets all progress dots
 * @returns NodeList of progress dots
 */
function getProgressDots(): NodeListOf<HTMLElement> {
    return document.querySelectorAll<HTMLElement>('.dot');
}

// ============================================
// Progress Management
// ============================================

/**
 * Updates progress dots to reflect current step
 * Visual feedback for user navigation
 */
function updateProgressDots(): void {
    const dots = getProgressDots();
    dots.forEach((dot: HTMLElement, index: number): void => {
        if (index + 1 === state.currentStep) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

/**
 * Transitions between steps
 * @param fromStep - Current step number
 * @param toStep - Target step number
 */
function transitionStep(fromStep: number, toStep: number): void {
    // Hide current step
    const currentStepEl = getStepElement(fromStep);
    if (currentStepEl) {
        currentStepEl.classList.remove('active');
    }

    // Show next step
    const nextStepEl = getStepElement(toStep);
    if (nextStepEl) {
        nextStepEl.classList.add('active');
    }

    // Update progress indicator
    updateProgressDots();
}

// ============================================
// Navigation Functions
// ============================================

/**
 * Advances to next step
 * Validates step bounds
 */
function nextStep(): void {
    if (state.currentStep < state.totalSteps) {
        const previousStep = state.currentStep;
        state.currentStep++;
        transitionStep(previousStep, state.currentStep);
    }
}

/**
 * Returns to previous step
 * Validates step bounds
 */
function prevStep(): void {
    if (state.currentStep > 1) {
        const previousStep = state.currentStep;
        state.currentStep--;
        transitionStep(previousStep, state.currentStep);
    }
}

// ============================================
// Site Selection
// ============================================

/**
 * Sets up site card click handlers
 * Allows users to toggle sites they want to block
 */
function setupSiteSelection(): void {
    const siteCards = document.querySelectorAll<HTMLDivElement>('.site-card');

    siteCards.forEach((card: HTMLDivElement): void => {
        card.addEventListener('click', (): void => {
            const site = card.dataset.site as keyof EnabledSites;

            if (site) {
                // Toggle selection state
                card.classList.toggle('selected');
                state.selectedSites[site] = card.classList.contains('selected');
            }
        });
    });
}

// ============================================
// Settings Collection
// ============================================

/**
 * Collects all onboarding settings from form inputs
 * @returns Settings object ready for storage
 */
function collectSettings() {
    // Get input elements
    const timeLimitInput = document.getElementById('onboarding-timeLimit') as HTMLInputElement;
    const breakIntervalInput = document.getElementById('onboarding-breakInterval') as HTMLInputElement;
    const soundInput = document.getElementById('onboarding-sound') as HTMLInputElement;

    // Parse and validate inputs
    const timeLimit = parseInt(timeLimitInput?.value || '0') || 0;
    const breakInterval = parseInt(breakIntervalInput?.value || '0') || 0;
    const soundEnabled = soundInput?.checked || false;

    return {
        ...DEFAULT_SETTINGS,
        enabledSites: state.selectedSites,
        timeLimit,
        breakInterval,
        soundEnabled,
        onboardingCompleted: true,
        lastResetDate: new Date().toDateString(),
        analytics: {}
    };
}

/**
 * Completes onboarding process
 * Saves settings and closes tab
 */
function finish(): void {
    const settings = collectSettings();

    // Save all settings to storage
    chrome.storage.sync.set(settings, () => {
        console.log('[Anti-Doom Scroll] Onboarding completed successfully');

        // Close onboarding tab
        window.close();
    });
}

// ============================================
// Button Handler Setup
// ============================================

/**
 * Sets up navigation button click handlers
 * Scans document for buttons and attaches appropriate handlers
 */
function setupNavigationButtons(): void {
    // Next buttons
    document.querySelectorAll<HTMLButtonElement>('.btn-next').forEach(btn => {
        btn.addEventListener('click', nextStep);
    });

    // Back buttons
    document.querySelectorAll<HTMLButtonElement>('.btn-back').forEach(btn => {
        btn.addEventListener('click', prevStep);
    });

    // Finish button
    const finishBtn = document.querySelector<HTMLButtonElement>('.btn-finish');
    if (finishBtn) {
        finishBtn.addEventListener('click', finish);
    }
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize onboarding when DOM is ready
 */
function init(): void {
    // Setup site selection handlers
    setupSiteSelection();

    // Setup navigation button handlers
    setupNavigationButtons();

    // Initialize progress dots
    updateProgressDots();

    console.log('[Anti-Doom Scroll] Onboarding initialized');
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);
