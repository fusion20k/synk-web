/**
 * Onboarding Flow Manager
 * Handles step navigation and trial setup
 */

let currentStep = 1;
const totalSteps = 4;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async function() {
    checkAuth();
    await loadTrialDate();
});

/**
 * Check if user is authenticated, redirect to login if not
 */
function checkAuth() {
    const token = localStorage.getItem('synk_auth_token');
    if (!token) {
        console.log('[Onboarding] No auth token found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }
    console.log('[Onboarding] User authenticated');
}

/**
 * Load trial end date from backend
 */
async function loadTrialDate() {
    const token = localStorage.getItem('synk_auth_token');
    if (!token) return;

    try {
        const response = await fetch('https://synk-web.onrender.com/api/user/trial-status', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch trial status');
        }

        const data = await response.json();
        
        // Format trial end date
        let trialEndDate = 'Unknown';
        if (data.trial_ends_at) {
            const endDate = new Date(data.trial_ends_at);
            trialEndDate = endDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } else {
            // Fallback: assume 7 days from now
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 7);
            trialEndDate = endDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }

        // Update all trial date displays
        const dateElements = document.querySelectorAll('#trial-end-date, #final-trial-date');
        dateElements.forEach(el => {
            if (el) el.textContent = trialEndDate;
        });

        console.log('[Onboarding] Trial end date loaded:', trialEndDate);

    } catch (error) {
        console.error('[Onboarding] Failed to load trial date:', error);
        
        // Fallback to 7 days from now
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + 7);
        const fallbackString = fallbackDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const dateElements = document.querySelectorAll('#trial-end-date, #final-trial-date');
        dateElements.forEach(el => {
            if (el) el.textContent = fallbackString;
        });
    }
}

/**
 * Navigate to next step
 */
function nextStep() {
    if (currentStep < totalSteps) {
        goToStep(currentStep + 1);
    }
}

/**
 * Navigate to previous step
 */
function prevStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

/**
 * Go to specific step
 */
function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > totalSteps) return;

    // Update current step
    currentStep = stepNumber;

    // Hide all steps
    document.querySelectorAll('.onboarding-step').forEach(step => {
        step.classList.remove('active');
    });

    // Show target step
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }

    // Update progress bar
    updateProgressBar();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    console.log('[Onboarding] Moved to step', stepNumber);
}

/**
 * Update progress bar visual state
 */
function updateProgressBar() {
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressLines = document.querySelectorAll('.progress-line');

    progressSteps.forEach((step, index) => {
        const stepNum = index + 1;
        
        if (stepNum < currentStep) {
            // Completed step
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNum === currentStep) {
            // Active step
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            // Future step
            step.classList.remove('active', 'completed');
        }
    });

    progressLines.forEach((line, index) => {
        if (index < currentStep - 1) {
            line.classList.add('completed');
        } else {
            line.classList.remove('completed');
        }
    });
}

/**
 * Connect Google Calendar
 * TODO: Implement actual OAuth flow
 */
function connectGoogleCalendar() {
    console.log('[Onboarding] Connecting Google Calendar...');
    
    // Placeholder: In production, this would trigger OAuth
    alert('Google Calendar OAuth integration will be implemented here.\n\nFor now, continuing to next step...');
    
    // Move to next step
    nextStep();
}

/**
 * Connect Notion
 * TODO: Implement actual OAuth flow
 */
function connectNotion() {
    console.log('[Onboarding] Connecting Notion...');
    
    // Placeholder: In production, this would trigger OAuth
    alert('Notion OAuth integration will be implemented here.\n\nFor now, completing onboarding...');
    
    // Move to completion step
    goToStep(4);
}

/**
 * Complete onboarding and go to dashboard
 */
function completeOnboarding() {
    console.log('[Onboarding] Onboarding completed');
    window.location.href = 'dashboard.html';
}

/**
 * Skip onboarding and go to dashboard
 */
function skipOnboarding() {
    console.log('[Onboarding] User skipped onboarding');
    window.location.href = 'dashboard.html';
}

// Initialize progress bar on load
updateProgressBar();
