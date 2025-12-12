/**
 * Authentication Form Handlers
 * Uses Supabase for professional authentication
 */

// Helper function to show error messages
function showError(message) {
    const errorEl = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');

    if (successEl) successEl.style.display = 'none';
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
}

// Helper function to show success messages
function showSuccess(message) {
    const errorEl = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');

    if (errorEl) errorEl.style.display = 'none';
    if (successEl) {
        successEl.textContent = message;
        successEl.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            successEl.style.display = 'none';
        }, 5000);
    }
}

// Helper function to toggle button loading state
function setButtonLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');

    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-flex';
        button.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        button.disabled = false;
    }
}

/**
 * Wait for auth manager to be initialized
 */
function waitForAuthManager(maxAttempts = 30, delayMs = 100) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const check = () => {
            if (window.authManager && window.authManager.supabaseClient && window.authManager.isInitialized) {
                resolve(window.authManager);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(check, delayMs);
            } else {
                reject(new Error('Auth manager failed to initialize'));
            }
        };

        check();
    });
}

// ============================================
// LOGIN FORM HANDLER
// ============================================
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form elements with null checks
        const emailEl = document.getElementById('email');
        const passwordEl = document.getElementById('password');
        const loginBtn = document.getElementById('login-btn');

        if (!emailEl || !passwordEl) {
            console.error('Form elements missing:', {
                email: !!emailEl,
                password: !!passwordEl
            });
            showError('Form error. Please refresh the page and try again.');
            return;
        }

        const email = emailEl.value.trim();
        const password = passwordEl.value;

        // Validation
        if (!email || !password) {
            showError('Please enter both email and password');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Please enter a valid email address');
            return;
        }

        setButtonLoading(loginBtn, true);

        try {
            // Wait for auth manager
            const manager = await waitForAuthManager();

            // Use Supabase to login
            const result = await manager.login(email, password);

            if (result.success) {
                // Verify user is logged in
                const user = manager.getUser();
                const session = manager.getSession();
                
                console.log('[Auth] Login success:', {
                    userEmail: user?.email,
                    hasSession: !!session,
                    isLoggedIn: manager.isLoggedIn()
                });

                showSuccess('Login successful! Redirecting...');

                // Wait 1.5 seconds for UI to update before redirecting
                setTimeout(() => {
                    window.location.href = 'download.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Login error:', error);

            // Handle Supabase-specific errors
            let errorMessage = 'Login failed. Please try again.';

            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Invalid email or password';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Please confirm your email before logging in';
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(errorMessage);
            setButtonLoading(loginBtn, false);
        }
    });
}

// ============================================
// SIGNUP FORM HANDLER
// ============================================
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form elements with null checks
        const emailEl = document.getElementById('email');
        const passwordEl = document.getElementById('password');
        const termsEl = document.getElementById('terms');
        const signupBtn = document.getElementById('signup-btn');

        if (!emailEl || !passwordEl || !termsEl) {
            console.error('Form elements missing:', {
                email: !!emailEl,
                password: !!passwordEl,
                terms: !!termsEl
            });
            showError('Form error. Please refresh the page and try again.');
            return;
        }

        const email = emailEl.value.trim();
        const password = passwordEl.value;
        const termsAccepted = termsEl.checked;

        // Validation
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Please enter a valid email address');
            return;
        }

        // Password validation
        if (password.length < 8) {
            showError('Password must be at least 8 characters long');
            return;
        }

        if (!termsAccepted) {
            showError('Please accept the Terms of Service and Privacy Policy');
            return;
        }

        setButtonLoading(signupBtn, true);

        try {
            // Wait for auth manager
            const manager = await waitForAuthManager();

            // Use Supabase to signup
            const result = await manager.signup(email, password);

            if (result.success) {
                // Verify user is logged in
                const user = manager.getUser();
                const session = manager.getSession();
                
                console.log('[Auth] Signup success:', {
                    userEmail: user?.email,
                    hasSession: !!session,
                    isLoggedIn: manager.isLoggedIn()
                });

                showSuccess('Account created successfully! Redirecting...');

                // Wait 1.5 seconds for UI to update before redirecting
                setTimeout(() => {
                    window.location.href = 'download.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Signup error:', error);

            // Handle Supabase-specific errors
            let errorMessage = 'Signup failed. Please try again.';

            if (error.message.includes('already registered')) {
                errorMessage = 'An account with this email already exists. Please log in instead.';
            } else if (error.message.includes('password')) {
                errorMessage = 'Password does not meet security requirements';
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(errorMessage);
            setButtonLoading(signupBtn, false);
        }
    });
}

// ============================================
// PASSWORD STRENGTH INDICATOR (optional enhancement)
// ============================================
const passwordInput = document.getElementById('password');
if (passwordInput && signupForm) {
    passwordInput.addEventListener('input', (e) => {
        const password = e.target.value;
        const hint = passwordInput.nextElementSibling;

        if (hint && hint.classList && hint.classList.contains('password-hint')) {
            if (password.length === 0) {
                hint.textContent = 'At least 8 characters';
                hint.style.color = 'var(--text-muted)';
            } else if (password.length < 8) {
                hint.textContent = `${8 - password.length} more characters needed`;
                hint.style.color = '#ff6b6b';
            } else if (password.length >= 8 && password.length < 12) {
                hint.textContent = 'Good password strength';
                hint.style.color = '#ffa07a';
            } else {
                hint.textContent = 'Strong password!';
                hint.style.color = '#90ee90';
            }
        }
    });
}

// ============================================
// TOGGLE PASSWORD VISIBILITY
// ============================================
const togglePasswordBtn = document.getElementById('toggle-password');
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const passwordInput = document.getElementById('password');
        const isPassword = passwordInput.type === 'password';
        
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
    });
}

// ============================================
// CHECK IF USER IS ALREADY LOGGED IN
// ============================================
async function checkAuthStatus() {
    try {
        // Wait for auth manager
        const manager = await waitForAuthManager();

        if (manager.isLoggedIn()) {
            const currentPage = window.location.pathname.split('/').pop() || window.location.pathname;

            // If on login/signup page and already logged in, redirect to download
            if (currentPage === 'login.html' || currentPage === 'signup.html' || currentPage === '') {
                window.location.href = 'download.html';
            }
        }
    } catch (error) {
        console.log('[Auth] Not yet initialized, will check when ready');
    }
}

// Run auth check on page load
checkAuthStatus();

// Also check when auth manager is ready
window.addEventListener('auth-state-changed', checkAuthStatus);