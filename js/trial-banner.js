/**
 * Trial Banner Component
 * Displays trial status and upgrade options in account dashboard
 */

class TrialBanner {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.dismissalKey = 'synk_trial_banner_dismissed';
    }

    /**
     * Initialize banner - fetch status and render
     */
    async init() {
        if (!this.container) {
            console.error('[TrialBanner] Container not found:', this.containerId);
            return;
        }

        // Check if banner was dismissed this session
        if (this.isDismissed()) {
            console.log('[TrialBanner] Banner dismissed this session');
            return;
        }

        try {
            const status = await this.fetchTrialStatus();
            this.render(status);
            this.attachEventListeners();
        } catch (error) {
            console.error('[TrialBanner] Failed to initialize:', error);
            this.renderError();
        }
    }

    /**
     * Fetch trial status from backend
     */
    async fetchTrialStatus() {
        const token = localStorage.getItem('synk_auth_token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('https://synk-web.onrender.com/api/user/trial-status', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[TrialBanner] Trial status fetched:', data);
        return data;
    }

    /**
     * Render banner based on status
     */
    render(status) {
        const { plan, can_access_pro_features, days_remaining, reason } = status;

        let message = '';
        let showUpgradeButton = false;
        let bannerClass = '';

        if (plan === 'trial' && can_access_pro_features) {
            // Active trial
            const daysText = days_remaining === 1 ? '1 day' : `${days_remaining} days`;
            message = `⏰ Pro Trial: ${daysText} remaining. Upgrade to keep automatic sync.`;
            showUpgradeButton = true;
            bannerClass = 'active-trial';
            
        } else if (plan === 'free' && !can_access_pro_features) {
            // Free plan (trial expired or never had one)
            message = `💡 You're on the Free plan (manual sync). Upgrade for automatic sync.`;
            showUpgradeButton = true;
            bannerClass = 'expired-trial';
            
        } else if (plan === 'pro' && reason === 'paid') {
            // Paid Pro user
            message = `✅ Pro plan active. Thank you for upgrading!`;
            showUpgradeButton = false;
            bannerClass = 'pro-user';
        } else {
            // Unknown state - show generic message
            message = `ℹ️ Plan: ${plan}`;
            showUpgradeButton = true;
            bannerClass = '';
        }

        // Update banner HTML
        this.container.className = `trial-banner ${bannerClass}`;
        this.container.style.display = 'flex';

        const upgradeButtonHTML = showUpgradeButton 
            ? `<button id="upgrade-button" class="banner-btn">Upgrade to Pro</button>`
            : '';

        this.container.innerHTML = `
            <div class="banner-content">
                <span id="trial-message">${message}</span>
                ${upgradeButtonHTML}
                <button id="dismiss-banner" class="banner-close" aria-label="Dismiss banner">×</button>
            </div>
        `;

        console.log('[TrialBanner] Rendered:', { plan, message, showUpgradeButton });
    }

    /**
     * Render error state
     */
    renderError() {
        this.container.className = 'trial-banner';
        this.container.style.display = 'flex';
        this.container.innerHTML = `
            <div class="banner-content">
                <span id="trial-message">⚠️ Unable to load trial status. Please refresh the page.</span>
                <button id="dismiss-banner" class="banner-close" aria-label="Dismiss banner">×</button>
            </div>
        `;
    }

    /**
     * Attach event listeners to banner buttons
     */
    attachEventListeners() {
        // Upgrade button
        const upgradeButton = document.getElementById('upgrade-button');
        if (upgradeButton) {
            upgradeButton.addEventListener('click', () => this.handleUpgrade());
        }

        // Dismiss button
        const dismissButton = document.getElementById('dismiss-banner');
        if (dismissButton) {
            dismissButton.addEventListener('click', () => this.dismiss());
        }
    }

    /**
     * Handle upgrade button click
     */
    async handleUpgrade() {
        console.log('[TrialBanner] Upgrade button clicked');

        try {
            // Check if authManager is available
            if (!window.authManager || typeof window.authManager.initiateUpgrade !== 'function') {
                throw new Error('Auth manager not available');
            }

            // Stripe Pro Monthly price ID
            const priceId = 'price_1SPX9O2VdGqzvJRLf8nDpT0d';
            const successUrl = `${window.location.origin}/upgrade-success.html`;
            const cancelUrl = `${window.location.origin}/dashboard.html`;

            // Initiate upgrade (will redirect to Stripe Checkout)
            const checkoutUrl = await window.authManager.initiateUpgrade(priceId, successUrl, cancelUrl);
            
            console.log('[TrialBanner] Redirecting to Stripe Checkout:', checkoutUrl);
            window.location.href = checkoutUrl;

        } catch (error) {
            console.error('[TrialBanner] Upgrade failed:', error);
            alert('Unable to start upgrade process. Please try again or contact support.');
        }
    }

    /**
     * Dismiss banner for this session
     */
    dismiss() {
        console.log('[TrialBanner] Banner dismissed');
        
        // Store dismissal in sessionStorage (only for this session)
        sessionStorage.setItem(this.dismissalKey, 'true');
        
        // Hide banner with animation
        this.container.style.opacity = '0';
        setTimeout(() => {
            this.container.style.display = 'none';
        }, 300);
    }

    /**
     * Check if banner was dismissed this session
     */
    isDismissed() {
        return sessionStorage.getItem(this.dismissalKey) === 'true';
    }

    /**
     * Clear dismissal state (useful for testing)
     */
    clearDismissal() {
        sessionStorage.removeItem(this.dismissalKey);
        console.log('[TrialBanner] Dismissal state cleared');
    }
}

// Auto-initialize if on account page
if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('account.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const banner = new TrialBanner('trial-banner');
        await banner.init();
        
        // Expose to window for debugging
        window.trialBanner = banner;
    });
}
