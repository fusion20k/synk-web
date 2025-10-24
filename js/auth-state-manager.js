/**
 * Auth State Manager
 * Handles real-time authentication state management across all pages
 * - Checks user authentication status on page load
 * - Listens for real-time auth state changes (login/logout)
 * - Dynamically updates the auth section in header
 * - Manages both Supabase auth and localStorage fallback
 */

(function(window) {
    'use strict';

    /**
     * Auth State Manager Class
     * Manages all authentication state across the application
     */
    class AuthStateManager {
        constructor() {
            this.authContainer = null;
            this.supabaseClient = null;
            this.currentUser = null;
            this.isInitialized = false;
            this.authUnsubscribe = null;
            this.dropdownClickHandler = null;  // Store click-outside handler
            this.isLoggingOut = false;  // Prevent double logout

            // Initialize on creation
            this.init();
        }

        /**
         * Initialize the auth state manager
         * Waits for Supabase client and sets up listeners
         */
        async init() {
            try {
                // Get the auth container element
                this.authContainer = document.getElementById('auth-section-container');
                if (!this.authContainer) {
                    console.warn('[Auth State Manager] auth-section-container not found on this page');
                    return;
                }

                // Wait for Supabase client to be available
                await this.waitForSupabaseClient();

                // Check current auth status
                await this.checkAuthStatus();

                // Set up real-time auth state listener
                this.setupAuthListener();

                this.isInitialized = true;
                console.log('[Auth State Manager] Initialized successfully');

                // Dispatch initialization event
                window.dispatchEvent(new CustomEvent('auth-state-manager-ready', {
                    detail: { authManager: this }
                }));
            } catch (error) {
                console.error('[Auth State Manager] Initialization error:', error);
            }
        }

        /**
         * Wait for Supabase client to be available
         * Retries with exponential backoff
         */
        async waitForSupabaseClient(maxAttempts = 30, delayMs = 100) {
            return new Promise((resolve, reject) => {
                let attempts = 0;

                const checkClient = () => {
                    if (window.supabaseClient) {
                        this.supabaseClient = window.supabaseClient;
                        resolve(true);
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(checkClient, delayMs);
                    } else {
                        reject(new Error('Supabase client failed to load'));
                    }
                };

                checkClient();
            });
        }

        /**
         * Check current authentication status
         * Queries Supabase for current user, falls back to localStorage
         */
        async checkAuthStatus() {
            try {
                if (!this.supabaseClient) {
                    throw new Error('Supabase client not available');
                }

                // Get current user from Supabase
                const { data: { user }, error } = await this.supabaseClient.auth.getUser();

                if (error) {
                    console.warn('[Auth State Manager] Error fetching user:', error.message);
                    // Fall back to localStorage
                    this.checkLocalStorageAuth();
                } else if (user) {
                    // Supabase user found
                    this.currentUser = {
                        id: user.id,
                        email: user.email,
                        source: 'supabase'
                    };
                    this.renderLoggedIn(this.currentUser);
                } else {
                    // No user in Supabase, check localStorage fallback
                    this.checkLocalStorageAuth();
                }
            } catch (error) {
                console.error('[Auth State Manager] Error checking auth status:', error);
                // Fall back to localStorage
                this.checkLocalStorageAuth();
            }
        }

        /**
         * Check localStorage for auth token (fallback for custom backend)
         */
        checkLocalStorageAuth() {
            const token = localStorage.getItem('synk_auth_token');
            const email = localStorage.getItem('synk_user_email');

            if (token && email) {
                this.currentUser = {
                    email: email,
                    source: 'localStorage'
                };
                this.renderLoggedIn(this.currentUser);
            } else {
                this.currentUser = null;
                this.renderLoggedOut();
            }
        }

        /**
         * Set up real-time authentication state listener
         * Listens for Supabase auth changes
         */
        setupAuthListener() {
            try {
                if (!this.supabaseClient || !this.supabaseClient.auth) {
                    console.warn('[Auth State Manager] Cannot set up listener - Supabase auth not available');
                    return;
                }

                // Subscribe to auth state changes
                this.authUnsubscribe = this.supabaseClient.auth.onAuthStateChange(
                    (event, session) => {
                        console.log('[Auth State Manager] Auth state changed:', event);

                        if (event === 'SIGNED_IN' && session) {
                            // User logged in
                            this.currentUser = {
                                id: session.user.id,
                                email: session.user.email,
                                source: 'supabase'
                            };
                            this.renderLoggedIn(this.currentUser);
                            window.dispatchEvent(new CustomEvent('user-logged-in', {
                                detail: { user: this.currentUser }
                            }));
                        } else if (event === 'SIGNED_OUT') {
                            // User logged out
                            this.currentUser = null;
                            this.renderLoggedOut();
                            window.dispatchEvent(new CustomEvent('user-logged-out'));
                        }
                    }
                );
            } catch (error) {
                console.error('[Auth State Manager] Error setting up auth listener:', error);
            }
        }

        /**
         * Render logged-in UI
         * Shows user avatar with first initial and dropdown menu
         */
        renderLoggedIn(user) {
            if (!this.authContainer) return;

            const userEmail = user.email || 'User';
            const firstInitial = (userEmail.charAt(0) || 'U').toUpperCase();

            this.authContainer.innerHTML = `
                <div class="auth-section logged-in">
                    <div class="user-profile">
                        <button class="avatar-btn" id="avatar-btn" title="${userEmail}" aria-label="User menu">
                            <div class="avatar-circle">
                                ${firstInitial}
                            </div>
                        </button>
                        
                        <!-- Dropdown Menu -->
                        <div class="profile-dropdown" id="profile-dropdown" role="menu" aria-hidden="true">
                            <div class="dropdown-header">
                                <div class="dropdown-avatar">
                                    ${firstInitial}
                                </div>
                                <div class="dropdown-user-info">
                                    <p class="dropdown-email" title="${userEmail}">${userEmail}</p>
                                </div>
                            </div>
                            
                            <div class="dropdown-divider"></div>
                            
                            <div class="dropdown-menu">
                                <a href="account.html" class="dropdown-item" role="menuitem">
                                    <span class="dropdown-icon">⚙️</span>
                                    Manage Account
                                </a>
                                <button id="dropdown-logout-btn" class="dropdown-item logout-item" role="menuitem" type="button">
                                    <span class="dropdown-icon">🚪</span>
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing click-outside handler if present
            if (this.dropdownClickHandler) {
                document.removeEventListener('click', this.dropdownClickHandler);
            }

            // Setup event handlers
            const avatarBtn = this.authContainer.querySelector('#avatar-btn');
            const profileDropdown = this.authContainer.querySelector('#profile-dropdown');
            const dropdownLogoutBtn = this.authContainer.querySelector('#dropdown-logout-btn');
            
            if (avatarBtn && profileDropdown) {
                // Avatar button click handler - toggle dropdown
                avatarBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isVisible = profileDropdown.classList.contains('show');
                    profileDropdown.classList.toggle('show');
                    profileDropdown.setAttribute('aria-hidden', isVisible); // Update accessibility
                    console.log('[Auth State Manager] Dropdown toggled:', !isVisible);
                });
                
                // Create click-outside handler (stored for cleanup)
                this.dropdownClickHandler = (e) => {
                    if (!this.authContainer.contains(e.target)) {
                        profileDropdown.classList.remove('show');
                        profileDropdown.setAttribute('aria-hidden', 'true');
                        console.log('[Auth State Manager] Dropdown closed (click outside)');
                    }
                };
                
                // Add click-outside handler - only once
                document.addEventListener('click', this.dropdownClickHandler);
            }

            // Add dropdown menu item click handlers
            const manageAccountLink = this.authContainer.querySelector('a[href="account.html"]');
            if (manageAccountLink) {
                manageAccountLink.addEventListener('click', () => {
                    // Close dropdown when navigating to account
                    if (profileDropdown) {
                        profileDropdown.classList.remove('show');
                        profileDropdown.setAttribute('aria-hidden', 'true');
                    }
                });
            }

            // Add logout button handler
            if (dropdownLogoutBtn) {
                dropdownLogoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Prevent double logout
                    if (this.isLoggingOut) return;
                    
                    console.log('[Auth State Manager] Logout button clicked');
                    await this.handleLogout();
                });
            }

            console.log('[Auth State Manager] Rendered logged-in UI for:', userEmail);
        }

        /**
         * Render logged-out UI
         * Shows login and signup buttons
         */
        renderLoggedOut() {
            if (!this.authContainer) return;

            this.authContainer.innerHTML = `
                <div class="auth-section logged-out">
                    <a href="login.html" class="auth-btn login-btn">Log In</a>
                    <a href="signup.html" class="auth-btn signup-btn">Sign Up</a>
                </div>
            `;

            console.log('[Auth State Manager] Rendered logged-out UI');
        }

        /**
         * Handle logout action
         * Clears both Supabase and localStorage auth, updates UI, and redirects
         */
        async handleLogout() {
            try {
                // Prevent double logout
                if (this.isLoggingOut) {
                    console.log('[Auth State Manager] Logout already in progress');
                    return;
                }
                
                this.isLoggingOut = true;
                console.log('[Auth State Manager] Logout initiated...');

                // Show loading state on logout button
                const logoutBtn = this.authContainer.querySelector('#dropdown-logout-btn');
                if (logoutBtn) {
                    logoutBtn.disabled = true;
                    const originalContent = logoutBtn.innerHTML;
                    logoutBtn.innerHTML = '<span class="dropdown-icon">⏳</span>Logging out...';
                    logoutBtn.dataset.originalContent = originalContent;
                }

                // Attempt to sign out from Supabase
                if (this.supabaseClient && this.supabaseClient.auth) {
                    try {
                        const { error } = await this.supabaseClient.auth.signOut();
                        if (error) {
                            console.warn('[Auth State Manager] Supabase signout warning:', error.message);
                            // Continue even if Supabase signout fails
                        }
                    } catch (supabaseError) {
                        console.warn('[Auth State Manager] Supabase signout exception:', supabaseError.message);
                        // Continue with logout even if Supabase fails
                    }
                }

                // Clear localStorage tokens
                localStorage.removeItem('synk_auth_token');
                localStorage.removeItem('synk_user_email');
                localStorage.removeItem('synk_user_id');

                // Reset current user state
                this.currentUser = null;

                console.log('[Auth State Manager] Session cleared - rendering logged-out UI');

                // Render logged out UI
                this.renderLoggedOut();

                console.log('[Auth State Manager] Logout successful');

                // Dispatch logout event for other modules to react
                window.dispatchEvent(new CustomEvent('user-logged-out'));

                // Redirect to home page after a short delay (for protected/auth pages)
                setTimeout(() => {
                    const currentPagePath = window.location.pathname;
                    const currentPageName = currentPagePath.split('/').pop() || 'index.html';
                    
                    // List of pages that require authentication
                    const protectedPages = ['download.html', 'account.html'];
                    
                    if (protectedPages.includes(currentPageName) || currentPageName === '') {
                        console.log('[Auth State Manager] Redirecting from protected page to home');
                        window.location.href = 'index.html';
                    }
                }, 300);
                
            } catch (error) {
                console.error('[Auth State Manager] Logout error:', error);
                
                // Restore logout button to original state
                const logoutBtn = this.authContainer.querySelector('#dropdown-logout-btn');
                if (logoutBtn && logoutBtn.dataset.originalContent) {
                    logoutBtn.disabled = false;
                    logoutBtn.innerHTML = logoutBtn.dataset.originalContent;
                }

                // Show error notification (not blocking)
                console.error('Logout failed:', error.message);
                
            } finally {
                // Reset logout flag
                this.isLoggingOut = false;
            }
        }

        /**
         * Get current user
         * Returns current user object or null
         */
        getCurrentUser() {
            return this.currentUser;
        }

        /**
         * Check if user is logged in
         * Returns boolean
         */
        isLoggedIn() {
            return this.currentUser !== null;
        }

        /**
         * Destroy the auth state manager
         * Cleans up all event listeners and references
         */
        destroy() {
            // Remove click-outside handler
            if (this.dropdownClickHandler) {
                document.removeEventListener('click', this.dropdownClickHandler);
                this.dropdownClickHandler = null;
            }
            
            // Unsubscribe from Supabase auth listener
            if (this.authUnsubscribe) {
                this.authUnsubscribe.data.subscription.unsubscribe();
                this.authUnsubscribe = null;
            }
            
            // Reset state
            this.authContainer = null;
            this.supabaseClient = null;
            this.currentUser = null;
            this.isInitialized = false;
            
            console.log('[Auth State Manager] Destroyed and cleaned up');
        }
    }

    /**
     * Create global auth state manager instance
     */
    window.authStateManager = null;

    /**
     * Initialize auth state manager when DOM is ready
     */
    function initializeAuthStateManager() {
        if (!window.authStateManager) {
            window.authStateManager = new AuthStateManager();
        }
    }

    // Wait for Supabase to be initialized
    window.addEventListener('supabase-initialized', () => {
        initializeAuthStateManager();
    });

    // Also try to initialize if Supabase is already available
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Give a small delay to ensure supabase-client.js has run
            setTimeout(initializeAuthStateManager, 100);
        });
    } else {
        // DOM is already loaded
        setTimeout(initializeAuthStateManager, 100);
    }

    /**
     * Expose public API
     */
    window.getAuthManager = function() {
        return window.authStateManager;
    };

})(window);