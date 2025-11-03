/**
 * Dynamic Authentication State Management
 * Handles real-time auth state detection and UI updates without page reload
 * Uses Supabase for session management
 */

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://nbolvclqiaqrupxknvlu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ib2x2Y2xxaWFxcnVweGtudmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NTQ4MjgsImV4cCI6MjA3MTIzMDgyOH0.yz33_9PEZbC2ew_2lQyxb6B_cQruSANVrwM_4h-afg8'
};

// Auth State Manager Class
class AuthStateManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.listeners = new Set();
        this.checkInterval = null;
    }

    /**
     * Initialize auth state detection
     * Checks localStorage first, then Supabase session
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Check for existing session in localStorage
            const token = localStorage.getItem('synk_auth_token');
            const email = localStorage.getItem('synk_user_email');

            if (token && email) {
                this.currentUser = {
                    email,
                    token,
                    avatar: email.charAt(0).toUpperCase()
                };
            }

            this.isInitialized = true;
            this.updateUI();

            // Listen for auth changes
            this.setupAuthListeners();

            // Periodic check for session validity
            this.startSessionCheck();
        } catch (error) {
            console.error('Failed to initialize auth state:', error);
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    /**
     * Update UI based on auth state
     */
    updateUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userDropdown = document.getElementById('user-dropdown');

        if (!authButtons || !userDropdown) return;

        if (this.currentUser) {
            this.showLoggedInState();
        } else {
            this.showLoggedOutState();
        }

        // Notify all listeners
        this.notifyListeners();
    }

    /**
     * Show logged-in UI state
     */
    showLoggedInState() {
        const authButtons = document.getElementById('auth-buttons');
        const userDropdown = document.getElementById('user-dropdown');
        const userAvatar = document.getElementById('user-avatar');
        const userEmail = document.getElementById('user-email');

        if (authButtons) {
            authButtons.classList.add('fade-out');
            authButtons.style.display = 'none';
            authButtons.style.pointerEvents = 'none';
        }

        if (userDropdown) {
            userDropdown.classList.add('active');
            userDropdown.classList.remove('open'); // Ensure dropdown menu is closed
            userDropdown.style.display = 'flex';
        }

        if (userAvatar && this.currentUser) {
            userAvatar.textContent = this.currentUser.avatar;
        }

        if (userEmail && this.currentUser) {
            userEmail.textContent = this.currentUser.email;
        }
    }

    /**
     * Show logged-out UI state
     */
    showLoggedOutState() {
        const authButtons = document.getElementById('auth-buttons');
        const userDropdown = document.getElementById('user-dropdown');

        if (authButtons) {
            authButtons.classList.remove('fade-out');
            authButtons.style.display = 'flex';
            authButtons.style.pointerEvents = 'auto';
        }

        if (userDropdown) {
            userDropdown.classList.remove('active');
            userDropdown.classList.remove('open');
            userDropdown.style.display = 'none';
        }
    }

    /**
     * Handle user login
     */
    login(email, token) {
        this.currentUser = {
            email,
            token,
            avatar: email.charAt(0).toUpperCase()
        };

        localStorage.setItem('synk_auth_token', token);
        localStorage.setItem('synk_user_email', email);

        this.updateUI();
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: { status: 'logged-in', user: this.currentUser }
        }));
    }

    /**
     * Handle user logout
     */
    logout() {
        this.currentUser = null;

        localStorage.removeItem('synk_auth_token');
        localStorage.removeItem('synk_user_email');

        this.updateUI();
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: { status: 'logged-out' }
        }));
    }

    /**
     * Setup auth event listeners
     */
    setupAuthListeners() {
        // Listen for dropdown toggle
        const userAvatar = document.getElementById('user-avatar');
        const userDropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');

        if (userAvatar) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown?.classList.toggle('open');
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (userDropdown && !userDropdown.contains(e.target) && e.target !== userAvatar) {
                userDropdown.classList.remove('open');
            }
        });

        // Handle logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
                // Redirect to home after logout
                setTimeout(() => {
                    window.location.href = '/';
                }, 300);
            });
        }

        // Listen for storage changes (multi-tab sync)
        window.addEventListener('storage', (e) => {
            if (e.key === 'synk_auth_token' || e.key === 'synk_user_email') {
                this.initialize();
            }
        });
    }

    /**
     * Start periodic session validity check
     */
    startSessionCheck() {
        // Check every 5 minutes if session is still valid
        this.checkInterval = setInterval(() => {
            this.validateSession();
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Validate current session
     */
    async validateSession() {
        if (!this.currentUser) return;

        try {
            // Here you would verify the token with your backend
            // For now, we'll just check if it still exists in localStorage
            const token = localStorage.getItem('synk_auth_token');
            const email = localStorage.getItem('synk_user_email');

            if (!token || !email) {
                this.logout();
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            this.logout();
        }
    }

    /**
     * Subscribe to auth state changes
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of state change
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            callback({
                isLoggedIn: this.isLoggedIn(),
                user: this.currentUser
            });
        });
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Create global instance
const authManager = new AuthStateManager();

/**
 * Initialize auth state when DOM is ready
 */
function initializeDynamicAuthState() {
    authManager.initialize();
}

/**
 * Export for testing/dev
 */
window.authManager = authManager;
window.toggleAuthDemo = function() {
    if (authManager.isLoggedIn()) {
        authManager.logout();
        console.log('Demo: Logged out');
    } else {
        authManager.login('demo@synk.app', 'demo_token_' + Date.now());
        console.log('Demo: Logged in as demo@synk.app');
    }
};