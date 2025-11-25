/**
 * Unified Supabase Authentication Manager
 * Single source of truth for authentication across the application
 * 
 * Features:
 * - Real Supabase authentication (signup, login, logout)
 * - Real-time session management
 * - Dynamic UI state rendering
 * - Professional error handling
 * - Mobile responsive
 */

class SupabaseAuthManager {
    constructor() {
        this.supabaseClient = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.authUnsubscribe = null;
        this.session = null;
    }

    /**
     * Initialize Supabase client and auth listener
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Wait for Supabase library
            await this.waitForSupabaseLibrary();

            // Create Supabase client
            this.supabaseClient = window.supabase.createClient(
                'https://nbolvclqiaqrupxknvlu.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ib2x2Y2xxaWFxcnVweGtudmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NTQ4MjgsImV4cCI6MjA3MTIzMDgyOH0.yz33_9PEZbC2ew_2lQyxb6B_cQruSANVrwM_4h-afg8'
            );

            // Get current session
            const { data: { session } } = await this.supabaseClient.auth.getSession();
            this.session = session;
            this.currentUser = session?.user || null;

            // Setup real-time auth listener
            this.setupAuthListener();

            // Update UI
            this.updateUI();

            this.isInitialized = true;
            console.log('[Supabase Auth] Initialized successfully');

            // Expose globally
            window.authManager = this;
        } catch (error) {
            console.error('[Supabase Auth] Initialization failed:', error);
        }
    }

    /**
     * Wait for Supabase library to load
     */
    waitForSupabaseLibrary(maxAttempts = 30, delayMs = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            const check = () => {
                if (window.supabase && window.supabase.createClient) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(check, delayMs);
                } else {
                    reject(new Error('Supabase library failed to load'));
                }
            };

            check();
        });
    }

    /**
     * Setup real-time auth state listener
     */
    setupAuthListener() {
        if (!this.supabaseClient) return;

        const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('[Supabase Auth] State changed:', event);
            this.session = session;
            this.currentUser = session?.user || null;
            this.updateUI();

            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('auth-state-changed', {
                detail: {
                    event,
                    user: this.currentUser,
                    session
                }
            }));
        });

        this.authUnsubscribe = subscription;
    }

    /**
     * Update UI based on auth state
     */
    updateUI() {
        const container = document.getElementById('auth-section-container');
        if (!container) return;

        if (this.currentUser) {
            this.renderLoggedInUI(container);
        } else {
            this.renderLoggedOutUI(container);
        }
    }

    /**
     * Render logged-in UI (user avatar dropdown)
     */
    renderLoggedInUI(container) {
        const email = this.currentUser?.email || 'User';
        const firstInitial = email.charAt(0).toUpperCase();

        container.innerHTML = `
            <div class="auth-section logged-in">
                <div class="user-profile">
                    <button class="avatar-btn" id="avatar-btn" title="${email}" aria-label="User menu">
                        <div class="avatar-circle">
                            ${firstInitial}
                        </div>
                    </button>
                    
                    <div class="profile-dropdown" id="profile-dropdown" role="menu" aria-hidden="true">
                        <div class="dropdown-header">
                            <div class="dropdown-avatar">
                                ${firstInitial}
                            </div>
                            <div class="dropdown-user-info">
                                <p class="dropdown-email" title="${email}">${email}</p>
                            </div>
                        </div>
                        
                        <div class="dropdown-divider"></div>
                        
                        <div class="dropdown-menu">
                            <a href="account.html" class="dropdown-item" role="menuitem">
                                <span class="dropdown-icon">⚙️</span>
                                Manage Account
                            </a>
                            <button id="logout-btn" class="dropdown-item logout-item" role="menuitem" type="button">
                                <span class="dropdown-icon">🚪</span>
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Setup event handlers
        this.setupDropdownHandlers(container);
    }

    /**
     * Render logged-out UI (login/signup buttons)
     */
    renderLoggedOutUI(container) {
        container.innerHTML = `
            <div class="auth-section logged-out">
                <a href="/login.html" class="btn-login">Log In</a>
                <a href="/signup.html" class="btn-signup">Sign Up</a>
            </div>
        `;
    }

    /**
     * Setup dropdown event handlers
     */
    setupDropdownHandlers(container) {
        const avatarBtn = container.querySelector('#avatar-btn');
        const profileDropdown = container.querySelector('#profile-dropdown');
        const logoutBtn = container.querySelector('#logout-btn');

        if (avatarBtn && profileDropdown) {
            avatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = profileDropdown.classList.contains('show');
                profileDropdown.classList.toggle('show');
                profileDropdown.setAttribute('aria-hidden', isOpen);
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    profileDropdown.classList.remove('show');
                    profileDropdown.setAttribute('aria-hidden', 'true');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await this.logout();
            });
        }
    }

    /**
     * Sign up with Supabase
     */
    async signup(email, password) {
        console.log('🔥🔥🔥 SIGNUP METHOD CALLED WITH EMAIL:', email);
        
        if (!this.supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        try {
            console.log('🔥 About to call signUp...');
            const { data, error } = await this.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) {
                throw error;
            }

            console.log('[Supabase Auth] Signup data:', data);
            
            // With email verification disabled, Supabase doesn't auto-login after signup
            // We need to manually log in the user
            console.log('[Supabase Auth] Auto-logging in user after signup...');
            const { data: loginData, error: loginError } = await this.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (loginError) {
                console.error('[Supabase Auth] Auto-login failed:', loginError);
                throw loginError;
            }

            console.log('[Supabase Auth] Auto-login successful:', loginData);
            
            // Create user profile in public.users table
            console.log('[Supabase Auth] Creating public user profile...');
            await this.createPublicUserProfile(email);
            
            // Get fresh session
            const { data: { session } } = await this.supabaseClient.auth.getSession();
            console.log('[Supabase Auth] Session after signup+login:', session);
            
            // Wait for auth listener to fire (this updates this.currentUser and this.session)
            await this.waitForSessionEstablished(5000);
            
            // Update UI immediately
            this.updateUI();
            
            // Dispatch auth state changed event
            window.dispatchEvent(new CustomEvent('auth-state-changed', {
                detail: {
                    event: 'SIGNED_IN',
                    user: this.currentUser,
                    session: this.session
                }
            }));

            return { data: loginData, success: true };
        } catch (error) {
            console.error('[Supabase Auth] Signup error:', error);
            throw error;
        }
    }

    /**
     * Log in with Supabase
     */
    async login(email, password) {
        if (!this.supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            console.log('[Supabase Auth] Login data:', data);
            
            // Wait for session to be established
            await this.waitForSessionEstablished(5000);
            
            // Update UI immediately
            this.updateUI();
            
            // Dispatch auth state changed event
            window.dispatchEvent(new CustomEvent('auth-state-changed', {
                detail: {
                    event: 'SIGNED_IN',
                    user: this.currentUser,
                    session: this.session
                }
            }));

            return { data, success: true };
        } catch (error) {
            console.error('[Supabase Auth] Login error:', error);
            throw error;
        }
    }

    /**
     * Create user profile in public.users table
     */
    async createPublicUserProfile(email) {
        if (!this.supabaseClient) {
            console.error('[Supabase Auth] Cannot create profile: Supabase client not initialized');
            return;
        }

        try {
            console.log('[Supabase Auth] Starting profile creation for:', email);
            
            // Check if user already exists in public.users
            const { data: existingUser, error: checkError } = await this.supabaseClient
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (checkError) {
                console.warn('[Supabase Auth] Error checking for existing user:', checkError);
                // Continue anyway - might be a permissions issue but let's try to insert
            }

            if (existingUser) {
                console.log('[Supabase Auth] User profile already exists for:', email);
                return;
            }

            console.log('[Supabase Auth] Attempting to insert new user into public.users...');
            
            // Insert new user into public.users table
            const { data, error } = await this.supabaseClient
                .from('users')
                .insert({
                    email,
                    plan: 'free',
                    sync_enabled: false,
                    last_sync_time: null
                })
                .select();

            if (error) {
                console.error('[Supabase Auth] Error creating user profile:', {
                    message: error.message,
                    code: error.code,
                    status: error.status,
                    details: error.details
                });
                return; // Don't throw - let signup complete
            }

            console.log('[Supabase Auth] ✅ User profile successfully created:', data);
        } catch (error) {
            console.error('[Supabase Auth] Unexpected error in createPublicUserProfile:', error);
            // Don't re-throw - this shouldn't block the signup flow
        }
    }

    /**
     * Wait for session to be established
     */
    waitForSessionEstablished(maxWaitMs = 10000) {
        return new Promise((resolve) => {
            let waitTime = 0;
            const checkInterval = 50;

            const check = () => {
                // Check if currentUser is set and session exists
                if (this.currentUser && this.session) {
                    console.log('[Supabase Auth] ✅ Session established:', {
                        user: this.currentUser.email,
                        hasSession: !!this.session
                    });
                    resolve();
                } else if (waitTime < maxWaitMs) {
                    waitTime += checkInterval;
                    setTimeout(check, checkInterval);
                } else {
                    console.warn('[Supabase Auth] ⚠️ Session wait timeout after', maxWaitMs, 'ms, proceeding anyway');
                    resolve();
                }
            };

            check();
        });
    }

    /**
     * Update user plan in Supabase
     */
    async updateUserPlan(email, plan, subscriptionType = null, subscriptionEndDate = null) {
        if (!this.supabaseClient) {
            console.error('[Supabase Auth] Cannot update plan: Supabase client not initialized');
            return false;
        }

        try {
            console.log('[Supabase Auth] Updating user plan for:', email, 'to:', plan);
            
            const updateData = {
                plan,
                                            };
            
            const { data, error } = await this.supabaseClient
                .from('users')
                .update(updateData)
                .eq('email', email)
                .select();

            if (error) {
                console.error('[Supabase Auth] Error updating user plan:', {
                    message: error.message,
                    code: error.code,
                    status: error.status,
                    details: error.details
                });
                return false;
            }

            console.log('[Supabase Auth] User plan successfully updated:', data);
            return true;
        } catch (error) {
            console.error('[Supabase Auth] Unexpected error in updateUserPlan:', error);
            return false;
        }
    }

    /**
     * Log out from Supabase
     */
    async logout() {
        if (!this.supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { error } = await this.supabaseClient.auth.signOut();

            if (error) {
                throw error;
            }

            // Redirect to home
            setTimeout(() => {
                window.location.href = '/';
            }, 300);

            return { success: true };
        } catch (error) {
            console.error('[Supabase Auth] Logout error:', error);
            throw error;
        }
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    /**
     * Get current user
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Get current session
     */
    getSession() {
        return this.session;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.authUnsubscribe) {
            this.authUnsubscribe.unsubscribe();
        }
    }
}

// Create global instance and initialize
const authManager = new SupabaseAuthManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        authManager.initialize();
    });
} else {
    authManager.initialize();
}

// Also expose for external access
window.authManager = authManager;