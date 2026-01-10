/**
 * Upgrade Success Page
 * Handles countdown timer and auto-redirect to dashboard
 */

let countdown = 5;
let countdownInterval = null;

/**
 * Initialize countdown on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[UpgradeSuccess] Page loaded, starting countdown');
    
    const countdownElement = document.getElementById('countdown');
    
    if (!countdownElement) {
        console.error('[UpgradeSuccess] Countdown element not found');
        return;
    }

    // Start countdown
    countdownInterval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;
        
        console.log('[UpgradeSuccess] Countdown:', countdown);

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            redirectToDashboard();
        }
    }, 1000);

    // Allow manual redirect by clicking the button
    const dashboardButton = document.querySelector('a[href="account.html"]');
    if (dashboardButton) {
        dashboardButton.addEventListener('click', (e) => {
            e.preventDefault();
            clearInterval(countdownInterval);
            redirectToDashboard();
        });
    }
});

/**
 * Redirect to account dashboard
 */
function redirectToDashboard() {
    console.log('[UpgradeSuccess] Redirecting to dashboard...');
    window.location.href = 'account.html';
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
});
