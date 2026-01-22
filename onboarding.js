// Onboarding script
let currentStep = 1;
const totalSteps = 4;

// Site selection state
const selectedSites = {
  instagram: true,
  tiktok: true,
  youtube: true,
  facebook: true,
  twitter: true,
  reddit: true
};

// Initialize site card click handlers
document.addEventListener('DOMContentLoaded', () => {
  const siteCards = document.querySelectorAll('.site-card');
  siteCards.forEach(card => {
    card.addEventListener('click', () => {
      const site = card.dataset.site;
      card.classList.toggle('selected');
      selectedSites[site] = card.classList.contains('selected');
    });
  });
});

function nextStep() {
  if (currentStep < totalSteps) {
    // Hide current step
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
    
    // Update step
    currentStep++;
    
    // Show next step
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    
    // Update progress dots
    updateProgressDots();
  }
}

function prevStep() {
  if (currentStep > 1) {
    // Hide current step
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
    
    // Update step
    currentStep--;
    
    // Show previous step
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    
    // Update progress dots
    updateProgressDots();
  }
}

function updateProgressDots() {
  const dots = document.querySelectorAll('.dot');
  dots.forEach((dot, index) => {
    if (index + 1 === currentStep) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function finish() {
  // Get settings from onboarding
  const timeLimit = parseInt(document.getElementById('onboarding-timeLimit').value) || 0;
  const breakInterval = parseInt(document.getElementById('onboarding-breakInterval').value) || 0;
  const soundEnabled = document.getElementById('onboarding-sound').checked;

  // Save all settings to storage
  chrome.storage.sync.set({
    enabled: true,
    enabledSites: selectedSites,
    timeLimit: timeLimit,
    breakInterval: breakInterval,
    soundEnabled: soundEnabled,
    onboardingCompleted: true,
    blockedCount: 0,
    lastResetDate: new Date().toDateString()
  }, () => {
    // Close onboarding tab
    window.close();
  });
}
