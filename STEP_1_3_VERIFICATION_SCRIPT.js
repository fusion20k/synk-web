/**
 * STEP 1.3: Auth State Manager - Verification Script
 * 
 * Run this script in the browser console to verify all implementations
 * 
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 */

console.log('='.repeat(60));
console.log('STEP 1.3: Auth State Manager - Verification Script');
console.log('='.repeat(60));

// ============================================================================
// TEST SUITE 1: Auth State Manager Existence
// ============================================================================
console.log('\n📋 TEST SUITE 1: Auth State Manager Core');
console.log('─'.repeat(60));

try {
  const authManager = window.getAuthManager();
  if (authManager) {
    console.log('✅ Auth Manager exists: window.getAuthManager()');
    console.log('   Instance:', authManager.constructor.name);
  } else {
    console.log('❌ Auth Manager not found');
  }
} catch (e) {
  console.log('❌ Error accessing auth manager:', e.message);
}

try {
  if (window.authStateManager) {
    console.log('✅ Global auth state manager: window.authStateManager');
  } else {
    console.log('⚠️  Global manager not yet initialized');
  }
} catch (e) {
  console.log('❌ Error:', e.message);
}

// ============================================================================
// TEST SUITE 2: Auth State Methods
// ============================================================================
console.log('\n📋 TEST SUITE 2: Auth State Methods');
console.log('─'.repeat(60));

try {
  const authManager = window.getAuthManager();
  if (authManager) {
    // Check methods exist
    const methods = ['isLoggedIn', 'getCurrentUser', 'handleLogout', 'destroy'];
    methods.forEach(method => {
      if (typeof authManager[method] === 'function') {
        console.log(`✅ Method exists: ${method}()`);
      } else {
        console.log(`❌ Method missing: ${method}()`);
      }
    });
  }
} catch (e) {
  console.log('❌ Error checking methods:', e.message);
}

// ============================================================================
// TEST SUITE 3: Login Status
// ============================================================================
console.log('\n📋 TEST SUITE 3: Current Login Status');
console.log('─'.repeat(60));

try {
  const authManager = window.getAuthManager();
  const isLoggedIn = authManager.isLoggedIn();
  const currentUser = authManager.getCurrentUser();

  console.log(`Is Logged In: ${isLoggedIn ? '✅ YES' : '❌ NO'}`);
  
  if (currentUser) {
    console.log(`Current User:`);
    console.log(`  Email: ${currentUser.email}`);
    console.log(`  Source: ${currentUser.source}`);
    if (currentUser.id) {
      console.log(`  ID: ${currentUser.id.substring(0, 20)}...`);
    }
  } else {
    console.log('No user logged in');
  }
} catch (e) {
  console.log('❌ Error checking login status:', e.message);
}

// ============================================================================
// TEST SUITE 4: DOM Elements
// ============================================================================
console.log('\n📋 TEST SUITE 4: DOM Elements');
console.log('─'.repeat(60));

try {
  const authContainer = document.getElementById('auth-section-container');
  if (authContainer) {
    console.log('✅ Auth container found: #auth-section-container');
    
    const authSection = authContainer.querySelector('.auth-section');
    if (authSection) {
      console.log('✅ Auth section found: .auth-section');
      
      if (authSection.classList.contains('logged-out')) {
        console.log('   State: LOGGED OUT');
        const buttons = authSection.querySelectorAll('.auth-btn');
        console.log(`   Buttons found: ${buttons.length}`);
        if (buttons.length >= 2) {
          console.log(`   Button 1 text: "${buttons[0].textContent.trim()}"`);
          console.log(`   Button 2 text: "${buttons[1].textContent.trim()}"`);
          
          // Check button text
          if (buttons[0].textContent.includes('Log In')) {
            console.log('   ✅ "Log In" button text correct');
          } else {
            console.log('   ❌ "Log In" button text incorrect');
          }
          if (buttons[1].textContent.includes('Sign Up')) {
            console.log('   ✅ "Sign Up" button text correct');
          } else {
            console.log('   ❌ "Sign Up" button text incorrect');
          }
        }
      } else if (authSection.classList.contains('logged-in')) {
        console.log('   State: LOGGED IN');
        
        const avatarBtn = authSection.querySelector('.avatar-btn');
        if (avatarBtn) {
          console.log('✅ Avatar button found: .avatar-btn');
          
          const avatarCircle = avatarBtn.querySelector('.avatar-circle');
          if (avatarCircle) {
            console.log(`✅ Avatar circle found: .avatar-circle`);
            console.log(`   Initial: "${avatarCircle.textContent.trim()}"`);
          } else {
            console.log('❌ Avatar circle not found');
          }
        } else {
          console.log('❌ Avatar button not found');
        }
        
        const dropdown = authSection.querySelector('.profile-dropdown');
        if (dropdown) {
          console.log('✅ Dropdown menu found: .profile-dropdown');
          
          const items = dropdown.querySelectorAll('.dropdown-item');
          console.log(`   Menu items found: ${items.length}`);
          
          items.forEach((item, index) => {
            const text = item.textContent.trim();
            console.log(`   Item ${index + 1}: "${text}"`);
          });
        } else {
          console.log('❌ Dropdown menu not found');
        }
      } else {
        console.log('⚠️  Unknown auth state');
      }
    } else {
      console.log('❌ Auth section not found');
    }
  } else {
    console.log('❌ Auth container not found');
  }
} catch (e) {
  console.log('❌ Error checking DOM elements:', e.message);
}

// ============================================================================
// TEST SUITE 5: CSS Classes
// ============================================================================
console.log('\n📋 TEST SUITE 5: CSS Classes');
console.log('─'.repeat(60));

const cssClasses = [
  'avatar-btn',
  'avatar-circle',
  'user-profile',
  'profile-dropdown',
  'dropdown-header',
  'dropdown-avatar',
  'dropdown-email',
  'dropdown-menu',
  'dropdown-item',
  'logout-item'
];

const stylesheet = Array.from(document.styleSheets).find(sheet => {
  try {
    return sheet.href && sheet.href.includes('styles.css');
  } catch (e) {
    return false;
  }
});

console.log('Checking CSS classes in styles.css...');
cssClasses.forEach(className => {
  try {
    const selector = `.${className}`;
    const rule = Array.from(document.styleSheets)
      .flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules || []);
        } catch {
          return [];
        }
      })
      .find(rule => rule.selectorText && rule.selectorText.includes(selector));
    
    if (rule) {
      console.log(`✅ CSS class found: .${className}`);
    } else {
      console.log(`⚠️  CSS class not found: .${className}`);
    }
  } catch (e) {
    console.log(`⚠️  Could not check: .${className}`);
  }
});

// ============================================================================
// TEST SUITE 6: Local Storage
// ============================================================================
console.log('\n📋 TEST SUITE 6: Local Storage Auth Data');
console.log('─'.repeat(60));

const authToken = localStorage.getItem('synk_auth_token');
const userEmail = localStorage.getItem('synk_user_email');

if (authToken) {
  console.log(`✅ Auth token found: ${authToken.substring(0, 20)}...`);
} else {
  console.log('❌ Auth token not found (user not logged in)');
}

if (userEmail) {
  console.log(`✅ User email found: ${userEmail}`);
} else {
  console.log('❌ User email not found');
}

// ============================================================================
// TEST SUITE 7: Events
// ============================================================================
console.log('\n📋 TEST SUITE 7: Event Listeners Setup');
console.log('─'.repeat(60));

console.log('Setting up test event listeners...');

let loginEventFired = false;
let logoutEventFired = false;

window.addEventListener('user-logged-in', (e) => {
  console.log('✅ "user-logged-in" event received');
  loginEventFired = true;
});

window.addEventListener('user-logged-out', (e) => {
  console.log('✅ "user-logged-out" event received');
  logoutEventFired = true;
});

window.addEventListener('auth-state-manager-ready', (e) => {
  console.log('✅ "auth-state-manager-ready" event received');
});

console.log('Test listeners registered. They will show when events fire.');

// ============================================================================
// TEST SUITE 8: Account Page
// ============================================================================
console.log('\n📋 TEST SUITE 8: Account Page');
console.log('─'.repeat(60));

const baseUrl = window.location.origin;
const accountPageUrl = `${baseUrl}/account.html`;
console.log(`Account page URL: ${accountPageUrl}`);

// Try to fetch account page metadata
fetch(accountPageUrl, { method: 'HEAD' })
  .then(response => {
    if (response.ok) {
      console.log('✅ Account page exists (accessible)');
    } else {
      console.log(`⚠️  Account page returned status: ${response.status}`);
    }
  })
  .catch(e => {
    console.log(`⚠️  Could not check account page: ${e.message}`);
  });

// ============================================================================
// TEST SUITE 9: Supabase Integration
// ============================================================================
console.log('\n📋 TEST SUITE 9: Supabase Integration');
console.log('─'.repeat(60));

try {
  if (window.supabaseClient) {
    console.log('✅ Supabase client is initialized');
    
    if (window.supabaseClient.auth) {
      console.log('✅ Supabase auth module available');
      
      // Try to get current user
      window.supabaseClient.auth.getUser()
        .then(({ data, error }) => {
          if (data && data.user) {
            console.log(`✅ Supabase user found: ${data.user.email}`);
          } else if (error) {
            console.log(`⚠️  Supabase error: ${error.message}`);
          } else {
            console.log('ℹ️  No Supabase user session');
          }
        })
        .catch(e => {
          console.log(`⚠️  Error checking Supabase user: ${e.message}`);
        });
    } else {
      console.log('❌ Supabase auth module not available');
    }
  } else {
    console.log('⚠️  Supabase client not initialized yet');
  }
} catch (e) {
  console.log('❌ Error checking Supabase:', e.message);
}

// ============================================================================
// TEST SUITE 10: Quick Interaction Test
// ============================================================================
console.log('\n📋 TEST SUITE 10: Quick Interaction Tests');
console.log('─'.repeat(60));

try {
  const authManager = window.getAuthManager();
  if (authManager && authManager.isLoggedIn()) {
    const avatarBtn = document.querySelector('.avatar-btn');
    if (avatarBtn) {
      console.log('💡 TIP: Try clicking the avatar to open the dropdown:');
      console.log('   avatarBtn.click()');
      
      console.log('\n💡 TIP: Try logging out by clicking the Log Out button:');
      console.log('   window.authStateManager.handleLogout()');
    }
  } else {
    console.log('💡 User is logged out. To test:');
    console.log('   1. Go to login.html and log in');
    console.log('   2. Return to this page');
    console.log('   3. Run this script again');
  }
} catch (e) {
  console.log('Error:', e.message);
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));

console.log(`
✅ If you see mostly "✅" marks, STEP 1.3 is implemented correctly.
⚠️  "⚠️" marks indicate items that may need checking.
❌ "❌" marks indicate problems that need fixing.

Next Steps:
1. Run all test cases from STEP_1_3_TESTING_GUIDE_FINAL.md
2. Test on multiple browsers (Chrome, Firefox, Safari, Edge)
3. Test on mobile devices
4. Verify login/logout flows work correctly
5. Check account page access
6. Commit changes when verified

Contact: See documentation files for troubleshooting.
`);

console.log('='.repeat(60));
console.log('Script execution complete.');
console.log('='.repeat(60));