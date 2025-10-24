// Auth State Manager - Handles Supabase Authentication
let supabaseClient = null;
let currentUser = null;
let dropdownOpen = false;

// Initialize Supabase Client
function initSupabaseClient() {
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase library not loaded');
        renderAuthUI(null);
        return;
    }

    const supabaseUrl = 'https://dwfmzfnlnuzcdxnxdsmh.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3Zm16Zm5sbnV6Y2R4bnhkc21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwODIwNzcsImV4cCI6MjA0NzY1ODA3N30.ug8vKFa2-qRj0uEp8h4Iqprd-T8CDDN_35sVaUP9bXc';

    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    console.log('✓ Supabase client initialized');

    // Check initial auth state
    checkAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        currentUser = session?.user || null;
        renderAuthUI(currentUser);
    });

    return subscription;
}

// Check current auth state
async function checkAuthState() {
    if (!supabaseClient) return;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        currentUser = user;
        console.log('Current user:', currentUser);
        renderAuthUI(currentUser);
    } catch (error) {
        console.error('Error checking auth state:', error);
        renderAuthUI(null);
    }
}

// Render appropriate auth UI
function renderAuthUI(user) {
    const container = document.getElementById('auth-container');
    if (!container) return;

    container.innerHTML = '';
    dropdownOpen = false;

    if (!user) {
        // Logged out - Show login/signup buttons
        container.innerHTML = `
            <div class="auth-buttons">
                <a href="/login.html" class="btn-login">Log In</a>
                <a href="/signup.html" class="btn-signup">Sign Up</a>
            </div>
        `;
    } else {
        // Logged in - Show user dropdown
        const userInitial = user.email?.charAt(0).toUpperCase() || 'U';
        container.innerHTML = `
            <div class="user-dropdown active">
                <div class="user-avatar" id="user-avatar-btn" title="${user.email}">${userInitial}</div>
                <div class="dropdown-menu" id="dropdown-menu">
                    <div class="dropdown-header">
                        <div class="dropdown-email">${user.email}</div>
                    </div>
                    <a href="/account.html" class="dropdown-item">Manage Account</a>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item logout-btn" id="logout-btn">Log Out</button>
                </div>
            </div>
        `;

        // Add event listeners
        const avatarBtn = document.getElementById('user-avatar-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const dropdownMenu = document.getElementById('dropdown-menu');

        if (avatarBtn) {
            avatarBtn.addEventListener('click', toggleDropdown);
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.querySelector('.user-dropdown');
            if (dropdown && !dropdown.contains(e.target)) {
                closeDropdown();
            }
        });
    }
}

// Toggle dropdown menu
function toggleDropdown(e) {
    e.stopPropagation();
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
        if (dropdownOpen) {
            closeDropdown();
        } else {
            dropdown.classList.add('open');
            dropdownOpen = true;
        }
    }
}

// Close dropdown menu
function closeDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
        dropdownOpen = false;
    }
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();
    
    if (!supabaseClient) return;

    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
            alert('Failed to log out');
        } else {
            console.log('✓ User logged out');
            currentUser = null;
            renderAuthUI(null);
            // Redirect to home
            window.location.href = '/index.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to log out');
    }
}

// Initialize on DOM ready
function initializeDynamicAuthState() {
    console.log('🔄 Initializing auth state manager...');
    initSupabaseClient();
}

// Export for use in scripts.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeDynamicAuthState,
        checkAuthState,
        handleLogout
    };
}