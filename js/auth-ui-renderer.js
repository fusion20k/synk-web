/**
 * Dynamic Auth UI Renderer
 * Renders authentication UI (login/signup buttons or user dropdown) based on auth state
 * Works with AuthStateManager to provide real-time UI updates
 */

class AuthUIRenderer {
    constructor() {
        this.container = null;
        this.currentState = null;
    }

    /**
     * Initialize the renderer with the container element
     */
    initialize(containerId = 'auth-section-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`Auth container with ID "${containerId}" not found`);
            return false;
        }

        // Listen for auth state changes
        window.addEventListener('auth-state-changed', (e) => {
            this.renderUI(e.detail);
        });

        // Initial render based on current auth state
        if (typeof authManager !== 'undefined') {
            const user = authManager.getCurrentUser();
            this.renderUI({
                status: user ? 'logged-in' : 'logged-out',
                user: user
            });
        }

        return true;
    }

    /**
     * Render UI based on auth state
     */
    renderUI(authState) {
        if (!this.container) return;

        this.currentState = authState;

        // Clear container
        this.container.innerHTML = '';

        if (authState.status === 'logged-in' && authState.user) {
            this.renderLoggedInUI(authState.user);
        } else {
            this.renderLoggedOutUI();
        }
    }

    /**
     * Render logged-out UI (Login and Sign Up buttons)
     */
    renderLoggedOutUI() {
        const html = `
            <div class="auth-buttons">
                <a href="login.html" class="auth-btn login">Log In</a>
                <a href="signup.html" class="auth-btn signup">Sign Up</a>
            </div>
        `;

        this.container.innerHTML = html;
        this.container.classList.remove('logged-in');
        this.container.classList.add('logged-out');
    }

    /**
     * Render logged-in UI (User dropdown)
     */
    renderLoggedInUI(user) {
        const avatarChar = user.avatar || user.email?.charAt(0).toUpperCase() || 'U';

        const html = `
            <div class="user-dropdown active">
                <div class="user-avatar" id="user-avatar">${avatarChar}</div>
                <div class="dropdown-menu">
                    <div class="dropdown-header">
                        <div class="dropdown-email" id="user-email">${user.email}</div>
                    </div>
                    <a href="https://billing.stripe.com/p/login/7sYaEQaRD57SghT5hSbMQ00" class="dropdown-item" target="_blank">Manage Account</a>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item" id="logout-btn">Log Out</button>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.container.classList.remove('logged-out');
        this.container.classList.add('logged-in');

        // Setup dropdown functionality
        this.setupDropdownHandlers();
    }

    /**
     * Setup dropdown event handlers
     */
    setupDropdownHandlers() {
        const userAvatar = this.container.querySelector('#user-avatar');
        const userDropdown = this.container.querySelector('.user-dropdown');
        const logoutBtn = this.container.querySelector('#logout-btn');

        if (userAvatar) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown?.classList.toggle('open');
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (userDropdown && !userDropdown.contains(e.target) && e.target !== userAvatar) {
                userDropdown?.classList.remove('open');
            }
        });

        // Handle logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (typeof authManager !== 'undefined') {
                    authManager.logout();
                    // Redirect after a brief delay
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 300);
                }
            });
        }
    }

    /**
     * Get current rendered state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.currentState?.status === 'logged-in';
    }
}

// Create global instance
const authUIRenderer = new AuthUIRenderer();

/**
 * Initialize renderer when DOM is ready
 */
function initializeAuthUIRenderer() {
    // Wait for authManager to be available
    if (typeof authManager !== 'undefined') {
        authUIRenderer.initialize();
    } else {
        // Retry if authManager isn't loaded yet
        setTimeout(initializeAuthUIRenderer, 100);
    }
}

// Export for testing/external use
window.authUIRenderer = authUIRenderer;