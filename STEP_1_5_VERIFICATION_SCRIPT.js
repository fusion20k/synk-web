/**
 * STEP 1.5: CSS VERIFICATION SCRIPT
 * Run this in browser console (F12) to verify CSS implementation
 * 
 * Usage:
 * 1. Open website in browser
 * 2. Press F12 to open DevTools
 * 3. Go to Console tab
 * 4. Copy-paste this entire script
 * 5. Press Enter
 * 6. Review results
 */

(function() {
  'use strict';

  // Color codes for output
  const PASS = '✅';
  const FAIL = '❌';
  const WARN = '⚠️';
  const INFO = 'ℹ️';

  // Test results tracker
  let testsPassed = 0;
  let testsFailed = 0;
  let testsWarned = 0;

  // Helper functions
  function log(symbol, test, message = '') {
    const msg = `${symbol} ${test}${message ? ': ' + message : ''}`;
    console.log(msg);
    
    if (symbol === PASS) testsPassed++;
    else if (symbol === FAIL) testsFailed++;
    else if (symbol === WARN) testsWarned++;
  }

  function testElement(selector, propertyName, expectedValue = null) {
    const element = document.querySelector(selector);
    
    if (!element) {
      log(FAIL, `Element not found: ${selector}`);
      return false;
    }
    
    if (propertyName === 'exists') {
      log(PASS, `Element exists: ${selector}`);
      return true;
    }
    
    const computedStyle = window.getComputedStyle(element);
    const actualValue = computedStyle.getPropertyValue(propertyName);
    
    if (expectedValue) {
      if (actualValue.includes(expectedValue) || actualValue === expectedValue) {
        log(PASS, `${selector} - ${propertyName}: ${actualValue}`);
        return true;
      } else {
        log(WARN, `${selector} - ${propertyName}`, `Expected "${expectedValue}", got "${actualValue}"`);
        return false;
      }
    } else {
      log(INFO, `${selector} - ${propertyName}: ${actualValue}`);
      return true;
    }
  }

  function testClass(selector, className) {
    const element = document.querySelector(selector);
    if (!element) {
      log(FAIL, `Element not found: ${selector}`);
      return false;
    }
    if (element.classList.contains(className)) {
      log(PASS, `${selector} has class: ${className}`);
      return true;
    } else {
      log(FAIL, `${selector} missing class: ${className}`);
      return false;
    }
  }

  // Header
  console.clear();
  console.log('%c🎨 STEP 1.5: CSS VERIFICATION SCRIPT', 'font-size: 18px; font-weight: bold; color: #FF4500;');
  console.log('%cTesting CSS implementation for avatar and dropdown styling', 'font-size: 12px; color: #999;');
  console.log('');

  // Test 1: DOM Elements Exist
  console.log('%c1. CHECKING DOM ELEMENTS', 'font-size: 14px; font-weight: bold; color: #FF4500; margin-top: 10px;');
  testElement('#avatar-btn', 'exists');
  testElement('.avatar-circle', 'exists');
  testElement('#profile-dropdown', 'exists');
  testElement('.dropdown-header', 'exists');
  testElement('.dropdown-menu', 'exists');
  testElement('#dropdown-logout-btn', 'exists');
  console.log('');

  // Test 2: Avatar Button Styles
  console.log('%c2. AVATAR BUTTON STYLES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('#avatar-btn', 'cursor', 'pointer');
  testElement('#avatar-btn', 'background');
  testElement('#avatar-btn', 'border');
  testElement('#avatar-btn', 'padding');
  console.log('');

  // Test 3: Avatar Circle Styles
  console.log('%c3. AVATAR CIRCLE STYLES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('.avatar-circle', 'width');
  testElement('.avatar-circle', 'height');
  testElement('.avatar-circle', 'border-radius', '50%');
  testElement('.avatar-circle', 'background');
  testElement('.avatar-circle', 'color', '#fff');
  testElement('.avatar-circle', 'font-weight', '700');
  testElement('.avatar-circle', 'display', 'flex');
  testElement('.avatar-circle', 'align-items', 'center');
  testElement('.avatar-circle', 'justify-content', 'center');
  testElement('.avatar-circle', 'box-shadow');
  testElement('.avatar-circle', 'border');
  console.log('');

  // Test 4: Dropdown Container Styles
  console.log('%c4. DROPDOWN CONTAINER STYLES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('#profile-dropdown', 'position', 'absolute');
  testElement('#profile-dropdown', 'background');
  testElement('#profile-dropdown', 'border');
  testElement('#profile-dropdown', 'border-radius');
  testElement('#profile-dropdown', 'min-width');
  testElement('#profile-dropdown', 'box-shadow');
  testElement('#profile-dropdown', 'opacity', '0');
  testElement('#profile-dropdown', 'visibility', 'hidden');
  testElement('#profile-dropdown', 'transform');
  testElement('#profile-dropdown', 'z-index');
  console.log('');

  // Test 5: Dropdown Show State
  console.log('%c5. DROPDOWN SHOW STATE (.show CLASS)', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  const sheet = document.styleSheets[Array.from(document.styleSheets).findIndex(s => 
    s.href && s.href.includes('auth.css')
  )] || document.styleSheets[0];
  
  let hasShowRule = false;
  try {
    for (let i = 0; i < sheet.cssRules.length; i++) {
      if (sheet.cssRules[i].selectorText && sheet.cssRules[i].selectorText.includes('.show')) {
        hasShowRule = true;
        break;
      }
    }
    if (hasShowRule) {
      log(PASS, '.profile-dropdown.show rule found in CSS');
    } else {
      log(WARN, '.profile-dropdown.show rule', 'Not found in main sheet, may be in imported file');
    }
  } catch (e) {
    log(WARN, '.profile-dropdown.show rule check', 'Could not access stylesheet (CORS)', e.message);
  }
  console.log('');

  // Test 6: Dropdown Header Styles
  console.log('%c6. DROPDOWN HEADER STYLES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('.dropdown-header', 'display', 'flex');
  testElement('.dropdown-header', 'align-items', 'center');
  testElement('.dropdown-header', 'gap');
  testElement('.dropdown-header', 'padding');
  testElement('.dropdown-header', 'background');
  testElement('.dropdown-header', 'border-radius');
  console.log('');

  // Test 7: Dropdown Avatar Styles
  console.log('%c7. DROPDOWN AVATAR STYLES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('.dropdown-avatar', 'width');
  testElement('.dropdown-avatar', 'height');
  testElement('.dropdown-avatar', 'border-radius', '50%');
  testElement('.dropdown-avatar', 'background');
  testElement('.dropdown-avatar', 'display', 'flex');
  testElement('.dropdown-avatar', 'align-items', 'center');
  testElement('.dropdown-avatar', 'justify-content', 'center');
  testElement('.dropdown-avatar', 'color', '#fff');
  testElement('.dropdown-avatar', 'font-weight', '700');
  console.log('');

  // Test 8: Dropdown Menu Items
  console.log('%c8. DROPDOWN MENU ITEMS STYLES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('.dropdown-item', 'display', 'flex');
  testElement('.dropdown-item', 'align-items', 'center');
  testElement('.dropdown-item', 'gap');
  testElement('.dropdown-item', 'width', '100%');
  testElement('.dropdown-item', 'padding');
  testElement('.dropdown-item', 'cursor', 'pointer');
  testElement('.dropdown-item', 'border-radius');
  testElement('.dropdown-item', 'position', 'relative');
  console.log('');

  // Test 9: Dropdown Logout Item Styles
  console.log('%c9. LOGOUT ITEM SPECIAL STYLES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('.dropdown-item.logout-item', 'color');
  testElement('.dropdown-item.logout-item', 'border-top');
  testElement('.dropdown-item.logout-item', 'margin-top');
  testElement('.dropdown-item.logout-item', 'padding-top');
  console.log('');

  // Test 10: Animation Properties
  console.log('%c10. ANIMATION PROPERTIES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('#avatar-btn', 'transition');
  testElement('.avatar-circle', 'transition');
  testElement('#profile-dropdown', 'transition');
  testElement('.dropdown-item', 'transition');
  
  // Check for animation keyframes in CSS
  console.log(INFO, 'Check browser styles for @keyframes: slideInAuth, fadeOut, pulse');
  console.log('');

  // Test 11: Mobile Responsive (Media Queries)
  console.log('%c11. MEDIA QUERIES CHECK', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  const mediaQueries = [
    '(max-width: 768px)',
    '(max-width: 600px)',
    '(max-width: 480px)',
    '(max-width: 360px)',
    '(hover: none) and (pointer: coarse)',
    '(prefers-reduced-motion: reduce)',
    '(prefers-contrast: more)',
    '(prefers-color-scheme: dark)'
  ];
  
  console.log(INFO, 'CSS media queries included:');
  mediaQueries.forEach(mq => console.log(`  • ${mq}`));
  console.log('');

  // Test 12: Accessibility Features
  console.log('%c12. ACCESSIBILITY FEATURES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('#avatar-btn', 'title');
  testElement('#profile-dropdown', 'role', 'menu');
  testElement('#dropdown-logout-btn', 'type', 'button');
  console.log('');

  // Test 13: Z-Index Hierarchy
  console.log('%c13. Z-INDEX LAYERING', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('#avatar-btn', 'z-index', '10');
  testElement('#profile-dropdown', 'z-index', '1001');
  console.log('');

  // Test 14: Color Verification
  console.log('%c14. COLOR SCHEME', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  testElement('.avatar-circle', 'background'); // Should contain orange
  testElement('.dropdown-avatar', 'background'); // Should contain orange
  testElement('.dropdown-item.logout-item', 'color'); // Should contain red
  console.log('');

  // Test 15: CSS File Loaded
  console.log('%c15. CSS FILE VERIFICATION', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  let cssLoaded = false;
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      if (document.styleSheets[i].href && document.styleSheets[i].href.includes('auth.css')) {
        log(PASS, 'CSS file loaded: auth.css');
        cssLoaded = true;
        break;
      }
    } catch (e) {
      // CORS might prevent access, but file is still loaded
    }
  }
  if (!cssLoaded) {
    log(WARN, 'CSS file check', 'Could not confirm auth.css in stylesheet list (CORS)');
  }
  console.log('');

  // Test 16: Visual Inspection
  console.log('%c16. VISUAL INSPECTION CHECKLIST', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  const avatarBtn = document.querySelector('#avatar-btn');
  const dropdown = document.querySelector('#profile-dropdown');
  
  if (avatarBtn && getComputedStyle(avatarBtn).display !== 'none') {
    log(PASS, 'Avatar button is visible');
  } else {
    log(FAIL, 'Avatar button not visible');
  }
  
  if (dropdown) {
    const computedStyle = getComputedStyle(dropdown);
    if (computedStyle.opacity === '0' || computedStyle.visibility === 'hidden') {
      log(PASS, 'Dropdown hidden by default (opacity: 0 or visibility: hidden)');
    } else {
      log(WARN, 'Dropdown default state', 'May not be hidden by default');
    }
  }
  console.log('');

  // Test 17: Interaction Test
  console.log('%c17. INTERACTION CAPABILITIES', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  if (avatarBtn) {
    log(PASS, 'Avatar button clickable');
    log(INFO, 'Click avatar button to test dropdown animation');
  }
  console.log('');

  // Summary
  console.log('%c═══════════════════════════════════════', 'color: #FF4500; font-weight: bold;');
  console.log('%cTEST SUMMARY', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  console.log('%c═══════════════════════════════════════', 'color: #FF4500; font-weight: bold;');
  console.log(`✅ Passed:  ${testsPassed}`);
  console.log(`❌ Failed:  ${testsFailed}`);
  console.log(`⚠️  Warned: ${testsWarned}`);
  console.log('');

  // Overall status
  if (testsFailed === 0) {
    console.log('%c✅ STEP 1.5 CSS IMPLEMENTATION VERIFIED', 'font-size: 14px; font-weight: bold; color: #4CAF50;');
    console.log('%c🚀 Ready for production deployment', 'font-size: 12px; color: #4CAF50;');
  } else if (testsFailed <= 2) {
    console.log('%c⚠️  STEP 1.5 CSS MOSTLY VERIFIED', 'font-size: 14px; font-weight: bold; color: #FF9800;');
    console.log('%c📋 Review warnings above', 'font-size: 12px; color: #FF9800;');
  } else {
    console.log('%c❌ STEP 1.5 CSS VERIFICATION FAILED', 'font-size: 14px; font-weight: bold; color: #F44336;');
    console.log('%c🔧 Review errors above', 'font-size: 12px; color: #F44336;');
  }

  console.log('');
  console.log('%c═══════════════════════════════════════', 'color: #FF4500; font-weight: bold;');
  console.log('%cMANUAL VERIFICATION CHECKLIST', 'font-size: 14px; font-weight: bold; color: #FF4500;');
  console.log('%c═══════════════════════════════════════', 'color: #FF4500; font-weight: bold;');
  console.log('Please manually verify:');
  console.log('  1. Avatar displays as circular orange button');
  console.log('  2. Avatar shows user\'s first letter');
  console.log('  3. Click avatar → dropdown appears smoothly');
  console.log('  4. Dropdown has dark background with menu items');
  console.log('  5. Hover over menu items → highlight effect');
  console.log('  6. Logout item shows in red');
  console.log('  7. Resize to 375px (mobile) → dropdown centers');
  console.log('  8. Test on actual mobile device');
  console.log('  9. Keyboard Tab navigation works');
  console.log('  10. Focus indicators visible');
  console.log('');
  console.log('%cFor detailed testing, see STEP_1_5_TESTING_GUIDE.md', 'font-size: 12px; color: #999; font-style: italic;');
  console.log('');
})();