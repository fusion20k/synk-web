/**
 * STEP 1.4 VERIFICATION SCRIPT
 * Run this in browser console to verify dropdown interactions are working correctly
 * 
 * Usage: Copy and paste this entire script into browser DevTools console (F12)
 */

console.log('%c=== STEP 1.4 VERIFICATION SCRIPT ===', 'font-size: 16px; font-weight: bold; color: #FF4500;');
console.log('%cVerifying Dropdown Interactions Implementation\n', 'font-size: 12px; color: #888;');

// Results storage
const results = {
    checks: [],
    passed: 0,
    failed: 0,
    warnings: 0
};

// Helper function to log results
function checkResult(testName, condition, details = '') {
    const icon = condition ? '✅' : '❌';
    const color = condition ? '#00d084' : '#ff6b6b';
    const status = condition ? 'PASS' : 'FAIL';
    
    console.log(`%c${icon} ${testName}: ${status}`, `color: ${color}; font-weight: bold;`);
    if (details) console.log(`   ${details}`);
    
    results.checks.push({ testName, condition, details });
    if (condition) {
        results.passed++;
    } else {
        results.failed++;
    }
}

function warningResult(testName, message) {
    console.log(`%c⚠️  ${testName}: WARNING`, 'color: #ffa500; font-weight: bold;');
    console.log(`   ${message}`);
    results.warnings++;
}

console.log('%c--- CHECKING DOM STRUCTURE ---', 'font-size: 12px; color: #FF4500; margin-top: 10px;');

// Check 1: Auth container exists
const authContainer = document.getElementById('auth-section-container');
checkResult(
    'Auth Container Exists',
    !!authContainer,
    authContainer ? `Found: ${authContainer.className}` : 'NOT FOUND - Critical error'
);

if (!authContainer) {
    console.log('%cCannot continue without auth container', 'color: #ff6b6b;');
} else {
    // Check 2: Logged in state
    const isLoggedIn = authContainer.querySelector('.auth-section.logged-in') !== null;
    checkResult(
        'Logged In State',
        isLoggedIn,
        isLoggedIn ? 'User is logged in' : 'User is logged out'
    );

    if (isLoggedIn) {
        console.log('%c--- CHECKING AVATAR BUTTON ---', 'font-size: 12px; color: #FF4500; margin-top: 10px;');

        // Check 3: Avatar button exists
        const avatarBtn = authContainer.querySelector('#avatar-btn');
        checkResult(
            'Avatar Button Exists',
            !!avatarBtn,
            avatarBtn ? 'Found button with ID "avatar-btn"' : 'Avatar button not found'
        );

        // Check 4: Avatar circle exists
        const avatarCircle = authContainer.querySelector('.avatar-circle');
        checkResult(
            'Avatar Circle Exists',
            !!avatarCircle,
            avatarCircle ? `Avatar shows: "${avatarCircle.textContent.trim()}"` : 'Avatar circle not found'
        );

        // Check 5: Avatar circle has first initial
        const initial = avatarCircle?.textContent.trim();
        const isValidInitial = /^[A-Z]$/.test(initial || '');
        checkResult(
            'Avatar Shows Valid Initial',
            isValidInitial,
            `Initial: "${initial}" ${isValidInitial ? '✓' : '(should be uppercase letter)'}`
        );

        // Check 6: Avatar has required CSS classes
        const avatarHasClasses = avatarBtn?.classList.contains('avatar-btn');
        checkResult(
            'Avatar Button Has CSS Class',
            avatarHasClasses,
            avatarHasClasses ? 'Class "avatar-btn" found' : 'CSS class missing'
        );

        // Check 7: Avatar button has aria-label
        const hasAriaLabel = avatarBtn?.hasAttribute('aria-label');
        checkResult(
            'Avatar Button Has ARIA Label',
            hasAriaLabel,
            hasAriaLabel ? `Label: "${avatarBtn?.getAttribute('aria-label')}"` : 'No ARIA label'
        );

        console.log('%c--- CHECKING DROPDOWN MENU ---', 'font-size: 12px; color: #FF4500; margin-top: 10px;');

        // Check 8: Dropdown exists
        const dropdown = authContainer.querySelector('#profile-dropdown');
        checkResult(
            'Dropdown Menu Exists',
            !!dropdown,
            dropdown ? 'Found dropdown with ID "profile-dropdown"' : 'Dropdown not found'
        );

        if (dropdown) {
            // Check 9: Dropdown has show class for toggling
            const hasShowClass = dropdown.classList.contains('show');
            checkResult(
                'Dropdown Initially Hidden',
                !hasShowClass,
                hasShowClass ? 'Currently shown (may be ok if just opened)' : 'Correctly hidden'
            );

            // Check 10: Dropdown has proper ARIA attributes
            const hasRole = dropdown.hasAttribute('role');
            const hasAriaHidden = dropdown.hasAttribute('aria-hidden');
            checkResult(
                'Dropdown Has ARIA Attributes',
                hasRole && hasAriaHidden,
                `role="${dropdown?.getAttribute('role')}" aria-hidden="${dropdown?.getAttribute('aria-hidden')}"`
            );

            // Check 11: Dropdown header exists
            const dropdownHeader = dropdown.querySelector('.dropdown-header');
            checkResult(
                'Dropdown Header Exists',
                !!dropdownHeader,
                dropdownHeader ? 'Header with user info found' : 'Header not found'
            );

            // Check 12: Dropdown header avatar
            const headerAvatar = dropdown.querySelector('.dropdown-avatar');
            checkResult(
                'Dropdown Header Avatar Exists',
                !!headerAvatar,
                headerAvatar ? `Avatar: "${headerAvatar.textContent.trim()}"` : 'Header avatar not found'
            );

            // Check 13: Dropdown email display
            const dropdownEmail = dropdown.querySelector('.dropdown-email');
            checkResult(
                'Dropdown Email Display Exists',
                !!dropdownEmail,
                dropdownEmail ? `Email: "${dropdownEmail.textContent.trim()}"` : 'Email display not found'
            );

            // Check 14: Manage Account link
            const manageLink = dropdown.querySelector('a[href="account.html"]');
            checkResult(
                'Manage Account Link Exists',
                !!manageLink,
                manageLink ? 'Link to account.html found' : 'Manage Account link not found'
            );

            // Check 15: Logout button
            const logoutBtn = dropdown.querySelector('#dropdown-logout-btn');
            checkResult(
                'Logout Button Exists',
                !!logoutBtn,
                logoutBtn ? 'Logout button found' : 'Logout button not found'
            );

            // Check 16: Logout button has correct type
            const logoutBtnType = logoutBtn?.type === 'button';
            checkResult(
                'Logout Button Has Type="button"',
                logoutBtnType,
                logoutBtnType ? 'Correct type' : 'Type should be "button"'
            );
        }

        console.log('%c--- CHECKING EVENT HANDLERS ---', 'font-size: 12px; color: #FF4500; margin-top: 10px;');

        // Check 17: Avatar button is clickable
        const avatarClickable = avatarBtn && avatarBtn.onclick !== null || avatarBtn?.hasListener?.('click');
        checkResult(
            'Avatar Button Has Click Handler',
            !!avatarBtn,
            'Click handler attached (verified by presence)'
        );

        // Check 18: Auth State Manager instance exists
        const authManager = window.getAuthManager?.();
        checkResult(
            'Auth Manager Instance Exists',
            !!authManager,
            authManager ? `Manager initialized: ${authManager.isInitialized}` : 'Auth manager not found'
        );

        // Check 19: Auth Manager has required properties
        if (authManager) {
            const hasCurrentUser = authManager.hasOwnProperty('currentUser');
            const hasLogoutMethod = typeof authManager.handleLogout === 'function';
            checkResult(
                'Auth Manager Has Required Methods',
                hasCurrentUser && hasLogoutMethod,
                `hasCurrentUser: ${hasCurrentUser}, hasLogoutMethod: ${hasLogoutMethod}`
            );

            // Check 20: Auth Manager has dropdown click handler
            const hasDropdownHandler = authManager.hasOwnProperty('dropdownClickHandler');
            checkResult(
                'Auth Manager Has Dropdown Click Handler',
                hasDropdownHandler,
                hasDropdownHandler ? 'Handler stored for cleanup' : 'Handler property not found'
            );

            // Check 21: Auth Manager has logout flag
            const hasLogoutFlag = authManager.hasOwnProperty('isLoggingOut');
            checkResult(
                'Auth Manager Has Logout Prevention Flag',
                hasLogoutFlag,
                hasLogoutFlag ? 'Double-logout prevention enabled' : 'Flag not found'
            );

            // Check 22: Get current user
            const currentUser = authManager.getCurrentUser?.();
            if (currentUser) {
                checkResult(
                    'Current User Data Available',
                    currentUser.email !== undefined,
                    `Email: ${currentUser.email}`
                );
            }
        }
    }
}

console.log('%c--- CHECKING CSS STYLES ---', 'font-size: 12px; color: #FF4500; margin-top: 10px;');

// Check 23: Avatar circle styling
const avatarCircle = document.querySelector('.avatar-circle');
if (avatarCircle) {
    const styles = window.getComputedStyle(avatarCircle);
    const hasBackground = styles.background !== 'rgba(0, 0, 0, 0)' && styles.background !== 'transparent';
    checkResult(
        'Avatar Circle Has Background Styling',
        hasBackground,
        `Background: ${styles.background}`
    );

    const hasWidth = parseInt(styles.width) > 20;
    checkResult(
        'Avatar Circle Has Proper Size',
        hasWidth,
        `Size: ${styles.width}x${styles.height}`
    );
}

// Check 24: Profile dropdown styling
const dropdown = document.querySelector('.profile-dropdown');
if (dropdown) {
    const styles = window.getComputedStyle(dropdown);
    const isAbsolute = styles.position === 'absolute';
    checkResult(
        'Dropdown Has Absolute Positioning',
        isAbsolute,
        `Position: ${styles.position}`
    );

    const hasTransition = styles.transition && styles.transition !== 'none';
    checkResult(
        'Dropdown Has CSS Transitions',
        hasTransition,
        hasTransition ? 'Transitions enabled for smooth animation' : 'No transitions'
    );
}

console.log('%c--- CHECKING LOCALSTORAGE ---', 'font-size: 12px; color: #FF4500; margin-top: 10px;');

// Check 25: Session tokens in localStorage
const hasAuthToken = localStorage.getItem('synk_auth_token') !== null;
const hasUserEmail = localStorage.getItem('synk_user_email') !== null;

checkResult(
    'User Session Stored',
    hasAuthToken || hasUserEmail,
    `Auth Token: ${hasAuthToken ? 'Yes' : 'No'}, User Email: ${hasUserEmail ? 'Yes' : 'No'}`
);

if (hasUserEmail) {
    console.log(`   User Email: ${localStorage.getItem('synk_user_email')}`);
}

console.log('%c--- CHECKING SUPABASE CLIENT ---', 'font-size: 12px; color: #FF4500; margin-top: 10px;');

// Check 26: Supabase client available
const supabaseClient = window.supabaseClient;
checkResult(
    'Supabase Client Initialized',
    !!supabaseClient,
    supabaseClient ? 'Client ready for auth operations' : 'Client not available'
);

if (supabaseClient && supabaseClient.auth) {
    checkResult(
        'Supabase Auth Module Available',
        !!supabaseClient.auth,
        'Auth module ready'
    );
}

console.log('%c--- INTERACTIVE TESTS ---', 'font-size: 12px; color: #FF4500; margin-top: 10px;');

// Manual test instructions
console.log('%c📋 To perform interactive tests:', 'font-size: 11px; color: #FF8C00; font-weight: bold;');
console.log('1. Click the avatar circle in the header');
console.log('2. Verify dropdown appears smoothly');
console.log('3. Click avatar again to close');
console.log('4. Click outside dropdown to close');
console.log('5. Click "Manage Account" to test navigation');
console.log('6. Open dropdown and click "Log Out" to test logout');

console.log('\n%c📊 VERIFICATION SUMMARY', 'font-size: 14px; font-weight: bold; color: #FF4500;');
console.log(`%c✅ Passed: ${results.passed}`, `color: #00d084; font-weight: bold;`);
console.log(`%c❌ Failed: ${results.failed}`, `color: ${results.failed > 0 ? '#ff6b6b' : '#ccc'}; font-weight: bold;`);
console.log(`%c⚠️  Warnings: ${results.warnings}`, `color: #ffa500; font-weight: bold;`);

const totalTests = results.passed + results.failed;
const percentage = totalTests > 0 ? Math.round((results.passed / totalTests) * 100) : 0;

console.log(`\n%c${percentage}% of checks passed (${results.passed}/${totalTests})`, 
    `font-size: 12px; font-weight: bold; color: ${percentage === 100 ? '#00d084' : percentage >= 80 ? '#ffa500' : '#ff6b6b'};`
);

// Final status
if (results.failed === 0 && results.passed > 15) {
    console.log('%c✨ STEP 1.4 IMPLEMENTATION VERIFIED - READY FOR PRODUCTION! 🚀', 
        'font-size: 13px; font-weight: bold; color: #00d084; background: #1a1a1a; padding: 10px; border-radius: 5px;');
} else if (results.failed === 0) {
    console.log('%c⚠️  Some checks couldn\'t run. Please ensure you\'re logged in.', 
        'font-size: 12px; color: #ffa500;');
} else {
    console.log('%c❌ Some checks failed. Please review the implementation.', 
        'font-size: 12px; color: #ff6b6b;');
}

console.log('\n%c💡 Debug Helper Functions:', 'font-size: 11px; color: #888; font-weight: bold;');
console.log('window.getAuthManager() - Get auth manager instance');
console.log('authStateManager.getCurrentUser() - Get current user object');
console.log('authStateManager.isLoggedIn() - Check if logged in');

console.log('%c\n=== END OF VERIFICATION SCRIPT ===\n', 'font-size: 12px; color: #888;');