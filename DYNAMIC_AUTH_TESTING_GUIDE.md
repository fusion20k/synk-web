# Dynamic Auth System - Quick Testing Guide

## 🧪 Testing the Dynamic Auth UI

### Test 1: Header Updates on Demo Toggle

**Steps:**
1. Visit any page on the website (index.html, about.html, etc.)
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Copy & paste:
```javascript
window.toggleAuthDemo();
```

**Expected Result:**
- Header shows: **"Profile Menu Dropdown"** with user avatar and email
- Login/Signup buttons disappear

5. Run the command again:
```javascript
window.toggleAuthDemo();
```

**Expected Result:**
- Header shows: **"Log In" and "Sign Up" buttons** again
- Profile menu disappears

---

### Test 2: Check Auth State Object

Run in console:
```javascript
// Check current user
console.log(window.authManager.getCurrentUser());

// Check if logged in
console.log(window.authManager.isLoggedIn());

// Check current UI render state
console.log(window.authUIRenderer.getCurrentState());
```

**Expected Output:**
```javascript
// When logged in:
{
  email: "demo@synk.app",
  token: "demo_token_...",
  avatar: "D"
}

// When logged out:
null
```

---

### Test 3: Cross-Tab Login Sync

**Steps:**
1. Open website in **Tab A**
2. Open same website in **Tab B**
3. In Tab A console, run:
```javascript
window.toggleAuthDemo();
```

**Expected Result:**
- Tab A shows profile dropdown
- Refresh Tab B
- Tab B should also show profile dropdown (synced from localStorage)

---

### Test 4: Logout Functionality

When logged in (after running `toggleAuthDemo()`):

**Steps:**
1. Click the profile avatar in header
2. Click **"Log Out"** button

**Expected Result:**
- Dropdown closes
- Header updates to show Login/Signup buttons
- localStorage is cleared

---

### Test 5: Real Login/Signup Flow

**Steps:**
1. Click **"Sign Up"** button
2. Fill in form and create account
3. After successful signup:
   - Page redirects to download page
   - Navigate back to home
   - Header should show profile dropdown (NOT login buttons)

**Expected Result:**
- No page reload when navigating
- Auth state persists
- Profile menu shows current user email

---

### Test 6: Page Navigation Without Reload

**Steps:**
1. Run: `window.toggleAuthDemo()` (simulate logged-in)
2. Click navigation links:
   - Click "About"
   - Click "Pricing"
   - Click "Contact"
   - Go back to "Home"

**Expected Result:**
- Header always shows profile dropdown
- No page flicker or reload
- Auth UI stays consistent

---

### Test 7: Mobile Responsive

**Steps:**
1. Open DevTools
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Test on mobile sizes:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)

**Expected Result:**
- Auth UI renders correctly on all sizes
- Mobile menu works properly
- Dropdown doesn't break layout

---

## 🐛 Troubleshooting

### "Auth UI not showing"
```javascript
// Check if container exists
document.getElementById('auth-section-container')

// Check if scripts loaded
window.authManager  // Should exist
window.authUIRenderer  // Should exist
```

### "Dropdown not clickable"
```javascript
// Check Z-index
getComputedStyle(document.querySelector('.user-dropdown')).zIndex

// Verify dropdown menu exists
document.querySelector('.dropdown-menu')
```

### "Console logs show errors"
Check browser console for:
- Script loading errors
- Try clearing browser cache (Ctrl+Shift+Delete)
- Check that auth-state.js loads before auth-ui-renderer.js

---

## ✅ Verification Checklist

After deploying, verify:

- [ ] Header shows correct auth state on page load
- [ ] Clicking "Log In" navigates to login.html
- [ ] Clicking "Sign Up" navigates to signup.html
- [ ] User dropdown opens/closes properly
- [ ] "Log Out" clears auth and shows login buttons
- [ ] Auth state persists when navigating between pages
- [ ] Demo toggle works (for testing)
- [ ] Mobile layout is correct
- [ ] No console errors

---

## 📊 Expected Behavior

### Logged Out State
```
Header: [ Synk ] [ Nav Links ] [ Log In ] [ Sign Up ]
```

### Logged In State
```
Header: [ Synk ] [ Nav Links ] [ Avatar ▼ ]
                                   ↓
                    [ user@example.com ]
                    [ Manage Account  ]
                    [ ─────────────── ]
                    [ Log Out         ]
```

---

## 🚀 What's Working

✅ Dynamic auth container (replaces static buttons)
✅ Real-time UI updates (no page reload)
✅ Cross-tab localStorage sync
✅ Event-driven architecture
✅ Demo testing mode
✅ Multi-page consistency
✅ All HTML pages updated

---

## ⚠️ Pending Backend Work

The frontend is complete! But the backend still needs:

1. **Fix default plan assignment** in `/signup` endpoint
   - Remove: `plan: 'pro'`, `billing_period: 'trial'`
   - Keep: `plan: null`, `billing_period: null`

2. **Update database schema** (if defaults are set there)

3. **Test full signup flow** with correct plan values

See `DYNAMIC_AUTH_SYSTEM_COMPLETE.md` for details.